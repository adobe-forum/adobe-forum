/* eslint-disable no-underscore-dangle */
import { h, render } from '../../vendor/preact.js';
import { useEffect, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';

const html = htm.bind(h);

// ── Environment & Config ──────────────────────────────────────────────
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost
  ? 'http://localhost:5000/api'
  : 'https://api.yourproductiondomain.com/api'; // TODO: Update with your production API URL

const PAGE_SIZE = 12;

// ── Shared Instances ──────────────────────────────────────────────────
const domParser = new DOMParser();

// ── Pure Helper Functions ─────────────────────────────────────────────
function extractImage(body) {
  if (!body) return null;
  const doc = domParser.parseFromString(body, 'text/html');
  const img = doc.querySelector('img');
  // eslint-disable-next-line no-script-url
  return (img && img.src && !img.src.startsWith('javascript:')) ? img.src : null;
}

function extractExcerpt(body, max = 100) {
  if (!body) return '';
  const doc = domParser.parseFromString(body, 'text/html');
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function avatarInitials(name) {
  if (!name || name === 'Anonymous') return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name[0].toUpperCase();
}

function avatarColor(name) {
  const colors = ['#DA1F26', '#0265DC', '#12805C', '#7B2D8B', '#E68619', '#1473E6'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function normalizeApiData(data, category) {
  if (category) {
    return (data.items || []).map((item) => item.postId).filter(Boolean);
  }
  return data.posts || data || [];
}

function toggleViews(showCards) {
  const cws = document.querySelectorAll('.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards');
  const fw = document.querySelector('.forum-post-wrapper');
  const sw = document.querySelector('.search-bar-wrapper');

  cws.forEach((cw) => { if (cw) { const c = cw; c.style.display = showCards ? '' : 'none'; } });
  if (fw) fw.style.display = showCards ? 'none' : '';
  if (sw) sw.style.display = showCards ? '' : 'none';

  document.body.classList.toggle('is-viewing-post', !showCards);
}

// ── Preact Components ─────────────────────────────────────────────────

function Card({ post, onClick }) {
  const id = post._id || post.id;

  const tags = (post.tags || []).slice(0, 3).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  // Extract the image, or fallback to the default Adobe logo
  const extractedImg = post.image || extractImage(post.body);
  const imgSrc = extractedImg || '../../icons/adobe_logo.svg';
  const isPlaceholder = !extractedImg;

  const author = post.author?.name || post.author?.username || post.author
    || (post.createdBy?.firstName && `${post.createdBy.firstName} ${post.createdBy.lastName || ''}`.trim())
    || post.createdBy?.name || post.createdBy?.username
    || post.userId?.name || post.userId?.username || 'Anonymous';

  const initials = avatarInitials(author);
  const avColor = avatarColor(author);
  const excerpt = extractExcerpt(post.body || post.description || post.content || '');

  const rawCategory = post.category || '';

  // Show only the deepest/last segment in the badge
  const displayCategory = rawCategory ? rawCategory.split(' > ').pop().trim() : '';

  // Full path is the raw stored string — used in tooltip
  const fullCategoryPath = rawCategory.trim();

  // Only show tooltip if the path has more than one segment
  const hasParent = rawCategory.includes(' > ');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(id);
    }
  };

  return html`
    <article 
      class="card" 
      role="button" 
      tabIndex="0" 
      onClick=${() => onClick(id)}
      onKeyDown=${handleKeyDown}
      aria-label="Read post: ${post.title}"
    >
      <div class="card-img-wrapper">
        <img 
          src="${imgSrc}" 
          alt="" 
          class="card-img-box ${isPlaceholder ? 'card-img--placeholder' : ''}" 
          loading="lazy" 
        />
        ${displayCategory ? html`
          <span class="card-category-badge">
            ${displayCategory}
            ${hasParent ? html`
              <span class="card-category-tooltip" role="tooltip">${fullCategoryPath}</span>
            ` : ''}
          </span>
        ` : ''}
      </div>
      <div class="card-body">
        ${tags.length > 0 ? html`<div class="card-tags">${tags.map((tag) => html`<span class="card-tag">${tag}</span>`)}</div>` : ''}
        <h3 class="card-title">${post.title}</h3>
        <p class="card-meta">
          <span class="spectrum-Avatar" style="background-color: ${avColor}" aria-hidden="true">
            <span class="spectrum-Avatar-initials">${initials}</span>
          </span>
          <span class="card-author">${author}</span>
        </p>
        ${excerpt ? html`<p class="card-desc">${excerpt}</p>` : ''}
      </div>
      <div class="card-read-more" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </article>
  `;
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const delta = 2;
  const start = Math.max(1, currentPage - delta);
  const end = Math.min(totalPages, currentPage + delta);

  const pages = [];
  if (start > 1) {
    pages.push(html`<button class="page-btn" aria-label="Page 1" onClick=${() => onPageChange(1)}>1</button>`);
    if (start > 2) pages.push(html`<span class="page-ellipsis" aria-hidden="true">…</span>`);
  }

  for (let i = start; i <= end; i += 1) {
    pages.push(html`
      <button 
        class="page-btn ${i === currentPage ? 'is-active' : ''}" 
        aria-label="Page ${i}"
        aria-current=${i === currentPage ? 'page' : 'false'}
        onClick=${() => onPageChange(i)}
      >
        ${i}
      </button>
    `);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(html`<span class="page-ellipsis" aria-hidden="true">…</span>`);
    pages.push(html`<button class="page-btn" aria-label="Page ${totalPages}" onClick=${() => onPageChange(totalPages)}>${totalPages}</button>`);
  }

  return html`
    <div class="cards-pagination-wrapper">
      <nav class="cards-pagination" aria-label="Pagination Navigation">
        <button class="page-btn page-prev" aria-label="Previous Page" disabled=${currentPage === 1} onClick=${() => onPageChange(currentPage - 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ${pages}
        <button class="page-btn page-next" aria-label="Next Page" disabled=${currentPage === totalPages} onClick=${() => onPageChange(currentPage + 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </nav>
    </div>
  `;
}

function SkeletonLoaders() {
  return html`
    <div class="cards-grid" aria-busy="true" aria-label="Loading posts">
      ${Array(6).fill(null).map(() => html`
        <div class="card card--skeleton">
          <div class="card-img-box skeleton-box"></div>
          <div class="card-body">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
          </div>
        </div>
      `)}
    </div>
  `;
}

// ── Main Controller Component ─────────────────────────────────────────

function CardsDisplay({ initialTitle, initialSubtitle, blockElement }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  let displayTitle = initialTitle;
  if (category) displayTitle = `${category} Posts`;
  else if (searchQuery) displayTitle = `Search Results: "${searchQuery}"`;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchPosts = async () => {
      setLoading(true);
      setError(false);
      try {
        let url;
        if (category) {
          url = new URL(`${API_BASE_URL}/sidebar-items/category/${encodeURIComponent(category)}`);
          url.searchParams.append('page', currentPage);
          url.searchParams.append('limit', PAGE_SIZE);
        } else {
          url = new URL(`${API_BASE_URL}/posts`);
          url.searchParams.append('page', currentPage);
          url.searchParams.append('limit', PAGE_SIZE);
          if (searchQuery) url.searchParams.append('search', searchQuery);
        }

        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        setPosts(normalizeApiData(data, category));
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (err.name === 'AbortError') return;
        // eslint-disable-next-line no-console
        console.error('cards-display: failed to fetch posts', err);
        setError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchPosts();
    return () => { controller.abort(); };
  }, [currentPage, searchQuery, category, refreshTick]);

  useEffect(() => {
    const handleSearch = (e) => {
      setSearchQuery(e.detail.query.toLowerCase().trim());
      setCategory('');
      setCurrentPage(1);
    };

    const handleFilter = (e) => {
      setCategory(e.detail.category);
      setSearchQuery('');
      setCurrentPage(1);
    };

    const handleShowCards = () => {
      toggleViews(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('search-posts', handleSearch);
    window.addEventListener('filter-category', handleFilter);
    window.addEventListener('show-cards', handleShowCards);
    const handleRefresh = () => setRefreshTick((t) => t + 1);
    window.addEventListener('refresh-cards', handleRefresh);
    window.addEventListener('edit-post:saved', handleRefresh);
    toggleViews(true);

    return () => {
      window.removeEventListener('search-posts', handleSearch);
      window.removeEventListener('filter-category', handleFilter);
      window.removeEventListener('show-cards', handleShowCards);
      window.removeEventListener('refresh-cards', handleRefresh);
      window.removeEventListener('edit-post:saved', handleRefresh);
    };
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (blockElement) {
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCardClick = (postId) => {
    toggleViews(false);
    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEmptyStateContent = () => {
    if (searchQuery || category) {
      return html`
        <div class="cards-no-results">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>No posts found matching your criteria.</p>
          <span>Try a different keyword or clear the search.</span>
        </div>
      `;
    }
    return html`<p class="cards-empty">No posts found.</p>`;
  };

  return html`
    <div class="cards-header">
      <h2 class="cards-title">${displayTitle}</h2>
      ${initialSubtitle && !searchQuery && !category ? html`<p class="cards-subtitle">${initialSubtitle}</p>` : ''}
    </div>

    ${loading && html`<${SkeletonLoaders} />`}
    
    ${error && !loading && html`<p class="cards-error" role="alert">Failed to load posts. Please try again.</p>`}

    ${!loading && !error && posts.length === 0 && getEmptyStateContent()}

    ${!loading && !error && posts.length > 0 && html`
      <div class="cards-grid" role="list">
        ${posts.map((post) => html`<${Card} post=${post} onClick=${handleCardClick} />`)}
      </div>
      <${Pagination} currentPage=${currentPage} totalPages=${totalPages} onPageChange=${handlePageChange} />
    `}
  `;
}

// ── Exported Decorator ────────────────────────────────────────────────

export default async function decorate(block) {
  // Auth guard — redirect to sign in if not logged in
  if (!localStorage.getItem('af_user')) {
    window.location.replace('/auth-form');
    return;
  }

  const rows = [...block.children];
  const title = rows[0]?.children[0]?.textContent.trim() || '';
  const subtitle = rows[0]?.children[1]?.textContent.trim() || '';

  block.innerHTML = '';
  render(html`<${CardsDisplay} initialTitle=${title} initialSubtitle=${subtitle} blockElement=${block} />`, block);
}
