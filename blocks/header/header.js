import { html, render } from '../../vendor/htm-preact.js';
import { useState, useEffect, useRef } from '../../vendor/preact-hooks.js';

// ============================================
// ICON COMPONENTS
// ============================================

const PlusIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const ImagePlusIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
    <line x1="16" y1="8" x2="16" y2="14"/>
    <line x1="13" y1="11" x2="19" y2="11"/>
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

const CameraIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

const GearIcon = () => html`
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color: var(--spectrum-gray-700);">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
`;

const EditPencilIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

const ChevronDownIcon = () => html`
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
`;

const EyeIcon = () => html`
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
`;

const EditIcon = () => html`
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

// ============================================
// PROFILE SETTINGS POPUP COMPONENT
// ============================================

function ProfileSettingsPopup({ isOpen, onClose, anchorRef }) {
  const popupRef = useRef(null);
  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState('/icons/profile.png');
  const [showPassword, setShowPassword] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneCode: '+91',
    phoneNumber: '',
    address: '',
    gender: '',
    dob: '',
    email: '',
    password: ''
  });

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && 
          anchorRef.current && !anchorRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = () => {
    // Save logic here
    setIsEditMode(false);
    onClose();
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordChangeClick = () => {
    setShowPasswordChangeModal(true);
  };

  const closePasswordChangeModal = () => {
    setShowPasswordChangeModal(false);
  };

  const displayPassword = showPassword ? formData.password : '•'.repeat(formData.password.length);

  return html`
    <div class="profile-popup-overlay">
      <div class="profile-popup" ref=${popupRef}>
        <!-- Profile Avatar Section -->
        <div class="profile-popup-header">
          <div class="profile-popup-avatar">
            <img src=${profileImage} alt="Profile" />
          </div>
          <button class="profile-edit-link" onClick=${triggerFileInput} type="button">
            <${EditPencilIcon} />
            <span>Edit Profile Picture</span>
          </button>
          <input 
            ref=${fileInputRef}
            type="file" 
            accept="image/*" 
            onChange=${handleImageUpload}
            style="display: none;"
          />
        </div>

        <!-- Contact Details Section -->
        <div class="profile-popup-section">
          <h2 class="profile-section-title">Contact Details</h2>
          
          <div class="profile-form-grid">
            <div class="profile-form-group">
              <input 
                type="text" 
                class="profile-input"
                placeholder="First Name"
                value=${formData.firstName}
                onChange=${(e) => handleInputChange('firstName', e.target.value)}
                disabled=${!isEditMode}
              />
            </div>

            <div class="profile-form-group">
              <input 
                type="text" 
                class="profile-input"
                placeholder="Last Name"
                value=${formData.lastName}
                onChange=${(e) => handleInputChange('lastName', e.target.value)}
                disabled=${!isEditMode}
              />
            </div>
          </div>

          <div class="profile-form-grid">
            <div class="profile-form-group">
              <div class="profile-phone-input">
                <select 
                  class="profile-phone-code"
                  value=${formData.phoneCode}
                  onChange=${(e) => handleInputChange('phoneCode', e.target.value)}
                  disabled=${!isEditMode}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
                <input 
                  type="text" 
                  class="profile-input profile-phone-number"
                  placeholder="Phone Number"
                  value=${formData.phoneNumber}
                  onChange=${(e) => handleInputChange('phoneNumber', e.target.value)}
                  disabled=${!isEditMode}
                />
              </div>
            </div>

            <div class="profile-form-group">
              <select 
                class="profile-select"
                value=${formData.gender}
                onChange=${(e) => handleInputChange('gender', e.target.value)}
                disabled=${!isEditMode}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div class="profile-form-grid">
            <div class="profile-form-group">
              <input 
                type="date" 
                class="profile-input"
                placeholder="Date of Birth"
                value=${formData.dob}
                onChange=${(e) => handleInputChange('dob', e.target.value)}
                disabled=${!isEditMode}
              />
            </div>
          </div>

          <div class="profile-buttons-group">
            <button class="profile-edit-button" onClick=${handleEditToggle} type="button">
              <${EditPencilIcon} />
              <span>${isEditMode ? 'Cancel' : 'Edit'}</span>
            </button>
            <button class="profile-save-button" onClick=${handleSaveChanges} disabled=${!isEditMode}>
              Save Changes
            </button>
          </div>
        </div>

        <!-- Account Overview Section -->
        <div class="profile-popup-section">
          <h2 class="profile-section-title">Account Overview</h2>

          <div class="profile-table">
            <div class="profile-table-header">
              <div class="profile-table-cell">Account</div>
              <div class="profile-table-cell">Email</div>
              <div class="profile-table-cell">Password</div>
              <div class="profile-table-cell">View</div>
              <div class="profile-table-cell">Edit</div>
            </div>
            
            <div class="profile-table-row">
              <div class="profile-table-cell profile-table-label">Credentials</div>
              <div class="profile-table-cell profile-email-cell">${formData.email || '-'}</div>
              <div class="profile-table-cell profile-password-cell">${displayPassword || '-'}</div>
              <div class="profile-table-cell">
                <button 
                  class="profile-action-button" 
                  onClick=${togglePasswordVisibility}
                  aria-label=${showPassword ? "Hide Password" : "View Password"}
                  type="button"
                >
                  <${EyeIcon} />
                </button>
              </div>
              <div class="profile-table-cell">
                <a href="/account/edit" class="profile-action-button profile-action-link" aria-label="Edit Account">
                  <${EditIcon} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderComponent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const profileButtonRef = useRef(null);

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
          <${ImagePlusIcon} />
          <span>Add Post</span>
        </a>
      </div>

      <div class="nav-tools">
        <ul>
          <li>
            <a href="/bell" class="spectrum-action-button" aria-label="Notifications">
              <${BellIcon} />
            </a>
          </li>
          
          <li>
            <a href="/settings" class="spectrum-action-button" aria-label="Settings">
              <${SettingsIcon} />
            </a>
          </li>
          
          <li class="profile-item">
            <button 
              ref=${profileButtonRef}
              class="profile-link profile-button" 
              onClick=${toggleProfilePopup}
              aria-label="Profile"
            >
              <div class="profile-avatar">
                ${!profileImageError
                  ? html`<img 
                      src="/icons/profile.png" 
                      alt="Profile" 
                      onError=${handleProfileImageError}
                    />`
                  : html`<${UserIcon} />`
                }
              </div>
            </button>
          </li>
        </ul>
      </div>

      <${ProfileSettingsPopup} 
        isOpen=${isProfilePopupOpen} 
        onClose=${() => setIsProfilePopupOpen(false)}
        anchorRef=${profileButtonRef}
      />
    </nav>
  `;
}

// ============================================
// AEM BLOCK DECORATOR
// ============================================

export default async function decorate(block) {
  block.textContent = '';

  const appRoot = document.createElement('div');
  appRoot.className = 'header-wrapper';
  block.append(appRoot);

  try {
    render(html`<${HeaderComponent} />`, appRoot);
  } catch (err) {
    // Error handling
  }
}