import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';

const STATUS_BADGE = {
  draft: 'مسودة',
  sent: 'تم الإرسال',
  nafath_pending: 'بانتظار نفاذ',
  nafath_approved: 'موثق عبر نفاذ',
  admin_pending: '⏳ قيد المراجعة',
  approved: '✅ مقبول',
  rejected: '❌ مرفوض',
};

const ContractsWorkflowPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`, {
        headers: getAuthHeaders(),
      });
      setContracts(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load contracts', error);
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
      await axios.post(`${API_BASE_URL}/contracts/${contractId}/nafath`, {}, {
        headers: getAuthHeaders(),
      });
      await loadContracts();
    } catch (error) {
      console.error('Nafath verification failed', error);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading contracts...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>عقودي</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {contracts.map((contract) => (
          <div
            key={contract.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 14,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong>{contract.title}</strong>
              <span>{contract.type === 'sale' ? 'عقد مبايعة' : 'عقد استئجار'}</span>
            </div>

            <div>
              <span style={{ background: '#f3f4f6', borderRadius: 8, padding: '4px 8px' }}>
                {STATUS_BADGE[contract.status] || contract.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {contract.file_url && (
                <a href={contract.file_url} target="_blank" rel="noreferrer">
                  عرض PDF
                </a>
              )}

              {contract.status === 'sent' && (
                <button onClick={() => verifyNafath(contract.id)} disabled={submittingId === contract.id}>
                  {submittingId === contract.id ? 'جاري الإرسال...' : 'توثيق عبر نفاذ'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContractsWorkflowPage;
