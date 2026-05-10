// src/features/requests/modals/NafathModal.jsx
import { useState } from 'react';
import { Watch } from 'react-loader-spinner';
import { useNafath } from '../hooks/useNafath';

const STEPS = {
  waiting: 'waiting',
  pending: 'pending',
  failed: 'failed',
};

export function NafathModal({ request, onClose, onSuccess }) {
  const [step, setStep] = useState(STEPS.waiting);
  const [nafathCode, setNafathCode] = useState('');
  const [error, setError] = useState('');

  const nafathMutation = useNafath();

  const handleInitiate = async () => {
    setError('');
    try {
      const result = await nafathMutation.mutateAsync({ requestId: request.id });
      setNafathCode(result.challenge_number || '');
      setStep(STEPS.pending);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل بدء التوثيق');
      setStep(STEPS.failed);
    }
  };

  const handleSuccess = () => {
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <i className="fas fa-lock" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">توثيق الفاتورة</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">توقيع الفاتورة عبر تطبيق نفاذ</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="إغلاق"
          >
            <i className="fas fa-times text-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === STEPS.waiting && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                اضغط أدناه لبدء عملية التوثيق الآمنة عبر تطبيق نفاذ
              </p>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === STEPS.pending && (
            <div className="text-center space-y-4">
              <div className="text-5xl">📱</div>
              <p className="font-semibold text-gray-900 dark:text-white">تم إرسال الطلب إلى تطبيق نفاذ</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">يرجى فتح التطبيق واختيار الرقم للموافقة</p>
              {nafathCode && (
                <div className="inline-block bg-gray-100 dark:bg-gray-700 rounded-xl px-6 py-3 font-mono text-lg font-bold text-gray-900 dark:text-white">
                  {nafathCode}
                </div>
              )}
            </div>
          )}

          {step === STEPS.failed && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <i className="fas fa-circle-exclamation text-2xl" aria-hidden="true" />
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium">حدث خطأ</p>
              {error && <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {step === STEPS.pending ? 'إغلاق' : 'إلغاء'}
          </button>

          {step === STEPS.waiting && (
            <button
              type="button"
              onClick={handleInitiate}
              disabled={nafathMutation.isPending}
              className="flex-1 py-3 px-4 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {nafathMutation.isPending ? (
                <>
                  <Watch height={18} width={18} color="#fff" ariaLabel="loading" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <i className="fas fa-mobile-screen-button" aria-hidden="true" />
                  فتح نفاذ
                </>
              )}
            </button>
          )}

          {step === STEPS.pending && (
            <button
              type="button"
              onClick={handleSuccess}
              className="flex-1 py-3 px-4 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-circle-check" aria-hidden="true" />
              تمت الموافقة
            </button>
          )}

          {step === STEPS.failed && (
            <button
              type="button"
              onClick={handleInitiate}
              className="flex-1 py-3 px-4 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-rotate-right" aria-hidden="true" />
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}