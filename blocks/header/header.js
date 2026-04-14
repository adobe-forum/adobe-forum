/* eslint-disable max-len */
import { html, render } from '../../vendor/htm-preact.js';
import { useState, useEffect, useRef } from '../../vendor/preact-hooks.js';
import { ensureResponsiveCSSLast } from '../../scripts/aem.js';
import clearClientAuthState from '../../scripts/auth-state.js';
import { COLOR_TOKENS } from '../../scripts/utils/colors.js';
import { navigateToPost as navigateToPostRoute } from '../../scripts/router.js';
import {
  PlusIcon, CloseIcon, EditIcon, LogoutIcon, LockIcon, PostsIcon,
  UserIcon, ChevronIcon, CheckIcon, AlertIcon, EyeIcon, EyeOffIcon,
  BellIcon,
} from '../../scripts/utils/icons.js';
import { API_BASE, AUTH_API_BASE } from '../../scripts/utils/constants.js';

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('af_user') || 'null'); } catch { return null; }
}

function getInitials(firstName, lastName) {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ============================================
// PASSWORD FIELD
// ============================================

function PwField({
  id, label, placeholder, value, error, onChange, onBlur,
}) {
  const [show, setShow] = useState(false);
  return html`
    <div class="pp-field${error ? ' is-invalid' : ''}">
      <label class="pp-label" for=${id}>${label}</label>
      <div class="pp-input-wrap">
        <input id=${id} type=${show ? 'text' : 'password'}
          class="pp-input pp-input--icon" placeholder=${placeholder} value=${value}
          onInput=${(e) => onChange(e.target.value)} onBlur=${onBlur}/>
        <button type="button" class="pp-pw-toggle"
          aria-label=${show ? 'Hide' : 'Show'} onClick=${() => setShow((s) => !s)}>
          ${show ? html`<${EyeOffIcon}/>` : html`<${EyeIcon}/>`}
        </button>
      </div>
      ${error && html`<p class="pp-field-error"><${AlertIcon}/>${error}</p>`}
    </div>`;
}

// ============================================
// CHANGE PASSWORD VIEW
// ============================================

function ChangePasswordView({ userId, onBack, onSuccess }) {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState(null);

  const handleSubmit = async () => {
    const e = {};
    if (!current) e.current = 'Current password is required.';
    if (!newPw || newPw.length < 8) e.newPw = 'Min. 8 characters.';
    if (confirm !== newPw) e.confirm = 'Passwords do not match.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setGlobalErr(null);
    try {
      const res = await fetch(`${AUTH_API_BASE}/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword: current, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed.');
      onSuccess();
    } catch (cpErr) {
      setGlobalErr(cpErr.message);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div class="pp-body">
      <button type="button" class="pp-back" onClick=${onBack}>← Back to Profile</button>
      <h2 class="pp-section-title">Change Password</h2>
      ${globalErr && html`<div class="pp-msg pp-msg--error"><${AlertIcon}/><span>${globalErr}</span></div>`}
      <${PwField} id="cp-cur" label="Current password" placeholder="Enter current password"
        value=${current} error=${errors.current}
        onChange=${(v) => { setCurrent(v); setErrors((er) => ({ ...er, current: undefined })); }}
        onBlur=${() => !current && setErrors((er) => ({ ...er, current: 'Required.' }))}/>
      <${PwField} id="cp-new" label="New password" placeholder="Min. 8 characters"
        value=${newPw} error=${errors.newPw}
        onChange=${(v) => { setNewPw(v); setErrors((er) => ({ ...er, newPw: undefined })); }}
        onBlur=${() => newPw.length < 8 && setErrors((er) => ({ ...er, newPw: 'Min. 8 characters.' }))}/>
      <${PwField} id="cp-con" label="Confirm new password" placeholder="Repeat password"
        value=${confirm} error=${errors.confirm}
        onChange=${(v) => { setConfirm(v); setErrors((er) => ({ ...er, confirm: undefined })); }}
        onBlur=${() => confirm !== newPw && setErrors((er) => ({ ...er, confirm: 'Passwords do not match.' }))}/>
      <div class="pp-actions">
        <button type="button" class="pp-btn pp-btn--ghost" onClick=${onBack}>Cancel</button>
        <button type="button" class="pp-btn pp-btn--primary${loading ? ' is-loading' : ''}"
          disabled=${loading} onClick=${handleSubmit}>
          <span class="pp-spinner" aria-hidden="true"/>
          <span class="pp-btn-label">${loading ? 'Saving…' : 'Update Password'}</span>
        </button>
      </div>
    </div>`;
}

// ============================================
// PROFILE VIEW
// ============================================

function ProfileView({ user, onLogout, onChangePassword }) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required.';
    if (!lastName.trim()) e.lastName = 'Last name is required.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setGlobalErr(null);
    try {
      // eslint-disable-next-line no-underscore-dangle
      const res = await fetch(`${AUTH_API_BASE}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, firstName, lastName }), // eslint-disable-line no-underscore-dangle
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      localStorage.setItem('af_user', JSON.stringify(data.user));
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (pfErr) {
      setGlobalErr(pfErr.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setErrors({});
    setIsEditing(false);
  };

  return html`
    <div class="pp-body">
      <div class="pp-avatar-row">
        <div class="pp-avatar-circle">${getInitials(firstName, lastName)}</div>
        <div>
          <p class="pp-avatar-name">${firstName} ${lastName}</p>
          <p class="pp-avatar-email">${user.email}</p>
        </div>
      </div>

      <div class="pp-divider"></div>
      <h2 class="pp-section-title">Profile Details</h2>

      ${globalErr && html`<div class="pp-msg pp-msg--error"><${AlertIcon}/><span>${globalErr}</span></div>`}
      ${saved && html`<div class="pp-msg pp-msg--success"><${CheckIcon}/><span>Profile saved!</span></div>`}

      <div class="pp-field${errors.firstName ? ' is-invalid' : ''}">
        <label class="pp-label" for="pf-first">First Name</label>
        <input id="pf-first" type="text"
          class="pp-input${!isEditing ? ' pp-input--disabled' : ''}"
          value=${firstName} disabled=${!isEditing} placeholder="First name"
          onInput=${(e) => { setFirstName(e.target.value); setErrors((er) => ({ ...er, firstName: undefined })); }}/>
        ${errors.firstName && html`<p class="pp-field-error"><${AlertIcon}/>${errors.firstName}</p>`}
      </div>

      <div class="pp-field${errors.lastName ? ' is-invalid' : ''}">
        <label class="pp-label" for="pf-last">Last Name</label>
        <input id="pf-last" type="text"
          class="pp-input${!isEditing ? ' pp-input--disabled' : ''}"
          value=${lastName} disabled=${!isEditing} placeholder="Last name"
          onInput=${(e) => { setLastName(e.target.value); setErrors((er) => ({ ...er, lastName: undefined })); }}/>
        ${errors.lastName && html`<p class="pp-field-error"><${AlertIcon}/>${errors.lastName}</p>`}
      </div>

      <div class="pp-field pp-field--no-req">
        <label class="pp-label" for="pf-email">Email Address</label>
        <input id="pf-email" type="email" class="pp-input pp-input--disabled"
          value=${user.email} disabled/>
        <span class="pp-field-hint">Email cannot be changed.</span>
      </div>

      <div class="pp-actions">
        ${!isEditing ? html`
          <button type="button" class="pp-btn pp-btn--ghost" onClick=${() => setIsEditing(true)}>
            <${EditIcon}/> Edit Profile
          </button>
        ` : html`
          <button type="button" class="pp-btn pp-btn--ghost" onClick=${handleCancel}>Cancel</button>
          <button type="button" class="pp-btn pp-btn--primary${loading ? ' is-loading' : ''}"
            disabled=${loading} onClick=${handleSave}>
            <span class="pp-spinner" aria-hidden="true"/>
            <span class="pp-btn-label">${loading ? 'Saving…' : 'Save Changes'}</span>
          </button>
        `}
      </div>

      <div class="pp-divider"></div>
      <button type="button" class="pp-text-btn pp-text-btn--blue" onClick=${onChangePassword}>
        <${LockIcon}/> Change Password
      </button>
      <div class="pp-divider"></div>
      <button type="button" class="pp-text-btn pp-text-btn--red" onClick=${onLogout}>
        <${LogoutIcon}/> Sign Out
      </button>
    </div>`;
}

// ============================================
// PROFILE POPUP
// ============================================

function ProfilePopup({ onClose }) {
  const [view, setView] = useState('profile');
  const user = getStoredUser();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('pp-scroll-lock');
    document.body.classList.add('pp-scroll-lock');
    return () => {
      document.documentElement.classList.remove('pp-scroll-lock');
      document.body.classList.remove('pp-scroll-lock');
    };
  }, []);

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  const handleLogout = () => {
    // Always destroy the server session first — otherwise the session cookie
    // remains valid and auth-form's getMe() call returns 200, which immediately
    // redirects back to '/' causing a redirect loop.
    fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(() => {
        localStorage.removeItem('af_user');
        window.location.replace('/auth-form');
      });
  };

  if (!user) { handleLogout(); return null; }

  const renderContent = () => {
    if (view === 'change-password') {
      // eslint-disable-next-line no-underscore-dangle
      const { _id: uid } = user;
      return html`<${ChangePasswordView}
        userId=${uid}
        onBack=${() => setView('profile')}
        onSuccess=${() => setView('pw-success')}/>`;
    }
    if (view === 'pw-success') {
      return html`
        <div class="pp-body pp-success-view">
          <div class="pp-success-icon"><${CheckIcon}/></div>
          <h2 class="pp-section-title">Password Updated!</h2>
          <p class="pp-success-desc">Your password has been changed successfully.</p>
          <button type="button" class="pp-btn pp-btn--primary" onClick=${() => setView('profile')}>
            Back to Profile
          </button>
        </div>`;
    }
    return html`<${ProfileView}
      user=${user}
      onLogout=${handleLogout}
      onChangePassword=${() => setView('change-password')}/>`;
  };

  return html`
    <div class="pp-overlay" onClick=${handleOverlay} role="dialog" aria-modal="true" aria-label="Profile">
      <div class="pp-modal">
        <button type="button" class="pp-close" aria-label="Close" onClick=${onClose}>
          <${CloseIcon}/>
        </button>
        ${renderContent()}
      </div>
    </div>`;
}

// ============================================
// PROFILE DROPDOWN
// ============================================

function ProfileDropdown({ user, onClose, onOpenProfile }) {
  const initials = getInitials(user.firstName, user.lastName);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onOutside = (e) => { if (!e.target.closest('.pd-trigger-wrap')) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [onClose]);

  const handleLogout = () => {
    // Always destroy the server session first — otherwise the session cookie
    // remains valid and auth-form's getMe() call returns 200, which immediately
    // redirects back to '/' causing a redirect loop.
    fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(() => {
        localStorage.removeItem('af_user');
        window.location.replace('/auth-form');
      });
  };

  const handleMyPosts = () => {
    // eslint-disable-next-line no-underscore-dangle
    window.location.href = `/?author=${user._id}`;
    onClose();
  };

  return html`
    <div class="pd-dropdown" role="menu" aria-label="Profile menu">
      <div class="pd-header">
        <div class="pd-avatar">${initials}</div>
        <div class="pd-info">
          <p class="pd-name">${user.firstName} ${user.lastName}</p>
          <p class="pd-email">${user.email}</p>
        </div>
      </div>
      <div class="pd-divider"></div>
      <ul class="pd-menu" role="none">
        <li role="none">
          <button type="button" class="pd-item" role="menuitem" onClick=${onOpenProfile}>
            <span class="pd-item-icon"><${UserIcon}/></span>
            <span class="pd-item-label">View Profile</span>
            <span class="pd-item-chevron"><${ChevronIcon}/></span>
          </button>
        </li>
        <li role="none">
          <button type="button" class="pd-item" role="menuitem" onClick=${handleMyPosts}>
            <span class="pd-item-icon"><${PostsIcon}/></span>
            <span class="pd-item-label">My Posts</span>
            <span class="pd-item-chevron"><${ChevronIcon}/></span>
          </button>
        </li>
      </ul>
      <div class="pd-divider"></div>
      <div class="pd-footer">
        <button type="button" class="pd-signout" role="menuitem" onClick=${handleLogout}>
          <${LogoutIcon}/> Sign Out
        </button>
      </div>
    </div>`;
}

// ============================================
// NOTIFICATIONS DROPDOWN
// ============================================
function NotificationsDropdown({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      // Get the current logged-in user's ID for ownership checks below
      const currentUser = getStoredUser();
      // eslint-disable-next-line no-underscore-dangle
      const currentUserId = currentUser?._id ? String(currentUser._id) : null;

      try {
        const fetchSafe = (url) => fetch(url, { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : { success: false }))
          .catch(() => ({ success: false }));

        const [pendingRes, myRequestsRes, notifRes, postNotifRes] = await Promise.all([
          fetchSafe(AUTH_API_BASE.replace('/auth', '/reviews/pending')),
          fetchSafe(AUTH_API_BASE.replace('/auth', '/reviews/my-requests')),
          fetchSafe(AUTH_API_BASE.replace('/auth', '/reviews/author-notifications')),
          fetchSafe(`${API_BASE}/posts/notifications`),
        ]);

        const combined = [];

        // Reviewer side: posts assigned to ME for review.
        // Filter: postId & authorId must be populated, and the review must
        // belong to the current user as the reviewer (reviewerId match).
        if (pendingRes.success) {
          pendingRes.reviews
            .filter((r) => {
              if (!r.postId || !r.authorId) return false;
              // If the backend already scopes to the session user this is a no-op,
              // but guard client-side too in case the endpoint returns all reviews.
              if (currentUserId) {
                const reviewerId = r.reviewerId ? String(typeof r.reviewerId === 'object' ? r.reviewerId._id : r.reviewerId) : null; // eslint-disable-line no-underscore-dangle
                if (reviewerId && reviewerId !== currentUserId) return false;
              }
              return true;
            })
            .forEach((r) => combined.push({ type: 'reviewer_pending', data: r }));
        }

        // Author side: use author-notifications as the primary source for
        // both approved AND changes_requested — it is the authoritative
        // dismissed/undismissed list maintained by the backend.
        // CRITICAL: only show notifications where the post's authorId matches
        // the current logged-in user — prevents reviewer accounts from seeing
        // author-side notifications that belong to someone else.
        // my-requests is kept as a fallback only when author-notifications fails.
        if (notifRes.success && notifRes.reviews) {
          notifRes.reviews
            .filter((r) => {
              if (!r.postId) return false;
              if (!currentUserId) return true; // can't check, allow through
              // authorId may be a populated object or a raw string ID
              const authorId = r.authorId // eslint-disable-line no-underscore-dangle
                ? String(typeof r.authorId === 'object' ? r.authorId._id : r.authorId) // eslint-disable-line no-underscore-dangle
                : null;
              return !authorId || authorId === currentUserId;
            })
            .forEach((r) => combined.push({ type: 'author_update', data: r }));
        } else if (myRequestsRes.success && myRequestsRes.reviews) {
          myRequestsRes.reviews
            .filter((r) => {
              if (!r.postId) return false;
              if (r.overallStatus !== 'approved' && r.overallStatus !== 'changes_requested') return false;
              if (!currentUserId) return true;
              const authorId = r.authorId // eslint-disable-line no-underscore-dangle
                ? String(typeof r.authorId === 'object' ? r.authorId._id : r.authorId) // eslint-disable-line no-underscore-dangle
                : null;
              return !authorId || authorId === currentUserId;
            })
            .forEach((r) => combined.push({ type: 'author_update', data: r }));
        }

        if (postNotifRes.success && postNotifRes.notifications) {
          postNotifRes.notifications
            .forEach((notification) => combined.push({ type: 'post_like', data: notification }));
        }

        // Drop notifications older than 30 days (client-side TTL)
        const TTL_MS = 30 * 24 * 60 * 60 * 1000;
        const filtered = combined.filter((item) => {
          const date = item.data.updatedAt || item.data.createdAt;
          if (!date) return true;
          return Date.now() - new Date(date).getTime() <= TTL_MS;
        });

        // sort by most recent updatedAt/createdAt
        filtered.sort((a, b) => new Date(b.data.updatedAt || b.data.createdAt)
          - new Date(a.data.updatedAt || a.data.createdAt));
        setItems(filtered);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch notifications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onOutside = (e) => { if (!e.target.closest('.nd-trigger-wrap')) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [onClose]);

  const navigateToPost = (postId) => {
    if (!postId) return;
    // If not on the home page, navigate there and carry the postId
    if (
      window.location.pathname !== '/'
      && window.location.pathname !== '/index'
    ) {
      window.location.href = `/?post=${encodeURIComponent(postId)}`;
      return;
    }
    // Already on home page — same DOM + event pattern as sidebar
    navigateToPostRoute(postId, { source: 'header-notification' });
  };

  // Safe accessors: backend may return postId/authorId as a populated object OR a raw string ID.
  // Using these helpers prevents crashes when population is missing or partial.
  const getId = (ref) => (ref && typeof ref === 'object' ? ref._id : ref); // eslint-disable-line no-underscore-dangle
  const getTitle = (ref) => (ref && typeof ref === 'object' ? ref.title : null);
  const getFirstName = (ref) => (ref && typeof ref === 'object' ? ref.firstName : '');
  const getLastName = (ref) => (ref && typeof ref === 'object' ? ref.lastName : '');
  const getFullName = (ref) => `${getFirstName(ref)} ${getLastName(ref)}`.trim();

  const handlePendingClick = async (e, postId, reviewId) => {
    e.preventDefault();
    // Dismiss the reviewer-side notification so the badge clears after clicking
    if (reviewId) {
      try {
        await fetch(AUTH_API_BASE.replace('/auth', `/reviews/${reviewId}/dismiss-notification`), {
          method: 'PATCH',
          credentials: 'include',
        });
      } catch (err) { /* ignore */ }
    }
    onClose();
    navigateToPost(postId);
  };

  const handleDismiss = async (e, postId, reviewId) => {
    e.preventDefault();
    try {
      await fetch(AUTH_API_BASE.replace('/auth', `/reviews/${reviewId}/dismiss-notification`), {
        method: 'PATCH',
        credentials: 'include',
      });
    } catch (err) { /* ignore */ }
    onClose();
    navigateToPost(postId);
  };

  const handlePostNotificationClick = async (e, postId, notificationId) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/posts/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
    } catch (err) { /* ignore */ }
    onClose();
    navigateToPost(postId);
  };

  const approvedIcon = html`
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
      <circle cx="8" cy="8" r="8" fill="${COLOR_TOKENS.success}"/>
      <polyline points="4.5,8.5 7,11 11.5,5.5" stroke="${COLOR_TOKENS.white}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const changesIcon = html`
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
      <circle cx="8" cy="8" r="8" fill="${COLOR_TOKENS.warning}"/>
      <path d="M8 4.5V8.5" stroke="${COLOR_TOKENS.white}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="8" cy="11" r="0.9" fill="${COLOR_TOKENS.white}"/>
    </svg>`;

  const likeIcon = html`
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
      <path d="M8 13.2 3.7 9.3a2.7 2.7 0 0 1 0-3.9 2.7 2.7 0 0 1 3.8 0L8 5.9l0.5-0.5a2.7 2.7 0 0 1 3.8 0 2.7 2.7 0 0 1 0 3.9L8 13.2Z" fill="#da1f26"/>
    </svg>`;

  return html`
    <div class="pd-dropdown nd-dropdown" role="menu" aria-label="Notifications menu">
      <div class="pd-header">
        <div class="pd-info">
          <p class="pd-name nd-header-title">Notifications</p>
        </div>
      </div>
      <div class="pd-divider"></div>
      <ul class="pd-menu nd-menu nd-tl-list" role="none">
        ${loading ? html`<li class="nd-msg">Loading...</li>` : null}
        ${!loading && items.length === 0 ? html`<li class="nd-msg">No new notifications.</li>` : null}
        ${!loading && items.map((item) => {
    if (item.type === 'reviewer_pending') {
      const r = item.data;
      // eslint-disable-next-line no-underscore-dangle
      const pId = getId(r.postId);
      const rId = getId(r); // eslint-disable-line no-underscore-dangle
      const postTitle = getTitle(r.postId) || 'Untitled Post';
      const timeAgo = formatTimeAgo(r.updatedAt);
      return html`
              <li role="none" class="nd-tl-row">
                <a href="#" class="nd-tl-card nd-tl-card--pending" role="menuitem" onClick=${(e) => handlePendingClick(e, pId, rId)}>
                  <span class="nd-pill-row">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
                      <circle cx="8" cy="8" r="7.25" stroke="${COLOR_TOKENS.info}" stroke-width="1.5" fill="${COLOR_TOKENS.infoSurface}"/>
                      <path d="M8 4.5V8l2.5 2" stroke="${COLOR_TOKENS.info}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="nd-pill nd-pill--pending">Review Request</span>
                  </span>
                  <span class="nd-tl-title"><span class="nd-tl-title-text">${postTitle}</span><span class="nd-tl-time-inline"> · ${timeAgo}</span></span>
                </a>
              </li>`;
    }
    if (item.type === 'author_update') {
      const r = item.data;
      const isApproved = r.overallStatus === 'approved';
      const pId = getId(r.postId); // eslint-disable-line no-underscore-dangle
      const rId = getId(r); // eslint-disable-line no-underscore-dangle
      const postTitle = getTitle(r.postId) || 'Untitled Post';
      const timeAgo = formatTimeAgo(r.updatedAt);
      const statusIcon = isApproved ? approvedIcon : changesIcon;
      const cardClass = isApproved ? 'nd-tl-card--approved' : 'nd-tl-card--changes';
      const pillClass = isApproved ? 'nd-pill--approved' : 'nd-pill--changes';
      const pillLabel = isApproved ? 'Approved' : 'Changes Requested';
      return html`
              <li role="none" class="nd-tl-row">
                <a href="#" class="nd-tl-card ${cardClass}" role="menuitem" onClick=${(e) => handleDismiss(e, pId, rId)}>
                  <span class="nd-pill-row">
                    ${statusIcon}
                    <span class="nd-pill ${pillClass}">${pillLabel}</span>
                  </span>
                  <span class="nd-tl-title"><span class="nd-tl-title-text">${postTitle}</span><span class="nd-tl-time-inline"> · ${timeAgo}</span></span>
                </a>
              </li>`;
    }
    if (item.type === 'post_like') {
      const n = item.data;
      const pId = getId(n.post); // eslint-disable-line no-underscore-dangle
      const nId = getId(n); // eslint-disable-line no-underscore-dangle
      const postTitle = getTitle(n.post) || 'Untitled Post';
      const actorName = getFullName(n.actor) || 'Someone';
      const timeAgo = formatTimeAgo(n.createdAt);
      return html`
              <li role="none" class="nd-tl-row">
                <a href="#" class="nd-tl-card nd-tl-card--like" role="menuitem" onClick=${(e) => handlePostNotificationClick(e, pId, nId)}>
                  <span class="nd-pill-row">
                    ${likeIcon}
                  </span>
                  <span class="nd-tl-like-title">${postTitle}</span>
                  <span class="nd-tl-meta"><span class="nd-tl-meta-text">${actorName} liked your post</span><span class="nd-tl-time-inline"> · ${timeAgo}</span></span>
                </a>
              </li>`;
    }
    return null;
  })}
      </ul>
    </div>`;
}

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [sessionWarning, setSessionWarning] = useState(false);
  const authRedirectedRef = useRef(false);
  const user = getStoredUser();
  const initials = user ? getInitials(user.firstName, user.lastName) : '?';

  useEffect(() => {
    if (user) {
      const fetchSafe = (url) => fetch(url, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { success: false }))
        .catch(() => ({ success: false }));

      // eslint-disable-next-line no-underscore-dangle
      const currentUserId = user._id ? String(user._id) : null;
      // Helper: extract string ID from a populated object or raw string
      const toStrId = (ref) => { // eslint-disable-line no-underscore-dangle
        if (!ref) return null;
        return typeof ref === 'object' ? String(ref._id) : String(ref); // eslint-disable-line no-underscore-dangle
      };

      Promise.all([
        fetchSafe(AUTH_API_BASE.replace('/auth', '/reviews/pending')),
        fetchSafe(AUTH_API_BASE.replace('/auth', '/reviews/my-requests')),
        fetchSafe(AUTH_API_BASE.replace('/auth', '/reviews/author-notifications')),
        fetchSafe(`${API_BASE}/posts/notifications`),
      ]).then(([pendingRes, myRequestsRes, notifRes, postNotifRes]) => {
        let count = 0;

        // Reviewer badge: only count pending reviews assigned to THIS user
        if (pendingRes.success) {
          count += pendingRes.reviews.filter((r) => {
            if (!r.postId || !r.authorId) return false;
            if (!currentUserId) return true;
            const reviewerId = toStrId(r.reviewerId);
            return !reviewerId || reviewerId === currentUserId;
          }).length;
        }

        // Author badge: only count notifications where THIS user is the post author
        if (notifRes.success && notifRes.reviews) {
          count += notifRes.reviews.filter((r) => {
            if (!r.postId) return false;
            if (!currentUserId) return true;
            const authorId = toStrId(r.authorId);
            return !authorId || authorId === currentUserId;
          }).length;
        } else if (myRequestsRes.success && myRequestsRes.reviews) {
          count += myRequestsRes.reviews.filter((r) => {
            if (!r.postId) return false;
            if (r.overallStatus !== 'approved' && r.overallStatus !== 'changes_requested') return false;
            if (!currentUserId) return true;
            const authorId = toStrId(r.authorId);
            return !authorId || authorId === currentUserId;
          }).length;
        }

        if (postNotifRes.success && postNotifRes.notifications) {
          count += postNotifRes.notifications.length;
        }
        setPendingCount(count);
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
    }
  }, [user]);

  useEffect(() => {
    const onSidebarStateChange = (e) => setSidebarOpen(e.detail.isOpen);
    window.addEventListener('sidebar-state-changed', onSidebarStateChange);
    return () => window.removeEventListener('sidebar-state-changed', onSidebarStateChange);
  }, []);

  // ── Session timeout ─────────────────────────────────────────────────────
  // Reads loginAt from /me (authoritative) or localStorage (fallback).
  // At 25 min: show warning banner. At 30 min: logout and redirect.
  // The effect re-runs whenever the stored user changes so timers are
  // always anchored to the current loginAt — not a stale captured value.
  useEffect(() => {
    const SESSION_MS = 30 * 60 * 1000; // 30 min
    const WARNING_MS = 5 * 60 * 1000; //  5 min before logout = 25 min mark
    let warnTimer;
    let logoutTimer;

    // Read user fresh from localStorage each time the effect runs
    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem('af_user') || 'null'); } catch { return null; }
    })();

    // No user in localStorage at all — nothing to time out, don't touch session
    if (!storedUser) return () => { };

    const doLogout = () => {
      if (window.location.pathname.startsWith('/auth-form')) return;
      fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' })
        .finally(() => {
          localStorage.removeItem('af_user');
          window.location.replace('/auth-form');
        });
    };

    const handleUnauthorized = () => {
      setSessionWarning(false);
      clearClientAuthState();

      if (authRedirectedRef.current) return;
      authRedirectedRef.current = true;

      if (!window.location.pathname.startsWith('/auth-form')) {
        window.location.replace('/auth-form');
      }
    };

    const scheduleTimers = (loginAt) => {
      clearTimeout(warnTimer);
      clearTimeout(logoutTimer);
      const now = Date.now();
      const elapsed = now - loginAt;
      const remaining = SESSION_MS - elapsed;

      // loginAt is in the future or wildly wrong — treat as fresh login
      const safeRemaining = (remaining > SESSION_MS || remaining < 0) ? SESSION_MS : remaining;

      if (safeRemaining <= 0) {
        doLogout();
        return;
      }

      const warnIn = safeRemaining - WARNING_MS;
      if (warnIn <= 0) {
        // Already past the 25-min mark — show warning immediately
        setSessionWarning(true);
      } else {
        warnTimer = setTimeout(() => setSessionWarning(true), warnIn);
      }
      logoutTimer = setTimeout(doLogout, safeRemaining);
    };

    // Ask the server for the authoritative loginAt from the session store.
    // 200 → schedule from server loginAt (most accurate).
    // 401 → session gone, clear stale client auth and redirect once.
    // network error → fall back to localStorage loginAt, do NOT logout.
    fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          handleUnauthorized();
          return null;
        }
        if (!r.ok) return null; // other server error — skip, don't logout
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const serverLoginAt = data.loginAt;
        if (serverLoginAt) {
          // Keep localStorage in sync
          try {
            const s = JSON.parse(localStorage.getItem('af_user') || 'null');
            if (s) localStorage.setItem('af_user', JSON.stringify({ ...s, loginAt: serverLoginAt }));
          } catch { /* ignore */ }
          scheduleTimers(serverLoginAt);
        } else {
          // Session alive but loginAt missing — fall back to localStorage
          scheduleTimers(storedUser.loginAt || Date.now());
        }
      })
      .catch(() => {
        // Network error — keep the user logged in, schedule from localStorage
        if (storedUser.loginAt) scheduleTimers(storedUser.loginAt);
      });

    return () => { clearTimeout(warnTimer); clearTimeout(logoutTimer); };
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { isOpen: next } }));
  };

  const handleSessionRelogin = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore network errors */ }
    localStorage.removeItem('af_user');
    window.location.replace('/auth-form');
  };

  return html`
    <nav class="spectrum-nav">
      <div class="nav-hamburger ${sidebarOpen ? 'is-open' : ''}">
        <button type="button" onClick=${toggleSidebar} aria-label="Toggle Sidebar" aria-expanded=${sidebarOpen}>
          <span class="nav-hamburger-icon"></span>
        </button>
      </div>

      <div class="nav-brand-section">
        <a href="/" class="nav-brand">
          <img src="/icons/logo.svg" alt="Adobe Logo"
            onError=${(e) => { if (e.target.src.endsWith('.svg')) e.target.src = '/icons/logo.png'; }}/>
        </a>
        <a href="/create-post" class="nav-button spectrum-button">
          <${PlusIcon}/><span>Add Post</span>
        </a>
      </div>

      <div class="nav-tools">
        <ul>
          ${user && html`
          <li class="profile-item">
            <div class="nd-trigger-wrap">
              <button type="button" class="spectrum-action-button nd-bell-btn" aria-label="Notifications" aria-expanded=${String(notifOpen)} onClick=${() => { setNotifOpen((o) => !o); setDropdownOpen(false); }}>
                <${BellIcon}/>
                ${pendingCount > 0 ? html`<span class="nd-badge"></span>` : null}
              </button>
              ${notifOpen ? html`<${NotificationsDropdown} onClose=${() => setNotifOpen(false)} />` : null}
            </div>
          </li>
          `}
          <li class="profile-item">
            <div class="pd-trigger-wrap">
              <button type="button" class="profile-avatar-btn${dropdownOpen ? ' is-active' : ''}"
                aria-label="Open profile menu" aria-expanded=${String(dropdownOpen)}
                aria-haspopup="true"
                onClick=${() => { setDropdownOpen((o) => !o); setNotifOpen(false); }}>
                ${initials}
              </button>
              ${dropdownOpen && user && html`
                <${ProfileDropdown}
                  user=${user}
                  onClose=${() => setDropdownOpen(false)}
                  onOpenProfile=${() => { setDropdownOpen(false); setProfileModalOpen(true); }}
                />`}
            </div>
          </li>
        </ul>
      </div>
    </nav>

    ${profileModalOpen && html`<${ProfilePopup} onClose=${() => setProfileModalOpen(false)}/>`}

    ${sessionWarning && html`
      <div class="session-warning-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Your session expires in 5 minutes.${' '}
        <button
          type="button"
          class="session-warning-login-btn"
          onClick=${handleSessionRelogin}
        >Log in again</button>${' '}
        to stay signed in.
        <button type="button" class="session-warning-close" onClick=${() => setSessionWarning(false)}>×</button>
      </div>`}`;
}

// ============================================
// HELPERS
// ============================================

function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      if (existing.sheet) {
        resolve();
        return;
      }
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.append(link);
  });
}

// ============================================
// AEM BLOCK DECORATOR
// ============================================

export default async function decorate(block) {
  // Purge legacy view tracking tokens now that the engine is migrated to the backend
  localStorage.removeItem('af_viewed_posts');

  block.textContent = '';
  block.style.display = 'block';
  block.style.minHeight = 'var(--header-height)';
  const headerWrapper = document.createElement('div');
  headerWrapper.className = 'header-wrapper';
  block.append(headerWrapper);

  try {
    render(html`<${HeaderComponent}/>`, headerWrapper);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Header render error:', err);
  }

  try {
    await loadCSS('/blocks/sidebar/sidebar.css');
    await ensureResponsiveCSSLast();
    const sidebarMount = document.createElement('div');
    sidebarMount.className = 'sidebar-mount';
    document.body.append(sidebarMount);
    const { default: decorateSidebar } = await import('../sidebar/sidebar.js');
    decorateSidebar(sidebarMount);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load sidebar', e);
  }

  try {
    const footerResp = await fetch('/footer.plain.html');
    if (footerResp.ok) {
      const footerHtml = await footerResp.text();
      let footer = document.querySelector('footer');
      if (!footer) {
        footer = document.createElement('footer');
        document.body.append(footer);
      }
      footer.innerHTML = footerHtml;
      footer.classList.add('global-footer');
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load global footer', e);
  }
}

