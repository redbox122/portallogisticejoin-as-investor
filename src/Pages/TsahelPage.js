import React, { useState, useEffect, useCallback } from 'react';
import Header from '../Utitlities/Header.js';
import ScrollToTop from '../Utitlities/ScrollToTop.js';
import PhoneInput from '../CustomComponents/PhoneInput.js';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Watch } from 'react-loader-spinner';
import axios from 'axios';
import { Store } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import { API_BASE_URL } from '../config';

const TsahelPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [nfathCode, setNfathCode] = useState(null);
  const [nafathSigned, setNafathSigned] = useState(false);
  const [showNafathPopup, setShowNafathPopup] = useState(false);
  const [nafathInterval, setNafathInterval] = useState(null);
  const [showContractPopup, setShowContractPopup] = useState(false);
  const [contractPdfUrl, setContractPdfUrl] = useState(null);
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [registrationResponse, setRegistrationResponse] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [autoInitiateOnStep2, setAutoInitiateOnStep2] = useState(false);

  const { t } = useTranslation(['common']);
  const location = useLocation();
  const [lang, setLang] = useState((new URLSearchParams(location.search)).get('lang') ?? 'ar');
  const [contractType, setContractType] = useState("1");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
      setIsMobile(true);
    } else {
      setIsMobile(false);
    }
  }, []);

  useEffect(() => {
    const lan = (new URLSearchParams(location.search)).get('lang');
    if (lan) setLang(lan);
  }, [location.search]);

  useEffect(() => {
    document.getElementsByTagName('html')[0].style.direction = lang == 'ar' ? 'rtl' : 'ltr';
    document.getElementsByTagName('title')[0].innerHTML = lang == 'ar' ? 'بوابة تساهيل' : 'Portal logistic';
  }, [lang]);

  const [formData, setFormData] = useState({
    first_name: "",
    father_name: "",
    grandfather_name: "",
    family_name: "",
    national_id: "",
    birth_date: "",
    phone: "",
    email: "",
    national_address_email: "",
    bank_name: "",
    iban: "",
    region: "",
    amount: "",
    type: 1,
  });

  const [isAgreed, setIsAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormDataValue(name, value);
  };

  const setFormDataValue = (name, value) => {
    if (name === 'iban') {
      // Remove "SA" if user typed it, then ensure it's always prefixed
      let cleanValue = value.replace(/^SA/i, '').toUpperCase();
      // Remove any non-alphanumeric characters except what's already there
      cleanValue = cleanValue.replace(/[^A-Z0-9]/g, '');
      setFormData((prevData) => ({ ...prevData, [name]: 'SA' + cleanValue }));
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const MobileInputValueChanged = (name, value) => setFormDataValue(name, value);

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    if (!formData.first_name) {
      newErrors.first_name = t('store_name_required');
      isValid = false;
    }
    if (!formData.father_name) {
      newErrors.father_name = t('father_name') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.grandfather_name) {
      newErrors.grandfather_name = t('grandfather_name') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.family_name) {
      newErrors.family_name = t('family_name') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.national_id) {
      newErrors.national_id = t('national_id') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.birth_date) {
      newErrors.birth_date = t('birth_date') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.phone) {
      newErrors.phone = t('phone_number') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.email) {
      newErrors.email = t('email') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.national_address_email) {
      newErrors.national_address_email = t('national_address_email') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.bank_name) {
      newErrors.bank_name = t('bank_name') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.iban) {
      newErrors.iban = t('iban') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.region) {
      newErrors.region = t('region') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (!formData.amount) {
      newErrors.amount = t('amount') + ' ' + t('store_name_required');
      isValid = false;
    }
    if (formData.password != confirmPassword) {
      newErrors.confirmPassword = t('passored-isnt-identical');
      isValid = false;
    }
    if (!isAgreed) {
      newErrors.isAgreed = t('agree_terms_alert') || 'You must agree to the terms and conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const getFormData = (data) => {
    const newForm = new FormData();

    Object.keys(data).forEach((key) => {
      if (data[key]) {
        newForm.append(key, data[key]);
      }
    });

    return newForm;
  };

  // Keep form type in sync with selected type
  useEffect(() => {
    setFormData((prev) => ({ ...prev, type: contractType }));
  }, [contractType]);

  // Drive type from step: 1 = sale, 2 = rental
  useEffect(() => {
    setContractType(currentStep === 1 ? "1" : "2");
  }, [currentStep]);

  // Auto-initiate Nafath when moving to step 2 to ensure a fresh session for rental
  useEffect(() => {
    if (currentStep === 2 && autoInitiateOnStep2) {
      // Give the UI a tick to open the modal before initiating
      setTimeout(() => {
        initiateNafath();
      }, 300);
      setAutoInitiateOnStep2(false);
    }
  }, [currentStep, autoInitiateOnStep2]);

  // Define before using it in dependencies to avoid TDZ at render
  const fillContractWithClientData = useCallback(async () => {
    setLoading(true);
    setErrors({});
    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value);
      });
      // Ensure the current API-required type is used for the PDF generation
      try { form.delete('type'); } catch (_) {}
      try { form.delete('contract_type'); } catch (_) {}
      const apiContractType = contractType === "1" ? 'selling' : 'rental';
      form.append('contract_type', apiContractType);

      const response = await fetch(`${API_BASE_URL}/portallogistice/contract-pdf`, {
        method: 'POST',
        body: form,
        headers: { 'X-LANG': lang }
      });

      if (!response.ok) throw new Error('Failed to fetch contract HTML');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setContractPdfUrl(url);
      setShowContractPopup(true);
      setLoading(false);
    } catch (e) {
      Store.addNotification({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        message: lang === 'ar' ? 'حدث خطأ أثناء تحميل ملف العقد' : 'Error loading contract file',
        type: "danger",
        insert: "top",
        container: "top-right",
        dismiss: {
          duration: 5000,
          onScreen: true
        }
      });
      setLoading(false);
    }
  }, [formData, lang]);

  const goToNextStep = useCallback(() => {
    setShowContractPopup(false);
    setNafathSigned(false);
    setRegistrationResponse(null);
    setCurrentStep(2);
    setContractType("2");
    fillContractWithClientData();
    setAutoInitiateOnStep2(true);
  }, [fillContractWithClientData]);

  const register = useCallback(async () => {
    if (!isAgreed) {
      Store.addNotification({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        message: t('agree_terms_alert'),
        type: "danger",
        insert: "top",
        container: "top-right",
        dismiss: {
          duration: 5000,
          onScreen: true
        }
      });
      return;
    }

    if (validateForm()) {
      try {
        setIsSigning(true);
        const contractType = currentStep === 1 ? 'selling' : 'rental';
        const payload = {
          first_name: formData.first_name,
          family_name: formData.family_name,
          father_name: formData.father_name,
          grandfather_name: formData.grandfather_name,
          national_id: formData.national_id,
          birth_date: formData.birth_date,
          region: formData.region,
          national_address_email: formData.national_address_email,
          bank_name: formData.bank_name,
          iban: formData.iban,
          email: formData.email,
          phone: formData.phone,
          // amount is now optional - backend uses prices from settings automatically
          contract_type: contractType
        };
        const response = await axios.post(
          `${API_BASE_URL}/portallogistice/register`,
          payload,
          { headers: { 'Content-Type': 'application/json', 'X-LANG': lang } }
        );
        
        setRegistrationResponse(response.data);
        
        if (!response?.data?.success && response?.data?.errors) {
          const errorCode = response?.data?.errors?.[0]?.code;
          
          // Handle specific business rule errors
          if (errorCode === 'selling_required_first') {
            Store.addNotification({
              title: lang === 'ar' ? 'خطأ' : 'Error',
              message: lang === 'ar' ? 'يجب إنشاء عقد بيع أولاً قبل إنشاء عقد إيجار' : 'You must create a selling contract first before creating a rental contract',
              type: "warning",
              insert: "top",
              container: "top-right",
              dismiss: {
                duration: 5000,
                onScreen: true
              }
            });
            // Redirect to selling step
            setCurrentStep(1);
            return;
          }
          
          if (errorCode === 'rental_required_for_previous') {
            const pendingId = response?.data?.errors?.[0]?.pending_selling_contract_id;
            Store.addNotification({
              title: lang === 'ar' ? 'خطأ' : 'Error',
              message: lang === 'ar' 
                ? `يجب إكمال عقد الإيجار للعقد السابق (رقم ${pendingId}) قبل إنشاء عقد بيع جديد`
                : `You must complete the rental contract for previous selling contract #${pendingId} first`,
              type: "warning",
              insert: "top",
              container: "top-right",
              dismiss: {
                duration: 7000,
                onScreen: true
              }
            });
            // Redirect to rental step
            setCurrentStep(2);
            return;
          }
          
          // Handle other validation errors
          response?.data?.errors.forEach(ee => {
            Store.addNotification({
              title: lang === 'ar' ? 'خطأ' : 'Error',
              message: ee.message,
              type: "danger",
              insert: "top",
              container: "top-right",
              dismiss: {
                duration: 5000,
                onScreen: true
              }
            });
            setErrors((pe) => ({ ...pe, [ee.code]: ee.message }));
          });
        } else if (response?.data?.success) {
          // Clear registrationResponse immediately to prevent showing success section
          setRegistrationResponse(null);
          if (currentStep === 1) {
            // Automatically proceed to next step
            setTimeout(() => {
              setShowContractPopup(false);
              setNafathSigned(false);
              goToNextStep();
            }, 300);
          } else {
            // Step 2 completion - close and reset
            setTimeout(() => {
              setShowContractPopup(false);
              setNafathSigned(false);
            }, 300);
            handleReset();
          }
        }
      } catch (error) {
        Store.addNotification({
          title: lang === 'ar' ? 'خطأ' : 'Error',
          message: error.response?.data?.message || (lang === 'ar' ? 'فشل في التسجيل' : 'Registration failed'),
          type: "danger",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
        setRegistrationResponse(error.response?.data || { error: 'Registration failed' });
      } finally {
        setIsSigning(false);
      }
    }
  }, [formData, isAgreed, lang, t]);

  const handleReset = () => {
    setFormData({
      first_name: "",
      father_name: "",
      grandfather_name: "",
      family_name: "",
      national_id: "",
      birth_date: "",
      phone: "",
      email: "",
      national_address_email: "",
      bank_name: "",
      iban: "",
      region: "",
      amount: "",
      type: contractType
    });
    setErrors({});
    setIsAgreed(false);
    // Do NOT clear registrationResponse here; let the modal close button handle it
  };

  

  const openPdfDraft = async () => {
    setLoading(true);
    setErrors({});
    try {
      const form = new FormData();
      const apiContractType = contractType === "1" ? 'selling' : 'rental';
      form.append('contract_type', apiContractType);
      const response = await fetch(`${API_BASE_URL}/portallogistice/contract-pdf?pdf=1`, {
        method: 'POST',
        body: form,
        headers: { 'X-LANG': lang }
      });
      if (!response.ok) throw new Error('Failed to fetch contract PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setShowPdfPopup(true);
    } catch (e) {
      Store.addNotification({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        message: lang === 'ar' ? 'حدث خطأ أثناء تحميل ملف العقد PDF' : 'Error loading contract PDF',
        type: "danger",
        insert: "top",
        container: "top-right",
        dismiss: {
          duration: 5000,
          onScreen: true
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const openPdfInNewTab = async (isContract) => {
    if (isContract) {
      if (contractPdfUrl) {
        window.open(contractPdfUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      if (pdfUrl) {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      } else {
        await openPdfDraft();
      }
    }
  };

  const initiateNafath = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    try {
      const response = await axios.post(`${API_BASE_URL}/portallogistice/nafath/initiate`, {
        national_id: formData.national_id,
        contract_type: currentStep === 1 ? 'selling' : 'rental'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-LANG': lang
        }
      });
      const data = response?.data;
      
      // Handle already approved - skip Nafath wait
      if (data?.status === "approved") {
        setNafathSigned(true);
        setNfathCode(null);
        setAuthenticated(true);
        Store.addNotification({
          title: lang === 'ar' ? 'نجاح' : 'Success',
          message: data.message || (lang === 'ar' ? 'تم التحقق من الهوية مسبقاً' : 'Identity already verified'),
          type: "success",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 3000,
            onScreen: true
          }
        });
      } else if (data?.status === "sent" && data?.external_response?.[0]?.random) {
        // Nafath request sent - show code and poll
        setNfathCode(data.external_response[0].random);
        setAuthenticated(true);
      } else if (data?.status === "sent") {
        // Pending exists - already polling
        Store.addNotification({
          title: lang === 'ar' ? 'تنبيه' : 'Notice',
          message: data.message || (lang === 'ar' ? 'يوجد طلب قيد المعالجة' : 'Request already pending'),
          type: "info",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
      } else {
        Store.addNotification({
          title: lang === 'ar' ? 'خطأ' : 'Error',
          message: data.message || (lang === 'ar' ? 'فشل في بدء المصادقة' : 'Authentication initiation failed'),
          type: "danger",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
        setAuthenticated(false);
      }
    } catch (e) {
      if (e.response?.data?.errors) {
        Store.addNotification({
          title: lang === 'ar' ? 'خطأ' : 'Error',
          message: e.response?.data?.message,
          type: "danger",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
      } else {
        Store.addNotification({
          title: lang === 'ar' ? 'خطأ' : 'Error',
          message: lang === 'ar' ? 'فشل في بدء المصادقة' : 'Authentication initiation failed',
          type: "danger",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
      }
      setAuthenticated(false);
    }
    setLoading(false);
  };

  const checkNafathStatus = async (contractTypeParam) => {
    setErrors({});
    // Always explicitly set contract_type - default to 'selling' if not provided
    const contractTypeValue = contractTypeParam || (currentStep === 1 ? 'selling' : 'rental');
    
    // Validate contract_type is set
    if (!contractTypeValue) {
      console.error('checkNafathStatus: contract_type is missing!');
      return null;
    }
    
    try {
      // GET request with query params per API spec
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/portallogistice/nafath/checkStatus?national_id=${formData.national_id}&contract_type=${contractTypeValue}&_t=${timestamp}`;
      
      console.log('checkNafathStatus: Calling API with:', {
        national_id: formData.national_id,
        contract_type: contractTypeValue,
        url
      });
      
      const response = await axios.get(url, {
          headers: {
            'X-LANG': lang,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      const data = response?.data;
      
      // Log the full response for debugging
      console.log('checkNafathStatus: API Response:', {
        fullResponse: response,
        responseData: data,
        status: data?.status,
        statusType: typeof data?.status,
        statusValue: data?.status
      });
      
      // Handle nested response structure (response.data.data.status) if needed
      const status = data?.status || data?.data?.status;
      
      if (!status) {
        console.error('checkNafathStatus: No status found in response:', data);
        return null;
      }
      
      if (status === "not_found") {
        setNfathCode(null);
        Store.addNotification({
          title: lang === 'ar' ? 'خطأ' : 'Error',
          message: data?.message || (lang === 'ar' ? 'طلب المصادقة غير موجود' : 'Authentication request not found'),
          type: "danger",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
        return 'not_found';
      }
      
      // Check for "approved" status (case-insensitive and trimmed)
      const normalizedStatus = String(status).toLowerCase().trim();
      console.log('checkNafathStatus: Normalized status:', normalizedStatus);
      
      if (normalizedStatus === "approved") {
        console.log('checkNafathStatus: Status is approved! Setting nafathSigned to true');
        setNafathSigned(true);
        setNfathCode(null);
        clearInterval(nafathInterval);
      }

      return normalizedStatus;
    } catch (e) {
      if (e.response?.status === 404) {
        setNfathCode(null);
        Store.addNotification({
          title: lang === 'ar' ? 'خطأ' : 'Error',
          message: lang === 'ar' ? 'طلب المصادقة غير موجود' : 'Authentication request not found',
          type: "danger",
          insert: "top",
          container: "top-right",
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
        return 'not_found';
      }
      Store.addNotification({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        message: e.response?.data?.message || (lang === 'ar' ? 'فشل التحقق من الحالة' : 'Status check failed'),
        type: "danger",
        insert: "top",
        container: "top-right",
        dismiss: {
          duration: 5000,
          onScreen: true
        }
      });
      return null;
    }
  };

  useEffect(() => {
    let intervalId;
    if (nfathCode && !nafathSigned && formData.national_id) {
      setShowNafathPopup(true);
      // Always explicitly set contract_type - default to 'selling' for step 1, 'rental' for step 2
      const contractTypeValue = currentStep === 1 ? 'selling' : 'rental';
      console.log('useEffect: Starting Nafath status polling with contract_type:', contractTypeValue);
      
      intervalId = setInterval(async () => {
        try {
          const status = await checkNafathStatus(contractTypeValue);
          // Status is already normalized (lowercase) from checkNafathStatus
          if (status === "approved") {
            console.log('useEffect: Status is approved, closing popup');
            setShowNafathPopup(false);
            setNafathSigned(true);
            clearInterval(intervalId);
          } else if (status === "not_found") {
            console.log('useEffect: Status is not_found, stopping polling');
            clearInterval(intervalId);
          }
        } catch (e) {
          console.error('useEffect: Error checking Nafath status:', e);
          Store.addNotification({
            title: lang === 'ar' ? 'خطأ' : 'Error',
            message: lang === 'ar' ? 'فشل في التحقق من حالة المصادقة' : 'Failed to check authentication status',
            type: "danger",
            insert: "top",
            container: "top-right",
            dismiss: {
              duration: 5000,
              onScreen: true
            }
          });
          clearInterval(intervalId);
        }
      }, 2000); // Poll every 2 seconds per API guide
      setNafathInterval(intervalId);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [nfathCode, nafathSigned, currentStep]);

  useEffect(() => {
    return () => {
      if (nafathInterval) clearInterval(nafathInterval);
    };
  }, [nafathInterval]);

  return (
    <section className="join-as-driver mb-4">
      {loading && (
        <div className='position-fixed w-100 h-100 top-0 start-0 d-flex flex-column'
          style={{
            background: 'rgba(255,255,255,0.8)',
            zIndex: 99999
          }}>
          <div className="d-flex justify-content-center m-auto w-100 h-100">
            <Watch
              visible={true}
              height="80"
              width="80"
              radius="48"
              color="#073491"
              ariaLabel="watch-loading"
              wrapperStyle={{}}
              wrapperClass="m-auto d-flex justify-content-center"
            />
          </div>
        </div>
      )}
      {/* Registration Success Popup */}
      {registrationResponse && !showContractPopup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 5000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            minWidth: 'min(350px, 90vw)',
            maxWidth: 'min(500px, 95vw)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#4caf50',
              marginBottom: '1.5rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 style={{ color: '#4caf50', marginBottom: '1rem' }}>
              {lang === 'ar' ? 'تم التسجيل بنجاح' : 'Registration Completed'}
            </h2>
            <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
              {lang === 'ar' ? 'شكراً لك على إكمال عملية التسجيل, سيتم التواصل معك من قبل فريق شلة, شكراً لثقتكم.' : 'Thank you for completing the registration process, our team will contact you shortly.'}
            </p>
            {currentStep === 1 ? (
              <button
                type="button"
                className="btn btn-submit"
                style={{ minWidth: '140px', padding: '10px 20px', fontWeight: 600, fontSize: '1rem', borderRadius: '8px', background: '#073491', color: 'white', border: 'none' }}
                onClick={goToNextStep}
              >
                {lang === 'ar' ? 'التالي' : 'Next'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-submit"
                style={{ minWidth: '120px', padding: '10px 20px', fontWeight: 600, fontSize: '1rem', borderRadius: '8px', background: '#073491', color: 'white', border: 'none' }}
                onClick={() => setRegistrationResponse(null)}
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            )}
          </div>
        </div>
      )}

      {showContractPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 3000,
          display: 'flex', alignItems: 'stretch', justifyContent: 'center',
          padding: 0
        }}>
          <div style={{
            background: '#fff', borderRadius: '0',
            width: 'min(1400px, 98vw)', height: '96vh', marginTop: '2vh',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #eef1f6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#F9FBFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#073491',
                  border: '2px solid #C9A227', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>{currentStep}</div>
                <div style={{ color: '#073491', fontWeight: 800, fontSize: 18 }}>
                  {currentStep === 1 ? (lang === 'ar' ? 'عقد بيع - التوقيع' : 'Sale Contract - Sign') : (lang === 'ar' ? 'عقد استئجار - التوقيع' : 'Rental Contract - Sign')}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowContractPopup(false)}
                style={{ padding: '8px 14px' }}
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#f4f6fb', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, padding: '12px 16px' }}>
            {nfathCode ? (
              <>
                <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    border: '4px solid #073491',
                    background: '#f0f7ff',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#073491',
                    marginBottom: '1rem'
                  }}>
                    {nfathCode}
                  </div>
                  <h3 style={{ color: '#073491', marginBottom: '0.5rem' }}>
                    {lang === 'ar' ? 'رمز المصادقة' : 'Authentication Code'}
                  </h3>
                  <p style={{ color: '#666', fontSize: '16px', marginBottom: '1.5rem' }}>
                    {lang === 'ar' ? 'يرجى استخدام هذا الرمز لإكمال عملية المصادقة عبر تطبيق نفاذ' : 'Please use this code to complete authentication via Nafath app'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    style={{ minWidth: '120px', padding: '10px 20px' }}
                    onClick={() => {
                      setShowContractPopup(false);
                      setNfathCode(null);
                    }}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </>
            ) : nafathSigned ? (
              <>
                <div style={{width: '100%', textAlign: 'center', marginBottom: '1.5rem'}}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#e8f5e9',
                    marginBottom: '1rem'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#4caf50">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h3 style={{ color: '#4caf50', marginBottom: '0.5rem' }}>
                    {lang === 'ar' ? 'تمت المصادقة بنجاح' : 'Authentication Successful'}
                  </h3>
                  <p style={{ color: '#666', fontSize: '16px' }}>
                    {lang === 'ar' ? 'يمكنك الآن المتابعة إلى التوقيع النهائي' : 'You can now proceed to final signing'}
                  </p>
                </div>
                
                {!registrationResponse && (
                  <>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '1.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-submit"
                        disabled={isSigning}
                        onClick={register}
                        style={{ 
                          minWidth: '180px', 
                          padding: '12px 24px',
                          background: isSigning ? '#ccc' : '#073491',
                          border: 'none',
                          color: 'white',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          cursor: isSigning ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isSigning ? (
                          <>
                            <span style={{marginRight: '8px'}}>
                              <Watch
                                height="20"
                                width="20"
                                radius="48"
                                color="#fff"
                                ariaLabel="watch-loading"
                              />
                            </span>
                            {lang === 'ar' ? 'جاري التوقيع...' : 'Signing...'}
                          </>
                        ) : (
                          currentStep === 1
                            ? (lang === 'ar' ? 'توقيع ومتابعة' : 'Sign and Continue')
                            : (lang === 'ar' ? 'توقيع العقد' : 'Sign Contract')
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setShowContractPopup(false);
                          setNafathSigned(false);
                        }}
                        style={{ 
                          minWidth: '100px', 
                          padding: '12px 20px',
                          border: '1px solid #ccc',
                          background: 'transparent',
                          color: '#666',
                          borderRadius: '8px',
                          fontWeight: 'bold'
                        }}
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                    
                    {!isMobile && (
                      <>
                        {/* Action buttons for PDF */}
                        {contractPdfUrl && (
                          <div style={{
                            display: 'flex',
                            gap: '1rem',
                            marginBottom: '1rem',
                            justifyContent: 'center'
                          }}>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => window.open(contractPdfUrl, '_blank')}
                              style={{
                                padding: '10px 24px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <i className="fas fa-external-link-alt"></i>
                              {lang === 'ar' ? 'فتح في علامة تبويب جديدة' : 'Open in New Tab'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = contractPdfUrl;
                                link.download = 'contract.pdf';
                                link.click();
                              }}
                              style={{
                                padding: '10px 24px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <i className="fas fa-download"></i>
                              {lang === 'ar' ? 'تحميل العقد' : 'Download Contract'}
                            </button>
                          </div>
                        )}
                        
                        {/* PDF Preview */}
                        <div style={{
                          width: '100%', height: '70vh', border: '2px solid #e0e0e0',
                          borderRadius: '12px', overflow: 'hidden', background: '#fafafa'
                        }}>
                          {contractPdfUrl ? (
                            <iframe
                              src={contractPdfUrl}
                              width="100%"
                              height="100%"
                              style={{ border: 'none' }}
                              title="Contract PDF"
                            />
                          ) : (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '2rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100%'
                            }}>
                              <div>
                                <Watch
                                  height="40"
                                  width="40"
                                  radius="48"
                                  color="#073491"
                                  ariaLabel="watch-loading"
                                />
                                <p style={{ marginTop: '1rem', color: '#666' }}>
                                  {lang === 'ar' ? 'جاري تحميل العقد...' : 'Loading contract...'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div style={{width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: '12px', marginBottom: '1.5rem'}}>
                  {(() => {
                    let isValid = true;
                    if (
                      !formData.first_name ||
                      !formData.father_name ||
                      !formData.grandfather_name ||
                      !formData.family_name ||
                      !formData.national_id ||
                      !formData.birth_date ||
                      !formData.phone ||
                      !formData.email ||
                      !formData.national_address_email ||
                      !formData.bank_name ||
                      !formData.iban ||
                      !formData.region ||
                      !formData.amount
                    ) {
                      isValid = false;
                    }
                    if (isValid) {
                      return (
                        <>
                          <button
                            type="button"
                            className="btn btn-submit"
                            style={{ minWidth: '180px', padding: '12px 20px' }}
                            onClick={initiateNafath}
                          >
                            {lang === 'ar' ? 'المصادقة عبر نفاذ' : 'Nafath Authentication'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            style={{ minWidth: '120px', padding: '12px 20px' }}
                            onClick={() => {
                              setShowContractPopup(false);
                            }}
                          >
                            {lang === 'ar' ? 'تعديل البيانات' : 'Edit Data'}
                          </button>
                          {
                            isMobile && (
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                style={{ minWidth: '120px', padding: '12px 20px' }}
                                onClick={() => {
                                  openPdfInNewTab(true);
                                }}
                              >
                                {lang === 'ar' ? 'تحميل العقد' : 'Download Contract'}
                              </button>
                            )
                          }
                        </>
                      );
                    } else {
                      return (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            style={{ minWidth: '120px', padding: '12px 20px' }}
                            onClick={() => {
                              setShowContractPopup(false);
                            }}
                          >
                            {lang === 'ar' ? 'استكمال البيانات' : 'Complete Data'}
                          </button>
                          {
                            isMobile && (
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                style={{ minWidth: '120px', padding: '12px 20px' }}
                                onClick={() => {
                                  openPdfInNewTab(true);
                                }}
                              >
                                {lang === 'ar' ? 'تحميل العقد' : 'Download Contract'}
                              </button>
                            )
                          }
                        </>
                      );
                    }
                  })()}
                </div>
                
                {!isMobile && (
                  <>
                    {/* Action buttons for PDF */}
                    {contractPdfUrl && (
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '1rem',
                        justifyContent: 'center'
                      }}>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => window.open(contractPdfUrl, '_blank')}
                          style={{
                            padding: '10px 24px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <i className="fas fa-external-link-alt"></i>
                          {lang === 'ar' ? 'فتح في علامة تبويب جديدة' : 'Open in New Tab'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = contractPdfUrl;
                            link.download = 'contract.pdf';
                            link.click();
                          }}
                          style={{
                            padding: '10px 24px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <i className="fas fa-download"></i>
                          {lang === 'ar' ? 'تحميل العقد' : 'Download Contract'}
                        </button>
                      </div>
                    )}
                    
                    {/* PDF Preview */}
                    <div style={{
                      width: '100%', height: '60vh', border: '2px solid #e0e0e0',
                      borderRadius: '12px', overflow: 'hidden', background: '#fafafa'
                    }}>
                      {contractPdfUrl ? (
                        <iframe
                          src={contractPdfUrl}
                          width="100%"
                          height="100%"
                          style={{ border: 'none' }}
                          title="Contract PDF"
                        />
                      ) : (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%'
                        }}>
                          <div>
                            <Watch
                              height="40"
                              width="40"
                              radius="48"
                              color="#073491"
                              ariaLabel="watch-loading"
                            />
                            <p style={{ marginTop: '1rem', color: '#666' }}>
                              {lang === 'ar' ? 'جاري تحميل العقد...' : 'Loading contract...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
              </div>
            </div>

            {/* Sticky Action Bar */}
            <div style={{
              borderTop: '1px solid #eef1f6', background: '#fff', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
            }}>
              {!nfathCode && !nafathSigned && (
                <>
                  <button
                    type="button"
                    className="btn btn-submit"
                    disabled={isSigning}
                    onClick={register}
                    style={{ minWidth: '180px' }}
                  >
                    {isSigning ? (lang === 'ar' ? 'جاري التوقيع...' : 'Signing...') : (currentStep === 1 ? (lang === 'ar' ? 'توقيع ومتابعة' : 'Sign and Continue') : (lang === 'ar' ? 'توقيع العقد' : 'Sign Contract'))}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowContractPopup(false)}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {showPdfPopup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 4000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            width: 'min(1200px, 95vw)', // Increased width for larger PDF view
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                setShowPdfPopup(false);
                if (pdfUrl) {
                  URL.revokeObjectURL(pdfUrl);
                  setPdfUrl(null);
                }
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999'
              }}
            >
              &times;
            </button>
            
            <h3 style={{ color: '#073491', marginBottom: '1rem' }}>
              {lang === 'ar' ? 'نموذج العقد' : 'Contract Draft'}
            </h3>
            
            {pdfUrl ? (
              <div style={{
                width: '100%',
                height: '75vh', // Increased height for better PDF viewing
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <iframe
                  src={pdfUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Contract Draft PDF"
                />
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px'
              }}>
                <div>
                  <Watch
                    height="40"
                    width="40"
                    radius="48"
                    color="#073491"
                    ariaLabel="watch-loading"
                  />
                  <p style={{ marginTop: '1rem', color: '#666' }}>
                    {lang === 'ar' ? 'جاري تحميل ملف العقد...' : 'Loading contract file...'}
                  </p>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={() => {
                  openPdfInNewTab(false);
                }}
                style={{ minWidth: '200px', padding: '10px 20px' }}
              >
                {lang === 'ar' ? 'فتح في نافذة جديدة' : 'Open in New Window'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Header />
      <div className="join-as-driver-container">
        <div className="join-as-driver-main-content">
          <div className="join-as-driver-form-title">
            <h1>{lang == 'ar' ? 'التسجيل كمستثمر' : 'Join as Investor'}</h1>
          </div>
          {/* Premium Steps Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: currentStep === 1 ? '#073491' : '#E6ECFF',
                  border: `2px solid ${currentStep === 1 ? '#C9A227' : '#D7E1FF'}`,
                  color: currentStep === 1 ? '#fff' : '#073491',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>1</div>
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ color: '#073491', fontWeight: 700 }}>
                    {lang === 'ar' ? 'عقد بيع' : 'Sale'}
                  </div>
                  <div style={{ color: '#7A8499', fontSize: 12 }}>
                    {lang === 'ar' ? 'إدخال البيانات والتوقيع' : 'Details & sign'}
                  </div>
                </div>
              </div>
              {/* Connector */}
              <div style={{ width: 80, height: 3, background: currentStep === 2 ? '#073491' : '#E6ECFF', borderRadius: 2 }} />
              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: currentStep === 2 ? '#073491' : '#E6ECFF',
                  border: `2px solid ${currentStep === 2 ? '#C9A227' : '#D7E1FF'}`,
                  color: currentStep === 2 ? '#fff' : '#073491',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>2</div>
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ color: '#073491', fontWeight: 700 }}>
                    {lang === 'ar' ? 'عقد استئجار' : 'Rental'}
                  </div>
                  <div style={{ color: '#7A8499', fontSize: 12 }}>
                    {lang === 'ar' ? 'مصادقة نفاذ والتوقيع' : 'Nafath & sign'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            width: 'auto',
            textAlign: lang == 'ar' ? 'right' : 'left',
            margin: '2rem 0 2rem 0',
            padding: '0.5rem 0 0.5rem 0'
          }}>
            <div className="contract-type-selection" style={{ margin: '1rem 0', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#073491' }}>
                {lang === 'ar' ? 'الخطوة' : 'Step'} {currentStep} {lang === 'ar' ? 'من' : 'of'} 2
              </span>
              <span style={{ color: '#073491' }}>
                {currentStep === 1
                  ? (lang === 'ar' ? 'عقد بيع' : 'Sale Contract')
                  : (lang === 'ar' ? 'عقد استئجار' : 'Rental Contract')}
              </span>
            </div>
            <div className='d-flex justify-content-center'>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  isMobile ? openPdfInNewTab(false) : openPdfDraft();
                }}
                style={{
                  color: '#073491',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '12px 32px',
                  borderRadius: '10px',
                  border: '1.5px solid #073491',
                  background: '#f7faf7',
                  display: 'inline-block',
                  boxShadow: '0 2px 8px rgba(56,142,60,0.08)',
                  margin: '0.5rem 0',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#073491';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f7faf7';
                  e.target.style.color = '#073491';
                }}
              >
                {lang === 'ar' ? 'نموذج العقد (PDF)' : 'Contract Draft (PDF)'}
              </button>
            </div>

          </div>
          <div className="join-as-driver-form">
            <form className="main-form" onSubmit={(e) => e.preventDefault()}>
              {/* <input type="hidden" name="type" value="0" /> */}
              <div className="main-form-description">
                <p>{lang === 'ar' ? 'معلومات المستثمر' : 'Investor Information'}</p>
              </div>
              <div className="form-fields">
                <div className="field-group-items">
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'الاسم الأول' : 'First Name'}</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'الاسم الأول' : 'First Name'}
                    />
                    {errors.first_name && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.first_name}</div>}
                  </div>
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'اسم الأب' : 'Father Name'}</label>
                    <input
                      type="text"
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'اسم الأب' : 'Father Name'}
                    />
                    {errors.father_name && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.father_name}</div>}
                  </div>
                </div>
                <div className="field-group-items">
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'اسم الجد' : 'Grandfather Name'}</label>
                    <input
                      type="text"
                      name="grandfather_name"
                      value={formData.grandfather_name}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'اسم الجد' : 'Grandfather Name'}
                    />
                    {errors.grandfather_name && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.grandfather_name}</div>}
                  </div>
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'اسم العائلة' : 'Family Name'}</label>
                    <input
                      type="text"
                      name="family_name"
                      value={formData.family_name}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'اسم العائلة' : 'Family Name'}
                    />
                    {errors.family_name && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.family_name}</div>}
                  </div>
                </div>
                <div className="field-group-items">
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'الهوية الوطنية' : 'National ID'}</label>
                    <input
                      type="text"
                      name="national_id"
                      value={formData.national_id}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'الهوية الوطنية' : 'National ID'}
                    />
                    {errors.national_id && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.national_id}</div>}
                  </div>
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'تاريخ الميلاد' : 'Birth Date'}</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      className="input-field"
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 17)).toISOString().split('T')[0]}
                      required
                      placeholder={lang === 'ar' ? 'تاريخ الميلاد' : 'Birth Date'}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    />
                    {errors.birth_date && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.birth_date}</div>}
                  </div>
                </div>
                <div className="field-group-items">
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}</label>
                    <PhoneInput
                      className="input-field"
                      name="phone"
                      value={formData.phone}
                      onChange={MobileInputValueChanged}
                      required={true}
                      placeholder={lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}
                    />
                    {errors.phone && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.phone}</div>}
                  </div>
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    />
                    {errors.email && <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.email}</div>}
                  </div>
                </div>
                <div className="field-group-items">
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'البريد الإلكتروني للعنوان الوطني' : 'National Address Email'}</label>
                    <input
                      type="email"
                      name="national_address_email"
                      value={formData.national_address_email}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'البريد الإلكتروني للعنوان الوطني' : 'National Address Email'}
                    />
                    {errors.national_address_email && <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.national_address_email}</div>}
                  </div>
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'اسم البنك' : 'Bank Name'}</label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'اسم البنك' : 'Bank Name'}
                    />
                    {errors.bank_name && <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.bank_name}</div>}
                  </div>
                </div>
                <div className="field-group-items">
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'رقم الآيبان' : 'IBAN'}</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ 
                        position: 'absolute', 
                        [lang === 'ar' ? 'right' : 'left']: '12px', 
                        color: '#666', 
                        fontWeight: '500',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}>SA</span>
                      <input
                        type="text"
                        name="iban"
                        value={formData.iban.startsWith('SA') ? formData.iban.substring(2) : formData.iban}
                        onChange={handleChange}
                        className="input-field"
                        required
                        placeholder={lang === 'ar' ? 'رقم الآيبان' : 'IBAN'}
                        style={{ [lang === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                      />
                    </div>
                    {errors.iban && <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.iban}</div>}
                  </div>
                  <div className="field-group-name">
                    <label>{lang === 'ar' ? 'المنطقة' : 'Region'}</label>
                    <input
                      type="text"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'المنطقة' : 'Region'}
                    />
                    {errors.region && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.region}</div>}
                  </div>
                </div>
                <div className="field-group-items">
                  <div className="field-group-name" style={{ width: '100%' }}>
                    <label>{lang === 'ar' ? 'المبلغ' : 'Amount'}</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      className="input-field"
                      required
                      placeholder={lang === 'ar' ? 'المبلغ' : 'Amount'}
                    />
                    {errors.amount && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.amount}</div>}
                  </div>
                </div>
                <div>
                  <div className="form-agreement">
                    <input type="checkbox" id="terms" name="terms" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} />
                    <label htmlFor="terms" className='px-2'> 
                      {lang === 'ar' ? 'أوافق على' : 'I agree to'} <span>{lang === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}</span>
                    </label>
                    {errors.isAgreed && <div style={{ color: ' #d32f2f', fontSize: '0.9em', marginTop: 2 }}>{errors.isAgreed}</div>}
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      style={{
                        minWidth: 120,
                        padding: '10px 24px',
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderRadius: '8px',
                        background: '#fff',
                        color: '#073491',
                        border: '2px solid #073491',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        transition: 'background 0.2s, color 0.2s'
                      }}
                      onClick={fillContractWithClientData}
                    >
                      {lang === 'ar' ? 'عرض العقد' : 'View Contract'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
        <ScrollToTop />
      </div>
    </section>
  );
};

export default TsahelPage;