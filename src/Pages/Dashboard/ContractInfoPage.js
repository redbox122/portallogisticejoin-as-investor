import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/contract-info-page.css';

const ContractInfoPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const lang = i18n.language;

  useEffect(() => {
    checkPdfStatus();
  }, []);

  const checkPdfStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      
      // First, check profile for contractor_info_pdf_path
      const [profileRes, documentsRes, contractsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/portallogistice/profile`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/documents`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/contracts`, { headers })
      ]);

      let hasPdfPath = false;
      let contractStatus = 'pending';
      let ibanDocStatus = 'pending';
      let nationalAddressDocStatus = 'pending';

      // Check profile for PDF path
      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        const user = profileRes.value.data.data?.user || profileRes.value.data.data;
        hasPdfPath = !!user?.contractor_info_pdf_path;
      }

      // Check documents status
      if (documentsRes.status === 'fulfilled' && documentsRes.value.data?.success) {
        const documents = documentsRes.value.data.data?.documents || documentsRes.value.data.data || [];
        const ibanDoc = documents.find(d => d.type === 'iban_doc');
        const nationalAddressDoc = documents.find(d => d.type === 'national_address_doc');
        
        // Check if document exists (not just status)
        ibanDocStatus = ibanDoc ? (ibanDoc.status || 'pending') : 'missing';
        nationalAddressDocStatus = nationalAddressDoc ? (nationalAddressDoc.status || 'pending') : 'missing';
      }

      // Check contract status (get the most recent approved contract or any approved contract)
      if (contractsRes.status === 'fulfilled' && contractsRes.value.data?.success) {
        const contracts = contractsRes.value.data.data?.contracts || contractsRes.value.data.data || [];
        const approvedContract = contracts.find(c => c.status === 1 || c.status === 'approved');
        if (approvedContract) {
          contractStatus = 'approved';
        } else if (contracts.length > 0) {
          contractStatus = contracts[0].status === 0 || contracts[0].status === 'rejected' ? 'rejected' : 'pending';
        }
      }

      // Set status info for UI
      const allApproved = contractStatus === 'approved' && 
                         ibanDocStatus === 'approved' && 
                         nationalAddressDocStatus === 'approved';

      // Determine what's missing
      const missingItems = [];
      if (contractStatus !== 'approved') {
        missingItems.push('contract');
      }
      if (ibanDocStatus === 'missing' || ibanDocStatus === 'rejected') {
        missingItems.push('iban_doc');
      } else if (ibanDocStatus !== 'approved') {
        missingItems.push('iban_doc_pending');
      }
      if (nationalAddressDocStatus === 'missing' || nationalAddressDocStatus === 'rejected') {
        missingItems.push('national_address_doc');
      } else if (nationalAddressDocStatus !== 'approved') {
        missingItems.push('national_address_doc_pending');
      }

      setStatusInfo({
        contract: contractStatus,
        ibanDoc: ibanDocStatus,
        nationalAddressDoc: nationalAddressDocStatus,
        allApproved,
        missingItems
      });

      // If PDF path exists in profile, try to fetch it
      if (hasPdfPath) {
        await fetchContractorInfoPDF();
      } else {
        // PDF not available yet
        setLoading(false);
        setError(lang === 'ar' 
          ? 'ملف PDF غير متوفر. يرجى انتظار اعتماد العقد والمستندات.'
          : 'PDF not available. Please wait for contract and documents approval.'
        );
      }
    } catch (error) {
      setLoading(false);
      console.error('Error checking PDF status:', error);
      setError(lang === 'ar' 
        ? 'حدث خطأ أثناء التحقق من حالة ملف PDF'
        : 'Error checking PDF status'
      );
    }
  };

  const fetchContractorInfoPDF = async () => {
    try {
      const headers = getAuthHeaders();
      headers['Accept'] = 'application/json';

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/my-contractor-info-pdf`,
        {
          headers,
          responseType: 'blob' // Important: handle binary PDF data
        }
      );

      // Create blob URL for the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      
      // Handle 404 or other errors
      if (error.response?.status === 404) {
        const errorData = error.response.data;
        // Try to parse JSON error message if available
        if (errorData instanceof Blob) {
          // If response is blob, try to read as text
          errorData.text().then(text => {
            try {
              const json = JSON.parse(text);
              setError(json.message_en || json.message || 'PDF not available. Please wait for contract and documents approval.');
            } catch {
              setError('PDF not available. Please wait for contract and documents approval.');
            }
          });
        } else {
          setError(errorData?.message_en || errorData?.message || 'PDF not available. Please wait for contract and documents approval.');
        }
      } else {
        const errorMessage = error.response?.data?.message_en || 
                            error.response?.data?.message ||
                            error.message ||
                            (lang === 'ar' ? 'حدث خطأ أثناء تحميل ملف PDF' : 'Error loading PDF file');
        setError(errorMessage);
        
        Store.addNotification({
          title: t('dashboard.error.title'),
          message: errorMessage,
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'contractor_info.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="contract-info-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <i className="fas fa-file-pdf header-icon"></i>
            <div>
              <h1 className="page-title">
                {lang === 'ar' ? 'معلومات المتعاقد' : 'Contractor Information'}
              </h1>
              <p className="page-subtitle">
                {lang === 'ar' 
                  ? 'عرض وتحميل تفاصيل البنك والتحويلات المطلوبة'
                  : 'View and download bank details and required transfers'
                }
              </p>
            </div>
          </div>
          {pdfUrl && (
            <div className="header-actions">
              <button className="btn btn-secondary" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                {lang === 'ar' ? 'طباعة' : 'Print'}
              </button>
              <button className="btn btn-primary" onClick={handleDownload}>
                <i className="fas fa-download"></i>
                {lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        {loading && (
          <div className="loading-container">
            <Watch
              height="80"
              width="80"
              radius="48"
              color="#073491"
              ariaLabel="loading"
              wrapperStyle={{}}
              wrapperClass=""
              visible={true}
            />
            <p className="loading-text">
              {lang === 'ar' ? 'جاري تحميل ملف PDF...' : 'Loading PDF...'}
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="error-container">
            <div className="error-content">
              <i className="fas fa-exclamation-circle error-icon"></i>
              <h2 className="error-title">
                {lang === 'ar' ? 'ملف PDF غير متوفر' : 'PDF Not Available'}
              </h2>
              <p className="error-message">{error}</p>
              
              {/* Show status information if available */}
              {statusInfo && (
                <div className="status-info" style={{
                  marginTop: '24px',
                  padding: '24px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  textAlign: 'left',
                  maxWidth: '700px',
                  margin: '24px auto 0',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{ 
                    marginTop: 0, 
                    marginBottom: '20px', 
                    fontSize: '18px', 
                    fontWeight: '700',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <i className="fas fa-clipboard-list" style={{ color: '#073491' }}></i>
                    {lang === 'ar' ? 'ما تحتاج لإتمامه للحصول على ملف PDF' : 'What You Need to Complete'}
                  </h3>
                  
                  <div className="status-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    {/* Contract Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px',
                      background: statusInfo.contract === 'approved' ? '#d1fae5' : statusInfo.contract === 'rejected' ? '#fee2e2' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${statusInfo.contract === 'approved' ? '#10b981' : statusInfo.contract === 'rejected' ? '#ef4444' : '#f59e0b'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <i className={`fas ${statusInfo.contract === 'approved' ? 'fa-check-circle' : statusInfo.contract === 'rejected' ? 'fa-times-circle' : 'fa-clock'}`}
                           style={{ 
                             color: statusInfo.contract === 'approved' ? '#10b981' : statusInfo.contract === 'rejected' ? '#ef4444' : '#f59e0b',
                             fontSize: '20px'
                           }}></i>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151', display: 'block' }}>
                            {lang === 'ar' ? 'العقد' : 'Contract'}
                          </span>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {statusInfo.contract === 'approved' 
                              ? (lang === 'ar' ? '✓ معتمد' : '✓ Approved')
                              : statusInfo.contract === 'rejected'
                              ? (lang === 'ar' ? '✗ مرفوض - يرجى مراجعة العقد' : '✗ Rejected - Please review contract')
                              : (lang === 'ar' ? '⏳ قيد الانتظار - في انتظار اعتماد الإدارة' : '⏳ Pending - Awaiting admin approval')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* IBAN Document Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px',
                      background: statusInfo.ibanDoc === 'approved' ? '#d1fae5' : statusInfo.ibanDoc === 'rejected' ? '#fee2e2' : statusInfo.ibanDoc === 'missing' ? '#fee2e2' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${statusInfo.ibanDoc === 'approved' ? '#10b981' : statusInfo.ibanDoc === 'rejected' || statusInfo.ibanDoc === 'missing' ? '#ef4444' : '#f59e0b'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <i className={`fas ${statusInfo.ibanDoc === 'approved' ? 'fa-check-circle' : statusInfo.ibanDoc === 'rejected' || statusInfo.ibanDoc === 'missing' ? 'fa-exclamation-circle' : 'fa-clock'}`}
                           style={{ 
                             color: statusInfo.ibanDoc === 'approved' ? '#10b981' : statusInfo.ibanDoc === 'rejected' || statusInfo.ibanDoc === 'missing' ? '#ef4444' : '#f59e0b',
                             fontSize: '20px'
                           }}></i>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151', display: 'block' }}>
                            {lang === 'ar' ? 'مستند الآيبان' : 'IBAN Document'}
                          </span>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {statusInfo.ibanDoc === 'approved' 
                              ? (lang === 'ar' ? '✓ معتمد' : '✓ Approved')
                              : statusInfo.ibanDoc === 'rejected'
                              ? (lang === 'ar' ? '✗ مرفوض - يرجى إعادة الرفع' : '✗ Rejected - Please re-upload')
                              : statusInfo.ibanDoc === 'missing'
                              ? (lang === 'ar' ? '✗ مفقود - يرجى رفع المستند' : '✗ Missing - Please upload document')
                              : (lang === 'ar' ? '⏳ قيد المراجعة' : '⏳ Under Review')
                            }
                          </span>
                        </div>
                      </div>
                      {(statusInfo.ibanDoc === 'missing' || statusInfo.ibanDoc === 'rejected') && (
                        <button 
                          onClick={() => navigate('/dashboard/profile')}
                          style={{
                            padding: '8px 16px',
                            background: '#073491',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: '12px'
                          }}
                        >
                          <i className="fas fa-upload"></i>
                          {lang === 'ar' ? 'رفع' : 'Upload'}
                        </button>
                      )}
                    </div>
                    
                    {/* National Address Document Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px',
                      background: statusInfo.nationalAddressDoc === 'approved' ? '#d1fae5' : statusInfo.nationalAddressDoc === 'rejected' ? '#fee2e2' : statusInfo.nationalAddressDoc === 'missing' ? '#fee2e2' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${statusInfo.nationalAddressDoc === 'approved' ? '#10b981' : statusInfo.nationalAddressDoc === 'rejected' || statusInfo.nationalAddressDoc === 'missing' ? '#ef4444' : '#f59e0b'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <i className={`fas ${statusInfo.nationalAddressDoc === 'approved' ? 'fa-check-circle' : statusInfo.nationalAddressDoc === 'rejected' || statusInfo.nationalAddressDoc === 'missing' ? 'fa-exclamation-circle' : 'fa-clock'}`}
                           style={{ 
                             color: statusInfo.nationalAddressDoc === 'approved' ? '#10b981' : statusInfo.nationalAddressDoc === 'rejected' || statusInfo.nationalAddressDoc === 'missing' ? '#ef4444' : '#f59e0b',
                             fontSize: '20px'
                           }}></i>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151', display: 'block' }}>
                            {lang === 'ar' ? 'مستند العنوان الوطني' : 'National Address Document'}
                          </span>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {statusInfo.nationalAddressDoc === 'approved' 
                              ? (lang === 'ar' ? '✓ معتمد' : '✓ Approved')
                              : statusInfo.nationalAddressDoc === 'rejected'
                              ? (lang === 'ar' ? '✗ مرفوض - يرجى إعادة الرفع' : '✗ Rejected - Please re-upload')
                              : statusInfo.nationalAddressDoc === 'missing'
                              ? (lang === 'ar' ? '✗ مفقود - يرجى رفع المستند' : '✗ Missing - Please upload document')
                              : (lang === 'ar' ? '⏳ قيد المراجعة' : '⏳ Under Review')
                            }
                          </span>
                        </div>
                      </div>
                      {(statusInfo.nationalAddressDoc === 'missing' || statusInfo.nationalAddressDoc === 'rejected') && (
                        <button 
                          onClick={() => navigate('/dashboard/profile')}
                          style={{
                            padding: '8px 16px',
                            background: '#073491',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: '12px'
                          }}
                        >
                          <i className="fas fa-upload"></i>
                          {lang === 'ar' ? 'رفع' : 'Upload'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {statusInfo.allApproved && (
                    <div style={{
                      marginTop: '20px',
                      padding: '14px',
                      background: '#dbeafe',
                      borderRadius: '8px',
                      color: '#1e40af',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: '1px solid #93c5fd'
                    }}>
                      <i className="fas fa-info-circle" style={{ fontSize: '16px' }}></i>
                      <span>
                        {lang === 'ar' 
                          ? 'جميع المتطلبات معتمدة. يتم إنشاء ملف PDF الآن. يرجى التحديث بعد لحظات.'
                          : 'All requirements are approved. PDF is being generated. Please refresh in a few moments.'
                        }
                      </span>
                    </div>
                  )}
                  
                  {!statusInfo.allApproved && statusInfo.missingItems && statusInfo.missingItems.length > 0 && (
                    <div style={{
                      marginTop: '20px',
                      padding: '14px',
                      background: '#fef3c7',
                      borderRadius: '8px',
                      color: '#92400e',
                      fontSize: '14px',
                      border: '1px solid #fcd34d'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                        <i className="fas fa-exclamation-triangle" style={{ fontSize: '16px', marginTop: '2px' }}></i>
                        <div>
                          <strong style={{ display: 'block', marginBottom: '6px' }}>
                            {lang === 'ar' ? 'إجراءات مطلوبة:' : 'Action Required:'}
                          </strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                            {statusInfo.missingItems.includes('contract') && (
                              <li>{lang === 'ar' ? 'انتظار اعتماد العقد من الإدارة' : 'Wait for contract approval from admin'}</li>
                            )}
                            {statusInfo.missingItems.includes('iban_doc') && (
                              <li>
                                {lang === 'ar' ? 'رفع مستند الآيبان' : 'Upload IBAN document'}
                                <button 
                                  onClick={() => navigate('/dashboard/profile')}
                                  style={{
                                    marginLeft: '8px',
                                    padding: '4px 10px',
                                    background: '#073491',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {lang === 'ar' ? 'رفع الآن' : 'Upload Now'}
                                </button>
                              </li>
                            )}
                            {statusInfo.missingItems.includes('national_address_doc') && (
                              <li>
                                {lang === 'ar' ? 'رفع مستند العنوان الوطني' : 'Upload National Address document'}
                                <button 
                                  onClick={() => navigate('/dashboard/profile')}
                                  style={{
                                    marginLeft: '8px',
                                    padding: '4px 10px',
                                    background: '#073491',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {lang === 'ar' ? 'رفع الآن' : 'Upload Now'}
                                </button>
                              </li>
                            )}
                            {statusInfo.missingItems.includes('iban_doc_pending') && (
                              <li>{lang === 'ar' ? 'مستند الآيبان قيد المراجعة' : 'IBAN document is under review'}</li>
                            )}
                            {statusInfo.missingItems.includes('national_address_doc_pending') && (
                              <li>{lang === 'ar' ? 'مستند العنوان الوطني قيد المراجعة' : 'National Address document is under review'}</li>
                            )}
                          </ul>
                        </div>
                      </div>
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #fcd34d' }}>
                        <button 
                          onClick={() => navigate('/dashboard/profile')}
                          style={{
                            padding: '10px 20px',
                            background: '#073491',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                        >
                          <i className="fas fa-user-edit"></i>
                          {lang === 'ar' ? 'الذهاب إلى الملف الشخصي لرفع المستندات' : 'Go to Profile to Upload Documents'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button className="btn btn-primary" onClick={checkPdfStatus} style={{ marginTop: '20px' }}>
                <i className="fas fa-redo"></i>
                {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {pdfUrl && !loading && !error && (
          <div className="pdf-container">
            <div className="pdf-viewer-wrapper">
              <iframe
                src={pdfUrl}
                className="pdf-viewer"
                title="Contractor Info PDF"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractInfoPage;
