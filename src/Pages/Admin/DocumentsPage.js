import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import RejectionDialog from '../../Components/RejectionDialog';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-documents-page.css';

const AdminDocumentsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending',
    type: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, last_page: 1 });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [documentToReject, setDocumentToReject] = useState(null);
  const [processingDocuments, setProcessingDocuments] = useState(new Set()); // Track documents being processed

  useEffect(() => {
    console.log('🚀 [MOUNT] AdminDocumentsPage component mounted', {
      timestamp: new Date().toISOString()
    });
  }, []);

  useEffect(() => {
    console.log('🔄 [EFFECT] Filters or page changed, fetching documents...', {
      filters,
      currentPage,
      timestamp: new Date().toISOString()
    });
    fetchDocuments();
  }, [filters, currentPage]);

  useEffect(() => {
    if (selectedDocument) {
      console.log('🔍 [PREVIEW] selectedDocument changed:', {
        id: selectedDocument.id,
        type: selectedDocument.type,
        status: selectedDocument.status,
        file_url: selectedDocument.file_url,
        showPreviewModal,
        timestamp: new Date().toISOString()
      });
    }
  }, [selectedDocument, showPreviewModal]);

  const fetchDocuments = async () => {
    console.log('📥 [FETCH] Starting to fetch documents...', {
      filters,
      currentPage,
      timestamp: new Date().toISOString()
    });
    
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      params.append('per_page', '20');
      params.append('page', currentPage.toString());

      const url = `${API_BASE_URL}/portallogistice/admin/documents?${params.toString()}`;
      console.log('📥 [FETCH] Request URL:', url);
      console.log('📥 [FETCH] Request params:', Object.fromEntries(params));

      const response = await axios.get(url, { headers });

      console.log('📥 [FETCH] Response received:', {
        success: response.data?.success,
        status: response.status,
        documentsCount: response.data?.data?.documents?.length || 0,
        pagination: response.data?.data?.pagination
      });

      if (response.data?.success) {
        const data = response.data.data;
        const documentsList = data.documents || [];
        
        console.log('📥 [FETCH] Documents list:', {
          total: documentsList.length,
          statuses: documentsList.reduce((acc, doc) => {
            acc[doc.status] = (acc[doc.status] || 0) + 1;
            return acc;
          }, {}),
          types: documentsList.reduce((acc, doc) => {
            acc[doc.type] = (acc[doc.type] || 0) + 1;
            return acc;
          }, {})
        });
        
        // Debug: Log documents without proper client info
        const documentsWithoutClientInfo = documentsList.filter(doc => 
          !(doc.national_id || doc.user?.national_id || doc.user_id || doc.user_name || doc.user?.name)
        );
        if (documentsWithoutClientInfo.length > 0) {
          console.warn('⚠️ [FETCH] Documents without client information:', documentsWithoutClientInfo.length);
          console.warn('⚠️ [FETCH] Sample document:', documentsWithoutClientInfo[0]);
        }
        
        console.log('📥 [FETCH] Setting documents state...', documentsList.length);
        setDocuments(documentsList);
        
        if (data.pagination) {
          console.log('📥 [FETCH] Setting pagination:', data.pagination);
          setPagination(data.pagination);
        }
        
        console.log('✅ [FETCH] Fetch completed successfully');
      } else {
        console.error('❌ [FETCH] Backend returned success: false', response.data);
      }
    } catch (error) {
      console.error('❌ [FETCH] Error fetching documents:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.documents.error.fetch'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      setLoading(false);
      console.log('📥 [FETCH] Loading state set to false');
    }
  };

  const handleApprove = async (documentId) => {
    console.log('✅ [APPROVE] Starting approval process...', {
      documentId,
      timestamp: new Date().toISOString(),
      currentFilters: filters,
      currentDocumentsCount: documents.length
    });

    // Prevent double-clicks
    if (processingDocuments.has(documentId)) {
      console.warn('⚠️ [APPROVE] Document already being processed:', documentId);
      return;
    }

    // Add to processing set
    setProcessingDocuments(prev => new Set(prev).add(documentId));

    // Optimistic UI update - remove document from list immediately if filter is pending
    if (filters.status === 'pending') {
      console.log('🔄 [APPROVE] Optimistically removing document from UI...');
      setDocuments(prevDocs => {
        const filtered = prevDocs.filter(doc => doc.id !== documentId);
        console.log('🔄 [APPROVE] Documents after optimistic update:', filtered.length);
        return filtered;
      });
    } else {
      // Update status optimistically
      console.log('🔄 [APPROVE] Optimistically updating document status...');
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId ? { ...doc, status: 'approved' } : doc
        )
      );
    }

    try {
      const headers = getAuthHeaders();
      const url = `${API_BASE_URL}/portallogistice/admin/documents/${documentId}/approve`;
      console.log('✅ [APPROVE] Sending request to:', url);

      const response = await axios.put(url, {}, { headers });
      
      console.log('✅ [APPROVE] Response received:', {
        success: response.data?.success,
        status: response.status,
        data: response.data
      });
      
      if (response.data?.success) {
        console.log('✅ [APPROVE] Approval successful! Refreshing documents list...');
        
        Store.addNotification({
          title: t('admin.success.title'),
          message: t('admin.documents.success.approved'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: { duration: 3000 }
        });
        
        // Close modal if open
        setShowPreviewModal(false);
        
        // Refresh documents list to get latest data
        await fetchDocuments();
        
        console.log('✅ [APPROVE] Process completed successfully');
      } else {
        // Backend returned success: false
        const errorMessage = response.data?.message_en || response.data?.message || t('admin.documents.error.approve');
        console.error('❌ [APPROVE] Backend returned success: false', {
          documentId,
          response: response.data,
          status: response.status,
          errorMessage
        });
        
        // Revert optimistic update
        console.log('🔄 [APPROVE] Reverting optimistic update...');
        await fetchDocuments();
        
        Store.addNotification({
          title: t('admin.error.title'),
          message: errorMessage,
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: { duration: 5000 }
        });
      }
    } catch (error) {
      console.error('❌ [APPROVE] Error occurred:', {
        documentId,
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        fullError: error
      });
      
      // Revert optimistic update
      console.log('🔄 [APPROVE] Reverting optimistic update due to error...');
      await fetchDocuments();
      
      // Get error message - prefer English if available, fallback to Arabic, then default
      let errorMessage = error.response?.data?.message_en || 
                        error.response?.data?.message || 
                        t('admin.documents.error.approve');
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('already approved') || 
          errorMessage.toLowerCase().includes('معتمد') ||
          error.response?.data?.message?.includes('معتمد')) {
        errorMessage = 'This document is already approved. Refreshing list...';
        console.log('ℹ️ [APPROVE] Document already approved, refreshing list...');
        await fetchDocuments();
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
      }
      
      Store.addNotification({
        title: t('admin.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      // Remove from processing set
      setProcessingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      console.log('✅ [APPROVE] Processing complete, removed from processing set');
    }
  };

  const handleReject = (documentId) => {
    console.log('🖱️ [REJECT] Reject button clicked, opening dialog for document:', documentId);
    setDocumentToReject(documentId);
    setShowRejectionDialog(true);
  };

  const handleConfirmRejection = async (rejectionReason, sendEmail) => {
    if (!documentToReject) {
      console.warn('⚠️ [REJECT] No document to reject');
      return;
    }

    console.log('❌ [REJECT] Starting rejection process...', {
      documentId: documentToReject,
      rejectionReason: rejectionReason?.substring(0, 50) + '...',
      sendEmail,
      timestamp: new Date().toISOString(),
      currentFilters: filters,
      currentDocumentsCount: documents.length
    });

    // Prevent double-clicks
    if (processingDocuments.has(documentToReject)) {
      console.warn('⚠️ [REJECT] Document already being processed:', documentToReject);
      return;
    }

    // Add to processing set
    setProcessingDocuments(prev => new Set(prev).add(documentToReject));

    // Optimistic UI update - remove document from list immediately if filter is pending
    if (filters.status === 'pending') {
      console.log('🔄 [REJECT] Optimistically removing document from UI...');
      setDocuments(prevDocs => {
        const filtered = prevDocs.filter(doc => doc.id !== documentToReject);
        console.log('🔄 [REJECT] Documents after optimistic update:', filtered.length);
        return filtered;
      });
    } else {
      // Update status optimistically
      console.log('🔄 [REJECT] Optimistically updating document status...');
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentToReject ? { ...doc, status: 'rejected' } : doc
        )
      );
    }

    try {
      const headers = getAuthHeaders();
      const url = `${API_BASE_URL}/portallogistice/admin/documents/${documentToReject}/reject`;
      const payload = { 
        rejection_reason: rejectionReason,
        send_email: sendEmail
      };
      
      console.log('❌ [REJECT] Sending request to:', url);
      console.log('❌ [REJECT] Request payload:', { ...payload, rejection_reason: payload.rejection_reason?.substring(0, 50) + '...' });

      const response = await axios.put(url, payload, { headers });
      
      console.log('❌ [REJECT] Response received:', {
        success: response.data?.success,
        status: response.status,
        data: response.data
      });
      
      if (response.data?.success) {
        console.log('❌ [REJECT] Rejection successful! Refreshing documents list...');
        
        Store.addNotification({
          title: t('admin.success.title'),
          message: t('admin.documents.success.rejected'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: { duration: 3000 }
        });
        
        // Close modals
        setShowPreviewModal(false);
        setShowRejectionDialog(false);
        const rejectedDocId = documentToReject;
        setDocumentToReject(null);
        
        // Refresh documents list to get latest data
        await fetchDocuments();
        
        console.log('❌ [REJECT] Process completed successfully');
      } else {
        // Backend returned success: false
        const errorMessage = response.data?.message_en || response.data?.message || t('admin.documents.error.reject');
        console.error('❌ [REJECT] Backend returned success: false', {
          documentId: documentToReject,
          response: response.data,
          status: response.status,
          errorMessage
        });
        
        // Revert optimistic update
        console.log('🔄 [REJECT] Reverting optimistic update...');
        await fetchDocuments();
        
        Store.addNotification({
          title: t('admin.error.title'),
          message: errorMessage,
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: { duration: 5000 }
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [REJECT] Error occurred:', {
        documentId: documentToReject,
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        fullError: error
      });
      
      // Revert optimistic update
      console.log('🔄 [REJECT] Reverting optimistic update due to error...');
      await fetchDocuments();
      
      // Get error message - prefer English if available, fallback to Arabic, then default
      let errorMessage = error.response?.data?.message_en || 
                        error.response?.data?.message || 
                        t('admin.documents.error.reject');
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('already rejected') || 
          errorMessage.toLowerCase().includes('مرفوض') ||
          error.response?.data?.message?.includes('مرفوض')) {
        errorMessage = 'This document is already rejected. Refreshing list...';
        console.log('ℹ️ [REJECT] Document already rejected, refreshing list...');
        await fetchDocuments();
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
      }
      
      Store.addNotification({
        title: t('admin.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
      throw error; // Re-throw to let dialog handle it
    } finally {
      // Remove from processing set
      setProcessingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentToReject);
        return newSet;
      });
      console.log('❌ [REJECT] Processing complete, removed from processing set');
    }
  };

  const openPreview = (document) => {
    console.log('🔍 [PREVIEW] openPreview called with document:', {
      id: document?.id,
      type: document?.type,
      status: document?.status,
      file_url: document?.file_url,
      mime_type: document?.mime_type,
      file_name: document?.file_name,
      user_name: document?.user_name,
      timestamp: new Date().toISOString()
    });
    setSelectedDocument(document);
    setShowPreviewModal(true);
  };

  // Group documents by client (user)
  const groupDocumentsByClient = (documentsList) => {
    const grouped = {};
    documentsList.forEach(doc => {
      // Use national_id as primary key for grouping (most reliable)
      // Fallback to user_id, then create unique key per document if no client info
      const clientId = doc.national_id || 
                      doc.user?.national_id || 
                      doc.user_id || 
                      (doc.user_name ? `name_${doc.user_name.replace(/\s+/g, '_')}` : null) ||
                      `doc_${doc.id}`; // Use document ID as fallback to prevent grouping
      
      // Get client name with better fallback logic
      const clientName = doc.user_name || 
                        doc.user?.name || 
                        (doc.user?.first_name && doc.user?.family_name 
                          ? `${doc.user.first_name} ${doc.user.family_name}` 
                          : null) ||
                        doc.applicant_name || 
                        doc.full_name || 
                        (doc.user_id ? `Client ID: ${doc.user_id}` : `Document #${doc.id}`);
      
      // Check if document has proper client identification
      const hasProperClientInfo = !!(doc.national_id || doc.user?.national_id || doc.user_id || doc.user_name || doc.user?.name);
      
      if (!grouped[clientId]) {
        grouped[clientId] = {
          client: {
            id: clientId,
            name: clientName,
            national_id: doc.national_id || doc.user?.national_id,
            email: doc.user?.email || doc.email,
            phone: doc.user?.phone || doc.phone,
            hasProperInfo: hasProperClientInfo
          },
          documents: []
        };
      }
      grouped[clientId].documents.push(doc);
    });
    return grouped;
  };

  const toggleClientExpansion = (clientId) => {
    console.log('🖱️ [UI] Toggling client expansion:', clientId);
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
        console.log('🖱️ [UI] Collapsed client:', clientId);
      } else {
        newSet.add(clientId);
        console.log('🖱️ [UI] Expanded client:', clientId);
      }
      return newSet;
    });
  };

  if (loading && documents.length === 0) {
    return (
      <div className="admin-page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="admin-documents-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.sidebar.documents')}</h1>
          <p className="admin-page-subtitle">{t('admin.documents.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters-section">
        <div className="admin-filters-grid">
          <input
            type="text"
            className="admin-filter-input"
            placeholder={t('admin.documents.search_placeholder')}
            value={filters.search}
            onChange={(e) => {
              console.log('🔍 [FILTER] Search filter changed:', e.target.value);
              setFilters({ ...filters, search: e.target.value });
            }}
          />
          <select
            className="admin-filter-select"
            value={filters.status}
            onChange={(e) => {
              console.log('🔍 [FILTER] Status filter changed:', e.target.value);
              setFilters({ ...filters, status: e.target.value });
            }}
          >
            <option value="all">{t('admin.documents.filter.all')}</option>
            <option value="pending">{t('admin.documents.filter.pending')}</option>
            <option value="approved">{t('admin.documents.filter.approved')}</option>
            <option value="rejected">{t('admin.documents.filter.rejected')}</option>
          </select>
          <select
            className="admin-filter-select"
            value={filters.type}
            onChange={(e) => {
              console.log('🔍 [FILTER] Type filter changed:', e.target.value);
              setFilters({ ...filters, type: e.target.value });
            }}
          >
            <option value="all">{t('admin.documents.filter.all_types')}</option>
            <option value="iban_doc">{t('admin.documents.filter.iban')}</option>
            <option value="national_address_doc">{t('admin.documents.filter.national_address')}</option>
            <option value="receipt">{t('admin.documents.filter.receipt')}</option>
          </select>
        </div>
      </div>

      {/* Documents Grouped by Client */}
      <div className="documents-by-client-container">
        {documents.length > 0 ? (
          Object.entries(groupDocumentsByClient(documents)).map(([clientId, clientData]) => {
            const isExpanded = expandedUsers.has(clientId);
            const documentCount = clientData.documents.length;
            
            return (
              <div key={clientId} className="client-documents-group">
                <div 
                  className={`client-documents-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleClientExpansion(clientId)}
                >
                  <div className="client-info">
                    <div className="client-name-section">
                      <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} expand-icon`}></i>
                      <div className="client-details">
                        <h3 className="client-name">
                          {clientData.client.name}
                          {!clientData.client.hasProperInfo && (
                            <span style={{ 
                              marginLeft: '8px', 
                              color: '#f59e0b', 
                              fontSize: '14px',
                              fontWeight: 'normal'
                            }} title="Missing client information">
                              <i className="fas fa-exclamation-triangle"></i>
                            </span>
                          )}
                        </h3>
                        <div className="client-meta">
                          {clientData.client.national_id && (
                            <span className="client-id">{t('national_id')}: {clientData.client.national_id}</span>
                          )}
                          {clientData.client.email && <span className="client-email">{clientData.client.email}</span>}
                          {clientData.client.phone && <span className="client-phone">{clientData.client.phone}</span>}
                          {!clientData.client.hasProperInfo && (
                            <span style={{ 
                              color: '#f59e0b', 
                              fontSize: '12px',
                              fontStyle: 'italic'
                            }}>
                              ⚠️ Client information missing
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="client-stats">
                      <span className="document-count-badge">
                        {documentCount} {documentCount === 1 ? t('admin.documents.document') : t('admin.documents.documents')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="client-documents-content">
                    <div className="admin-documents-grid">
                      {clientData.documents.map((doc) => (
                        <div key={doc.id} className="admin-document-card">
                          <div className="admin-document-header">
                            <div className="admin-document-icon">
                              <i className={`fas ${doc.type === 'receipt' ? 'fa-receipt' : 'fa-file-alt'}`}></i>
                            </div>
                            <div className="admin-document-info">
                              <h4>{doc.type_name || doc.type}</h4>
                              <p>{doc.file_name || doc.type}</p>
                              {doc.uploaded_at && (
                                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <span className={`admin-status-badge status-${doc.status}`}>
                              {doc.status}
                            </span>
                          </div>
                          <div className="admin-document-actions">
                            <button className="admin-action-btn view" onClick={() => openPreview(doc)}>
                              <i className="fas fa-eye"></i> {t('admin.documents.preview')}
                            </button>
                            {doc.status === 'pending' && (
                              <>
                                <button
                                  className="admin-action-btn approve"
                                  onClick={() => {
                                    console.log('🖱️ [UI] Approve button clicked for document:', doc.id);
                                    handleApprove(doc.id);
                                  }}
                                  disabled={processingDocuments.has(doc.id)}
                                >
                                  {processingDocuments.has(doc.id) ? (
                                    <>
                                      <i className="fas fa-spinner fa-spin"></i> {t('admin.documents.processing') || 'Processing...'}
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-check"></i> {t('admin.documents.approve')}
                                    </>
                                  )}
                                </button>
                                <button
                                  className="admin-action-btn reject"
                                  onClick={() => {
                                    console.log('🖱️ [UI] Reject button clicked for document:', doc.id);
                                    handleReject(doc.id);
                                  }}
                                  disabled={processingDocuments.has(doc.id)}
                                >
                                  {processingDocuments.has(doc.id) ? (
                                    <>
                                      <i className="fas fa-spinner fa-spin"></i> {t('admin.documents.processing') || 'Processing...'}
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-times"></i> {t('admin.documents.reject')}
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="admin-empty-state">
            <i className="fas fa-file-alt"></i>
            <p>{t('admin.documents.empty')}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <i className="fas fa-chevron-right"></i> {t('admin.pagination.previous')}
          </button>
          <span className="admin-page-info">
            {t('admin.pagination.page')} {currentPage} {t('admin.pagination.of')} {pagination.last_page}
          </span>
          <button
            className="admin-page-btn"
            disabled={currentPage === pagination.last_page}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            {t('admin.pagination.next')} <i className="fas fa-chevron-left"></i>
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="admin-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{t('admin.documents.document_preview')}</h3>
              <button className="admin-modal-close" onClick={() => setShowPreviewModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-document-preview">
                {selectedDocument.file_url ? (
                  (() => {
                    console.log('🔍 [PREVIEW] Rendering preview for:', selectedDocument.file_url);
                    const fileUrl = selectedDocument.file_url.toLowerCase();
                    const mimeType = selectedDocument.mime_type?.toLowerCase() || '';
                    console.log('🔍 [PREVIEW] fileUrl (lowercase):', fileUrl);
                    console.log('🔍 [PREVIEW] mimeType:', mimeType);
                    
                    // Check if it's a PDF by extension or mime type
                    const isPdf = fileUrl.includes('.pdf') || mimeType === 'application/pdf';
                    console.log('🔍 [PREVIEW] isPdf detection:', isPdf);
                    console.log('🔍 [PREVIEW] - fileUrl.includes(".pdf"):', fileUrl.includes('.pdf'));
                    console.log('🔍 [PREVIEW] - mimeType === "application/pdf":', mimeType === 'application/pdf');
                    
                    if (isPdf) {
                      console.log('✅ [PREVIEW] Rendering PDF with iframe, URL:', selectedDocument.file_url);
                      // PDF: Use iframe
                      return (
                        <div style={{
                          width: '100%',
                          height: '70vh',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#f9fafb'
                        }}>
                          <iframe
                            src={selectedDocument.file_url}
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Document preview"
                            onLoad={() => console.log('✅ [PREVIEW] Iframe loaded successfully')}
                            onError={(e) => console.error('❌ [PREVIEW] Iframe error:', e)}
                          />
                        </div>
                      );
                    } else {
                      console.log('🖼️ [PREVIEW] Rendering image with img tag, URL:', selectedDocument.file_url);
                      // Image: Use img tag
                      return (
                        <div style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#f9fafb',
                          padding: '20px',
                          minHeight: '400px'
                        }}>
                          <img 
                            src={selectedDocument.file_url} 
                            alt="Document preview"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '70vh',
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }}
                            onLoad={() => console.log('✅ [PREVIEW] Image loaded successfully')}
                            onError={(e) => console.error('❌ [PREVIEW] Image error:', e)}
                          />
                        </div>
                      );
                    }
                  })()
                ) : (
                  (() => {
                    console.log('⚠️ [PREVIEW] No file_url found. selectedDocument:', selectedDocument);
                    return (
                      <div className="admin-document-preview-placeholder">
                        <i className="fas fa-file-alt"></i>
                        <p>{t('admin.documents.no_preview')}</p>
                      </div>
                    );
                  })()
                )}
              </div>
              {selectedDocument.status === 'pending' && (
                <div className="admin-document-review">
                  <div className="admin-modal-actions">
                    <button
                      className="admin-action-btn approve"
                      onClick={() => {
                        console.log('🖱️ [UI] Approve button clicked in modal for document:', selectedDocument.id);
                        handleApprove(selectedDocument.id);
                      }}
                      disabled={processingDocuments.has(selectedDocument.id)}
                    >
                      {processingDocuments.has(selectedDocument.id) ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> {t('admin.documents.processing') || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check"></i> {t('admin.documents.approve')}
                        </>
                      )}
                    </button>
                    <button
                      className="admin-action-btn reject"
                      onClick={() => {
                        console.log('🖱️ [UI] Reject button clicked in modal for document:', selectedDocument.id);
                        handleReject(selectedDocument.id);
                      }}
                      disabled={processingDocuments.has(selectedDocument.id)}
                    >
                      {processingDocuments.has(selectedDocument.id) ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> {t('admin.documents.processing') || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-times"></i> {t('admin.documents.reject')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Dialog */}
      <RejectionDialog
        isOpen={showRejectionDialog}
        onClose={() => {
          setShowRejectionDialog(false);
          setDocumentToReject(null);
        }}
        onConfirm={handleConfirmRejection}
        title={t('admin.documents.reject_document') || 'Reject Document'}
        type="document"
      />
    </div>
  );
};

export default AdminDocumentsPage;
