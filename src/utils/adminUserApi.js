import axios from 'axios';
import { API_BASE_URL } from '../config';

/** Unwrap Laravel-style `{ data: { user } }` or flat user object. */
export function normalizeAdminUserPayload(data) {
  if (!data || typeof data !== 'object') return null;
  return data.user !== undefined ? data.user : data;
}

/**
 * @param {string|number} userId — numeric id from admin list (same as activate/deactivate routes).
 */
export async function fetchAdminUserById(userId, headers) {
  const res = await axios.get(
    `${API_BASE_URL}/portallogistice/admin/users/${encodeURIComponent(String(userId))}`,
    { headers }
  );
  const payload = res?.data?.data;
  const user = normalizeAdminUserPayload(payload);
  return { user, raw: payload, response: res };
}

/** PUT /admin/users/{identifier} — backend historically keys by national_id; fallback to id. */
export function resolveAdminUserPutUrl(user) {
  if (!user || typeof user !== 'object') return null;
  const key = user.national_id ?? user.id;
  if (key == null || key === '') return null;
  return `${API_BASE_URL}/portallogistice/admin/users/${encodeURIComponent(String(key))}`;
}

export async function putAdminUser(user, body, headers) {
  const url = resolveAdminUserPutUrl(user);
  if (!url) throw new Error('Missing user identifier for update');
  return axios.put(url, body, { headers });
}

export async function postAdminUserActivate(userId, headers) {
  return axios.post(
    `${API_BASE_URL}/portallogistice/admin/users/${encodeURIComponent(String(userId))}/activate`,
    {},
    { headers }
  );
}

export async function postAdminUserDeactivate(userId, headers) {
  return axios.post(
    `${API_BASE_URL}/portallogistice/admin/users/${encodeURIComponent(String(userId))}/deactivate`,
    {},
    { headers }
  );
}
