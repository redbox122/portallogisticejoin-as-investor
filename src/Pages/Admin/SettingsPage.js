import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-settings-page.css';

const AdminSettingsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    motor_year: '',
    motor_model: '',
    rental_ownership_percentage: '',
    selling_price: '',
    rental_price: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/contracts/template-settings`,
        { headers }
      );

      if (response.data?.success) {
        setSettings(response.data.data || settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.error.fetch_settings'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setErrors({});
    const newErrors = {};

    if (!settings.motor_year) {
      newErrors.motor_year = t('admin.settings.error.motor_year_required');
    }
    if (!settings.motor_model) {
      newErrors.motor_model = t('admin.settings.error.motor_model_required');
    }
    if (!settings.rental_ownership_percentage || isNaN(settings.rental_ownership_percentage)) {
      newErrors.rental_ownership_percentage = t('admin.settings.error.rental_percentage_required');
    }
    if (!settings.selling_price || isNaN(settings.selling_price) || parseFloat(settings.selling_price) <= 0) {
      newErrors.selling_price = t('admin.settings.error.selling_price_required');
    }
    if (!settings.rental_price || isNaN(settings.rental_price) || parseFloat(settings.rental_price) <= 0) {
      newErrors.rental_price = t('admin.settings.error.rental_price_required');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}/portallogistice/admin/contracts/template-settings`,
        settings,
        { headers }
      );
      Store.addNotification({
        title: t('admin.success.title'),
        message: t('admin.success.settings_updated'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000 }
      });
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.update_settings'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.sidebar.settings')}</h1>
          <p className="admin-page-subtitle">{t('admin.settings.subtitle')}</p>
        </div>
      </div>

      <div className="admin-settings-content">
        <div className="admin-settings-section">
          <h2 className="admin-settings-section-title">{t('admin.contracts.template_settings')}</h2>
          
          <div className="admin-settings-form">
            <div className="admin-form-group">
              <label>{t('admin.contracts.motor_year')}</label>
              <input
                type="text"
                className={`admin-form-input ${errors.motor_year ? 'error' : ''}`}
                placeholder={t('admin.contracts.motor_year_placeholder')}
                value={settings.motor_year}
                onChange={(e) => setSettings({ ...settings, motor_year: e.target.value })}
              />
              {errors.motor_year && <span className="admin-form-error">{errors.motor_year}</span>}
            </div>

            <div className="admin-form-group">
              <label>{t('admin.contracts.motor_model')}</label>
              <input
                type="text"
                className={`admin-form-input ${errors.motor_model ? 'error' : ''}`}
                placeholder={t('admin.contracts.motor_model_placeholder')}
                value={settings.motor_model}
                onChange={(e) => setSettings({ ...settings, motor_model: e.target.value })}
              />
              {errors.motor_model && <span className="admin-form-error">{errors.motor_model}</span>}
            </div>

            <div className="admin-form-group">
              <label>{t('admin.contracts.rental_ownership_percentage')}</label>
              <input
                type="number"
                className={`admin-form-input ${errors.rental_ownership_percentage ? 'error' : ''}`}
                placeholder={t('admin.contracts.rental_ownership_placeholder')}
                value={settings.rental_ownership_percentage}
                onChange={(e) => setSettings({ ...settings, rental_ownership_percentage: e.target.value })}
              />
              {errors.rental_ownership_percentage && (
                <span className="admin-form-error">{errors.rental_ownership_percentage}</span>
              )}
            </div>

            <div className="admin-form-group">
              <label>{t('admin.contracts.selling_price') || 'سعر عقد البيع (ريال)'}</label>
              <input
                type="number"
                step="0.01"
                className={`admin-form-input ${errors.selling_price ? 'error' : ''}`}
                placeholder={t('admin.contracts.selling_price_placeholder') || '6600.00'}
                value={settings.selling_price}
                onChange={(e) => setSettings({ ...settings, selling_price: e.target.value })}
              />
              {errors.selling_price && (
                <span className="admin-form-error">{errors.selling_price}</span>
              )}
            </div>

            <div className="admin-form-group">
              <label>{t('admin.contracts.rental_price') || 'سعر عقد الإيجار الشهري (ريال)'}</label>
              <input
                type="number"
                step="0.01"
                className={`admin-form-input ${errors.rental_price ? 'error' : ''}`}
                placeholder={t('admin.contracts.rental_price_placeholder') || '660.00'}
                value={settings.rental_price}
                onChange={(e) => setSettings({ ...settings, rental_price: e.target.value })}
              />
              {errors.rental_price && (
                <span className="admin-form-error">{errors.rental_price}</span>
              )}
            </div>

            <div className="admin-settings-actions">
              <button
                className="admin-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Watch height="20" width="20" radius="9" color="#ffffff" ariaLabel="saving" />
                    {t('admin.settings.saving')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    {t('admin.contracts.save_settings')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
