import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import ContractForm from '../../Components/ContractForm';
import ProfileCompletionModal from '../../Components/ProfileCompletionModal';
import DataComparisonModal from '../../Components/DataComparisonModal';
import { getLang, pickFieldText, pickText, formatDate } from '../../Utitlities/uxText';
import { API_BASE_URL, API_ORIGIN } from '../../config';
import '../../Css/pages/contracts-page.css';

const ContractsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showOrphanModal, setShowOrphanModal] = useState(false);
  const [orphanSellingId, setOrphanSellingId] = useState(null);
  const [orphanSellingNumber, setOrphanSellingNumber] = useState(null);
  const [startWithRental, setStartWithRental] = useState(false);
  const [expectedContractCount, setExpectedContractCount] = useState(null); // Track expected contract count after creation
  const [creationGuidance, setCreationGuidance] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [documentRejected, setDocumentRejected] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle redirect message from payments page
  useEffect(() => {
    if (location.state?.message === 'payments_access_denied') {
      const reason = location.state.reason || t('dashboard.payments.access_denied_default');
      
      Store.addNotification({
        title: t('dashboard.payments.access_denied_title'),
        message: reason,
        type: 'info',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
      
      // Clear state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, t]);

  const fetchData = async (retryCount = 0, isPollingForNewContract = false) => {
    // Only show loading spinner on initial load or first retry, not during polling
    if (retryCount === 0 || !isPollingForNewContract) {
      setLoading(true);
    }
    try {
      const headers = getAuthHeaders();
      // Add cache-busting headers
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      
      // Add timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const contractsUrl = new URL(`${API_BASE_URL}/portallogistice/contracts`);
      contractsUrl.searchParams.set('include_workflow', 'true');
      contractsUrl.searchParams.set('include_details', 'true');
      contractsUrl.searchParams.set('_t', String(timestamp));

      const [profileRes, contractsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/portallogistice/profile?_t=${timestamp}`, { headers }),
        axios.get(contractsUrl.toString(), { headers })
      ]);

      if (profileRes.data?.success) {
        setProfile(profileRes.data.data.user || profileRes.data.data);
      }

      if (contractsRes.data?.success) {
        const payload = contractsRes.data.data;
        const contractsList = payload?.contracts || payload || [];
        setContracts(contractsList);
        setCreationGuidance(payload?.creation_guidance || null);
        
        // If we're polling for a new contract, check if it appeared
        if (isPollingForNewContract && expectedContractCount !== null) {
          const currentCount = contractsList.length;
          const rentalCount = contractsList.filter(c => c.contract_type === 'rental').length;
          
          // Check if we have more contracts or if a rental contract appeared
          if (currentCount > expectedContractCount || rentalCount > 0) {
            console.log('✅ New contract detected! Stopping polling.');
            setExpectedContractCount(null); // Reset tracking
            setLoading(false);
            return; // Success - contract appeared
          }
          
          // Contract hasn't appeared yet, continue polling
          if (retryCount < 10) { // Poll up to 10 times (20 seconds total)
            console.log(`⏳ Contract not yet available, polling again (attempt ${retryCount + 1}/10)...`);
            setTimeout(() => {
              fetchData(retryCount + 1, true);
            }, 2000); // Poll every 2 seconds
            return;
          } else {
            // Max polling attempts reached, but don't show error - contract might still appear
            console.log('⏰ Max polling attempts reached. Contract may still be processing.');
            setExpectedContractCount(null);
            setLoading(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Retry logic: if this is a fresh fetch after contract creation, retry up to 3 times
      if (retryCount < 3 && !isPollingForNewContract) {
        console.log(`Retrying fetch (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          fetchData(retryCount + 1, false);
        }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
        return;
      }
      
      // If polling and we get an error, continue polling (might be temporary)
      if (isPollingForNewContract && retryCount < 10) {
        console.log(`⚠️ Error during polling, retrying (attempt ${retryCount + 1}/10)...`);
        setTimeout(() => {
          fetchData(retryCount + 1, true);
        }, 2000);
        return;
      }
      
      if (!isPollingForNewContract) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.fetch_data'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
      }
    } finally {
      if (!isPollingForNewContract || retryCount >= 10) {
        setLoading(false);
      }
    }
  };

  const handleDownloadContract = (contract) => {
    if (contract.contract_download_url) {
      window.open(contract.contract_download_url, '_blank');
    } else if (contract.id && profile?.national_id) {
      const downloadUrl = `${API_BASE_URL}/portallogistice/download-contract/${contract.id}?national_id=${profile.national_id}`;
      window.open(downloadUrl, '_blank');
    }
  };

  // Add function to get PDF URL
  const getPDFUrl = (pdfPath) => {
    if (!pdfPath) return null;
    // Remove 'storage/' prefix if present, backend returns full path
    const cleanPath = pdfPath.startsWith('storage/') ? pdfPath : `storage/${pdfPath}`;
    return `${API_ORIGIN}/${cleanPath}`;
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

        // Handle National ID mismatch (critical rejection)
        if (!response.data?.success && response.data?.data?.comparison?.has_critical_mismatch) {
          const comparison = response.data.data.comparison;
          
          Store.addNotification({
            title: t('dashboard.error.document_rejected'),
            message: response.data.data.message || response.data.data.message_en || 
                     t('dashboard.error.national_id_mismatch'),
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 10000 }
          });

          setShowComparisonModal(true);
          setComparisonData(comparison);
          setDocumentRejected(true);
          return;
        }

        // Handle data mismatches (non-critical)
        if (response.data?.success && response.data?.data?.comparison?.has_mismatches && 
            !response.data?.data?.comparison?.has_critical_mismatch) {
          const comparison = response.data.data.comparison;
          
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
          await fetchData();
          return;
        }

        // Success case
        if (response.data?.success) {
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: response.data.data.message || response.data.message || 
                     t('dashboard.success.receipt_uploaded', { defaultValue: 'Receipt uploaded successfully' }),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 3000 }
          });

          await fetchData();
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.data?.message ||
                            error.response?.data?.data?.message_en ||
                            t('dashboard.error.upload_failed', { defaultValue: 'Failed to upload receipt' });
        
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: errorMessage,
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

  const handleContractCreated = () => {
    setShowContractForm(false);
    
    // Store current contract count to detect when new contract appears
    const currentCount = contracts.length;
    setExpectedContractCount(currentCount);
    
    // Start polling immediately - don't wait, start checking right away
    // The polling will continue until the new contract appears or max attempts reached
    setTimeout(() => {
      fetchData(0, true); // Start polling for new contract
    }, 1000); // Small initial delay to let backend start processing
    
    Store.addNotification({
      title: t('dashboard.success.title'),
      message: t('dashboard.success.contract_created'),
      type: 'success',
      insert: 'top',
      container: 'top-right',
      dismiss: { duration: 3000 }
    });
  };

  const findOrphanSelling = useCallback((contractsList) => {
    return contractsList.filter(c => 
      c.contract_type === 'selling' && !c.linked_contract
    );
  }, []);

  const handleAddContractClick = () => {
    if (profile?.max_contracts_allowed !== null && profile?.max_contracts_allowed !== undefined) {
      const sellingContractsCount = contracts.filter(c => c.contract_type === 'selling').length;
      if (sellingContractsCount >= profile.max_contracts_allowed) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.contract_limit_reached'),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
        return;
      }
    }

    const orphanSellings = findOrphanSelling(contracts);
    if (orphanSellings.length > 0) {
      const orphanContract = orphanSellings[0];
      setOrphanSellingId(orphanContract.id);
      setOrphanSellingNumber(orphanContract.contract_number || orphanContract.id);
      setShowOrphanModal(true);
    } else {
      setStartWithRental(false);
      setShowContractForm(true);
    }
  };

  const handleCreateRentalForOrphan = () => {
    setShowOrphanModal(false);
    setStartWithRental(true);
    setShowContractForm(true);
  };

  const groupContractsIntoPairs = (contractsList) => {
    const pairs = [];
    const processed = new Set();
    
    contractsList.forEach(contract => {
      if (processed.has(contract.id)) return;
      
      if (contract.linked_contract) {
        const linkedContract = contractsList.find(c => c.id === contract.linked_contract.id);
        const isSelling = contract.contract_type === 'selling';
        const selling = isSelling ? contract : linkedContract;
        const rental = isSelling ? linkedContract : contract;
        
        pairs.push({ 
          selling: selling || (isSelling ? null : contract.linked_contract), 
          rental: rental || (!isSelling ? null : contract.linked_contract), 
          pairId: selling?.id || contract.id 
        });
        
        processed.add(contract.id);
        if (linkedContract) processed.add(linkedContract.id);
      } else {
        pairs.push({ 
          selling: contract.contract_type === 'selling' ? contract : null,
          rental: contract.contract_type === 'rental' ? contract : null,
          pairId: contract.id,
          isIncomplete: true
        });
        processed.add(contract.id);
      }
    });
    
    return pairs;
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  const pairs = groupContractsIntoPairs(contracts);
  const lang = getLang(i18n);

  const renderCreationGuidance = () => {
    if (!creationGuidance) return null;

    const reason = pickText(lang, creationGuidance.reason_ar, creationGuidance.reason, '');
    const estimated = pickText(lang, creationGuidance.estimated_approval_time_ar, creationGuidance.estimated_approval_time, '');
    const checklist = Array.isArray(creationGuidance.checklist) ? creationGuidance.checklist : [];
    const canCreateSelling = creationGuidance.can_create_selling !== false;
    const canCreateRental = creationGuidance.can_create_rental !== false;

    // Only show when there is actionable guidance.
    if (canCreateSelling && canCreateRental && !reason && checklist.length === 0) return null;

    return (
      <div className="creation-guidance-card">
        <div className="creation-guidance-header">
          <div className="creation-guidance-icon">
            <i className={`fas ${canCreateSelling && canCreateRental ? 'fa-info-circle' : 'fa-lock'}`}></i>
          </div>
          <div className="creation-guidance-content">
            <h3>{t('dashboard.contract_creation.guidance_title')}</h3>
            {!!reason && <p className="creation-guidance-reason">{reason}</p>}
            {!!estimated && (
              <p className="creation-guidance-estimate">
                <i className="fas fa-clock"></i> {estimated}
              </p>
            )}
          </div>
        </div>
        {checklist.length > 0 && (
          <div className="creation-guidance-checklist">
            {checklist.map((item, idx) => {
              const label = pickText(lang, item.item_ar, item.item, '');
              const status = !!item.status;
              return (
                <div key={idx} className={`guidance-item ${status ? 'done' : 'missing'}`}>
                  <i className={`fas ${status ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                  <span className="guidance-label">{label}</span>
                  {!status && item.action_url && (
                    <button className="guidance-action" onClick={() => navigate(item.action_url)}>
                      {t('dashboard.contract_creation.fix_now')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWorkflow = (contract) => {
    const steps = contract?.workflow?.steps;
    if (!Array.isArray(steps) || steps.length === 0) return null;
    const currentStep = contract?.workflow?.current_step;
    const totalSteps = contract?.workflow?.total_steps || steps.length;
    const nextAction = contract?.workflow?.next_action || null;
    const nextMessage = nextAction
      ? pickText(lang, nextAction.message_ar, nextAction.message, '')
      : '';

    return (
      <div className="contract-workflow">
        <div className="workflow-top">
          <span className="workflow-progress">
            {t('dashboard.contracts_page.workflow')}:{' '}
            <strong>{currentStep || 0}/{totalSteps}</strong>
          </span>
          {!!nextMessage && (
            <span className="workflow-next" title={nextMessage}>
              <i className="fas fa-info-circle"></i> {nextMessage}
            </span>
          )}
        </div>
        <div className="workflow-steps">
          {steps.map((s) => {
            const name = pickText(lang, s.name_ar, s.name, '');
            return (
              <div key={s.step} className={`workflow-step ${s.status}`}>
                <span className="step-dot"></span>
                <span className="step-name">{name}</span>
                {s.deadline && (
                  <span className="step-deadline">
                    <i className="fas fa-clock"></i> {formatDate(s.deadline, lang)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getStatusExplainTitle = (contract) => {
    const explain = contract?.status_explanation || null;
    const e = explain?.[lang] || explain?.en || explain?.ar || null;
    if (!e) return '';
    const meaning = e.meaning || '';
    const what = e.what_to_do || '';
    const eta = e.estimated_time ? ` (${e.estimated_time})` : '';
    return `${meaning}${meaning && what ? ' — ' : ''}${what}${eta}`;
  };

  return (
    <div className="contracts-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.contracts')}</h1>
          <p className="page-subtitle">{t('dashboard.contracts_subtitle')}</p>
        </div>
        <button className="add-contract-btn primary-btn" onClick={handleAddContractClick}>
          <i className="fas fa-plus"></i>
          {t('dashboard.add_contract')}
        </button>
      </div>

      {renderCreationGuidance()}

      {contracts.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-file-contract"></i>
          <h3>{t('dashboard.contracts_empty')}</h3>
          <p>{t('dashboard.contracts_empty_description')}</p>
          <button className="primary-btn" onClick={handleAddContractClick}>
            {t('dashboard.add_contract')}
          </button>
        </div>
      ) : (
        <div className="contracts-grid">
          {pairs.map((pair) => {
            // Comprehensive status configuration with icons and colors
            const getStatusConfig = (contract) => {
              if (!contract) return null;
              
              const status = contract.status;
              const receiptStatus = contract.receipt_upload_status;
              // Handle both string and number status values
              const statusStr = String(status).toLowerCase();
              const isApproved = statusStr === 'approved' || status === 1 || status === '1';
              const isDenied = statusStr === 'denied' || status === 0 || status === '0';
              const isPending = statusStr === 'pending' || status === null || status === undefined || status === '';
              const isActive = statusStr === 'active' || (isApproved && contract.contract_signed && receiptStatus === 'uploaded');
              
              // Determine primary status
              let primaryStatus = {
                key: 'pending',
                icon: 'fa-clock',
                bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                text: t('dashboard.contracts_page.status_pending_approval'),
                textAr: 'قيد المراجعة',
                pulse: true
              };
              
              if (isDenied) {
                primaryStatus = {
                  key: 'denied',
                  icon: 'fa-times-circle',
                  bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  text: t('dashboard.contracts_page.status_denied'),
                  textAr: 'مرفوض',
                  pulse: false
                };
              } else if (isApproved) {
                // Check receipt status for approved contracts
                if (receiptStatus === 'overdue') {
                  primaryStatus = {
                    key: 'overdue',
                    icon: 'fa-exclamation-triangle',
                    bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: '#fff',
                    text: t('dashboard.contracts_page.status_overdue_receipt'),
                    textAr: 'متأخر - إيصال مطلوب',
                    pulse: true
                  };
                } else if (receiptStatus === 'pending') {
                  primaryStatus = {
                    key: 'waiting_receipt',
                    icon: 'fa-hourglass-half',
                    bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    text: t('dashboard.contracts_page.status_waiting_receipt'),
                    textAr: 'في انتظار الإيصال',
                    pulse: true
                  };
                } else if (receiptStatus === 'uploaded' || isActive) {
                  primaryStatus = {
                    key: 'active',
                    icon: 'fa-check-circle',
                    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    text: t('dashboard.contracts_page.status_active'),
                    textAr: 'نشط',
                    pulse: false
                  };
                } else {
                  primaryStatus = {
                    key: 'approved',
                    icon: 'fa-check-circle',
                    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    text: t('dashboard.contracts_page.status_approved'),
                    textAr: 'مقبول',
                    pulse: false
                  };
                }
              } else if (isActive) {
                primaryStatus = {
                  key: 'active',
                  icon: 'fa-check-circle',
                  bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  text: t('dashboard.contracts_page.status_active'),
                  textAr: 'نشط',
                  pulse: false
                };
              }
              
              return {
                primary: primaryStatus,
                receiptStatus: receiptStatus,
                contractSigned: contract.contract_signed
              };
            };
            
            const sellingConfig = getStatusConfig(pair.selling);
            const rentalConfig = getStatusConfig(pair.rental);
            
            return (
              <div key={pair.pairId} className="contract-pair-card">
                {pair.selling && (
                  <div className="pair-header">
                    <div className="pair-amount">
                      <div className="amount-label">{t('contract_type_sale')}</div>
                      <div className="amount-value">
                        {(() => {
                          const amount = pair.selling.amount;
                          const displayAmount = (amount && Number(amount) > 0) ? Number(amount) : 6600;
                          return displayAmount.toLocaleString();
                        })()} <span className="currency">{t('dashboard.currency')}</span>
                      </div>
                    </div>
                    <div className="pair-divider"></div>
                    <div className="pair-amount">
                      <div className="amount-label">{t('contract_type_rental')}</div>
                      <div className="amount-value">
                        {pair.rental ? (
                          <>{(() => {
                            const amount = pair.rental.amount;
                            const displayAmount = (amount && Number(amount) > 0) ? Number(amount) : 660;
                            return displayAmount.toLocaleString();
                          })()} <span className="currency">{t('dashboard.currency')}/{t('dashboard.contracts_page.month_abbr')}</span></>
                        ) : (
                          <span className="no-rental">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pair-contracts">
                  <div className="contract-card">
                    <div className="contract-header">
                      <div className="contract-icon selling">
                        <i className="fas fa-handshake"></i>
                      </div>
                      <div className="contract-header-content">
                        <h3>
                          {pair.selling
                            ? pickFieldText(lang, pair.selling, ['display_name_ar'], ['display_name'], t('contract_type_sale'))
                            : t('contract_type_sale')}
                        </h3>
                        {sellingConfig && sellingConfig.primary && (
                          <div className="status-container">
                            <span 
                              className={`status-badge status-${sellingConfig.primary.key} ${sellingConfig.primary.pulse ? 'status-pulse' : ''}`}
                              style={{ 
                                background: sellingConfig.primary.bg,
                                color: sellingConfig.primary.color
                              }}
                            >
                              <i className={`fas ${sellingConfig.primary.icon}`}></i>
                              <span className="status-text">
                                {lang === 'ar' 
                                  ? (pair.selling.status_ar || sellingConfig.primary.textAr || sellingConfig.primary.text)
                                  : sellingConfig.primary.text
                                }
                              </span>
                            </span>
                            {!!getStatusExplainTitle(pair.selling) && (
                              <i
                                className="fas fa-info-circle status-explain"
                                title={getStatusExplainTitle(pair.selling)}
                              ></i>
                            )}
                            {sellingConfig.receiptStatus && sellingConfig.receiptStatus !== 'uploaded' && (
                              <span className={`receipt-status-badge receipt-${sellingConfig.receiptStatus}`}>
                                <i className={`fas ${
                                  sellingConfig.receiptStatus === 'overdue' ? 'fa-exclamation-circle' :
                                  sellingConfig.receiptStatus === 'pending' ? 'fa-clock' : 'fa-check'
                                }`}></i>
                                {sellingConfig.receiptStatus === 'pending' && t('admin.contracts.receipt_status.pending')}
                                {sellingConfig.receiptStatus === 'overdue' && t('admin.contracts.receipt_status.overdue')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {pair.selling ? (
                      <div className="contract-body">
                        <div className="contract-info">
                          <i className={`fas ${sellingConfig?.contractSigned ? 'fa-check-circle signed' : 'fa-times-circle unsigned'}`}></i>
                          <span>{sellingConfig?.contractSigned ? t('dashboard.contract.signed') : t('dashboard.contract.not_signed')}</span>
                        </div>
                        {sellingConfig?.contractSigned && (
                          <button className="download-btn" onClick={() => handleDownloadContract(pair.selling)}>
                            <i className="fas fa-download"></i> {t('download')}
                          </button>
                        )}
                        {sellingConfig?.receiptStatus && sellingConfig.receiptStatus !== 'uploaded' && sellingConfig.primary?.key !== 'denied' && (
                          <button 
                            className="upload-receipt-btn" 
                            onClick={() => handleReceiptUpload(pair.selling.id)}
                            disabled={uploadingReceipt === pair.selling.id}
                          >
                            {uploadingReceipt === pair.selling.id ? (
                              <>
                                <i className="fas fa-spinner fa-spin"></i> {t('dashboard.uploading')}
                              </>
                            ) : (
                              <>
                                <i className="fas fa-upload"></i> {t('dashboard.wire_receipt.upload_receipt')}
                              </>
                            )}
                          </button>
                        )}
                        {renderWorkflow(pair.selling)}
                        {/* Contractor Info PDF Section */}
                        {sellingConfig?.primary?.key === 'approved' && profile?.contractor_info_pdf_path && (
                          <div className="contractor-info-pdf-section" style={{
                            marginTop: '16px',
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <i className="fas fa-file-pdf" style={{ fontSize: '20px', color: '#ef4444' }}></i>
                              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                {t('dashboard.contracts.bank_details')}
                              </h4>
                            </div>
                            <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '13px' }}>
                              {t('dashboard.contracts.bank_details_description')}
                            </p>
                            <div className="pdf-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button 
                                className="btn btn-primary"
                                onClick={() => {
                                  const url = getPDFUrl(profile.contractor_info_pdf_path);
                                  window.open(url, '_blank');
                                }}
                                style={{
                                  padding: '8px 16px',
                                  background: '#073491',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                <i className="fas fa-download"></i>
                                {t('dashboard.contracts.download_pdf')}
                              </button>
                              <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                  setPdfUrl(getPDFUrl(profile.contractor_info_pdf_path));
                                  setShowPDFModal(true);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  background: 'white',
                                  color: '#374151',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                <i className="fas fa-eye"></i>
                                {t('dashboard.contracts.view_pdf')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="contract-empty">{t('dashboard.not_created_yet')}</div>
                    )}
                  </div>
                  
                  <div className="contract-card">
                    <div className="contract-header">
                      <div className="contract-icon rental">
                        <i className="fas fa-motorcycle"></i>
                      </div>
                      <div className="contract-header-content">
                        <h3>
                          {pair.rental
                            ? pickFieldText(lang, pair.rental, ['display_name_ar'], ['display_name'], t('contract_type_rental'))
                            : t('contract_type_rental')}
                        </h3>
                        {rentalConfig && rentalConfig.primary && (
                          <div className="status-container">
                            <span 
                              className={`status-badge status-${rentalConfig.primary.key} ${rentalConfig.primary.pulse ? 'status-pulse' : ''}`}
                              style={{ 
                                background: rentalConfig.primary.bg,
                                color: rentalConfig.primary.color
                              }}
                            >
                              <i className={`fas ${rentalConfig.primary.icon}`}></i>
                              <span className="status-text">
                                {lang === 'ar' 
                                  ? (pair.rental.status_ar || rentalConfig.primary.textAr || rentalConfig.primary.text)
                                  : rentalConfig.primary.text
                                }
                              </span>
                            </span>
                            {!!getStatusExplainTitle(pair.rental) && (
                              <i
                                className="fas fa-info-circle status-explain"
                                title={getStatusExplainTitle(pair.rental)}
                              ></i>
                            )}
                            {rentalConfig.receiptStatus && rentalConfig.receiptStatus !== 'uploaded' && (
                              <span className={`receipt-status-badge receipt-${rentalConfig.receiptStatus}`}>
                                <i className={`fas ${
                                  rentalConfig.receiptStatus === 'overdue' ? 'fa-exclamation-circle' :
                                  rentalConfig.receiptStatus === 'pending' ? 'fa-clock' : 'fa-check'
                                }`}></i>
                                {rentalConfig.receiptStatus === 'pending' && t('admin.contracts.receipt_status.pending')}
                                {rentalConfig.receiptStatus === 'overdue' && t('admin.contracts.receipt_status.overdue')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {pair.rental ? (
                      <div className="contract-body">
                        <div className="contract-info">
                          <i className={`fas ${rentalConfig?.contractSigned ? 'fa-check-circle signed' : 'fa-times-circle unsigned'}`}></i>
                          <span>{rentalConfig?.contractSigned ? t('dashboard.contract.signed') : t('dashboard.contract.not_signed')}</span>
                        </div>
                        {rentalConfig?.contractSigned && (
                          <button className="download-btn" onClick={() => handleDownloadContract(pair.rental)}>
                            <i className="fas fa-download"></i> {t('download')}
                          </button>
                        )}
                        {rentalConfig?.receiptStatus && rentalConfig.receiptStatus !== 'uploaded' && rentalConfig.primary?.key !== 'denied' && (
                          <button 
                            className="upload-receipt-btn" 
                            onClick={() => handleReceiptUpload(pair.rental.id)}
                            disabled={uploadingReceipt === pair.rental.id}
                          >
                            {uploadingReceipt === pair.rental.id ? (
                              <>
                                <i className="fas fa-spinner fa-spin"></i> {t('dashboard.uploading')}
                              </>
                            ) : (
                              <>
                                <i className="fas fa-upload"></i> {t('dashboard.wire_receipt.upload_receipt')}
                              </>
                            )}
                          </button>
                        )}
                        {renderWorkflow(pair.rental)}
                      </div>
                    ) : (
                      <div className="contract-empty incomplete">
                        <i className="fas fa-clock"></i>
                        {t('dashboard.incomplete_pair')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showContractForm && (
        <div className="modal-overlay" onClick={() => setShowContractForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('dashboard.add_contract')}</h2>
              <button className="close-btn" onClick={() => setShowContractForm(false)}>
                {t('close')}
              </button>
            </div>
            <ContractForm
              onSuccess={handleContractCreated}
              onCancel={() => setShowContractForm(false)}
              userProfile={profile}
              startWithRental={startWithRental}
              onContractsCreated={() => {
                // Store current contract count to detect when new contract appears
                const currentCount = contracts.length;
                setExpectedContractCount(currentCount);
                // Start polling for new contract
                setTimeout(() => {
                  fetchData(0, true);
                }, 1000);
              }}
            />
          </div>
        </div>
      )}

      {showProfileCompletion && profile && (
        <ProfileCompletionModal
          userProfile={profile}
          onComplete={() => {
            setShowProfileCompletion(false);
            fetchData();
          }}
        />
      )}

      {showOrphanModal && (
        <div className="modal-overlay" onClick={() => setShowOrphanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107' }}>
              <h2 style={{ color: '#856404', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-exclamation-triangle"></i>
                {t('dashboard.error.orphan_selling_title')}
              </h2>
              <button className="close-btn" onClick={() => setShowOrphanModal(false)}>
                {t('close')}
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                {t('dashboard.error.orphan_selling_message', { id: orphanSellingNumber || orphanSellingId })}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowOrphanModal(false)} className="cancel-btn">
                  {t('cancel')}
                </button>
                <button onClick={handleCreateRentalForOrphan} className="primary-btn">
                  <i className="fas fa-motorcycle"></i>
                  {t('dashboard.error.create_rental_now')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Comparison Modal */}
      {showComparisonModal && comparisonData && (
        <DataComparisonModal
          isOpen={showComparisonModal}
          onClose={() => {
            setShowComparisonModal(false);
            setComparisonData(null);
            setDocumentRejected(false);
          }}
          comparison={comparisonData}
          isRejected={documentRejected}
          onUpdateProfile={async () => {
            setShowComparisonModal(false);
            setComparisonData(null);
            await fetchData();
          }}
          onKeepCurrent={() => {
            setShowComparisonModal(false);
            setComparisonData(null);
            setDocumentRejected(false);
          }}
          documentType="receipt"
        />
      )}

      {/* PDF Viewer Modal */}
      {showPDFModal && pdfUrl && (
        <div className="modal-overlay" onClick={() => setShowPDFModal(false)}>
          <div className="modal-content pdf-viewer-modal" onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '90%',
            maxHeight: '90vh',
            width: '900px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                {t('dashboard.contracts.bank_details')}
              </h3>
              <button className="modal-close" onClick={() => setShowPDFModal(false)} style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0, height: '80vh', flex: 1 }}>
              <iframe 
                src={pdfUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Contractor Info PDF"
              />
            </div>
            <div className="modal-footer" style={{
              padding: '20px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#f9fafb'
            }}>
              <button 
                className="btn btn-primary"
                onClick={() => window.open(pdfUrl, '_blank')}
                style={{
                  padding: '10px 20px',
                  background: '#073491',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <i className="fas fa-download"></i>
                {t('dashboard.contracts.download_pdf')}
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => setShowPDFModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {t('dashboard.contracts.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;
