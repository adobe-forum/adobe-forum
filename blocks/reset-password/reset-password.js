/**
 * reset-password.js — Adobe EDS / da.live block
 * Preact + htm (vendor imports, no bundler)
 *
 * Reads ?token= from the URL, lets the user set a new password,
 * then calls POST /api/auth/reset-password.
 */

import { h, render } from '../../vendor/preact.js';
import { useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';
import { API_BASE } from '../../scripts/utils/constants.js';

const html = htm.bind(h);

/* ── 1. Spectrum 2 tokens CDN ───────────────────────────────────────────── */
(function injectSpectrum() {
  const CDN = 'https://jspm.dev/@spectrum-css/tokens@14/dist/index.css';
  if (!document.querySelector(`link[href="${CDN}"]`)) {
    const lnk = document.createElement('link');
    lnk.rel = 'stylesheet';
    lnk.href = CDN;
    document.head.prepend(lnk);
  }
  const root = document.documentElement;
  if (!root.classList.contains('spectrum')) {
    root.classList.add('spectrum', 'spectrum--light', 'spectrum--medium');
  }
}());

/* ── 2. SVG icons (reused from auth-form) ───────────────────────────────── */
const IconEye = () => html`
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M1 9s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z"
          stroke="currentColor" stroke-width="1.35" fill="none"/>
    <circle cx="9" cy="9" r="2.2" stroke="currentColor" stroke-width="1.35" fill="none"/>
  </svg>`;

const IconEyeOff = () => html`
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <line x1="2" y1="2" x2="16" y2="16"
          stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
    <path d="M5.3 5.4C3.2 6.5 1 9 1 9s2.8 5 8 5c1.7 0 3.2-.6 4.4-1.4"
          stroke="currentColor" stroke-width="1.35" stroke-linecap="round" fill="none"/>
    <path d="M8.3 3.1C8.5 3 8.8 3 9 3c5.2 0 8 6 8 6s-.9 1.8-2.6 3.2"
          stroke="currentColor" stroke-width="1.35" stroke-linecap="round" fill="none"/>
  </svg>`;

const IconAlertCircle = () => html`
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
       aria-hidden="true" style="flex-shrink:0;margin-top:1px">
    <circle cx="6" cy="6" r="5.25" stroke="#d7373f" stroke-width="1.2"/>
    <path d="M6 3.5V6.5" stroke="#d7373f" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="6" cy="8.5" r="0.65" fill="#d7373f"/>
  </svg>`;

const IconCheckCircle = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="#268e6c" stroke-width="1.5"/>
    <path d="M7.5 12l3 3 6-6" stroke="#268e6c" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

/* ── 3. Password strength helper ────────────────────────────────────────── */
function getStrength(value) {
  let s = 0;
  if (value.length >= 8) s += 1;
  if (/[A-Z]/.test(value)) s += 1;
  if (/[0-9]/.test(value)) s += 1;
  if (/[^A-Za-z0-9]/.test(value)) s += 1;
  return [
    { w: '0', bg: 'transparent', label: '' },
    { w: '25%', bg: '#d7373f', label: 'Weak' },
    { w: '50%', bg: '#da7b11', label: 'Fair' },
    { w: '75%', bg: '#b07800', label: 'Good' },
    { w: '100%', bg: '#268e6c', label: 'Strong' },
  ][s];
}

/* ── 4. Password field component ────────────────────────────────────────── */
function PasswordField({
  id, label, placeholder, autocomplete, value, error, onChange, onBlur, showStrength = false,
}) {
  const [showPw, setShowPw] = useState(false);
  const isInvalid = !!error;
  const strength = showStrength ? getStrength(value || '') : null;

  return html`
    <div class=${`auth-form-field${isInvalid ? ' is-invalid' : ''}`} data-field=${id}>
      <label class="auth-form-label" for=${id}>
        ${label}
        <span class="auth-form-label-req" aria-hidden="true">${'\u00a0'}*</span>
      </label>
      <div class="auth-form-textfield">
        <input
          id=${id}
          name=${id}
          type=${showPw ? 'text' : 'password'}
          class="auth-form-input has-icon"
          placeholder=${placeholder}
          autocomplete=${autocomplete}
          required
          aria-required="true"
          aria-describedby=${`${id}-help`}
          aria-invalid=${String(isInvalid)}
          value=${value}
          onInput=${(e) => onChange(e.target.value)}
          onBlur=${() => onBlur(value)}
        />
        <button
          type="button"
          class="auth-form-pw-btn"
          aria-label=${showPw ? 'Hide password' : 'Show password'}
          onClick=${() => setShowPw((s) => !s)}
        >
          ${showPw ? html`<${IconEyeOff}/>` : html`<${IconEye}/>`}
        </button>
      </div>
      <div id=${`${id}-help`} class="auth-form-help" role="alert" aria-live="polite">
        ${isInvalid && html`<${IconAlertCircle}/><span>${error}</span>`}
      </div>
      ${strength && value && html`
        <div class="auth-form-strength" aria-hidden="true">
          <div class="auth-form-strength-track">
            <div
              class="auth-form-strength-fill"
              style=${{ width: strength.w, backgroundColor: strength.bg }}
            />
          </div>
          ${strength.label && html`
            <span class="auth-form-strength-text" style=${{ color: strength.bg }}>
              Strength: ${strength.label}
            </span>
          `}
        </div>
      `}
    </div>`;
}

/* ── 5. Submit button with spinner ──────────────────────────────────────── */
function SubmitBtn({ loading, onClick, children }) {
  return html`
    <button
      type="button"
      class=${`auth-form-btn${loading ? ' is-loading' : ''}`}
      disabled=${loading}
      onClick=${onClick}
    >
      <span class="auth-form-btn-spinner" aria-hidden="true"/>
      <span class="auth-form-btn-label">${children}</span>
    </button>`;
}

/* ── 6. Main ResetPassword component ────────────────────────────────────── */
function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState(
    !token ? 'Invalid or missing reset token. Please request a new reset link.' : null,
  );

  const validatePassword = (v) => {
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const validateConfirm = (v) => {
    if (!v) return 'Please confirm your password.';
    if (v !== password) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const e = {};
    const passErr = validatePassword(password);
    const confirmErr = validateConfirm(confirm);
    if (passErr) e.password = passErr;
    if (confirmErr) e.confirm = confirmErr;
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reset failed.');
      setSuccess(true);
      // Redirect to home after 3 seconds.
      setTimeout(() => { window.location.href = '/'; }, 3000);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (success) {
      return html`
      <div class="auth-form-success is-visible" aria-live="polite">
        <div class="auth-form-success-icon"><${IconCheckCircle}/></div>
        <p class="auth-form-success-title">Password updated!</p>
        <p class="auth-form-success-desc">
          Your password has been reset successfully.
          Redirecting you to the forum...
        </p>
      </div>`;
    }

    if (globalError) {
      return html`
      <div class="rp-global-error" role="alert">
        <${IconAlertCircle}/>
        <span>${globalError}</span>
      </div>
      <a href="/" class="auth-form-back" style="margin-top:24px">
        Back to forum
      </a>`;
    }

    return html`
      <form novalidate onSubmit=${(e) => { e.preventDefault(); handleSubmit(); }}>

        <${PasswordField}
          id="rp-password"
          label="New password"
          placeholder="Min. 8 characters"
          autocomplete="new-password"
          showStrength=${true}
          value=${password}
          error=${errors.password}
          onChange=${(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
          onBlur=${(v) => setErrors((e) => ({ ...e, password: validatePassword(v) || undefined }))}
        />

        <${PasswordField}
          id="rp-confirm"
          label="Confirm new password"
          placeholder="Repeat password"
          autocomplete="new-password"
          value=${confirm}
          error=${errors.confirm}
          onChange=${(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
          onBlur=${(v) => setErrors((e) => ({ ...e, confirm: validateConfirm(v) || undefined }))}
        />

        <${SubmitBtn} loading=${loading} onClick=${handleSubmit}>
          Reset password
        <//>

      </form>`;
  };

  return html`
    <div class="auth-form-overlay">
      <div class="auth-form-card">

        <!-- Brand logo -->
        <div class="auth-form-brand">
          <div class="auth-form-brand-logo" aria-hidden="true">
            <img
              src="/icons/logo.svg"
              alt="Adobe"
              width="36"
              height="36"
              style="display:block;width:36px;height:36px;object-fit:contain;"
            />
          </div>
          <span class="auth-form-brand-name">
            <em>Adobe</em>${'\u00a0'}Forum
          </span>
        </div>

        <h1 class="auth-form-heading">Set new password</h1>
        <p class="auth-form-body">Enter and confirm your new password below.</p>

        ${renderContent()}

      </div>
    </div>`;
}

/* ── 7. EDS block decorator ─────────────────────────────────────────────── */
export default function decorate(block) {
  // Hide EDS chrome so the auth overlay is the only thing visible
  document.querySelector('header')?.style.setProperty('display', 'none');
  document.querySelector('footer')?.style.setProperty('display', 'none');
  document.querySelector('.sidebar-mount')?.style.setProperty('display', 'none');

  // Render into a mount div appended to <body> so the overlay
  // sits above all EDS chrome at the correct z-index
  block.textContent = '';
  const mount = document.createElement('div');
  document.body.append(mount);
  render(html`<${ResetPassword}/>`, mount);
}
