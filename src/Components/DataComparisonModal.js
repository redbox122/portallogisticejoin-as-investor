import React from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'react-notifications-component';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../Css/components/data-comparison-modal.css';

const DataComparisonModal = ({ 
  isOpen, 
  onClose, 
  comparison, 
  isRejected,
  onUpdateProfile,
  onKeepCurrent,
  documentType,
  documentId,
  requiresUserDecision,
  userDecisionType
}) => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const lang = i18n.language;
  const [processingDecision, setProcessingDecision] = React.useState(false);

  if (!isOpen || !comparison) return null;

  const getFieldName = (field) => {
    const fieldNames = {
      ar: {
        national_id: 'رقم الهوية الوطنية',
        iban: 'رقم الآيبان',
        bank_name: 'اسم البنك',
        account_number: 'رقم الحساب',
        full_name: 'الاسم الكامل',
        city: 'المدينة',
        postal_code: 'الرمز البريدي',
        street: 'الشارع',
        building_number: 'رقم المبنى',
        secondary_number: 'الرقم الثانوي',
        district: 'الحي',
        email: 'البريد الإلكتروني',
        national_address_email: 'بريد العنوان الوطني'
      },
      en: {
        national_id: 'National ID',
        iban: 'IBAN',
        bank_name: 'Bank Name',
        account_number: 'Account Number',
        full_name: 'Full Name',
        city: 'City',
        postal_code: 'Postal Code',
        street: 'Street',
        building_number: 'Building Number',
        secondary_number: 'Secondary Number',
        district: 'District',
        email: 'Email',
        national_address_email: 'National Address Email'
      }
    };
    return fieldNames[lang]?.[field] || field;
  };

  const handleUserDecision = async (action) => {
    if (!documentId || !requiresUserDecision) {
      // Fallback to old behavior if no document ID
      if (action === 'approve' && onUpdateProfile) {
        await onUpdateProfile();
      } else if (action === 'reject' && onKeepCurrent) {
        onKeepCurrent();
      }
      return;
    }

    setProcessingDecision(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/documents/${documentId}/decision`,
        { action },
        { headers }
      );

      if (response.data?.success) {
        const message = response.data.message_en || response.data.message || 
          (action === 'approve' 
            ? t('dashboard.success.document_approved', { defaultValue: 'Document approved and data updated successfully' })
            : t('dashboard.info.document_sent_for_review', { defaultValue: 'Document sent for admin review' }));
        
        Store.addNotification({
          title: t('dashboard.success.title'),
          message: message,
          type: action === 'approve' ? 'success' : 'info',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });

        // Refresh data
        if (onUpdateProfile) {
          await onUpdateProfile();
        }
        
        onClose();
      } else {
        throw new Error(response.data?.message_en || response.data?.message || 'Failed to process decision');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message_en || 
                          error.response?.data?.message || 
                          error.message ||
                          t('dashboard.error.decision_failed', { defaultValue: 'Failed to process decision' });
      
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleUpdateProfile = async () => {
    await handleUserDecision('approve');
  };

  const handleReupload = () => {
    onClose();
    // Trigger file input for re-upload
    // This will be handled by parent component
  };

  return (
    <div className="modal-overlay data-comparison-overlay" onClick={onClose}>
      <div className="modal-content data-comparison-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {isRejected 
              ? (lang === 'ar' ? 'رفض المستند' : 'Document Rejected')
              : (lang === 'ar' ? 'مقارنة البيانات' : 'Data Comparison')
            }
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {isRejected && (
            <div className="alert alert-danger comparison-alert">
              <i className="fas fa-exclamation-triangle"></i>
              <div>
                <strong>
                  {lang === 'ar' 
                    ? 'تم رفض المستند بسبب عدم تطابق رقم الهوية الوطنية'
                    : 'Document rejected due to National ID mismatch'
                  }
                </strong>
                <p>
                  {lang === 'ar'
                    ? 'رقم الهوية الوطنية في المستند لا يطابق رقم الهوية المسجل في حسابك. يرجى رفع مستند صحيح.'
                    : 'The National ID in the document does not match your registered National ID. Please upload a correct document.'
                  }
                </p>
              </div>
            </div>
          )}

          {!isRejected && comparison.has_mismatches && (
            <div className="alert alert-warning comparison-alert">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>
                  {lang === 'ar' 
                    ? 'تم اكتشاف اختلافات في البيانات'
                    : 'Data mismatches detected'
                  }
                </strong>
                <p>
                  {lang === 'ar'
                    ? 'بعض البيانات المستخرجة من المستند تختلف عن البيانات المسجلة في ملفك الشخصي. يمكنك مراجعة الاختلافات أدناه وتحديث ملفك الشخصي.'
                    : 'Some data extracted from the document differs from your registered profile data. You can review the differences below and update your profile.'
                  }
                </p>
              </div>
            </div>
          )}

          {comparison.mismatches && comparison.mismatches.length > 0 && (
            <div className="comparison-section">
              <h4>
                <i className="fas fa-exclamation-circle"></i>
                {lang === 'ar' ? 'الاختلافات المكتشفة' : 'Detected Mismatches'}
              </h4>
              <div className="comparison-table-container">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>{lang === 'ar' ? 'الحقل' : 'Field'}</th>
                      <th>{lang === 'ar' ? 'القيمة الحالية' : 'Current Value'}</th>
                      <th>{lang === 'ar' ? 'القيمة المستخرجة' : 'Extracted Value'}</th>
                      <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.mismatches.map((mismatch, index) => (
                      <tr key={index} className={mismatch.critical ? 'critical-row' : 'warning-row'}>
                        <td className="field-name">
                          <strong>{getFieldName(mismatch.field)}</strong>
                        </td>
                        <td className="current-value">
                          {mismatch.current || <span className="empty-value">-</span>}
                        </td>
                        <td className="extracted-value">
                          {mismatch.extracted || <span className="empty-value">-</span>}
                        </td>
                        <td className="status-cell">
                          {mismatch.critical ? (
                            <span className="badge badge-danger">
                              <i className="fas fa-times-circle"></i>
                              {lang === 'ar' ? 'حرج' : 'Critical'}
                            </span>
                          ) : (
                            <span className="badge badge-warning">
                              <i className="fas fa-exclamation-triangle"></i>
                              {lang === 'ar' ? 'تحذير' : 'Warning'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {comparison.matches && comparison.matches.length > 0 && (
            <div className="comparison-section">
              <h4>
                <i className="fas fa-check-circle"></i>
                {lang === 'ar' ? 'الحقول المتطابقة' : 'Matching Fields'}
              </h4>
              <div className="matches-list">
                {comparison.matches.map((field, index) => (
                  <div key={index} className="match-item">
                    <i className="fas fa-check-circle text-success"></i>
                    <span>{getFieldName(field)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isRejected ? (
            <button className="btn btn-primary" onClick={handleReupload}>
              <i className="fas fa-upload"></i>
              {lang === 'ar' ? 'إعادة رفع المستند' : 'Re-upload Document'}
            </button>
          ) : (
            <>
              {requiresUserDecision ? (
                <>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleUserDecision('reject')}
                    disabled={processingDecision}
                  >
                    {processingDecision ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        {lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times"></i>
                        {lang === 'ar' ? 'الاحتفاظ بالبيانات الحالية' : 'Keep Current Data'}
                      </>
                    )}
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleUserDecision('approve')}
                    disabled={processingDecision}
                  >
                    {processingDecision ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        {lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        {userDecisionType === 'iban_bank_mismatch' 
                          ? (lang === 'ar' ? 'موافقة وتحديث الآيبان' : 'Approve & Update IBAN')
                          : userDecisionType === 'name_mismatch'
                          ? (lang === 'ar' ? 'موافقة وتحديث الاسم' : 'Approve & Update Name')
                          : (lang === 'ar' ? 'موافقة وتحديث البيانات' : 'Approve & Update Data')}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={onKeepCurrent}>
                    <i className="fas fa-times"></i>
                    {lang === 'ar' ? 'الاحتفاظ بالبيانات الحالية' : 'Keep Current Data'}
                  </button>
                  {comparison.has_mismatches && !comparison.has_critical_mismatch && (
                    <button className="btn btn-primary" onClick={handleUpdateProfile}>
                      <i className="fas fa-sync-alt"></i>
                      {lang === 'ar' ? 'تحديث الملف الشخصي' : 'Update Profile'}
                    </button>
                  )}
                </>
              )}
            </>
          )}
          <button className="btn btn-outline" onClick={onClose}>
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataComparisonModal;
