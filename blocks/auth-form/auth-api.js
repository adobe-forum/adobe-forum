/**
 * auth-api.js — fetch helpers for the auth-form block
 * Mirrors the same BASE_URL pattern used by the rest of the frontend.
 */

const BASE_URL = 'http://localhost:5000/api/auth';

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
