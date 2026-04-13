/* eslint-disable no-underscore-dangle */
import { h, render } from '../../vendor/preact.js';
import { useEffect, useRef, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';
import clearClientAuthState from '../../scripts/auth-state.js';
import { API_BASE } from '../../scripts/utils/constants.js';
import { getCurrentRoute, navigateHome, navigateToPost } from '../../scripts/router.js';

const html = htm.bind(h);

const AUTH_API_BASE = `${API_BASE}/auth`;

const PAGE_SIZE = 12;
const domParser = new DOMParser();

function extractExcerpt(body, max = 100) {
  if (!body) return '';
  const doc = domParser.parseFromString(body, 'text/html');

  doc.querySelectorAll('p, li, div, h1, h2, h3, h4, h5, h6, br, td, th, dt, dd').forEach((el) => {
    el.appendChild(doc.createTextNode(' '));
  });

  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function firstImageFromBody(body) {
  if (!body) return null;
  const doc = domParser.parseFromString(body, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src || img.getAttribute('src') : null;
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

function normalizeApiData(data) {
  return data.posts || data || [];
}

function buildStoredUser(user, loginAt) {
  if (!user) return null;

  const storedUser = { ...user };
  if (storedUser._id && !storedUser.id) storedUser.id = String(storedUser._id);
  if (storedUser.id && !storedUser._id) storedUser._id = String(storedUser.id);
  if (loginAt) storedUser.loginAt = loginAt;
  return storedUser;
}

async function restoreClientAuthFromSession() {
  try {
    console.log('📡 Calling /api/auth/me with credentials: include');
    console.log('   Browser will send cookies:', document.cookie ? `✅ (${document.cookie.length} bytes)` : '❌ (no cookies)');
    
    const res = await fetch(`${AUTH_API_BASE}/me`, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));

    console.log(`📡 /api/auth/me response status: ${res.status}, ok: ${res.ok}`);
    
    if (!res.ok) {
      const error = new Error(data.error || 'Not authenticated.');
      error.status = res.status;
      console.error(`❌ /api/auth/me failed with ${res.status}:`, error.message);
      throw error;
    }

    const storedUser = buildStoredUser(data.user, data.loginAt);
    if (storedUser) {
      // Store in both localStorage and sessionStorage for better mobile Safari support
      localStorage.setItem('af_user', JSON.stringify(storedUser));
      sessionStorage.setItem('af_user_session', JSON.stringify(storedUser));
      console.log('✅ User data stored in both localStorage and sessionStorage');
    }

    return data;
  } catch (err) {
    const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isMobileSafari) {
      console.warn('📱 Mobile Safari detected - checking sessionStorage fallback:', err.message);
      // Try to restore from sessionStorage as fallback on mobile Safari
      const sessionUser = sessionStorage.getItem('af_user_session');
      if (sessionUser) {
        console.log('✅ Restored from sessionStorage (mobile Safari fallback):', JSON.parse(sessionUser).email);
        return { user: JSON.parse(sessionUser) };
      }
    }
    throw err;
  }
}

function toggleViews(showCards) {
  const cardWrappers = document.querySelectorAll('.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards');
  const forumWrapper = document.querySelector('.forum-post-wrapper');
  const searchWrapper = document.querySelector('.search-bar-wrapper');

  cardWrappers.forEach((wrapper) => {
    if (wrapper) {
      const container = wrapper;
      container.style.display = showCards ? '' : 'none';
    }
  });
  if (forumWrapper) forumWrapper.style.display = showCards ? 'none' : '';
  if (searchWrapper) searchWrapper.style.display = showCards ? '' : 'none';

  document.body.classList.toggle('is-viewing-post', !showCards);
}

function syncCardsView(route) {
  toggleViews(route?.view !== 'post');
}

function Card({ post, onClick }) {
  const id = post._id || post.id;
  const tags = (post.tags || []).slice(0, 3).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  const imgSrc = firstImageFromBody(post.body || post.description || post.content || '')
    || '../../icons/adobe_logo.svg';
  const isPlaceholder = imgSrc === '../../icons/adobe_logo.svg';
  const author = post.author?.name || post.author?.username || post.author
    || (post.createdBy?.firstName && `${post.createdBy.firstName} ${post.createdBy.lastName || ''}`.trim())
    || post.createdBy?.name || post.createdBy?.username
    || post.userId?.name || post.userId?.username || 'Anonymous';
  const initials = avatarInitials(author);
  const avColor = avatarColor(author);
  const excerpt = extractExcerpt(post.body || post.description || post.content || '');
  const rawCategory = post.category || '';
  const displayCategory = rawCategory ? rawCategory.split(' > ').pop().trim() : '';
  const fullCategoryPath = rawCategory.trim();
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
        <div class="card-img-overlay-metrics">
          <div class="spectrum-Badge spectrum-Badge--sizeS spectrum-Badge--neutral card-metric-badge" title="Likes">
            <svg class="spectrum-Icon spectrum-Icon--sizeS" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span class="spectrum-Badge-label">${post.likes?.length || 0}</span>
          </div>
          <div class="spectrum-Badge spectrum-Badge--sizeS spectrum-Badge--neutral card-metric-badge" title="Views">
            <svg class="spectrum-Icon spectrum-Icon--sizeS" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span class="spectrum-Badge-label">${post.views || 0}</span>
          </div>
        </div>
        ${displayCategory ? html`
          <span class="card-category-badge">
            <span class="card-category-text">${displayCategory}</span>
          </span>
          <span class="card-category-tooltip" role="tooltip">
            ${hasParent ? html`<span class="card-category-tooltip-label">Path</span>` : ''}
            <span class="card-category-breadcrumb">
              ${fullCategoryPath.split(' > ').map((part, i, arr) => html`
                <span class="card-category-crumb" title="${part}">${part}</span>${i < arr.length - 1 ? html`<span class="card-category-sep" aria-hidden="true">›</span>` : ''}
              `)}
            </span>
          </span>
        ` : ''}
      </div>
      <div class="card-body">
        <div class="card-top">
          <div class="card-tags">
            ${tags.length > 0 ? tags.map((tag) => html`<span class="card-tag">${tag}</span>`) : ''}
          </div>
          <h3 class="card-title">${post.title}</h3>
        </div>
        <div class="card-bottom">
          <p class="card-meta">
            <span class="spectrum-Avatar" style="background-color: ${avColor}" aria-hidden="true">
              <span class="spectrum-Avatar-initials">${initials}</span>
            </span>
            <span class="card-author">${author}</span>
          </p>
          <p class="card-desc">${excerpt || ''}</p>
        </div>
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

function CardsDisplay({ initialTitle, initialSubtitle, blockElement }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(null);
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [category, setCategory] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [refreshTick, setRefreshTick] = useState(0);
  const [isMine, setIsMine] = useState(false);
  const [authorId, setAuthorId] = useState(() => new URLSearchParams(window.location.search).get('author') || '');
  const hasLoadedOnceRef = useRef(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const hasTitleToken = initialTitle.includes('{n}');

  let displayTitle = initialTitle;
  if (authorId || isMine) {
    displayTitle = 'My Posts';
  } else if (category) {
    displayTitle = `${category} Posts`;
  } else if (searchQuery) {
    displayTitle = `Search Results: "${searchQuery}"`;
  } else if (hasTitleToken) {
    displayTitle = totalCount !== null
      ? initialTitle.replace('{n}', totalCount)
      : initialTitle.replace('{n}', '…');
  }

  useEffect(() => {
    const handlePostUpdated = (e) => {
      const { id, views, likes } = e.detail;
      if (!id) return;

      setPosts((currentPosts) => currentPosts.map((p) => {
        const postId = p._id || p.id;
        if (String(postId) === String(id)) {
          const newViews = views !== undefined ? views : p.views;
          const newLikes = likes !== undefined ? likes : p.likes?.length;

          return {
            ...p,
            views: newViews,
            likes: new Array(newLikes).fill('placeholder'),
          };
        }
        return p;
      }));
    };

    const handleRouteChange = (e) => {
      const route = e.detail || getCurrentRoute();
      syncCardsView(route);

      if (route.view !== 'post' && e.detail?.source === 'popstate') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setRefreshTick((t) => t + 1);
      }
    };

    syncCardsView(getCurrentRoute());
    window.addEventListener('af-route-change', handleRouteChange);
    window.addEventListener('af-post-updated', handlePostUpdated);

    return () => {
      window.removeEventListener('af-route-change', handleRouteChange);
      window.removeEventListener('af-post-updated', handlePostUpdated);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchPosts = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = new URL(`${API_BASE}/posts`);
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', PAGE_SIZE);
        url.searchParams.append('sort', sortOption);
        if (searchQuery) url.searchParams.append('search', searchQuery);
        if (category) url.searchParams.append('category', category);
        if (authorId) url.searchParams.append('author', authorId);
        if (isMine) url.searchParams.append('mine', 'true');

        const res = await fetch(url, {
          signal,
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        setPosts(normalizeApiData(data));
        setTotalPages(data.totalPages || 1);

        const count = data.totalCount ?? data.total ?? data.count ?? data.totalItems ?? null;
        setTotalCount(count);
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
    return () => {
      controller.abort();
    };
  }, [currentPage, searchQuery, category, refreshTick, authorId, sortOption, isMine]);

  // Sync search state to the browser URL dynamically
  useEffect(() => {
    const url = new URL(window.location);
    if (searchQuery) {
      url.searchParams.set('search', searchQuery);
    } else {
      url.searchParams.delete('search');
    }
    // Only push if it actually changed to avoid identical state overwrite loops
    if (window.location.search !== url.search) {
      window.history.replaceState({}, '', url);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleSearch = (e) => {
      setSearchQuery(e.detail.query.toLowerCase().trim());
      setCategory('');
      setCurrentPage(1);
    };

    const handleFilter = (e) => {
      setCategory(e.detail.category);
      setSearchQuery('');
      setIsMine(false);
      setAuthorId('');
      setCurrentPage(1);
    };

    const handleRefresh = (e) => {
      if (e?.detail?.mine) {
        setIsMine(true);
        if (e.detail.authorId) setAuthorId(e.detail.authorId);
      } else if (e?.detail?.resetView) {
        setIsMine(false);
        setAuthorId('');
        navigateHome({ replace: true, scroll: false, source: 'refresh-cards-reset' });
      }
      setRefreshTick((t) => t + 1);
    };

    window.addEventListener('search-posts', handleSearch);
    window.addEventListener('filter-category', handleFilter);
    window.addEventListener('refresh-cards', handleRefresh);
    window.addEventListener('edit-post:saved', handleRefresh);
    syncCardsView(getCurrentRoute());

    return () => {
      window.removeEventListener('search-posts', handleSearch);
      window.removeEventListener('filter-category', handleFilter);
      window.removeEventListener('refresh-cards', handleRefresh);
      window.removeEventListener('edit-post:saved', handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [searchQuery, category, authorId, sortOption, isMine]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (blockElement) {
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCardClick = (postId) => {
    navigateToPost(postId, { source: 'cards-display', scroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEmptyStateContent = () => {
    if ((authorId || isMine) && !searchQuery && !category) {
      return html`
        <div class="cards-no-results">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <p>You haven't created any posts yet!</p>
          <span>Share your thoughts with the community.</span>
          <button
            class="cards-create-btn"
            onClick=${() => { window.location.href = '/create-post'; }}
          >
            Create your first post
          </button>
        </div>
      `;
    }

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

  const renderTitle = () => {
    if (authorId || isMine) {
      const countLabel = totalCount !== null ? totalCount : '…';
      return html`
        <h2 class="cards-title">
          My Posts
          <span class="cards-count-badge" aria-label="${countLabel} posts">${countLabel}</span>
        </h2>
      `;
    }

    if (!hasTitleToken || category || searchQuery) {
      return html`<h2 class="cards-title">${displayTitle}</h2>`;
    }

    const parts = initialTitle.split('{n}');
    const countLabel = totalCount !== null ? totalCount : '…';
    return html`
      <h2 class="cards-title">
        ${parts[0].trim()}
        <span class="cards-count-badge" aria-label="${countLabel} posts">${countLabel}</span>
        ${parts[1] ? parts[1].trim() : ''}
      </h2>
    `;
  };

  return html`
    <div class="cards-header">
      <div class="cards-title-row">
        ${renderTitle()}
        ${!searchQuery && !authorId && !isMine ? html`
          <div class="cards-sort-wrapper">
            <label for="cards-sort" class="cards-sort-label">Sort by:</label>
            <select id="cards-sort" class="cards-sort-select" value=${sortOption} onChange=${(e) => { setSortOption(e.target.value); setCurrentPage(1); }}>
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="most_liked">Most Liked</option>
              <option value="most_viewed">Most Viewed</option>
            </select>
          </div>
        ` : ''}
      </div>
      ${initialSubtitle && !searchQuery && !category && !authorId && !isMine ? html`<p class="cards-subtitle">${initialSubtitle}</p>` : ''}
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
    
    <button
      class="back-to-top-btn ${showBackToTop ? 'is-visible' : ''}"
      aria-label="Back to top"
      onClick=${scrollToTop}
      aria-hidden=${!showBackToTop}
      tabindex=${showBackToTop ? '0' : '-1'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
  `;
}

export default async function decorate(block) {
  const hasLocalStorage = localStorage.getItem('af_user');
  const hasSessionStorage = sessionStorage.getItem('af_user_session');
  const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  
  console.log('🔍 cards-display decorate() starting...');
  console.log('  - localStorage.af_user:', hasLocalStorage ? '✅ present' : '❌ missing');
  console.log('  - sessionStorage.af_user_session:', hasSessionStorage ? '✅ present' : '❌ missing');
  console.log('  - isMobileSafari:', isMobileSafari);
  
  if (!hasLocalStorage && !hasSessionStorage) {
    try {
      console.log('📋 No stored user found, attempting to restore from server session...');
      const authData = await restoreClientAuthFromSession();
      console.log('✅ Session restored successfully from server:', authData.user?.email);
    } catch (err) {
      console.error('❌ Session restore failed:', {
        message: err.message,
        status: err.status,
        timestamp: new Date().toISOString(),
      });
      clearClientAuthState();
      sessionStorage.removeItem('af_user_session'); // Clear fallback on auth failure
      if (err.status === 401) {
        console.log('🔐 Server returned 401 Not authenticated, redirecting to auth-form');
        window.location.replace('/auth-form');
        return;
      }
      // For other errors (network issues), don't block the user
      console.warn('⚠️ Auth check error (non-401) but continuing anyway:', err.message);
    }
  } else if (hasLocalStorage) {
    console.log('✅ af_user found in localStorage, skipping server session restore');
  } else if (hasSessionStorage && isMobileSafari) {
    console.log('📱 Mobile Safari: restoring from sessionStorage fallback');
    localStorage.setItem('af_user', sessionStorage.getItem('af_user_session'));
  }

  const rows = [...block.children];
  const title = rows[0]?.children[0]?.textContent.trim() || '';
  const subtitle = rows[0]?.children[1]?.textContent.trim() || '';

  block.innerHTML = '';
  render(html`<${CardsDisplay} initialTitle=${title} initialSubtitle=${subtitle} blockElement=${block} />`, block);
}
