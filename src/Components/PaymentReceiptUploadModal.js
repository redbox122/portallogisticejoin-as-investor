import React, { useEffect, useMemo, useState } from 'react';
import '../Css/components/payment-receipt-upload-modal.css';

const MAX_MB = 10;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export default function PaymentReceiptUploadModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  error,
  contractId,
}) {
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (isOpen) setFile(null);
  }, [isOpen]);

  const fileHint = useMemo(() => {
    if (!file) return 'الملفات المسموحة: صورة (JPG/PNG/WEBP) أو PDF — بحد أقصى 10MB.';
    return `الملف المختار: ${file.name}${file.size ? ` (${formatBytes(file.size)})` : ''}`;
  }, [file]);

  if (!isOpen) return null;

  const disabled = isSaving;
  const canSave = !!file && !disabled;

  return (
    <div className="payment-receipt-modal-overlay" role="dialog" aria-modal="true" aria-label="رفع إيصال الدفع">
      <div className="payment-receipt-modal">
        <div className="payment-receipt-modal-header">
          <div className="payment-receipt-modal-title">
            <strong>رفع إيصال الدفع</strong>
            {contractId ? <span className="payment-receipt-modal-subtitle">للعقد رقم #{contractId}</span> : null}
          </div>
          <button className="payment-receipt-modal-close" type="button" onClick={onClose} disabled={disabled} aria-label="إغلاق">
            ×
          </button>
        </div>

        <div className="payment-receipt-modal-body">
          <label className="payment-receipt-modal-label" htmlFor="payment-receipt-file">
            اختر ملف إيصال الدفع
          </label>
          <input
            id="payment-receipt-file"
            className="payment-receipt-modal-input"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={disabled}
          />
          <div className="payment-receipt-modal-hint">{fileHint}</div>

          {!!error && <div className="payment-receipt-modal-error">{error}</div>}
          {!!file && file.size > MAX_MB * 1024 * 1024 && (
            <div className="payment-receipt-modal-error">حجم الملف كبير. الحد الأقصى {MAX_MB}MB.</div>
          )}
        </div>

        <div className="payment-receipt-modal-footer">
          <button className="payment-receipt-modal-btn payment-receipt-modal-btn-ghost" type="button" onClick={onClose} disabled={disabled}>
            إلغاء
          </button>
          <button
            className="payment-receipt-modal-btn payment-receipt-modal-btn-primary"
            type="button"
            onClick={() => onSave?.(file)}
            disabled={!canSave || (file?.size || 0) > MAX_MB * 1024 * 1024}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

