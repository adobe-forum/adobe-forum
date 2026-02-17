import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

// ============================================
// ICON COMPONENTS
// ============================================

const PlusIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const BellIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
`;

const SettingsIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
`;

const UserIcon = () => html`
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color: var(--spectrum-gray-800);">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
`;

const EditIcon = () => html`
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

const CameraIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
`;

const CloseIcon = () => html`
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
`;

// ============================================
// PROFILE STORAGE HELPERS
// ============================================

const PROFILE_STORAGE_KEY = 'user-profile-data';

const loadProfileData = () => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load profile data:', e);
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
    console.error('Failed to save profile data:', e);
  }
};

// ============================================
// ACTIVITY STATS COMPONENT
// ============================================

const MOCK_POSTS = {
  popular: [
    {
      id: 1, title: 'Getting Started with JavaScript ES2024', category: 'JavaScript', likes: 38, comments: 9, views: 142,
    },
    {
      id: 2, title: 'CSS Grid vs Flexbox: The Ultimate Guide', category: 'CSS & Design', likes: 31, comments: 7, views: 118,
    },
    {
      id: 3, title: 'Docker for Frontend Developers', category: 'DevOps', likes: 24, comments: 5, views: 96,
    },
  ],
  recent: [
    {
      id: 4, title: 'Python Type Hints in 2025', category: 'Python', likes: 8, comments: 2, views: 34, date: '12 Feb 2026',
    },
    {
      id: 5, title: 'Building CLI Tools with Node.js', category: 'JavaScript', likes: 6, comments: 1, views: 27, date: '9 Feb 2026',
    },
    {
      id: 6, title: 'Kubernetes Helm Charts Deep Dive', category: 'DevOps', likes: 5, comments: 1, views: 21, date: '5 Feb 2026',
    },
  ],
  categories: [
    {
      name: 'JavaScript', posts: 7, likes: 94, comments: 21, views: 380,
    },
    {
      name: 'Python', posts: 5, likes: 61, comments: 14, views: 240,
    },
    {
      name: 'CSS & Design', posts: 4, likes: 48, comments: 10, views: 190,
    },
    {
      name: 'DevOps', posts: 3, likes: 37, comments: 8, views: 150,
    },
  ],
};

const HeartIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
`;

const CommentIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
  </svg>
`;

const EyeStatIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
`;

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
    </table>
  `;

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
    </table>
  `;

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
    </table>
  `;

  return html`
    <div class="pp-activity">
      <h2 class="pp-section-title">Post Activity</h2>

      <!-- Summary pills -->
      <div class="pp-summary-row">
        <div class="pp-summary-pill">
          <span class="pp-summary-num">19</span>
          <span class="pp-summary-lbl">Total Posts</span>
        </div>
        <div class="pp-summary-pill">
          <span class="pp-summary-num">240</span>
          <span class="pp-summary-lbl">Total Likes</span>
        </div>
        <div class="pp-summary-pill">
          <span class="pp-summary-num">53</span>
          <span class="pp-summary-lbl">Comments</span>
        </div>
        <div class="pp-summary-pill">
          <span class="pp-summary-num">960</span>
          <span class="pp-summary-lbl">Total Views</span>
        </div>
      </div>

      <!-- Tabs -->
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

      <!-- Table -->
      <div class="pp-table-wrap">
        ${activeTab === 'popular' ? renderPopular() : ''}
        ${activeTab === 'recent' ? renderRecent() : ''}
        ${activeTab === 'categories' ? renderCategories() : ''}
      </div>
    </div>
  `;
}

// ============================================
// PROFILE POPUP COMPONENT
// ============================================

function ProfilePopup({ onClose, onProfileImageChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(loadProfileData);
  const [savedData, setSavedData] = useState(loadProfileData);
  const fileInputRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleEdit = () => {
    setSavedData({ ...profileData });
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    saveProfileData(profileData);
  };

  const handleCancel = () => {
    setProfileData({ ...savedData });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        setProfileData((prev) => ({ ...prev, profileImage: imageData }));
        saveProfileData({ ...profileData, profileImage: imageData });
        if (onProfileImageChange) onProfileImageChange(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return html`
    <div class="pp-overlay" onClick=${handleOverlayClick}>
      <div class="pp-modal" ref=${popupRef}>

        <!-- Close button -->
        <button class="pp-close-btn" onClick=${onClose} type="button" aria-label="Close">
          <${CloseIcon} />
        </button>

        <!-- Avatar Section -->
        <div class="pp-avatar-section">
          <div class="pp-avatar-wrap">
            ${profileData.profileImage
    ? html`<img src=${profileData.profileImage} alt="Profile" class="pp-avatar-img" />`
    : html`<div class="pp-avatar-fallback"><${UserIcon} /></div>`
}
            <label class="pp-avatar-camera" title="Change photo">
              <${CameraIcon} />
              <input
                ref=${fileInputRef}
                type="file"
                accept="image/*"
                onChange=${handleImageUpload}
                style="display:none;"
              />
            </label>
          </div>
          ${(profileData.firstName || profileData.lastName) && html`
            <p class="pp-avatar-name">${profileData.firstName} ${profileData.lastName}</p>
          `}
        </div>

        <!-- Contact Details -->
        <div class="pp-section">
          <h2 class="pp-section-title">Profile Details</h2>

          <!-- Row 1: First Name / Last Name -->
          <div class="pp-field-row">
            <div class="pp-field-group">
              <label class="pp-label">First Name</label>
              <input
                type="text"
                class="pp-input ${!isEditing ? 'pp-input--disabled' : ''}"
                placeholder="First Name"
                value=${profileData.firstName}
                disabled=${!isEditing}
                onInput=${(e) => handleInputChange('firstName', e.target.value)}
              />
            </div>
            <div class="pp-field-group">
              <label class="pp-label">Last Name</label>
              <input
                type="text"
                class="pp-input ${!isEditing ? 'pp-input--disabled' : ''}"
                placeholder="Last Name"
                value=${profileData.lastName}
                disabled=${!isEditing}
                onInput=${(e) => handleInputChange('lastName', e.target.value)}
              />
            </div>
          </div>

          <!-- Row 2: Phone / Gender -->
          <div class="pp-field-row">
            <div class="pp-field-group">
              <label class="pp-label">Phone Number</label>
              <div class="pp-phone-wrap">
                <select
                  class="pp-phone-code ${!isEditing ? 'pp-input--disabled' : ''}"
                  value=${profileData.phoneCountry}
                  disabled=${!isEditing}
                  onChange=${(e) => handleInputChange('phoneCountry', e.target.value)}
                >
                  <option value="+91">IN +91</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                </select>
                <input
                  type="tel"
                  class="pp-phone-number ${!isEditing ? 'pp-input--disabled' : ''}"
                  placeholder="Phone Number"
                  value=${profileData.phoneNumber}
                  disabled=${!isEditing}
                  onInput=${(e) => handleInputChange('phoneNumber', e.target.value)}
                />
              </div>
            </div>
            <div class="pp-field-group">
              <label class="pp-label">Gender</label>
              <select
                class="pp-input pp-select ${!isEditing ? 'pp-input--disabled' : ''}"
                value=${profileData.gender}
                disabled=${!isEditing}
                onChange=${(e) => handleInputChange('gender', e.target.value)}
              >
                <option value="" disabled>Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <!-- Row 3: DOB -->
          <div class="pp-field-row">
            <div class="pp-field-group">
              <label class="pp-label">Date of Birth</label>
              <input
                type="text"
                class="pp-input ${!isEditing ? 'pp-input--disabled' : ''}"
                placeholder="DD-MM-YYYY"
                value=${profileData.dob}
                disabled=${!isEditing}
                onInput=${(e) => handleInputChange('dob', e.target.value)}
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pp-actions">
            ${!isEditing
    ? html`
                  <button class="pp-btn pp-btn--edit" type="button" onClick=${handleEdit}>
                    <${EditIcon} />
                    <span>Edit</span>
                  </button>
                  <button class="pp-btn pp-btn--save pp-btn--disabled" type="button" disabled>
                    Save Changes
                  </button>
                `
    : html`
                  <button class="pp-btn pp-btn--edit" type="button" onClick=${handleCancel}>
                    Cancel
                  </button>
                  <button class="pp-btn pp-btn--save" type="button" onClick=${handleSave}>
                    Save Changes
                  </button>
                `
}
          </div>
        </div>

        <!-- Activity Stats -->
        <div class="pp-divider"></div>
        <${ActivityStats} />

      </div>
    </div>

    <style>
      /* ============================================
         STVT CUSTOM PROPERTIES
         (override these per-project as needed)
      ============================================ */
      .pp-overlay {
        /* Brand accent — red */
        --stvt-color-accent:         var(--spectrum-red-1000,       #d31510);
        --stvt-color-accent-hover:   var(--spectrum-red-1100,       #b30e09);
        --stvt-color-accent-shadow:  var(--spectrum-red-200,        rgba(211, 21, 16, 0.15));

        /* Surface */
        --stvt-surface-primary:      var(--spectrum-gray-50,        #ffffff);
        --stvt-surface-subtle:       var(--spectrum-gray-100,       #f5f5f5);
        --stvt-surface-hover:        var(--spectrum-gray-75,        #f7f7f7);

        /* Borders */
        --stvt-border-default:       var(--spectrum-gray-300,       #d5d5d5);
        --stvt-border-subtle:        var(--spectrum-gray-200,       #e0e0e0);
        --stvt-border-divider:       var(--spectrum-gray-200,       #ebebeb);
        --stvt-border-hover:         var(--spectrum-gray-500,       #aaaaaa);

        /* Text */
        --stvt-text-primary:         var(--spectrum-gray-900,       #1a1a1a);
        --stvt-text-secondary:       var(--spectrum-gray-700,       #444444);
        --stvt-text-muted:           var(--spectrum-gray-600,       #555555);
        --stvt-text-placeholder:     var(--spectrum-gray-500,       #6e6e6e);
        --stvt-text-disabled:        var(--spectrum-gray-400,       #aaaaaa);
        --stvt-text-on-accent:       var(--spectrum-gray-50,        #ffffff);

        /* Input */
        --stvt-input-height:         var(--spectrum-component-height-200, 44px);
        --stvt-input-radius:         var(--spectrum-corner-radius-100,    8px);
        --stvt-input-font-size:      var(--spectrum-font-size-100,        14px);
        --stvt-input-padding-x:      var(--spectrum-spacing-300,          12px);

        /* Spacing */
        --stvt-space-xs:             var(--spectrum-spacing-100,   6px);
        --stvt-space-sm:             var(--spectrum-spacing-200,   8px);
        --stvt-space-md:             var(--spectrum-spacing-300,   12px);
        --stvt-space-lg:             var(--spectrum-spacing-400,   16px);
        --stvt-space-xl:             var(--spectrum-spacing-500,   20px);
        --stvt-space-2xl:            var(--spectrum-spacing-600,   24px);
        --stvt-space-3xl:            var(--spectrum-spacing-700,   28px);

        /* Z-index */
        --stvt-z-modal:              var(--spectrum-z-index-modal,  9999);

        /* Disabled btn */
        --stvt-btn-disabled-bg:      var(--spectrum-gray-200,       #e8e8e8);
      }

      /* ---- OVERLAY ---- */
      .pp-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--stvt-z-modal);
        backdrop-filter: blur(2px);
        animation: ppFadeIn 0.18s ease;
      }

      @keyframes ppFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      /* ---- MODAL ---- */
      .pp-modal {
        position: relative;
        background: var(--stvt-surface-primary);
        border-radius: var(--spectrum-corner-radius-200, 12px);
        width: 100%;
        max-width: 620px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--spectrum-drop-shadow-emphasized-x, 0) var(--spectrum-drop-shadow-emphasized-y, 20px) var(--spectrum-drop-shadow-emphasized-blur, 60px) var(--spectrum-drop-shadow-emphasized-color, rgba(0,0,0,0.18));
        padding: var(--stvt-space-3xl) 36px 36px;
        animation: ppSlideIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes ppSlideIn {
        from { transform: translateY(-20px) scale(0.97); opacity: 0; }
        to   { transform: translateY(0) scale(1); opacity: 1; }
      }

      /* ---- CLOSE BUTTON ---- */
      .pp-close-btn {
        position: absolute;
        top: var(--stvt-space-lg);
        right: var(--stvt-space-lg);
        background: none;
        border: none;
        cursor: pointer;
        padding: var(--stvt-space-xs);
        border-radius: var(--spectrum-corner-radius-75, 6px);
        color: var(--stvt-text-placeholder);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background var(--spectrum-animation-duration-100, 0.15s),
                    color    var(--spectrum-animation-duration-100, 0.15s);
        line-height: 0;
      }

      .pp-close-btn:hover {
        background: var(--stvt-surface-hover);
        color: var(--stvt-text-primary);
      }

      /* ---- AVATAR SECTION ---- */
      .pp-avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: var(--stvt-space-3xl);
        padding-bottom: var(--stvt-space-2xl);
        border-bottom: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-divider);
      }

      .pp-avatar-wrap {
        position: relative;
        width: 80px;
        height: 80px;
        margin-bottom: var(--spectrum-spacing-200, 10px);
      }

      .pp-avatar-img,
      .pp-avatar-fallback {
        width: 80px;
        height: 80px;
        border-radius: var(--spectrum-corner-radius-full, 50%);
        object-fit: cover;
        background: var(--stvt-surface-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        border: var(--spectrum-border-width-200, 3px) solid var(--stvt-border-subtle);
      }

      .pp-avatar-camera {
        position: absolute;
        bottom: 0;
        right: 0;
        background: var(--stvt-surface-primary);
        color: var(--stvt-text-secondary);
        border-radius: var(--spectrum-corner-radius-full, 50%);
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-default);
        transition: background  var(--spectrum-animation-duration-100, 0.15s),
                    color       var(--spectrum-animation-duration-100, 0.15s),
                    transform   var(--spectrum-animation-duration-100, 0.15s);
        line-height: 0;
      }

      .pp-avatar-camera:hover {
        background: var(--stvt-surface-hover);
        color: var(--stvt-text-primary);
        transform: scale(1.08);
      }

      .pp-avatar-name {
        font-size: var(--spectrum-font-size-200, 15px);
        font-weight: var(--spectrum-bold-font-weight, 600);
        color: var(--stvt-text-primary);
        margin: 0;
      }

      /* ---- SECTION TITLE ---- */
      .pp-section-title {
        font-size: var(--spectrum-font-size-300, 18px);
        font-weight: var(--spectrum-bold-font-weight, 700);
        color: var(--stvt-text-primary);
        margin: 0 0 var(--stvt-space-xl) 0;
        letter-spacing: -0.2px;
      }

      /* ---- FIELD ROWS ---- */
      .pp-field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--stvt-space-lg);
        margin-bottom: var(--stvt-space-lg);
      }

      .pp-field-group {
        display: flex;
        flex-direction: column;
        gap: var(--stvt-space-xs);
      }

      /* ---- LABELS ---- */
      .pp-label {
        font-size: var(--spectrum-font-size-75, 13px);
        font-weight: var(--spectrum-medium-font-weight, 500);
        color: var(--stvt-text-secondary);
        letter-spacing: 0.01em;
      }

      /* ---- INPUTS ---- */
      .pp-input,
      .pp-phone-wrap,
      .pp-phone-code,
      .pp-phone-number {
        height: var(--stvt-input-height) !important;
        box-sizing: border-box;
      }

      .pp-input {
        width: 100%;
        padding: 0 var(--stvt-input-padding-x);
        border: var(--spectrum-border-width-100, 1.5px) solid var(--stvt-border-default);
        border-radius: var(--stvt-input-radius);
        font-size: var(--stvt-input-font-size);
        color: var(--stvt-text-primary);
        background: var(--stvt-surface-primary);
        outline: none;
        transition: border-color var(--spectrum-animation-duration-100, 0.15s),
                    box-shadow  var(--spectrum-animation-duration-100, 0.15s),
                    background  var(--spectrum-animation-duration-100, 0.15s);
        box-sizing: border-box;
        appearance: none;
        -webkit-appearance: none;
      }

      .pp-input:focus {
        border-color: var(--stvt-color-accent);
        box-shadow: 0 0 0 3px var(--stvt-color-accent-shadow);
      }

      .pp-input--disabled,
      .pp-input:disabled,
      select.pp-input--disabled,
      select:disabled.pp-phone-code,
      input:disabled.pp-phone-number {
        background: var(--stvt-surface-subtle) !important;
        color: var(--stvt-text-muted) !important;
        border-color: var(--stvt-border-subtle) !important;
        cursor: default !important;
        pointer-events: none;
      }

      .pp-select {
        cursor: pointer;
        padding-right: var(--stvt-space-3xl);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right var(--stvt-space-md) center;
      }

      /* ---- PHONE INPUT ---- */
      .pp-phone-wrap {
        display: flex;
        align-items: stretch;
        gap: 0;
      }

      .pp-phone-code {
        padding: 0 var(--stvt-space-sm);
        border: var(--spectrum-border-width-100, 1.5px) solid var(--stvt-border-default);
        border-right: none;
        border-radius: var(--stvt-input-radius) 0 0 var(--stvt-input-radius);
        font-size: var(--spectrum-font-size-75, 13px);
        color: var(--stvt-text-primary);
        background: var(--stvt-surface-primary);
        outline: none;
        cursor: pointer;
        min-width: 80px;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right var(--stvt-space-xs) center;
        padding-right: var(--stvt-space-xl);
        transition: border-color var(--spectrum-animation-duration-100, 0.15s),
                    background  var(--spectrum-animation-duration-100, 0.15s);
      }

      .pp-phone-code:focus {
        border-color: var(--stvt-color-accent);
        z-index: 1;
      }

      .pp-phone-number {
        flex: 1;
        padding: 0 var(--stvt-input-padding-x);
        border: var(--spectrum-border-width-100, 1.5px) solid var(--stvt-border-default);
        border-radius: 0 var(--stvt-input-radius) var(--stvt-input-radius) 0;
        font-size: var(--stvt-input-font-size);
        color: var(--stvt-text-primary);
        background: var(--stvt-surface-primary);
        outline: none;
        transition: border-color var(--spectrum-animation-duration-100, 0.15s),
                    box-shadow  var(--spectrum-animation-duration-100, 0.15s),
                    background  var(--spectrum-animation-duration-100, 0.15s);
      }

      .pp-phone-number:focus {
        border-color: var(--stvt-color-accent);
        box-shadow: 0 0 0 3px var(--stvt-color-accent-shadow);
      }

      /* ---- ACTION BUTTONS ---- */
      .pp-actions {
        display: flex;
        gap: var(--stvt-space-md);
        margin-top: var(--stvt-space-2xl);
        align-items: center;
      }

      .pp-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--stvt-space-xs);
        height: var(--spectrum-component-height-100, 40px);
        padding: 0 var(--spectrum-spacing-500, 22px);
        border-radius: var(--spectrum-corner-radius-full, 100px);
        font-size: var(--stvt-input-font-size);
        font-weight: var(--spectrum-medium-font-weight, 500);
        cursor: pointer;
        transition: all var(--spectrum-animation-duration-100, 0.15s) ease;
        border: none;
        line-height: 1;
      }

      .pp-btn--edit {
        background: transparent;
        border: var(--spectrum-border-width-100, 1.5px) solid var(--stvt-border-hover);
        color: var(--stvt-text-primary);
      }

      .pp-btn--edit:hover {
        border-color: var(--stvt-border-hover);
        background: var(--stvt-surface-hover);
      }

      .pp-btn--save {
        background: var(--stvt-color-accent);
        color: var(--stvt-text-on-accent);
        border: var(--spectrum-border-width-100, 1.5px) solid transparent;
      }

      .pp-btn--save:hover:not(:disabled):not(.pp-btn--disabled) {
        background: var(--stvt-color-accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--stvt-color-accent-shadow);
      }

      .pp-btn--disabled,
      .pp-btn:disabled {
        background: var(--stvt-btn-disabled-bg) !important;
        color: var(--stvt-text-disabled) !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
        border-color: transparent !important;
      }

      /* ---- DIVIDER ---- */
      .pp-divider {
        height: var(--spectrum-border-width-100, 1px);
        background: var(--stvt-border-divider);
        margin: var(--stvt-space-2xl) 0;
      }

      /* ---- ACTIVITY SECTION ---- */
      .pp-activity {
        padding-bottom: var(--stvt-space-lg);
      }

      /* ---- SUMMARY PILLS ---- */
      .pp-summary-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--stvt-space-md);
        margin-bottom: var(--stvt-space-xl);
      }

      .pp-summary-pill {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--stvt-space-sm) var(--stvt-space-xs);
        background: var(--stvt-surface-subtle);
        border-radius: var(--stvt-input-radius);
        border: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-subtle);
      }

      .pp-summary-num {
        font-size: var(--spectrum-font-size-200, 14px);
        font-weight: var(--spectrum-bold-font-weight, 700);
        color: var(--stvt-text-primary);
        line-height: 1;
      }

      .pp-summary-lbl {
        font-size: var(--spectrum-font-size-50, 10px);
        color: var(--stvt-text-placeholder);
        text-align: center;
        white-space: nowrap;
      }

      /* ---- TABS ---- */
      .pp-tabs {
        display: flex;
        gap: 0;
        border-bottom: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-divider);
        margin-bottom: var(--stvt-space-lg);
      }

      .pp-tab {
        padding: var(--stvt-space-sm) var(--stvt-space-lg);
        font-size: var(--spectrum-font-size-75, 13px);
        font-weight: var(--spectrum-medium-font-weight, 500);
        color: var(--stvt-text-placeholder);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        margin-bottom: -1px;
        transition: color var(--spectrum-animation-duration-100, 0.15s),
                    border-color var(--spectrum-animation-duration-100, 0.15s);
        white-space: nowrap;
      }

      .pp-tab:hover {
        color: var(--stvt-text-on-accent);
        background: var(--stvt-color-accent);
        border-radius: var(--spectrum-corner-radius-75, 6px) var(--spectrum-corner-radius-75, 6px) 0 0;
      }

      .pp-tab--active {
        color: var(--stvt-text-on-accent);
        background: var(--stvt-color-accent);
        border-bottom-color: var(--stvt-color-accent);
        border-radius: var(--spectrum-corner-radius-75, 6px) var(--spectrum-corner-radius-75, 6px) 0 0;
      }

      /* ---- TABLE ---- */
      .pp-table-wrap {
        overflow-x: auto;
      }

      .pp-stats-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--spectrum-font-size-75, 13px);
      }

      .pp-th {
        padding: var(--stvt-space-xs) var(--stvt-space-md);
        text-align: left;
        font-size: var(--spectrum-font-size-50, 11px);
        font-weight: var(--spectrum-bold-font-weight, 600);
        color: var(--stvt-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-bottom: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-divider);
        white-space: nowrap;
      }

      .pp-th--title { width: 40%; }
      .pp-th--num   { text-align: center; }

      .pp-tr {
        border-bottom: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-divider);
        transition: background var(--spectrum-animation-duration-100, 0.12s);
      }

      .pp-tr:last-child { border-bottom: none; }

      .pp-tr:hover { background: var(--stvt-surface-subtle); }

      .pp-td {
        padding: var(--stvt-space-md) var(--stvt-space-md);
        color: var(--stvt-text-primary);
        vertical-align: middle;
      }

      .pp-td--title {
        display: flex;
        align-items: center;
        gap: var(--stvt-space-sm);
        max-width: 220px;
      }

      .pp-td--num {
        text-align: center;
        color: var(--stvt-text-secondary);
        font-variant-numeric: tabular-nums;
      }

      .pp-td--bold { font-weight: var(--spectrum-bold-font-weight, 700); }

      .pp-td--date {
        color: var(--stvt-text-placeholder);
        white-space: nowrap;
        font-size: var(--spectrum-font-size-50, 11px);
      }

      .pp-rank {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: var(--spectrum-corner-radius-full, 50%);
        background: var(--stvt-color-accent);
        color: var(--stvt-text-on-accent);
        font-size: 10px;
        font-weight: var(--spectrum-bold-font-weight, 700);
        flex-shrink: 0;
      }

      .pp-post-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
        color: var(--stvt-text-primary);
        font-weight: var(--spectrum-medium-font-weight, 500);
      }

      .pp-tag {
        display: inline-block;
        padding: 2px var(--stvt-space-sm);
        background: var(--stvt-surface-subtle);
        border: var(--spectrum-border-width-100, 1px) solid var(--stvt-border-subtle);
        border-radius: 100px;
        font-size: var(--spectrum-font-size-50, 11px);
        color: var(--stvt-text-secondary);
        white-space: nowrap;
      }

      .pp-cat-dot {
        width: 8px;
        height: 8px;
        border-radius: var(--spectrum-corner-radius-full, 50%);
        background: var(--stvt-color-accent);
        flex-shrink: 0;
      }

      /* ---- RESPONSIVE ---- */
      @media (max-width: 600px) {
        .pp-modal {
          margin: var(--stvt-space-lg);
          padding: var(--stvt-space-2xl) var(--stvt-space-xl) var(--stvt-space-3xl);
          max-height: 95vh;
        }

        .pp-field-row {
          grid-template-columns: 1fr;
        }

        .pp-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .pp-btn {
          justify-content: center;
        }

        .pp-summary-row {
          grid-template-columns: repeat(2, 1fr);
        }

        .pp-tabs {
          overflow-x: auto;
        }
      }
    </style>
  `;
}

// ============================================
// SIDEBAR COMPONENTS
// ============================================

const toId = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const STORAGE_KEY = 'sidebar-categories';

const initialCategoryData = [
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '📁',
    subcategories: [],
  },
  {
    id: 'python',
    name: 'Python',
    icon: '📁',
    subcategories: [],
  },
  {
    id: 'css-design',
    name: 'CSS & Design',
    icon: '📁',
    subcategories: [],
  },
  {
    id: 'devops',
    name: 'DevOps',
    icon: '📁',
    subcategories: [],
  },
];

// Load categories from localStorage
const loadCategories = (authoredCategories) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Return stored categories if they exist and are valid
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load categories from localStorage:', e);
  }
  // Fall back to authored or initial data
  return authoredCategories && authoredCategories.length > 0
    ? authoredCategories
    : initialCategoryData;
};

// Save categories to localStorage
const saveCategories = (categories) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save categories to localStorage:', e);
  }
};

// Recursive TreeItem component for nested structure
function TreeItem({
  item, activeItem, onItemClick, level = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = item.children && item.children.length > 0;
  const isFolder = item.isFolder || hasChildren;

  const handleClick = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    }
    if (item.postId) {
      // eslint-disable-next-line no-underscore-dangle
      onItemClick(item._id, item.postId._id || item.postId);
    }
  };

  return html`
    <li class="tree-item ${isFolder ? 'is-folder' : 'is-file'}" style="--indent-level: ${level}">
      <div
        class="tree-item-content ${/* eslint-disable-line no-underscore-dangle */ activeItem === item._id ? 'active' : ''}"
        onClick=${handleClick}
      >
        ${isFolder && html`
          <span class="tree-toggle ${isExpanded ? 'expanded' : ''}">▶</span>
        `}
        <span class="tree-icon">${isFolder ? '📁' : (item.icon || '📄')}</span>
        <span class="tree-label">${item.title}</span>
      </div>
      ${isFolder && isExpanded && hasChildren && html`
        <ul class="tree-children">
          ${item.children.map((child) => html`
            <${TreeItem}
              key=${/* eslint-disable-line no-underscore-dangle */ child._id}
              item=${child}
              activeItem=${activeItem}
              onItemClick=${onItemClick}
              level=${level + 1}
            />
          `)}
        </ul>
      `}
    </li>
  `;
}

function CategoryItem({ category, activeSubcategory, onSubcategoryClick }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // Handle tree items (items with children property)
  const hasTreeItems = category.items && category.items.length > 0;

  return html`
    <li class="category-item ${isCollapsed ? 'collapsed' : ''}">
      <div class="category-header" onClick=${toggleCollapse}>
        <span class="category-toggle">▼</span>
        <span class="category-icon">${category.icon || '📁'}</span>
        <span class="category-name">${category.name}</span>
      </div>
      ${hasTreeItems ? html`
        <ul class="tree-list">
          ${category.items.map((item) => html`
            <${TreeItem}
              key=${/* eslint-disable-line no-underscore-dangle */ item._id}
              item=${item}
              activeItem=${activeSubcategory}
              onItemClick=${(itemId, postId) => onSubcategoryClick(category.id, itemId, postId)}
              level=${0}
            />
          `)}
        </ul>
      ` : html`
        <ul class="subcategory-list">
          ${category.subcategories && category.subcategories.length > 0
    ? category.subcategories.map((sub) => html`
                <li 
                  key=${sub.id}
                  class="subcategory-item ${activeSubcategory === sub.id ? 'active' : ''}"
                  onClick=${() => onSubcategoryClick(category.id, sub.id, sub.postId)}
                >
                  <span class="subcategory-icon">${sub.icon || '📄'}</span>
                  <span>${sub.name}</span>
                </li>
              `)
    : html`<div class="no-items">No pages yet</div>`
}
        </ul>
      `}
    </li>
  `;
}

function Sidebar({ authoredCategories }) {
  // --- State ---
  const [categories, setCategories] = useState(() => loadCategories(authoredCategories));
  // eslint-disable-next-line no-unused-vars
  const [_sidebarItems, setSidebarItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState(null);

  // New Category Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creationError, setCreationError] = useState('');

  const inputRef = useRef(null);

  // --- Effects ---
  // Fetch sidebar items from API
  useEffect(() => {
    const fetchSidebarItems = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/sidebar-items');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.items) {
            setSidebarItems(data.items);

            // Group tree items by category
            const categoryMap = new Map();

            // Start with existing categories
            categories.forEach((cat) => {
              categoryMap.set(cat.id, { ...cat, subcategories: [], items: [] });
            });

            // Process tree items (root level items without parentId)
            data.items.forEach((item) => {
              const catId = toId(item.category);
              if (!categoryMap.has(catId)) {
                categoryMap.set(catId, {
                  id: catId,
                  name: item.category,
                  icon: '📁',
                  subcategories: [],
                  items: [],
                });
              }

              const category = categoryMap.get(catId);
              // Add to items array for tree rendering
              category.items.push(item);

              // Also add flat subcategories for backwards compatibility
              if (!item.isFolder && item.postId) {
                /* eslint-disable no-underscore-dangle */
                category.subcategories.push({
                  id: item._id,
                  name: item.title,
                  icon: item.icon || '📄',
                  postId: item.postId._id || item.postId,
                });
                /* eslint-enable no-underscore-dangle */
              }
            });

            // Update categories state
            const updatedCategories = Array.from(categoryMap.values());
            setCategories(updatedCategories);
            saveCategories(updatedCategories);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch sidebar items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarItems();

    // Listen for refresh-sidebar events
    const handleRefresh = () => {
      setLoading(true);
      fetchSidebarItems();
    };

    window.addEventListener('refresh-sidebar', handleRefresh);

    return () => {
      window.removeEventListener('refresh-sidebar', handleRefresh);
    };
  }, []);

  // Focus input when creation mode starts
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Save to localStorage whenever categories change
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  // --- Handlers ---
  const handleSearch = (e) => setSearchTerm(e.target.value.toLowerCase());

  const handleSubcategoryClick = (categoryId, subcategoryId, postId) => {
    setActiveSubcategory(subcategoryId);

    // Trigger custom event to load post in forum-post block
    const event = new CustomEvent('load-forum-post', {
      detail: { postId, sidebarItemId: subcategoryId },
    });
    window.dispatchEvent(event);
  };

  const startCreating = () => {
    setIsCreating(true);
    setNewCatName('');
    setCreationError('');
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setNewCatName('');
    setCreationError('');
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelCreating();
    } else if (e.key === 'Enter') {
      const trimmedName = newCatName.trim();
      if (!trimmedName) {
        setCreationError('Name cannot be empty');
        return;
      }

      // Duplicate Check (Case-insensitive)
      const exists = categories.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (exists) {
        setCreationError('Category already exists');
        return;
      }

      // Add Category
      const newCategory = {
        id: toId(trimmedName),
        name: trimmedName,
        icon: '📁',
        subcategories: [],
      };

      setCategories([newCategory, ...categories]);
      cancelCreating();
    }
  };

  const handleCreateInput = (e) => {
    setNewCatName(e.target.value);
    if (creationError) setCreationError(''); // Clear error while typing
  };

  // --- Filtering Logic ---
  const filteredCategories = categories.map((category) => {
    if (searchTerm === '') return category;
    const categoryMatches = category.name.toLowerCase().includes(searchTerm);
    // Fix: Broken into multiple lines to satisfy max-len rule
    const filteredSubs = category.subcategories.filter((sub) => (
      sub.name.toLowerCase().includes(searchTerm)
    ));

    if (categoryMatches || filteredSubs.length > 0) {
      return {
        ...category,
        subcategories: filteredSubs.length > 0 ? filteredSubs : category.subcategories,
      };
    }
    return null;
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

  return html`
    <div class="sidebar">
      <div class="search-container">
        <input type="text" placeholder="Search..." value=${searchTerm} onInput=${handleSearch} />
      </div>

      <div class="explorer-header">
        <h3>EXPLORER</h3>
        <button class="add-category" title="Add Category" onClick=${startCreating}>
          <${PlusIcon} />
        </button>
      </div>

      ${isCreating && html`
        <div class="new-category-form">
          <input 
            ref=${inputRef}
            type="text" 
            class="new-category-input ${creationError ? 'error' : ''}"
            placeholder="Add category"
            value=${newCatName}
            onKeyDown=${handleCreateKeyDown}
            onInput=${handleCreateInput}
            onBlur=${cancelCreating} 
          />
          ${creationError && html`<div class="error-msg">${creationError}</div>`}
        </div>
      `}

      ${loading && html`<div class="loading">Loading...</div>`}

      <ul class="category-list">
        ${filteredCategories.length > 0
    ? filteredCategories.map((category) => html`
              <${CategoryItem}
                key=${category.id}
                category=${category}
                activeSubcategory=${activeSubcategory}
                onSubcategoryClick=${handleSubcategoryClick}
              />
            `)
    : html`<div class="no-results">No match found</div>`
}
      </ul>
    </div>
  `;
}

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderComponent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [profileImage, setProfileImage] = useState(() => {
    const profileData = loadProfileData();
    return profileData.profileImage;
  });

  const toggleMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    // Toggle sidebar visibility on mobile
    const sidebarWrapper = document.querySelector('.sidebar-wrapper');
    if (sidebarWrapper) {
      sidebarWrapper.classList.toggle('mobile-open', newState);
    }
  };

  const handleProfileImageError = () => {
    setProfileImageError(true);
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    setShowProfilePopup(true);
  };

  const handleClosePopup = () => {
    setShowProfilePopup(false);
  };

  const handleProfileImageChange = (newImage) => {
    setProfileImage(newImage);
    setProfileImageError(false);
  };

  return html`
    <nav class="spectrum-nav">
      <div class="nav-hamburger ${isMobileMenuOpen ? 'is-open' : ''}">
        <button type="button" onClick=${toggleMenu} aria-label="Toggle Sidebar">
          <span class="nav-hamburger-icon"></span>
        </button>
      </div>

      <div class="nav-brand-section">
        <a href="/" class="nav-brand">
          <img
            src="/icons/logo.svg"
            alt="Adobe Logo"
            onError=${(e) => {
    if (e.target.src.endsWith('.svg')) {
      e.target.src = '/icons/logo.png';
    }
  }}
          />
        </a>

        <a href="/create-post" class="nav-button spectrum-button">
          <${PlusIcon} />
          <span>Add Post</span>
        </a>
      </div>

      <div class="nav-tools">
        <ul>
          <li style="display:none;">
            <a href="/bell" class="spectrum-action-button" aria-label="Notifications">
              <${BellIcon} />
            </a>
          </li>
          
          <li style="display:none;">
            <a href="/settings" class="spectrum-action-button" aria-label="Settings">
              <${SettingsIcon} />
            </a>
          </li>
          
          <li class="profile-item">
            <a href="#" class="profile-link" onClick=${handleProfileClick} aria-label="Profile">
              <div class="profile-avatar">
                ${profileImage && !profileImageError
    ? html`<img src=${profileImage} alt="Profile" onError=${handleProfileImageError} />`
    : html`<${UserIcon} />`
}
              </div>
            </a>
          </li>
        </ul>
      </div>

      ${showProfilePopup && html`
        <${ProfilePopup}
          onClose=${handleClosePopup}
          onProfileImageChange=${handleProfileImageChange}
        />
      `}
    </nav>
  `;
}

// ============================================
// AEM BLOCK DECORATOR
// ============================================

export default async function decorate(block) {
  const authoredCategories = [];
  const ul = block.querySelector('ul');
  if (ul) {
    ul.querySelectorAll(':scope > li').forEach((li) => {
      const categoryName = li.childNodes[0].textContent.trim();
      const subList = li.querySelector('ul');
      const subcategories = [];
      if (subList) {
        subList.querySelectorAll('li').forEach((subLi) => {
          const name = subLi.textContent.trim();
          subcategories.push({ id: toId(name), name, icon: '📄' });
        });
      }
      authoredCategories.push({
        id: toId(categoryName), name: categoryName, icon: '📁', subcategories,
      });
    });
  }

  block.textContent = '';
  const headerWrapper = document.createElement('div');
  headerWrapper.className = 'header-wrapper';
  const sidebarWrapper = document.createElement('div');
  sidebarWrapper.className = 'sidebar-wrapper';

  block.append(headerWrapper);
  block.append(sidebarWrapper);

  try {
    render(html`<${HeaderComponent} />`, headerWrapper);
    render(html`<${Sidebar} authoredCategories=${authoredCategories} />`, sidebarWrapper);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Render error:', err);
  }

  try {
    const resp = await fetch('/footer.plain.html');
    if (resp.ok) {
      // Fix: Renamed variable from 'html' to 'footerHtml' to avoid shadowing
      const footerHtml = await resp.text();
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
