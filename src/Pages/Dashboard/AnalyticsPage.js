import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { API_BASE_URL } from '../../config';
import OverviewPage from './OverviewPage';
import '../../Css/pages/analytics-page.css';
import '../../Css/pages/overview-page.css';

const AnalyticsPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [hasApprovedReceipt, setHasApprovedReceipt] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [summaryRes, paymentsRes, contractsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/portallogistice/analytics/summary`, { headers }),
        axios.get(`${API_BASE_URL}/portallogistice/analytics/payments`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/portallogistice/contracts`, { headers }).catch(() => null)
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.success) {
        setAnalytics(summaryRes.value.data.data);
      }

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data?.success) {
        setPaymentAnalytics(paymentsRes.value.data.data);
      }

      // Check if user has at least one contract with approved receipt
      // Only show investment totals if receipt is uploaded AND approved by admin
      if (contractsRes.status === 'fulfilled' && contractsRes.value.data?.success) {
        const contracts = contractsRes.value.data.data.contracts || contractsRes.value.data.data || [];
        const hasApproved = contracts.some(
          contract => contract.receipt_upload_status === 'uploaded'
        );
        setHasApprovedReceipt(hasApproved);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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

  if (!analytics) {
    return (
      <OverviewPage
        forceMock
        pageTitle={i18n.language === 'ar' ? 'التحليلات — نموذج افتراضي' : 'Analytics — Default model'}
        pageSubtitle={i18n.language === 'ar' ? 'عرض توضيحي لجميع البطاقات والجدول الزمني والعقود' : 'Demo of all cards, timeline and contracts'}
      />
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.sidebar.analytics')}</h1>
          <p className="page-subtitle">{t('dashboard.analytics.subtitle')}</p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="card-header">
            <h3>{t('dashboard.analytics.total_contracts')}</h3>
            <div className="card-icon contracts">
              <i className="fas fa-file-contract"></i>
            </div>
          </div>
          <div className="card-value">{analytics.total_contracts || 0}</div>
          <div className="card-details">
            <span className="detail-item">
              <i className="fas fa-check-circle"></i>
              {t('dashboard.analytics.active')}: {analytics.active_contracts || 0}
            </span>
            <span className="detail-item">
              <i className="fas fa-clock"></i>
              {t('dashboard.analytics.pending')}: {analytics.pending_contracts || 0}
            </span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <h3>{t('dashboard.analytics.total_invested')}</h3>
            <div className="card-icon invested">
              <i className="fas fa-handshake"></i>
            </div>
          </div>
          <div className="card-value">
            {hasApprovedReceipt ? (analytics.total_invested?.toLocaleString() || 0) : 0} {t('dashboard.currency')}
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <h3>{t('dashboard.analytics.total_received')}</h3>
            <div className="card-icon received">
              <i className="fas fa-money-bill-wave"></i>
            </div>
          </div>
          <div className="card-value">
            {hasApprovedReceipt ? (analytics.total_received?.toLocaleString() || 0) : 0} {t('dashboard.currency')}
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <h3>{t('dashboard.analytics.pending_payments')}</h3>
            <div className="card-icon pending">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="card-value">{analytics.pending_payments?.toLocaleString() || 0} {t('dashboard.currency')}</div>
        </div>
      </div>

      {paymentAnalytics && paymentAnalytics.monthly_data && paymentAnalytics.monthly_data.length > 0 && (
        <div className="chart-section">
          <h2 className="section-title">{t('dashboard.analytics.payment_trends')}</h2>
          <div className="chart-container">
            <div className="monthly-chart">
              {paymentAnalytics.monthly_data.map((month, index) => {
                const maxAmount = Math.max(...paymentAnalytics.monthly_data.map(m => m.total_amount));
                const height = (month.total_amount / maxAmount) * 100;
                return (
                  <div key={index} className="chart-bar">
                    <div className="bar-value" style={{ height: `${height}%` }}>
                      <span className="bar-tooltip">{month.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="bar-label">
                      {i18n.language === 'ar' ? month.month_name_ar : month.month_name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {analytics.next_payment && (
        <div className="next-payment-card">
          <div className="card-header">
            <h3>{t('dashboard.analytics.next_payment')}</h3>
          </div>
          <div className="payment-details">
            <div className="payment-amount">
              {analytics.next_payment.amount?.toLocaleString() || 0} {t('dashboard.currency')}
            </div>
            <div className="payment-date">
              <i className="fas fa-calendar-alt"></i>
              {new Date(analytics.next_payment.due_date).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
            </div>
            {analytics.next_payment.days_remaining !== undefined && (
              <div className="payment-days">
                {analytics.next_payment.days_remaining > 0
                  ? t('dashboard.analytics.days_remaining', { days: analytics.next_payment.days_remaining })
                  : t('dashboard.analytics.overdue')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
