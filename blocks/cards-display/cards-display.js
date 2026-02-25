/* eslint-disable no-underscore-dangle */
import { h, render } from '../../vendor/preact.js';
import { useEffect, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';

const html = htm.bind(h);

const API_BASE_URL = 'http://localhost:5000/api';
const PAGE_SIZE = 12;

// ── Pure Helper Functions ─────────────────────────────────────────────
function extractImage(body) {
  if (!body) return null;
  const doc = new DOMParser().parseFromString(body, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
}

function extractExcerpt(body, max = 100) {
  if (!body) return '';
  const doc = new DOMParser().parseFromString(body, 'text/html');
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

// ── Preact Components ─────────────────────────────────────────────────

function Card({ post, onClick }) {
  const id = post._id || post.id;

  const tags = (post.tags || []).slice(0, 3).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  const imgSrc = post.image || extractImage(post.body);
  const author = post.author?.name || post.author?.username || post.author
    || post.createdBy?.name || post.createdBy?.username || post.createdBy
    || post.userId?.name || post.userId?.username || 'Anonymous';

  const initials = avatarInitials(author);
  const avColor = avatarColor(author);
  const excerpt = extractExcerpt(post.body || post.description || post.content || '');

  return html`
    <article class="card" onClick=${() => onClick(id)}>
      <div class="card-img-wrapper">
        ${imgSrc
    ? html`<img src="${imgSrc}" alt="${post.title}" class="card-img-box" loading="lazy" />`
    : html`<div class="card-img-box card-img--placeholder"></div>`}
        ${post.category ? html`<span class="card-category-badge">${post.category}</span>` : ''}
      </div>
      <div class="card-body">
        ${tags.length > 0 ? html`<div class="card-tags">${tags.map((tag) => html`<span class="card-tag">${tag}</span>`)}</div>` : ''}
        <h3 class="card-title">${post.title}</h3>
        <p class="card-meta">
          <span class="card-avatar" style="background:${avColor}">${initials}</span>
          <span class="card-author">${author}</span>
        </p>
        ${excerpt ? html`<p class="card-desc">${excerpt}</p>` : ''}
      </div>
      <div class="card-read-more">
        Read more
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
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
    pages.push(html`<button class="page-btn" onClick=${() => onPageChange(1)}>1</button>`);
    if (start > 2) pages.push(html`<span class="page-ellipsis">…</span>`);
  }

  for (let i = start; i <= end; i += 1) {
    pages.push(html`
      <button class="page-btn ${i === currentPage ? 'is-active' : ''}" onClick=${() => onPageChange(i)}>
        ${i}
      </button>
    `);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(html`<span class="page-ellipsis">…</span>`);
    pages.push(html`<button class="page-btn" onClick=${() => onPageChange(totalPages)}>${totalPages}</button>`);
  }

  return html`
    <div class="cards-pagination-wrapper">
      <div class="cards-pagination">
        <button class="page-btn page-prev" disabled=${currentPage === 1} onClick=${() => onPageChange(currentPage - 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ${pages}
        <button class="page-btn page-next" disabled=${currentPage === totalPages} onClick=${() => onPageChange(currentPage + 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function SkeletonLoaders() {
  return html`
    <div class="cards-grid">
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

  let displayTitle = initialTitle;
  if (category) displayTitle = `${category} Posts`;
  else if (searchQuery) displayTitle = `Search Results: "${searchQuery}"`;

  useEffect(() => {
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

        const res = await fetch(url);
        const data = await res.json();

        let fetchedPosts = [];
        if (category) {
          fetchedPosts = (data.items || []).map((item) => item.postId).filter(Boolean);
        } else {
          fetchedPosts = data.posts || data || [];
        }

        setPosts(fetchedPosts);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('cards-display: failed to fetch posts', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, searchQuery, category]);

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
      const cws = document.querySelectorAll('.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards');
      const fw = document.querySelector('.forum-post-wrapper');
      const sw = document.querySelector('.search-bar-wrapper');
      cws.forEach((cw) => { if (cw) { const c = cw; c.style.display = ''; } });
      if (fw) fw.style.display = 'none';
      if (sw) sw.style.display = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('search-posts', handleSearch);
    window.addEventListener('filter-category', handleFilter);
    window.addEventListener('show-cards', handleShowCards);

    const fw = document.querySelector('.forum-post-wrapper');
    if (fw) fw.style.display = 'none';

    return () => {
      window.removeEventListener('search-posts', handleSearch);
      window.removeEventListener('filter-category', handleFilter);
      window.removeEventListener('show-cards', handleShowCards);
    };
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (blockElement) {
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCardClick = (postId) => {
    const cws = document.querySelectorAll('.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards');
    const fw = document.querySelector('.forum-post-wrapper');
    const sw = document.querySelector('.search-bar-wrapper');

    cws.forEach((cw) => { if (cw) { const c = cw; c.style.display = 'none'; } });
    if (fw) fw.style.display = '';
    if (sw) sw.style.display = 'none';

    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return html`
    <div class="cards-header">
      <h2 class="cards-title">${displayTitle}</h2>
      ${initialSubtitle && !searchQuery && !category ? html`<p class="cards-subtitle">${initialSubtitle}</p>` : ''}
    </div>

    ${loading && html`<${SkeletonLoaders} />`}
    
    ${error && !loading && html`<p class="cards-error">Failed to load posts. Please try again.</p>`}

    ${!loading && !error && posts.length === 0 && (searchQuery || category) && html`
      <div class="cards-no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No posts found matching your criteria.</p>
        <span>Try a different keyword or clear the search.</span>
      </div>
    `}

    ${!loading && !error && posts.length === 0 && !searchQuery && !category && html`
      <p class="cards-empty">No posts found.</p>
    `}

    ${!loading && !error && posts.length > 0 && html`
      <div class="cards-grid">
        ${posts.map((post) => html`<${Card} post=${post} onClick=${handleCardClick} />`)}
      </div>
      <${Pagination} currentPage=${currentPage} totalPages=${totalPages} onPageChange=${handlePageChange} />
    `}
  `;
}

// ── Exported Decorator ────────────────────────────────────────────────

export default async function decorate(block) {
  const rows = [...block.children];
  const title = rows[0]?.children[0]?.textContent.trim() || '';
  const subtitle = rows[0]?.children[1]?.textContent.trim() || '';

  block.innerHTML = '';
  render(html`<${CardsDisplay} initialTitle=${title} initialSubtitle=${subtitle} blockElement=${block} />`, block);
}
