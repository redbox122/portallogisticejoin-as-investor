import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import LanguageSwitcher from '../CustomComponents/LanguageSwitcher';
import ContractForm from '../Components/ContractForm';
import ProfileCompletionModal from '../Components/ProfileCompletionModal';
import { API_BASE_URL } from '../config';
import '../Css/dashboard.css';

const UserDashboard = () => {
  const { t, i18n } = useTranslation(['common']);
  const { logout, getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContractForm, setShowContractForm] = useState(false);
  const [startWithRental, setStartWithRental] = useState(false);
  const [lang, setLang] = useState(i18n.language || 'ar');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({ region: '', phone: '' });
  const [editErrors, setEditErrors] = useState({});
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showOrphanModal, setShowOrphanModal] = useState(false);
  const [orphanSellingId, setOrphanSellingId] = useState(null);
  const [orphanSellingNumber, setOrphanSellingNumber] = useState(null);
  const [expectedContractCount, setExpectedContractCount] = useState(null); // Track expected contract count after creation

  useEffect(() => {
    const currentLang = i18n.language || 'ar';
    setLang(currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLang);
  }, [i18n.language]);

  // Check if profile has missing required fields
  const checkMissingFields = useCallback((userData) => {
    if (!userData) {
      console.log('checkMissingFields: No userData provided');
      return false;
    }
    
    const requiredFields = [
      'national_id',
      'first_name',
      'family_name',
      'father_name',
      'grandfather_name',
      'birth_date',
      'region',
      'bank_name',
      'iban',
      'phone'
    ];

    const missingFields = [];
    const hasMissing = requiredFields.some(field => {
      // Handle phone field separately since it might be phone_number
      let value;
      if (field === 'phone') {
        value = userData[field] || userData.phone_number || null;
      } else {
        // Explicitly check if field exists - if not, it's undefined
        value = userData.hasOwnProperty(field) ? userData[field] : undefined;
      }
      
      // Explicit check for missing/invalid values
      // A field is considered missing if:
      // - It's undefined (doesn't exist)
      // - It's null
      // - It's an empty string after trimming
      // - It's the string "Unknown" (case-insensitive)
      // - It's the string "null"
      let isEmpty = false;
      
      if (value === undefined || value === null) {
        isEmpty = true;
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        isEmpty = trimmed === '' || 
                  trimmed.toLowerCase() === 'unknown' || 
                  trimmed.toLowerCase() === 'null';
      } else if (typeof value === 'number' && isNaN(value)) {
        isEmpty = true;
      }
      
      if (isEmpty) {
        missingFields.push(field);
      }
      
      return isEmpty;
    });

    console.log('checkMissingFields result:', {
      hasMissing,
      missingFields,
      userData: {
        email: userData.email,
        first_name: userData.first_name,
        family_name: userData.family_name,
        phone: userData.phone || userData.phone_number
      }
    });

    return hasMissing;
  }, []);

  useEffect(() => {
    // Only fetch data if we have a token
    const token = localStorage.getItem('portal_logistics_token');
    if (token) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // Watch profile changes and check for missing fields
  // This ensures the modal appears immediately after profile is loaded
  // IMPORTANT: This runs AFTER fetchUserData sets the profile
  useEffect(() => {
    if (profile) {
      console.log('useEffect profile check triggered');
      const hasMissingFields = checkMissingFields(profile);
      console.log('useEffect missing fields result:', hasMissingFields);
      
      // Always enforce modal state based on missing fields
      // Don't check loading state - if profile exists, check it
      if (hasMissingFields) {
        console.log('useEffect: FORCING showProfileCompletion to TRUE');
        setShowProfileCompletion(true);
      } else {
        console.log('useEffect: Setting showProfileCompletion to false (all complete)');
        setShowProfileCompletion(false);
      }
    }
  }, [profile, checkMissingFields]); // Removed loading dependency - check whenever profile changes

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Check token first
      const token = localStorage.getItem('portal_logistics_token');
      if (!token) {
        console.error('No token found, redirecting to login');
        logout();
        return;
      }

      const headers = getAuthHeaders();
      
      // Double-check we have a token before making API calls
      if (!headers.Authorization || !headers.Authorization.includes('Bearer')) {
        console.error('No Authorization header available');
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.auth_failed'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        setLoading(false);
        return;
      }
      
      // Add cache-busting headers
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      
      // Add timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      
      // Fetch profile and contracts in parallel
      const [profileResponse, contractsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/portallogistice/profile?_t=${timestamp}`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/contracts?_t=${timestamp}`, { headers })
      ]);

      if (profileResponse.data && profileResponse.data.success) {
        const userData = profileResponse.data.data.user || profileResponse.data.data;
        
        if (!userData) {
          console.error('Profile data is missing!');
          setLoading(false);
          return;
        }
        
        console.log('Profile fetched - Full userData:', JSON.stringify(userData, null, 2));
        console.log('Profile fetched - Key fields:', {
          email: userData.email,
          first_name: userData.first_name,
          family_name: userData.family_name,
          phone: userData.phone || userData.phone_number,
          birth_date: userData.birth_date,
          region: userData.region,
          national_address_email: userData.national_address_email,
          bank_name: userData.bank_name,
          iban: userData.iban
        });
        
        // Always check for missing fields BEFORE setting profile
        const hasMissingFields = checkMissingFields(userData);
        
        console.log('Missing fields check result:', hasMissingFields);
        console.log('Current showProfileCompletion state BEFORE update:', showProfileCompletion);
        
        // Set profile state (this will trigger useEffect as backup)
        setProfile(userData);
        
        // CRITICAL: Force show modal immediately if fields are missing
        // This must happen synchronously, not in useEffect
        if (hasMissingFields) {
          console.log('FORCING showProfileCompletion to TRUE - Fields are missing!');
          setShowProfileCompletion(true);
        } else {
          console.log('All fields complete, ensuring modal is hidden');
          setShowProfileCompletion(false);
        }
      }

      if (contractsResponse.data && contractsResponse.data.success) {
        const contractsList = contractsResponse.data.data.contracts || contractsResponse.data.data || [];
        // Log contract amounts for debugging
        console.log('Fetched contracts with amounts:', contractsList.map(c => ({
          id: c.id,
          contract_type: c.contract_type,
          amount: c.amount,
          amountType: typeof c.amount
        })));
        setContracts(contractsList);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.auth_failed'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        // Don't logout immediately, give user a chance to see the error
        setTimeout(() => logout(), 2000);
      } else {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: error.response?.data?.message || t('dashboard.error.fetch_data'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadContract = (contract) => {
    if (contract.contract_download_url) {
      window.open(contract.contract_download_url, '_blank');
    } else if (contract.id && profile?.national_id) {
      // Build download URL if not provided
      const downloadUrl = `${API_BASE_URL}/portallogistice/download-contract/${contract.id}?national_id=${profile.national_id}`;
      window.open(downloadUrl, '_blank');
    } else {
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: t('dashboard.error.download_failed'),
        type: 'warning',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000, onScreen: true }
      });
    }
  };

  const refreshContracts = async (retryCount = 0, isPollingForNewContract = false) => {
    try {
      const headers = getAuthHeaders();
      // Add cache-busting headers
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      
      // Add timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const contractsResponse = await axios.get(`${API_BASE_URL}/portallogistice/contracts?_t=${timestamp}`, { headers });
      
      if (contractsResponse.data && contractsResponse.data.success) {
        const contractsList = contractsResponse.data.data.contracts || contractsResponse.data.data || [];
        setContracts(contractsList);
        
        // If we're polling for a new contract, check if it appeared
        if (isPollingForNewContract && expectedContractCount !== null) {
          const currentCount = contractsList.length;
          const rentalCount = contractsList.filter(c => c.contract_type === 'rental').length;
          
          // Check if we have more contracts or if a rental contract appeared
          if (currentCount > expectedContractCount || rentalCount > 0) {
            console.log('✅ New contract detected! Stopping polling.');
            setExpectedContractCount(null); // Reset tracking
            return; // Success - contract appeared
          }
          
          // Contract hasn't appeared yet, continue polling
          if (retryCount < 10) { // Poll up to 10 times (20 seconds total)
            console.log(`⏳ Contract not yet available, polling again (attempt ${retryCount + 1}/10)...`);
            setTimeout(() => {
              refreshContracts(retryCount + 1, true);
            }, 2000); // Poll every 2 seconds
            return;
          } else {
            // Max polling attempts reached, but don't show error - contract might still appear
            console.log('⏰ Max polling attempts reached. Contract may still be processing.');
            setExpectedContractCount(null);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing contracts:', error);
      
      // If polling and we get an error, continue polling (might be temporary)
      if (isPollingForNewContract && retryCount < 10) {
        console.log(`⚠️ Error during polling, retrying (attempt ${retryCount + 1}/10)...`);
        setTimeout(() => {
          refreshContracts(retryCount + 1, true);
        }, 2000);
        return;
      }
    }
  };

  const handleContractCreated = () => {
    setShowContractForm(false);
    
    // Store current contract count to detect when new contract appears
    const currentCount = contracts.length;
    setExpectedContractCount(currentCount);
    
    // Start polling immediately - don't wait, start checking right away
    // The polling will continue until the new contract appears or max attempts reached
    setTimeout(() => {
      refreshContracts(0, true); // Start polling for new contract
    }, 1000); // Small initial delay to let backend start processing
    
    Store.addNotification({
      title: t('dashboard.success.title'),
      message: t('dashboard.success.contract_created'),
      type: 'success',
      insert: 'top',
      container: 'top-right',
      dismiss: { duration: 3000, onScreen: true }
    });
  };

  const handleEditProfile = () => {
    if (profile) {
      setEditFormData({
        region: profile.region || '',
        phone: profile.phone || profile.phone_number || ''
      });
      setEditErrors({});
      setIsEditingProfile(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditFormData({ region: '', phone: '' });
    setEditErrors({});
  };

  const validatePhone = (phone) => {
    if (!phone || !phone.trim()) {
      return t('dashboard.form.error.required_field');
    }
    // Remove all non-digit characters for length check
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 20) {
      return t('dashboard.form.error.phone_length');
    }
    // Check format: allows +, -, spaces, parentheses
    const phoneRegex = /^([0-9\s\-\+\(\)]*)$/;
    if (!phoneRegex.test(phone)) {
      return t('dashboard.form.error.invalid_phone');
    }
    return null;
  };

  const handleUpdateProfile = async () => {
    const newErrors = {};
    
    // Validate phone
    const phoneError = validatePhone(editFormData.phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    // Region is optional but if provided, should not be empty
    if (editFormData.region && editFormData.region.trim().length === 0) {
      newErrors.region = t('dashboard.form.error.invalid_region');
    }

    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors);
      return;
    }

    setUpdatingProfile(true);
    try {
      const headers = getAuthHeaders();
      const updateData = {
        phone: editFormData.phone.trim()
      };
      
      // Only include region if it's provided
      if (editFormData.region && editFormData.region.trim()) {
        updateData.region = editFormData.region.trim();
      }

      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/profile`,
        updateData,
        { headers }
      );

      if (response.data && response.data.success) {
        // Update local profile state
        setProfile(prev => ({
          ...prev,
          ...response.data.data.user
        }));
        setIsEditingProfile(false);
        Store.addNotification({
          title: t('dashboard.success.title'),
          message: response.data.message || t('dashboard.success.profile_updated'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: error.response?.data?.message || error.message || t('dashboard.error.update_profile'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (editErrors[field]) {
      setEditErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProfileCompleted = async (updatedProfile) => {
    // Update local state immediately
    if (updatedProfile) {
      setProfile(prev => ({
        ...prev,
        ...updatedProfile
      }));
    }
    
    // Refresh user data from server to ensure we have the latest
    await fetchUserData();
    
    // Verify all fields are complete after refresh
    // The useEffect will automatically check and close modal if complete
  };

  const isRTL = lang === 'ar';

  // Find orphan selling contracts (selling without linked rental)
  const findOrphanSelling = useCallback((contractsList) => {
    return contractsList.filter(c => 
      c.contract_type === 'selling' && !c.linked_contract
    );
  }, []);

  // Handle Add Contract button click
  const handleAddContractClick = () => {
    // Check contract limit first
    if (profile?.max_contracts_allowed !== null && profile?.max_contracts_allowed !== undefined) {
      // Count selling contracts (each contract pair starts with a selling contract)
      const sellingContractsCount = contracts.filter(c => c.contract_type === 'selling').length;
      
      if (sellingContractsCount >= profile.max_contracts_allowed) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.contract_limit_reached'),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        return; // Don't open the form
      }
    }

    const orphanSellings = findOrphanSelling(contracts);
    if (orphanSellings.length > 0) {
      // Block new selling creation, show warning modal
      const orphanContract = orphanSellings[0];
      setOrphanSellingId(orphanContract.id);
      setOrphanSellingNumber(orphanContract.contract_number || orphanContract.id);
      setShowOrphanModal(true);
    } else {
      // No orphan selling, allow normal flow
      setStartWithRental(false);
      setShowContractForm(true);
    }
  };

  // Handle creating rental for orphan selling
  const handleCreateRentalForOrphan = () => {
    setShowOrphanModal(false);
    setStartWithRental(true);
    setShowContractForm(true);
  };

  // Group contracts into pairs (selling + rental)
  const groupContractsIntoPairs = (contractsList) => {
    const pairs = [];
    const processed = new Set();
    
    contractsList.forEach(contract => {
      if (processed.has(contract.id)) return;
      
      if (contract.linked_contract) {
        // Find the linked contract in the list
        const linkedContract = contractsList.find(c => c.id === contract.linked_contract.id);
        
        // Determine which is selling and which is rental
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
        // Unpaired contract (shouldn't happen often based on business rules)
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
      <div className="dashboard-loading" dir={isRTL ? 'rtl' : 'ltr'}>
        <Watch
          height="60"
          width="60"
          radius="9"
          color="#073491"
          ariaLabel="loading"
        />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="user-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/assets/images/logo.png" alt="Logo" className="dashboard-logo" />
            <h1 className="dashboard-title">{t('dashboard.title')}</h1>
          </div>
          <div className="header-right">
            <LanguageSwitcher />
            <button className="logout-btn" onClick={logout}>
              {t('dashboard.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* User Profile Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">{t('dashboard.profile_title')}</h2>
            {profile && !isEditingProfile && (
              <button 
                className="edit-profile-btn primary-btn"
                onClick={handleEditProfile}
              >
                <i className="fas fa-edit"></i> {t('dashboard.edit_profile')}
              </button>
            )}
          </div>
          {profile ? (
            <div className="profile-card">
              <div className="profile-row">
                <div className="profile-item">
                  <label>{t('dashboard.profile.full_name')}</label>
                  <p className="readonly-field">{profile.full_name || profile.first_name + ' ' + profile.family_name || '-'}</p>
                </div>
                <div className="profile-item">
                  <label>{t('email')}</label>
                  <p className="readonly-field">{profile.email || '-'}</p>
                </div>
              </div>
              <div className="profile-row">
                <div className="profile-item">
                  <label>{t('phone_number')} {isEditingProfile && <span style={{ color: '#dc3545' }}>*</span>}</label>
                  {isEditingProfile ? (
                    <>
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => handleEditFormChange('phone', e.target.value)}
                        className={editErrors.phone ? 'input-error' : ''}
                        placeholder={t('phone_number_placeholder')}
                      />
                      {editErrors.phone && <p className="error-message">{editErrors.phone}</p>}
                    </>
                  ) : (
                    <p className="readonly-field">{profile.phone || profile.phone_number || '-'}</p>
                  )}
                </div>
                <div className="profile-item">
                  <label>{t('national_id')}</label>
                  <p className="readonly-field">{profile.national_id || '-'}</p>
                </div>
              </div>
              {(profile.birth_date || profile.region) && (
                <div className="profile-row">
                  {profile.birth_date && (
                    <div className="profile-item">
                      <label>{t('birth_date')}</label>
                      <p className="readonly-field">{profile.birth_date}</p>
                    </div>
                  )}
                  <div className="profile-item">
                    <label>{t('region')}</label>
                    {isEditingProfile ? (
                      <>
                        <input
                          type="text"
                          value={editFormData.region}
                          onChange={(e) => handleEditFormChange('region', e.target.value)}
                          className={editErrors.region ? 'input-error' : ''}
                          placeholder={t('region_placeholder')}
                        />
                        {editErrors.region && <p className="error-message">{editErrors.region}</p>}
                      </>
                    ) : (
                      <p className="readonly-field">{profile.region || '-'}</p>
                    )}
                  </div>
                </div>
              )}
              {(profile.bank_name || profile.iban) && (
                <div className="profile-row">
                  {profile.bank_name && (
                    <div className="profile-item">
                      <label>{t('bank_name')}</label>
                      <p className="readonly-field">{profile.bank_name}</p>
                    </div>
                  )}
                  {profile.iban && (
                    <div className="profile-item">
                      <label>{t('iban')}</label>
                      <p className="readonly-field">{profile.iban.startsWith('SA') ? profile.iban : 'SA' + profile.iban}</p>
                    </div>
                  )}
                </div>
              )}
              {isEditingProfile && (
                <div className="profile-edit-actions">
                  <button
                    className="save-btn primary-btn"
                    onClick={handleUpdateProfile}
                    disabled={updatingProfile}
                  >
                    {updatingProfile ? (
                      <>
                        <Watch height="16" width="16" color="#fff" ariaLabel="loading" />
                        {t('dashboard.saving')}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i> {t('dashboard.save')}
                      </>
                    )}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={updatingProfile}
                  >
                    {t('cancel')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>{t('dashboard.profile.loading')}</p>
            </div>
          )}
        </section>

        {/* Contracts Section */}
        <section className="contracts-section">
          <div className="section-header">
            <h2 className="section-title">{t('dashboard.contracts')}</h2>
            <button 
              className="add-contract-btn primary-btn"
              onClick={handleAddContractClick}
            >
              {t('dashboard.add_contract')}
            </button>
          </div>

          {contracts.length === 0 ? (
            <div className="empty-state">
              <p>{t('dashboard.contracts_empty')}</p>
            </div>
          ) : (
            <div className="contracts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {groupContractsIntoPairs(contracts).map((pair) => {
                const getStatusStyle = (status) => {
                  if (status === 'approved') return { bg: '#10b981', color: '#fff' };
                  if (status === 'denied') return { bg: '#ef4444', color: '#fff' };
                  return { bg: '#f59e0b', color: '#fff' };
                };
                
                return (
                  <div key={pair.pairId} className="contract-pair-card" style={{
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                  }}>
                    {/* Main Amount Display */}
                    {pair.selling && (
                      <div style={{
                        background: 'linear-gradient(135deg, #073491 0%, #1e4fad 100%)',
                        padding: '20px 24px',
                        color: '#fff',
                        display: 'flex',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}>
                        {/* Buying Amount */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <i className="fas fa-handshake" style={{ fontSize: '12px' }}></i>
                            {t('contract_type_sale')}
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1px' }}>
                            {(() => {
                              // Default to 6600 for selling contracts if amount is 0, null, or undefined
                              const amount = pair.selling.amount;
                              const displayAmount = (amount && Number(amount) > 0) ? Number(amount) : 6600;
                              if (!amount || Number(amount) === 0) {
                                console.warn('Selling contract amount is 0 or missing, using default 6600:', { contractId: pair.selling.id, amount });
                              }
                              return displayAmount.toLocaleString();
                            })()} <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('dashboard.currency')}</span>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div style={{ 
                          width: '1px', 
                          height: '50px', 
                          background: 'rgba(255,255,255,0.2)' 
                        }}></div>
                        
                        {/* Rental Amount */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <i className="fas fa-motorcycle" style={{ fontSize: '12px' }}></i>
                            {t('contract_type_rental')}
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1px' }}>
                            {pair.rental ? (
                              <>{(() => {
                                // Default to 660 for rental contracts if amount is 0, null, or undefined
                                const amount = pair.rental.amount;
                                const displayAmount = (amount && Number(amount) > 0) ? Number(amount) : 660;
                                if (!amount || Number(amount) === 0) {
                                  console.warn('Rental contract amount is 0 or missing, using default 660:', { contractId: pair.rental.id, amount });
                                }
                                return displayAmount.toLocaleString();
                              })()} <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('dashboard.currency')}/{lang === 'ar' ? 'شهر' : 'mo'}</span></>
                            ) : (
                              <span style={{ fontSize: '16px', fontWeight: 400, opacity: 0.6 }}>—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Contract Cards Row */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1px',
                      background: '#e5e7eb'
                    }}>
                      {/* Selling Contract */}
                      <div style={{ 
                        padding: '20px',
                        background: '#fff'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          marginBottom: '16px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: pair.selling ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: pair.selling ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                          }}>
                            <i className="fas fa-handshake" style={{ 
                              color: pair.selling ? '#fff' : '#9ca3af', 
                              fontSize: '16px' 
                            }}></i>
                          </div>
                          <div>
                            <div style={{ 
                              fontWeight: 600, 
                              fontSize: '15px',
                              color: '#1f2937'
                            }}>
                              {t('contract_type_sale')}
                            </div>
                            {pair.selling && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                marginTop: '4px',
                                background: getStatusStyle(pair.selling.status).bg,
                                color: getStatusStyle(pair.selling.status).color
                              }}>
                                {lang === 'ar' ? (pair.selling.status_ar || pair.selling.status) : (pair.selling.status || pair.selling.status_ar)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {pair.selling ? (
                          <div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              color: pair.selling.contract_signed ? '#10b981' : '#ef4444',
                              fontSize: '13px',
                              marginBottom: '12px'
                            }}>
                              <i className={`fas ${pair.selling.contract_signed ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                              <span>{pair.selling.contract_signed ? t('dashboard.contract.signed') : t('dashboard.contract.not_signed')}</span>
                            </div>
                            
                            {pair.selling.contract_signed && (pair.selling.contract_download_url || pair.selling.id) && (
                              <button
                                onClick={() => handleDownloadContract(pair.selling)}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  background: '#f3f4f6',
                                  color: '#374151',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#e5e7eb';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6';
                                }}
                              >
                                <i className="fas fa-download"></i> {t('download')}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ 
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#9ca3af',
                            fontSize: '13px'
                          }}>
                            {t('dashboard.not_created_yet')}
                          </div>
                        )}
                      </div>
                      
                      {/* Rental Contract */}
                      <div style={{ 
                        padding: '20px',
                        background: '#fff'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          marginBottom: '16px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: pair.rental ? 'linear-gradient(135deg, #10b981, #059669)' : '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: pair.rental ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
                          }}>
                            <i className="fas fa-motorcycle" style={{ 
                              color: pair.rental ? '#fff' : '#9ca3af', 
                              fontSize: '16px' 
                            }}></i>
                          </div>
                          <div>
                            <div style={{ 
                              fontWeight: 600, 
                              fontSize: '15px',
                              color: '#1f2937'
                            }}>
                              {t('contract_type_rental')}
                            </div>
                            {pair.rental && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                marginTop: '4px',
                                background: getStatusStyle(pair.rental.status).bg,
                                color: getStatusStyle(pair.rental.status).color
                              }}>
                                {lang === 'ar' ? (pair.rental.status_ar || pair.rental.status) : (pair.rental.status || pair.rental.status_ar)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {pair.rental ? (
                          <div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              color: pair.rental.contract_signed ? '#10b981' : '#ef4444',
                              fontSize: '13px',
                              marginBottom: '12px'
                            }}>
                              <i className={`fas ${pair.rental.contract_signed ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                              <span>{pair.rental.contract_signed ? t('dashboard.contract.signed') : t('dashboard.contract.not_signed')}</span>
                            </div>
                            
                            {pair.rental.contract_signed && (pair.rental.contract_download_url || pair.rental.id) && (
                              <button
                                onClick={() => handleDownloadContract(pair.rental)}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  background: '#f3f4f6',
                                  color: '#374151',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#e5e7eb';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6';
                                }}
                              >
                                <i className="fas fa-download"></i> {t('download')}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ 
                            padding: '16px',
                            background: '#fef3c7',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#92400e',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}>
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
        </section>
      </main>

      {/* Contract Form Modal */}
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
                  refreshContracts(0, true);
                }, 1000);
              }}
            />
          </div>
        </div>
      )}

      {/* Profile Completion Modal - MUST show when profile has missing fields */}
      {showProfileCompletion && profile && (
        <ProfileCompletionModal
          userProfile={profile}
          onComplete={handleProfileCompleted}
        />
      )}

      {/* Orphan Selling Warning Modal */}
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
                <button 
                  onClick={() => setShowOrphanModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#666',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleCreateRentalForOrphan}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#073491',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-motorcycle"></i>
                  {t('dashboard.error.create_rental_now')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
