import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import { useContractEligibility } from '../hooks/useContractEligibility';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../Css/dashboard-sidebar.css';

const DashboardSidebar = ({ isOpen, onToggle }) => {
  const { t, i18n } = useTranslation(['common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { getAuthHeaders, logout } = useAuth();
  const { canAccessPayments } = useContractEligibility();
  const [notificationCount, setNotificationCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
  }, [i18n.language]);

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications/count`,
        { headers }
      );
      if (response.data?.success) {
        setNotificationCount(response.data.data.unread_count || 0);
        setUrgentCount(response.data.data.urgent_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const menuItems = [
    {
      id: 'overview',
      path: '/dashboard',
      icon: 'fa-home',
      label: t('dashboard.sidebar.overview'),
      exact: true
    },
    {
      id: 'analytics',
      path: '/dashboard/analytics',
      icon: 'fa-chart-line',
      label: t('dashboard.sidebar.analytics')
    },
    {
      id: 'contracts',
      path: '/dashboard/contracts',
      icon: 'fa-file-contract',
      label: t('dashboard.sidebar.contracts')
    },
    {
      id: 'payments',
      path: '/dashboard/payments',
      icon: 'fa-money-bill-wave',
      label: t('dashboard.sidebar.payments'),
      requiresActiveContract: true
    },
    {
      id: 'profile',
      path: '/dashboard/profile',
      icon: 'fa-user',
      label: t('dashboard.sidebar.profile')
    },
    {
      id: 'tasks',
      path: '/dashboard/tasks',
      icon: 'fa-tasks',
      label: t('dashboard.sidebar.tasks'),
      badge: notificationCount > 0 ? notificationCount : null,
      urgent: urgentCount > 0
    },
    {
      id: 'contractor-info',
      path: '/dashboard/contractor-info',
      icon: 'fa-file-pdf',
      label: t('dashboard.sidebar.contractor_info')
    }
  ];

  // Filter menu items based on eligibility
  const visibleMenuItems = menuItems.filter(item => {
    // Hide payments if user doesn't have access
    if (item.requiresActiveContract && !canAccessPayments) {
      return false;
    }
    return true;
  });

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      onToggle(); // Close sidebar on mobile after navigation
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    if (window.innerWidth < 1024) {
      onToggle(); // Close sidebar on mobile after logout
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onToggle}
          style={{ animation: 'fadeIn 0.2s ease-in-out' }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`dashboard-sidebar ${isOpen ? 'open' : ''} ${isRTL ? 'rtl' : 'ltr'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/assets/images/logo.png" alt="Logo" />
            <h2>{t('dashboard.title')}</h2>
          </div>
          <button className="sidebar-close-btn" onClick={onToggle}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {visibleMenuItems.map((item) => (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-link ${isActive(item) ? 'active' : ''} ${item.urgent ? 'urgent' : ''}`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <div className="nav-link-content">
                    <i className={`fas ${item.icon}`}></i>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                    )}
                    {item.urgent && !item.badge && (
                      <span className="nav-badge urgent-dot"></span>
                    )}
                  </div>
                  {isActive(item) && <div className="active-indicator"></div>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>{t('dashboard.logout')}</span>
          </button>
          <div className="sidebar-version">
            <p>v2.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
