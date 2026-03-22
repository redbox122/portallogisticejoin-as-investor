import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { API_BASE_URL } from '../config';

const ProfileCompletionModal = ({ userProfile, onComplete, onSkip }) => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState({
    national_id: '',
    first_name: '',
    family_name: '',
    father_name: '',
    grandfather_name: '',
    birth_date: '',
    region: '',
    email: '',
    bank_name: '',
    iban: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (userProfile && !isInitialized) {
      console.log('ProfileCompletionModal: Setting form data from userProfile:', userProfile);
      
      const ibanValue = userProfile.iban || '';
      // Ensure IBAN has SA prefix if it exists
      const processedIban = ibanValue && !ibanValue.startsWith('SA') ? 'SA' + ibanValue.replace(/^SA/i, '') : ibanValue;
      
      const newFormData = {
        national_id: userProfile.national_id || '',
        first_name: userProfile.first_name || '',
        family_name: userProfile.family_name || '',
        father_name: userProfile.father_name || '',
        grandfather_name: userProfile.grandfather_name || '',
        birth_date: userProfile.birth_date || '',
        region: userProfile.region || '',
        email: userProfile.email || '',
        bank_name: userProfile.bank_name || '',
        iban: processedIban || '',
        phone: userProfile.phone || userProfile.phone_number || ''
      };

      // If user previously saved a draft locally, merge it to prefill the form.
      try {
        const draftRaw = localStorage.getItem('profile_completion_draft');
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft && typeof draft === 'object') {
            Object.keys(newFormData).forEach((k) => {
              if (draft[k] !== undefined && draft[k] !== null) {
                newFormData[k] = draft[k];
              }
            });
          }
        }
      } catch (e) {
        // ignore draft errors
      }
      
      console.log('ProfileCompletionModal: Form data set:', newFormData);
      setFormData(newFormData);
      setIsInitialized(true);
    }
  }, [userProfile, isInitialized]);

  const handleChange = (field, value) => {
    let processedValue = value;
    if (field === 'iban') {
      // Remove "SA" if user typed it, then ensure it's always prefixed
      let cleanValue = value.replace(/^SA/i, '').toUpperCase();
      // Remove any non-alphanumeric characters
      cleanValue = cleanValue.replace(/[^A-Z0-9]/g, '');
      processedValue = 'SA' + cleanValue;
    }
    
    // Debug: Log national_id changes specifically
    if (field === 'national_id') {
      console.log('ProfileCompletionModal: National ID changed:', {
        oldValue: formData.national_id,
        newValue: processedValue,
        length: processedValue.length
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.national_id.trim()) {
      newErrors.national_id = `${t('national_id')} ${t('dashboard.form.error.required_field')}`;
    } else if (formData.national_id.trim().length < 10) {
      newErrors.national_id = t('dashboard.form.error.national_id_length') || 'National ID must be at least 10 digits';
    } else if (!/^\d{10}$/.test(formData.national_id.trim())) {
      newErrors.national_id = t('dashboard.form.error.invalid_national_id') || 'National ID must be 10 digits';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = `${t('first_name')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.family_name.trim()) {
      newErrors.family_name = `${t('family_name')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.father_name.trim()) {
      newErrors.father_name = `${t('father_name')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.grandfather_name.trim()) {
      newErrors.grandfather_name = `${t('grandfather_name')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.birth_date) {
      newErrors.birth_date = `${t('birth_date')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.region.trim()) {
      newErrors.region = `${t('region')} ${t('dashboard.form.error.required_field')}`;
    }
    // Validate email if provided (optional field)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = t('dashboard.form.error.invalid_email');
    }
    if (!formData.bank_name.trim()) {
      newErrors.bank_name = `${t('bank_name')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.iban.trim()) {
      newErrors.iban = `${t('iban')} ${t('dashboard.form.error.required_field')}`;
    }
    if (!formData.phone.trim()) {
      newErrors.phone = `${t('phone_number')} ${t('dashboard.form.error.required_field')}`;
    } else {
      const digitsOnly = formData.phone.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 20) {
        newErrors.phone = t('dashboard.form.error.phone_length');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraftAndClose = () => {
    try {
      localStorage.setItem('profile_completion_draft', JSON.stringify(formData));
    } catch (e) {
      // ignore storage failures
    }

    const isRTL = (i18n.language || 'ar') === 'ar';
    Store.addNotification({
      title: t('dashboard.success.title') || (isRTL ? 'تم' : 'Done'),
      message: isRTL
        ? 'تم حفظ البيانات مؤقتًا. يمكنك إكمالها لاحقًا وتصفح الداشبورد.'
        : 'Draft saved temporarily. You can complete later and browse the dashboard.',
      type: 'success',
      insert: 'top',
      container: 'top-right',
      dismiss: { duration: 4000, onScreen: true }
    });

    if (onSkip) onSkip();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Prepare data for API - according to updated API docs, PUT /portallogistice/profile accepts all fields
      const updateData = {
        national_id: formData.national_id.trim(),
        first_name: formData.first_name.trim(),
        family_name: formData.family_name.trim(),
        father_name: formData.father_name.trim(),
        grandfather_name: formData.grandfather_name.trim(),
        birth_date: formData.birth_date,
        region: formData.region.trim(),
        email: formData.email.trim() || userProfile?.email || '',
        bank_name: formData.bank_name.trim(),
        iban: formData.iban.trim(),
        phone: formData.phone.replace(/\D/g, '') // Remove non-digits for phone
      };

      // Debug: Log what we're sending
      console.log('ProfileCompletionModal: Form data before submit:', formData);
      console.log('ProfileCompletionModal: Update data being sent:', updateData);
      console.log('ProfileCompletionModal: National ID value:', {
        raw: formData.national_id,
        trimmed: formData.national_id.trim(),
        length: formData.national_id.trim().length,
        isEmpty: !formData.national_id.trim(),
        willBeSent: updateData.national_id
      });

      // CRITICAL: Ensure national_id is included - don't send empty string if validation passed
      // If validation passed, national_id must be 10 digits, so it should never be empty here
      if (!updateData.national_id || updateData.national_id.trim() === '') {
        console.error('ProfileCompletionModal: WARNING - national_id is empty but validation passed!', {
          formData: formData.national_id,
          updateData: updateData.national_id
        });
      }

      // Use PUT /portallogistice/profile endpoint (now accepts all fields per updated API docs)
      console.log('ProfileCompletionModal: Sending PUT request to:', `${API_BASE_URL}/portallogistice/profile`);
      console.log('ProfileCompletionModal: Request payload:', JSON.stringify(updateData, null, 2));
      
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/profile`,
        updateData,
        { headers }
      );
      
      console.log('ProfileCompletionModal: API Response:', response.data);

      if (response.data && response.data.success) {
        // Get updated user data from response and merge with submitted data
        // This ensures we have all fields even if API response is incomplete
        const apiUser = response.data.data?.user || response.data.data || {};
        const updatedUser = { ...updateData, ...apiUser };
        
        // Verify all required fields are present before completing
        // Use submitted data (updateData) as source of truth since we validated it before sending
        const requiredFields = [
          'national_id', 'first_name', 'family_name', 'father_name', 'grandfather_name',
          'birth_date', 'region', 'bank_name', 'iban', 'phone'
        ];
        const allFieldsComplete = requiredFields.every(field => {
          // Check submitted data first (updateData), then API response
          const value = updateData[field] || updatedUser[field] || updatedUser[field === 'phone' ? 'phone_number' : field];
          return value && value !== 'Unknown' && value.toString().trim() !== '';
        });
        
        if (allFieldsComplete) {
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: response.data.message || t('dashboard.success.profile_completed'),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 3000, onScreen: true }
          });
          
          // Only call onComplete if all fields are actually complete
          onComplete(updatedUser);
        } else {
          // Fields still incomplete - keep modal open
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.form.error.required_fields'),
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
        }
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Show detailed error message
      let errorMessage = t('dashboard.error.update_profile');
      if (error.response?.status === 500) {
        errorMessage = error.response?.data?.message || 'Server error. Please contact support if this persists.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 7000, onScreen: true }
      });
      
      // Don't close modal on error - let user try again
    } finally {
      setLoading(false);
    }
  };

  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';

  return (
    <div 
      className="modal-overlay profile-completion-overlay"
      onClick={(e) => {
        // Prevent closing by clicking outside - user must complete profile
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent closing by clicking overlay
        e.stopPropagation();
      }}
      style={{
        pointerEvents: 'auto',
        cursor: 'default'
      }}
    >
        <div className="modal-content large-modal profile-completion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{t('dashboard.complete_profile.title')}</h2>
            <p className="modal-subtitle">{t('dashboard.complete_profile.subtitle')}</p>
          </div>
          {onSkip && (
            <button type="button" className="close-btn" onClick={onSkip} aria-label="تخطي إكمال الملف الشخصي">
              <i className="fas fa-times" aria-hidden />
            </button>
          )}
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="profile-completion-form">
            {/* Personal Information */}
            <div className="form-section">
              <h3>{t('admin.users.personal_info')}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('national_id')} *</label>
                  <input
                    type="text"
                    value={formData.national_id}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '');
                      console.log('ProfileCompletionModal: National ID input changed:', {
                        rawInput: e.target.value,
                        cleanedValue: value,
                        currentFormData: formData.national_id
                      });
                      // Limit to 10 digits
                      if (value.length <= 10) {
                        handleChange('national_id', value);
                      }
                    }}
                    className={errors.national_id ? 'input-error' : ''}
                    placeholder={t('national_id_placeholder') || '1234567890'}
                    required
                    maxLength="10"
                  />
                  {errors.national_id && <p className="error-message">{errors.national_id}</p>}
                </div>
                <div className="form-group">
                  <label>{t('birth_date')} *</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    className={errors.birth_date ? 'input-error' : ''}
                    required
                  />
                  {errors.birth_date && <p className="error-message">{errors.birth_date}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('first_name')} *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className={errors.first_name ? 'input-error' : ''}
                    placeholder={t('first_name_placeholder')}
                    required
                  />
                  {errors.first_name && <p className="error-message">{errors.first_name}</p>}
                </div>
                <div className="form-group">
                  <label>{t('family_name')} *</label>
                  <input
                    type="text"
                    value={formData.family_name}
                    onChange={(e) => handleChange('family_name', e.target.value)}
                    className={errors.family_name ? 'input-error' : ''}
                    placeholder={t('last_name_placeholder')}
                    required
                  />
                  {errors.family_name && <p className="error-message">{errors.family_name}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('father_name')} *</label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => handleChange('father_name', e.target.value)}
                    className={errors.father_name ? 'input-error' : ''}
                    placeholder={t('father_name')}
                    required
                  />
                  {errors.father_name && <p className="error-message">{errors.father_name}</p>}
                </div>
                <div className="form-group">
                  <label>{t('grandfather_name')} *</label>
                  <input
                    type="text"
                    value={formData.grandfather_name}
                    onChange={(e) => handleChange('grandfather_name', e.target.value)}
                    className={errors.grandfather_name ? 'input-error' : ''}
                    placeholder={t('grandfather_name')}
                    required
                  />
                  {errors.grandfather_name && <p className="error-message">{errors.grandfather_name}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('region')} *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    className={errors.region ? 'input-error' : ''}
                    placeholder={t('region_placeholder')}
                    required
                  />
                  {errors.region && <p className="error-message">{errors.region}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="form-section">
              <h3>{t('admin.users.contact_info')}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('phone_number')} *</label>
                  <PhoneInput
                    defaultCountry="sa"
                    value={formData.phone}
                    onChange={(phone) => handleChange('phone', phone)}
                    className={errors.phone ? 'phone-input-error' : ''}
                    inputStyle={{
                      width: '100%',
                      padding: '12px',
                      border: errors.phone ? '1px solid #dc3545' : '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontFamily: '"Cairo", sans-serif'
                    }}
                    countrySelectorStyleProps={{
                      buttonStyle: {
                        padding: '12px',
                        border: errors.phone ? '1px solid #dc3545' : '1px solid #ddd',
                        borderRadius: '6px 0 0 6px',
                        backgroundColor: '#f5f5f5'
                      }
                    }}
                  />
                  {errors.phone && <p className="error-message">{errors.phone}</p>}
                </div>
                <div className="form-group">
                  <label>{t('email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={errors.email ? 'input-error' : ''}
                    placeholder={t('email_placeholder')}
                  />
                  {errors.email && <p className="error-message">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Banking Information */}
            <div className="form-section">
              <h3>{t('admin.users.banking_info')}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('bank_name')} *</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    className={errors.bank_name ? 'input-error' : ''}
                    placeholder={t('bank_name')}
                    required
                  />
                  {errors.bank_name && <p className="error-message">{errors.bank_name}</p>}
                </div>
                <div className="form-group">
                  <label>{t('iban')} *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', direction: 'ltr' }}>
                    <span style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      color: '#666', 
                      fontWeight: '500',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}>SA</span>
                    <input
                      type="text"
                      value={formData.iban.startsWith('SA') ? formData.iban.substring(2) : formData.iban}
                      onChange={(e) => handleChange('iban', e.target.value)}
                      className={errors.iban ? 'input-error' : ''}
                      placeholder={t('iban')}
                      required
                      style={{ 
                        paddingLeft: '40px',
                        direction: 'ltr',
                        textAlign: 'left'
                      }}
                    />
                  </div>
                  {errors.iban && <p className="error-message">{errors.iban}</p>}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                disabled={loading}
                onClick={handleSaveDraftAndClose}
              >
                {i18n.language === 'ar' ? 'حفظ البيانات وإكمال لاحقاً' : 'Save draft & continue later'}
              </button>

              <button type="submit" className="submit-btn primary-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Watch height="20" width="20" color="#fff" ariaLabel="loading" />
                    {t('dashboard.form.submitting')}
                  </>
                ) : (
                  t('dashboard.complete_profile.submit') || (i18n.language === 'ar' ? 'حفظ البيانات' : 'Save data')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;

