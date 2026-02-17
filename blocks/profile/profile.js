import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect, useCallback } from '../../vendor/preact-hooks.js';

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

// ============================================
// PROFILE STORAGE HELPERS
// ============================================

const PROFILE_STORAGE_KEY = 'user-profile-data';

const loadProfileData = () => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    // ignore
  }
  return {
    firstName: '',
    lastName: '',
    phoneCountry: '+91',
    phoneNumber: '',
    gender: '',
    dob: '',
    profileImage: null,
  };
};

const saveProfileData = (data) => {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
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
// Pure canvas-based, no external dependencies.
// ============================================

function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(new Image());
  const CANVAS_SIZE = 280;

  // Load image and fit it initially
  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => {
      const fitScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas whenever scale/offset changes
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

    // Dark overlay outside circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circle border
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [scale, offset, imageSrc]);

  const handleMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [dragging]);

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
  };

  const handleTouchMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
  }, [dragging]);

  const handleWheel = (e) => {
    e.preventDefault();
    setScale((s) => Math.min(5, Math.max(0.3, s - e.deltaY * 0.001)));
  };

  const handleCrop = () => {
    const out = document.createElement('canvas');
    out.width = 200;
    out.height = 200;
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
          onMouseDown=${handleMouseDown}
          onMouseMove=${handleMouseMove}
          onMouseUp=${handleMouseUp}
          onMouseLeave=${handleMouseUp}
          onTouchStart=${handleTouchStart}
          onTouchMove=${handleTouchMove}
          onTouchEnd=${handleMouseUp}
          onWheel=${handleWheel}
          style="cursor:${dragging ? 'grabbing' : 'grab'}"
        >
          <canvas ref=${canvasRef} width=${CANVAS_SIZE} height=${CANVAS_SIZE} class="pp-crop-canvas" />
        </div>

        <div class="pp-crop-zoom-row">
          <button class="pp-crop-zoom-btn" type="button" onClick=${() => setScale((s) => Math.max(0.3, s - 0.1))}><${ZoomOutIcon} /></button>
          <input
            type="range" min="30" max="500" step="1"
            value=${Math.round(scale * 100)}
            class="pp-crop-slider"
            onInput=${(e) => setScale(Number(e.target.value) / 100)}
          />
          <button class="pp-crop-zoom-btn" type="button" onClick=${() => setScale((s) => Math.min(5, s + 0.1))}><${ZoomInIcon} /></button>
          <span class="pp-crop-zoom-lbl">${Math.round(scale * 100)}%</span>
        </div>

        <div class="pp-crop-actions">
          <button class="pp-btn pp-btn--edit" type="button" onClick=${onCancel}>Cancel</button>
          <button class="pp-btn pp-btn--save" type="button" onClick=${handleCrop}>Apply Crop</button>
        </div>
      </div>
    </div>
  `;
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
      <thead>
        <tr>
          <th class="pp-th pp-th--title">Post</th>
          <th class="pp-th">Category</th>
          <th class="pp-th pp-th--num"><${HeartIcon} /></th>
          <th class="pp-th pp-th--num"><${CommentIcon} /></th>
          <th class="pp-th pp-th--num"><${EyeStatIcon} /></th>
        </tr>
      </thead>
      <tbody>
        ${MOCK_POSTS.popular.map((p, i) => html`
          <tr key=${p.id} class="pp-tr">
            <td class="pp-td pp-td--title">
              <span class="pp-rank">${i + 1}</span>
              <span class="pp-post-title">${p.title}</span>
            </td>
            <td class="pp-td"><span class="pp-tag">${p.category}</span></td>
            <td class="pp-td pp-td--num">${formatNum(p.likes)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.comments)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.views)}</td>
          </tr>
        `)}
      </tbody>
    </table>`;

  const renderRecent = () => html`
    <table class="pp-stats-table">
      <thead>
        <tr>
          <th class="pp-th pp-th--title">Post</th>
          <th class="pp-th">Category</th>
          <th class="pp-th">Date</th>
          <th class="pp-th pp-th--num"><${HeartIcon} /></th>
          <th class="pp-th pp-th--num"><${CommentIcon} /></th>
          <th class="pp-th pp-th--num"><${EyeStatIcon} /></th>
        </tr>
      </thead>
      <tbody>
        ${MOCK_POSTS.recent.map((p) => html`
          <tr key=${p.id} class="pp-tr">
            <td class="pp-td pp-td--title"><span class="pp-post-title">${p.title}</span></td>
            <td class="pp-td"><span class="pp-tag">${p.category}</span></td>
            <td class="pp-td pp-td--date">${p.date}</td>
            <td class="pp-td pp-td--num">${formatNum(p.likes)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.comments)}</td>
            <td class="pp-td pp-td--num">${formatNum(p.views)}</td>
          </tr>
        `)}
      </tbody>
    </table>`;

  const renderCategories = () => html`
    <table class="pp-stats-table">
      <thead>
        <tr>
          <th class="pp-th pp-th--title">Category</th>
          <th class="pp-th pp-th--num">Posts</th>
          <th class="pp-th pp-th--num"><${HeartIcon} /></th>
          <th class="pp-th pp-th--num"><${CommentIcon} /></th>
          <th class="pp-th pp-th--num"><${EyeStatIcon} /></th>
        </tr>
      </thead>
      <tbody>
        ${MOCK_POSTS.categories.map((c) => html`
          <tr key=${c.name} class="pp-tr">
            <td class="pp-td pp-td--title">
              <span class="pp-cat-dot"></span>
              <span class="pp-post-title">${c.name}</span>
            </td>
            <td class="pp-td pp-td--num pp-td--bold">${c.posts}</td>
            <td class="pp-td pp-td--num">${formatNum(c.likes)}</td>
            <td class="pp-td pp-td--num">${formatNum(c.comments)}</td>
            <td class="pp-td pp-td--num">${formatNum(c.views)}</td>
          </tr>
        `)}
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
          <button
            key=${t.id}
            class="pp-tab ${activeTab === t.id ? 'pp-tab--active' : ''}"
            type="button"
            onClick=${() => setActiveTab(t.id)}
          >${t.label}</button>
        `)}
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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !cropSrc) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, cropSrc]);

  const handleEdit = () => { setSavedData({ ...profileData }); setIsEditing(true); };
  const handleSave = () => { setIsEditing(false); saveProfileData(profileData); };
  const handleCancel = () => { setProfileData({ ...savedData }); setIsEditing(false); };
  const handleInputChange = (field, value) => setProfileData((prev) => ({ ...prev, [field]: value }));

  // Step 1 — pick file → open cropper
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Step 2 — cropper returns final cropped image
  const handleCropDone = (croppedDataUrl) => {
    setCropSrc(null);
    setProfileData((prev) => ({ ...prev, profileImage: croppedDataUrl }));
    saveProfileData({ ...profileData, profileImage: croppedDataUrl });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return html`
    ${cropSrc && html`
      <${ImageCropper}
        imageSrc=${cropSrc}
        onCrop=${handleCropDone}
        onCancel=${() => setCropSrc(null)}
      />`}

    <div class="pp-overlay" onClick=${handleOverlayClick}>
      <div class="pp-modal">
        <button class="pp-close-btn" onClick=${onClose} type="button" aria-label="Close">
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

          <div class="pp-actions">
            ${!isEditing
              ? html`
                  <button class="pp-btn pp-btn--edit" type="button" onClick=${handleEdit}>
                    <${EditIcon} />
                    <span>Edit</span>
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