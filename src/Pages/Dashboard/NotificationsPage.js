import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { getLang, pickFieldText, pickText, formatDate, formatDateTime, toArray } from '../../Utitlities/uxText';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/notifications-page.css';

// Helper function to replace contract ID with contract_number in text
const replaceContractIdWithNumber = (text, contractId, contractNumber) => {
  if (!text || !contractId || !contractNumber || contractId === contractNumber) return text;
  
  const contractIdStr = String(contractId);
  const contractNumberStr = String(contractNumber);
  let updatedText = text;
  
  // Replace "رقم {id}" pattern (Arabic: "number {id}")
  updatedText = updatedText.replace(
    new RegExp(`رقم\\s*${contractIdStr}`, 'g'),
    `رقم ${contractNumberStr}`
  );
  
  // Replace "Contract #{id}" or "contract #{id}" pattern (English)
  updatedText = updatedText.replace(
    new RegExp(`[Cc]ontract\\s*#?\\s*${contractIdStr}`, 'g'),
    (match) => match.replace(contractIdStr, contractNumberStr)
  );
  
  // Replace standalone "#{id}" pattern
  updatedText = updatedText.replace(
    new RegExp(`#${contractIdStr}(?!\\d)`, 'g'),
    `#${contractNumberStr}`
  );
  
  // Replace standalone number (only if it's clearly a contract reference)
  if (text.includes('عقد') || text.includes('contract') || text.includes('Contract')) {
    updatedText = updatedText.replace(
      new RegExp(`\\b${contractIdStr}\\b`, 'g'),
      contractNumberStr
    );
  }
  
  return updatedText;
};

const NotificationsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [grouped, setGrouped] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, urgent, completed, dismissed
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState(''); // type|date|priority|''

  useEffect(() => {
    // Light debounce for search/group changes
    const handle = setTimeout(() => {
      fetchNotifications();
    }, search ? 350 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentPage, search, groupBy]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = {
        page: currentPage,
        per_page: 20
      };

      if (filter === 'unread') {
        params.read = 'false';
      } else if (filter === 'urgent') {
        params.priority = 'urgent';
      } else if (filter !== 'all') {
        params.status = filter;
      }

      if (search && search.trim()) {
        params.search = search.trim();
      }
      if (groupBy) {
        params.group_by = groupBy;
      }

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications`,
        { headers, params }
      );

      if (response.data?.success) {
        setNotifications(response.data.data.notifications || []);
        setSummary(response.data.data.summary);
        setGrouped(response.data.data.grouped || null);
        if (response.data.data.pagination) {
          setTotalPages(response.data.data.pagination.total_pages || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: t('dashboard.error.fetch_data'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/read`,
        {},
        { headers }
      );
      fetchNotifications();
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: t('dashboard.notifications.marked_read'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 2000 }
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/mark-all-read`,
        {},
        { headers }
      );
      fetchNotifications();
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: t('dashboard.notifications.all_marked_read'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 2000 }
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleComplete = async (id) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/complete`,
        {},
        { headers }
      );
      fetchNotifications();
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: t('dashboard.notifications.completed'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 2000 }
      });
    } catch (error) {
      console.error('Error completing notification:', error);
    }
  };

  const handleDismiss = async (id) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/dismiss`,
        {},
        { headers }
      );
      fetchNotifications();
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: t('dashboard.notifications.dismissed'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 2000 }
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      setHelpOpen(false);
      setSelectedNotification(notification);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'upload_receipt':
        return 'fa-receipt';
      case 'complete_profile':
        return 'fa-user';
      case 'upload_doc':
        return 'fa-file-upload';
      case 'create_rental':
        return 'fa-motorcycle';
      case 'document_approved':
        return 'fa-check-circle';
      case 'document_rejected':
        return 'fa-times-circle';
      case 'contract_approved':
        return 'fa-check';
      case 'contract_denied':
        return 'fa-times';
      default:
        return 'fa-bell';
    }
  };

  const lang = getLang(i18n);

  const getTitle = (n) =>
    pickFieldText(
      lang,
      n,
      ['title_ar', 'title'],
      ['title_en', 'title'],
      t('dashboard.notifications.title', { defaultValue: 'Notification' })
    );

  const getDescription = (n) =>
    pickFieldText(lang, n, ['description_ar', 'description'], ['description_en', 'description'], '');

  const getContextSummary = (n) =>
    pickText(lang, n?.context_summary_ar, n?.context_summary, '');

  const getHelp = (n) => {
    const help = n?.help || null;
    if (!help) return null;
    // Backend spec: { en: {...}, ar: {...} }
    return help?.[lang] || help?.en || help?.ar || null;
  };

  const getQuickAction = (n) => n?.quick_action || null;

  if (loading && notifications.length === 0) {
    return (
      <div className="page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.notifications.title')}</h1>
          <p className="page-subtitle">{t('dashboard.notifications.subtitle')}</p>
        </div>
        {summary && summary.unread_count > 0 && (
          <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
            <i className="fas fa-check-double"></i>
            {t('dashboard.notifications.mark_all_read')}
          </button>
        )}
      </div>

      {summary && (
        <div className="notifications-summary">
          <div className="summary-card">
            <div className="summary-icon unread">
              <i className="fas fa-envelope"></i>
            </div>
            <div className="summary-content">
              <h3>{t('dashboard.notifications.unread')}</h3>
              <p className="summary-value">{summary.unread_count || 0}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon urgent">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="summary-content">
              <h3>{t('dashboard.notifications.urgent')}</h3>
              <p className="summary-value">{summary.urgent_count || 0}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="summary-content">
              <h3>{t('dashboard.notifications.pending')}</h3>
              <p className="summary-value">{summary.pending_count || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="notifications-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => { setFilter('all'); setCurrentPage(1); }}
        >
          {t('dashboard.notifications.all')}
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => { setFilter('unread'); setCurrentPage(1); }}
        >
          {t('dashboard.notifications.unread')}
          {summary && summary.unread_count > 0 && (
            <span className="filter-badge">{summary.unread_count}</span>
          )}
        </button>
        <button
          className={`filter-btn ${filter === 'urgent' ? 'active' : ''}`}
          onClick={() => { setFilter('urgent'); setCurrentPage(1); }}
        >
          {t('dashboard.notifications.urgent')}
          {summary && summary.urgent_count > 0 && (
            <span className="filter-badge urgent">{summary.urgent_count}</span>
          )}
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => { setFilter('completed'); setCurrentPage(1); }}
        >
          {t('dashboard.notifications.completed')}
        </button>
        <button
          className={`filter-btn ${filter === 'dismissed' ? 'active' : ''}`}
          onClick={() => { setFilter('dismissed'); setCurrentPage(1); }}
        >
          {t('dashboard.notifications.dismissed')}
        </button>
      </div>

      <div className="notifications-controls">
        <div className="notifications-search">
          <i className="fas fa-search"></i>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={t('dashboard.notifications.search_placeholder', { defaultValue: 'Search notifications…' })}
          />
        </div>
        <div className="notifications-groupby">
          <label>{t('dashboard.notifications.group_by', { defaultValue: 'Group by' })}</label>
          <select
            value={groupBy}
            onChange={(e) => { setGroupBy(e.target.value); setCurrentPage(1); }}
          >
            <option value="">{t('dashboard.notifications.group_by_none', { defaultValue: 'None' })}</option>
            <option value="type">{t('dashboard.notifications.group_by_type', { defaultValue: 'Type' })}</option>
            <option value="priority">{t('dashboard.notifications.group_by_priority', { defaultValue: 'Priority' })}</option>
            <option value="date">{t('dashboard.notifications.group_by_date', { defaultValue: 'Date' })}</option>
          </select>
        </div>
      </div>

      <div className="notifications-list-container">
        {Array.isArray(grouped) && grouped.length > 0 && (
          <div className="notifications-grouped-summary">
            {grouped.map((g) => (
              <span key={`${g.type || g.priority || g.date}-${g.count}`} className="group-chip">
                <strong>{g.type || g.priority || g.date}</strong>
                <span className="group-chip-count">{g.count || 0}</span>
              </span>
            ))}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-bell-slash"></i>
            <h3>{t('dashboard.notifications.no_notifications')}</h3>
            <p>{t('dashboard.notifications.no_notifications_desc')}</p>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-card ${!notification.read_at ? 'unread' : ''} ${notification.priority === 'urgent' ? 'urgent' : ''}`}
                >
                  <div className="notification-main" onClick={() => handleNotificationClick(notification)}>
                    <div className={`notification-icon ${notification.priority}`}>
                      <i className={`fas ${notification?.visual?.icon || getNotificationIcon(notification.type)}`}></i>
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h3>{getTitle(notification)}</h3>
                        <div className="notification-meta">
                          {notification.priority === 'urgent' && (
                            <span className="priority-badge urgent">{t('dashboard.notifications.urgent')}</span>
                          )}
                          {!notification.read_at && (
                            <span className="unread-badge">{t('dashboard.notifications.unread')}</span>
                          )}
                          <span className="notification-date">
                            {formatDateTime(notification.created_at, lang)}
                          </span>
                        </div>
                      </div>
                      <p className="notification-description">
                        {(() => {
                          const notificationContractNumber = notification.contract_number || notification.contract_id;
                          const notificationContractId = notification.contract_id;
                          const description = getDescription(notification);
                          
                          return notificationContractId && notificationContractNumber
                            ? replaceContractIdWithNumber(description, notificationContractId, notificationContractNumber)
                            : description;
                        })()}
                      </p>
                      {!!getContextSummary(notification) && (
                        <div className="notification-context">
                          <i className="fas fa-info-circle"></i>
                          <span>{getContextSummary(notification)}</span>
                        </div>
                      )}
                      {notification.deadline && (
                        <div className="notification-deadline">
                          <i className="fas fa-clock"></i>
                          <span>{t('dashboard.notifications.deadline')}: {formatDate(notification.deadline, lang)}</span>
                          {notification.deadline_remaining_hours !== undefined && (
                            <span className={`deadline-warning ${notification.deadline_remaining_hours < 24 ? 'urgent' : ''}`}>
                              {notification.deadline_remaining_hours > 0
                                ? t('dashboard.notifications.hours_remaining', { hours: notification.deadline_remaining_hours })
                                : t('dashboard.notifications.overdue')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notification.read_at && (
                      <button
                        className="action-btn read"
                        onClick={() => handleMarkAsRead(notification.id)}
                        title={t('dashboard.notifications.mark_read')}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                    {notification.status === 'pending' && (
                      <>
                        <button
                          className="action-btn complete"
                          onClick={() => handleComplete(notification.id)}
                          title={t('dashboard.notifications.complete')}
                        >
                          <i className="fas fa-check-double"></i>
                        </button>
                        <button
                          className="action-btn dismiss"
                          onClick={() => handleDismiss(notification.id)}
                          title={t('dashboard.notifications.dismiss')}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                    {(notification.action_url || getQuickAction(notification)?.direct_url) && (
                      <button
                        className="action-btn primary"
                        onClick={() => navigate(getQuickAction(notification)?.direct_url || notification.action_url)}
                        title={t('dashboard.notifications.take_action')}
                      >
                        <i className={`fas ${getQuickAction(notification)?.icon || 'fa-arrow-left'}`}></i>
                        {pickText(
                          lang,
                          getQuickAction(notification)?.button_text_ar,
                          getQuickAction(notification)?.button_text,
                          t('dashboard.notifications.take_action')
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-right"></i>
                  {t('dashboard.pagination.previous')}
                </button>
                <span className="pagination-info">
                  {t('dashboard.pagination.page')} {currentPage} {t('dashboard.pagination.of')} {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('dashboard.pagination.next')}
                  <i className="fas fa-chevron-left"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedNotification && (
        <div className="modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="modal-content notification-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{getTitle(selectedNotification)}</h2>
              <button className="close-btn" onClick={() => setSelectedNotification(null)}>
                {t('close')}
              </button>
            </div>
            <div className="modal-body">
              <p>{(() => {
                const notificationContractNumber = selectedNotification.contract_number || selectedNotification.contract_id;
                const notificationContractId = selectedNotification.contract_id;
                const description = getDescription(selectedNotification);
                
                return notificationContractId && notificationContractNumber
                  ? replaceContractIdWithNumber(description, notificationContractId, notificationContractNumber)
                  : description;
              })()}</p>
              {!!getContextSummary(selectedNotification) && (
                <div className="detail-context">
                  <h4>{t('dashboard.notifications.context', { defaultValue: 'Context' })}</h4>
                  <p>{getContextSummary(selectedNotification)}</p>
                </div>
              )}
              {selectedNotification.deadline && (
                <div className="detail-deadline">
                  <i className="fas fa-clock"></i>
                  <strong>{t('dashboard.notifications.deadline')}:</strong>
                  {formatDate(selectedNotification.deadline, lang)}
                </div>
              )}
              {!!getHelp(selectedNotification) && (
                <div className="detail-help">
                  <button
                    className="help-toggle-btn"
                    onClick={() => setHelpOpen((v) => !v)}
                  >
                    <i className={`fas ${helpOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    {t('dashboard.notifications.how_to', { defaultValue: 'How to complete this' })}
                  </button>
                  {helpOpen && (
                    <div className="help-content">
                      {getHelp(selectedNotification)?.text && (
                        <p className="help-text">{getHelp(selectedNotification).text}</p>
                      )}
                      {toArray(getHelp(selectedNotification)?.tips).length > 0 && (
                        <div className="help-list">
                          <h5>{t('dashboard.notifications.tips', { defaultValue: 'Tips' })}</h5>
                          <ul>
                            {toArray(getHelp(selectedNotification)?.tips).map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {toArray(getHelp(selectedNotification)?.common_mistakes).length > 0 && (
                        <div className="help-list mistakes">
                          <h5>{t('dashboard.notifications.common_mistakes', { defaultValue: 'Common mistakes' })}</h5>
                          <ul>
                            {toArray(getHelp(selectedNotification)?.common_mistakes).map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(selectedNotification.action_url || getQuickAction(selectedNotification)?.direct_url) && (
                <button
                  className="primary-btn"
                  onClick={() => navigate(getQuickAction(selectedNotification)?.direct_url || selectedNotification.action_url)}
                >
                  {pickText(
                    lang,
                    getQuickAction(selectedNotification)?.button_text_ar,
                    getQuickAction(selectedNotification)?.button_text,
                    t('dashboard.notifications.take_action')
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
