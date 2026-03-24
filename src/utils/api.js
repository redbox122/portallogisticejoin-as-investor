import axios from 'axios';
if (process.env.REACT_APP_API_BASE_URL) {
  axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;
}
const TOKEN_KEYS = ['token', 'portal_logistics_token', 'auth_token', 'admin_token', 'user_token'];

const readToken = () => {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value && String(value).trim()) return String(value).trim();
  }
  return null;
};

export const getAuthHeaders = () => {
  const token = readToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const clearAuthStorage = () => {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('portal_logistics_user');
  localStorage.removeItem('portal_logistics_admin');
  localStorage.removeItem('portal_logistics_user_type');
  localStorage.removeItem('user_type');
};

let interceptorInitialized = false;

export const setupAxios401Interceptor = () => {
  if (interceptorInitialized) return;
  interceptorInitialized = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearAuthStorage();
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
      return Promise.reject(error);
    }
  );
};
