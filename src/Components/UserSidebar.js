import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import '../Css/admin-sidebar.css';

const UserSidebar = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation(['common']);
  const { logout } = useAuth();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
  }, [i18n.language]);

  const menuItems = [
    { id: 'home', path: '/dashboard', icon: 'fa-home', label: 'الرئيسية', exact: true },
    { id: 'investments', path: '/dashboard/investments', icon: 'fa-piggy-bank', label: 'استثماراتي' },
    { id: 'contracts', path: '/dashboard/contracts', icon: 'fa-file-contract', label: 'العقود' },
    { id: 'profits', path: '/dashboard/analytics', icon: 'fa-chart-line', label: 'الأرباح' },
    { id: 'profile', path: '/dashboard/profile', icon: 'fa-user', label: 'الملف الشخصي' },
    { id: 'logout', path: '/logout', icon: 'fa-sign-out-alt', label: 'تسجيل الخروج' },
  ];

  const isActive = (item) => {
    // if (item.id === 'home') {
    //   const isInvest = location.search.includes('section=investments');
    //   return location.pathname === '/dashboard' && !isInvest;
    // }

    // if (item.id === 'investments') {
    //   return location.pathname === '/dashboard' && location.search.includes('section=investments');
    // }

    return item.exact ? location.pathname === item.path : location.pathname === item.path || location.pathname.startsWith(item.path);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) onToggle();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    if (window.innerWidth < 1024) onToggle();
  };

  return (
    <>
      {isOpen && (
        <div className="admin-sidebar-overlay" onClick={onToggle} style={{ animation: 'fadeIn 0.2s ease-in-out' }} />
      )}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''} ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <img src="/assets/images/logo.png" alt="Logo" />
            <h2>لوحة المستخدم</h2>
          </div>
          <button className="admin-sidebar-close-btn" onClick={onToggle} type="button">
            <i className="fas fa-times" />
          </button>
        </div>

        <nav className="admin-sidebar-nav" id="dashboard-sidebar-nav" aria-label="لوحة التنقل">
          <ul className="admin-nav-menu">
            {menuItems.map((item) => (
              <li key={item.id} className="admin-nav-item">
                <button
                  type="button"
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
                    <i className={`fas ${item.icon}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive(item) && <div className="admin-active-indicator" />}
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

export default UserSidebar;

