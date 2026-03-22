import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-statistics-page.css';

const AdminStatisticsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchStatistics();
  }, [timeFilter]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/dashboard/stats`,
        { headers, params: { period: timeFilter } }
      );

      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.statistics.error'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: t('admin.statistics.total_users'),
      value: stats?.total_users || 0,
      icon: 'fa-users',
      color: '#073491',
      bgGradient: 'linear-gradient(135deg, #073491 0%, #1e4fad 100%)'
    },
    {
      label: t('admin.statistics.active_users'),
      value: stats?.active_users || 0,
      icon: 'fa-user-check',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      label: t('admin.statistics.total_contracts'),
      value: stats?.total_contracts || 0,
      icon: 'fa-file-contract',
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      label: t('admin.statistics.pending_contracts'),
      value: stats?.pending_contracts || 0,
      icon: 'fa-clock',
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      urgent: true
    },
    {
      label: t('admin.statistics.approved_contracts'),
      value: stats?.approved_contracts || 0,
      icon: 'fa-check-circle',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      label: t('admin.statistics.denied_contracts'),
      value: stats?.denied_contracts || 0,
      icon: 'fa-times-circle',
      color: '#ef4444',
      bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    },
    {
      label: t('admin.statistics.selling_contracts'),
      value: stats?.selling_contracts || 0,
      icon: 'fa-hand-holding-usd',
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    },
    {
      label: t('admin.statistics.rental_contracts'),
      value: stats?.rental_contracts || 0,
      icon: 'fa-key',
      color: '#06b6d4',
      bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    }
  ];

  return (
    <div className="admin-statistics-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.statistics.title')}</h1>
          <p className="admin-page-subtitle">{t('admin.statistics.subtitle')}</p>
        </div>
        <div className="admin-time-filter">
          <button
            className={`filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTimeFilter('all')}
          >
            {t('admin.statistics.filter.all')}
          </button>
          <button
            className={`filter-btn ${timeFilter === 'month' ? 'active' : ''}`}
            onClick={() => setTimeFilter('month')}
          >
            {t('admin.statistics.filter.month')}
          </button>
          <button
            className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`}
            onClick={() => setTimeFilter('week')}
          >
            {t('admin.statistics.filter.week')}
          </button>
        </div>
      </div>

      {stats ? (
        <>
          <div className="admin-stats-grid">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className={`admin-stat-card ${stat.urgent ? 'urgent' : ''}`}
                style={{ '--card-gradient': stat.bgGradient }}
              >
                <div className="admin-stat-card-header">
                  <div className="admin-stat-icon" style={{ color: stat.color }}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <div className="admin-stat-value-wrapper">
                    <h3 className="admin-stat-value">{stat.value.toLocaleString()}</h3>
                    <p className="admin-stat-label">{stat.label}</p>
                  </div>
                </div>
                {stat.urgent && (
                  <div className="admin-stat-urgent-badge">
                    <i className="fas fa-exclamation-circle"></i>
                    {t('admin.statistics.requires_attention')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Charts Placeholder - Will be enhanced with Chart.js later */}
          <div className="admin-charts-section">
            <div className="admin-chart-card">
              <h3>{t('admin.statistics.revenue_trend')}</h3>
              <div className="admin-chart-placeholder">
                <i className="fas fa-chart-line"></i>
                <p>{t('admin.statistics.chart_coming_soon')}</p>
              </div>
            </div>
            <div className="admin-chart-card">
              <h3>{t('admin.statistics.user_growth')}</h3>
              <div className="admin-chart-placeholder">
                <i className="fas fa-chart-bar"></i>
                <p>{t('admin.statistics.chart_coming_soon')}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="admin-empty-state">
          <i className="fas fa-chart-bar"></i>
          <p>{t('admin.statistics.error')}</p>
        </div>
      )}
    </div>
  );
};

export default AdminStatisticsPage;
