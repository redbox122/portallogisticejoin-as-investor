import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Warning-style confirmation before activate / deactivate.
 */
const AdminUserStatusConfirmModal = ({
  open,
  variant,
  loading,
  onCancel,
  onConfirm,
}) => {
  const { t, i18n } = useTranslation(['common']);
  const isRTL = i18n.language === 'ar';

  if (!open) return null;

  const isDeactivate = variant === 'deactivate';
  const title = isDeactivate
    ? t('admin.users.confirm_deactivate_title')
    : t('admin.users.confirm_activate_title');
  const message = isDeactivate
    ? t('admin.users.confirm_deactivate_message')
    : t('admin.users.confirm_activate_message');

  return (
    <div
      className="admin-user-status-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-status-modal-title"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        className="admin-user-status-modal-backdrop"
        aria-label={t('admin.users.confirm_cancel')}
        onClick={onCancel}
        disabled={loading}
      />
      <div className="admin-user-status-modal-panel">
        <div
          className={`admin-user-status-modal-icon${isDeactivate ? ' admin-user-status-modal-icon--danger' : ' admin-user-status-modal-icon--warn'}`}
          aria-hidden
        >
          <i className={`fas ${isDeactivate ? 'fa-user-slash' : 'fa-user-check'}`} />
        </div>
        <h2 id="admin-user-status-modal-title" className="admin-user-status-modal-title">
          {title}
        </h2>
        <p className="admin-user-status-modal-text">{message}</p>
        <div className="admin-user-status-modal-actions">
          <button type="button" className="admin-user-status-btn admin-user-status-btn--ghost" onClick={onCancel} disabled={loading}>
            {t('admin.users.confirm_cancel')}
          </button>
          <button
            type="button"
            className={`admin-user-status-btn${isDeactivate ? ' admin-user-status-btn--danger' : ' admin-user-status-btn--primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t('dashboard.form.submitting') : t('admin.users.confirm_proceed')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserStatusConfirmModal;
