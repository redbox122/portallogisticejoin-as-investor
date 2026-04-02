import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { getLang, formatDateTime } from '../../Utitlities/uxText';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/notifications-page.css';

const NotificationsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({ unread_count: 0, urgent_count: 0 });
  const [filter, setFilter] = useState('all'); // all | unread
  const [search, setSearch] = useState('');
  const lang = getLang(i18n);

  useEffect(() => {
    fetchCount();
    // Light debounce for search/filter changes
    const handle = setTimeout(() => {
      fetchNotifications();
    }, search ? 350 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const fetchCount = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/portallogistice/notifications/count`, { headers });
      if (response.data?.success) {
        setSummary({
          unread_count: response.data?.data?.unread_count || 0,
          urgent_count: response.data?.data?.urgent_count || 0,
        });
      }
    } catch (e) {
      // non-blocking
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = { per_page: 50 };
      if (filter === 'unread') params.read = 'false';

      if (search && search.trim()) {
        // backend currently ignores search; keep param for forward compatibility
        params.search = search.trim();
      }

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications`,
        { headers, params }
      );

      if (response.data?.success) {
        const items = response.data?.data?.notifications || response.data?.data || [];
        const list = Array.isArray(items) ? items : [];
        setNotifications(list);
        // keep count in sync with backend for correctness
        fetchCount();
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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      fetchCount();
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
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      fetchCount();
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

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.ref_type === 'contract' && notification.ref_id) {
      navigate('/dashboard/contracts');
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

  const getTitle = (n) => n?.title || t('dashboard.notifications.title', { defaultValue: 'Notification' });
  const getDescription = (n) => n?.body || '';

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
        </div>
      )}

      <div className="notifications-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => { setFilter('all'); }}
        >
          {t('dashboard.notifications.all')}
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => { setFilter('unread'); }}
        >
          {t('dashboard.notifications.unread')}
          {summary && summary.unread_count > 0 && (
            <span className="filter-badge">{summary.unread_count}</span>
          )}
        </button>
      </div>

      <div className="notifications-controls">
        <div className="notifications-search">
          <i className="fas fa-search"></i>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            placeholder={t('dashboard.notifications.search_placeholder', { defaultValue: 'Search notifications…' })}
          />
        </div>
      </div>

      <div className="notifications-list-container">
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
                  className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                >
                  <div className="notification-main" onClick={() => handleNotificationClick(notification)}>
                    <div className="notification-icon">
                      <i className={`fas ${notification?.visual?.icon || getNotificationIcon(notification.type)}`}></i>
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h3>{getTitle(notification)}</h3>
                        <div className="notification-meta">
                          {!notification.is_read && (
                            <span className="unread-badge">{t('dashboard.notifications.unread')}</span>
                          )}
                          <span className="notification-date">
                            {formatDateTime(notification.created_at, lang)}
                          </span>
                        </div>
                      </div>
                      <p className="notification-description">
                        {getDescription(notification)}
                      </p>
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button
                        className="action-btn read"
                        onClick={() => handleMarkAsRead(notification.id)}
                        title={t('dashboard.notifications.mark_read')}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default NotificationsPage;
