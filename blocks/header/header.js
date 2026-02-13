import { html, render } from '../../vendor/htm-preact.js';
import { useState } from '../../vendor/preact-hooks.js';

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

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderComponent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleProfileImageError = () => {
    setProfileImageError(true);
  };

  return html`
    <nav class="spectrum-nav" aria-expanded="${isMobileMenuOpen}">
      <div class="nav-hamburger">
        <button type="button" onClick=${toggleMenu} aria-label="Toggle Menu">
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
            <a href="/profile" class="profile-link">
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
            </a>
          </li>
        </ul>
      </div>
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
