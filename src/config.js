/**
 * إعدادات الربط بالسيرفر / Server connection config
 * غيّر القيم في ملف .env أو .env.local ثم أعد تشغيل التطبيق.
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api';
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || 'http://127.0.0.1:8000';

export { API_BASE_URL, API_ORIGIN };
