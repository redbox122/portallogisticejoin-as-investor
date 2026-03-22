import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../config';

const ContractForm = ({ onSuccess, onCancel, userProfile, startWithRental = false, onContractsCreated }) => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders, user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nafathLoading, setNafathLoading] = useState(false);
  const [nafathCode, setNafathCode] = useState(null);
  const [nafathStatus, setNafathStatus] = useState(null);
  const [errors, setErrors] = useState({});
  // If startWithRental is true, skip selling step and go directly to rental
  const [step, setStep] = useState(startWithRental ? 'review_rental' : 'confirm');
  const [currentContractType, setCurrentContractType] = useState(startWithRental ? 'rental' : 'selling');
  const [sellingContractCreated, setSellingContractCreated] = useState(startWithRental); // If starting with rental, treat selling as already done
  const [rentalContractCreated, setRentalContractCreated] = useState(false);
  const [sellingPdfUrl, setSellingPdfUrl] = useState(null);
  const [rentalPdfUrl, setRentalPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState({ selling: false, rental: false });
  const [currentProfile, setCurrentProfile] = useState(userProfile);
  const [signedSellingContractUrl, setSignedSellingContractUrl] = useState(null);
  const [showSignedContract, setShowSignedContract] = useState(false);
  const [registeringContract, setRegisteringContract] = useState(null); // Track which contract type is being registered to prevent duplicates
  const pollingIntervalRef = React.useRef(null); // Track polling interval to prevent duplicates
  const processingApprovalRef = React.useRef(false); // Track if approval is being processed to prevent duplicates
  const registeringContractRef = React.useRef(null); // Track registration synchronously to prevent duplicates

  // Helper function to fetch current user profile (ensures we use correct authenticated user)
  const fetchCurrentProfile = async () => {
    try {
      const headers = getAuthHeaders();
      const profileResponse = await axios.get(
        `${API_BASE_URL}/portallogistice/profile`,
        { headers }
      );
      
      if (profileResponse.data && profileResponse.data.success) {
        const profile = profileResponse.data.data.user || profileResponse.data.data;
        setCurrentProfile(profile);
        return profile;
      }
    } catch (error) {
      console.error('Error fetching current profile:', error);
    }
    // Fallback to provided userProfile
    return currentProfile || userProfile;
  };

  // Helper function to check if unlinked selling contract exists
  const checkUnlinkedSellingContract = async () => {
    try {
      const headers = getAuthHeaders();
      // Add cache-busting headers
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      
      // Add timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const contractsResponse = await axios.get(
        `${API_BASE_URL}/portallogistice/contracts?_t=${timestamp}`,
        { headers }
      );
      
      if (contractsResponse.data?.success) {
        const contracts = contractsResponse.data.data?.contracts || contractsResponse.data.data || [];
        // Find selling contract without linked rental
        const unlinkedSelling = contracts.find(c => 
          c.contract_type === 'selling' && !c.linked_contract && !c.linked_rental_contract_id
        );
        return !!unlinkedSelling;
      }
      return false;
    } catch (error) {
      console.error('Error checking for unlinked selling contract:', error);
      return false;
    }
  };

  // Fetch contract PDF
  const fetchContractPdf = async (contractType) => {
    const pdfKey = contractType === 'selling' ? 'selling' : 'rental';
    setLoadingPdf(prev => ({ ...prev, [pdfKey]: true }));
    
    try {
      const formData = new FormData();
      formData.append('contract_type', contractType);
      
      const headers = getAuthHeaders();
      headers['X-LANG'] = i18n.language;
      
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/contract-pdf?pdf=1`,
        formData,
        { 
          headers,
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      if (contractType === 'selling') {
        setSellingPdfUrl(url);
      } else {
        setRentalPdfUrl(url);
      }
    } catch (error) {
      console.error('Error fetching contract PDF:', error);
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: t('dashboard.error.pdf_load_failed'),
        type: 'warning',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    } finally {
      const finalPdfKey = contractType === 'selling' ? 'selling' : 'rental';
      setLoadingPdf(prev => ({ ...prev, [finalPdfKey]: false }));
    }
  };

  // Sync currentProfile when userProfile prop changes
  useEffect(() => {
    if (userProfile) {
      setCurrentProfile(userProfile);
    }
  }, [userProfile]);

  // Validate that selling contract exists when starting with rental
  useEffect(() => {
    if (startWithRental && step === 'review_rental') {
      const validateSellingContract = async () => {
        const hasUnlinkedSelling = await checkUnlinkedSellingContract();
        if (!hasUnlinkedSelling) {
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.error.selling_required_first'),
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          // Reset to selling step
          setStep('confirm');
          setCurrentContractType('selling');
          setSellingContractCreated(false);
        }
      };
      validateSellingContract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWithRental, step]);

  // Load selling contract PDF on mount (unless starting with rental)
  useEffect(() => {
    if (step === 'confirm' && !sellingPdfUrl && !loadingPdf.selling) {
      fetchContractPdf('selling');
    }
  }, [step]);

  // Load rental contract PDF when moving to rental step or starting with rental
  useEffect(() => {
    if ((step === 'nafath_rental' || step === 'review_rental') && !rentalPdfUrl && !loadingPdf.rental) {
      fetchContractPdf('rental');
    }
  }, [step]);

  // Cleanup PDF URLs on unmount
  useEffect(() => {
    return () => {
      if (sellingPdfUrl) URL.revokeObjectURL(sellingPdfUrl);
      if (rentalPdfUrl) URL.revokeObjectURL(rentalPdfUrl);
    };
  }, []);

  // Step 1: Initiate Nafath for a contract type
  const initiateNafath = async (contractType) => {
    // Validate contractType is provided and valid
    if (!contractType || (contractType !== 'selling' && contractType !== 'rental')) {
      console.error('initiateNafath: Invalid or missing contractType:', contractType);
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: 'Contract type is required and must be "selling" or "rental"',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return false;
    }

    // Fetch fresh profile to ensure we use correct user
    const profile = await fetchCurrentProfile();
    
    if (!profile?.national_id) {
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: t('dashboard.error.missing_national_id'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return false;
    }

    setNafathLoading(true);
    setNafathStatus('initiating');
    
    try {
      const headers = getAuthHeaders();
      
      // Log request payload for debugging
      const requestPayload = {
        national_id: profile.national_id,
        contract_type: contractType
      };
      
      // Comprehensive logging
      console.group('🚀 Nafath Initiate Request');
      console.log('📍 URL:', `${API_BASE_URL}/portallogistice/nafath/initiate`);
      console.log('📦 Request Payload:', requestPayload);
      console.log('👤 Profile Data:', {
        national_id: profile.national_id,
        email: profile.email,
        full_name: profile.full_name || `${profile.first_name} ${profile.family_name}`.trim()
      });
      console.log('📋 Contract Type:', contractType);
      console.log('🔑 Headers:', {
        'Content-Type': headers['Content-Type'],
        'Authorization': headers['Authorization'] ? 'Bearer ***' : 'Missing',
        'X-LANG': headers['X-LANG'] || 'Not set'
      });
      console.groupEnd();
      
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/nafath/initiate`,
        requestPayload,
        { headers }
      );
      
      // Log successful response
      console.group('✅ Nafath Initiate Response (Success)');
      console.log('📥 Response Status:', response.status);
      console.log('📄 Response Data:', response.data);
      console.log('🔍 Response Headers:', response.headers);
      console.groupEnd();

      // CRITICAL: Check for Nafath service errors first
      if (response.data.status === 'error' || response.data.code === '500-999-999') {
        const errorMessage = response.data.message || 'IssueWithNafathService';
        const externalError = response.data.external_response?.[0];
        
        console.error('❌ Nafath Service Error Detected:');
        console.error('   Status:', response.data.status);
        console.error('   Code:', response.data.code);
        console.error('   Message:', errorMessage);
        console.error('   External Response:', externalError);
        
        setNafathStatus('error');
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: errorMessage === 'IssueWithNafathService' 
            ? (i18n.language === 'ar' ? 'خطأ في خدمة نفاث. يرجى المحاولة مرة أخرى لاحقاً.' : 'Nafath service error. Please try again later.')
            : errorMessage,
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        return false;
      }

      // Handle already approved (identity was verified for selling contract)
      if (response.data.status === 'approved') {
        // CRITICAL: Verify Nafath approval before proceeding
        console.log('✅ Nafath already approved - verifying before registration...');
        const verified = await verifyNafathStatusBeforeRegistration(contractType, response.data.request_id);
        
        if (!verified) {
          console.error('❌ Nafath verification failed - NOT creating contract');
          setNafathStatus('error');
          return false;
        }
        
        setNafathStatus('approved');
        setNafathCode(null);
        // Only proceed if verification passed
        await registerContract(contractType);
        return true;
      }
      
      // Normal flow - Nafath request sent, need to wait for approval
      if (response.data.status === 'sent' && response.data.external_response?.[0]) {
        const nafathData = response.data.external_response[0];
        
        // Validate Nafath data is valid (not an error)
        // Check if error exists AND is not 'Success' (which is actually a success indicator)
        const hasError = nafathData.error && nafathData.error !== 'Success';
        if (hasError || nafathData.status === '500' || nafathData.status === 'error') {
          console.error('❌ Nafath response contains error:', nafathData);
          setNafathStatus('error');
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: nafathData.error || 'Nafath service error',
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          return false;
        }
        
        if (nafathData.random) {
          setNafathCode(nafathData.random);
        }
        setNafathStatus('waiting');
        
        // Store request_id for validation in polling
        const requestId = response.data.request_id;
        console.log('🔐 Stored Request ID for validation:', requestId);
        console.log('📝 Nafath Code:', nafathData.random);
        
        // Start polling with request_id to validate we're checking the right request
        pollNafathStatus(contractType, requestId);
        return true;
      }
      
      throw new Error(response.data.message || 'Failed to initiate Nafath');
    } catch (error) {
      // Comprehensive error logging
      console.group('❌ Nafath Initiate Error');
      console.error('🔴 Error Object:', error);
      console.error('📊 Error Name:', error.name);
      console.error('📝 Error Message:', error.message);
      console.error('🔢 Error Code:', error.code);
      
      if (error.response) {
        // Server responded with error status
        console.error('📥 Response Status:', error.response.status);
        console.error('📥 Response Status Text:', error.response.statusText);
        console.error('📄 Response Data:', error.response.data);
        console.error('📋 Response Headers:', error.response.headers);
        
        // CRITICAL: Check if this is a Nafath service error (backend returns 500 but with structured error response)
        const errorData = error.response.data;
        if (errorData && (errorData.status === 'error' || errorData.code === '500-999-999')) {
          const errorMessage = errorData.message || 'IssueWithNafathService';
          const externalError = errorData.external_response?.[0];
          
          console.error('❌ Nafath Service Error Detected in Catch Block:');
          console.error('   Status:', errorData.status);
          console.error('   Code:', errorData.code);
          console.error('   Message:', errorMessage);
          console.error('   External Response:', externalError);
          console.error('   Full Error Data:', JSON.stringify(errorData, null, 2));
          console.groupEnd();
          
          // Set loading to false BEFORE showing notification
          setNafathLoading(false);
          setNafathStatus('error');
          
          // Show user-friendly error message
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: errorMessage === 'IssueWithNafathService' 
              ? (i18n.language === 'ar' ? 'خطأ في خدمة نفاث. يرجى المحاولة مرة أخرى لاحقاً.' : 'Nafath service error. Please try again later.')
              : errorMessage,
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          
          // CRITICAL: Return early to prevent duplicate error handling
          return false;
        }
        
        // Log full response for 500 errors
        if (error.response.status === 500) {
          console.error('🔥 500 Internal Server Error Details:');
          console.error('   Full Error Response:', JSON.stringify(error.response.data, null, 2));
          if (error.response.data?.error || error.response.data?.exception) {
            console.error('   Exception:', error.response.data.error || error.response.data.exception);
          }
          if (error.response.data?.trace) {
            console.error('   Stack Trace:', error.response.data.trace);
          }
          if (error.response.data?.file) {
            console.error('   Error File:', error.response.data.file);
            console.error('   Error Line:', error.response.data.line);
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('⚠️ No Response Received');
        console.error('📤 Request:', error.request);
        console.error('🌐 Request URL:', error.config?.url);
        console.error('📦 Request Data:', error.config?.data);
      } else {
        // Error setting up request
        console.error('⚠️ Request Setup Error');
        console.error('📝 Error Message:', error.message);
        console.error('📋 Error Stack:', error.stack);
      }
      
      console.error('🔧 Request Config:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: error.config?.headers ? {
          ...error.config.headers,
          Authorization: error.config.headers.Authorization ? 'Bearer ***' : undefined
        } : undefined
      });
      console.groupEnd();
      
      // Extract detailed error message from backend
      let errorMessage = t('dashboard.error.nafath_initiate');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        // Laravel error format
        errorMessage = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : JSON.stringify(error.response.data.error);
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
        // Handle Laravel-style validation errors
        errorMessage = error.response.data.errors.map(err => err.message || err).join(', ');
      } else if (error.response?.status === 500) {
        errorMessage = error.response.data?.message || 'Internal server error. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setNafathStatus('error');
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return false;
    } finally {
      setNafathLoading(false);
    }
  };

  // Verification function: Double-check Nafath status before registering contract
  const verifyNafathStatusBeforeRegistration = async (contractType, requestId = null) => {
    // CRITICAL: Prevent duplicate verification calls if registration is already in progress
    if (registeringContractRef.current === contractType) {
      console.warn(`⚠️ verifyNafathStatusBeforeRegistration: Registration already in progress for ${contractType} - skipping verification`);
      return false; // Return false to prevent proceeding
    }
    
    try {
      console.group('🔍 Final Nafath Verification Before Registration');
      const headers = getAuthHeaders();
      const profile = currentProfile || userProfile;
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/portallogistice/nafath/checkStatus?national_id=${profile.national_id}&contract_type=${contractType}&_t=${timestamp}`;
      
      console.log('📍 Verification URL:', url);
      console.log('🔐 Expected Request ID:', requestId);
      
      const response = await axios.get(url, { headers });
      
      console.log('📥 Verification Response:', response.data);
      
      const status = response.data?.status || response.data?.data?.status;
      const responseRequestId = response.data?.request_id || response.data?.data?.request_id;
      
      if (!status) {
        console.error('❌ Verification failed: No status in response');
        console.groupEnd();
        return false;
      }
      
      const normalizedStatus = String(status).toLowerCase().trim();
      console.log('📊 Verification Status:', normalizedStatus);
      
      // Must be approved
      if (normalizedStatus !== 'approved') {
        console.error(`❌ Verification failed: Status is "${normalizedStatus}", expected "approved"`);
        console.groupEnd();
        return false;
      }
      
      // If status is approved, request_id mismatch is acceptable (user may have initiated new request)
      // Only log a warning, but don't fail verification
      if (requestId && responseRequestId && requestId !== responseRequestId) {
        console.warn('⚠️ Request ID mismatch (but status is approved, so accepting):');
        console.warn('   Expected:', requestId);
        console.warn('   Received:', responseRequestId);
        console.warn('   ⚠️ This may indicate a new Nafath request was initiated, but approval is still valid');
      }
      
      // Check for any error indicators
      if (response.data?.error || response.data?.status === 'error' || response.data?.code === '500-999-999') {
        console.error('❌ Verification failed: Error detected in response');
        console.error('   Error:', response.data.error || response.data.message);
        console.groupEnd();
        return false;
      }
      
      // Check external response if available
      const externalResponse = response.data?.external_response || response.data?.data?.external_response;
      if (externalResponse && Array.isArray(externalResponse) && externalResponse.length > 0) {
        const externalStatus = externalResponse[0]?.status;
        if (externalStatus && externalStatus.toLowerCase() !== 'approved') {
          console.error('❌ Verification failed: External API status is not approved');
          console.error('   External Status:', externalStatus);
          console.groupEnd();
          return false;
        }
        
        // Check for errors in external response
        if (externalResponse[0]?.error || externalResponse[0]?.status === '500') {
          console.error('❌ Verification failed: Error in external Nafath API response');
          console.error('   External Error:', externalResponse[0]?.error);
          console.groupEnd();
          return false;
        }
      }
      
      console.log('✅ Verification PASSED - Nafath is truly approved');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('❌ Verification failed with exception:', error);
      console.error('   Error Response:', error.response?.data);
      console.groupEnd();
      return false;
    }
  };

  // Step 2: Poll Nafath status - using GET with query params per API spec
  const pollNafathStatus = async (contractType, expectedRequestId = null) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max (60 * 2 seconds)
    const minApprovalWaitAttempts = 5; // Require at least 5 polling attempts (~10 seconds) before accepting approval
    const startTime = Date.now(); // Track when polling started
    
    // Validate contract_type is provided
    if (!contractType) {
      console.error('pollNafathStatus: contract_type is missing!');
      setNafathStatus('error');
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: 'Contract type is required',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return;
    }
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      console.warn('⚠️ Clearing existing polling interval before starting new one');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Reset approval processing flag
    processingApprovalRef.current = false;
    
    console.group('🔄 Starting Nafath Status Polling');
    console.log('📋 Contract Type:', contractType);
    console.log('🔐 Expected Request ID:', expectedRequestId || 'Not provided - will accept any approved status');
    console.log('⏱️ Minimum wait time:', minApprovalWaitAttempts * 2, 'seconds before accepting approval');
    console.log('⏱️ Maximum polling time:', maxAttempts * 2, 'seconds');
    console.log('🕐 Polling started at:', new Date(startTime).toISOString());
    console.groupEnd();
    
    const pollInterval = setInterval(async () => {
      attempts++;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      try {
        const headers = getAuthHeaders();
        // Add cache-busting headers and timestamp
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
        
        // Use current profile (from state or fetch fresh)
        const profile = currentProfile || userProfile;
        const timestamp = new Date().getTime();
        const url = `${API_BASE_URL}/portallogistice/nafath/checkStatus?national_id=${profile.national_id}&contract_type=${contractType}&_t=${timestamp}`;
        
        console.log(`🔄 pollNafathStatus: Attempt ${attempts}/${maxAttempts} (${elapsedSeconds}s elapsed):`, {
          national_id: profile.national_id,
          contract_type: contractType,
          url
        });
        
        // GET request with query params per API spec
        const response = await axios.get(url, { headers });
        
        // Log the full response for debugging
        console.log(`📥 pollNafathStatus: API Response (attempt ${attempts}):`, {
          fullResponse: response,
          responseData: response.data,
          status: response.data?.status,
          statusType: typeof response.data?.status,
          statusValue: response.data?.status,
          elapsedSeconds: elapsedSeconds
        });

        // CRITICAL: Check for errors first
        if (response.data?.status === 'error' || response.data?.code === '500-999-999' || response.data?.error) {
          console.error('❌ Nafath Status Check Error:');
          console.error('   Status:', response.data.status);
          console.error('   Code:', response.data.code);
          console.error('   Error:', response.data.error || response.data.message);
          
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setNafathStatus('error');
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: response.data.message || response.data.error || 'Nafath service error',
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          return;
        }

        // Handle nested response structure if needed
        const status = response.data?.status || response.data?.data?.status;
        
        if (!status) {
          console.error('pollNafathStatus: No status found in response:', response.data);
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            pollingIntervalRef.current = null;
            setNafathStatus('error');
          }
          return;
        }
        
        // Normalize status (case-insensitive and trimmed)
        const normalizedStatus = String(status).toLowerCase().trim();
        console.log(`📊 pollNafathStatus: Status received: "${normalizedStatus}" (attempt ${attempts}, ${elapsedSeconds}s elapsed)`);

        // CRITICAL: Check for error statuses
        if (normalizedStatus === 'error' || normalizedStatus === 'failed' || normalizedStatus === '500') {
          console.error('❌ Nafath status check returned error status:', normalizedStatus);
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setNafathStatus('error');
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: response.data.message || 'Nafath verification failed',
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          return;
        }

        if (normalizedStatus === 'approved') {
          // CRITICAL: Prevent duplicate approval processing
          if (processingApprovalRef.current) {
            console.warn('⚠️ Approval already being processed - ignoring duplicate detection');
            return;
          }
          
          // SAFEGUARD: Don't accept approval too quickly - user needs time to approve in Nafath app
          if (attempts < minApprovalWaitAttempts) {
            console.warn(`⚠️ APPROVAL REJECTED - Too early! Attempt ${attempts}/${minApprovalWaitAttempts}, ${elapsedSeconds}s elapsed`);
            console.warn('⚠️ User needs at least', minApprovalWaitAttempts * 2, 'seconds to approve in Nafath app');
            console.warn('⚠️ This might be a backend bug - returning approval too quickly');
            // Continue polling - don't accept yet
            return;
          }
          
          // CRITICAL: Set flag IMMEDIATELY to prevent duplicate processing
          processingApprovalRef.current = true;
          
          // Verify this is a real approval by checking response structure
          const hasApprovalTimestamp = response.data?.approved_at || response.data?.approved_date || response.data?.timestamp;
          const hasRequestId = response.data?.request_id;
          
          console.group('✅ Nafath Approval Detected');
          console.log('📋 Status:', normalizedStatus);
          console.log('⏱️ Attempt:', attempts);
          console.log('⏱️ Elapsed time:', elapsedSeconds, 'seconds');
          console.log('🕐 Approval timestamp in response:', hasApprovalTimestamp ? 'Yes' : 'No');
          console.log('🆔 Request ID in response:', hasRequestId ? response.data.request_id : 'No');
          console.log('📄 Full response data:', response.data);
          console.groupEnd();
          
          // Additional validation: if we have external_response, check if it shows approved
          if (response.data?.external_response && Array.isArray(response.data.external_response)) {
            const externalData = response.data.external_response[0];
            const externalStatus = externalData?.status;
            const externalError = externalData?.error;
            const externalCode = externalData?.code;
            
            console.group('🌐 External Nafath API Response Check');
            console.log('   External Status:', externalStatus);
            console.log('   External Error:', externalError);
            console.log('   External Code:', externalCode);
            console.log('   Full External Data:', externalData);
            console.groupEnd();
            
            // Check for errors in external response
            if (externalError || externalCode === '500-999-999' || externalStatus === '500' || externalStatus === 'error') {
              console.error('❌ APPROVAL REJECTED - External API has error!');
              console.error('   External Error:', externalError);
              console.error('   External Code:', externalCode);
              console.error('   External Status:', externalStatus);
              processingApprovalRef.current = false; // Reset flag on error
              return; // Don't accept approval if external API has errors - continue polling
            }
            
            if (externalStatus && externalStatus.toLowerCase() !== 'approved') {
              console.warn('⚠️ APPROVAL REJECTED: Backend says "approved" but external API status is:', externalStatus);
              console.warn('⚠️ This appears to be a backend bug - continuing to poll...');
              processingApprovalRef.current = false; // Reset flag on rejection
              return; // Don't accept approval if external API says otherwise - continue polling
            }
          }
          
          // CRITICAL: Clear interval NOW - all validations passed
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          
          // CRITICAL: Final verification before registering contract
          console.log('✅ pollNafathStatus: Status is approved! Performing final verification...');
          const responseRequestId = response.data?.request_id || response.data?.data?.request_id;
          const verified = await verifyNafathStatusBeforeRegistration(contractType, expectedRequestId || responseRequestId);
          
          if (!verified) {
            console.error('❌ Final verification FAILED - NOT creating contract');
            processingApprovalRef.current = false; // Reset flag on failure
            setNafathStatus('error');
            Store.addNotification({
              title: t('dashboard.error.title'),
              message: i18n.language === 'ar' 
                ? 'فشل التحقق النهائي من نفاث. لا يمكن إنشاء العقد.'
                : 'Final Nafath verification failed. Cannot create contract.',
              type: 'danger',
              insert: 'top',
              container: 'top-right',
              dismiss: { duration: 5000, onScreen: true }
            });
            return;
          }
          
          console.log('✅ Final verification PASSED - Proceeding to register contract');
          setNafathStatus('approved');
          setNafathCode(null);
          // Only proceed if verification passed
          await registerContract(contractType);
          // Note: Don't reset processingApprovalRef here - let it stay true to prevent any race conditions
        } else if (normalizedStatus === 'not_found') {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setNafathStatus('error');
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.error.nafath_not_found'),
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
        } else if (normalizedStatus === 'pending' || normalizedStatus === 'waiting' || normalizedStatus === 'sent') {
          // Still waiting - continue polling
          console.log(`⏳ Status: ${normalizedStatus} - Continuing to poll... (attempt ${attempts})`);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setNafathStatus('error');
          console.error('⏰ Polling timeout after', maxAttempts, 'attempts');
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.error.nafath_timeout'),
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
        } else {
          // Unknown status - log it
          console.warn('⚠️ Unknown status received:', normalizedStatus);
        }
      } catch (error) {
        console.error('❌ Nafath polling error (attempt', attempts, '):', error);
        console.error('   Error Response:', error.response?.data);
        console.error('   Error Status:', error.response?.status);
        
        if (error.response?.status === 404 || attempts >= maxAttempts) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setNafathStatus('error');
        }
      }
    }, 2000); // Poll every 2 seconds
    
    // Store interval reference
    pollingIntervalRef.current = pollInterval;
  };

  // Step 3: Register contract
  const registerContract = async (contractType) => {
    // CRITICAL: Prevent duplicate registration calls using ref (synchronous check)
    if (registeringContractRef.current === contractType) {
      console.warn(`⚠️ registerContract: Already registering ${contractType} contract - ignoring duplicate call`);
      return;
    }
    
    // Also check state (backup check)
    if (registeringContract === contractType) {
      console.warn(`⚠️ registerContract: Already registering ${contractType} contract (state check) - ignoring duplicate call`);
      return;
    }
    
    // Check if contract already created
    if ((contractType === 'selling' && sellingContractCreated) || 
        (contractType === 'rental' && rentalContractCreated)) {
      console.warn(`⚠️ registerContract: ${contractType} contract already created - skipping`);
      return;
    }
    
    // PROACTIVE VALIDATION: Check for unlinked selling contract before creating rental
    if (contractType === 'rental') {
      const hasUnlinkedSelling = await checkUnlinkedSellingContract();
      if (!hasUnlinkedSelling) {
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.selling_required_first'),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        // Reset to selling step
        setStep('confirm');
        setCurrentContractType('selling');
        setNafathStatus(null);
        return;
      }
    }
    
    // CRITICAL: Set ref IMMEDIATELY (synchronously) to prevent duplicates
    // This must happen BEFORE any async operations
    registeringContractRef.current = contractType;
    setRegisteringContract(contractType);
    
    // CRITICAL LAST CHECK: Verify Nafath is truly approved before registering
    console.group('🛡️ Final Pre-Registration Nafath Check');
    const profile = currentProfile || userProfile;
    try {
      const headers = getAuthHeaders();
      const timestamp = new Date().getTime();
      const verificationUrl = `${API_BASE_URL}/portallogistice/nafath/checkStatus?national_id=${profile.national_id}&contract_type=${contractType}&_t=${timestamp}`;
      
      console.log('📍 Final verification URL:', verificationUrl);
      const finalCheck = await axios.get(verificationUrl, { headers });
      const finalStatus = finalCheck.data?.status || finalCheck.data?.data?.status;
      const normalizedFinalStatus = finalStatus ? String(finalStatus).toLowerCase().trim() : null;
      
      console.log('📊 Final Status Check:', normalizedFinalStatus);
      
      if (!normalizedFinalStatus || normalizedFinalStatus !== 'approved') {
        console.error('❌ FINAL CHECK FAILED: Nafath status is not approved');
        console.error('   Status:', normalizedFinalStatus);
        console.error('   Response:', finalCheck.data);
        console.groupEnd();
        
        setNafathStatus('error');
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: i18n.language === 'ar'
            ? 'فشل التحقق الأخير من نفاث. لا يمكن إنشاء العقد.'
            : 'Final Nafath verification failed. Cannot create contract.',
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        return; // DO NOT PROCEED
      }
      
      // Check for errors
      if (finalCheck.data?.error || finalCheck.data?.code === '500-999-999' || finalCheck.data?.status === 'error') {
        console.error('❌ FINAL CHECK FAILED: Error detected in Nafath status');
        console.error('   Error:', finalCheck.data.error || finalCheck.data.message);
        console.groupEnd();
        
        setNafathStatus('error');
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: finalCheck.data.message || finalCheck.data.error || 'Nafath verification error',
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        return; // DO NOT PROCEED
      }
      
      console.log('✅ Final check PASSED - Nafath is approved, proceeding with registration');
      console.groupEnd();
    } catch (error) {
      console.error('❌ FINAL CHECK FAILED: Exception during verification');
      console.error('   Error:', error);
      console.groupEnd();
      
      setNafathStatus('error');
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: i18n.language === 'ar'
          ? 'فشل التحقق الأخير من نفاث. لا يمكن إنشاء العقد.'
          : 'Final Nafath verification failed. Cannot create contract.',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return; // DO NOT PROCEED
    }
    
    // Note: registeringContractRef and setRegisteringContract already set above (line 791-792)
    setLoading(true);
    
    console.group(`📝 Registering ${contractType} Contract`);
    console.log('⏱️ Started at:', new Date().toISOString());
    
    try {
      const headers = getAuthHeaders();

      // CRITICAL: Fetch fresh user profile to ensure we use the correct authenticated user's data
      // This prevents contracts from being saved with wrong user credentials
      const currentUserProfile = await fetchCurrentProfile();
      
      // Validate we have required fields
      if (!currentUserProfile?.national_id) {
        throw new Error('User national_id is missing');
      }

      console.log('👤 Registering contract with user data:', {
        national_id: currentUserProfile.national_id,
        email: currentUserProfile.email,
        contract_type: contractType
      });

      // Send ALL required user fields to ensure contract is created with correct user data
      const registrationData = {
        first_name: currentUserProfile.first_name,
        family_name: currentUserProfile.family_name,
        father_name: currentUserProfile.father_name,
        grandfather_name: currentUserProfile.grandfather_name,
        national_id: currentUserProfile.national_id,
        birth_date: currentUserProfile.birth_date,
        region: currentUserProfile.region,
        national_address_email: currentUserProfile.national_address_email,
        bank_name: currentUserProfile.bank_name,
        iban: currentUserProfile.iban,
        email: currentUserProfile.email,
        phone: currentUserProfile.phone || currentUserProfile.phone_number,
        contract_type: contractType
        // amount is now optional - backend uses prices from settings automatically
      };

      console.log('📦 Registration payload:', registrationData);
      
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/register`,
        registrationData,
        { headers }
      );

      console.log('✅ Registration response:', response.data);
      console.groupEnd();

      if (response.data.success) {
        // CRITICAL: Clear ref after successful registration
        registeringContractRef.current = null;
        setRegisteringContract(null);
        
        if (contractType === 'selling') {
          setSellingContractCreated(true);
          // Store the signed contract URL if available
          if (response.data.data?.contract_download_url) {
            setSignedSellingContractUrl(response.data.data.contract_download_url);
          } else if (response.data.data?.tracking_id && currentUserProfile?.national_id) {
            // Build download URL if not provided
            const downloadUrl = `${API_BASE_URL}/portallogistice/download-contract/${response.data.data.tracking_id}?national_id=${currentUserProfile.national_id}`;
            setSignedSellingContractUrl(downloadUrl);
          }
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: t('dashboard.success.selling_contract_created'),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 3000, onScreen: true }
          });
          // Move to transition step - don't go directly to rental
          setStep('transition_to_rental');
          setCurrentContractType('rental');
          setNafathStatus(null);
        } else {
          setRentalContractCreated(true);
          Store.addNotification({
            title: t('dashboard.success.title'),
            message: t('dashboard.success.rental_contract_created'),
            type: 'success',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 3000, onScreen: true }
          });
          // Both contracts created
          setStep('success');
          // Automatically refresh contracts list in background
          // The polling mechanism will handle waiting for the contract to appear
          if (onContractsCreated) {
            // Small delay to let backend start processing, then polling will take over
            setTimeout(() => {
              onContractsCreated();
            }, 500); // Reduced delay since polling will handle the waiting
          }
        }
      } else {
        // Handle specific business rule errors
        const errorCode = response.data.errors?.[0]?.code;
        
        if (errorCode === 'selling_required_first') {
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.error.selling_required_first'),
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          // Reset to selling step
          setStep('confirm');
          setCurrentContractType('selling');
          setNafathStatus(null);
          return;
        }
        
        if (errorCode === 'rental_required_for_previous') {
          const pendingId = response.data.errors[0].pending_selling_contract_id;
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: `${t('dashboard.error.rental_required_for_previous')} #${pendingId}`,
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 7000, onScreen: true }
          });
          // Jump to rental step
          setStep('review_rental');
          setCurrentContractType('rental');
          setNafathStatus(null);
          return;
        }
        
        if (errorCode === 'contract_limit_reached') {
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.error.contract_limit_reached'),
            type: 'warning',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000, onScreen: true }
          });
          return;
        }
        
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('   Error Response:', error.response?.data);
      console.error('   Error Status:', error.response?.status);
      console.groupEnd();
      
      // Handle specific business rule errors from API response
      const errorCode = error.response?.data?.errors?.[0]?.code;
      
      if (errorCode === 'selling_required_first') {
        registeringContractRef.current = null;
        setRegisteringContract(null);
        setNafathStatus(null);
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.selling_required_first'),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        // Reset to selling step
        setStep('confirm');
        setCurrentContractType('selling');
        setLoading(false);
        return;
      }
      
      if (errorCode === 'rental_required_for_previous') {
        const pendingId = error.response?.data?.errors?.[0]?.pending_selling_contract_id;
        registeringContractRef.current = null;
        setRegisteringContract(null);
        setNafathStatus(null);
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: `${t('dashboard.error.rental_required_for_previous')} #${pendingId}`,
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 7000, onScreen: true }
        });
        // Jump to rental step
        setStep('review_rental');
        setCurrentContractType('rental');
        setLoading(false);
        return;
      }
      
      if (errorCode === 'contract_limit_reached') {
        registeringContractRef.current = null;
        setRegisteringContract(null);
        setNafathStatus(null);
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: t('dashboard.error.contract_limit_reached'),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000, onScreen: true }
        });
        setLoading(false);
        return;
      }
      
      // CRITICAL: Clear ref on error (but only if it's not a 409 - contract already exists)
      if (error.response?.status !== 409) {
        registeringContractRef.current = null;
        setRegisteringContract(null);
      } else {
        // For 409, contract already exists - mark as created and clear ref
        if (contractType === 'selling') {
          setSellingContractCreated(true);
        } else {
          setRentalContractCreated(true);
        }
        registeringContractRef.current = null;
        setRegisteringContract(null);
      }
      
      setNafathStatus('error');
      
      // Try to translate backend message if it looks like a translation key
      let errorMessage = error.response?.data?.message || error.message || t('dashboard.error.create_contract');
      // Check if the message looks like a translation key (contains dots and starts with common namespace)
      if (errorMessage && typeof errorMessage === 'string' && (errorMessage.includes('dashboard.') || errorMessage.includes('common.'))) {
        // Try to translate it, fallback to original if translation fails
        const translated = t(errorMessage, { defaultValue: errorMessage });
        errorMessage = translated;
      }
      
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    } finally {
      setLoading(false);
      setRegisteringContract(null);
      // Note: Don't clear registeringContractRef here - let it stay until success/error to prevent race conditions
    }
  };

  const handleConfirm = async () => {
    // Start with selling contract
    setStep('nafath_selling');
    setCurrentContractType('selling');
    await initiateNafath('selling');
  };

  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';

  // Success step
  if (step === 'success') {
    return (
      <div className={`contract-form-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="success-message">
          <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '20px' }}></i>
          <h3>{t('dashboard.success.both_contracts_created')}</h3>
          <p>{t('dashboard.success.contracts_created_message')}</p>
          <button
            className="primary-btn"
            onClick={() => {
              onSuccess();
            }}
            style={{ marginTop: '20px' }}
          >
            {t('close')}
          </button>
        </div>
      </div>
    );
  }

  // Transition to rental step - show message before proceeding to rental contract
  if (step === 'transition_to_rental') {
    return (
      <div className={`contract-form-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="transition-message" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '20px' }}></i>
          <h3 style={{ color: '#073491', marginBottom: '15px' }}>{t('dashboard.selling_contract_completed')}</h3>
          <p style={{ color: '#6f6f6f', marginBottom: '25px', fontSize: '16px' }}>
            {t('dashboard.proceeding_to_rental')}
          </p>
          
          {/* Show signed contract button if available */}
          {signedSellingContractUrl && (
            <div style={{ marginBottom: '20px' }}>
              <button
                className="secondary-btn"
                onClick={() => setShowSignedContract(true)}
                style={{ 
                  padding: '10px 30px', 
                  fontSize: '14px',
                  background: 'transparent',
                  border: '2px solid #073491',
                  color: '#073491',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                <i className="fas fa-file-pdf" style={{ marginRight: '8px' }}></i>
                {t('dashboard.view_signed_contract')}
              </button>
            </div>
          )}
          
          <div style={{ background: '#f0f4ff', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
            <i className="fas fa-file-contract" style={{ fontSize: '32px', color: '#073491', marginBottom: '10px' }}></i>
            <p style={{ color: '#073491', fontWeight: 600, margin: 0 }}>
              {t('dashboard.rental_contract_next')}
            </p>
          </div>
          <button
            className="primary-btn"
            onClick={async () => {
              // CRITICAL: Ensure we have fresh user profile before proceeding to rental
              await fetchCurrentProfile();
              setStep('review_rental');
              // Fetch rental PDF if not already loaded
              if (!rentalPdfUrl && !loadingPdf.rental) {
                fetchContractPdf('rental');
              }
            }}
            style={{ padding: '12px 40px', fontSize: '16px' }}
          >
            {t('dashboard.proceed_to_rental')}
          </button>
        </div>
      </div>
    );
  }

  // Review rental contract step - show PDF and button to start verification
  if (step === 'review_rental') {
    return (
      <div className={`contract-form-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="contract-pdf-preview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <h4 style={{ color: '#073491', fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {t('dashboard.contract_preview')}: {t('contract_type_rental')}
            </h4>
            {rentalPdfUrl && (
              <a
                href={rentalPdfUrl}
                download="rental-contract.pdf"
                className="pdf-download-link"
                style={{
                  fontSize: '14px',
                  color: '#073491',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  border: '1px solid #073491',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#073491';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#073491';
                }}
              >
                <i className="fas fa-download"></i>
                {t('download')}
              </a>
            )}
          </div>
          {loadingPdf.rental ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Watch height="50" width="50" color="#073491" ariaLabel="loading-pdf" />
              <p style={{ marginTop: '15px', color: '#6f6f6f' }}>{t('dashboard.loading_pdf')}</p>
            </div>
          ) : rentalPdfUrl ? (
            <div className="pdf-viewer-container">
              <iframe
                src={rentalPdfUrl}
                width="100%"
                style={{ border: 'none', borderRadius: '8px' }}
                title="Rental Contract PDF"
              />
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6f6f6f' }}>
              {t('dashboard.error.pdf_not_available')}
            </div>
          )}
        </div>

        <div className="confirmation-section" style={{ marginTop: '20px' }}>
          <p className="confirmation-text">{t('dashboard.confirm_rental_contract')}</p>
          <p style={{ fontSize: '14px', color: '#6f6f6f', marginTop: '10px', textAlign: 'center' }}>
            {t('dashboard.read_contracts_before_signing')}
          </p>
        </div>

        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button 
            type="button" 
            className="submit-button primary-btn" 
            onClick={async () => {
              // CRITICAL: Ensure we have fresh user profile before starting rental Nafath
              await fetchCurrentProfile();
              setStep('nafath_rental');
              await initiateNafath('rental');
            }} 
            disabled={loading || nafathLoading || loadingPdf.rental}
          >
            {loading || nafathLoading ? (
              <>
                <Watch height="20" width="20" color="#fff" ariaLabel="loading" />
                {t('dashboard.form.submitting')}
              </>
            ) : (
              t('dashboard.start_verification')
            )}
          </button>
        </div>
      </div>
    );
  }

  // Nafath waiting steps
  if (step === 'nafath_selling' || step === 'nafath_rental') {
    const contractTypeLabel = currentContractType === 'selling' 
      ? t('contract_type_sale') 
      : t('contract_type_rental');
    
    const pdfUrl = currentContractType === 'selling' ? sellingPdfUrl : rentalPdfUrl;
    const pdfLoading = currentContractType === 'selling' ? loadingPdf.selling : loadingPdf.rental;
    
    return (
      <div className={`contract-form-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Show contract PDF preview */}
        {pdfUrl && (
          <div className="contract-pdf-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ color: '#073491', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {t('dashboard.contract_preview')}: {contractTypeLabel}
              </h4>
              <a
                href={pdfUrl}
                download={`${contractTypeLabel}-contract.pdf`}
                className="pdf-download-link"
                style={{
                  fontSize: '14px',
                  color: '#073491',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  border: '1px solid #073491',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#073491';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#073491';
                }}
              >
                <i className="fas fa-download"></i>
                {t('download')}
              </a>
            </div>
            <div className="pdf-viewer-container">
              <iframe
                src={pdfUrl}
                width="100%"
                style={{ border: 'none', borderRadius: '8px' }}
                title={`${contractTypeLabel} PDF`}
              />
            </div>
          </div>
        )}
        
        {pdfLoading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Watch height="40" width="40" color="#073491" ariaLabel="loading-pdf" />
            <p style={{ marginTop: '10px', color: '#6f6f6f' }}>{t('dashboard.loading_pdf')}</p>
          </div>
        )}

        <div className="nafath-waiting">
          <Watch
            visible={nafathStatus === 'waiting'}
            height="80"
            width="80"
            radius="48"
            color="#073491"
            ariaLabel="nafath-loading"
          />
          <h3>{t('dashboard.nafath.waiting_title')}</h3>
          <p>{t('dashboard.nafath.waiting_message')}</p>
          <p style={{ fontWeight: 600, color: '#073491', marginTop: '15px' }}>
            {t('dashboard.nafath.contract_type')}: {contractTypeLabel}
          </p>
          
          {nafathCode && (
            <div className="nafath-code-display">
              <p style={{ fontSize: '14px', color: '#6f6f6f', marginBottom: '10px' }}>
                {t('dashboard.nafath.code_label')}
              </p>
              <div className="nafath-code-box">
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#073491', letterSpacing: '4px' }}>
                  {nafathCode}
                </span>
              </div>
            </div>
          )}

          {nafathStatus === 'waiting' && (
            <div className="nafath-status">
              <p className="status-text">{t('dashboard.nafath.status_waiting')}</p>
            </div>
          )}
          {nafathStatus === 'approved' && currentContractType === 'selling' && (
            <div className="nafath-status approved" style={{ 
              marginTop: '20px', 
              padding: '25px',
              background: '#d4edda',
              border: '2px solid #28a745',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '15px' }}></i>
                <p className="status-text" style={{ marginBottom: '10px', fontSize: '20px', fontWeight: 700, color: '#155724' }}>
                  {t('dashboard.nafath.status_approved')}
                </p>
                <p style={{ marginBottom: '0', color: '#155724', fontSize: '16px' }}>
                  {t('dashboard.nafath.selling_approved_message') || 'Selling contract verification approved. You can now view the contract or proceed to rental.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '25px' }}>
                <button
                  className="primary-btn"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Register the contract first if not already registered
                      if (!sellingContractCreated) {
                        const profile = await fetchCurrentProfile();
                        const headers = getAuthHeaders();
                        const registrationData = {
                          first_name: profile.first_name,
                          family_name: profile.family_name,
                          father_name: profile.father_name,
                          grandfather_name: profile.grandfather_name,
                          national_id: profile.national_id,
                          birth_date: profile.birth_date,
                          region: profile.region,
                          national_address_email: profile.national_address_email,
                          bank_name: profile.bank_name,
                          iban: profile.iban,
                          email: profile.email,
                          phone: profile.phone || profile.phone_number,
                          contract_type: 'selling',
                          amount: 6600
                        };
                        const response = await axios.post(
                          `${API_BASE_URL}/portallogistice/register`,
                          registrationData,
                          { headers }
                        );
                        if (response.data.success) {
                          setSellingContractCreated(true);
                          // Store the signed contract URL
                          if (response.data.data?.contract_download_url) {
                            setSignedSellingContractUrl(response.data.data.contract_download_url);
                          } else if (response.data.data?.tracking_id && profile?.national_id) {
                            const url = `${API_BASE_URL}/portallogistice/download-contract/${response.data.data.tracking_id}?national_id=${profile.national_id}`;
                            setSignedSellingContractUrl(url);
                          }
                        }
                      }
                      
                      // Show the signed contract
                      if (signedSellingContractUrl) {
                        setShowSignedContract(true);
                      } else {
                        // Fetch contracts to get the signed contract URL
                        const headers = getAuthHeaders();
                        // Add cache-busting headers
                        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                        headers['Pragma'] = 'no-cache';
                        headers['Expires'] = '0';
                        
                        // Add timestamp to ensure fresh data
                        const timestamp = new Date().getTime();
                        const contractsResponse = await axios.get(
                          `${API_BASE_URL}/portallogistice/contracts?_t=${timestamp}`,
                          { headers }
                        );
                        if (contractsResponse.data?.success) {
                          const contracts = contractsResponse.data.data.contracts || [];
                          const sellingContract = contracts.find(c => c.contract_type === 'selling' && c.contract_signed);
                          if (sellingContract?.contract_download_url) {
                            setSignedSellingContractUrl(sellingContract.contract_download_url);
                            setShowSignedContract(true);
                          } else if (sellingContract?.id && currentProfile?.national_id) {
                            const url = `${API_BASE_URL}/portallogistice/download-contract/${sellingContract.id}?national_id=${currentProfile.national_id}`;
                            setSignedSellingContractUrl(url);
                            setShowSignedContract(true);
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Error showing contract:', error);
                      Store.addNotification({
                        title: t('dashboard.error.title'),
                        message: error.response?.data?.message || error.message || t('dashboard.error.create_contract'),
                        type: 'danger',
                        insert: 'top',
                        container: 'top-right',
                        dismiss: { duration: 5000, onScreen: true }
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{ 
                    padding: '14px 28px',
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#073491',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#052a6e';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#073491';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <i className="fas fa-file-contract"></i>
                  {t('dashboard.show_contract') || 'Show Contract'}
                </button>
                <button
                  className="primary-btn"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Register the contract first if not already registered
                      if (!sellingContractCreated) {
                        const profile = await fetchCurrentProfile();
                        const headers = getAuthHeaders();
                        const registrationData = {
                          first_name: profile.first_name,
                          family_name: profile.family_name,
                          father_name: profile.father_name,
                          grandfather_name: profile.grandfather_name,
                          national_id: profile.national_id,
                          birth_date: profile.birth_date,
                          region: profile.region,
                          national_address_email: profile.national_address_email,
                          bank_name: profile.bank_name,
                          iban: profile.iban,
                          email: profile.email,
                          phone: profile.phone || profile.phone_number,
                          contract_type: 'selling',
                          amount: 6600
                        };
                        const response = await axios.post(
                          `${API_BASE_URL}/portallogistice/register`,
                          registrationData,
                          { headers }
                        );
                        if (response.data.success) {
                          setSellingContractCreated(true);
                          Store.addNotification({
                            title: t('dashboard.success.title'),
                            message: t('dashboard.success.selling_contract_created'),
                            type: 'success',
                            insert: 'top',
                            container: 'top-right',
                            dismiss: { duration: 3000, onScreen: true }
                          });
                        }
                      }
                      // Proceed to rental
                      setStep('review_rental');
                      setCurrentContractType('rental');
                      setNafathStatus(null);
                      // Fetch rental PDF if not already loaded
                      if (!rentalPdfUrl && !loadingPdf.rental) {
                        fetchContractPdf('rental');
                      }
                    } catch (error) {
                      console.error('Error proceeding to rental:', error);
                      Store.addNotification({
                        title: t('dashboard.error.title'),
                        message: error.response?.data?.message || error.message || t('dashboard.error.create_contract'),
                        type: 'danger',
                        insert: 'top',
                        container: 'top-right',
                        dismiss: { duration: 5000, onScreen: true }
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{ 
                    padding: '14px 28px',
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: loading ? '#6c757d' : '#28a745',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#218838';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#28a745';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <Watch height="20" width="20" color="#fff" ariaLabel="loading" />
                      {t('dashboard.form.submitting')}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-arrow-right"></i>
                      {t('dashboard.proceed_to_rental') || 'Proceed to Rental'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {nafathStatus === 'approved' && currentContractType === 'rental' && (
            <div className="nafath-status approved">
              <p className="status-text">{t('dashboard.nafath.status_approved')}</p>
            </div>
          )}
          {nafathStatus === 'error' && (
            <div className="nafath-status error">
              <p className="status-text">{t('dashboard.error.nafath_failed')}</p>
              <button
                className="primary-btn"
                onClick={() => {
                  setNafathStatus(null);
                  setNafathCode(null);
                  initiateNafath(currentContractType);
                }}
                style={{ marginTop: '10px' }}
              >
                {t('dashboard.nafath.retry')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Signed Contract Modal
  if (showSignedContract && signedSellingContractUrl) {
    return (
      <div className={`contract-form-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#073491', margin: 0 }}>{t('dashboard.signed_contract') || 'Signed Contract'}</h3>
          <button
            onClick={() => setShowSignedContract(false)}
            style={{
              background: 'transparent',
              border: '1px solid #073491',
              borderRadius: '4px',
              padding: '8px 16px',
              color: '#073491',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-times"></i> {t('close')}
          </button>
        </div>
        <div className="pdf-viewer-container" style={{ marginBottom: '20px' }}>
          <iframe
            src={signedSellingContractUrl}
            width="100%"
            height="600px"
            style={{ border: 'none', borderRadius: '8px' }}
            title="Signed Selling Contract PDF"
          />
        </div>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
          <button
            className="primary-btn"
            onClick={() => {
              setShowSignedContract(false);
              setStep('review_rental');
              setCurrentContractType('rental');
              setNafathStatus(null);
              if (!rentalPdfUrl && !loadingPdf.rental) {
                fetchContractPdf('rental');
              }
            }}
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-arrow-right"></i>
            {t('dashboard.proceed_to_rental') || 'Proceed to Rental'}
          </button>
        </div>
      </div>
    );
  }

  // Confirm step - Show user data and contract PDF preview
  return (
    <div className={`contract-form-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <h3>{t('dashboard.add_contract')}</h3>
      
      {/* Display user info (read-only) */}
      {userProfile && (
        <div className="user-info-display">
          <h4>{t('dashboard.your_info')}</h4>
          <div className="info-grid">
            <div><strong>{t('dashboard.profile.full_name')}:</strong> {userProfile.full_name || `${userProfile.first_name || ''} ${userProfile.family_name || ''}`.trim() || '-'}</div>
            <div><strong>{t('email')}:</strong> {userProfile.email || '-'}</div>
            <div><strong>{t('phone_number')}:</strong> {userProfile.phone || userProfile.phone_number || '-'}</div>
            <div><strong>{t('national_id')}:</strong> {userProfile.national_id || '-'}</div>
          </div>
        </div>
      )}

      {/* Show selling contract PDF preview */}
      <div className="contract-pdf-preview">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ color: '#073491', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            {t('dashboard.contract_preview')}: {t('contract_type_sale')}
          </h4>
          {sellingPdfUrl && (
            <a
              href={sellingPdfUrl}
              download="selling-contract.pdf"
              className="pdf-download-link"
              style={{
                fontSize: '14px',
                color: '#073491',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                border: '1px solid #073491',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#073491';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#073491';
              }}
            >
              <i className="fas fa-download"></i>
              {t('download')}
            </a>
          )}
        </div>
        {loadingPdf.selling ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Watch height="50" width="50" color="#073491" ariaLabel="loading-pdf" />
            <p style={{ marginTop: '15px', color: '#6f6f6f' }}>{t('dashboard.loading_pdf')}</p>
          </div>
        ) : sellingPdfUrl ? (
          <div className="pdf-viewer-container">
            <iframe
              src={sellingPdfUrl}
              width="100%"
              style={{ border: 'none', borderRadius: '8px' }}
              title="Selling Contract PDF"
            />
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6f6f6f' }}>
            {t('dashboard.error.pdf_not_available')}
          </div>
        )}
      </div>

      <div className="confirmation-section">
        <p className="confirmation-text">{t('dashboard.confirm_create_contracts')}</p>
        <p style={{ fontSize: '14px', color: '#6f6f6f', marginTop: '10px', textAlign: 'center' }}>
          {t('dashboard.read_contracts_before_signing')}
        </p>
      </div>

      <div className="form-actions">
        <button type="button" className="submit-button primary-btn" onClick={handleConfirm} disabled={loading || nafathLoading || loadingPdf.selling}>
          {loading || nafathLoading ? (
            <>
              <Watch height="20" width="20" color="#fff" ariaLabel="loading" />
              {t('dashboard.form.submitting')}
            </>
          ) : (
            t('dashboard.confirm')
          )}
        </button>
        <button type="button" className="cancel-button" onClick={onCancel} disabled={loading || nafathLoading}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
};

export default ContractForm;
