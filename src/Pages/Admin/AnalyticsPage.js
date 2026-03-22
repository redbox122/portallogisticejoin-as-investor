import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-analytics-page.css';

const AdminAnalyticsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeFilter, setTimeFilter] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [revenueRes, usersRes, contractsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/portallogistice/admin/analytics/revenue?period=${timeFilter}`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/admin/analytics/users?period=${timeFilter}`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/admin/analytics/contracts?period=${timeFilter}`, { headers })
      ]);

      const analyticsData = {};
      
      if (revenueRes.status === 'fulfilled' && revenueRes.value.data?.success) {
        analyticsData.revenue = revenueRes.value.data.data;
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        analyticsData.users = usersRes.value.data.data;
      }
      if (contractsRes.status === 'fulfilled' && contractsRes.value.data?.success) {
        analyticsData.contracts = contractsRes.value.data.data;
      }

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.analytics.error.fetch'),
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

  return (
    <div className="admin-analytics-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.sidebar.analytics')}</h1>
          <p className="admin-page-subtitle">{t('admin.analytics.subtitle')}</p>
        </div>
        <div className="admin-time-filter">
          <button
            className={`filter-btn ${timeFilter === 'year' ? 'active' : ''}`}
            onClick={() => setTimeFilter('year')}
          >
            {t('admin.analytics.filter.year')}
          </button>
          <button
            className={`filter-btn ${timeFilter === 'month' ? 'active' : ''}`}
            onClick={() => setTimeFilter('month')}
          >
            {t('admin.analytics.filter.month')}
          </button>
          <button
            className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`}
            onClick={() => setTimeFilter('week')}
          >
            {t('admin.analytics.filter.week')}
          </button>
        </div>
      </div>

      <div className="admin-analytics-grid">
        {/* Revenue Chart */}
        <div className="admin-analytics-card large">
          <h3>{t('admin.analytics.revenue_trend')}</h3>
          <div className="admin-chart-placeholder">
            <i className="fas fa-chart-line"></i>
            <p>{t('admin.analytics.chart_coming_soon')}</p>
            {analytics?.revenue && (
              <div className="admin-chart-data-preview">
                <p>{t('admin.analytics.total_revenue')}: {analytics.revenue.total?.toLocaleString() || 0} {t('admin.payments.currency')}</p>
              </div>
            )}
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="admin-analytics-card">
          <h3>{t('admin.analytics.user_growth')}</h3>
          <div className="admin-chart-placeholder">
            <i className="fas fa-chart-bar"></i>
            <p>{t('admin.analytics.chart_coming_soon')}</p>
            {analytics?.users && (
              <div className="admin-chart-data-preview">
                <p>{t('admin.analytics.new_users')}: {analytics.users.new_users || 0}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contract Distribution */}
        <div className="admin-analytics-card">
          <h3>{t('admin.analytics.contract_distribution')}</h3>
          <div className="admin-chart-placeholder">
            <i className="fas fa-chart-pie"></i>
            <p>{t('admin.analytics.chart_coming_soon')}</p>
            {analytics?.contracts && (
              <div className="admin-chart-data-preview">
                <p>{t('admin.analytics.total_contracts')}: {analytics.contracts.total || 0}</p>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="admin-analytics-card">
          <h3>{t('admin.analytics.key_metrics')}</h3>
          <div className="admin-metrics-list">
            <div className="admin-metric-item">
              <span className="metric-label">{t('admin.analytics.avg_contract_value')}</span>
              <span className="metric-value">
                {analytics?.revenue?.average_contract_value?.toLocaleString() || 0} {t('admin.payments.currency')}
              </span>
            </div>
            <div className="admin-metric-item">
              <span className="metric-label">{t('admin.analytics.approval_rate')}</span>
              <span className="metric-value">
                {analytics?.contracts?.approval_rate || 0}%
              </span>
            </div>
            <div className="admin-metric-item">
              <span className="metric-label">{t('admin.analytics.user_retention')}</span>
              <span className="metric-value">
                {analytics?.users?.retention_rate || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
