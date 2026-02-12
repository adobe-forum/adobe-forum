import { html, render } from '../../vendor/htm-preact.js';
import { useState, useEffect } from '../../vendor/preact-hooks.js';

// Header Navigation Data
const NAV_DATA = [
  { label: 'logo', route: '/', isIcon: true, type: 'brand' },
  { label: 'Add Post', route: '/create-post', isIcon: false, type: 'brand', isButton: true },
  { label: 'bell', route: '/notifications', isIcon: true, type: 'tools' },
  { label: 'settings', route: '/settings', isIcon: true, type: 'tools', isSVG: true },
  { label: 'profile', route: '/profile', isIcon: true, type: 'tools', isAvatar: true },
];

// ========== ICON COMPONENTS ==========

const SettingsIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="spectrum-icon">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
`;

const PlusIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spectrum-icon">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const Divider = () => html`
  <div class="spectrum-divider" role="separator" aria-orientation="vertical"></div>
`;

// ========== NAVIGATION COMPONENT ==========

function Navigation({ navItems }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.matchMedia('(min-width: 900px)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const handleChange = (e) => setIsDesktop(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen && !isDesktop) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }
  }, [isMobileMenuOpen, isDesktop]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavClick = (e, route) => {
    // Optional: Add logic here if you want to handle SPA routing
    console.log('Navigating to:', route);
    if (!isDesktop) {
      setIsMobileMenuOpen(false);
    }
  };

  const renderNavItem = (item) => {
    if (item.isAvatar) {
      return html`
        <div class="profile-avatar">
          <img 
            src="/icons/jack.png" 
            alt="${item.label}"
            onError=${(e) => { 
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div class="profile-avatar-fallback">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </div>
      `;
    } else if (item.isSVG && item.label === 'settings') {
      return html`<${SettingsIcon} />`;
    } else if (item.isIcon) {
      return html`
        <img 
          src="/icons/${item.label}.svg" 
          alt="${item.label}"
          onError=${(e) => { e.target.src = `/icons/${item.label}.png`; }}
          class="nav-icon"
        />
      `;
    } else if (item.isButton) {
      return html`
        <span class="nav-button-content">
          <${PlusIcon} />
          <span class="nav-button-text">${item.label}</span>
        </span>
      `;
    }
    return html`<span>${item.label}</span>`;
  };

  const logo = navItems.find(item => item.type === 'brand' && !item.isButton);
  const brandButton = navItems.find(item => item.type === 'brand' && item.isButton);
  const toolItems = navItems.filter(item => item.type === 'tools');

  return html`
    <nav id="nav" class="spectrum-nav" aria-expanded=${isMobileMenuOpen}>
      <div class="nav-hamburger">
        <button 
          type="button" 
          aria-controls="nav" 
          aria-label=${isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          onClick=${toggleMobileMenu}
        >
          <span class="nav-hamburger-icon"></span>
        </button>
      </div>

      <div class="nav-brand-section">
        <div class="nav-brand">
          <a href=${logo.route} onClick=${(e) => handleNavClick(e, logo.route)}>
            <img 
              src="/icons/${logo.label}.png" 
              alt="Logo"
              onError=${(e) => { e.target.src = `/icons/${logo.label}.svg`; }}
            />
          </a>
        </div>
        
        ${isDesktop && html`<${Divider} />`}
        
        <div class="nav-brand-action">
          <a 
            href=${brandButton.route} 
            onClick=${(e) => handleNavClick(e, brandButton.route)}
            class="nav-button spectrum-button"
          >
            ${renderNavItem(brandButton)}
          </a>
        </div>
      </div>

      <div class="nav-tools">
        <ul>
          ${toolItems.map((item, idx) => html`
            <li key=${idx} class=${item.isAvatar ? 'profile-item' : ''}>
              <a 
                href=${item.route} 
                onClick=${(e) => handleNavClick(e, item.route)}
                class=${item.isAvatar ? 'profile-link' : 'spectrum-action-button'}
              >
                ${renderNavItem(item)}
              </a>
            </li>
          `)}
        </ul>
      </div>
    </nav>
  `;
}

// ========== MAIN HEADER COMPONENT ==========

function Header() {
  const [navItems] = useState(NAV_DATA);

  return html`
    <div class="header-layout">
      <div class="nav-wrapper">
        <${Navigation} navItems=${navItems} />
      </div>
    </div>
  `;
}

/**
 * Decorates the header block
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'header-container';
  block.append(wrapper);

  try {
    render(html`<${Header} />`, wrapper);
  } catch (error) {
    console.error('Error rendering header:', error);
    wrapper.innerHTML = '<nav><p>Error loading navigation</p></nav>';
  }

  // Handle Escape key to close mobile menu
  const handleEscape = (e) => {
    if (e.code === 'Escape') {
      const nav = document.getElementById('nav');
      if (nav && nav.getAttribute('aria-expanded') === 'true') {
        const hamburger = nav.querySelector('.nav-hamburger button');
        if (hamburger) hamburger.click();
      }
    }
  };

  window.addEventListener('keydown', handleEscape);
}