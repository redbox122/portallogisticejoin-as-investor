import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { getLang, pickText } from '../../Utitlities/uxText';
import DataComparisonModal from '../../Components/DataComparisonModal';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/tasks-page.css';

// Helper function to check if task ID is numeric (not dynamic)
const isNumericTaskId = (id) => {
  return typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id));
};

// Helper function to get task icon based on type
const getTaskIcon = (type) => {
  const icons = {
    'upload_receipt': 'fa-receipt',
    'upload_doc': 'fa-file-upload',
    'create_rental': 'fa-motorcycle',
    'payment_overdue': 'fa-exclamation-triangle',
    'complete_profile': 'fa-user',
    'contract_pending': 'fa-clock',
    'contract_approved': 'fa-check-circle',
    'contract_denied': 'fa-times-circle',
    'document_approved': 'fa-check',
    'document_rejected': 'fa-times',
    'payment_received': 'fa-money-bill'
  };
  return icons[type] || 'fa-bell';
};

const TasksPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [documentRejected, setDocumentRejected] = useState(false);
  const [expandedHelpTaskIds, setExpandedHelpTaskIds] = useState(() => new Set());
  // Frontend fallback: hide upload_receipt tasks immediately after a successful upload
  // to avoid "urgent" tasks lingering while backend processes/filters.
  const [hiddenReceiptContractIds, setHiddenReceiptContractIds] = useState(() => new Set());
  const taskRefs = useRef({});

  const lang = getLang(i18n);

  // Helper to get contract id from a task (supports related_contract or legacy contract_id)
  const getTaskContractId = (task) => {
    return task?.related_contract?.id || task?.contract_id || null;
  };

  const getDocTypeLabel = (task) => {
    const docType = task?.doc_type;
    if (!docType) return '';
    if (lang === 'ar') {
      if (docType === 'iban_doc') return 'مستند الآيبان';
      if (docType === 'national_address_doc') return 'مستند العنوان الوطني';
      if (docType === 'receipt') return 'إيصال السداد';
      return docType;
    }
    if (docType === 'iban_doc') return 'IBAN Document';
    if (docType === 'national_address_doc') return 'National Address Document';
    if (docType === 'receipt') return 'Payment Receipt';
    return docType;
  };

  const interpolateTaskText = (text, task) => {
    if (!text) return text;
    let out = String(text);
    // Replace placeholders that might leak from backend templates
    out = out.replaceAll('{doc_type}', getDocTypeLabel(task));
    out = out.replaceAll('{rejection_reason}', getRejectionReason(task) || '');
    return out;
  };

  const getQuickAction = (task) => {
    const qa = task?.quick_action || null;
    if (!qa) return null;
    const text = pickText(lang, qa.button_text_ar, qa.button_text, t('dashboard.tasks.take_action'));
    const url = qa.direct_url || null;
    const icon = qa.icon || null;
    return { text, url, icon };
  };

  const resolveActionUrl = (task) => {
    const qa = getQuickAction(task);
    if (qa?.url) return qa.url;
    const url = task?.action_url || '';
    if (!url) {
      // Sensible fallbacks for informational task types
      if (task?.type === 'contract_approved' || task?.type === 'contract_denied' || task?.type === 'contract_pending') {
        return '/dashboard/contracts';
      }
      if (task?.type === 'complete_profile' || task?.type === 'upload_doc' || task?.type === 'document_approved' || task?.type === 'document_rejected') {
        return '/dashboard/profile';
      }
      if (task?.type === 'create_rental') {
        return '/dashboard/contracts';
      }
      if (task?.type === 'payment_overdue' || task?.type === 'payment_received') {
        return '/dashboard/payments';
      }
      return null;
    }

    // If backend points back to tasks for non-actionable notifications, route to the real page.
    if (url.startsWith('/dashboard/tasks') && (task?.type === 'contract_approved' || task?.type === 'contract_denied' || task?.type === 'contract_pending')) {
      return '/dashboard/contracts';
    }
    if (url.startsWith('/dashboard/tasks') && (task?.type === 'document_approved' || task?.type === 'complete_profile')) {
      return '/dashboard/profile';
    }
    return url;
  };

  useEffect(() => {
    fetchNotifications();
    fetchDocuments();
  }, [filter]);

  // Refresh documents when page becomes visible (e.g., after uploading from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh documents to get latest status
        fetchDocuments();
      }
    };

    const handleFocus = () => {
      // Also refresh when window regains focus
      fetchDocuments();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      console.log('🔄 [NOTIFICATIONS] Fetching notifications with filter:', filter);
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications?status=${filter}`,
        { headers }
      );
      console.log('📥 [NOTIFICATIONS] Response received:', response.data);
      
      if (response.data?.success) {
        const nextNotifications = response.data.data.notifications || [];
        console.log('📋 [NOTIFICATIONS] Found', nextNotifications.length, 'notifications');
        console.log('📋 [NOTIFICATIONS] Upload receipt tasks:', nextNotifications.filter(n => n?.type === 'upload_receipt').map(n => ({
          id: n.id,
          contract_id: getTaskContractId(n),
          type: n.type
        })));
        
        setNotifications(nextNotifications);
        setSummary(response.data.data.summary || null);

        // If backend no longer returns an upload_receipt task for a contract, unhide it.
        // This keeps the fallback from masking real tasks if user changes contracts, etc.
        setHiddenReceiptContractIds(prev => {
          if (!prev || prev.size === 0) return prev;
          const stillPresent = new Set();
          for (const n of nextNotifications) {
            if (n?.type === 'upload_receipt') {
              const cid = getTaskContractId(n);
              if (cid != null) stillPresent.add(String(cid));
            }
          }
          const next = new Set();
          for (const cid of prev) {
            // keep hidden only if the backend still has this receipt task present
            if (stillPresent.has(String(cid))) {
              next.add(cid);
              console.log('🔒 [NOTIFICATIONS] Keeping contract', cid, 'hidden (task still present)');
            } else {
              console.log('🔓 [NOTIFICATIONS] Unhiding contract', cid, '(task no longer present)');
            }
          }
          return next;
        });
      } else {
        console.warn('⚠️ [NOTIFICATIONS] API returned success: false:', response.data);
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error fetching notifications:', error);
      console.error('❌ [NOTIFICATIONS] Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const headers = getAuthHeaders();
      console.log('🔄 [DOCUMENTS] Fetching documents...');
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/documents`,
        { headers }
      );
      console.log('📥 [DOCUMENTS] Response received:', response.data);
      
      if (response.data?.success) {
        const documentsData = response.data.data;
        console.log('📋 [DOCUMENTS] Documents summary:', documentsData?.summary);
        if (documentsData?.summary?.receipt) {
          console.log('📋 [DOCUMENTS] Receipt status:', documentsData.summary.receipt);
        }
        setDocuments(documentsData);
      } else {
        console.warn('⚠️ [DOCUMENTS] API returned success: false:', response.data);
      }
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error fetching documents:', error);
      console.error('❌ [DOCUMENTS] Error response:', error.response?.data);
    }
  };

  const handleMarkAsRead = async (id) => {
    // Only mark as read if it's a stored notification (numeric ID)
    if (!isNumericTaskId(id)) {
      return; // Dynamic tasks can't be marked as read via API
    }
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/read`,
        {},
        { headers }
      );
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleComplete = async (id) => {
    // Only complete if it's a stored notification (numeric ID)
    if (!isNumericTaskId(id)) {
      // For dynamic tasks, just refresh - they'll disappear when condition is resolved
      fetchNotifications();
      return;
    }
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/complete`,
        {},
        { headers }
      );
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: t('dashboard.tasks.completed'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000 }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDismiss = async (id) => {
    // Only dismiss if it's a stored notification (numeric ID)
    if (!isNumericTaskId(id)) {
      // Dynamic tasks can't be dismissed - they'll disappear when condition is resolved
      return;
    }
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/dismiss`,
        {},
        { headers }
      );
      fetchNotifications();
    } catch (error) {
      console.error('Error dismissing:', error);
    }
  };

  const handleReceiptUpload = async (contractId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingReceipt(contractId);
      try {
        // Validate contract_id
        const contractIdNum = contractId ? parseInt(contractId, 10) : null;
        if (!contractIdNum || isNaN(contractIdNum)) {
          console.error('❌ [RECEIPT UPLOAD] Invalid contract_id:', contractId);
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: t('dashboard.error.invalid_contract', { defaultValue: 'Invalid contract ID' }),
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000 }
          });
          return;
        }

        const headers = getAuthHeaders();
        const formData = new FormData();
        formData.append('type', 'receipt');
        formData.append('contract_id', contractIdNum);
        formData.append('file', file);

        console.log('📤 [RECEIPT UPLOAD] Starting upload for contract:', contractIdNum);
        console.log('📤 [RECEIPT UPLOAD] File:', file.name, 'Size:', file.size, 'Type:', file.type);

        const response = await axios.post(
          `${API_BASE_URL}/portallogistice/documents/upload`,
          formData,
          { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
        );

        console.log('📥 [RECEIPT UPLOAD] Response received:', response.data);

        // Check if the API returned success: false (even with 200 status)
        if (!response.data?.success) {
          const errorMessage = response.data?.message || 
                              response.data?.error || 
                              Object.values(response.data?.errors || {}).flat().join(', ') ||
                              t('dashboard.error.upload_failed');
          
          console.error('❌ [RECEIPT UPLOAD] Upload failed:', errorMessage, response.data);
          
          Store.addNotification({
            title: t('dashboard.error.title'),
            message: errorMessage,
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            dismiss: { duration: 5000 }
          });
          return;
        }

        // Success case
        console.log('✅ [RECEIPT UPLOAD] Upload successful:', response.data);
        
        Store.addNotification({
          title: t('dashboard.success.title'),
          message: response.data.message || t('dashboard.success.receipt_uploaded', { defaultValue: 'Receipt uploaded successfully' }),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000 }
        });

        // Optimistically hide this task immediately so it doesn't keep showing as "urgent"
        // while backend updates/filters tasks.
        setHiddenReceiptContractIds(prev => {
          const next = new Set(prev);
          next.add(String(contractId));
          return next;
        });

        // Refresh notifications and documents immediately
        console.log('🔄 [RECEIPT UPLOAD] Refreshing notifications and documents...');
        await Promise.all([fetchNotifications(), fetchDocuments()]);
        
        // Refresh again after delay to catch backend updates (backend might need time to process)
        setTimeout(async () => {
          console.log('🔄 [RECEIPT UPLOAD] Second refresh after delay...');
          await fetchNotifications();
        }, 2000);
      } catch (error) {
        console.error('❌ [RECEIPT UPLOAD] Error caught:', error);
        console.error('❌ [RECEIPT UPLOAD] Error response:', error.response?.data);
        console.error('❌ [RECEIPT UPLOAD] Error status:', error.response?.status);
        
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error ||
                            Object.values(error.response?.data?.errors || {}).flat().join(', ') ||
                            error.message ||
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
        setUploadingReceipt(null);
      }
    };
    input.click();
  };

  const handleAction = (notification) => {
    // If it's an upload_receipt action, trigger upload directly
    if (notification.type === 'upload_receipt') {
      const contractId = getTaskContractId(notification);
      if (contractId) {
        handleReceiptUpload(contractId);
        return;
      }
    }
    
    const url = resolveActionUrl(notification);
    if (url) {
      // react-router navigate doesn't handle absolute URLs reliably
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        window.location.assign(url);
      } else {
        navigate(url);
      }
    } else if (isNumericTaskId(notification.id)) {
      // If there's no navigation target, completing is the best UX for "info" tasks
      handleComplete(notification.id);
    }
    // Only mark as read if it's a stored notification and not already read
    if (!notification.read_at && isNumericTaskId(notification.id)) {
      handleMarkAsRead(notification.id);
    }
  };

  // Helper to get rejection reason for a task
  const getRejectionReason = (task) => {
    // First check if task has rejection_reason directly
    if (task.rejection_reason) {
      return task.rejection_reason;
    }
    
    // If it's a document_rejected task, try to get from documents summary
    if (task.type === 'document_rejected' || task.type === 'upload_doc') {
      const docType = task.doc_type;
      if (docType && documents?.summary) {
        const docSummary = docType === 'iban_doc' 
          ? documents.summary?.iban_doc 
          : docType === 'national_address_doc'
          ? documents.summary?.national_address_doc
          : docType === 'receipt'
          ? documents.summary?.receipt
          : null;
        
        if (docSummary?.rejection_reason) {
          return docSummary.rejection_reason;
        }
      }
    }
    
    return null;
  };

  // Filter out tasks for documents that are already uploaded (but keep rejected ones)
  const filterTasksByDocumentStatus = (tasks) => {
    if (!documents?.summary) return tasks;
    
    return tasks.filter(task => {
      // Only filter upload_doc tasks
      if (task.type !== 'upload_doc') return true;
      
      // Check if task has doc_type field
      const docType = task.doc_type;
      if (!docType) return true; // Keep task if we can't determine doc type
      
      // Check document summary
      const docSummary = docType === 'iban_doc' 
        ? documents.summary?.iban_doc 
        : documents.summary?.national_address_doc;
      
      // Keep task if document doesn't exist
      if (!docSummary?.exists) return true;
      
      // Keep task if document is rejected (user needs to re-upload)
      if (docSummary?.status === 'rejected') return true;
      
      // Hide task if document exists and is not rejected (pending or approved)
      return false;
    });
  };

  const filteredNotifications = filterTasksByDocumentStatus(notifications).filter(task => {
    // Frontend fallback: hide upload_receipt tasks for contracts we just uploaded a receipt for
    // (prevents "urgent" lingering due to backend timing).
    if (task?.type !== 'upload_receipt') return true;
    const cid = getTaskContractId(task);
    if (cid == null) return true;
    return !hiddenReceiptContractIds.has(String(cid));
  });

  // Handle URL parameters for direct action
  useEffect(() => {
    const action = searchParams.get('action');
    const contractId = searchParams.get('contract_id');
    
    // Ensure we're on pending filter when there's an action
    if (action && filter !== 'pending') {
      setFilter('pending');
      return; // Will re-run after filter changes
    }
    
    if (action && contractId && filteredNotifications.length > 0) {
      // Find the matching task
      const matchingTask = filteredNotifications.find(task => {
        const taskContractId = task.related_contract?.id || task.contract_id;
        return task.type === action && 
               (taskContractId === parseInt(contractId) || taskContractId === contractId);
      });

      if (matchingTask) {
        // Scroll to the task
        const taskId = matchingTask.id || matchingTask.contract_id;
        if (taskRefs.current[taskId]) {
          setTimeout(() => {
            taskRefs.current[taskId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }

        // Auto-trigger upload if action is upload_receipt
        if (action === 'upload_receipt') {
          setTimeout(() => {
            handleReceiptUpload(contractId);
          }, 500);
        }

        // Clear URL params after handling
        setSearchParams({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNotifications, searchParams, setSearchParams, filter]);

  if (loading) {
    return (
      <div className="page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  const urgentTasks = filteredNotifications.filter(n => n.priority === 'urgent');
  const normalTasks = filteredNotifications.filter(n => n.priority !== 'urgent');
  
  // Helper to get localized text
  const getLocalizedText = (task, field) => {
    const isArabic = i18n.language === 'ar';
    if (field === 'title') {
      // Support both {title,title_en} and {title,title_ar} variants
      const ar = task.title_ar || task.title;
      const en = task.title_en || task.title;
      return interpolateTaskText(isArabic ? (ar || en) : (en || ar), task);
    }
    if (field === 'description') {
      const ar = task.description_ar || task.description;
      const en = task.description_en || task.description;
      return interpolateTaskText(isArabic ? (ar || en) : (en || ar), task);
    }
    return '';
  };

  const getLocalizedContextSummary = (task) => {
    const isArabic = i18n.language === 'ar';
    const ar = task.context_summary_ar || task.context_summary;
    const en = task.context_summary || task.context_summary_ar;
    return isArabic ? (ar || en) : (en || ar);
  };

  const getLocalizedHelp = (task) => {
    // Backend may return help as {en:{...},ar:{...}} OR already localized.
    const help = task?.help;
    if (!help) return null;
    const isArabic = i18n.language === 'ar';
    if (help.en || help.ar) {
      return isArabic ? (help.ar || help.en) : (help.en || help.ar);
    }
    return help;
  };

  const toggleHelp = (taskId) => {
    setExpandedHelpTaskIds(prev => {
      const next = new Set(prev);
      const key = String(taskId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  
  // Helper to get contract number for display
  const getContractNumber = (task) => {
    if (task.related_contract?.contract_number) {
      return task.related_contract.contract_number;
    }
    if (task.related_contract?.id) {
      return task.related_contract.id;
    }
    return null;
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.sidebar.tasks')}</h1>
          <p className="page-subtitle">{t('dashboard.tasks.subtitle')}</p>
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            {t('dashboard.tasks.pending')}
          </button>
          <button
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            {t('dashboard.tasks.completed')}
          </button>
        </div>
      </div>

      {summary && filter === 'pending' && (
        <div className="task-summary">
          {summary.unread_count > 0 && (
            <div className="summary-badge unread">
              <i className="fas fa-envelope"></i>
              <span>{summary.unread_count}</span>
              <span className="badge-label">{t('dashboard.tasks.unread') || 'Unread'}</span>
            </div>
          )}
          {summary.urgent_count > 0 && (
            <div className="summary-badge urgent">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{summary.urgent_count}</span>
              <span className="badge-label">{t('dashboard.tasks.urgent') || 'Urgent'}</span>
            </div>
          )}
          {summary.pending_count > 0 && (
            <div className="summary-badge pending">
              <i className="fas fa-tasks"></i>
              <span>{summary.pending_count}</span>
              <span className="badge-label">{t('dashboard.tasks.pending') || 'Pending'}</span>
            </div>
          )}
          {summary.with_deadline_count > 0 && (
            <div className="summary-badge deadline">
              <i className="fas fa-clock"></i>
              <span>{summary.with_deadline_count}</span>
              <span className="badge-label">{t('dashboard.tasks.with_deadline') || 'With Deadline'}</span>
            </div>
          )}
        </div>
      )}

      {urgentTasks.length > 0 && filter === 'pending' && (
        <div className="urgent-section">
          <h2 className="section-title">
            <i className="fas fa-exclamation-triangle"></i>
            {t('dashboard.tasks.urgent')}
          </h2>
          <div className="tasks-list">
            {urgentTasks.map((task, index) => {
              const isOverdue = task.deadline_remaining_hours !== null && task.deadline_remaining_hours <= 0;
              const isDynamic = task.is_dynamic === true;
              const contractNumber = getContractNumber(task);
              
              const taskId = task.id || task.contract_id || index;
              const contractId = task.related_contract?.id || task.contract_id;
              const contextSummary = getLocalizedContextSummary(task);
              const help = getLocalizedHelp(task);
              const helpExpanded = expandedHelpTaskIds.has(String(taskId));
              
              return (
                <div 
                  ref={el => { if (el) taskRefs.current[taskId] = el; }}
                  key={task.id} 
                  className={`task-card urgent ${!task.read_at ? 'unread' : ''} ${isOverdue ? 'overdue' : ''} ${isDynamic ? 'dynamic' : ''}`}
                >
                  <div className="task-content" onClick={() => handleAction(task)}>
                    <div className="task-icon urgent">
                      <i className={`fas ${getTaskIcon(task.type)}`}></i>
                    </div>
                    <div className="task-info">
                      <h3>{getLocalizedText(task, 'title')}</h3>
                      <p>{getLocalizedText(task, 'description')}</p>
                      {contextSummary && (
                        <div className="task-context">
                          <i className="fas fa-info-circle"></i>
                          <span>{contextSummary}</span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="task-deadline">
                          <i className="fas fa-clock"></i>
                          {new Date(task.deadline).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                          {task.deadline_remaining_hours !== null && (
                            <span className={`hours-remaining ${isOverdue ? 'overdue' : ''}`}>
                              ({isOverdue ? t('dashboard.tasks.overdue') : `${task.deadline_remaining_hours}h`})
                            </span>
                          )}
                        </div>
                      )}
                      {contractNumber && (
                        <div className="contract-info">
                          {i18n.language === 'ar' ? 'عقد رقم' : 'Contract #'}{contractNumber}
                        </div>
                      )}
                      {task.payment_amount && (
                        <div className="payment-info">
                          {i18n.language === 'ar' ? 'المبلغ:' : 'Amount:'} {task.payment_amount} {i18n.language === 'ar' ? 'ريال' : 'SAR'}
                          {task.payment_month && ` (${i18n.language === 'ar' ? 'دفعة رقم' : 'Payment #'}${task.payment_month})`}
                        </div>
                      )}
                      {isDynamic && (
                        <span className="dynamic-badge">
                          {i18n.language === 'ar' ? 'مهمة تلقائية' : 'Auto-generated'}
                        </span>
                      )}
                      {task?.visual?.estimated_time_minutes ? (
                        <div className="task-estimate">
                          <i className="fas fa-hourglass-half"></i>
                          <span>
                            {i18n.language === 'ar'
                              ? `تقريباً ${task.visual.estimated_time_minutes} دقيقة`
                              : `Takes ~${task.visual.estimated_time_minutes} min`}
                          </span>
                        </div>
                      ) : null}
                      {(task.type === 'document_rejected' || (task.type === 'upload_doc' && getRejectionReason(task))) && (
                        <div className="rejection-reason-box" style={{
                          background: '#fee2e2',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          padding: '12px',
                          marginTop: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i>
                            <strong style={{ color: '#991b1b' }}>
                              {i18n.language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}
                            </strong>
                          </div>
                          <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                            {getRejectionReason(task) || getLocalizedText(task, 'description')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    {help && (
                      <button
                        className="help-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHelp(taskId);
                        }}
                        title={i18n.language === 'ar' ? 'مساعدة' : 'Help'}
                      >
                        <i className={`fas ${helpExpanded ? 'fa-chevron-up' : 'fa-question-circle'}`}></i>
                      </button>
                    )}
                    {task.type === 'upload_receipt' && contractId ? (
                      <button 
                        className="action-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReceiptUpload(contractId);
                        }}
                        disabled={uploadingReceipt === contractId}
                      >
                        {uploadingReceipt === contractId ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> {t('dashboard.uploading')}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload"></i> {t('dashboard.wire_receipt.upload_receipt', { defaultValue: 'Upload Receipt' })}
                          </>
                        )}
                      </button>
                    ) : (task.type === 'document_rejected' || (task.type === 'upload_doc' && getRejectionReason(task))) ? (
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // If rejected doc is a receipt, re-upload should target the contract receipt upload
                          const contractIdForRejected = getTaskContractId(task);
                          if (task.doc_type === 'receipt' && contractIdForRejected) {
                            handleReceiptUpload(contractIdForRejected);
                            return;
                          }

                          // Otherwise (IBAN / National Address), re-upload goes to profile documents section
                          navigate('/dashboard/profile');
                        }}
                        style={{ background: '#ef4444' }}
                      >
                        <i className="fas fa-upload"></i> {i18n.language === 'ar' ? 'إعادة الرفع' : 'Re-upload'}
                      </button>
                    ) : (resolveActionUrl(task) && filter === 'pending') ? (
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(task);
                        }}
                      >
                        {getQuickAction(task)?.text || t('dashboard.tasks.take_action')}
                      </button>
                    ) : null}
                    {!isDynamic && (
                      <>
                        <button className="complete-btn" onClick={() => handleComplete(task.id)}>
                          <i className="fas fa-check"></i>
                        </button>
                        <button className="dismiss-btn" onClick={() => handleDismiss(task.id)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                  </div>
                  {help && helpExpanded && (
                    <div className="task-help">
                      {help.text && <p className="task-help-text">{help.text}</p>}
                      {Array.isArray(help.tips) && help.tips.length > 0 && (
                        <div className="task-help-section">
                          <strong>{i18n.language === 'ar' ? 'نصائح' : 'Tips'}</strong>
                          <ul>
                            {help.tips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(help.common_mistakes) && help.common_mistakes.length > 0 && (
                        <div className="task-help-section">
                          <strong>{i18n.language === 'ar' ? 'أخطاء شائعة' : 'Common mistakes'}</strong>
                          <ul>
                            {help.common_mistakes.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="tasks-section">
        <h2 className="section-title">
          {filter === 'pending' ? t('dashboard.tasks.all_tasks') : t('dashboard.tasks.completed_tasks')}
        </h2>
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-check-circle"></i>
            <p>{filter === 'pending' ? t('dashboard.tasks.no_pending') : t('dashboard.tasks.no_completed')}</p>
          </div>
        ) : (
          <div className="tasks-list">
            {(filter === 'pending' ? normalTasks : notifications).map((task, index) => {
              const isOverdue = task.deadline_remaining_hours !== null && task.deadline_remaining_hours <= 0;
              const isDynamic = task.is_dynamic === true;
              const contractNumber = getContractNumber(task);
              
              const taskId = task.id || task.contract_id || index;
              const contractId = getTaskContractId(task);
              const contextSummary = getLocalizedContextSummary(task);
              const help = getLocalizedHelp(task);
              const helpExpanded = expandedHelpTaskIds.has(String(taskId));
              
              return (
                <div 
                  ref={el => { if (el) taskRefs.current[taskId] = el; }}
                  key={task.id} 
                  className={`task-card ${task.priority || 'normal'} ${!task.read_at ? 'unread' : ''} ${isOverdue ? 'overdue' : ''} ${isDynamic ? 'dynamic' : ''}`}
                >
                  <div className="task-content" onClick={() => handleAction(task)}>
                    <div className={`task-icon ${task.priority || 'normal'}`}>
                      <i className={`fas ${getTaskIcon(task.type)}`}></i>
                    </div>
                    <div className="task-info">
                      <h3>{getLocalizedText(task, 'title')}</h3>
                      <p>{getLocalizedText(task, 'description')}</p>
                      {contextSummary && (
                        <div className="task-context">
                          <i className="fas fa-info-circle"></i>
                          <span>{contextSummary}</span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="task-deadline">
                          <i className="fas fa-clock"></i>
                          {new Date(task.deadline).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                          {task.deadline_remaining_hours !== null && (
                            <span className={`hours-remaining ${isOverdue ? 'overdue' : ''}`}>
                              ({isOverdue ? t('dashboard.tasks.overdue') : `${task.deadline_remaining_hours}h`})
                            </span>
                          )}
                        </div>
                      )}
                      {contractNumber && (
                        <div className="contract-info">
                          {i18n.language === 'ar' ? 'عقد رقم' : 'Contract #'}{contractNumber}
                        </div>
                      )}
                      {task.payment_amount && (
                        <div className="payment-info">
                          {i18n.language === 'ar' ? 'المبلغ:' : 'Amount:'} {task.payment_amount} {i18n.language === 'ar' ? 'ريال' : 'SAR'}
                          {task.payment_month && ` (${i18n.language === 'ar' ? 'دفعة رقم' : 'Payment #'}${task.payment_month})`}
                        </div>
                      )}
                      {task.doc_type && (
                        <div className="doc-type-info">
                          {i18n.language === 'ar' 
                            ? (task.doc_type === 'iban_doc' ? 'مستند الآيبان' : 'مستند العنوان الوطني')
                            : (task.doc_type === 'iban_doc' ? 'IBAN Document' : 'National Address Document')
                          }
                        </div>
                      )}
                      {isDynamic && (
                        <span className="dynamic-badge">
                          {i18n.language === 'ar' ? 'مهمة تلقائية' : 'Auto-generated'}
                        </span>
                      )}
                      {task?.visual?.estimated_time_minutes ? (
                        <div className="task-estimate">
                          <i className="fas fa-hourglass-half"></i>
                          <span>
                            {i18n.language === 'ar'
                              ? `تقريباً ${task.visual.estimated_time_minutes} دقيقة`
                              : `Takes ~${task.visual.estimated_time_minutes} min`}
                          </span>
                        </div>
                      ) : null}
                      {(task.type === 'document_rejected' || (task.type === 'upload_doc' && getRejectionReason(task))) && (
                        <div className="rejection-reason-box" style={{
                          background: '#fee2e2',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          padding: '12px',
                          marginTop: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i>
                            <strong style={{ color: '#991b1b' }}>
                              {i18n.language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}
                            </strong>
                          </div>
                          <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                            {getRejectionReason(task) || getLocalizedText(task, 'description')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    {help && filter === 'pending' && (
                      <button
                        className="help-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHelp(taskId);
                        }}
                        title={i18n.language === 'ar' ? 'مساعدة' : 'Help'}
                      >
                        <i className={`fas ${helpExpanded ? 'fa-chevron-up' : 'fa-question-circle'}`}></i>
                      </button>
                    )}
                    {task.type === 'upload_receipt' && contractId && filter === 'pending' ? (
                      <button 
                        className="action-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReceiptUpload(contractId);
                        }}
                        disabled={uploadingReceipt === contractId}
                      >
                        {uploadingReceipt === contractId ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> {t('dashboard.uploading')}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload"></i> {t('dashboard.wire_receipt.upload_receipt', { defaultValue: 'Upload Receipt' })}
                          </>
                        )}
                      </button>
                    ) : (task.type === 'document_rejected' || (task.type === 'upload_doc' && getRejectionReason(task))) && filter === 'pending' ? (
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // If rejected doc is a receipt, re-upload should target the contract receipt upload
                          const contractIdForRejected = getTaskContractId(task);
                          if (task.doc_type === 'receipt' && contractIdForRejected) {
                            handleReceiptUpload(contractIdForRejected);
                            return;
                          }

                          // Otherwise (IBAN / National Address), re-upload goes to profile documents section
                          navigate('/dashboard/profile');
                        }}
                        style={{ background: '#ef4444' }}
                      >
                        <i className="fas fa-upload"></i> {i18n.language === 'ar' ? 'إعادة الرفع' : 'Re-upload'}
                      </button>
                    ) : (resolveActionUrl(task) && filter === 'pending') ? (
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(task);
                        }}
                      >
                        {getQuickAction(task)?.text || t('dashboard.tasks.take_action')}
                      </button>
                    ) : null}
                    {filter === 'pending' && !isDynamic && (
                      <>
                        <button className="complete-btn" onClick={() => handleComplete(task.id)}>
                          <i className="fas fa-check"></i>
                        </button>
                        <button className="dismiss-btn" onClick={() => handleDismiss(task.id)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                  </div>
                  {help && helpExpanded && (
                    <div className="task-help">
                      {help.text && <p className="task-help-text">{help.text}</p>}
                      {Array.isArray(help.tips) && help.tips.length > 0 && (
                        <div className="task-help-section">
                          <strong>{i18n.language === 'ar' ? 'نصائح' : 'Tips'}</strong>
                          <ul>
                            {help.tips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(help.common_mistakes) && help.common_mistakes.length > 0 && (
                        <div className="task-help-section">
                          <strong>{i18n.language === 'ar' ? 'أخطاء شائعة' : 'Common mistakes'}</strong>
                          <ul>
                            {help.common_mistakes.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
            await Promise.all([fetchNotifications(), fetchDocuments()]);
          }}
          onKeepCurrent={() => {
            setShowComparisonModal(false);
            setComparisonData(null);
            setDocumentRejected(false);
          }}
          documentType="receipt"
        />
      )}
    </div>
  );
};

export default TasksPage;
