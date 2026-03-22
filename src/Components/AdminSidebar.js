import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import '../Css/admin-sidebar.css';

const AdminSidebar = ({ isOpen, onToggle }) => {
  const { t, i18n } = useTranslation(['common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
  }, [i18n.language]);

  const menuItems = [
    {
      id: 'home',
      path: '/admin',
      icon: 'fa-home',
      label: 'الرئيسية',
      exact: true,
    },
    {
      id: 'investments',
      path: '/admin?section=investments',
      icon: 'fa-piggy-bank',
      label: 'الاستثمارات',
    },
    {
      id: 'contracts',
      path: '/admin/contracts',
      icon: 'fa-file-contract',
      label: 'العقود',
    },
    {
      id: 'reports',
      path: '/admin/statistics',
      icon: 'fa-chart-line',
      label: 'التقارير',
    },
    {
      id: 'settings',
      path: '/admin/settings',
      icon: 'fa-cog',
      label: 'الإعدادات'
    },
    {
      id: 'favorites',
      path: '/admin?section=favorites',
      icon: 'fa-heart',
      label: 'المفضلة'
    },
    {
      id: 'logout',
      path: '/logout',
      icon: 'fa-sign-out-alt',
      label: 'تسجيل الخروج'
    }
  ];

  const isActive = (item) => {
    if (item.id === 'home') {
      // Home is active only when no investments section query is set
      const isInvest = location.search.includes('section=investments');
      const isFav = location.search.includes('section=favorites');
      return location.pathname === '/admin' && !isInvest && !isFav;
    }

    if (item.id === 'investments') {
      return location.pathname === '/admin' && location.search.includes('section=investments');
    }

    if (item.id === 'favorites') {
      return location.pathname === '/admin' && location.search.includes('section=favorites');
    }

    return location.pathname === item.path || location.pathname.startsWith(item.path);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="admin-sidebar-overlay" 
          onClick={onToggle}
          style={{ animation: 'fadeIn 0.2s ease-in-out' }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`admin-sidebar ${isOpen ? 'open' : ''} ${isRTL ? 'rtl' : 'ltr'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <img src="/assets/images/logo.png" alt="Logo" />
            <h2>{t('admin.dashboard.title')}</h2>
          </div>
          <button className="admin-sidebar-close-btn" onClick={onToggle}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <ul className="admin-nav-menu">
            {menuItems.map((item) => (
              <li key={item.id} className="admin-nav-item">
                <button
                  className={`admin-nav-link ${isActive(item) ? 'active' : ''}`}
                  onClick={() => {
                    if (item.id === 'logout') {
                      handleLogout();
                      return;
                    }
                    handleNavigation(item.path);
                  }}
                >
                  <div className="admin-nav-link-content">
                    <i className={`fas ${item.icon}`}></i>
                    <span>{item.label}</span>
                  </div>
                  {isActive(item) && <div className="admin-active-indicator"></div>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-version">
            <p>v2.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
