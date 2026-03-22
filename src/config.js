/**
 * إعدادات الربط بالسيرفر / Server connection config
 * غيّر القيم في ملف .env أو .env.local ثم أعد تشغيل التطبيق.
 */

const resolveFallbackOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }

  return window.location.origin;
};

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || resolveFallbackOrigin();
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `${API_ORIGIN.replace(/\/$/, '')}/api`;

export { API_BASE_URL, API_ORIGIN };
