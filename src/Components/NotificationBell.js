import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { getLang, pickFieldText, formatDate } from '../Utitlities/uxText';
import { API_BASE_URL } from '../config';
import '../Css/notification-bell.css';

const NotificationBell = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState({ unread: 0, urgent: 0 });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const lang = getLang(i18n);

  useEffect(() => {
    // fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotificationCount = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications/count`,
        { headers }
      );
      if (response.data?.success) {
        setCount({
          unread: response.data.data.unread_count || 0,
          urgent: response.data.data.urgent_count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications?status=pending&per_page=5`,
        { headers }
      );
      if (response.data?.success) {
        setNotifications(response.data.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${id}/read`,
        {},
        { headers }
      );
      fetchNotificationCount();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleViewAll = () => {
    navigate('/dashboard/notifications');
    setIsOpen(false);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id, { stopPropagation: () => {} });
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      navigate('/dashboard/notifications');
    }
    setIsOpen(false);
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {count.unread > 0 && (
          <span className="notification-badge">
            {count.unread > 99 ? '99+' : count.unread}
          </span>
        )}
        {count.urgent > 0 && count.unread === 0 && (
          <span className="notification-badge urgent-dot"></span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>{t('dashboard.notifications.title')}</h3>
            {count.unread > 0 && (
              <span className="unread-count">{count.unread} {t('dashboard.notifications.unread')}</span>
            )}
          </div>

          <div className="dropdown-content">
            {loading ? (
              <div className="dropdown-loading">
                <i className="fas fa-spinner fa-spin"></i>
                <p>{t('dashboard.loading')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="dropdown-empty">
                <i className="fas fa-bell-slash"></i>
                <p>{t('dashboard.notifications.no_notifications')}</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read_at ? 'unread' : ''} ${notification.priority === 'urgent' ? 'urgent' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      <i className={`fas ${
                        notification.type === 'upload_receipt' ? 'fa-receipt' :
                        notification.type === 'complete_profile' ? 'fa-user' :
                        notification.type === 'upload_doc' ? 'fa-file-upload' :
                        notification.type === 'create_rental' ? 'fa-motorcycle' :
                        notification.type === 'document_approved' ? 'fa-check-circle' :
                        notification.type === 'document_rejected' ? 'fa-times-circle' :
                        notification.type === 'contract_approved' ? 'fa-check' :
                        notification.type === 'contract_denied' ? 'fa-times' :
                        'fa-bell'
                      }`}></i>
                    </div>
                    <div className="notification-content">
                      <h4>
                        {pickFieldText(lang, notification, ['title_ar', 'title'], ['title_en', 'title'], '')}
                      </h4>
                      <p>
                        {pickFieldText(lang, notification, ['description_ar', 'description'], ['description_en', 'description'], '')}
                      </p>
                      {notification.deadline && (
                        <span className="notification-deadline">
                          <i className="fas fa-clock"></i>
                          {formatDate(notification.deadline, lang)}
                        </span>
                      )}
                    </div>
                    {!notification.read_at && (
                      <div className="unread-indicator"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dropdown-footer">
            <button className="view-all-btn" onClick={handleViewAll}>
              {t('dashboard.notifications.view_all')} <i className={`fas ${i18n.language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
