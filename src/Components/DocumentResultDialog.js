import React from 'react';
import { useTranslation } from 'react-i18next';
import '../Css/components/document-result-dialog.css';

const DocumentResultDialog = ({ 
  isOpen, 
  onClose,
  result,
  onReviewDifferences,
  onReupload
}) => {
  const { t, i18n } = useTranslation(['common']);
  const lang = i18n.language;

  if (!isOpen || !result) return null;

  const { 
    status, 
    auto_approved, 
    requires_manual_review,
    extracted_data,
    rejection_reason,
    message,
    message_en
  } = result;

  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';
  const hasMismatches = result.comparison?.has_mismatches;
  const hasCriticalMismatch = result.comparison?.has_critical_mismatch;

  const getStatusIcon = () => {
    if (isRejected) return 'fas fa-times-circle';
    if (isApproved && auto_approved) return 'fas fa-check-circle';
    if (isPending && requires_manual_review) return 'fas fa-clock';
    if (hasMismatches) return 'fas fa-exclamation-triangle';
    return 'fas fa-check-circle';
  };

  const getStatusColor = () => {
    if (isRejected) return 'danger';
    if (isApproved && auto_approved) return 'success';
    if (hasMismatches) return 'warning';
    return 'info';
  };

  const getStatusTitle = () => {
    if (isRejected) {
      return lang === 'ar' ? 'رفض المستند' : 'Document Rejected';
    }
    if (isApproved && auto_approved) {
      return lang === 'ar' ? 'تم اعتماد المستند!' : 'Document Approved!';
    }
    if (hasMismatches) {
      return lang === 'ar' ? 'تم اكتشاف اختلافات في البيانات' : 'Data Mismatches Detected';
    }
    if (isPending && requires_manual_review) {
      return lang === 'ar' ? 'المستند قيد المراجعة' : 'Document Under Review';
    }
    return lang === 'ar' ? 'تم رفع المستند' : 'Document Uploaded';
  };

  const getStatusMessage = () => {
    if (message || message_en) {
      return lang === 'ar' ? (message || message_en) : (message_en || message);
    }
    
    if (isRejected) {
      return lang === 'ar' 
        ? 'تم رفض المستند. يرجى مراجعة التفاصيل أدناه.'
        : 'Your document has been rejected. Please review the details below.';
    }
    
    if (isApproved && auto_approved) {
      return lang === 'ar'
        ? 'تم اعتماد المستند تلقائياً. تم تحديث ملفك الشخصي.'
        : 'Your document has been automatically approved. Your profile has been updated.';
    }
    
    if (hasMismatches) {
      return lang === 'ar'
        ? 'تم اكتشاف اختلافات في البيانات المستخرجة. يرجى مراجعة الاختلافات أدناه.'
        : 'Data mismatches detected in the extracted information. Please review the differences below.';
    }
    
    if (isPending && requires_manual_review) {
      return lang === 'ar'
        ? 'تم رفع المستند بنجاح وهو الآن قيد مراجعة الإدارة. سيتم إشعارك عند اكتمال المراجعة.'
        : 'Your document has been uploaded successfully and is now under admin review. You will be notified when the review is complete.';
    }
    
    return lang === 'ar' ? 'تم رفع المستند بنجاح.' : 'Document uploaded successfully.';
  };

  return (
    <div className="document-result-overlay" onClick={onClose}>
      <div className="document-result-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`result-header result-${getStatusColor()}`}>
          <div className="result-icon">
            <i className={getStatusIcon()}></i>
          </div>
          <h3>{getStatusTitle()}</h3>
          <button className="result-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="result-body">
          <div className="result-message">
            <p>{getStatusMessage()}</p>
          </div>

          {/* Status Details */}
          <div className="result-details">
            <div className="detail-item">
              <span className="detail-label">
                {lang === 'ar' ? 'الحالة:' : 'Status:'}
              </span>
              <span className={`detail-value status-${getStatusColor()}`}>
                {isRejected && (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                {isApproved && auto_approved && (lang === 'ar' ? 'معتمد تلقائياً' : 'Auto-Approved')}
                {isPending && requires_manual_review && (lang === 'ar' ? 'قيد المراجعة' : 'Under Review')}
                {hasMismatches && !isRejected && (lang === 'ar' ? 'قيد المراجعة' : 'Under Review')}
              </span>
            </div>

            {extracted_data?.confidence && (
              <div className="detail-item">
                <span className="detail-label">
                  {lang === 'ar' ? 'مستوى الثقة:' : 'Confidence:'}
                </span>
                <span className="detail-value">
                  {extracted_data.confidence.toFixed(1)}%
                </span>
              </div>
            )}

            {isPending && requires_manual_review && (
              <div className="detail-item">
                <span className="detail-label">
                  {lang === 'ar' ? 'وقت المراجعة:' : 'Review Time:'}
                </span>
                <span className="detail-value">
                  {lang === 'ar' ? '24-48 ساعة' : '24-48 hours'}
                </span>
              </div>
            )}
          </div>

          {/* Extracted Data (if approved) */}
          {isApproved && auto_approved && extracted_data && (
            <div className="result-extracted-data">
              <h4>
                <i className="fas fa-info-circle"></i>
                {lang === 'ar' ? 'البيانات المستخرجة:' : 'Extracted Information:'}
              </h4>
              <div className="extracted-fields">
                {extracted_data.iban && (
                  <div className="extracted-field">
                    <span className="field-label">
                      {lang === 'ar' ? 'رقم الآيبان:' : 'IBAN:'}
                    </span>
                    <span className="field-value">{extracted_data.iban}</span>
                  </div>
                )}
                {extracted_data.bank_name && (
                  <div className="extracted-field">
                    <span className="field-label">
                      {lang === 'ar' ? 'اسم البنك:' : 'Bank Name:'}
                    </span>
                    <span className="field-value">{extracted_data.bank_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {isRejected && rejection_reason && (
            <div className="result-rejection-reason">
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle"></i>
                <div>
                  <strong>
                    {lang === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}
                  </strong>
                  <p>{rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mismatches Warning */}
          {hasMismatches && !hasCriticalMismatch && (
            <div className="result-mismatches-warning">
              <div className="alert alert-warning">
                <i className="fas fa-info-circle"></i>
                <div>
                  <strong>
                    {lang === 'ar' ? 'تم اكتشاف اختلافات' : 'Mismatches Detected'}
                  </strong>
                  <p>
                    {lang === 'ar'
                      ? 'بعض البيانات المستخرجة تختلف عن بيانات ملفك الشخصي. يمكنك مراجعة الاختلافات وتحديث ملفك الشخصي.'
                      : 'Some extracted data differs from your profile data. You can review the differences and update your profile.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="result-footer">
          {isRejected && onReupload && (
            <button className="btn btn-primary" onClick={onReupload}>
              <i className="fas fa-upload"></i>
              {lang === 'ar' ? 'إعادة رفع المستند' : 'Re-upload Document'}
            </button>
          )}
          
          {hasMismatches && !hasCriticalMismatch && onReviewDifferences && (
            <button className="btn btn-primary" onClick={onReviewDifferences}>
              <i className="fas fa-eye"></i>
              {lang === 'ar' ? 'مراجعة الاختلافات' : 'Review Differences'}
            </button>
          )}
          
          <button className="btn btn-secondary" onClick={onClose}>
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentResultDialog;
