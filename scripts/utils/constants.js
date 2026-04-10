/**
 * Global Constants
 *
 * Single source of truth for shared configuration values across the Adobe Forum.
 * All blocks should import from here — no duplicated API URLs, z-indexes, or magic numbers.
 *
 * Usage:
 *   import { API_BASE, Z_INDEX, BREAKPOINTS } from '../../scripts/utils/constants.js';
 */

// ── API ───────────────────────────────────────────────────────────────────────

const isLocal = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/** Base URL for all forum API calls (e.g. /api/posts, /api/sidebar-items) */
export const API_BASE = isLocal
  ? 'http://localhost:5000/api'
  : 'https://adobe-forum-12iq.onrender.com/api';

/** Base URL for auth API calls */
export const AUTH_API_BASE = `${API_BASE}/auth`;

// ── Breakpoints ───────────────────────────────────────────────────────────────

/**
 * Canonical breakpoints in pixels.
 *
 * These values MUST match the hardcoded pixel values used in CSS @media queries
 * (CSS custom properties cannot be used inside @media query expressions).
 *
 * If you change a value here, update the corresponding @media rules in CSS too.
 */
export const BREAKPOINTS = {
  /** Small mobile */
  xs: 480,
  /** Mobile / tablet threshold — also used in CSS as 768px */
  sm: 768,
  /** Tablet / desktop threshold — sidebar switches layout at this point */
  md: 1024,
};

// ── Z-Index Layers ────────────────────────────────────────────────────────────

export const Z_INDEX = {
  /** Main content layer */
  content: 1,
  /** Desktop sidebar panel */
  sidebar: 200,
  /** Fixed header */
  header: 300,
  /** Mobile overlay sidebar panel */
  mobileOverlay: 400,
  /** Mobile tap bar — must sit above the overlay panel so it's always tappable */
  tapBar: 401,
  /** Modals, alerts, dialogs */
  modal: 500,
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = '280px';

// ── Spacing ───────────────────────────────────────────────────────────────────

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};
