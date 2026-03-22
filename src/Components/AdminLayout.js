import React, { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AdminSidebar from './AdminSidebar';
import LanguageSwitcher from '../CustomComponents/LanguageSwitcher';
import '../Css/admin-layout.css';

const AdminLayout = () => {
  const { t, i18n } = useTranslation(['common']);
  const { admin, getAuthHeaders } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'light');
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('admin_search_query') || '');
  const [notificationCount, setNotificationCount] = useState(() => {
    const stored = localStorage.getItem('admin_notification_count');
    const n = stored ? Number(stored) : 0;
    return Number.isFinite(n) && n > 0 ? n : 3;
  });

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
    document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
    
    // Check if we need to force reload (detect stale cache on first load after login)
    const checkStaleCache = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasCacheBuster = urlParams.has('_t');
      const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
      
      if (!hasCacheBuster && justLoggedIn) {
        sessionStorage.removeItem('just_logged_in');
        setTimeout(() => {
          const separator = window.location.pathname.includes('?') ? '&' : '?';
          window.location.href = `${window.location.pathname}${separator}_t=${Date.now()}`;
        }, 50);
      }
    };
    
    checkStaleCache();
  }, [i18n.language]);

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const fetchNotificationCount = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await axios.get(
          `${API_BASE_URL}/portallogistice/admin/dashboard/stats`,
          { headers }
        );

        const d = res.data?.data || {};
        const urgent = d.urgentAlerts ?? d.urgent_alerts ?? d.urgent_alert ?? d.urgent ?? 3;
        const n = Number(urgent);
        if (!cancelled && Number.isFinite(n)) {
          setNotificationCount(n);
          localStorage.setItem('admin_notification_count', String(n));
        }
      } catch (e) {
        // keep fallback
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [getAuthHeaders]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const onSearchChange = (e) => {
    const q = e.target.value ?? '';
    setSearchQuery(q);
    localStorage.setItem('admin_search_query', q);
    window.dispatchEvent(new CustomEvent('admin-search', { detail: q }));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch (e) {
      return '';
    }
  }, []);

  const avatarInitial = useMemo(() => {
    const v = (admin?.name || admin?.email || 'A').toString().trim();
    return v ? v[0] : 'A';
  }, [admin]);

  return (
    <div className="admin-layout" data-admin-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
      <AdminSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className="admin-content-wrapper">
        <header className="admin-header">
          <div className="header-left">
            <LanguageSwitcher />
            <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
              <i className="fas fa-bars"></i>
            </button>
            <div className="header-breadcrumb">
              {/* Breadcrumb will be dynamic based on route */}
            </div>
          </div>
          <div className="header-right">
            <div className="admin-header-search-wrap">
              <input
                className="admin-header-search"
                placeholder="ابحث..."
                value={searchQuery}
                onChange={onSearchChange}
              />
              <i className="fas fa-search admin-header-search-icon" aria-hidden="true" />
            </div>

            <button type="button" className="admin-notifications-btn" aria-label="Notifications">
              <i className="fas fa-bell" />
              {notificationCount > 0 && (
                <span className="admin-notifications-count">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className="admin-theme-toggle-btn"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>

            <div className="admin-header-profile">
              <div className="admin-header-avatar">{avatarInitial}</div>
              <div className="admin-header-meta">
                <span className="admin-name">{admin?.name || admin?.email}</span>
                <span className="admin-header-date">{dateLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
