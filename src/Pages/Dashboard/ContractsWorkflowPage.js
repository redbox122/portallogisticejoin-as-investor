import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import PaymentReceiptUploadModal from '../../Components/PaymentReceiptUploadModal';

const DRAFT_RENTAL_CONTRACT_HREF = '/files/rental_contract.pdf';
const DRAFT_SALE_CONTRACT_HREF   = '/files/sale_contract.pdf';
const CONTRACTOR_INFO_PDF_HREF   =process.env.REACT_APP_CONTRACTOR_INFO_PDF_URL || '/files/contractor_info.pdf';

const FULL_PRICE = 6600;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n) { return Number(n || 0).toLocaleString('ar-SA'); }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── SaleReceiptUploadModal ────────────────────────────────────────────────────

const SaleReceiptUploadModal = ({ contractId, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError('');
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const submit = async () => {
    if (!file) { setError('يرجى اختيار ملف الإيصال أولاً.'); return; }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('payment_receipt', file);
      const headers = getAuthHeaders();
      delete headers['Content-Type'];
      const res = await axios.post(
        `${API_BASE_URL}/contracts/${contractId}/upload-sale-receipt`,
        form, { headers }
      );
      onSuccess(res.data?.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'تعذر رفع الإيصال. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cwf-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="cwf-modal">
        <div className="cwf-modal-head">
          <div>
            <h3 className="cwf-modal-title">رفع إيصال الدفع</h3>
            <p className="cwf-modal-sub">ارفع إيصال التحويل لإثبات الدفع — يمكنك الرفع أكثر من مرة.</p>
          </div>
          <button type="button" className="cwf-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <div
          className={`cwf-dropzone${file ? ' cwf-dropzone--has-file' : ''}`}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
          {preview
            ? <img src={preview} alt="معاينة" className="cwf-dropzone-preview" />
            : <>
                <i className={`fas ${file ? 'fa-file-check' : 'fa-cloud-arrow-up'} cwf-dropzone-icon`} aria-hidden="true"></i>
                <p className="cwf-dropzone-label">{file ? file.name : 'اسحب الملف هنا أو انقر للاختيار'}</p>
                <p className="cwf-dropzone-hint">PDF، JPG، PNG — حتى 10MB</p>
              </>
          }
        </div>

        {error && <div className="cwf-error-chip" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</div>}

        <div className="cwf-modal-foot">
          <button type="button" className="contracts-workflow-btn" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="contracts-workflow-btn contracts-workflow-btn-primary" onClick={submit} disabled={saving || !file}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> جاري الرفع...</> : <><i className="fas fa-cloud-arrow-up"></i> رفع الإيصال</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── PartOwningBanner ──────────────────────────────────────────────────────────
// Shown on sale contracts in need_to_pay or receipt_review status

const PartOwningBanner = ({ contract }) => {
  const paid     = contract.total_amount_paid || 0;
  const remaining = FULL_PRICE - paid;
  const daysLeft = contract.payment_window_days_left;
  const expired  = contract.payment_window_expired;
  const pct      = Math.min(100, Math.round((paid / FULL_PRICE) * 100));

  return (
    <div className={`cwf-part-banner${expired ? ' cwf-part-banner--expired' : ''}`}>
      <div className="cwf-part-banner-head">
        <span className="cwf-part-banner-title">
          <i className="fas fa-coins" aria-hidden="true"></i>
          تفاصيل الدفع
        </span>
        {daysLeft !== null && !expired && (
          <span className={`cwf-days-chip${daysLeft <= 10 ? ' cwf-days-chip--urgent' : ''}`}>
            <i className="fas fa-clock" aria-hidden="true"></i>
            {daysLeft === 0 ? 'ينتهي اليوم' : `${daysLeft} يوم متبقي`}
          </span>
        )}
        {expired && (
          <span className="cwf-days-chip cwf-days-chip--expired">
            <i className="fas fa-circle-exclamation" aria-hidden="true"></i>
            انتهت مدة السداد
          </span>
        )}
      </div>

      {/* progress bar */}
      <div className="cwf-pay-bar-labels">
        <span>المدفوع: <strong>{fmtSAR(paid)} ر.س</strong></span>
        <span>{pct}%</span>
      </div>
      <div className="cwf-pay-bar">
        <div className="cwf-pay-bar-fill" style={{ width: `${pct}%` }}></div>
      </div>

      <div className="cwf-part-amounts">
        <div className="cwf-part-amount-item">
          <span>إجمالي السعر</span>
          <strong>{fmtSAR(FULL_PRICE)} ر.س</strong>
        </div>
        <div className="cwf-part-amount-item cwf-part-amount-item--paid">
          <span>المدفوع</span>
          <strong>{fmtSAR(paid)} ر.س</strong>
        </div>
        <div className="cwf-part-amount-item cwf-part-amount-item--due">
          <span>المتبقي</span>
          <strong>{fmtSAR(remaining)} ر.س</strong>
        </div>
      </div>

      {paid > 0 && remaining > 0 && !expired && (
        <div className="cwf-rent-hint">
          <i className="fas fa-circle-info" aria-hidden="true"></i>
          الإيجار الشهري المتوقع إذا سددت الآن: <strong>{fmtSAR(paid * 0.1)} ر.س / شهر</strong>
          {' '}أو إذا اكتملت القيمة: <strong>660 ر.س / شهر</strong>
        </div>
      )}

      {contract.status === 'receipt_review' && (
        <div className="cwf-review-hint">
          <i className="fas fa-hourglass-half" aria-hidden="true"></i>
          الإيصال قيد المراجعة من الإدارة — سيتم تحديث حالتك قريباً.
        </div>
      )}
    </div>
  );
};

// ── STATUS metadata ───────────────────────────────────────────────────────────

const STATUS_BADGE = {
  draft:          { label: 'مسودة',             tone: 'draft',          icon: 'fa-file-lines' },
  sent:           { label: 'قيد الإرسال',        tone: 'sent',           icon: 'fa-paper-plane' },
  nafath_pending: { label: 'قيد التوثيق',        tone: 'nafath-pending', icon: 'fa-shield-halved' },
  nafath_approved:{ label: 'موثق عبر نفاذ',      tone: 'nafath-approved',icon: 'fa-badge-check' },
  admin_pending:  { label: 'قيد المراجعة',        tone: 'admin-pending',  icon: 'fa-clock' },
  approved:       { label: 'مقبول',              tone: 'approved',       icon: 'fa-circle-check' },
  accepted:       { label: 'مكتمل ✓',            tone: 'approved',       icon: 'fa-circle-check' },
  rejected:       { label: 'مرفوض',             tone: 'rejected',        icon: 'fa-circle-xmark' },
  need_to_pay:    { label: 'بانتظار الدفع',       tone: 'need-to-pay',   icon: 'fa-money-bill-wave' },
  receipt_review: { label: 'مراجعة الإيصال',     tone: 'admin-pending',  icon: 'fa-hourglass-half' },
};

// ── ContractsWorkflowGuideBanner ──────────────────────────────────────────────

const ContractsWorkflowGuideBanner = ({ compact }) => (
  <div className={`contracts-workflow-guide${compact ? ' contracts-workflow-guide--compact' : ''}`}
    role="region" aria-label="مسودات عقود الإيجار والمبايعة">
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
        <a className="contracts-workflow-guide-btn contracts-workflow-guide-btn--rental"
          href={DRAFT_RENTAL_CONTRACT_HREF} target="_blank" rel="noopener noreferrer">
          <span>مسودة عقد إيجار</span>
          <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        <a className="contracts-workflow-guide-btn contracts-workflow-guide-btn--sale"
          href={DRAFT_SALE_CONTRACT_HREF} target="_blank" rel="noopener noreferrer">
          <span>مسودة عقد مبايعة</span>
          <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
      </div>
    </div>
  </div>
);

function nafathErrorMessage(error) {
  const status = error?.response?.status;
  const raw    = typeof error?.response?.data?.message === 'string' ? error.response.data.message : '';
  if (status === 503 || /Sadq config missing/i.test(raw)) {
    return 'خدمة التوثيق عبر نفاذ غير مهيأة. يرجى التواصل مع الدعم.';
  }
  if (/Sadq API unreachable/i.test(raw) || status === 502 || status === 504) {
    return 'تعذر الاتصال بخدمة التوثيق. حاول مرة أخرى بعد قليل.';
  }
  return raw || 'تعذر إرسال الطلب إلى نفاذ. حاول مرة أخرى.';
}

// ── ContractsWorkflowPage ─────────────────────────────────────────────────────

const ContractsWorkflowPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [submittingId, setSubmittingId]   = useState(null);
  const [nafathFeedback, setNafathFeedback] = useState({});
  const [saleReceiptModal, setSaleReceiptModal] = useState(null); // contractId
  const [receiptModal, setReceiptModal]   = useState({ open: false, contractId: null });
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptError, setReceiptError]   = useState('');

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/contracts`, { headers: getAuthHeaders() });
      setContracts(res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذر تحميل العقود. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const verifyNafath = async (contractId) => {
    setSubmittingId(contractId);
    try {
      const res = await axios.post(`${API_BASE_URL}/contracts/${contractId}/nafath`, {},
        { headers: getAuthHeaders() });
      const challengeNumber = res.data?.challenge_number || res.data?.sadq?.challenge_number || null;
      setNafathFeedback(prev => ({
        ...prev,
        [contractId]: { ok: true, message: 'تم إرسال الطلب إلى تطبيق نفاذ 📱 يرجى فتح التطبيق واختيار الرقم للموافقة', challengeNumber },
      }));
      await loadContracts();
    } catch (err) {
      const isExpected = err?.response?.status === 503 || /Sadq config missing/i.test(String(err?.response?.data?.message || ''));
      if (!isExpected) console.error('Nafath failed', err);
      setNafathFeedback(prev => ({
        ...prev,
        [contractId]: { ok: false, message: nafathErrorMessage(err), challengeNumber: null },
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  // Legacy receipt upload (non-sale)
  const savePaymentReceipt = async (file) => {
    if (!receiptModal.contractId || !file) { setReceiptError('يرجى اختيار ملف.'); return; }
    setReceiptSaving(true);
    setReceiptError('');
    try {
      const form = new FormData();
      form.append('payment_receipt', file);
      const headers = getAuthHeaders();
      delete headers['Content-Type'];
      await axios.post(`${API_BASE_URL}/contracts/${receiptModal.contractId}/payment-receipt`, form, { headers });
      setReceiptModal({ open: false, contractId: null });
      await loadContracts();
    } catch (e) {
      setReceiptError(e?.response?.data?.message || 'تعذر رفع الإيصال.');
    } finally {
      setReceiptSaving(false);
    }
  };

  // After sale receipt upload succeeds — update row in place
  const handleSaleReceiptSuccess = (updatedContract) => {
    setSaleReceiptModal(null);
    setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
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
            <i className="fas fa-rotate-right"></i> إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contracts-workflow-page">
      <ContractsWorkflowGuideBanner />

      {/* Legacy receipt modal (for non-sale contracts) */}
      <PaymentReceiptUploadModal
        isOpen={receiptModal.open}
        onClose={() => { if (!receiptSaving) { setReceiptModal({ open: false, contractId: null }); setReceiptError(''); } }}
        onSave={savePaymentReceipt}
        isSaving={receiptSaving}
        error={receiptError}
        contractId={receiptModal.contractId}
      />

      {/* Sale receipt upload modal */}
      {saleReceiptModal && (
        <SaleReceiptUploadModal
          contractId={saleReceiptModal}
          onClose={() => setSaleReceiptModal(null)}
          onSuccess={handleSaleReceiptSuccess}
        />
      )}

      <div className="contracts-workflow-header">
        <div>
          <h2 className="contracts-workflow-title">عقودي</h2>
          <p className="contracts-workflow-subtitle">متابعة حالة العقود بدءًا من الإرسال حتى التفعيل.</p>
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
            const meta    = STATUS_BADGE[contract.status] || { label: contract.status, tone: 'draft', icon: 'fa-circle-info' };
            const isBusy  = submittingId === contract.id;
            const canVerify = contract.status === 'sent';

            // Show "upload receipt" ONLY based on need_to_pay status — not file path
            const canUploadSaleReceipt = contract.type === 'sale' && contract.status === 'need_to_pay';

            // Legacy: non-sale approved upload
            const canUploadLegacyReceipt = contract.status === 'approved' && contract.type === 'sale'
              && !contract.payment_receipt_path;

            // Show part-owning banner for sale contracts in payment workflow
            const showPartOwning = contract.type === 'sale' &&
              ['need_to_pay', 'receipt_review', 'accepted'].includes(contract.status);

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

                {/* Part owning progress banner */}
                {showPartOwning && <PartOwningBanner contract={contract} />}

                <div className="contracts-workflow-actions-row">
                  {contract.file_url && (
                    <a className="contracts-workflow-link" href={contract.file_url} target="_blank" rel="noreferrer">
                      <i className="fas fa-eye"></i> عرض PDF
                    </a>
                  )}

                  {contract.sale_receipt_url && (
                    <a className="contracts-workflow-link" href={contract.sale_receipt_url} target="_blank" rel="noreferrer">
                      <i className="fas fa-receipt"></i> الإيصال المرفوع
                    </a>
                  )}

                  {contract.payment_receipt_url && (
                    <a className="contracts-workflow-link" href={contract.payment_receipt_url} target="_blank" rel="noreferrer">
                      <i className="fas fa-receipt"></i> عرض الإيصال
                    </a>
                  )}

                  {/* Sale receipt upload — based only on status */}
                  {canUploadSaleReceipt && (
                    <button
                      className="contracts-workflow-btn contracts-workflow-btn-secondary"
                      type="button"
                      onClick={() => setSaleReceiptModal(contract.id)}
                    >
                      <i className="fas fa-cloud-arrow-up"></i>
                      رفع إيصال الدفع
                    </button>
                  )}

                  {/* Legacy upload */}
                  {canUploadLegacyReceipt && (
                    <button
                      className="contracts-workflow-btn contracts-workflow-btn-secondary"
                      type="button"
                      onClick={() => { setReceiptError(''); setReceiptModal({ open: true, contractId: contract.id }); }}
                    >
                      <i className="fas fa-cloud-arrow-up"></i>
                      رفع إيصال الدفع
                    </button>
                  )}

                  {/* Nafath */}
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