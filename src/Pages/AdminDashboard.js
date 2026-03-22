import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import LanguageSwitcher from '../CustomComponents/LanguageSwitcher';
import UserManagement from '../Components/UserManagement';
import ContractManagement from '../Components/ContractManagement';
import { API_BASE_URL } from '../config';
import '../Css/admin-dashboard.css';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation(['common']);
  const { admin, logout, getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('statistics'); // 'users', 'contracts', 'statistics'
  const [lang, setLang] = useState(i18n.language || 'ar');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const currentLang = i18n.language || 'ar';
    setLang(currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLang);
  }, [i18n.language]);

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab]);

  // Handle window resize - close sidebar on mobile when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/dashboard/stats`,
        { headers }
      );

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const isRTL = lang === 'ar';

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="admin-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            <img src="/assets/images/logo.png" alt="Logo" className="admin-logo" />
            <h1 className="admin-title">{t('admin.dashboard.title')}</h1>
          </div>
          <div className="admin-header-right">
            <span className="admin-name">{admin?.name || admin?.email}</span>
            <LanguageSwitcher />
            <button className="logout-btn" onClick={logout}>
              {t('dashboard.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="admin-layout">
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar Navigation */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="admin-nav">
            <button
              className={`nav-item ${activeTab === 'statistics' ? 'active' : ''}`}
              onClick={() => handleTabChange('statistics')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">{t('admin.statistics.title')}</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">{t('admin.users.title')}</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'contracts' ? 'active' : ''}`}
              onClick={() => handleTabChange('contracts')}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-text">{t('admin.contracts.title')}</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          <div className="admin-content">
          {activeTab === 'statistics' && (
            <div className="statistics-section">
              <h2>{t('admin.statistics.title')}</h2>
              {loadingStats ? (
                <div className="admin-loading">
                  <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
                  <p>{t('dashboard.loading')}</p>
                </div>
              ) : stats ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>{t('admin.statistics.total_users')}</h3>
                    <p className="stat-value">{stats.total_users || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.active_users')}</h3>
                    <p className="stat-value">{stats.active_users || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.total_contracts')}</h3>
                    <p className="stat-value">{stats.total_contracts || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.pending_contracts')}</h3>
                    <p className="stat-value">{stats.pending_contracts || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.approved_contracts')}</h3>
                    <p className="stat-value">{stats.approved_contracts || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.denied_contracts')}</h3>
                    <p className="stat-value">{stats.denied_contracts || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.selling_contracts')}</h3>
                    <p className="stat-value">{stats.selling_contracts || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>{t('admin.statistics.rental_contracts')}</h3>
                    <p className="stat-value">{stats.rental_contracts || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>{t('admin.statistics.error')}</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'contracts' && <ContractManagement />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
