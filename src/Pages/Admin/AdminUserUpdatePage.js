import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useAuth } from '../../Context/AuthContext';
import { fetchAdminUserById, putAdminUser } from '../../utils/adminUserApi';
import '../../Css/dashboard.css';
import '../../Css/pages/admin-users-page.css';

function formatBirthDateUmmAlQura(isoYmd, language) {
  if (!isoYmd || !/^\d{4}-\d{2}-\d{2}$/.test(isoYmd)) return null;
  const [y, mo, d] = isoYmd.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      calendar: 'islamic-umalqura',
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
  } catch {
    return null;
  }
}

const FIELD_ORDER = [
  'national_id', 'birth_date', 'first_name', 'father_name',
  'grandfather_name', 'family_name', 'region', 'phone', 'email', 'bank_name', 'iban',
];

const EMPTY_FORM = {
  national_id: '', first_name: '', family_name: '', father_name: '',
  grandfather_name: '', birth_date: '', region: '',
  email: '', bank_name: '', iban: '', phone: '',
};

const AdminUserUpdatePage = () => {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading]       = useState(true);
  const [profile, setProfile]       = useState(null);
  const [error, setError]           = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  // ── load user ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const { user } = await fetchAdminUserById(userId, getAuthHeaders());
      if (!user || typeof user !== 'object') {
        setError(isRTL ? 'لا توجد بيانات' : 'No data available');
        return;
      }
      setProfile(user);

      // Normalise IBAN — always prefix SA
      const rawIban   = String(user.iban || '');
      const cleanIban = rawIban.toUpperCase().startsWith('SA') ? rawIban : `SA${rawIban}`;

      setFormData({
        national_id:      user.national_id      || '',
        first_name:       user.first_name        || '',
        family_name:      user.family_name       || user.last_name || '',
        father_name:      user.father_name       || '',
        grandfather_name: user.grandfather_name  || '',
        birth_date:       user.birth_date        || '',
        region:           user.region            || '',
        email:            user.email             || '',
        bank_name:        user.bank_name         || '',
        iban:             cleanIban,
        phone:            user.phone || user.phone_number || '',
      });
      setErrors({});
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || (isRTL ? 'فشل في جلب البيانات' : 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeaders, isRTL]);

  useEffect(() => { load(); }, [load]);

  const hijriBirthDisplay = useMemo(
    () => formatBirthDateUmmAlQura(formData.birth_date, i18n.language),
    [formData.birth_date, i18n.language]
  );

  // ── field change ──────────────────────────────────────────────────────────

  const handleChange = (field, value) => {
    let v = value;
    if (field === 'iban') {
      const stripped = String(value).replace(/^SA/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      v = `SA${stripped}`;
    }
    setFormData(prev => ({ ...prev, [field]: v }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  // ── validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const next = {};
    if (!formData.first_name.trim())       next.first_name       = `${t('first_name')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.family_name.trim())      next.family_name      = `${t('family_name')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.father_name.trim())      next.father_name      = `${t('father_name')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.grandfather_name.trim()) next.grandfather_name = `${t('grandfather_name')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.birth_date)              next.birth_date       = `${t('birth_date')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.region.trim())           next.region           = `${t('region')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.bank_name.trim())        next.bank_name        = `${t('bank_name')} ${t('dashboard.form.error.required_field')}`;
    if (!formData.iban.trim())             next.iban             = `${t('iban')} ${t('dashboard.form.error.required_field')}`;
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = t('dashboard.form.error.invalid_email');
    }
    if (!formData.phone.trim()) {
      next.phone = `${t('phone_number')} ${t('dashboard.form.error.required_field')}`;
    } else {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 20) next.phone = t('dashboard.form.error.phone_length');
    }
    return next;
  };

  const scrollToFirstError = (errs) => {
    const key = FIELD_ORDER.find(k => errs[k]);
    if (!key) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`admin-user-field-${key}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = el.querySelector('.react-international-phone-input') ||
        el.querySelector('input:not([type="hidden"]), textarea, select');
      if (focusable && !focusable.disabled) focusable.focus({ preventScroll: true });
    });
  };

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) { scrollToFirstError(validationErrors); return; }
    if (!profile) return;

    setSubmitting(true);
    try {
      // Send ALL editable fields — backend ignores unchanged ones via Rule::unique ignore
      const body = {
        first_name:       formData.first_name.trim()       || null,
        family_name:      formData.family_name.trim()      || null,
        father_name:      formData.father_name.trim()      || null,
        grandfather_name: formData.grandfather_name.trim() || null,
        birth_date:       formData.birth_date              || null,
        region:           formData.region.trim()           || null,
        phone:            formData.phone.trim()            || null,
        email:            formData.email.trim()            || null,
        bank_name:        formData.bank_name.trim()        || null,
        iban:             formData.iban.trim().replace(/\s/g, '') || null,
      };

      const response = await putAdminUser(profile, body, getAuthHeaders());

      if (response?.data?.success !== false) {
        Store.addNotification({
          title:     t('admin.success.title'),
          message:   response?.data?.message || t('admin.success.user_updated'),
          type:      'success',
          insert:    'top',
          container: 'top-right',
          dismiss:   { duration: 3000 },
        });
        navigate(`/admin/users/${userId}/show`);
      } else {
        throw new Error(response?.data?.message || 'Update failed');
      }
    } catch (err) {
      // Map Laravel validation errors back to fields
      if (err?.response?.data?.errors) {
        const raw      = err.response.data.errors;
        const apiErrors = {};
        if (Array.isArray(raw)) {
          raw.forEach(item => { if (item.code) apiErrors[item.code] = item.message; });
        } else if (typeof raw === 'object') {
          Object.entries(raw).forEach(([k, v]) => { apiErrors[k] = Array.isArray(v) ? v[0] : v; });
        }
        setErrors(prev => ({ ...prev, ...apiErrors }));
        scrollToFirstError(apiErrors);
      }
      Store.addNotification({
        title:     t('admin.error.title'),
        message:   err?.response?.data?.message || err?.message || t('admin.error.update_user'),
        type:      'danger',
        insert:    'top',
        container: 'top-right',
        dismiss:   { duration: 5000 },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => navigate(`/admin/users/${userId}/show`);

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="admin-user-update-page page-loading-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="page-loading">
          <Watch height="60" width="60" radius="9" color="#2563eb" ariaLabel="loading" />
          <p>{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="admin-user-update-page" dir={isRTL ? 'rtl' : 'ltr'}>
        <button type="button" className="admin-user-detail-back" onClick={() => navigate('/admin/users')}>
          <i className={`fas ${isRTL ? 'fa-arrow-right' : 'fa-arrow-left'}`} aria-hidden />
          {t('admin.users.back_to_list')}
        </button>
        <div className="profile-error-banner" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden />
          <span>{error || (isRTL ? 'لا توجد بيانات' : 'No data available')}</span>
        </div>
      </div>
    );
  }

  // ── helpers for cleaner JSX ───────────────────────────────────────────────

  const Field = ({ id, label, required, children, error: fieldError }) => (
    <div className="form-group" id={`admin-user-field-${id}`}>
      <label>{label}{required && ' *'}</label>
      {children}
      {fieldError && <p className="error-message">{fieldError}</p>}
    </div>
  );

  const TextInput = ({ field, required, ...props }) => (
    <input
      type="text"
      value={formData[field]}
      onChange={e => handleChange(field, e.target.value)}
      className={errors[field] ? 'input-error' : ''}
      required={required}
      {...props}
    />
  );

  return (
    <div className="admin-user-update-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="admin-user-update-header">
        <button type="button" className="admin-user-detail-back" onClick={back}>
          <i className={`fas ${isRTL ? 'fa-arrow-right' : 'fa-arrow-left'}`} aria-hidden />
          {t('admin.users.back_to_profile')}
        </button>
        <div>
          <h1 className="admin-user-update-title">{t('admin.users.update_user_title')}</h1>
          <p className="admin-user-update-subtitle">{t('admin.users.edit_info')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-completion-form admin-user-update-form" noValidate>

        {/* ── Personal info ────────────────────────────────────────────── */}
        <div className="form-section">
          <h3>{t('admin.users.personal_info')}</h3>

          <div className="form-row">
            <Field id="national_id" label={t('national_id')}>
              <input type="text" value={formData.national_id} readOnly className="admin-user-field-readonly" />
            </Field>

            <Field id="birth_date" label={t('birth_date')} required error={errors.birth_date}>
              <p className="birth-date-gregorian-note">{t('birth_date_gregorian_picker_note')}</p>
              <input
                id="admin-user-birth-date"
                type="date"
                value={formData.birth_date}
                onChange={e => handleChange('birth_date', e.target.value)}
                className={errors.birth_date ? 'input-error' : ''}
                required
              />
              {hijriBirthDisplay && (
                <p className="birth-date-hijri-equivalent" role="status">
                  <span className="birth-date-hijri-label">{t('birth_date_hijri_umalqura_label')}:</span>{' '}
                  <span className="birth-date-hijri-value">{hijriBirthDisplay}</span>
                </p>
              )}
            </Field>
          </div>

          <div className="form-row">
            <Field id="first_name" label={t('first_name')} required error={errors.first_name}>
              <TextInput field="first_name" required />
            </Field>
            <Field id="father_name" label={t('father_name')} required error={errors.father_name}>
              <TextInput field="father_name" required />
            </Field>
          </div>

          <div className="form-row">
            <Field id="grandfather_name" label={t('grandfather_name')} required error={errors.grandfather_name}>
              <TextInput field="grandfather_name" required />
            </Field>
            <Field id="family_name" label={t('family_name')} required error={errors.family_name}>
              <TextInput field="family_name" required />
            </Field>
          </div>

          <div className="form-row">
            <Field id="region" label={t('region')} required error={errors.region}>
              <TextInput field="region" required />
            </Field>
          </div>
        </div>

        {/* ── Contact info ─────────────────────────────────────────────── */}
        <div className="form-section">
          <h3>{t('admin.users.contact_info')}</h3>
          <div className="form-row">
            <Field id="phone" label={t('phone_number')} required error={errors.phone}>
              <PhoneInput
                defaultCountry="sa"
                value={formData.phone}
                onChange={phone => handleChange('phone', phone)}
                className={errors.phone ? 'phone-input-error' : ''}
                inputStyle={{
                  width: '100%', padding: '12px', fontSize: '16px',
                  fontFamily: '"Cairo", sans-serif',
                  border: errors.phone ? '1px solid #dc3545' : '1px solid #ddd',
                  borderRadius: '6px',
                }}
                countrySelectorStyleProps={{
                  buttonStyle: {
                    padding: '12px', backgroundColor: '#f5f5f5',
                    border: errors.phone ? '1px solid #dc3545' : '1px solid #ddd',
                    borderRadius: '6px 0 0 6px',
                  },
                }}
              />
            </Field>

            <Field id="email" label={t('email')} error={errors.email}>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className={errors.email ? 'input-error' : ''}
              />
            </Field>
          </div>
        </div>

        {/* ── Banking info ─────────────────────────────────────────────── */}
        <div className="form-section">
          <h3>{t('admin.users.banking_info')}</h3>
          <div className="form-row">
            <Field id="bank_name" label={t('bank_name')} required error={errors.bank_name}>
              <TextInput field="bank_name" required />
            </Field>

            <Field id="iban" label={t('iban')} required error={errors.iban}>
              <div className="admin-user-iban-wrap">
                <span className="admin-user-iban-prefix">SA</span>
                <input
                  type="text"
                  value={formData.iban.toUpperCase().startsWith('SA') ? formData.iban.substring(2) : formData.iban}
                  onChange={e => handleChange('iban', e.target.value)}
                  className={errors.iban ? 'input-error' : ''}
                  required
                  dir="ltr"
                />
              </div>
            </Field>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="form-actions admin-user-update-actions">
          <button type="button" className="cancel-btn" disabled={submitting} onClick={back}>
            {t('admin.users.confirm_cancel')}
          </button>
          <button type="submit" className="submit-btn primary-btn" disabled={submitting}>
            {submitting ? (
              <><Watch height="20" width="20" color="#fff" ariaLabel="loading" /> {t('dashboard.form.submitting')}</>
            ) : (
              t('admin.users.update')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminUserUpdatePage;