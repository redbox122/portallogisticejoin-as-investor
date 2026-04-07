import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/profile-page.css';

// Support: WhatsApp number, email, or support page URL (set in .env or override here)
const SUPPORT_WHATSAPP = process.env.REACT_APP_SUPPORT_WHATSAPP || '';
const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || 'support@example.com';
const SUPPORT_URL = process.env.REACT_APP_SUPPORT_URL || '';

const ProfilePage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const isRTL = i18n.language === 'ar';
  
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    setProfile(null);
    const token = localStorage.getItem('portal_logistics_token');
    if (!token) {
      setError(i18n.language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please log in first');
      setLoading(false);
      return;
    }
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/portallogistice/profile`, { headers });
      if (!res || typeof res !== 'object') {
        setError(i18n.language === 'ar' ? 'فشل في جلب البيانات' : 'Failed to load data');
        return;
      }
      const data = res?.data?.data ?? null;
      const user = data != null && typeof data === 'object' && data.user !== undefined
        ? data.user
        : data;
      if (!user || typeof user !== 'object') {
        setError(i18n.language === 'ar' ? 'لا توجد بيانات' : 'No data available');
        return;
      }
      setProfile(user);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        (i18n.language === 'ar' ? 'فشل في جلب البيانات' : 'Failed to load data')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSupportClick = () => {
    if (SUPPORT_WHATSAPP) {
      const num = SUPPORT_WHATSAPP.replace(/\D/g, '');
      window.open(`https://wa.me/${num}`, '_blank', 'noopener,noreferrer');
    } else if (SUPPORT_URL) {
      window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = `mailto:${SUPPORT_EMAIL}`;
    }
  };

  if (loading) {
    return (
      <div className="profile-page profile-page--readonly page-loading-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="page-loading">
          <Watch height="60" width="60" radius="9" color="#2563eb" ariaLabel="loading" />
          <p>{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page profile-page--readonly" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="profile-page-header">
          <h1 className="profile-page-title">{t('dashboard.profile_title')}</h1>
        </div>
        <div className="profile-error-banner" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const lastName = profile?.family_name ?? profile?.last_name;
  const fatherName = profile?.father_name ?? '—';
  const grandfatherName = profile?.grandfather_name ?? '—';
  const birthDate = profile?.birth_date ?? '—';
  const iban = profile?.iban ?? '—';
  const bankName = profile?.bank_name ?? '—';
  const region = profile?.region ?? '—';
  const fullName = profile?.full_name || [profile?.first_name,fatherName,grandfatherName, lastName].filter(Boolean).join(' ').trim() || '—';
  const email = profile?.email ?? '—';
  const phone = profile?.phone ?? profile?.phone_number ?? '—';
  const nationalId = profile?.national_id ?? '—';
  const role = profile?.role || (profile?.is_admin ? 'admin' : 'user');
  const roleLabel = role === 'admin' ? (i18n.language === 'ar' ? 'مدير' : 'Admin') : (i18n.language === 'ar' ? 'مستخدم' : 'User');
  const status = profile?.is_active === false ? (i18n.language === 'ar' ? 'غير نشط' : 'Inactive') : (i18n.language === 'ar' ? 'نشط' : 'Active');
  const avatarInitial = (profile?.first_name?.[0] || profile?.family_name?.[0] || profile?.last_name?.[0] || profile?.full_name?.[0] || '?').toUpperCase();

  const supportNoticeAr = 'لتعديل بياناتك يرجى التواصل مع الدعم';
  const supportNoticeEn = 'To update your details, please contact support.';
  const supportBtnAr = 'التواصل مع الدعم';
  const supportBtnEn = 'Contact Support';

  return (
    <div className="profile-page profile-page--readonly" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="profile-page-header">
        <h1 className="profile-page-title">{t('dashboard.profile_title')}</h1>
        <p className="profile-page-subtitle">{t('dashboard.profile.subtitle')}</p>
      </div>

      {error && (
        <div className="profile-error-banner" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {!profile && !loading && (
        <div className="profile-empty-state">
          <i className="fas fa-user-slash" aria-hidden />
          <p>{i18n.language === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
        </div>
      )}

      {profile && (
        <>
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
                <span className="profile-readonly-label">{i18n.language === 'ar' ? 'الدور' : 'Role'}</span>
                <span className="profile-readonly-value">{roleLabel}</span>
              </div>
              <div className="profile-readonly-item">
                <span className="profile-readonly-label">{i18n.language === 'ar' ? 'الحالة' : 'Status'}</span>
                <span className={`profile-readonly-value profile-readonly-status profile-readonly-status--${profile?.is_active === false ? 'inactive' : 'active'}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-support-notice">
            <i className="fas fa-info-circle" aria-hidden />
            <p>{isRTL ? supportNoticeAr : supportNoticeEn}</p>
          </div>

          <div className="profile-support-actions">
            <button type="button" className="profile-support-btn" onClick={handleSupportClick}>
              <i className="fas fa-headset" aria-hidden />
              {isRTL ? supportBtnAr : supportBtnEn}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;
