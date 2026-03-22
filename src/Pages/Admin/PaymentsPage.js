import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-payments-page.css';

const AdminPaymentsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, last_page: 1 });

  useEffect(() => {
    fetchPayments();
  }, [filters, currentPage]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
      params.append('per_page', '20');
      params.append('page', currentPage.toString());

      const [paymentsRes, summaryRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/portallogistice/admin/payments?${params.toString()}`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/admin/payments/summary`, { headers })
      ]);

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data?.success) {
        const data = paymentsRes.value.data.data;
        setPayments(data.payments || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.success) {
        setSummary(summaryRes.value.data.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.payments.error.fetch'),
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

  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/admin/payments/${paymentId}/status`,
        { status: newStatus },
        { headers }
      );
      Store.addNotification({
        title: t('admin.success.title'),
        message: t('admin.payments.success.updated'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000 }
      });
      fetchPayments();
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.payments.error.update'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="admin-page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="admin-payments-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.sidebar.payments')}</h1>
          <p className="admin-page-subtitle">{t('admin.payments.subtitle')}</p>
        </div>
        {summary && (
          <div className="admin-payments-summary">
            <div className="summary-card">
              <h3>{t('admin.payments.total_sent')}</h3>
              <p className="summary-value">{summary.total_sent?.toLocaleString() || 0} {t('admin.payments.currency')}</p>
            </div>
            <div className="summary-card">
              <h3>{t('admin.payments.pending')}</h3>
              <p className="summary-value pending">{summary.pending?.toLocaleString() || 0} {t('admin.payments.currency')}</p>
            </div>
            <div className="summary-card">
              <h3>{t('admin.payments.received')}</h3>
              <p className="summary-value received">{summary.received?.toLocaleString() || 0} {t('admin.payments.currency')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="admin-filters-section">
        <div className="admin-filters-grid">
          <input
            type="text"
            className="admin-filter-input"
            placeholder={t('admin.payments.search_placeholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="admin-filter-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">{t('admin.payments.filter.all')}</option>
            <option value="pending">{t('admin.payments.filter.pending')}</option>
            <option value="sent">{t('admin.payments.filter.sent')}</option>
            <option value="received">{t('admin.payments.filter.received')}</option>
          </select>
          <input
            type="date"
            className="admin-filter-input"
            placeholder={t('admin.payments.date_from')}
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <input
            type="date"
            className="admin-filter-input"
            placeholder={t('admin.payments.date_to')}
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="admin-payments-table-container">
        {payments.length > 0 ? (
          <table className="admin-payments-table">
            <thead>
              <tr>
                <th>{t('admin.payments.contract_id')}</th>
                <th>{t('admin.payments.user')}</th>
                <th>{t('admin.payments.amount')}</th>
                <th>{t('admin.payments.due_date')}</th>
                <th>{t('admin.payments.status')}</th>
                <th>{t('admin.payments.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.contract_id || payment.contract?.tracking_id || `#${payment.contract_id}`}</td>
                  <td>{payment.national_id || payment.user?.national_id}</td>
                  <td className="amount-cell">{payment.amount?.toLocaleString() || 0} {t('admin.payments.currency')}</td>
                  <td>{payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`admin-status-badge status-${payment.status}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-action-buttons">
                      {payment.status === 'pending' && (
                        <button
                          className="admin-action-btn approve"
                          onClick={() => handleStatusUpdate(payment.id, 'sent')}
                        >
                          <i className="fas fa-check"></i> {t('admin.payments.mark_sent')}
                        </button>
                      )}
                      {payment.status === 'sent' && (
                        <button
                          className="admin-action-btn received"
                          onClick={() => handleStatusUpdate(payment.id, 'received')}
                        >
                          <i className="fas fa-check-double"></i> {t('admin.payments.mark_received')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty-state">
            <i className="fas fa-money-bill-wave"></i>
            <p>{t('admin.payments.empty')}</p>
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

export default AdminPaymentsPage;
