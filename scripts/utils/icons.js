/* eslint-disable max-len */
/**
 * Global Icon Components
 *
 * Canonical set of SVG icon components for the Adobe Forum.
 * All blocks should import from here — no inline SVG duplication.
 *
 * Usage:
 *   import { TrashIcon, ChevronIcon } from '../../scripts/utils/icons.js';
 *   html`<${TrashIcon} />`
 */

import { html } from '../../vendor/htm-preact.js';
import { COLOR_TOKENS } from './colors.js';

// ── Navigation & Actions ──────────────────────────────────────────────────────

export const PlusIcon = ({ size = 16 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`;

export const CloseIcon = ({ size = 16 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

export const BackIcon = ({ size = 16 } = {}) => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`;

export const ArrowRightIcon = ({ size = 20 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polyline points="9 18 15 12 9 6"/>
  </svg>`;

/** Spectrum 18×18 send arrow — used in comment send button */
export const ArrowIcon = () => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path d="M11.5 8.5H2v1h9.5l-3.5 3.5 .7.7 4.7-4.7-4.7-4.7-.7.7 3.5 3.5z" fill="currentColor"/>
  </svg>`;

export const LogoutIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`;

// ── Chevron ───────────────────────────────────────────────────────────────────

/** `expanded` rotates the chevron 90° (down). `size` defaults 10 for tree, 12 for menus. */
export const ChevronIcon = ({ expanded = false, size = 10, style = '' } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      style="transition:transform 0.2s ease;transform:rotate(${expanded ? '90deg' : '0deg'});flex-shrink:0;${style}">
    <polyline points="9 18 15 12 9 6"/>
  </svg>`;

// ── Files & Folders ───────────────────────────────────────────────────────────

export const FolderIcon = ({ expanded = false, size = 16 } = {}) => (expanded
  ? html`
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20 6h-8l-2-2H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
    </svg>`
  : html`
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`);

export const FileIcon = ({ size = 14 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      style="display:block;flex-shrink:0;">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>`;

// ── Editing ───────────────────────────────────────────────────────────────────

export const EditIcon = ({ size = 14 } = {}) => html`
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      style="display:block;flex-shrink:0;">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;

export const TrashIcon = ({ size = 14 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;

export const CopyIcon = ({ size = 15 } = {}) => html`
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`;

// ── User & Auth ───────────────────────────────────────────────────────────────

export const UserIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;

export const LockIcon = ({ size = 14 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`;

// ── Search ────────────────────────────────────────────────────────────────────

export const SearchIcon = ({ size = 14 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`;

// ── Status & Info ─────────────────────────────────────────────────────────────

export const BellIcon = ({ size = 20 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>`;

export const CheckIcon = ({ size = 14 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`;

export const AlertIcon = ({ size = 13 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" style="flex-shrink:0;margin-top:1px">
    <circle cx="6" cy="6" r="5.25" stroke="${COLOR_TOKENS.danger}" stroke-width="1.2"/>
    <path d="M6 3.5V6.5" stroke="${COLOR_TOKENS.danger}" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="6" cy="8.5" r="0.65" fill="${COLOR_TOKENS.danger}"/>
  </svg>`;

export const WarningIcon = ({ size = 18 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${COLOR_TOKENS.warningStrong}"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`;

// ── Visibility ────────────────────────────────────────────────────────────────

export const EyeIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 18 18" fill="none">
    <path d="M1 9s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z" stroke="currentColor" stroke-width="1.35" fill="none"/>
    <circle cx="9" cy="9" r="2.2" stroke="currentColor" stroke-width="1.35" fill="none"/>
  </svg>`;

export const EyeOffIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 18 18" fill="none">
    <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
    <path d="M5.3 5.4C3.2 6.5 1 9 1 9s2.8 5 8 5c1.7 0 3.2-.6 4.4-1.4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" fill="none"/>
    <path d="M8.3 3.1C8.5 3 8.8 3 9 3c5.2 0 8 6 8 6s-.9 1.8-2.6 3.2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" fill="none"/>
  </svg>`;

// ── Social / Engagement ───────────────────────────────────────────────────────

export const HeartIcon = ({ filled = false, size = 16 } = {}) => html`
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="${filled ? 'currentColor' : 'none'}"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      class="${filled ? 'heart-filled' : 'heart-outline'}">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`;

// ── Sidebar Navigation ────────────────────────────────────────────────────────

export const HomeIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>`;

export const PendingReviewIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
    <line x1="6" y1="9" x2="6" y2="21"/>
  </svg>`;

export const MyRequestsIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>`;

export const HamburgerIcon = ({ size = 16 } = {}) => html`
  <svg class="sidebar-tapbar-icon" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;

// ── Posts list ────────────────────────────────────────────────────────────────

export const PostsIcon = ({ size = 15 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`;

// ── Misc ──────────────────────────────────────────────────────────────────────

export const DotsIcon = ({ size = 14 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="19" cy="12" r="2"/>
  </svg>`;

export const FolderPlusIcon = ({ size = 13 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>`;

export const EmptyBoxIcon = () => html`
  <svg viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C12 30.5 16.5 26 22 26H72L90 44H158C163.5 44 168 48.5 168 54V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V36Z" fill="#FFF3E0"/>
    <path d="M12 68H168V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V68Z" fill="#FFB300" opacity="0.12"/>
    <circle cx="90" cy="86" r="22" fill="#FFE082" opacity="0.5"/>
    <path d="M82 86H98M90 78V94" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

/* ── Header / Notifications Status Badges ────────────────────────────────────── */

export const ApprovedBadgeIcon = ({ color = COLOR_TOKENS.success, size = 12 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;">
    <circle cx="8" cy="8" r="8" fill="${color}"/>
    <polyline points="4.5,8.5 7,11 11.5,5.5" stroke="${COLOR_TOKENS.white}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

export const ChangesBadgeIcon = ({ color = COLOR_TOKENS.warning, size = 12 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;">
    <circle cx="8" cy="8" r="8" fill="${color}"/>
    <path d="M8 4.5V8.5" stroke="${COLOR_TOKENS.white}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="8" cy="11" r="0.9" fill="${COLOR_TOKENS.white}"/>
  </svg>`;

export const PendingReviewBadgeIcon = ({ infoColor = COLOR_TOKENS.info, infoSurfaceColor = COLOR_TOKENS.infoSurface, size = 12 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;">
    <circle cx="8" cy="8" r="7.25" stroke="${infoColor}" stroke-width="1.5" fill="${infoSurfaceColor}"/>
    <path d="M8 4.5V8l2.5 2" stroke="${infoColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

export const LikeBadgeIcon = ({ color = COLOR_TOKENS.accent, size = 12 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;">
    <path d="M8 13.2 3.7 9.3a2.7 2.7 0 0 1 0-3.9 2.7 2.7 0 0 1 3.8 0L8 5.9l0.5-0.5a2.7 2.7 0 0 1 3.8 0 2.7 2.7 0 0 1 0 3.9L8 13.2Z" fill="${color}"/>
  </svg>`;

export const SessionWarningIcon = ({ size = 16 } = {}) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`;
