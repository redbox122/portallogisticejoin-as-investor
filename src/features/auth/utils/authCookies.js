/** Cookie names — keep in sync with useLogin / authStore logout */
export const AUTH_COOKIE_TOKEN = 'portal_logistics_token';
export const AUTH_COOKIE_USER_TYPE = 'portal_logistics_user_type';
export const AUTH_COOKIE_USER = 'portal_logistics_user';

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function cookieBaseAttrs() {
  const expires = new Date(Date.now() + COOKIE_MAX_AGE_MS).toUTCString();
  return `expires=${expires}; path=/; SameSite=Strict`;
}

/**
 * Read a cookie value by name (URL-decoded).
 * @param {string} name
 * @returns {string | null}
 */
export function readCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Persist JSON user snapshot (small payloads only; browsers ~4KB per cookie).
 * @param {object} user
 */
export function writeAuthUserCookie(user) {
  if (!user || typeof user !== 'object') return;
  const json = JSON.stringify(user);
  const value = encodeURIComponent(json);
  if (value.length > 3800) {
    console.warn('[auth] user JSON too large for a single cookie; storing truncated snapshot');
  }
  document.cookie = `${AUTH_COOKIE_USER}=${value}; ${cookieBaseAttrs()}; Secure`;
}

export function clearAuthUserCookie() {
  document.cookie = `${AUTH_COOKIE_USER}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
}

/**
 * @returns {object | null}
 */
export function readAuthUserFromCookie() {
  const raw = readCookie(AUTH_COOKIE_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
