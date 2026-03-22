import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Store } from 'react-notifications-component';
import CountdownTimer from './CountdownTimer';
import AccountDetailsCollapsible from './AccountDetailsCollapsible';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import DataComparisonModal from './DataComparisonModal';
import { API_BASE_URL } from '../config';
import '../Css/components/action-required-card.css';

/**
 * ActionRequiredCard - Unified card showing all required actions
 * Combines profile completion and wire receipt status
 */
const ActionRequiredCard = ({ 
  profileCompletionStatus, 
  wireReceiptStatus,
  accountDetails,
  documents,
  onRefresh 
}) => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewDocType, setPreviewDocType] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [documentRejected, setDocumentRejected] = useState(false);
  const [documentIdForDecision, setDocumentIdForDecision] = useState(null);
  const [requiresUserDecision, setRequiresUserDecision] = useState(false);
  const [userDecisionType, setUserDecisionType] = useState(null);
  const [recentlyUploadedDocs, setRecentlyUploadedDocs] = useState(new Set()); // Track recently uploaded docs

  // Filter out recently uploaded documents and documents that already exist from missing_documents list
  const getFilteredMissingDocuments = () => {
    if (!profileCompletionStatus?.missing_documents) return [];
    return profileCompletionStatus.missing_documents.filter(docType => {
      // Filter out recently uploaded (optimistic update)
      if (recentlyUploadedDocs.has(docType)) {
        return false;
      }
      
      // Check document status from documents summary
      const docSummary = documents?.summary?.[docType];
      if (docSummary?.exists) {
        // If document is approved, definitely don't show as missing
        if (docSummary.status === 'approved') {
          return false;
        }
        // If document is pending, don't show as missing (user already uploaded)
        if (docSummary.status === 'pending') {
          return false;
        }
        // If document is rejected, show it again so user can re-upload
        if (docSummary.status === 'rejected') {
          return true;
        }
        // For any other status, if document exists, don't show as missing
        return false;
      }
      
      return true; // Document is truly missing
    });
  };

  const filteredMissingDocuments = getFilteredMissingDocuments();
  const hasProfileActions = profileCompletionStatus && 
    (filteredMissingDocuments.length > 0 || !profileCompletionStatus.is_complete);
  const hasWireActions = wireReceiptStatus && wireReceiptStatus.requires_wire_transfer;

  if (!hasProfileActions && !hasWireActions) {
    return null;
  }

  const handleFileSelect = (docType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/jpeg,image/png,image/jpg';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check if document already exists and is approved
      const docSummary = docType === 'iban_doc' 
        ? documents?.summary?.iban_doc 
        : documents?.summary?.national_address_doc;
      
      if (docSummary?.exists && docSummary?.status === 'approved') {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.document_already_uploaded', { 
            defaultValue: 'This document has already been uploaded and approved. You cannot upload again.' 
          }),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.file_too_large', { defaultValue: 'File size must be less than 5MB' }),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
        return;
      }

      // Show preview dialog
      setPreviewFile(file);
      setPreviewDocType(docType);
      setShowPreviewDialog(true);
    };
    input.click();
  };

  const handleDocumentUpload = async (docType, file) => {
    setUploadingDoc(docType);
    setShowPreviewDialog(false);
    try {
      const headers = getAuthHeaders();
      const formData = new FormData();
      formData.append('type', docType);
      formData.append('file', file);

      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/documents/upload`,
        formData,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      );

      // Handle National ID mismatch (critical rejection)
      if (!response.data?.success && response.data?.data?.comparison?.has_critical_mismatch) {
        const comparison = response.data.data.comparison;
        
        // Remove from recently uploaded (document was rejected)
        setRecentlyUploadedDocs(prev => {
          const next = new Set(prev);
          next.delete(docType);
          return next;
        });
        
        Store.addNotification({
          title: t('dashboard.error.document_rejected'),
          message: response.data.data.message || response.data.data.message_en || 
                   t('dashboard.error.national_id_mismatch'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 10000 }
        });

        // Show comparison modal with rejection
        setShowComparisonModal(true);
        setComparisonData(comparison);
        setDocumentRejected(true);
        return;
      }

      // Handle data mismatches (non-critical warnings) - check if user decision is required
      if (response.data?.success && response.data?.data?.comparison?.has_mismatches && 
          !response.data?.data?.comparison?.has_critical_mismatch) {
        const comparison = response.data.data.comparison;
        const document = response.data.data.document;
        // Check all possible locations for requires_user_decision flag (per API docs)
        const needsDecision = document?.requires_user_decision || 
                             comparison?.requires_user_decision ||
                             document?.extracted_data?.requires_user_decision || false;
        
        if (needsDecision) {
          // Show decision modal - user must decide
          Store.addNotification({
            title: t('dashboard.info.decision_required', { defaultValue: 'Decision Required' }),
            message: response.data.data.message || response.data.data.message_en || 
                     t('dashboard.info.decision_required_message', { defaultValue: 'Please review the data differences and make a decision.' }),
            type: 'info',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 10000 }
          });

          setShowComparisonModal(true);
          setComparisonData(comparison);
          setDocumentRejected(false);
          setDocumentIdForDecision(document?.id || null);
          setRequiresUserDecision(true);
          // Check all possible locations for user_decision_type (per API docs)
          setUserDecisionType(
            comparison?.user_decision_type || 
            document?.extracted_data?.user_decision_type || 
            null
          );
          
          // Don't refresh yet - wait for user decision
          return;
        } else {
          // Show comparison modal but no decision required (old flow)
          Store.addNotification({
            title: t('dashboard.warning.data_mismatches'),
            message: response.data.data.message || response.data.data.message_en || 
                     t('dashboard.warning.data_mismatches_detected'),
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 8000 }
          });

          setShowComparisonModal(true);
          setComparisonData(comparison);
          setDocumentRejected(false);
          setDocumentIdForDecision(null);
          setRequiresUserDecision(false);
          setUserDecisionType(null);
          
          // Refresh data (document is pending, not rejected)
          if (onRefresh) {
            await onRefresh();
          }
          return;
        }
      }

      // Success case (no mismatches or auto-approved or pending admin review)
      if (response.data?.success) {
        const document = response.data.data.document;
        const isAutoApproved = document?.auto_approved === true;
        const requiresManualReview = document?.requires_manual_review === true;
        const profileUpdated = response.data.data?.profile_updated === true;
        
        // Show appropriate message based on status (per API docs)
        if (isAutoApproved) {
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: response.data.data.message || response.data.message || 
                     t('dashboard.success.document_auto_approved', { defaultValue: 'Document uploaded successfully and auto-approved.' }),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000 }
          });
        } else if (requiresManualReview) {
          Store.addNotification({
            title: t('dashboard.info.document_uploaded', { defaultValue: 'Document Uploaded' }),
            message: response.data.data.message || response.data.message || 
                     t('dashboard.info.under_admin_review', { defaultValue: 'Document uploaded successfully. Under admin review.' }),
            type: 'info',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000 }
          });
        } else {
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: response.data.data.message || response.data.message || 
                     t('dashboard.success.document_uploaded', { defaultValue: 'Document uploaded successfully.' }),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 3000 }
          });
        }

        // If profile was updated, show additional notification
        if (profileUpdated) {
          Store.addNotification({
            title: t('dashboard.info.profile_updated', { defaultValue: 'Profile Updated' }),
            message: t('dashboard.info.profile_updated_from_document', { defaultValue: 'Your profile has been updated with data from the document.' }),
            type: 'info',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000 }
          });
        }

        // Optimistically hide this document from missing list
        setRecentlyUploadedDocs(prev => new Set([...prev, docType]));
        
        // Refresh overview data immediately
        if (onRefresh) {
          await onRefresh();
        }
        
        // Refresh again after a short delay to ensure backend has updated profile_completion_status
        // This handles cases where the backend needs time to process the document status
        setTimeout(async () => {
          if (onRefresh) {
            await onRefresh();
          }
          // Remove from recently uploaded after refresh (backend should have updated by now)
          setRecentlyUploadedDocs(prev => {
            const next = new Set(prev);
            next.delete(docType);
            return next;
          });
        }, 2000); // 2 second delay
        
        setPreviewFile(null);
        setPreviewDocType(null);
      }
    } catch (error) {
      // Remove from recently uploaded (upload failed)
      setRecentlyUploadedDocs(prev => {
        const next = new Set(prev);
        next.delete(docType);
        return next;
      });
      
      // Handle network errors or other exceptions
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.data?.message ||
                          error.response?.data?.data?.message_en ||
                          t('dashboard.error.upload_failed');
      
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handlePreviewAccept = () => {
    if (previewFile && previewDocType) {
      handleDocumentUpload(previewDocType, previewFile);
    }
  };

  const handlePreviewCancel = () => {
    setShowPreviewDialog(false);
    setPreviewFile(null);
    setPreviewDocType(null);
  };

  const handleReceiptUpload = async (contractId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/jpeg,image/png,image/jpg';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.file_too_large', { defaultValue: 'File size must be less than 5MB' }),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
        return;
      }

      setUploadingReceipt(contractId);
      try {
        const headers = getAuthHeaders();
        const formData = new FormData();
        formData.append('type', 'receipt');
        formData.append('contract_id', contractId);
        formData.append('file', file);

        const response = await axios.post(
          `${API_BASE_URL}/portallogistice/documents/upload`,
          formData,
          { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
        );

        if (response.data?.success) {
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: response.data.message || t('dashboard.success.receipt_uploaded', { defaultValue: 'Receipt uploaded successfully' }),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 3000 }
          });

          // Refresh overview data
          if (onRefresh) {
            await onRefresh();
          }
        }
      } catch (error) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: error.response?.data?.message || t('dashboard.error.upload_failed'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
      } finally {
        setUploadingReceipt(null);
      }
    };
    input.click();
  };

  const getDocLabel = (docType) => {
    if (docType === 'iban_doc') {
      return i18n.language === 'ar' 
        ? t('dashboard.profile_completion.iban_doc', { defaultValue: 'مستند IBAN' })
        : t('dashboard.profile_completion.iban_doc', { defaultValue: 'IBAN Document' });
    }
    return i18n.language === 'ar'
      ? t('dashboard.profile_completion.national_address_doc', { defaultValue: 'مستند العنوان الوطني' })
      : t('dashboard.profile_completion.national_address_doc', { defaultValue: 'National Address Document' });
  };

  return (
    <div className="action-required-card">
      {/* Profile Completion Section */}
      {hasProfileActions && (
        <div className="action-section profile-completion">
          <div className="section-header">
            <div className="section-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="section-content">
              <h3>{t('dashboard.profile_completion.title', { defaultValue: 'Complete Your Profile' })}</h3>
              <p className="section-message">
                {i18n.language === 'ar' 
                  ? profileCompletionStatus.message_ar || profileCompletionStatus.message
                  : profileCompletionStatus.message_en || profileCompletionStatus.message}
              </p>
            </div>
          </div>
          <div className="documents-list">
            {filteredMissingDocuments.map((docType) => {
              const docSummary = documents?.summary?.[docType];
              const isRejected = docSummary?.exists && docSummary?.status === 'rejected';
              
              return (
              <div key={docType} className="document-item">
                <div className="document-info">
                  <i className="fas fa-file-alt"></i>
                  <span>{getDocLabel(docType)}</span>
                  <span className={`status-badge ${isRejected ? 'rejected' : 'missing'}`}>
                    {isRejected 
                      ? t('dashboard.profile_completion.rejected', { defaultValue: 'Rejected' })
                      : t('dashboard.profile_completion.missing', { defaultValue: 'Missing' })}
                  </span>
                </div>
                <button
                  className="upload-btn"
                  onClick={() => handleFileSelect(docType)}
                  disabled={uploadingDoc === docType || (documents?.summary?.[docType]?.exists && documents?.summary?.[docType]?.status === 'approved')}
                >
                  {uploadingDoc === docType ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      {t('dashboard.uploading', { defaultValue: 'Uploading...' })}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i>
                      {t('dashboard.upload', { defaultValue: 'Upload' })}
                    </>
                  )}
                </button>
              </div>
              );
            })}
          </div>
          <button className="view-profile-link" onClick={() => navigate('/dashboard/profile')}>
            {t('dashboard.profile_completion.go_to_profile', { defaultValue: 'Go to Profile Page' })}
            <i className="fas fa-arrow-left"></i>
          </button>
        </div>
      )}

      {/* Wire Receipt Section */}
      {hasWireActions && (
        <div className="action-section wire-receipt">
          <div className="section-header">
            <div className="section-icon">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="section-content">
              <h3>{t('dashboard.wire_receipt.title', { defaultValue: 'Wire Transfer Required' })}</h3>
              <p className="section-message">
                {i18n.language === 'ar'
                  ? wireReceiptStatus.message_ar || wireReceiptStatus.message
                  : wireReceiptStatus.message_en || wireReceiptStatus.message}
              </p>
            </div>
          </div>

          {/* Pending Contracts */}
          {wireReceiptStatus.pending_contracts && wireReceiptStatus.pending_contracts.length > 0 && (
            <div className="contracts-list">
              {wireReceiptStatus.pending_contracts.map((contract) => (
                <div 
                  key={contract.contract_id} 
                  className={`contract-receipt-item ${contract.is_overdue ? 'overdue' : ''}`}
                >
                  <div className="contract-header">
                    <h4>
                      {t('dashboard.wire_receipt.contract', { defaultValue: 'Contract' })} #{contract.contract_number || contract.contract_id}
                    </h4>
                    <div className="contract-amount">
                      {contract.amount.toLocaleString()} {t('dashboard.currency', { defaultValue: 'SAR' })}
                    </div>
                  </div>
                  
                  {contract.is_overdue ? (
                    <div className="overdue-warning">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{t('dashboard.wire_receipt.overdue_warning', { defaultValue: 'Deadline Passed - Please upload ASAP' })}</span>
                    </div>
                  ) : (
                    <div className="deadline-info">
                      <CountdownTimer 
                        deadline={contract.receipt_upload_deadline}
                        hoursRemaining={contract.hours_remaining}
                      />
                      <div className="deadline-date">
                        {t('dashboard.wire_receipt.deadline', { defaultValue: 'Deadline' })}: {' '}
                        {new Date(contract.receipt_upload_deadline).toLocaleString(
                          i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                          { 
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    className="upload-receipt-btn"
                    onClick={() => handleReceiptUpload(contract.contract_id)}
                    disabled={uploadingReceipt === contract.contract_id}
                  >
                    {uploadingReceipt === contract.contract_id ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        {t('dashboard.uploading', { defaultValue: 'Uploading...' })}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload"></i>
                        {t('dashboard.wire_receipt.upload_receipt', { defaultValue: 'Upload Receipt' })}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Account Details Collapsible */}
          {accountDetails && (
            <AccountDetailsCollapsible 
              accountDetails={accountDetails}
              isOpen={showAccountDetails}
              onToggle={() => setShowAccountDetails(!showAccountDetails)}
            />
          )}
        </div>
      )}

      {showPreviewDialog && previewFile && previewDocType && (
        <DocumentPreviewDialog
          file={previewFile}
          docType={previewDocType}
          onAccept={handlePreviewAccept}
          onCancel={handlePreviewCancel}
          isUploading={uploadingDoc === previewDocType}
        />
      )}

      {showComparisonModal && comparisonData && (
        <DataComparisonModal
          isOpen={showComparisonModal}
          onClose={() => {
            setShowComparisonModal(false);
            setComparisonData(null);
            setDocumentRejected(false);
            setDocumentIdForDecision(null);
            setRequiresUserDecision(false);
            setUserDecisionType(null);
          }}
          comparison={comparisonData}
          isRejected={documentRejected}
          onUpdateProfile={async () => {
            setShowComparisonModal(false);
            setComparisonData(null);
            setDocumentIdForDecision(null);
            setRequiresUserDecision(false);
            setUserDecisionType(null);
            if (onRefresh) await onRefresh();
          }}
          onKeepCurrent={() => {
            setShowComparisonModal(false);
            setComparisonData(null);
            setDocumentRejected(false);
            setDocumentIdForDecision(null);
            setRequiresUserDecision(false);
            setUserDecisionType(null);
          }}
          documentType={previewDocType}
          documentId={documentIdForDecision}
          requiresUserDecision={requiresUserDecision}
          userDecisionType={userDecisionType}
        />
      )}
    </div>
  );
};

export default ActionRequiredCard;
