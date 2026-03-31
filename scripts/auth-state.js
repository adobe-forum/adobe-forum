export function clearClientAuthState() {
  try {
    localStorage.removeItem('af_user');
  } catch {
    /* ignore storage errors */
  }

  try {
    sessionStorage.removeItem('af_auth_redirecting');
  } catch {
    /* ignore storage errors */
  }
}
