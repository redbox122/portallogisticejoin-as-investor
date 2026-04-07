import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import UserSidebar from './UserSidebar';
import SaasLanguageSwitcher from '../CustomComponents/SaasLanguageSwitcher';
import RefusalNotificationDialog from './RefusalNotificationDialog';
import RealTimeNotificationHandler from './RealTimeNotificationHandler';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../Css/admin-layout.css';
import '../Css/dashboard-header-saas.css';
import DashboardFooter from './DashboardFooter';

const THEME_KEY = 'theme';
const LEGACY_THEME_KEY = 'user_theme';

const DashboardLayout = () => {
  const { i18n } = useTranslation(['common']);
  const navigate = useNavigate();
  const { getAuthHeaders, isAuthenticated, user, logout } = useAuth();
  const userMenuRef = useRef(null);
  const userMenuDropdownId = useId();
  const userMenuTriggerId = useId();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');
  const [refusalNotification, setRefusalNotification] = useState(null);
  const [hasCheckedRefusals, setHasCheckedRefusals] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY) || 'light';
  });
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('user_search_query') || '');
  const [notificationCount, setNotificationCount] = useState(() => {
    const stored = localStorage.getItem('user_notification_count');
    const n = stored ? Number(stored) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
    document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
    
    // Check if we need to force reload (detect stale cache on first load after login)
    // This runs once on mount to catch cases where old JS is still loaded
    const checkStaleCache = () => {
      // Check if URL has cache-busting param, if not and we just logged in, might be stale
      const urlParams = new URLSearchParams(window.location.search);
      const hasCacheBuster = urlParams.has('_t');
      const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
      
      // If no cache buster and we just logged in, reload once with cache buster
      if (!hasCacheBuster && justLoggedIn) {
        sessionStorage.removeItem('just_logged_in');
        // Small delay to ensure state is set, then reload with cache buster
        setTimeout(() => {
          const separator = window.location.pathname.includes('?') ? '&' : '?';
          window.location.href = `${window.location.pathname}${separator}_t=${Date.now()}`;
        }, 50);
      }
    };
    
    checkStaleCache();
  }, [i18n.language]);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LEGACY_THEME_KEY, theme);
  }, [theme]);

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
    try {
      const v = (user?.name || user?.email || user?.first_name || 'A').toString().trim();
      return v ? v[0] : 'A';
    } catch (e) {
      return 'A';
    }
  }, [user, isAuthenticated]);

  const onSearchChange = (e) => {
    const q = e?.target?.value ?? '';
    setSearchQuery(q);
    localStorage.setItem('user_search_query', q);
    window.dispatchEvent(new CustomEvent('user-search', { detail: q }));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const onDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        document.getElementById(userMenuTriggerId)?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [userMenuOpen, userMenuTriggerId]);

  const displayName = useMemo(() => {
    const parts = [user?.first_name, user?.family_name || user?.last_name].filter(Boolean);
    const joined = parts.join(' ').trim();
    return joined || user?.name || user?.email || (i18n.language === 'ar' ? 'مستخدم' : 'User');
  }, [user, i18n.language]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const headers = getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/portallogistice/notifications/count`, { headers });
        if (cancelled) return;
        if (response.data?.success) {
          const unread = response.data.data?.unread_count ?? 0;
          const urgent = response.data.data?.urgent_count ?? 0;
          const n = Number(urgent) > 0 ? Number(urgent) : Number(unread);
          const safe = Number.isFinite(n) ? Math.max(0, n) : 0;
          setNotificationCount(safe);
          localStorage.setItem('user_notification_count', String(safe));
        }
      } catch (e) {
        // keep fallback
      }
    };

    // fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [getAuthHeaders]);

  // Check for unread refusal notifications when user logs in or opens dashboard
  useEffect(() => {
    const checkRefusalNotifications = async () => {
      // Only check if authenticated
      if (!isAuthenticated) {
        return;
      }

      // Check if we've already checked in this session
      const sessionKey = 'refusal_notifications_checked';
      const hasChecked = sessionStorage.getItem(sessionKey) === 'true';
      
      // Reset check flag if user just logged in
      const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
      if (justLoggedIn) {
        sessionStorage.removeItem(sessionKey);
      }

      // Only check once per session (unless user just logged in)
      if (hasChecked && !justLoggedIn) {
        return;
      }

      try {
        const headers = getAuthHeaders();
        // Fetch unread notifications with refusal types
        const response = await axios.get(
          `${API_BASE_URL}/portallogistice/notifications?status=pending&read=false`,
          { headers }
        );

        if (response.data?.success) {
          const notifications = response.data.data.notifications || [];
          
          // Find the most recent unread refusal notification that hasn't been shown
          const refusalTypes = ['document_rejected', 'contract_denied'];
          const shownNotifications = JSON.parse(sessionStorage.getItem('shown_refusal_notifications') || '[]');
          
          const refusalNotification = notifications
            .filter(n => 
              refusalTypes.includes(n.type) && 
              !n.read_at &&
              !shownNotifications.includes(n.id) // Don't show if already shown in this session
            )
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

          if (refusalNotification) {
            setRefusalNotification(refusalNotification);
            // Mark as shown in session
            shownNotifications.push(refusalNotification.id);
            sessionStorage.setItem('shown_refusal_notifications', JSON.stringify(shownNotifications));
          }
          
          // Mark as checked
          sessionStorage.setItem(sessionKey, 'true');
          setHasCheckedRefusals(true);
        }
      } catch (error) {
        console.error('Error checking refusal notifications:', error);
        // Don't block the UI if there's an error
        sessionStorage.setItem(sessionKey, 'true');
        setHasCheckedRefusals(true);
      }
    };

    // Small delay to ensure auth is ready
    const timer = setTimeout(() => {
      checkRefusalNotifications();
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, getAuthHeaders]);

  const handleMarkAsRead = async () => {
    if (!refusalNotification?.id) return;

    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${refusalNotification.id}/read`,
        {},
        { headers }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleCloseDialog = () => {
    setRefusalNotification(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen((v) => !v);
  };

  const closeUserMenu = () => setUserMenuOpen(false);
  const notificationsLabel = isRTL ? 'الإشعارات' : 'Notifications';
  const themeLabel =
    theme === 'dark'
      ? isRTL
        ? 'الوضع الفاتح'
        : 'Light mode'
      : isRTL
        ? 'الوضع الداكن'
        : 'Dark mode';
  return (
    <div className="admin-layout" data-admin-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
      <UserSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      <div className="admin-content-wrapper">
        <header className="admin-header admin-header--dashboard">
          <div className="admin-header__start">
            <SaasLanguageSwitcher />
            <button
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              type="button"
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar-nav"
              aria-label={isRTL ? 'فتح أو إغلاق القائمة' : 'Open or close menu'}
            >
              <i className="fas fa-bars" aria-hidden="true" />
            </button>
          </div>

          <div className="admin-header__center">
            <label className="visually-hidden" htmlFor="dashboard-header-search">
              {isRTL ? 'بحث في لوحة التحكم' : 'Search dashboard'}
            </label>
            <div className="admin-header-search-wrap">
              <input
                id="dashboard-header-search"
                className="admin-header-search"
                placeholder={isRTL ? 'ابحث...' : 'Search...'}
                value={searchQuery}
                onChange={onSearchChange}
                type="search"
                autoComplete="off"
              />
              <i className="fas fa-search admin-header-search-icon" aria-hidden="true" />
            </div>
          </div>

          <div className="admin-header__end">
            <div className="admin-header__toolbar" role="toolbar" aria-label={isRTL ? 'أدوات شريط العنوان' : 'Header tools'}>
              <button
                type="button"
                className="admin-notifications-btn"
                aria-label={notificationsLabel}
                onClick={() => {
                  closeUserMenu();
                  navigate('/dashboard/notifications');
                }}
              >
                <i className="fas fa-bell" aria-hidden="true" />
                {notificationCount > 0 && (
                  <span className="admin-notifications-count" aria-hidden="true">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="admin-theme-toggle-btn"
                aria-label={themeLabel}
                onClick={toggleTheme}
              >
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
              </button>
            </div>

            <div className="user-header-menu-wrap" ref={userMenuRef}>
              {userMenuOpen && (
                <button
                  type="button"
                  className="user-header-menu-backdrop"
                  aria-label={isRTL ? 'إغلاق قائمة الحساب' : 'Close account menu'}
                  tabIndex={-1}
                  onClick={closeUserMenu}
                />
              )}
              <button
                type="button"
                id={userMenuTriggerId}
                className="user-header-menu-trigger"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-controls={userMenuDropdownId}
                aria-label={isRTL ? `${displayName}، قائمة الحساب` : `${displayName}, account menu`}
              >
                <span className="admin-header-avatar" aria-hidden="true">
                  {avatarInitial}
                </span>
                <span className="admin-header-meta" aria-hidden="true">
                  <span className="admin-name">{displayName}</span>
                  <span className="admin-header-date">{dateLabel}</span>
                </span>
                <i
                  className={`fas fa-chevron-down user-header-chevron ${userMenuOpen ? 'user-header-chevron--open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {userMenuOpen && (
                <div
                  className="user-header-dropdown"
                  id={userMenuDropdownId}
                  role="menu"
                  aria-labelledby={userMenuTriggerId}
                >
                  <div className="user-header-dropdown-header">
                    <p className="user-header-dropdown-name">{displayName}</p>
                    <p className="user-header-dropdown-email">{user?.email || '—'}</p>
                  </div>
                  <div className="user-header-dropdown-divider" role="presentation" />
                  <button
                    type="button"
                    className="user-header-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      closeUserMenu();
                      navigate('/dashboard/profile');
                    }}
                  >
                    <i className="fas fa-user" aria-hidden="true" />
                    {i18n.language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                  </button>
                  <button
                    type="button"
                    className="user-header-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      closeUserMenu();
                      navigate('/dashboard/settings');
                    }}
                  >
                    <i className="fas fa-cog" aria-hidden="true" />
                    {i18n.language === 'ar' ? 'الإعدادات' : 'Settings'}
                  </button>
                  <div className="user-header-dropdown-divider" role="presentation" />
                  <button
                    type="button"
                    className="user-header-dropdown-item user-header-dropdown-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt" aria-hidden="true" />
                    {i18n.language === 'ar' ? 'تسجيل الخروج' : 'Log out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-main-content" id="dashboard-main-content">
          <Outlet />
        </main>

        <DashboardFooter />
      </div>

      {/* Real-time Notification Handler - handles all notification types with sound and popup */}
      <RealTimeNotificationHandler />

      {/* Legacy Refusal Notification Dialog - kept for backward compatibility */}
      {refusalNotification && (
        <RefusalNotificationDialog
          notification={refusalNotification}
          onClose={handleCloseDialog}
          onMarkAsRead={handleMarkAsRead}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
