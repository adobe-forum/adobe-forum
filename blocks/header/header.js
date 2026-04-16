/* eslint-disable max-len */
import { html, render } from '../../vendor/htm-preact.js';
import { useState, useEffect } from '../../vendor/preact-hooks.js';
import {
  PlusIcon, CloseIcon, EditIcon, LogoutIcon, PostsIcon,
  UserIcon, ChevronIcon, CheckIcon, AlertIcon,
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

function ProfileView({ user, onLogout }) {
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
      const res = await fetch(`${AUTH_API_BASE}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        <span class="pp-field-hint">Email is managed by Adobe IMS and cannot be changed here.</span>
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
            <span class="pp-btn-label">${loading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        `}
      </div>

      <div class="pp-divider"></div>
      <button type="button" class="pp-text-btn pp-text-btn--red" onClick=${onLogout}>
        <${LogoutIcon}/> Sign Out
      </button>
    </div>`;
}

function ProfilePopup({ onClose }) {
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
    localStorage.removeItem('af_user');
    if (window.adobeIMS) {
      window.adobeIMS.signOut();
    } else {
      window.location.replace('/');
    }
  };

  if (!user) { handleLogout(); return null; }

  return html`
    <div class="pp-overlay" onClick=${handleOverlay} role="dialog" aria-modal="true" aria-label="Profile">
      <div class="pp-modal">
        <button type="button" class="pp-close" aria-label="Close" onClick=${onClose}>
          <${CloseIcon}/>
        </button>
        <${ProfileView} user=${user} onLogout=${handleLogout}/>
      </div>
    </div>`;
}

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
    localStorage.removeItem('af_user');
    if (window.adobeIMS) {
      window.adobeIMS.signOut();
    } else {
      window.location.replace('/');
    }
  };

  const handleMyPosts = () => {
    window.location.href = `/?author=${user._id}`; // eslint-disable-line no-underscore-dangle
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

function NotificationsDropdown({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const currentUser = getStoredUser();
      const currentUserId = currentUser?._id ? String(currentUser._id) : null; // eslint-disable-line no-underscore-dangle

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

        if (pendingRes.success) {
          pendingRes.reviews
            .filter((r) => {
              if (!r.postId || !r.authorId) return false;
              if (currentUserId) {
                const reviewerId = r.reviewerId
                  ? String(typeof r.reviewerId === 'object' ? r.reviewerId._id : r.reviewerId) // eslint-disable-line no-underscore-dangle
                  : null;
                if (reviewerId && reviewerId !== currentUserId) return false;
              }
              return true;
            })
            .forEach((r) => combined.push({ type: 'reviewer_pending', data: r }));
        }

        if (notifRes.success && notifRes.reviews) {
          notifRes.reviews
            .filter((r) => {
              if (!r.postId) return false;
              if (!currentUserId) return true;
              const authorId = r.authorId
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
              const authorId = r.authorId
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

        combined.sort((a, b) => new Date(b.data.updatedAt || b.data.createdAt)
          - new Date(a.data.updatedAt || a.data.createdAt));
        setItems(combined);
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
    if (window.location.pathname !== '/' && window.location.pathname !== '/index') {
      window.location.href = `/?openPost=${postId}`;
      return;
    }
    const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
    cardsWrappers.forEach((el) => { el.style.display = 'none'; });
    const postWrappers = document.querySelectorAll('.forum-post-wrapper, .forum-post-container, .forum-post');
    postWrappers.forEach((el) => { el.style.display = 'block'; });
    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId } }));
  };

  const getId = (ref) => (ref && typeof ref === 'object' ? ref._id : ref); // eslint-disable-line no-underscore-dangle
  const getTitle = (ref) => (ref && typeof ref === 'object' ? ref.title : null);
  const getFirstName = (ref) => (ref && typeof ref === 'object' ? ref.firstName : '');
  const getLastName = (ref) => (ref && typeof ref === 'object' ? ref.lastName : '');
  const getFullName = (ref) => `${getFirstName(ref)} ${getLastName(ref)}`.trim();

  const handlePendingClick = async (e, postId, reviewId) => {
    e.preventDefault();
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
      const pId = getId(r.postId);
      const rId = getId(r);
      const postTitle = getTitle(r.postId) || 'Untitled Post';
      const authorFirst = getFirstName(r.authorId);
      const authorLast = getLastName(r.authorId);
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
                  <span class="nd-tl-title">${postTitle}<span class="nd-tl-time-inline"> · ${timeAgo}</span></span>
                  <span class="nd-tl-meta">Requested by ${authorFirst} ${authorLast}</span>
                </a>
              </li>`;
    }
    if (item.type === 'author_update') {
      const r = item.data;
      const isApproved = r.overallStatus === 'approved';
      const pId = getId(r.postId);
      const rId = getId(r);
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
                  <span class="nd-tl-title">${postTitle}<span class="nd-tl-time-inline"> · ${timeAgo}</span></span>
                </a>
              </li>`;
    }
    if (item.type === 'post_like') {
      const n = item.data;
      const pId = getId(n.post);
      const nId = getId(n);
      const postTitle = getTitle(n.post) || 'Untitled Post';
      const actorName = getFullName(n.actor) || 'Someone';
      const timeAgo = formatTimeAgo(n.createdAt);
      return html`
              <li role="none" class="nd-tl-row">
                <a href="#" class="nd-tl-card" role="menuitem" onClick=${(e) => handlePostNotificationClick(e, pId, nId)}>
                  <span class="nd-pill-row">
                    ${likeIcon}
                  </span>
                  <span class="nd-tl-title">${postTitle}<span class="nd-tl-time-inline"> · ${timeAgo}</span></span>
                  <span class="nd-tl-meta">${actorName} liked your post</span>
                </a>
              </li>`;
    }
    return null;
  })}
      </ul>
    </div>`;
}

function HeaderComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const user = getStoredUser();
  const initials = user ? getInitials(user.firstName, user.lastName) : '?';

  useEffect(() => {
    if (user) {
      const fetchSafe = (url) => fetch(url, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { success: false }))
        .catch(() => ({ success: false }));

      const currentUserId = user._id ? String(user._id) : null; // eslint-disable-line no-underscore-dangle
      const toStrId = (ref) => {
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

        if (pendingRes.success) {
          count += pendingRes.reviews.filter((r) => {
            if (!r.postId || !r.authorId) return false;
            if (!currentUserId) return true;
            const reviewerId = toStrId(r.reviewerId);
            return !reviewerId || reviewerId === currentUserId;
          }).length;
        }

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

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { isOpen: next } }));
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

    ${profileModalOpen && html`<${ProfilePopup} onClose=${() => setProfileModalOpen(false)}/>`}`;
}

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

export default async function decorate(block) {
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
