import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';

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
      console.error('Nafath verification failed', error);
      setNafathFeedback((prev) => ({
        ...prev,
        [contractId]: {
          ok: false,
          message: error?.response?.data?.message || 'تعذر إرسال الطلب إلى نفاذ. حاول مرة أخرى.',
          challengeNumber: null,
        },
      }));
    } finally {
      setSubmittingId(null);
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
      <div className="contracts-workflow-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>جاري تحميل العقود...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contracts-workflow-error">
        <i className="fas fa-triangle-exclamation"></i>
        <p>{error}</p>
        <button className="contracts-workflow-btn contracts-workflow-btn-primary" type="button" onClick={loadContracts}>
          <i className="fas fa-rotate-right"></i>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="contracts-workflow-page">
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

                <div className="contracts-workflow-actions-row">
                  {contract.file_url ? (
                    <a className="contracts-workflow-link" href={contract.file_url} target="_blank" rel="noreferrer">
                      <i className="fas fa-eye"></i>
                      عرض PDF
                    </a>
                  ) : (
                    <span className="contracts-workflow-no-file">—</span>
                  )}

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
