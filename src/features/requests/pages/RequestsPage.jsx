// src/features/requests/pages/RequestsPage.jsx
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/stores/authStore';
import { useRequests } from '../hooks/useRequests';
import { useRentalContracts } from '../hooks/useContracts';
import { REQUEST_TYPES } from '../constants/constants';

import { RequestTypeCard } from '../components/RequestTypeCard';
import { RequestCard } from '../components/RequestCard';
import { SummaryStrip } from '../components/SummaryStrip';
import { SuccessBanner } from '../components/SuccessBanner';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ConfirmModal } from '../modals/ConfirmModal';
import { NafathModal } from '../modals/NafathModal';

export default function RequestsPage() {
  const { i18n } = useTranslation(['common']);
  const isAr = i18n.language === 'ar';

  const user = useAuthStore((state) => state.user);
  const { data, isLoading, refetch } = useRequests();
  const { data: contracts = [] } = useRentalContracts();

  const [confirmType, setConfirmType] = useState(null);
  const [nafathRequest, setNafathRequest] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSuccess = useCallback((newReq) => {
    setConfirmType(null);
    setSuccessMsg('تم تقديم طلبك بنجاح. سيتواصل معك فريقنا قريباً.');
    refetch();
  }, [refetch]);

  const handleNafathSuccess = useCallback(() => {
    setNafathRequest(null);
    setSuccessMsg('تم توقيع الفاتورة بنجاح! سيتم تحديث حالة الطلب قريباً.');
    refetch();
  }, [refetch]);

  const requests = data?.requests || [];
  const summary = data?.summary;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <i className="fas fa-hand-holding-hand" aria-hidden="true" />
          </div>
          طلباتي
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          قدّم طلباتك المتعلقة بعقودك واستثماراتك
        </p>
      </div>

      {/* Success Banner */}
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      {/* Summary */}
      {!isLoading && <SummaryStrip summary={summary} />}

      {/* Request Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {REQUEST_TYPES.map((type) => (
          <RequestTypeCard
            key={type.key}
            type={type}
            onClick={() => setConfirmType(type.key)}
          />
        ))}
      </div>

      {/* History Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <i className="fas fa-clock-rotate-left text-gray-400" aria-hidden="true" />
          سجل الطلبات
        </h2>

        {isLoading ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onSign={setNafathRequest}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmType && (
        <ConfirmModal
          requestType={confirmType}
          contracts={contracts}
          user={user}
          onClose={() => setConfirmType(null)}
          onSuccess={handleSuccess}
        />
      )}

      {nafathRequest && (
        <NafathModal
          request={nafathRequest}
          onClose={() => setNafathRequest(null)}
          onSuccess={handleNafathSuccess}
        />
      )}
    </div>
  );
}