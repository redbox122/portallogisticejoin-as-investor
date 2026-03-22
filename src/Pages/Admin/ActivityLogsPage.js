import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-activity-page.css';

const AdminActivityLogsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    action_type: 'all',
    user: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 50, last_page: 1 });

  useEffect(() => {
    fetchLogs();
  }, [filters, currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (filters.action_type !== 'all') params.append('action_type', filters.action_type);
      if (filters.user) params.append('user', filters.user);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      params.append('per_page', '50');
      params.append('page', currentPage.toString());

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/activity-logs?${params.toString()}`,
        { headers }
      );

      if (response.data?.success) {
        const data = response.data.data;
        setLogs(data.logs || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.activity.error.fetch'),
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

  const getActionIcon = (actionType) => {
    const icons = {
      login: 'fa-sign-in-alt',
      logout: 'fa-sign-out-alt',
      contract_created: 'fa-file-contract',
      contract_approved: 'fa-check-circle',
      contract_denied: 'fa-times-circle',
      payment_sent: 'fa-paper-plane',
      payment_received: 'fa-check-double',
      document_uploaded: 'fa-upload',
      document_approved: 'fa-check',
      document_rejected: 'fa-times',
      profile_updated: 'fa-user-edit',
      user_created: 'fa-user-plus'
    };
    return icons[actionType] || 'fa-circle';
  };

  const getActionColor = (actionType) => {
    if (actionType.includes('approved') || actionType.includes('received')) return '#10b981';
    if (actionType.includes('denied') || actionType.includes('rejected')) return '#ef4444';
    if (actionType.includes('created') || actionType.includes('uploaded')) return '#3b82f6';
    return '#6b7280';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="admin-page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="admin-activity-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.sidebar.activity')}</h1>
          <p className="admin-page-subtitle">{t('admin.activity.subtitle')}</p>
        </div>
        <button className="admin-export-btn" onClick={() => {
          // Export functionality
          Store.addNotification({
            title: t('admin.activity.export'),
            message: t('admin.activity.export_coming_soon'),
            type: 'info',
            insert: 'top',
            container: 'top-right',
            animationIn: ['animate__animated', 'animate__fadeIn'],
            animationOut: ['animate__animated', 'animate__fadeOut'],
            dismiss: { duration: 3000 }
          });
        }}>
          <i className="fas fa-download"></i> {t('admin.activity.export')}
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters-section">
        <div className="admin-filters-grid">
          <input
            type="text"
            className="admin-filter-input"
            placeholder={t('admin.activity.search_user')}
            value={filters.user}
            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
          />
          <select
            className="admin-filter-select"
            value={filters.action_type}
            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
          >
            <option value="all">{t('admin.activity.filter.all_actions')}</option>
            <option value="login">{t('admin.activity.filter.login')}</option>
            <option value="contract_created">{t('admin.activity.filter.contract_created')}</option>
            <option value="contract_approved">{t('admin.activity.filter.contract_approved')}</option>
            <option value="payment_sent">{t('admin.activity.filter.payment_sent')}</option>
            <option value="document_uploaded">{t('admin.activity.filter.document_uploaded')}</option>
          </select>
          <input
            type="date"
            className="admin-filter-input"
            placeholder={t('admin.activity.date_from')}
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <input
            type="date"
            className="admin-filter-input"
            placeholder={t('admin.activity.date_to')}
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="admin-activity-timeline">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={log.id || index} className="admin-activity-item">
              <div className="admin-activity-icon" style={{ color: getActionColor(log.action_type) }}>
                <i className={`fas ${getActionIcon(log.action_type)}`}></i>
              </div>
              <div className="admin-activity-content">
                <div className="admin-activity-header">
                  <h4>{log.description || log.action_type}</h4>
                  <span className="admin-activity-time">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                  </span>
                </div>
                <div className="admin-activity-details">
                  <span className="admin-activity-user">{log.user_id || log.national_id || t('admin.activity.system')}</span>
                  {log.metadata && (
                    <span className="admin-activity-meta">{JSON.stringify(log.metadata)}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="admin-empty-state">
            <i className="fas fa-history"></i>
            <p>{t('admin.activity.empty')}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <i className="fas fa-chevron-right"></i> {t('admin.pagination.previous')}
          </button>
          <span className="admin-page-info">
            {t('admin.pagination.page')} {currentPage} {t('admin.pagination.of')} {pagination.last_page}
          </span>
          <button
            className="admin-page-btn"
            disabled={currentPage === pagination.last_page}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            {t('admin.pagination.next')} <i className="fas fa-chevron-left"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminActivityLogsPage;
