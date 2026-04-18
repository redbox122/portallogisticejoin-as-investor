import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import '../Css/admin-sidebar.css';

const UserSidebar = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation(['common']);
  const { logout } = useAuth();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
  }, [i18n.language]);

  const menuItems = [
    { id: 'home', path: '/dashboard', icon: 'fa-home', labelAr: 'الرئيسية', labelEn: 'Overview' },
    { id: 'investments', path: '/dashboard/investments', icon: 'fa-piggy-bank', labelAr: 'جدولة المستحقات الإيجارية', labelEn: 'Rental Schedule' },
    { id: 'contracts', path: '/dashboard/contracts', icon: 'fa-file-contract', labelAr: 'سجل تملك الأصول', labelEn: 'Asset Ownership' },
    { id: 'profits', path: '/dashboard/analytics', icon: 'fa-chart-line', labelAr: 'العوائد التشغيلية الموزعة', labelEn: 'Operational Returns' },
    { id: 'profile', path: '/dashboard/profile', icon: 'fa-user', labelAr: 'الملف الشخصي', labelEn: 'Profile' },
    { id: 'invoices', path: '/dashboard/invoices', icon: 'fa-file-invoice-dollar', labelAr: 'الفواتير', labelEn: 'Invoices' },
    { id: 'requests', path: '/dashboard/requests', icon: 'fa-envelope', labelAr: 'الطلبات', labelEn: 'Requests' },
    { id: 'logout', path: '/logout', icon: 'fa-sign-out-alt', labelAr: 'تسجيل الخروج', labelEn: 'Logout' },
  ];

  const isActive = (item) => {
    if(item.id === 'home') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
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
            <h2>{isRTL ? 'لوحة المستخدم' : 'Dashboard'}</h2>
          </div>
          <button className="admin-sidebar-close-btn" onClick={onToggle} type="button">
            <i className="fas fa-times" />
          </button>
        </div>

        <nav className="admin-sidebar-nav" id="dashboard-sidebar-nav" aria-label={isRTL ? 'لوحة التنقل' : 'Navigation'}>
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
                    <span>{isRTL ? item.labelAr : item.labelEn}</span>
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

