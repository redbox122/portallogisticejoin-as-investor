// Shared UX helpers for bilingual/additive API fields.
// Keep these small + null-safe so pages can consume new backend UX fields without breaking old payloads.

export const getLang = (i18n) => (i18n?.language === 'ar' ? 'ar' : 'en');

export const pickText = (lang, arText, enText, fallback = '') => {
  if (lang === 'ar') return arText || enText || fallback;
  return enText || arText || fallback;
};

// Handles payloads that might use either *_ar/*_en or a single Arabic-first field name.
export const pickFieldText = (lang, obj, arKeys = [], enKeys = [], fallback = '') => {
  const safeObj = obj || {};
  const arText = arKeys.map((k) => safeObj?.[k]).find(Boolean);
  const enText = enKeys.map((k) => safeObj?.[k]).find(Boolean);
  return pickText(lang, arText, enText, fallback);
};

export const formatDate = (dateValue, lang) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
};

export const formatDateTime = (dateValue, lang) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const toArray = (maybeArr) => (Array.isArray(maybeArr) ? maybeArr : []);

