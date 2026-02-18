import { html, render } from '../../vendor/htm-preact.js';
import {
  useState, useRef, useEffect, useCallback,
} from '../../vendor/preact-hooks.js';

// ============================================
// ICON COMPONENTS
// ============================================

const EditIcon = () => html`
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;

const CameraIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>`;

const CloseIcon = () => html`
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

const UserIcon = () => html`
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color: var(--spectrum-gray-800);">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>`;

const HeartIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>`;

const CommentIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
  </svg>`;

const EyeStatIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>`;

const ZoomInIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`;

const ZoomOutIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`;

// ---- Social Brand Icons ----
const GithubIcon = () => html`
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>`;

const LinkedinIcon = () => html`
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>`;

const XTwitterIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>`;

// ============================================
// PROFILE STORAGE HELPERS
// ============================================

const PROFILE_STORAGE_KEY = 'user-profile-data';

const loadProfileData = () => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return {
    firstName: '',
    lastName: '',
    phoneCountry: '+91',
    phoneNumber: '',
    gender: '',
    dob: '',
    profileImage: null,
    // NEW: social profile URLs
    socialGithub: '',
    socialLinkedin: '',
    socialX: '',
  };
};

const saveProfileData = (data) => {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
};

// ============================================
// MOCK POSTS DATA
// ============================================

const MOCK_POSTS = {
  popular: [
    { id: 1, title: 'Getting Started with JavaScript ES2024', category: 'JavaScript', likes: 38, comments: 9, views: 142 },
    { id: 2, title: 'CSS Grid vs Flexbox: The Ultimate Guide', category: 'CSS & Design', likes: 31, comments: 7, views: 118 },
    { id: 3, title: 'Docker for Frontend Developers', category: 'DevOps', likes: 24, comments: 5, views: 96 },
  ],
  recent: [
    { id: 4, title: 'Python Type Hints in 2025', category: 'Python', likes: 8, comments: 2, views: 34, date: '12 Feb 2026' },
    { id: 5, title: 'Building CLI Tools with Node.js', category: 'JavaScript', likes: 6, comments: 1, views: 27, date: '9 Feb 2026' },
    { id: 6, title: 'Kubernetes Helm Charts Deep Dive', category: 'DevOps', likes: 5, comments: 1, views: 21, date: '5 Feb 2026' },
  ],
  categories: [
    { name: 'JavaScript', posts: 7, likes: 94, comments: 21, views: 380 },
    { name: 'Python', posts: 5, likes: 61, comments: 14, views: 240 },
    { name: 'CSS & Design', posts: 4, likes: 48, comments: 10, views: 190 },
    { name: 'DevOps', posts: 3, likes: 37, comments: 8, views: 150 },
  ],
};

// ============================================
// IMAGE CROPPER COMPONENT
// ============================================

function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(new Image());
  const CANVAS_SIZE = 280;

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => {
      const fitScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!img.complete || !img.naturalWidth) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (CANVAS_SIZE - w) / 2 + offset.x;
    const y = (CANVAS_SIZE - h) / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [scale, offset, imageSrc]);

  const handleMouseDown = (e) => { setDragging(true); dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; };
  const handleMouseMove = useCallback((e) => { if (!dragging || !dragStart.current) return; setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }, [dragging]);
  const handleMouseUp = () => setDragging(false);
  const handleTouchStart = (e) => { const t = e.touches[0]; setDragging(true); dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y }; };
  const handleTouchMove = useCallback((e) => { if (!dragging || !dragStart.current) return; const t = e.touches[0]; setOffset({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y }); }, [dragging]);
  const handleWheel = (e) => { e.preventDefault(); setScale((s) => Math.min(5, Math.max(0.3, s - e.deltaY * 0.001))); };

  const handleCrop = () => {
    const out = document.createElement('canvas');
    out.width = 200; out.height = 200;
    const ctx = out.getContext('2d');
    const img = imgRef.current;
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.clip();
    const ratio = 200 / CANVAS_SIZE;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = ((CANVAS_SIZE - w) / 2 + offset.x) * ratio;
    const y = ((CANVAS_SIZE - h) / 2 + offset.y) * ratio;
    ctx.drawImage(img, x, y, w * ratio, h * ratio);
    ctx.restore();
    onCrop(out.toDataURL('image/jpeg', 0.92));
  };

  return html`
    <div class="pp-crop-backdrop" onClick=${(e) => e.stopPropagation()}>
      <div class="pp-crop-modal">
        <div class="pp-crop-header">
          <h3 class="pp-crop-title">Crop Profile Photo</h3>
          <button class="pp-close-btn" type="button" onClick=${onCancel}><${CloseIcon} /></button>
        </div>
        <p class="pp-crop-hint">Drag to reposition · Scroll or use slider to zoom</p>
        <div
          class="pp-crop-canvas-wrap"
          onMouseDown=${handleMouseDown} onMouseMove=${handleMouseMove}
          onMouseUp=${handleMouseUp} onMouseLeave=${handleMouseUp}
          onTouchStart=${handleTouchStart} onTouchMove=${handleTouchMove}
          onTouchEnd=${handleMouseUp} onWheel=${handleWheel}
          style="cursor:${dragging ? 'grabbing' : 'grab'}"
        >
          <canvas ref=${canvasRef} width=${CANVAS_SIZE} height=${CANVAS_SIZE} class="pp-crop-canvas" />
        </div>
        <div class="pp-crop-zoom-row">
          <button class="pp-crop-zoom-btn" type="button" onClick=${() => setScale((s) => Math.max(0.3, s - 0.1))}><${ZoomOutIcon} /></button>
          <input type="range" min="30" max="500" step="1" value=${Math.round(scale * 100)} class="pp-crop-slider" onInput=${(e) => setScale(Number(e.target.value) / 100)} />
          <button class="pp-crop-zoom-btn" type="button" onClick=${() => setScale((s) => Math.min(5, s + 0.1))}><${ZoomInIcon} /></button>
          <span class="pp-crop-zoom-lbl">${Math.round(scale * 100)}%</span>
        </div>
        <div class="pp-crop-actions">
          <button class="pp-btn pp-btn--edit" type="button" onClick=${onCancel}>Cancel</button>
          <button class="pp-btn pp-btn--save" type="button" onClick=${handleCrop}>Apply Crop</button>
        </div>
      </div>
    </div>`;
}

// ============================================
// SOCIAL PROFILES COMPONENT
// ============================================

function SocialProfiles({ profileData, isEditing, onInputChange }) {
  const socials = [
    {
      key: 'socialGithub',
      label: 'GitHub',
      placeholder: 'https://github.com/username',
      icon: GithubIcon,
      color: '#24292e',
    },
    {
      key: 'socialLinkedin',
      label: 'LinkedIn',
      placeholder: 'https://linkedin.com/in/username',
      icon: LinkedinIcon,
      color: '#0077b5',
    },
    {
      key: 'socialX',
      label: 'X (Twitter)',
      placeholder: 'https://x.com/username',
      icon: XTwitterIcon,
      color: '#000000',
    },
  ];

  // Ensure URLs open safely
  const safeHref = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  if (isEditing) {
    // EDIT MODE — show labelled text inputs with social icon prefix
    return html`
      <div class="pp-social-section">
        <h2 class="pp-section-title">Social Profiles</h2>
        <div class="pp-social-edit-list">
          ${socials.map(({ key, label, placeholder, icon: Icon, color }) => html`
            <div class="pp-social-edit-row" key=${key}>
              <span class="pp-social-edit-icon" style="color:${color}">
                <${Icon} />
              </span>
              <div class="pp-field-group" style="flex:1;">
                <label class="pp-label">${label}</label>
                <input
                  type="url"
                  class="pp-input"
                  placeholder=${placeholder}
                  value=${profileData[key] || ''}
                  onInput=${(e) => onInputChange(key, e.target.value)}
                />
              </div>
            </div>
          `)}
        </div>
      </div>`;
  }

  // VIEW MODE — show brand-colored clickable icons only
  const hasAnySocial = socials.some(({ key }) => profileData[key]);

  return html`
    <div class="pp-social-section">
      <h2 class="pp-section-title">Social Profiles</h2>
      <div class="pp-social-icons-row">
        ${socials.map(({ key, icon: Icon, label, color }) => {
          const href = safeHref(profileData[key]);
          if (!href) return null;
          return html`
            <a
              key=${key}
              href=${href}
              target="_blank"
              rel="noopener noreferrer"
              class="pp-social-view-link"
              title=${label}
              style="color:${color}"
            >
              <${Icon} />
            </a>`;
        })}
        ${!hasAnySocial && html`
          <span class="pp-social-empty">No social profiles added yet.</span>
        `}
      </div>
    </div>`;
}

// ============================================
// ACTIVITY STATS COMPONENT
// ============================================

function ActivityStats() {
  const [activeTab, setActiveTab] = useState('popular');

  const tabs = [
    { id: 'popular', label: 'Most Popular' },
    { id: 'recent', label: 'Recent Posts' },
    { id: 'categories', label: 'Categories' },
  ];

  const formatNum = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  const renderPopular = () => html`
    <table class="pp-stats-table">
      <thead><tr>
        <th class="pp-th pp-th--title">Post</th>
        <th class="pp-th">Category</th>
        <th class="pp-th pp-th--num"><${HeartIcon} /></th>
        <th class="pp-th pp-th--num"><${CommentIcon} /></th>
        <th class="pp-th pp-th--num"><${EyeStatIcon} /></th>
      </tr></thead>
      <tbody>
        ${MOCK_POSTS.popular.map((p, i) => html`
          <tr key=${p.id} class="pp-tr">
            <td class="pp-td pp-td--title"><span class="pp-rank">${i + 1}</span><span class="pp-post-title">${p.title}</span></td>
            <td class="pp-td"><span class="pp-tag">${p.category}</span></td>
            <td class="pp-td pp-td--num">${formatNum(p.likes)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.comments)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.views)}</td>
          </tr>`)}
      </tbody>
    </table>`;

  const renderRecent = () => html`
    <table class="pp-stats-table">
      <thead><tr>
        <th class="pp-th pp-th--title">Post</th>
        <th class="pp-th">Category</th>
        <th class="pp-th">Date</th>
        <th class="pp-th pp-th--num"><${HeartIcon} /></th>
        <th class="pp-th pp-th--num"><${CommentIcon} /></th>
        <th class="pp-th pp-th--num"><${EyeStatIcon} /></th>
      </tr></thead>
      <tbody>
        ${MOCK_POSTS.recent.map((p) => html`
          <tr key=${p.id} class="pp-tr">
            <td class="pp-td pp-td--title"><span class="pp-post-title">${p.title}</span></td>
            <td class="pp-td"><span class="pp-tag">${p.category}</span></td>
            <td class="pp-td pp-td--date">${p.date}</td>
            <td class="pp-td pp-td--num">${formatNum(p.likes)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.comments)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.views)}</td>
          </tr>`)}
      </tbody>
    </table>`;

  const renderCategories = () => html`
    <table class="pp-stats-table">
      <thead><tr>
        <th class="pp-th pp-th--title">Category</th>
        <th class="pp-th pp-th--num">Posts</th>
        <th class="pp-th pp-th--num"><${HeartIcon} /></th>
        <th class="pp-th pp-th--num"><${CommentIcon} /></th>
        <th class="pp-th pp-th--num"><${EyeStatIcon} /></th>
      </tr></thead>
      <tbody>
        ${MOCK_POSTS.categories.map((c) => html`
          <tr key=${c.name} class="pp-tr">
            <td class="pp-td pp-td--title"><span class="pp-cat-dot"></span><span class="pp-post-title">${c.name}</span></td>
            <td class="pp-td pp-td--num pp-td--bold">${c.posts}</td>
            <td class="pp-td pp-td--num">${formatNum(c.likes)}</td>
            <td class="pp-td pp-td--num">${formatNum(c.comments)}</td>
            <td class="pp-td pp-td--num">${formatNum(c.views)}</td>
          </tr>`)}
      </tbody>
    </table>`;

  return html`
    <div class="pp-activity">
      <h2 class="pp-section-title">Post Activity</h2>
      <div class="pp-summary-row">
        <div class="pp-summary-pill"><span class="pp-summary-num">19</span><span class="pp-summary-lbl">Total Posts</span></div>
        <div class="pp-summary-pill"><span class="pp-summary-num">240</span><span class="pp-summary-lbl">Total Likes</span></div>
        <div class="pp-summary-pill"><span class="pp-summary-num">53</span><span class="pp-summary-lbl">Comments</span></div>
        <div class="pp-summary-pill"><span class="pp-summary-num">960</span><span class="pp-summary-lbl">Total Views</span></div>
      </div>
      <div class="pp-tabs">
        ${tabs.map((t) => html`
          <button key=${t.id} class="pp-tab ${activeTab === t.id ? 'pp-tab--active' : ''}" type="button" onClick=${() => setActiveTab(t.id)}>${t.label}</button>`)}
      </div>
      <div class="pp-table-wrap">
        ${activeTab === 'popular' ? renderPopular() : ''}
        ${activeTab === 'recent' ? renderRecent() : ''}
        ${activeTab === 'categories' ? renderCategories() : ''}
      </div>
    </div>`;
}

// ============================================
// PROFILE POPUP COMPONENT
// ============================================

function ProfilePopup({ onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(loadProfileData);
  const [savedData, setSavedData] = useState(loadProfileData);
  const [cropSrc, setCropSrc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && !cropSrc) onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, cropSrc]);

  const handleEdit = () => { setSavedData({ ...profileData }); setIsEditing(true); };
  const handleSave = () => { setIsEditing(false); saveProfileData(profileData); };
  const handleCancel = () => { setProfileData({ ...savedData }); setIsEditing(false); };
  const handleInputChange = (field, value) => setProfileData((prev) => ({ ...prev, [field]: value }));

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropDone = (croppedDataUrl) => {
    setCropSrc(null);
    setProfileData((prev) => ({ ...prev, profileImage: croppedDataUrl }));
    saveProfileData({ ...profileData, profileImage: croppedDataUrl });
  };

  // Clicking the transparent overlay backdrop closes the modal
  const handleOverlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  return html`
    ${cropSrc && html`
      <${ImageCropper} imageSrc=${cropSrc} onCrop=${handleCropDone} onCancel=${() => setCropSrc(null)} />`}

    <div class="pp-overlay" onClick=${handleOverlayClick}>
      <div class="pp-modal">

        <!-- STICKY CLOSE BUTTON — sits inside the scrollable modal but sticks to top -->
        <button class="pp-close-btn pp-close-btn--sticky" onClick=${onClose} type="button" aria-label="Close">
          <${CloseIcon} />
        </button>

        <div class="pp-avatar-section">
          <div class="pp-avatar-wrap">
            ${profileData.profileImage
              ? html`<img src=${profileData.profileImage} alt="Profile" class="pp-avatar-img" />`
              : html`<div class="pp-avatar-fallback"><${UserIcon} /></div>`}
            <label class="pp-avatar-camera" title="Change photo">
              <${CameraIcon} />
              <input ref=${fileInputRef} type="file" accept="image/*" onChange=${handleFileSelect} style="display:none;" />
            </label>
          </div>
          ${(profileData.firstName || profileData.lastName) && html`
            <p class="pp-avatar-name">${profileData.firstName} ${profileData.lastName}</p>`}
        </div>

        <div class="pp-section">
          <h2 class="pp-section-title">Profile Details</h2>

          <div class="pp-field-row">
            <div class="pp-field-group">
              <label class="pp-label">First Name</label>
              <input type="text" class="pp-input ${!isEditing ? 'pp-input--disabled' : ''}" placeholder="First Name" value=${profileData.firstName} disabled=${!isEditing} onInput=${(e) => handleInputChange('firstName', e.target.value)} />
            </div>
            <div class="pp-field-group">
              <label class="pp-label">Last Name</label>
              <input type="text" class="pp-input ${!isEditing ? 'pp-input--disabled' : ''}" placeholder="Last Name" value=${profileData.lastName} disabled=${!isEditing} onInput=${(e) => handleInputChange('lastName', e.target.value)} />
            </div>
          </div>

          <div class="pp-field-row">
            <div class="pp-field-group">
              <label class="pp-label">Phone Number</label>
              <div class="pp-phone-wrap">
                <select class="pp-phone-code ${!isEditing ? 'pp-input--disabled' : ''}" value=${profileData.phoneCountry} disabled=${!isEditing} onChange=${(e) => handleInputChange('phoneCountry', e.target.value)}>
                  <option value="+91">IN +91</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                </select>
                <input type="tel" class="pp-phone-number ${!isEditing ? 'pp-input--disabled' : ''}" placeholder="Phone Number" value=${profileData.phoneNumber} disabled=${!isEditing} onInput=${(e) => handleInputChange('phoneNumber', e.target.value)} />
              </div>
            </div>
            <div class="pp-field-group">
              <label class="pp-label">Gender</label>
              <select class="pp-input pp-select ${!isEditing ? 'pp-input--disabled' : ''}" value=${profileData.gender} disabled=${!isEditing} onChange=${(e) => handleInputChange('gender', e.target.value)}>
                <option value="" disabled>Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div class="pp-field-row">
            <div class="pp-field-group">
              <label class="pp-label">Date of Birth</label>
              <input type="text" class="pp-input ${!isEditing ? 'pp-input--disabled' : ''}" placeholder="DD-MM-YYYY" value=${profileData.dob} disabled=${!isEditing} onInput=${(e) => handleInputChange('dob', e.target.value)} />
            </div>
          </div>

          <!-- SOCIAL PROFILES — placed between form fields and action buttons -->
          <div class="pp-divider" style="margin: 8px 0 16px;"></div>
          <${SocialProfiles}
            profileData=${profileData}
            isEditing=${isEditing}
            onInputChange=${handleInputChange}
          />

          <div class="pp-actions">
            ${!isEditing
              ? html`
                  <button class="pp-btn pp-btn--edit" type="button" onClick=${handleEdit}>
                    <${EditIcon} /><span>Edit Profile</span>
                  </button>
                  <button class="pp-btn pp-btn--save pp-btn--disabled" type="button" disabled>Save Changes</button>`
              : html`
                  <button class="pp-btn pp-btn--edit" type="button" onClick=${handleCancel}>Cancel</button>
                  <button class="pp-btn pp-btn--save" type="button" onClick=${handleSave}>Save Changes</button>`}
          </div>
        </div>

        <div class="pp-divider"></div>
        <${ActivityStats} />
      </div>
    </div>`;
}

// ============================================
// ROOT APP
// ============================================

function ProfileApp() {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => { setIsOpen(false); window.history.back(); };
  if (!isOpen) return null;
  return html`<${ProfilePopup} onClose=${handleClose} />`;
}

// ============================================
// AEM BLOCK DECORATOR
// ============================================

export default function decorate() {
  const mount = document.createElement('div');
  mount.id = 'profile-popup-root';
  document.body.appendChild(mount);
  render(html`<${ProfileApp} />`, mount);
}