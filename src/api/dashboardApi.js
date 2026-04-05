import axios from 'axios';
import { API_BASE_URL } from '../config';

// ── shared header builder ─────────────────────────────────────────────────────

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function getToken() {
  return localStorage.getItem('portal_logistics_token') || '';
}

// ── dashboard (overview page) ─────────────────────────────────────────────────

/**
 * Fetch dashboard data: user, investment summary, contracts summary, next payment.
 * GET /portallogistice/dashboard
 */
export const getDashboardData = async (token) => {
  const t = token || getToken();
  return axios.get(`${API_BASE_URL}/portallogistice/dashboard`, {
    headers: authHeaders(t),
  });
};

// ── analytics page ────────────────────────────────────────────────────────────

/**
 * Fetch analytics KPI summary: totals, completion rate, next payment.
 * GET /portallogistice/analytics/summary
 */
export const getAnalyticsSummary = async () => {
  return axios.get(`${API_BASE_URL}/portallogistice/analytics/summary`, {
    headers: authHeaders(getToken()),
  });
};

/**
 * Fetch monthly payment trend for charts.
 * GET /portallogistice/analytics/payments
 */
export const getAnalyticsPayments = async () => {
  return axios.get(`${API_BASE_URL}/portallogistice/analytics/payments`, {
    headers: authHeaders(getToken()),
  });
};

/**
 * Fetch user's approved contracts (for investment page).
 * GET /portallogistice/contracts?status=approved
 */
export const getApprovedContracts = async () => {
  return axios.get(`${API_BASE_URL}/portallogistice/contracts?status=approved`, {
    headers: authHeaders(getToken()),
  });
};
