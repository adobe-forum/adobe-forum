/**
 * auth-form.js — Adobe EDS / da.live block
 * Preact + htm (vendor imports, no bundler)
 *
 * Block variants:
 *   auth-form                 → Login (default)
 *   auth-form signup          → Sign-up active
 *   auth-form forgot-password → Forgot-password view
 */

import { h, render } from '../../vendor/preact.js';
import { useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';
import { loginUser, registerUser, forgotPassword } from './auth-api.js';

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

/* ── 2. Adobe-only email validation ─────────────────────────────────────── */
const ADOBE_DOMAINS = ['adobe.com', 'adobetest.com', 'adobeforums.com', 'adobecorp.com'];

function isValidEmailFormat(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
}

function isAdobeEmail(v) {
  if (!isValidEmailFormat(v)) return false;
  const domain = v.trim().toLowerCase().split('@')[1];
  return ADOBE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

function emailValidator(v) {
  const t = (v || '').trim();
  if (!t) return 'Email address is required.';
  if (!isValidEmailFormat(t)) return 'Enter a valid email address.';
  if (!isAdobeEmail(t)) return 'Only Adobe corporate email addresses are allowed.';
  return null;
}

/* ── 3. SVG icon components ─────────────────────────────────────────────── */
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

const IconArrowLeft = () => html`
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const IconAlertCircle = () => html`
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
       aria-hidden="true" style="flex-shrink:0;margin-top:1px">
    <circle cx="6" cy="6" r="5.25" stroke="#d7373f" stroke-width="1.2"/>
    <path d="M6 3.5V6.5" stroke="#d7373f" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="6" cy="8.5" r="0.65" fill="#d7373f"/>
  </svg>`;

const IconInfoCircle = () => html`
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
       aria-hidden="true" style="flex-shrink:0;margin-top:1px">
    <circle cx="6" cy="6" r="5.25" stroke="#6e6e6e" stroke-width="1.2"/>
    <path d="M6 5.5V8.5" stroke="#6e6e6e" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="6" cy="3.5" r="0.65" fill="#6e6e6e"/>
  </svg>`;

const IconCheckCircle = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="#268e6c" stroke-width="1.5"/>
    <path d="M7.5 12l3 3 6-6" stroke="#268e6c" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

/* ── 4. Password strength helper ────────────────────────────────────────── */
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

/* ── 5. Reusable Field component ────────────────────────────────────────── */
/**
 * Props:
 *   id, label, type, placeholder, autocomplete, required,
 *   withHint, value, error, onChange, onBlur,
 *   showStrength  — pass true on the password field that needs the meter
 */
function Field({
  id, label, type = 'text', placeholder = '', autocomplete = '',
  required = true, withHint = false,
  value, error, onChange, onBlur,
  showStrength = false,
  blockNumbers = false,
}) {
  const [showPw, setShowPw] = useState(false);

  let inputType;
  if (type === 'password') {
    inputType = showPw ? 'text' : 'password';
  } else {
    inputType = type;
  }
  const isInvalid = !!error;
  const strength = showStrength ? getStrength(value || '') : null;

  /* Strip any digit that sneaks in via paste, autofill or speech input */
  const handleInput = (e) => {
    if (blockNumbers) {
      const clean = e.target.value.replace(/[0-9]/g, '');
      if (clean !== e.target.value) e.target.value = clean;
      onChange(clean);
    } else {
      onChange(e.target.value);
    }
  };

  /* Block digit keys at keydown level (keyboard + numpad) */
  const handleKeyDown = blockNumbers
    ? (e) => { if (/^[0-9]$/.test(e.key)) e.preventDefault(); }
    : undefined;

  return html`
    <div class=${`auth-form-field${isInvalid ? ' is-invalid' : ''}`} data-field=${id}>

      <label class="auth-form-label" for=${id}>
        ${label}
        ${required && html`
          <span class="auth-form-label-req" aria-hidden="true">${'\u00a0'}*</span>
        `}
      </label>

      <div class="auth-form-textfield">
        <input
          id=${id}
          name=${id}
          type=${inputType}
          class=${`auth-form-input${type === 'password' ? ' has-icon' : ''}`}
          placeholder=${placeholder}
          autocomplete=${autocomplete}
          required=${required || undefined}
          aria-required=${String(required)}
          aria-describedby=${`${id}-help`}
          aria-invalid=${String(isInvalid)}
          value=${value}
          onInput=${handleInput}
          onKeyDown=${handleKeyDown}
          onBlur=${() => onBlur(value)}
        />
        ${type === 'password' && html`
          <button
            type="button"
            class="auth-form-pw-btn"
            aria-label=${showPw ? 'Hide password' : 'Show password'}
            onClick=${() => setShowPw((s) => !s)}
          >
            ${showPw ? html`<${IconEyeOff}/>` : html`<${IconEye}/>`}
          </button>
        `}
      </div>

      <div id=${`${id}-help`} class="auth-form-help" role="alert" aria-live="polite">
        ${isInvalid && html`<${IconAlertCircle}/><span>${error}</span>`}
      </div>

      ${withHint && !isInvalid && html`
        <div class="auth-form-hint">
          <${IconInfoCircle}/>
          <span>Use your Adobe corporate email (@adobe.com)</span>
        </div>
      `}

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

/* ── 6. Primary button with loading spinner ─────────────────────────────── */
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

/* ── 7. Login panel ─────────────────────────────────────────────────────── */
function LoginPanel({ onForgot, active }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const clearErr = (key) => setErrors((e) => ({ ...e, [key]: undefined }));

  const handleBlurEmail = (v) => {
    const err = emailValidator(v);
    setErrors((e) => ({ ...e, email: err || undefined }));
  };

  const handleBlurPassword = (v) => {
    setErrors((e) => ({ ...e, password: v ? undefined : 'Password is required.' }));
  };

  const handleSubmit = async () => {
    const e = {};
    const emailErr = emailValidator(email);
    if (emailErr) e.email = emailErr;
    if (!password) e.password = 'Password is required.';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await loginUser({ email, password });
      window.location.href = '/';
    } catch (err) {
      setErrors({ email: err.message });
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div id="auth-login" class=${`auth-panel${active ? ' is-active' : ''}`}
         role="tabpanel" aria-labelledby="tab-login">

      <form novalidate onSubmit=${(e) => { e.preventDefault(); handleSubmit(); }}>

        <${Field}
          id="l-email" label="Email address" type="email"
          placeholder="you@adobe.com" autocomplete="email" withHint=${true}
          value=${email} error=${errors.email}
          onChange=${(v) => { setEmail(v); clearErr('email'); }}
          onBlur=${handleBlurEmail}
        />

        <${Field}
          id="l-pass" label="Password" type="password"
          placeholder="••••••••" autocomplete="current-password"
          value=${password} error=${errors.password}
          onChange=${(v) => { setPassword(v); clearErr('password'); }}
          onBlur=${handleBlurPassword}
        />

        <button type="button" class="auth-form-quiet-link" onClick=${onForgot}>
          Forgot password?
        </button>

        <${SubmitBtn} loading=${loading} onClick=${handleSubmit}>
          Sign in
        <//>

      </form>
    </div>`;
}

/* ── 8. Sign-up panel ───────────────────────────────────────────────────── */
function SignupPanel({ active }) {
  const [f, setF] = useState({
    first: '', last: '', email: '', pass: '', confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (key) => (v) => {
    setF((prev) => ({ ...prev, [key]: v }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /* per-field blur validators */
  const validators = {
    first: (v) => {
      const t = v.trim();
      if (!t) return 'First name is required.';
      if (t.length > 50) return 'First name must be 50 characters or fewer.';
      if (/[0-9]/.test(t)) return 'First name cannot contain numbers.';
      if (/[^A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF'\u002D\s]/.test(t)) return 'First name contains invalid characters.';
      return null;
    },
    last: (v) => {
      const t = v.trim();
      if (!t) return 'Last name is required.';
      if (t.length > 50) return 'Last name must be 50 characters or fewer.';
      if (/[0-9]/.test(t)) return 'Last name cannot contain numbers.';
      if (/[^A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF'\u002D\s]/.test(t)) return 'Last name contains invalid characters.';
      return null;
    },
    email: emailValidator,
    pass: (v) => {
      if (!v) return 'Password is required.';
      if (v.length < 8) return 'Password must be at least 8 characters.';
      return null;
    },
    confirm: (v) => {
      if (!v) return 'Please confirm your password.';
      if (v !== f.pass) return 'Passwords do not match.';
      return null;
    },
  };

  const handleBlur = (key) => (v) => {
    const err = validators[key](v);
    setErrors((e) => ({ ...e, [key]: err || undefined }));
  };

  const handleSubmit = async () => {
    const e = {};
    Object.keys(validators).forEach((k) => {
      const err = validators[k](f[k]);
      if (err) e[k] = err;
    });
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await registerUser(f);
      window.location.href = '/auth-form';
    } catch (err) {
      setErrors({ email: err.message });
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div id="auth-signup" class=${`auth-panel${active ? ' is-active' : ''}`}
         role="tabpanel" aria-labelledby="tab-signup">

      <form novalidate onSubmit=${(e) => { e.preventDefault(); handleSubmit(); }}>

        <div class="auth-form-2col">
          <${Field}
            id="su-first" label="First name"
            placeholder="Jane" autocomplete="given-name"
            blockNumbers=${true}
            value=${f.first} error=${errors.first}
            onChange=${setField('first')} onBlur=${handleBlur('first')}
          />
          <${Field}
            id="su-last" label="Last name"
            placeholder="Doe" autocomplete="family-name"
            blockNumbers=${true}
            value=${f.last} error=${errors.last}
            onChange=${setField('last')} onBlur=${handleBlur('last')}
          />
        </div>

        <${Field}
          id="su-email" label="Email address" type="email"
          placeholder="you@adobe.com" autocomplete="email" withHint=${true}
          value=${f.email} error=${errors.email}
          onChange=${setField('email')} onBlur=${handleBlur('email')}
        />

        <${Field}
          id="su-pass" label="Password" type="password"
          placeholder="Min. 8 characters" autocomplete="new-password"
          showStrength=${true}
          value=${f.pass} error=${errors.pass}
          onChange=${setField('pass')} onBlur=${handleBlur('pass')}
        />

        <${Field}
          id="su-confirm" label="Confirm password" type="password"
          placeholder="Repeat password" autocomplete="new-password"
          value=${f.confirm} error=${errors.confirm}
          onChange=${setField('confirm')} onBlur=${handleBlur('confirm')}
        />

        <${SubmitBtn} loading=${loading} onClick=${handleSubmit}>
          Create account
        <//>

      </form>
    </div>`;
}

/* ── 9. Forgot-password panel ───────────────────────────────────────────── */
function ForgotPanel({ onBack, active }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBlur = (v) => setError(emailValidator(v));

  const handleSubmit = async () => {
    const err = emailValidator(email);
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (fpErr) {
      setError(fpErr.message);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div id="auth-forgot" class=${`auth-panel${active ? ' is-active' : ''}`} role="tabpanel">

      ${sent
    ? html`
          <div class="auth-form-success is-visible" aria-live="polite">
            <div class="auth-form-success-icon"><${IconCheckCircle}/></div>
            <p class="auth-form-success-title">Check your inbox</p>
            <p class="auth-form-success-desc">
              We've sent a password-reset link to your email.
              The link expires in 30${'\u00a0'}minutes.
            </p>
          </div>`
    : html`
          <button type="button" class="auth-form-back" onClick=${onBack}>
            <${IconArrowLeft}/>${' '}Back to sign in
          </button>

          <form novalidate onSubmit=${(e) => { e.preventDefault(); handleSubmit(); }}>

            <${Field}
              id="fp-email" label="Email address" type="email"
              placeholder="you@adobe.com" autocomplete="email" withHint=${true}
              value=${email} error=${error}
              onChange=${(v) => { setEmail(v); if (error) setError(null); }}
              onBlur=${handleBlur}
            />

            <${SubmitBtn} loading=${loading} onClick=${handleSubmit}>
              Send reset link
            <//>

          </form>
        `}
    </div>`;
}

/* ── 10. Root AuthForm component ────────────────────────────────────────── */
function AuthForm({ initPanel }) {
  const [panel, setPanel] = useState(initPanel);

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

        <!-- Tab bar — only shown on login / signup panels -->
        ${panel !== 'forgot' && html`
          <div class="auth-form-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              id="tab-login"
              class="auth-form-tab"
              role="tab"
              aria-controls="auth-login"
              aria-selected=${String(panel === 'login')}
              onClick=${() => setPanel('login')}
            >Sign in</button>
            <button
              type="button"
              id="tab-signup"
              class="auth-form-tab"
              role="tab"
              aria-controls="auth-signup"
              aria-selected=${String(panel === 'signup')}
              onClick=${() => setPanel('signup')}
            >Create account</button>
          </div>
        `}

        <!-- Forgot-password heading — only shown on forgot panel -->
        ${panel === 'forgot' && html`
          <h1 class="auth-form-heading">Reset your password</h1>
          <p class="auth-form-body">
            Enter your Adobe email and we'll send you a reset link.
          </p>
        `}

        <!--
          All three panels are ALWAYS rendered in the DOM.
          The CSS .auth-panel rule hides inactive panels (display:none).
          The .is-active class (toggled via the active prop) shows the panel.
          This matches the original vanilla JS approach and prevents state
          loss when switching tabs, while keeping the reveal animation.
        -->
        <${LoginPanel}
          active=${panel === 'login'}
          onForgot=${() => setPanel('forgot')}
        />
        <${SignupPanel}
          active=${panel === 'signup'}
        />
        <${ForgotPanel}
          active=${panel === 'forgot'}
          onBack=${() => setPanel('login')}
        />

      </div>
    </div>`;
}

/* ── 11. EDS block decorator ────────────────────────────────────────────── */
export default function decorate(block) {
  const cls = [...block.classList];
  let initPanel;
  if (cls.includes('forgot-password')) {
    initPanel = 'forgot';
  } else if (cls.includes('signup')) {
    initPanel = 'signup';
  } else {
    initPanel = 'login';
  }

  block.textContent = '';

  // Mount into a dedicated node appended to <body> so the overlay sits
  // above all EDS chrome (sidebar, header, etc.)
  const mount = document.createElement('div');
  document.body.append(mount);

  render(html`<${AuthForm} initPanel=${initPanel}/>`, mount);
}