import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { getLang, pickText, formatDate, toArray } from '../../Utitlities/uxText';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/payments-page.css';

const PaymentsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [expandedContracts, setExpandedContracts] = useState(new Set());
  const [lastReport, setLastReport] = useState(null);
  const lang = getLang(i18n);

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const fetchPaymentsData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [paymentsRes, summaryRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/portallogistice/payments`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/payments/summary`, { headers })
      ]);

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data?.success) {
        const data = paymentsRes.value.data.data || {};
        setPayments(data.payments || []);
        setInsights(data.insights || null);
        setCalendar(data.calendar || null);
        setPagination(data.pagination || null);
      }

      // Backward-compatible fallback if /payments doesn't include insights/calendar (older backend)
      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.success && !paymentsRes.value?.data?.data?.insights) {
        setSummary(summaryRes.value.data.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContract = (contractId) => {
    setExpandedContracts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contractId)) {
        newSet.delete(contractId);
      } else {
        newSet.add(contractId);
      }
      return newSet;
    });
  };

  // Group payments by contract_id
  const groupedPayments = payments.reduce((acc, payment) => {
    const contractId = payment.contract_id;
    if (!acc[contractId]) {
      acc[contractId] = [];
    }
    acc[contractId].push(payment);
    return acc;
  }, {});

  // Calculate contract summary
  const getContractSummary = (contractPayments) => {
    const total = contractPayments.length;
    const paid = contractPayments.filter(p => p.status === 'received').length;
    const pending = contractPayments.filter(p => p.status === 'pending').length;
    const totalAmount = contractPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const paidAmount = contractPayments
      .filter(p => p.status === 'received')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return { total, paid, pending, totalAmount, paidAmount };
  };

  const handleReportMissing = async (paymentId, contractId, expectedDate, amount) => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.post(
        `${API_BASE_URL}/portallogistice/payments/report-missing`,
        { payment_id: paymentId, contract_id: contractId, expected_date: expectedDate, amount },
        { headers }
      );
      if (res.data?.success) {
        setLastReport(res.data.data || null);
      }
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: res.data?.message || t('dashboard.payments.report_success'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000 }
      });
      fetchPaymentsData();
    } catch (error) {
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: error.response?.data?.message || t('dashboard.error.report_failed'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="payments-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.sidebar.payments')}</h1>
          <p className="page-subtitle">{t('dashboard.payments.subtitle')}</p>
        </div>
      </div>

      {lastReport && (
        <div className="report-result-card">
          <div className="report-result-header">
            <div className="report-result-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="report-result-content">
              <h3>{t('dashboard.payments.report_submitted')}</h3>
              <p>
                {pickText(lang, lastReport.expected_resolution_time_ar, lastReport.expected_resolution_time, '')}
              </p>
            </div>
            <button className="report-result-close" onClick={() => setLastReport(null)} aria-label="Close">
              <i className="fas fa-times"></i>
            </button>
          </div>
          {toArray(pickText(lang, lastReport.next_steps_ar, lastReport.next_steps, [])).length > 0 && (
            <ul className="report-result-steps">
              {toArray(pickText(lang, lastReport.next_steps_ar, lastReport.next_steps, [])).map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          )}
          {lastReport.contact_info && (
            <div className="report-result-contact">
              {lastReport.contact_info.email && (
                <span><i className="fas fa-envelope"></i> {lastReport.contact_info.email}</span>
              )}
              {lastReport.contact_info.phone && (
                <span><i className="fas fa-phone"></i> {lastReport.contact_info.phone}</span>
              )}
            </div>
          )}
        </div>
      )}

      {(insights || summary) && (
        <div className="payments-summary-cards">
          <div className="summary-card">
            <div className="summary-icon received">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="summary-content">
              <h3>{t('dashboard.payments.total_received')}</h3>
              <p className="summary-value">
                {(insights?.total_received ?? summary?.total_received ?? 0).toLocaleString()} {t('dashboard.currency')}
              </p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="summary-content">
              <h3>{t('dashboard.payments.pending')}</h3>
              <p className="summary-value">
                {(insights?.total_pending ?? summary?.pending ?? 0).toLocaleString()} {t('dashboard.currency')}
              </p>
            </div>
          </div>
          {insights && (
            <div className="summary-card">
              <div className="summary-icon next">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="summary-content">
                <h3>{t('dashboard.payments.completion_rate')}</h3>
                <p className="summary-value">{Number(insights.completion_rate || 0).toFixed(2)}%</p>
                <p className="summary-date">
                  {pickText(lang, insights.average_payment_time_ar, insights.average_payment_time, '')}
                </p>
              </div>
            </div>
          )}
          {summary?.next_payment && (
            <div className="summary-card">
              <div className="summary-icon next">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div className="summary-content">
                <h3>{t('dashboard.payments.next_payment')}</h3>
                <p className="summary-value">
                  {summary.next_payment.amount?.toLocaleString() || 0} {t('dashboard.currency')}
                </p>
                <p className="summary-date">
                  {formatDate(summary.next_payment.due_date, lang)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {calendar && (
        <div className="payments-calendar">
          <h2 className="section-title">{t('dashboard.payments.calendar')}</h2>
          <div className="calendar-grid">
            <div className="calendar-col">
              <h3>{t('dashboard.payments.upcoming')}</h3>
              {toArray(calendar.upcoming).length === 0 ? (
                <p className="calendar-empty">-</p>
              ) : (
                toArray(calendar.upcoming).map((d) => (
                  <div key={`up-${d.date}`} className="calendar-row">
                    <span className="calendar-date">{formatDate(d.date, lang)}</span>
                    <span className="calendar-amount">{(d.amount || 0).toLocaleString()} {t('dashboard.currency')}</span>
                    <span className="calendar-count">{d.count || 0}</span>
                  </div>
                ))
              )}
            </div>
            <div className="calendar-col overdue">
              <h3>{t('dashboard.payments.overdue')}</h3>
              {toArray(calendar.overdue).length === 0 ? (
                <p className="calendar-empty">-</p>
              ) : (
                toArray(calendar.overdue).map((d) => (
                  <div key={`od-${d.date}`} className="calendar-row">
                    <span className="calendar-date">{formatDate(d.date, lang)}</span>
                    <span className="calendar-amount">{(d.amount || 0).toLocaleString()} {t('dashboard.currency')}</span>
                    <span className="calendar-count">{d.count || 0}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {pagination && (
            <p className="payments-pagination-hint">
              {t('dashboard.payments.pagination_hint')}{' '}
              {pagination.current_page || 1} / {Math.ceil((pagination.total || 0) / (pagination.per_page || 1)) || 1}
            </p>
          )}
        </div>
      )}

      <div className="payments-section">
        <h2 className="section-title">{t('dashboard.payments.payment_history')}</h2>
        {payments.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-money-bill-wave"></i>
            <p>{t('dashboard.payments.no_payments')}</p>
          </div>
        ) : (
          <div className="contracts-accordion">
            {Object.entries(groupedPayments).map(([contractId, contractPayments]) => {
              const isExpanded = expandedContracts.has(parseInt(contractId));
              const contractSummary = getContractSummary(contractPayments);
              // Get contract_number from first payment if available, fallback to contract_id
              const displayContractNumber = contractPayments[0]?.context?.contract_number || contractPayments[0]?.contract_number || contractId;
              // Sort payments by month_number
              const sortedPayments = [...contractPayments].sort((a, b) => 
                (a.month_number || 0) - (b.month_number || 0)
              );

              return (
                <div key={contractId} className="contract-item">
                  <div 
                    className="contract-header"
                    onClick={() => toggleContract(parseInt(contractId))}
                  >
                    <div className="contract-header-left">
                      <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} contract-arrow`}></i>
                      <div className="contract-info">
                        <h3 className="contract-title">
                          {t('dashboard.payments.contract')} #{displayContractNumber}
                        </h3>
                        <span className="contract-summary">
                          {contractSummary.paid}/{contractSummary.total} {t('dashboard.payments.paid')}
                          {' • '}
                          {contractSummary.paidAmount.toLocaleString()} / {contractSummary.totalAmount.toLocaleString()} {t('dashboard.currency')}
                        </span>
                      </div>
                    </div>
                    <div className="contract-header-right">
                      <span className={`contract-status-badge ${contractSummary.pending > 0 ? 'pending' : 'completed'}`}>
                        {contractSummary.pending > 0 
                          ? `${contractSummary.pending} ${t('dashboard.payments.pending')}`
                          : t('dashboard.payments.completed')
                        }
                      </span>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="contract-payments-content">
                      <div className="payments-table-container">
                        <table className="payments-table">
                          <thead>
                            <tr>
                              <th>{t('dashboard.payments.month')}</th>
                              <th>{t('dashboard.payments.amount')}</th>
                              <th>{t('dashboard.payments.due_date')}</th>
                              <th>{t('dashboard.payments.payment_date')}</th>
                              <th>{t('dashboard.payments.status')}</th>
                              <th>{t('dashboard.payments.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPayments.map((payment) => (
                              <tr key={payment.id}>
                                <td>
                                  <div>
                                    {t('dashboard.payments.month_number', { number: payment.month_number })}
                                  </div>
                                  {payment?.context?.progress && (
                                    <div className="payment-sub">
                                      {payment.context.progress}
                                    </div>
                                  )}
                                </td>
                                <td>{payment.amount?.toLocaleString()} {t('dashboard.currency')}</td>
                                <td>{formatDate(payment.due_date, lang)}</td>
                                <td>
                                  {payment.payment_date 
                                    ? formatDate(payment.payment_date, lang)
                                    : '-'
                                  }
                                </td>
                                <td>
                                  <span className={`status-badge ${payment.status}`}>
                                    {payment.status === 'sent' && t('dashboard.payments.status_sent')}
                                    {payment.status === 'received' && t('dashboard.payments.status_received')}
                                    {payment.status === 'pending' && t('dashboard.payments.status_pending')}
                                    {payment.status === 'reported_missing' && t('dashboard.payments.status_reported')}
                                  </span>
                                </td>
                                <td>
                                  {(payment.status === 'pending' && (payment?.reporting?.can_report ?? true)) && (
                                    <button
                                      className="report-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportMissing(payment.id, payment.contract_id, payment.due_date, payment.amount);
                                      }}
                                      title={payment?.reporting?.report_deadline
                                        ? `${t('dashboard.payments.report_deadline')}: ${formatDate(payment.reporting.report_deadline, lang)}`
                                        : ''}
                                    >
                                      <i className="fas fa-exclamation-triangle"></i>
                                      {t('dashboard.payments.report_missing')}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
