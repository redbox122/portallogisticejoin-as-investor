
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import PaymentReceiptUploadModal from '../../Components/PaymentReceiptUploadModal';

const DRAFT_RENTAL_CONTRACT_HREF = '/files/rental_contract.pdf';
const DRAFT_SALE_CONTRACT_HREF = '/files/sale_contract.pdf';
const CONTRACTOR_INFO_PDF_HREF =
  process.env.REACT_APP_CONTRACTOR_INFO_PDF_URL || '/files/contractor_info.pdf';

/** يظهر فقط عند إتاحة رفع إيصال الدفع لعقد المبايعة */
const ReceiptUploadContractorHint = () => (
  <div
    className="contracts-workflow-receipt-hint"
    role="region"
    aria-label="معلومات المتعاقدين قبل رفع إيصال الدفع"
  >
    <div className="contracts-workflow-receipt-hint-main">
      <span className="contracts-workflow-receipt-hint-icon" aria-hidden="true">
        <i className="fas fa-lightbulb"></i>
      </span>
      <div className="contracts-workflow-receipt-hint-copy">
        <span className="contracts-workflow-receipt-hint-title">قبل رفع إيصال الدفع</span>
        <span className="contracts-workflow-receipt-hint-desc">
          راجع ملف معلومات المتعاقدين للتأكد من بيانات التحويل والإجراءات المطلوبة، ثم ارفع الإيصال.
        </span>
      </div>
    </div>
    <a
      className="contracts-workflow-receipt-hint-link"
      href={CONTRACTOR_INFO_PDF_HREF}
      target="_blank"
      rel="noopener noreferrer"
    >
      <i className="fas fa-file-pdf" aria-hidden="true"></i>
      <span>فتح معلومات المتعاقدين (PDF)</span>
      <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
    </a>
  </div>
);

function nafathErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const raw = typeof data?.message === 'string' ? data.message : '';

  if (status === 503 || /Sadq config missing/i.test(raw)) {
    return 'خدمة التوثيق عبر نفاذ غير مهيأة على هذا الخادم. للتطوير المحلي أضف SADQ_API_KEY وSADQ_ACCOUNT_ID (وSADQ_WEBHOOK_URL عند الحاجة) في ملف .env للخادم. للمستثمرين: يرجى التواصل مع الدعم إذا استمرت المشكلة.';
  }
  if (/Sadq API unreachable/i.test(raw) || status === 502 || status === 504) {
    return 'تعذر الاتصال بخدمة التوثيق. حاول مرة أخرى بعد قليل.';
  }
  if (raw) {
    return raw;
  }
  return 'تعذر إرسال الطلب إلى نفاذ. حاول مرة أخرى.';
}

const ContractsWorkflowGuideBanner = ({ compact }) => (
  <div
    className={`contracts-workflow-guide${compact ? ' contracts-workflow-guide--compact' : ''}`}
    role="region"
    aria-label="مسودات عقود الإيجار والمبايعة"
  >
    <div className="contracts-workflow-guide-inner">
      <span className="contracts-workflow-guide-icon" aria-hidden="true">
        <i className="fas fa-file-pdf"></i>
      </span>
      <div className="contracts-workflow-guide-text">
        <strong>نماذج العقود (مسودات PDF)</strong>
        {!compact && (
          <span className="contracts-workflow-guide-desc">
            راجع مسودة عقد الإيجار ومسودة عقد المبايعة قبل أو أثناء متابعة عقودك.
          </span>
        )}
      </div>
      <div className="contracts-workflow-guide-actions">
        <a
          className="contracts-workflow-guide-btn contracts-workflow-guide-btn--rental"
          href={DRAFT_RENTAL_CONTRACT_HREF}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>مسودة عقد إيجار</span>
          <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        <a
          className="contracts-workflow-guide-btn contracts-workflow-guide-btn--sale"
          href={DRAFT_SALE_CONTRACT_HREF}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>مسودة عقد مبايعة</span>
          <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        
      </div>
    </div>
  </div>
);

const STATUS_BADGE = {
  draft: 'مسودة',
  sent: 'قيد الإرسال',
  nafath_pending: 'قيد التوثيق',
  nafath_approved: 'موثق عبر نفاذ',
  admin_pending: 'قيد المراجعة',
  approved: 'مكتمل',
  rejected: '❌ مرفوض',
};

const ContractsWorkflowPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [nafathFeedback, setNafathFeedback] = useState({});
  const [receiptModal, setReceiptModal] = useState({ open: false, contractId: null });
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`, {
        headers: getAuthHeaders(),
      });
      setContracts(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load contracts', error);
      setError(error?.response?.data?.message || 'تعذر تحميل العقود. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const verifyNafath = async (contractId) => {
    setSubmittingId(contractId);
    try {
      const response = await axios.post(`${API_BASE_URL}/contracts/${contractId}/nafath`, {}, {
        headers: getAuthHeaders(),
      });

      const challengeNumber = response.data?.challenge_number || response.data?.sadq?.challenge_number || null;
      setNafathFeedback((prev) => ({
        ...prev,
        [contractId]: {
          ok: true,
          message: 'تم إرسال الطلب إلى تطبيق نفاذ 📱 يرجى فتح التطبيق واختيار الرقم للموافقة',
          challengeNumber,
        },
      }));

      await loadContracts();
    } catch (error) {
      const status = error?.response?.status;
      const dataMsg = error?.response?.data?.message;
      const isExpectedConfig = status === 503 || /Sadq config missing/i.test(String(dataMsg || ''));
      if (!isExpectedConfig) {
        console.error('Nafath verification failed', error);
      }
      setNafathFeedback((prev) => ({
        ...prev,
        [contractId]: {
          ok: false,
          message: nafathErrorMessage(error),
          challengeNumber: null,
        },
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  const openReceiptModal = (contractId) => {
    setReceiptError('');
    setReceiptModal({ open: true, contractId });
  };

  const closeReceiptModal = () => {
    if (receiptSaving) return;
    setReceiptModal({ open: false, contractId: null });
    setReceiptError('');
  };

const savePaymentReceipt = async (file) => {
    if (!receiptModal.contractId) return;
    if (!file) {
      setReceiptError('يرجى اختيار ملف الإيصال أولاً.');
      return;
    }
    setReceiptSaving(true);
    setReceiptError('');
    try {
      const form = new FormData();
      form.append('payment_receipt', file);
      
      // Get auth headers but remove Content-Type so axios sets multipart boundary automatically
      const headers = getAuthHeaders();
      delete headers['Content-Type'];
      
      await axios.post(
        `${API_BASE_URL}/contracts/${receiptModal.contractId}/payment-receipt`,
        form,
        { headers }
      );
      closeReceiptModal();
      await loadContracts();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 422 ? 'تأكد من نوع الملف وحجمه (حتى 10MB).' : null) ||
        'تعذر رفع الإيصال. حاول مرة أخرى.';
      setReceiptError(msg);
    } finally {
      setReceiptSaving(false);
    }
};

  const getStatusMeta = (status) => {
    const metaByTone = {
      draft: { tone: 'draft', icon: 'fa-file-lines' },
      sent: { tone: 'sent', icon: 'fa-paper-plane' },
      nafath_pending: { tone: 'nafath-pending', icon: 'fa-shield-halved' },
      nafath_approved: { tone: 'nafath-approved', icon: 'fa-badge-check' },
      admin_pending: { tone: 'admin-pending', icon: 'fa-clock' },
      approved: { tone: 'approved', icon: 'fa-circle-check' },
      rejected: { tone: 'rejected', icon: 'fa-circle-xmark' },
    };

    const label = STATUS_BADGE[status] || status;
    const meta = metaByTone[status] || { tone: 'neutral', icon: 'fa-circle-info' };
    return { label, ...meta };
  };

  if (loading) {
    return (
      <div className="contracts-workflow-page contracts-workflow-page--with-guide">
        <ContractsWorkflowGuideBanner compact />
        <div className="contracts-workflow-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <span>جاري تحميل العقود...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contracts-workflow-page contracts-workflow-page--with-guide">
        <ContractsWorkflowGuideBanner compact />
        <div className="contracts-workflow-error">
          <i className="fas fa-triangle-exclamation"></i>
          <p>{error}</p>
          <button className="contracts-workflow-btn contracts-workflow-btn-primary" type="button" onClick={loadContracts}>
            <i className="fas fa-rotate-right"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contracts-workflow-page">
      <ContractsWorkflowGuideBanner />
      <PaymentReceiptUploadModal
        isOpen={receiptModal.open}
        onClose={closeReceiptModal}
        onSave={savePaymentReceipt}
        isSaving={receiptSaving}
        error={receiptError}
        contractId={receiptModal.contractId}
      />
      <div className="contracts-workflow-header">
        <div>
          <h2 className="contracts-workflow-title">عقودي</h2>
          <p className="contracts-workflow-subtitle">متابعة حالة العقود بدءًا من الإرسال حتى التوثيق عبر نفاذ.</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="contracts-workflow-empty">
          <i className="fas fa-file-contract"></i>
          <h3>لا توجد عقود</h3>
          <p>سيظهر عقدك هنا بعد إنشائه.</p>
        </div>
      ) : (
        <div className="contracts-workflow-list">
          {contracts.map((contract) => {
            const meta = getStatusMeta(contract.status);
            const isBusy = submittingId === contract.id;
            const canVerify = contract.status === 'sent';
            const canUploadReceipt = contract.status === 'approved' && contract.type === 'sale' && !contract.payment_receipt_path;

            return (
              <div key={contract.id} className="contracts-workflow-card">
                <div className="contracts-workflow-top">
                  <div className="contracts-workflow-heading">
                    <span className="contracts-workflow-contract-id">#{contract.id}</span>
                    <strong className="contracts-workflow-contract-title">{contract.title}</strong>
                  </div>

                  <div className="contracts-workflow-type">
                    {contract.type === 'sale' ? 'عقد مبايعة' : 'عقد استئجار'}
                  </div>
                </div>

                <div className="contracts-workflow-badges-row">
                  <span className={`contracts-workflow-status contracts-workflow-status-${meta.tone}`}>
                    <i className={`fas ${meta.icon}`}></i>
                    {meta.label}
                  </span>
                </div>

                {canUploadReceipt ? <ReceiptUploadContractorHint /> : null}

                <div className="contracts-workflow-actions-row">
                  {contract.file_url ? (
                    <a className="contracts-workflow-link" href={contract.file_url} target="_blank" rel="noreferrer">
                      <i className="fas fa-eye"></i>
                      عرض PDF
                    </a>
                  ) : (
                    <span className="contracts-workflow-no-file">—</span>
                  )}

                  {contract.payment_receipt_url ? (
                    <a className="contracts-workflow-link" href={contract.payment_receipt_url} target="_blank" rel="noreferrer">
                      <i className="fas fa-receipt"></i>
                      عرض الإيصال
                    </a>
                  ) : null}

                  {canUploadReceipt ? (
                    <button
                      className="contracts-workflow-btn contracts-workflow-btn-secondary"
                      type="button"
                      onClick={() => openReceiptModal(contract.id)}
                    >
                      <i className="fas fa-cloud-arrow-up"></i>
                      رفع إيصال الدفع
                    </button>
                  ) : null}

                  <button
                    className="contracts-workflow-btn"
                    onClick={() => verifyNafath(contract.id)}
                    disabled={!canVerify || isBusy}
                    type="button"
                  >
                    <i className="fas fa-shield-halved"></i>
                    {isBusy ? 'جاري الإرسال...' : 'توثيق عبر نفاذ'}
                  </button>
                </div>

                {nafathFeedback[contract.id]?.message && (
                  <div className={`contracts-workflow-feedback ${nafathFeedback[contract.id].ok ? 'ok' : 'error'}`}>
                    <div className="contracts-workflow-feedback-message">{nafathFeedback[contract.id].message}</div>
                    {nafathFeedback[contract.id].challengeNumber && (
                      <div className="contracts-workflow-feedback-challenge">
                        رقم التحدي: {nafathFeedback[contract.id].challengeNumber}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractsWorkflowPage;
