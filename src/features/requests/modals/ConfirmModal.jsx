// src/features/requests/modals/ConfirmModal.jsx
import { useState } from 'react';
import { Watch } from 'react-loader-spinner';
import { useCreateRequest } from '../hooks/useCreateRequest';
import { useRequestForm } from '../hooks/useRequestForm';
import { getRequestTypeMeta } from '../utils/formatters';
import { COLOR_MAP } from '../constants/constants';

export function ConfirmModal({ requestType, contracts, user, onClose, onSuccess }) {
  const typeMeta = getRequestTypeMeta(requestType);
  const colors = typeMeta ? COLOR_MAP[typeMeta.color] : COLOR_MAP.blue;

  const { form, errors, setField, validate, setErrors } = useRequestForm(user);
  const createMutation = useCreateRequest();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationErrors = validate(typeMeta?.needContract);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        type: requestType,
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        phone: form.phone.trim(),
        contract_id: form.contract_id || undefined,
      });
      onSuccess(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 flex items-start gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
            <i className={`fas ${typeMeta?.icon}`} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{typeMeta?.label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{typeMeta?.desc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="إغلاق"
          >
            <i className="fas fa-times text-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            يرجى التأكد من صحة بياناتك قبل تقديم الطلب.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                className={`w-full rounded-lg border px-4 py-3  dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${errors.full_name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-500'
                  }`}
              />
              {errors.full_name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رقم الهوية الوطنية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.national_id}
                dir="ltr"
                onChange={(e) => setField('national_id', e.target.value)}
                className={`w-full rounded-lg border px-4 py-3  dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${errors.national_id ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-500'
                  }`}
              />
              {errors.national_id && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.national_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رقم الجوال <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                dir="ltr"
                onChange={(e) => setField('phone', e.target.value)}
                className={`w-full rounded-lg border px-4 py-3  dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-500'
                  }`}
              />
              {errors.phone && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>}
            </div>

            {typeMeta?.needContract && contracts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  العقد المرتبط <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.contract_id}
                  onChange={(e) => setField('contract_id', e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3  dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${errors.contract_id ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                >
                  <option value="">اختر العقد</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} — {c.title} ({c.type === 'rental' ? 'استئجار' : 'مبايعة'})
                    </option>
                  ))}
                </select>
                {errors.contract_id && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.contract_id}</p>}
              </div>
            )}
          </div>

          {requestType === 'add_bike' && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <i className="fab fa-whatsapp text-green-600 dark:text-green-400 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-green-800 dark:text-green-300">
                سيتم التواصل معك عبر الواتساب لتأكيد بيانات العنوان الوطني والآيبان.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${colors.btn}`}
          >
            {isSubmitting ? (
              <>
                <Watch height={18} width={18} color="#fff" ariaLabel="loading" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane" aria-hidden="true" />
                تأكيد وإرسال
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 