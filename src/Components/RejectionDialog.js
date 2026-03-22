import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const RejectionDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  type = 'document' // 'document' or 'contract'
}) => {
  const { t, i18n } = useTranslation(['common']);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common rejection reason templates
  const rejectionTemplates = {
    ar: [
      'المستند غير واضح، يرجى إعادة الرفع',
      'المستند غير مكتمل، يرجى إكمال جميع المعلومات',
      'المستند منتهي الصلاحية، يرجى رفع مستند حديث',
      'المعلومات غير متطابقة مع البيانات المسجلة',
      'نوع الملف غير مدعوم، يرجى رفع ملف PDF أو صورة',
      'حجم الملف كبير جداً، يرجى ضغط الملف',
      'المستند غير مقروء، يرجى رفع نسخة أوضح',
      'معلومات العقد غير صحيحة، يرجى مراجعة البيانات',
      'المستندات المطلوبة غير مرفوعة بالكامل',
      'يرجى مراجعة الشروط والأحكام وإعادة التقديم'
    ],
    en: [
      'Document is unclear, please re-upload',
      'Document is incomplete, please complete all information',
      'Document is expired, please upload a recent document',
      'Information does not match registered data',
      'File type not supported, please upload PDF or image',
      'File size too large, please compress the file',
      'Document is unreadable, please upload a clearer copy',
      'Contract information is incorrect, please review data',
      'Required documents are not fully uploaded',
      'Please review terms and conditions and resubmit'
    ]
  };

  const templates = rejectionTemplates[i18n.language] || rejectionTemplates.ar;

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setRejectionReason(template);
  };

  const handleConfirm = async () => {
    if (!rejectionReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(rejectionReason, sendEmail);
      // Reset form on success
      setRejectionReason('');
      setSelectedTemplate('');
      setSendEmail(true);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('');
      setSelectedTemplate('');
      setSendEmail(true);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{title || t('admin.rejection.title')}</h2>
          <button className="close-btn" onClick={handleClose} disabled={isSubmitting}>
            {t('close')}
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#1c1c1c' }}>
              {t('admin.rejection.select_template') || 'Select Template (Optional)'}
            </label>
            <select
              className="filter-select"
              value={selectedTemplate}
              onChange={(e) => {
                const template = e.target.value;
                setSelectedTemplate(template);
                if (template) {
                  handleTemplateSelect(template);
                }
              }}
              style={{ width: '100%', marginBottom: '15px' }}
            >
              <option value="">{t('admin.rejection.choose_template') || 'Choose a template...'}</option>
              {templates.map((template, index) => (
                <option key={index} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#1c1c1c' }}>
              {t('admin.rejection.reason') || 'Rejection Reason'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="admin-rejection-reason"
              placeholder={t('admin.rejection.reason_placeholder') || 'Enter rejection reason or select a template above'}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (e.target.value !== selectedTemplate) {
                  setSelectedTemplate('');
                }
              }}
              rows="5"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: '"Cairo", sans-serif',
                resize: 'vertical',
                minHeight: '120px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                {t('admin.rejection.send_email') || 'Send email notification to user'}
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button
              className="action-btn"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                background: '#6c757d',
                color: '#ffffff',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: '"Cairo", sans-serif',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {t('cancel')}
            </button>
            <button
              className="action-btn reject-btn"
              onClick={handleConfirm}
              disabled={!rejectionReason.trim() || isSubmitting}
              style={{
                background: !rejectionReason.trim() || isSubmitting ? '#ccc' : '#ef4444',
                color: '#ffffff',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: !rejectionReason.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: '"Cairo", sans-serif',
                transition: 'background 0.3s ease'
              }}
            >
              {isSubmitting ? (t('dashboard.loading') || 'Loading...') : (t('admin.rejection.confirm') || 'Confirm Rejection')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionDialog;
