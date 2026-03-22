import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import RejectionDialog from './RejectionDialog';
import { API_BASE_URL, API_ORIGIN } from '../config';

const ContractManagement = () => {
  const { t } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'waiting_receipt', 'receipt_received', 'approved', 'denied', 'all'
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 15, last_page: 1 });
  const [tabCounts, setTabCounts] = useState({
    pending: 0,
    waiting_receipt: 0,
    receipt_received: 0,
    approved: 0,
    denied: 0,
    all: 0
  });
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [contractSettings, setContractSettings] = useState({
    motor_year: '',
    motor_model: '',
    rental_ownership_percentage: ''
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [receiptDocument, setReceiptDocument] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [contractToReject, setContractToReject] = useState(null);
  const [receiptDocumentId, setReceiptDocumentId] = useState(null);
  const [receiptToReject, setReceiptToReject] = useState(null);
  const [showReceiptRejectionDialog, setShowReceiptRejectionDialog] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('contract_type', filterType);
      
      // Tab-based filtering
      switch (activeTab) {
        case 'pending':
          params.append('status', 'pending');
          break;
        case 'waiting_receipt':
          params.append('status', 'approved');
          params.append('receipt_status', 'pending');
          break;
        case 'receipt_received':
          params.append('status', 'approved');
          params.append('receipt_status', 'uploaded');
          break;
        case 'approved':
          params.append('status', 'approved');
          break;
        case 'denied':
          params.append('status', 'denied');
          break;
        case 'all':
          // No status filter
          break;
        default:
          break;
      }
      
      params.append('per_page', '15');
      params.append('page', currentPage.toString());

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/contracts?${params.toString()}`,
        { headers }
      );

      if (response.data.success) {
        setContracts(response.data.data.data || []);
        setPagination({
          total: response.data.data.total || 0,
          per_page: response.data.data.per_page || 15,
          last_page: response.data.data.last_page || 1,
          current_page: response.data.data.current_page || 1
        });
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.fetch_contracts'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeTab, filterType, currentPage, getAuthHeaders, t]);

  // Fetch tab counts
  const fetchTabCounts = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const counts = {};
      
      const tabs = [
        { key: 'pending', params: { status: 'pending', per_page: 1 } },
        { key: 'waiting_receipt', params: { status: 'approved', receipt_status: 'pending', per_page: 1 } },
        { key: 'receipt_received', params: { status: 'approved', receipt_status: 'uploaded', per_page: 1 } },
        { key: 'approved', params: { status: 'approved', per_page: 1 } },
        { key: 'denied', params: { status: 'denied', per_page: 1 } },
        { key: 'all', params: { per_page: 1 } }
      ];

      const promises = tabs.map(async (tab) => {
        try {
          const params = new URLSearchParams();
          Object.entries(tab.params).forEach(([key, value]) => {
            params.append(key, value);
          });
          const response = await axios.get(
            `${API_BASE_URL}/portallogistice/admin/contracts?${params.toString()}`,
            { headers }
          );
          if (response.data.success) {
            counts[tab.key] = response.data.data.total || 0;
          } else {
            counts[tab.key] = 0;
          }
        } catch (error) {
          counts[tab.key] = 0;
        }
      });

      await Promise.all(promises);
      setTabCounts(counts);
    } catch (error) {
      console.error('Error fetching tab counts:', error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  // Calculate hours remaining until receipt deadline
  const getHoursRemaining = (contract) => {
    if (!contract.receipt_upload_deadline || contract.receipt_uploaded_at) {
      return null;
    }
    const deadline = new Date(contract.receipt_upload_deadline);
    const now = new Date();
    const diffMs = deadline - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours > 0 ? diffHours : 0;
  };

  const handleViewContract = async (contractId) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/contracts/${contractId}`,
        { headers }
      );

      console.log('🔍 [CONTRACT] Full API response:', response.data);
      
      if (response.data.success) {
        // Handle different response structures
        const contractData = response.data.data.contract || response.data.data;
        
        console.log('🔍 [CONTRACT] Contract data received:', contractData);
        console.log('🔍 [CONTRACT] User data check:', {
          full_name: contractData.full_name,
          email: contractData.email,
          phone: contractData.phone,
          user: contractData.user,
          applicant_name: contractData.applicant_name,
          user_name: contractData.user_name
        });
        
        // If user data is missing, try to fetch it from user endpoint
        if (!contractData.email && !contractData.phone && contractData.national_id) {
          console.log('⚠️ [CONTRACT] Missing user data, attempting to fetch user info...');
          try {
            const userResponse = await axios.get(
              `${API_BASE_URL}/portallogistice/admin/users/${contractData.national_id}`,
              { headers }
            );
            if (userResponse.data?.success && userResponse.data.data?.user) {
              contractData.user = userResponse.data.data.user;
              contractData.full_name = contractData.full_name || contractData.user.full_name;
              contractData.email = contractData.email || contractData.user.email;
              contractData.phone = contractData.phone || contractData.user.phone;
              console.log('✅ [CONTRACT] User data fetched and merged:', contractData.user);
            }
          } catch (userError) {
            console.error('❌ [CONTRACT] Failed to fetch user data:', userError);
          }
        }
        
        setSelectedContract(contractData);
        setShowContractModal(true);
        
        // Check if contract already has receipt info in response
        if (contractData.payment_receipt_path || contractData.receipt_file_url) {
          // Receipt info already in contract data
          setReceiptDocument({
            file_url: contractData.receipt_file_url || 
                     (contractData.payment_receipt_path?.startsWith('http') 
                       ? contractData.payment_receipt_path 
                       : `${API_ORIGIN}${contractData.payment_receipt_path}`)
          });
          setLoadingReceipt(false);
        } else if (contractData.receipt_upload_status === 'uploaded' || contractData.receipt_uploaded_at) {
          // Fetch receipt document from documents endpoint
          fetchReceiptDocument(contractId, headers);
        } else {
          setReceiptDocument(null);
          setReceiptDocumentId(null);
          setLoadingReceipt(false);
        }
      }
    } catch (error) {
      console.error('❌ [CONTRACT] Error fetching contract:', error);
      console.error('❌ [CONTRACT] Error response:', error.response?.data);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.fetch_contract'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    }
  };

  // Helper function to fetch receipt document without setting loading state (for filtering)
  const fetchReceiptDocumentForContract = async (contractId, headers) => {
    try {
      // Try multiple approaches to find the receipt
      let response;
      let receipt = null;
      
      // Approach 1: Try with contract_id query parameter (if backend supports it)
      try {
        response = await axios.get(
          `${API_BASE_URL}/portallogistice/admin/documents?type=receipt&contract_id=${contractId}`,
          { headers }
        );
        
        if (response.data?.success && response.data.data?.documents) {
          const receipts = Array.isArray(response.data.data.documents) 
            ? response.data.data.documents 
            : [];
          if (receipts.length > 0) {
            receipt = receipts[0];
          }
        }
      } catch (err) {
        // Continue to next approach
      }
      
      // Approach 2: Fetch all receipts and filter client-side
      if (!receipt) {
        try {
          response = await axios.get(
            `${API_BASE_URL}/portallogistice/admin/documents?type=receipt`,
            { headers }
          );
          
          if (response.data?.success && response.data.data?.documents) {
            const receipts = Array.isArray(response.data.data.documents) 
              ? response.data.data.documents 
              : [];
            
            receipt = receipts.find(doc => {
              const matchesContractId = doc.contract_id === contractId || 
                                       doc.contract_id === parseInt(contractId) ||
                                       doc.contract_id === String(contractId);
              return doc.type === 'receipt' && matchesContractId;
            });
          }
        } catch (err) {
          console.error('Error fetching receipts:', err);
        }
      }
      
      // Approach 3: Try without type filter (get all documents)
      if (!receipt) {
        try {
          response = await axios.get(
            `${API_BASE_URL}/portallogistice/admin/documents`,
            { headers }
          );
          
          if (response.data?.success && response.data.data?.documents) {
            const allDocs = Array.isArray(response.data.data.documents) 
              ? response.data.data.documents 
              : [];
            
            receipt = allDocs.find(doc => {
              const matchesContractId = doc.contract_id === contractId || 
                                       doc.contract_id === parseInt(contractId) ||
                                       doc.contract_id === String(contractId);
              return doc.type === 'receipt' && matchesContractId;
            });
          }
        } catch (err) {
          console.error('Error fetching all documents:', err);
        }
      }
      
      if (receipt) {
        // Ensure file_url is properly formatted
        if (!receipt.file_url && receipt.file_path) {
          receipt.file_url = receipt.file_path.startsWith('http') 
            ? receipt.file_path 
            : `${API_ORIGIN}${receipt.file_path}`;
        }
      }
      
      return receipt;
    } catch (error) {
      console.error('Error fetching receipt document:', error);
      return null;
    }
  };

  const fetchReceiptDocument = async (contractId, headers) => {
    setLoadingReceipt(true);
    try {
      const receipt = await fetchReceiptDocumentForContract(contractId, headers);
      if (receipt) {
        setReceiptDocument(receipt);
        setReceiptDocumentId(receipt.id);
      } else {
        setReceiptDocument(null);
        setReceiptDocumentId(null);
      }
    } catch (error) {
      console.error('Error fetching receipt document:', error);
      setReceiptDocument(null);
      setReceiptDocumentId(null);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleApproveDeny = async (contractId, approve) => {
    if (!approve) {
      // Show rejection dialog for denial
      setContractToReject(contractId);
      setShowRejectionDialog(true);
      return;
    }

    // Handle approval
    try {
      const headers = getAuthHeaders();
      const requestBody = { status: 1 };
      
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/admin/contracts/${contractId}/status`,
        requestBody,
        { 
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.success.contract_approved'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        fetchContracts();
        if (showContractModal) {
          setShowContractModal(false);
        }
      }
    } catch (error) {
      console.error('Contract approval error:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.update_contract'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    }
  };

  const handleConfirmRejection = async (denialReason, sendEmail) => {
    if (!contractToReject) return;

    try {
      const headers = getAuthHeaders();
      const requestBody = { 
        status: 0,
        denial_reason: denialReason,
        send_email: sendEmail
      };
      
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/admin/contracts/${contractToReject}/status`,
        requestBody,
        { 
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.success.contract_denied'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        
        // Optimistically remove the contract from current list if we're on pending tab
        if (activeTab === 'pending') {
          setContracts(prevContracts => prevContracts.filter(c => c.id !== contractToReject));
        }
        
        // If we're on pending tab, switch to denied tab to show the rejected contract
        if (activeTab === 'pending') {
          setActiveTab('denied');
          setCurrentPage(1);
        }
        
        // Refresh contracts list
        fetchContracts();
        
        // Also refresh tab counts
        fetchTabCounts();
        
        if (showContractModal) {
          setShowContractModal(false);
        }
        setShowRejectionDialog(false);
        setContractToReject(null);
      }
    } catch (error) {
      console.error('Contract rejection error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          (error.response?.status === 500 
                            ? 'Internal server error. Please check backend logs.' 
                            : t('admin.error.update_contract'));

      Store.addNotification({
        title: t('admin.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      throw error; // Re-throw to let dialog handle it
    }
  };

  const handleApproveReceipt = async (receiptDocumentId) => {
    if (!receiptDocumentId) return;

    try {
      const headers = getAuthHeaders();
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/admin/documents/${receiptDocumentId}/approve`,
        {},
        { headers }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: t('admin.documents.success.approved') || 'Receipt approved successfully',
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        
        // Refresh receipt document status
        if (selectedContract?.id) {
          const headers = getAuthHeaders();
          await fetchReceiptDocument(selectedContract.id, headers);
        }
        
        // Refresh contracts list and tab counts
        fetchContracts();
        fetchTabCounts();
      }
    } catch (error) {
      console.error('Receipt approval error:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.documents.error.approve') || 'Failed to approve receipt',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    }
  };

  const handleRejectReceipt = (receiptDocumentId) => {
    setReceiptToReject(receiptDocumentId);
    setShowReceiptRejectionDialog(true);
  };

  const handleConfirmReceiptRejection = async (rejectionReason, sendEmail) => {
    if (!receiptToReject) return;

    try {
      const headers = getAuthHeaders();
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/admin/documents/${receiptToReject}/reject`,
        { 
          rejection_reason: rejectionReason,
          send_email: sendEmail
        },
        { headers }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: t('admin.documents.success.rejected') || 'Receipt rejected successfully',
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        
        // Refresh receipt document status
        if (selectedContract?.id) {
          const headers = getAuthHeaders();
          await fetchReceiptDocument(selectedContract.id, headers);
        }
        
        // Refresh contracts list and tab counts
        fetchContracts();
        fetchTabCounts();
        
        setShowReceiptRejectionDialog(false);
        setReceiptToReject(null);
      }
    } catch (error) {
      console.error('Receipt rejection error:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.documents.error.reject') || 'Failed to reject receipt',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      throw error; // Re-throw to let dialog handle it
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!window.confirm(t('admin.contracts.confirm_delete'))) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      const response = await axios.delete(
        `${API_BASE_URL}/portallogistice/admin/contracts/${contractId}`,
        { headers }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.success.contract_deleted'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        fetchContracts();
        if (showContractModal) {
          setShowContractModal(false);
        }
      }
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.delete_contract'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    }
  };

  const handleDownload = (contract) => {
    if (contract.contract_download_url) {
      window.open(contract.contract_download_url, '_blank');
    }
  };

  const handleOpenSettings = async () => {
    setShowSettingsModal(true);
    await fetchContractSettings();
  };

  const fetchContractSettings = async () => {
    setLoadingSettings(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/contract-settings`,
        { headers }
      );

      if (response.data.success) {
        setContractSettings({
          motor_year: response.data.data.motor_year || '2024',
          motor_model: response.data.data.motor_model || 'بايك صيني',
          rental_ownership_percentage: response.data.data.rental_ownership_percentage || '100'
        });
      }
    } catch (error) {
      console.error('Error fetching contract settings:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.fetch_settings'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      // Set defaults on error
      setContractSettings({
        motor_year: '2024',
        motor_model: 'بايك صيني',
        rental_ownership_percentage: '100'
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/admin/contract-settings/update`,
        contractSettings,
        { headers }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.success.settings_updated'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        setShowSettingsModal(false);
      }
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.update_settings'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSettingsChange = (field, value) => {
    setContractSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Group contracts by user
  const groupContractsByUser = (contractsList) => {
    const grouped = {};
    contractsList.forEach(contract => {
      const userId = contract.national_id || contract.user_id || 'unknown';
      if (!grouped[userId]) {
        grouped[userId] = {
          user: {
            national_id: contract.national_id,
            name: contract.applicant_name || contract.user_name || contract.full_name || 'Unknown User',
            email: contract.email,
            phone: contract.phone
          },
          contracts: []
        };
      }
      grouped[userId].contracts.push(contract);
    });
    return grouped;
  };

  const toggleUserExpansion = (userId) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (loading && contracts.length === 0) {
    return (
      <div className="admin-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="contract-management">
      <div className="management-header">
        <h2>{t('admin.contracts.title')}</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="action-btn"
            onClick={handleOpenSettings}
            id="edit-template-btn"
            style={{
              background: '#073491',
              color: '#ffffff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: '"Cairo", sans-serif',
              transition: 'background 0.3s ease',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              minWidth: 'auto'
            }}
            onMouseOver={(e) => e.target.style.background = '#052a6e'}
            onMouseOut={(e) => e.target.style.background = '#073491'}
          >
            {t('admin.contracts.edit_template') || 'Edit Template Contracts'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="contract-tabs">
        <button
          className={`contract-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => handleTabChange('pending')}
        >
          {t('admin.contracts.tabs.pending')}
          {tabCounts.pending > 0 && (
            <span className="tab-badge">{tabCounts.pending}</span>
          )}
        </button>
        <button
          className={`contract-tab ${activeTab === 'waiting_receipt' ? 'active' : ''}`}
          onClick={() => handleTabChange('waiting_receipt')}
        >
          {t('admin.contracts.tabs.waiting_receipt')}
          {tabCounts.waiting_receipt > 0 && (
            <span className={`tab-badge ${contracts.some(c => c.receipt_upload_status === 'overdue') ? 'urgent' : ''}`}>
              {tabCounts.waiting_receipt}
            </span>
          )}
        </button>
        <button
          className={`contract-tab ${activeTab === 'receipt_received' ? 'active' : ''}`}
          onClick={() => handleTabChange('receipt_received')}
        >
          {t('admin.contracts.tabs.receipt_received')}
          {tabCounts.receipt_received > 0 && (
            <span className="tab-badge">{tabCounts.receipt_received}</span>
          )}
        </button>
        <button
          className={`contract-tab ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => handleTabChange('approved')}
        >
          {t('admin.contracts.tabs.approved')}
          {tabCounts.approved > 0 && (
            <span className="tab-badge">{tabCounts.approved}</span>
          )}
        </button>
        <button
          className={`contract-tab ${activeTab === 'denied' ? 'active' : ''}`}
          onClick={() => handleTabChange('denied')}
        >
          {t('admin.contracts.tabs.denied')}
          {tabCounts.denied > 0 && (
            <span className="tab-badge">{tabCounts.denied}</span>
          )}
        </button>
        <button
          className={`contract-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          {t('admin.contracts.tabs.all')}
          {tabCounts.all > 0 && (
            <span className="tab-badge">{tabCounts.all}</span>
          )}
        </button>
      </div>

      {/* Search and Type Filter */}
      <div className="filters" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={t('admin.contracts.search_placeholder')}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filterType}
          onChange={(e) => handleTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">{t('admin.contracts.filter.all_types')}</option>
          <option value="selling">{t('contract_type_sale')}</option>
          <option value="rental">{t('contract_type_rental')}</option>
        </select>
      </div>

      {contracts.length === 0 ? (
        <div className="empty-state">
          <p>{t('admin.contracts.empty')}</p>
        </div>
      ) : (
        <>
          <div className="contracts-by-user-container">
            {Object.entries(groupContractsByUser(contracts)).map(([userId, userData]) => {
              const isExpanded = expandedUsers.has(userId);
              const contractCount = userData.contracts.length;
              
              return (
                <div key={userId} className="user-contracts-group">
                  <div 
                    className={`user-contracts-header ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleUserExpansion(userId)}
                  >
                    <div className="user-info">
                      <div className="user-name-section">
                        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} expand-icon`}></i>
                        <div className="user-details">
                          <h3 className="user-name">{userData.user.name}</h3>
                          <div className="user-meta">
                            <span className="user-id">{t('national_id')}: {userData.user.national_id || userId}</span>
                            {userData.user.email && <span className="user-email">{userData.user.email}</span>}
                            {userData.user.phone && <span className="user-phone">{userData.user.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="user-stats">
                        <span className="contract-count-badge">
                          {contractCount} {contractCount === 1 ? t('admin.contracts.contract') : t('admin.contracts.contracts')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="user-contracts-content">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{t('admin.contracts.tracking_id')}</th>
                            <th>{t('dashboard.contract.type')}</th>
                            <th>{t('dashboard.contract.status')}</th>
                            <th>{t('dashboard.contract.amount')}</th>
                            <th>{t('dashboard.contract.application_date')}</th>
                            <th>{t('admin.contracts.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.contracts.map((contract) => (
                            <tr key={contract.id}>
                              <td>{contract.id}</td>
                              <td>{contract.contract_type_ar || contract.contract_type}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span className={`status-badge status-${contract.status}`}>
                                    {contract.status_ar || contract.status}
                                  </span>
                                  {contract.receipt_upload_status && (
                                    <span className={`receipt-status-badge receipt-${contract.receipt_upload_status}`}>
                                      {contract.receipt_upload_status === 'pending' && t('admin.contracts.receipt_status.pending')}
                                      {contract.receipt_upload_status === 'uploaded' && t('admin.contracts.receipt_status.uploaded')}
                                      {contract.receipt_upload_status === 'overdue' && t('admin.contracts.receipt_status.overdue')}
                                    </span>
                                  )}
                                  {activeTab === 'waiting_receipt' && contract.receipt_upload_deadline && !contract.receipt_uploaded_at && (
                                    <span className="deadline-countdown" style={{ fontSize: '11px', color: contract.receipt_upload_status === 'overdue' ? '#ef4444' : '#f59e0b' }}>
                                      {contract.receipt_upload_status === 'overdue' 
                                        ? t('admin.contracts.receipt_status.overdue')
                                        : `${getHoursRemaining(contract)} ${t('admin.contracts.receipt_status.hours_remaining')}`
                                      }
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{contract.amount} {t('dashboard.currency')}</td>
                              <td>{contract.application_date || '-'}</td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="action-btn view-btn"
                                    onClick={() => handleViewContract(contract.id)}
                                    title={t('admin.contracts.view')}
                                  >
                                    {t('admin.contracts.view')}
                                  </button>
                                  {contract.status === 'pending' && (
                                    <>
                                      <button
                                        className="action-btn approve-btn"
                                        onClick={() => handleApproveDeny(contract.id, true)}
                                        title={t('admin.contracts.approve')}
                                      >
                                        {t('admin.contracts.approve')}
                                      </button>
                                      <button
                                        className="action-btn deny-btn"
                                        onClick={() => handleApproveDeny(contract.id, false)}
                                        title={t('admin.contracts.deny')}
                                      >
                                        {t('admin.contracts.deny')}
                                      </button>
                                    </>
                                  )}
                                  {activeTab === 'receipt_received' && contract.receipt_upload_status === 'uploaded' && (
                                    <>
                                      <button
                                        className="action-btn approve-btn"
                                        onClick={async () => {
                                          try {
                                            const headers = getAuthHeaders();
                                            const receiptDoc = await fetchReceiptDocumentForContract(contract.id, headers);
                                            if (receiptDoc && receiptDoc.status === 'pending' && receiptDoc.id) {
                                              await handleApproveReceipt(receiptDoc.id);
                                              fetchContracts();
                                            } else if (receiptDoc && receiptDoc.status === 'approved') {
                                              Store.addNotification({
                                                title: t('admin.info.title') || 'Info',
                                                message: t('admin.documents.already_approved') || 'This receipt has already been approved',
                                                type: 'info',
                                                insert: 'top',
                                                container: 'top-right',
                                                dismiss: { duration: 3000, onScreen: true }
                                              });
                                            }
                                          } catch (error) {
                                            console.error('Error approving receipt:', error);
                                          }
                                        }}
                                        title={t('admin.documents.approve') || 'Accept Receipt'}
                                      >
                                        <i className="fas fa-check"></i> {t('admin.documents.approve') || 'Accept'}
                                      </button>
                                      <button
                                        className="action-btn deny-btn"
                                        onClick={async () => {
                                          try {
                                            const headers = getAuthHeaders();
                                            const receiptDoc = await fetchReceiptDocumentForContract(contract.id, headers);
                                            if (receiptDoc && receiptDoc.status === 'pending' && receiptDoc.id) {
                                              handleRejectReceipt(receiptDoc.id);
                                            } else if (receiptDoc && receiptDoc.status === 'approved') {
                                              Store.addNotification({
                                                title: t('admin.info.title') || 'Info',
                                                message: t('admin.documents.already_approved') || 'This receipt has already been approved',
                                                type: 'info',
                                                insert: 'top',
                                                container: 'top-right',
                                                dismiss: { duration: 3000, onScreen: true }
                                              });
                                            }
                                          } catch (error) {
                                            console.error('Error rejecting receipt:', error);
                                          }
                                        }}
                                        title={t('admin.documents.reject') || 'Refuse Receipt'}
                                      >
                                        <i className="fas fa-times"></i> {t('admin.documents.reject') || 'Refuse'}
                                      </button>
                                    </>
                                  )}
                                  {contract.contract_signed && contract.contract_download_url && (
                                    <button
                                      className="action-btn download-btn"
                                      onClick={() => handleDownload(contract)}
                                      title={t('download')}
                                    >
                                      {t('download')}
                                    </button>
                                  )}
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteContract(contract.id)}
                                    title={t('admin.contracts.delete')}
                                  >
                                    {t('admin.contracts.delete')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination.last_page > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                {t('admin.pagination.previous')}
              </button>
              <span className="page-info">
                {t('admin.pagination.page')} {currentPage} {t('admin.pagination.of')} {pagination.last_page}
              </span>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(pagination.last_page, prev + 1))}
                disabled={currentPage === pagination.last_page}
              >
                {t('admin.pagination.next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Contract Details Modal */}
      {showContractModal && selectedContract && (
        <div className="modal-overlay" onClick={() => {
          setShowContractModal(false);
          setReceiptDocument(null);
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.contracts.contract_details')}</h2>
              <button className="close-btn" onClick={() => {
                setShowContractModal(false);
                setReceiptDocument(null);
              }}>
                {t('close')}
              </button>
            </div>
            <div className="modal-body">
              <div className="contract-details">
                <h3>{t('admin.contracts.contract_info')}</h3>
                <div className="details-grid">
                  <div><strong>{t('admin.contracts.tracking_id')}:</strong> {selectedContract.id}</div>
                  <div><strong>{t('dashboard.profile.full_name')}:</strong> {selectedContract.full_name || selectedContract.user_name || selectedContract.applicant_name || '-'}</div>
                  <div><strong>{t('email')}:</strong> {selectedContract.email || selectedContract.user?.email || '-'}</div>
                  <div><strong>{t('phone_number')}:</strong> {selectedContract.phone || selectedContract.user?.phone || '-'}</div>
                  <div><strong>{t('national_id')}:</strong> {selectedContract.national_id || selectedContract.user?.national_id || '-'}</div>
                  <div><strong>{t('dashboard.contract.type')}:</strong> {selectedContract.contract_type_ar || selectedContract.contract_type || '-'}</div>
                  <div><strong>{t('dashboard.contract.status')}:</strong> 
                    <span className={`status-badge status-${selectedContract.status || selectedContract.status_text}`}>
                      {selectedContract.status_ar || selectedContract.status_text || selectedContract.status || '-'}
                    </span>
                  </div>
                  {selectedContract.receipt_upload_status && (
                    <div><strong>{t('admin.contracts.receipt_status.label')}:</strong>
                      <span className={`receipt-status-badge receipt-${selectedContract.receipt_upload_status}`} style={{ marginLeft: '8px' }}>
                        {selectedContract.receipt_upload_status === 'pending' && t('admin.contracts.receipt_status.pending')}
                        {selectedContract.receipt_upload_status === 'uploaded' && t('admin.contracts.receipt_status.uploaded')}
                        {selectedContract.receipt_upload_status === 'overdue' && t('admin.contracts.receipt_status.overdue')}
                      </span>
                    </div>
                  )}
                  {selectedContract.approved_at && (
                    <div><strong>{t('admin.contracts.approved_at')}:</strong> {new Date(selectedContract.approved_at).toLocaleString()}</div>
                  )}
                  {selectedContract.receipt_upload_deadline && (
                    <div><strong>{t('admin.contracts.receipt_deadline')}:</strong> 
                      <span style={{ color: selectedContract.receipt_upload_status === 'overdue' ? '#ef4444' : '#1f2937' }}>
                        {new Date(selectedContract.receipt_upload_deadline).toLocaleString()}
                        {!selectedContract.receipt_uploaded_at && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: selectedContract.receipt_upload_status === 'overdue' ? '#ef4444' : '#f59e0b' }}>
                            ({getHoursRemaining(selectedContract)} {t('admin.contracts.receipt_status.hours_remaining')})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {selectedContract.receipt_uploaded_at && (
                    <div><strong>{t('admin.contracts.receipt_uploaded_at')}:</strong> {new Date(selectedContract.receipt_uploaded_at).toLocaleString()}</div>
                  )}
                  <div><strong>{t('dashboard.contract.amount')}:</strong> {selectedContract.amount || '-'} {t('dashboard.currency')}</div>
                  <div><strong>{t('region')}:</strong> {selectedContract.region || '-'}</div>
                  <div><strong>{t('dashboard.contract.application_date')}:</strong> {selectedContract.application_date || selectedContract.created_at || '-'}</div>
                </div>

                {/* Contract PDF Viewer */}
                {selectedContract.contract_download_url && (
                  <div style={{ marginTop: '30px' }}>
                    <h3 style={{ marginBottom: '15px' }}>{t('admin.contracts.contract_pdf') || 'Contract PDF'}</h3>
                    <div style={{
                      width: '100%',
                      height: '70vh',
                      border: '2px solid #e0e0e0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#fafafa'
                    }}>
                      <iframe
                        src={selectedContract.contract_download_url}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title="Contract PDF"
                      />
                    </div>
                  </div>
                )}

                {/* Receipt Viewer */}
                {(selectedContract.receipt_upload_status === 'uploaded' || selectedContract.receipt_uploaded_at) && (
                  <div style={{ marginTop: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0 }}>{t('admin.contracts.receipt_pdf') || 'Receipt'}</h3>
                      {receiptDocument?.status && (
                        <span className={`receipt-status-badge receipt-${receiptDocument.status}`} style={{ marginLeft: '10px' }}>
                          {receiptDocument.status === 'pending' && (t('admin.contracts.receipt_status.pending') || 'Pending')}
                          {receiptDocument.status === 'approved' && (t('admin.contracts.receipt_status.approved') || 'Approved')}
                          {receiptDocument.status === 'rejected' && (t('admin.contracts.receipt_status.rejected') || 'Rejected')}
                        </span>
                      )}
                    </div>
                    {loadingReceipt ? (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Watch height="40" width="40" radius="9" color="#073491" ariaLabel="loading" />
                        <p style={{ marginTop: '10px' }}>{t('dashboard.loading')}</p>
                      </div>
                    ) : receiptDocument?.file_url ? (
                      <>
                        <div style={{
                          width: '100%',
                          height: '70vh',
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#fafafa'
                        }}>
                          {receiptDocument.file_url.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                              src={receiptDocument.file_url}
                              width="100%"
                              height="100%"
                              style={{ border: 'none' }}
                              title="Receipt PDF"
                            />
                          ) : (
                            <img 
                              src={receiptDocument.file_url} 
                              alt="Receipt" 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          )}
                        </div>
                        {/* Receipt Approval/Rejection Actions */}
                        {receiptDocument.status === 'pending' && receiptDocumentId && (
                          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                              className="action-btn approve-btn"
                              onClick={() => handleApproveReceipt(receiptDocumentId)}
                            >
                              <i className="fas fa-check"></i> {t('admin.documents.approve') || 'Accept Receipt'}
                            </button>
                            <button
                              className="action-btn deny-btn"
                              onClick={() => handleRejectReceipt(receiptDocumentId)}
                            >
                              <i className="fas fa-times"></i> {t('admin.documents.reject') || 'Refuse Receipt'}
                            </button>
                          </div>
                        )}
                      </>
                    ) : selectedContract.payment_receipt_path ? (
                      <div style={{
                        width: '100%',
                        height: '70vh',
                        border: '2px solid #e0e0e0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#fafafa'
                      }}>
                        {selectedContract.payment_receipt_path.toLowerCase().endsWith('.pdf') ? (
                          <iframe
                            src={selectedContract.payment_receipt_path.startsWith('http') ? selectedContract.payment_receipt_path : `${API_ORIGIN}${selectedContract.payment_receipt_path}`}
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Receipt PDF"
                          />
                        ) : (
                          <img 
                            src={selectedContract.payment_receipt_path.startsWith('http') ? selectedContract.payment_receipt_path : `${API_ORIGIN}${selectedContract.payment_receipt_path}`} 
                            alt="Receipt" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        <i className="fas fa-receipt" style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}></i>
                        <p>{t('admin.contracts.receipt_not_found') || 'Receipt document not found'}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="contract-actions" style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                  {(selectedContract.status === 'pending' || selectedContract.status_text === 'pending' || selectedContract.status === null) && (
                    <>
                      <button
                        className="action-btn approve-btn"
                        onClick={() => handleApproveDeny(selectedContract.id, true)}
                      >
                        {t('admin.contracts.approve')}
                      </button>
                      <button
                        className="action-btn deny-btn"
                        onClick={() => handleApproveDeny(selectedContract.id, false)}
                      >
                        {t('admin.contracts.deny')}
                      </button>
                    </>
                  )}
                  {selectedContract.contract_download_url && (
                    <button
                      className="action-btn download-btn"
                      onClick={() => handleDownload(selectedContract)}
                    >
                      {t('download')}
                    </button>
                  )}
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteContract(selectedContract.id)}
                  >
                    {t('admin.contracts.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{t('admin.contracts.template_settings')}</h2>
              <button className="close-btn" onClick={() => setShowSettingsModal(false)}>
                {t('close')}
              </button>
            </div>
            <div className="modal-body">
              {loadingSettings ? (
                <div className="admin-loading">
                  <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
                  <p>{t('dashboard.loading')}</p>
                </div>
              ) : (
                <div className="contract-settings-form">
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="motor_year" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1c1c1c' }}>
                      {t('admin.contracts.motor_year')}
                    </label>
                    <input
                      type="text"
                      id="motor_year"
                      value={contractSettings.motor_year}
                      onChange={(e) => handleSettingsChange('motor_year', e.target.value)}
                      placeholder={t('admin.contracts.motor_year_placeholder')}
                      className="search-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="motor_model" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1c1c1c' }}>
                      {t('admin.contracts.motor_model')}
                    </label>
                    <input
                      type="text"
                      id="motor_model"
                      value={contractSettings.motor_model}
                      onChange={(e) => handleSettingsChange('motor_model', e.target.value)}
                      placeholder={t('admin.contracts.motor_model_placeholder')}
                      className="search-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="rental_ownership_percentage" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1c1c1c' }}>
                      {t('admin.contracts.rental_ownership_percentage')}
                    </label>
                    <input
                      type="text"
                      id="rental_ownership_percentage"
                      value={contractSettings.rental_ownership_percentage}
                      onChange={(e) => handleSettingsChange('rental_ownership_percentage', e.target.value)}
                      placeholder={t('admin.contracts.rental_ownership_placeholder')}
                      className="search-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
                    <button
                      className="action-btn"
                      onClick={() => setShowSettingsModal(false)}
                      style={{
                        background: '#6c757d',
                        color: '#ffffff',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: '"Cairo", sans-serif'
                      }}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      className="action-btn"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      style={{
                        background: savingSettings ? '#ccc' : '#073491',
                        color: '#ffffff',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingSettings ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: '"Cairo", sans-serif',
                        transition: 'background 0.3s ease'
                      }}
                    >
                      {savingSettings ? t('dashboard.loading') : t('admin.contracts.save_settings')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Rejection Dialog */}
      <RejectionDialog
        isOpen={showRejectionDialog}
        onClose={() => {
          setShowRejectionDialog(false);
          setContractToReject(null);
        }}
        onConfirm={handleConfirmRejection}
        title={t('admin.contracts.reject_contract') || 'Reject Contract'}
        type="contract"
      />

      {/* Receipt Rejection Dialog */}
      <RejectionDialog
        isOpen={showReceiptRejectionDialog}
        onClose={() => {
          setShowReceiptRejectionDialog(false);
          setReceiptToReject(null);
        }}
        onConfirm={handleConfirmReceiptRejection}
        title={t('admin.documents.reject_document') || 'Reject Receipt'}
        type="document"
      />
    </div>
  );
};

export default ContractManagement;
