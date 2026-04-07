import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { useAuth } from '../../Context/AuthContext';
import {
  fetchAdminUserById,
  postAdminUserActivate,
  postAdminUserDeactivate,
} from '../../utils/adminUserApi';
import AdminUserStatusConfirmModal from '../../Components/Admin/AdminUserStatusConfirmModal';
import '../../Css/pages/profile-page.css';
import '../../Css/pages/admin-users-page.css';

const AdminUserShowPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, variant: null });
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const headers = getAuthHeaders();
      const { user } = await fetchAdminUserById(userId, headers);
      if (!user || typeof user !== 'object') {
        setError(isRTL ? 'لا توجد بيانات' : 'No data available');
        return;
      }
      setProfile(user);
    } catch (err) {
      console.error('Admin user show:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          (isRTL ? 'فشل في جلب البيانات' : 'Failed to load data')
      );
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeaders, isRTL]);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = profile ? profile.status === 'active' : false;

  const openStatusModal = (variant) => setStatusModal({ open: true, variant });
  const closeStatusModal = () => setStatusModal({ open: false, variant: null });

  const confirmStatusChange = async () => {
    const variant = statusModal.variant;
    if (!variant || !userId) return;
    setStatusLoading(true);
    try {
      const headers = getAuthHeaders();
      const res =
        variant === 'deactivate'
          ? await postAdminUserDeactivate(userId, headers)
          : await postAdminUserActivate(userId, headers);
      const ok = res?.data?.success !== false;
      if (ok) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: res?.data?.message || t('admin.success.user_updated'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000 },
        });
        closeStatusModal();
        await load();
      } else {
        throw new Error(res?.data?.message || 'Request failed');
      }
    } catch (err) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: err?.response?.data?.message || err?.message || t('admin.error.update_user'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 },
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const backToList = () => navigate('/admin/users');

  if (loading) {
    return (
      <div className="admin-user-detail-page page-loading-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="page-loading">
          <Watch height="60" width="60" radius="9" color="#2563eb" ariaLabel="loading" />
          <p>{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="admin-user-detail-page" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="admin-user-detail-toolbar">
          <button type="button" className="admin-user-detail-back" onClick={backToList}>
            <i className={`fas ${isRTL ? 'fa-arrow-right' : 'fa-arrow-left'}`} aria-hidden />
            {t('admin.users.back_to_list')}
          </button>
        </div>
        <div className="profile-error-banner" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden />
          <span>{error || (isRTL ? 'لا توجد بيانات' : 'No data available')}</span>
        </div>
      </div>
    );
  }

  const lastName = profile?.family_name ?? profile?.last_name;
  const fullName =
    profile?.full_name ||
    [profile?.first_name, lastName].filter(Boolean).join(' ').trim() ||
    profile?.name ||
    '—';
  const email = profile?.email ?? '—';
  const phone = profile?.phone ?? profile?.phone_number ?? '—';
  const nationalId = profile?.national_id ?? '—';
  const fatherName = profile?.father_name ?? '—';
  const grandfatherName = profile?.grandfather_name ?? '—';
  const birthDate = profile?.birth_date ?? '—';
  const region = profile?.region ?? '—';
  const iban = profile?.iban ?? '—';
  const bankName = profile?.bank_name ?? '—';
  const role = profile?.role || (profile?.is_admin ? 'admin' : 'user');
  const roleLabel =
    role === 'admin' ? (isRTL ? 'مدير' : 'Admin') : isRTL ? 'مستخدم' : 'User';
  const statusLabel = isActive ? t('admin.users.active') : t('admin.users.inactive');
  const avatarInitial = (
    profile?.first_name?.[0] ||
    profile?.family_name?.[0] ||
    profile?.name?.[0] ||
    fullName?.[0] ||
    '?'
  ).toUpperCase();

  const maxContracts =
    profile?.max_contracts_allowed != null && profile?.max_contracts_allowed !== ''
      ? String(profile.max_contracts_allowed)
      : t('admin.users.unlimited');

  return (
    <div className="admin-user-detail-page profile-page profile-page--readonly" dir={isRTL ? 'rtl' : 'ltr'}>
      <AdminUserStatusConfirmModal
        open={statusModal.open}
        variant={statusModal.variant}
        loading={statusLoading}
        onCancel={() => {
          if (!statusLoading) closeStatusModal();
        }}
        onConfirm={confirmStatusChange}
      />

      <div className="admin-user-detail-toolbar">
        <button type="button" className="admin-user-detail-back" onClick={backToList}>
          <i className={`fas ${isRTL ? 'fa-arrow-right' : 'fa-arrow-left'}`} aria-hidden />
          {t('admin.users.back_to_list')}
        </button>
        <div className="admin-user-detail-toolbar-actions">
          <button
            type="button"
            className="admin-user-detail-btn admin-user-detail-btn--secondary"
            onClick={() => navigate(`/admin/users/${userId}/update`)}
          >
            <i className="fas fa-pen" aria-hidden />
            {t('admin.users.edit')}
          </button>
          {isActive ? (
            <button
              type="button"
              className="admin-user-detail-btn admin-user-detail-btn--danger"
              onClick={() => openStatusModal('deactivate')}
            >
              <i className="fas fa-user-slash" aria-hidden />
              {t('admin.users.deactivate')}
            </button>
          ) : (
            <button
              type="button"
              className="admin-user-detail-btn admin-user-detail-btn--success"
              onClick={() => openStatusModal('activate')}
            >
              <i className="fas fa-user-check" aria-hidden />
              {t('admin.users.activate')}
            </button>
          )}
        </div>
      </div>

      <div className="profile-page-header">
        <h1 className="profile-page-title">{t('admin.users.user_profile_title')}</h1>
        <p className="profile-page-subtitle">{t('admin.users.user_profile_subtitle')}</p>
      </div>

      <div className="profile-readonly-card">
        <div className="profile-readonly-avatar" aria-hidden="true">
          {avatarInitial}
        </div>
        <h2 className="profile-readonly-name">{fullName}</h2>
        <p className="profile-readonly-email">{email}</p>
        <div className="profile-readonly-grid">
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{t('dashboard.profile.full_name')}</span>
            <span className="profile-readonly-value">{fullName}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{t('email')}</span>
            <span className="profile-readonly-value">{email}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{t('phone_number')}</span>
            <span className="profile-readonly-value">{phone}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{t('national_id')}</span>
            <span className="profile-readonly-value">{nationalId}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'اسم الأب' : 'Father Name'}</span>
            <span className="profile-readonly-value">{fatherName}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'اسم الجد' : 'Grandfather Name'}</span>
            <span className="profile-readonly-value">{grandfatherName}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'تاريخ الميلاد' : 'Birth Date'}</span>
            <span className="profile-readonly-value">{birthDate}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'المنطقة' : 'Region'}</span>
            <span className="profile-readonly-value">{region}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'رقم الآيبان' : 'IBAN'}</span>
            <span className="profile-readonly-value">{iban}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'اسم البنك' : 'Bank Name'}</span>
            <span className="profile-readonly-value">{bankName}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{isRTL ? 'الدور' : 'Role'}</span>
            <span className="profile-readonly-value">{roleLabel}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">{t('admin.users.status')}</span>
            <span
              className={`profile-readonly-value profile-readonly-status profile-readonly-status--${isActive ? 'active' : 'inactive'}`}
            >
              {statusLabel}
            </span>
          </div>
       
        
        </div>
      </div>
    </div>
  );
};

export default AdminUserShowPage;
