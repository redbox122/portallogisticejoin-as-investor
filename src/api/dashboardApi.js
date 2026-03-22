import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Fetch dashboard data for the overview page (user, investment, contracts).
 * Requires: Authorization: Bearer <token>
 */
export const getDashboardData = async (token) => {
  return axios.get(`${API_BASE_URL}/portallogistice/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
};
