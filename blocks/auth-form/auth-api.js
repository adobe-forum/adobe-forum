/**
 * auth-api.js — fetch helpers for the auth-form block
 * Mirrors the same BASE_URL pattern used by the rest of the frontend.
 *
 * BASE_URL resolution order:
 *   1. window.AUTH_API_BASE  — set this in your EDS page/env config
 *   2. Falls back to http://localhost:5000/api/auth for local dev
 */

const BASE_URL = (typeof window !== 'undefined' && window.AUTH_API_BASE)
  || 'http://localhost:5000/api/auth';

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ success: boolean, user: object }>}
 */
export async function loginUser({ email, password }) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Sign-in failed.');
  return data;
} 

/**
 * POST /api/auth/register
 * @param {{ first: string, last: string, email: string, pass: string }} payload
 * @returns {Promise<{ success: boolean, user: object }>}
 */
export async function registerUser({
  first, last, email, pass,
}) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      firstName: first, lastName: last, email, password: pass,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Registration failed.');
  return data;
}

/**
 * POST /api/auth/forgot-password
 * @param {{ email: string }} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function forgotPassword({ email }) {
  const res = await fetch(`${BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not send reset link.');
  return data;
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (based on session cookie).
 * Call this on page load to restore auth state without re-entering credentials.
 * @returns {Promise<{ success: boolean, user: object }>}
 */
export async function getMe() {
  const res = await fetch(`${BASE_URL}/me`, {
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Not authenticated.');
  return data;
}

/**
 * POST /api/auth/logout
 * Destroys the server-side session and clears the cookie.
 * @returns {Promise<{ success: boolean }>}
 */
export async function logoutUser() {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Logout failed.');
  return data;
}

/**
 * POST /api/auth/reset-password
 * @param {{ token: string, password: string }} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function resetPassword({ token, password }) {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Reset failed.');
  return data;
}
