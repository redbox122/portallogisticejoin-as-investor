/**
 * Format numbers based on language
 * Always returns English digits regardless of language selection
 * @param {number} num - Number to format
 * @param {string} locale - Locale code ('en' or 'ar')
 * @returns {string} Formatted number string with English digits
 */
export function formatNumber(num, locale = 'en') {
  const n = Number(num || 0);
  if (locale === 'ar') {
    // Format with thousands separator but keep English digits
    return n.toLocaleString('en-US');
  }
  return n.toLocaleString('en-US');
}

/**
 * Format currency in SAR with English digits
 * @param {number} amount - Amount to format
 * @param {string} locale - Locale code ('en' or 'ar')
 * @returns {string} Formatted amount
 */
export function formatSAR(amount, locale = 'en') {
  const formatted = formatNumber(amount, locale);
  return locale === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
}

/**
 * Format date based on language
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale code ('en' or 'ar')
 * @returns {string} Formatted date
 */
export function formatDate(date, locale = 'en') {
  if (!date) return '—';
  
  const d = new Date(date);
  if (locale === 'ar') {
    const formatted = d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    // Convert Arabic numerals to English
    return convertArabicNumeralsToEnglish(formatted);
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format short date (DD/MM/YYYY)
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale code ('en' or 'ar')
 * @returns {string} Formatted date
 */
export function formatDateShort(date, locale = 'en') {
  if (!date) return '—';
  
  const d = new Date(date);
  if (locale === 'ar') {
    const formatted = d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return convertArabicNumeralsToEnglish(formatted);
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Convert Arabic numerals to English
 * @param {string} str - String with Arabic numerals
 * @returns {string} String with English numerals
 */
function convertArabicNumeralsToEnglish(str) {
  if (!str) return str;
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let result = str;
  for (let i = 0; i < arabicNumerals.length; i++) {
    const regex = new RegExp(arabicNumerals[i], 'g');
    result = result.replace(regex, englishNumerals[i]);
  }
  return result;
}

/**
 * Format percentage
 * @param {number} value - Percentage value (0-100)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value) {
  const n = Number(value || 0);
  return `${n.toFixed(1)}%`;
}
