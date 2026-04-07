import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';
import {
  BackIcon, EditIcon, HeartIcon,
} from '../../scripts/utils/icons.js';
import { API_BASE } from '../../scripts/utils/constants.js';

// ArrowIcon remains local — it is the Spectrum-specific RTL arrow (18x18 variant)
const ArrowIcon = () => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path d="M11.5 8.5H2v1h9.5l-3.5 3.5 .7.7 4.7-4.7-4.7-4.7-.7.7 3.5 3.5z" fill="currentColor"/>
  </svg>
`;

/**
 * Reads the currently logged-in user from localStorage (set by auth-form on login/signup).
 * Returns null if not logged in.
 */
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('af_user') || 'null'); } catch { return null; }
}

/**
 * Opens /create-post in edit mode by stashing the post data in sessionStorage
 * and navigating — avoids URL length limits (body can be large HTML).
 */
function openEditForm(post, sid) {
  const editData = {
    id: post.id,
    title: post.title,
    body: post.body,
    tags: (post.tags || []).map((t) => t.replace(/^#/, '')),
    category: post.topic || '',
    sidebarItemId: sid || null, // so create-post can move the file location
  };
  localStorage.setItem('edit-post-draft', JSON.stringify(editData));
  window.location.href = '/edit-post';
}

/**
 * Returns true if currentUser is the creator of this post.
 */
function isOwner(post, currentUser) {
  if (!currentUser || !post?.createdBy) return false;
  // eslint-disable-next-line no-underscore-dangle
  return String(post.createdBy) === String(currentUser._id);
}

// Module-level variable: set by decorate() when arriving via cross-page
// navigation. The ForumPost useEffect reads and clears it on mount.
let pendingCrossPagePostId = null;

// ============================================
// FORUM POST
// ============================================

const ForumPost = ({ blockEl }) => {
  const [post, setPost] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarItemId, setSidebarItemId] = useState(null); // the SidebarItem linking this post
  const [reviewData, setReviewData] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  // Local state for likes and views to allow optimistic updates
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);

  const commentsListRef = useRef(null);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (commentsListRef.current && post) {
      commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
    }
  }, [post?.comments]);

  // Load current user on mount + re-load when auth state changes
  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const onAuthChanged = () => setCurrentUser(getCurrentUser());
    window.addEventListener('forum-auth-changed', onAuthChanged);
    return () => window.removeEventListener('forum-auth-changed', onAuthChanged);
  }, []);

  // Language label map
  const LANG_LABELS = {
    html: 'HTML',
    css: 'CSS',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    bash: 'Bash',
    json: 'JSON',
    sql: 'SQL',
    dart: 'Dart',
    go: 'Go',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    java: 'Java',
    graphql: 'GraphQL',
    plaintext: 'Plain Text',
  };

  // Copy SVG icon string
  const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`;

  // Build tabbed code viewer from all <pre> tags in the post body
  useEffect(() => {
    if (!post || !post.body) return;

    const preTags = document.querySelectorAll('.post-body-raw pre');
    if (preTags.length === 0) return;

    // Collect snippet data before touching the DOM
    const snippets = Array.from(preTags).map((pre) => ({
      lang: pre.dataset.language || 'plaintext',
      code: pre.textContent,
    }));

    // Build the outer wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-tabs-wrapper';

    // ── Tab bar ──────────────────────────────────────────────
    const tabBar = document.createElement('div');
    tabBar.className = 'code-tabbar';

    const tabList = document.createElement('div');
    tabList.className = 'code-tab-list';

    // Copy button (right side of tab bar)
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'code-copy-btn';
    copyBtn.title = 'Copy code';
    copyBtn.innerHTML = COPY_SVG;

    tabBar.appendChild(tabList);
    tabBar.appendChild(copyBtn);

    // ── Panels container ─────────────────────────────────────
    const panelsContainer = document.createElement('div');
    panelsContainer.className = 'code-panels';

    // Track active snippet index for copy
    let activeIndex = 0;

    // Helper: activate a tab + panel by index
    const activateTab = (idx) => {
      activeIndex = idx;
      tabList.querySelectorAll('.code-tab').forEach((t, ti) => {
        t.classList.toggle('active', ti === idx);
      });
      panelsContainer.querySelectorAll('.code-panel').forEach((p, pi) => {
        p.classList.toggle('active', pi === idx);
      });
    };

    // Build each tab + panel
    snippets.forEach(({ lang, code }, i) => {
      const label = LANG_LABELS[lang] || lang.toUpperCase();

      // Tab
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `code-tab${i === 0 ? ' active' : ''}`;
      tab.dataset.idx = String(i);
      tab.textContent = label;
      tab.addEventListener('mousedown', (e) => {
        e.preventDefault();
        activateTab(i);
      });
      tabList.appendChild(tab);

      // Panel
      const panel = document.createElement('div');
      panel.className = `code-panel${i === 0 ? ' active' : ''}`;

      // Language badge (top-right)
      const badge = document.createElement('span');
      badge.className = `code-lang-badge code-badge-${lang}`;
      badge.textContent = lang === 'plaintext' ? 'TEXT' : lang.toUpperCase();
      panel.appendChild(badge);

      // Line numbers
      const lines = code.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      const gutter = document.createElement('div');
      gutter.className = 'tabs-gutter';
      lines.forEach((_, idx) => {
        const span = document.createElement('span');
        span.className = 'tabs-num';
        span.textContent = idx + 1;
        gutter.appendChild(span);
      });

      const content = document.createElement('div');
      content.className = 'tabs-content';
      content.textContent = code;

      const codeBody = document.createElement('div');
      codeBody.className = 'code-body';
      codeBody.appendChild(gutter);
      codeBody.appendChild(content);
      panel.appendChild(codeBody);

      panelsContainer.appendChild(panel);
    });

    // Copy button click
    copyBtn.addEventListener('click', () => {
      const activePanel = panelsContainer.querySelectorAll('.code-panel')[activeIndex];
      const text = activePanel?.querySelector('.tabs-content')?.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.title = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.title = 'Copy code';
        }, 1800);
      }).catch(() => { });
    });

    wrapper.appendChild(tabBar);
    wrapper.appendChild(panelsContainer);

    // Remove all <pre>s from their current positions in the body
    preTags.forEach((pre) => pre.remove());

    // Append the tabbed viewer at the END of the post body
    const postBody = document.querySelector('.post-body-raw');
    if (!postBody) return;

    postBody.appendChild(wrapper);
  }, [post]);

  // Also listen for edit-post:saved so we can refresh the view after a save
  useEffect(() => {
    const handlePostSaved = (e) => {
      const updated = e.detail;
      if (!updated || !post || updated.id !== post.id) return;
      setPost((prev) => (prev ? { ...prev, ...updated } : prev));
    };
    window.addEventListener('edit-post:saved', handlePostSaved);
    return () => window.removeEventListener('edit-post:saved', handlePostSaved);
  }, [post]);

  // Enforce block + section visibility after every render where post changes.
  // Runs AFTER Preact commits to the DOM — guaranteed to win over AEM.
  useEffect(() => {
    if (!blockEl) return;
    if (post) {
      [blockEl, blockEl.closest('.section'), blockEl.parentElement].filter(Boolean).forEach((el) => {
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
      });
      document.querySelectorAll(
        '.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards',
      ).forEach((el) => { el.style.setProperty('display', 'none', 'important'); });
    } else {
      blockEl.style.display = 'none';
    }
  }, [post, blockEl]);

  useEffect(() => {
    const handleLoadPost = async (event) => {
      const { postId, sidebarItemId: sid } = event.detail;
      if (!postId) return;
      setSidebarItemId(sid || null);

      setLoading(true);

      // Show this block, hide cards
      if (blockEl) blockEl.style.display = 'block';
      const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
      cardsWrappers.forEach((el) => { el.style.display = 'none'; });

      try {
        // Always fetch WITHOUT ?view=1 — we decide after we know the author
        const url = `${API_BASE}/posts/${postId}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.post) {
            const fetchedPost = data.post;
            const cb = fetchedPost.createdBy;
            // Build author name from populated createdBy or fall back
            const authorName = (cb?.firstName)
              ? `${cb.firstName} ${cb.lastName || ''}`.trim()
              : (fetchedPost.author || 'Anonymous');
            const transformedPost = {
              // eslint-disable-next-line no-underscore-dangle
              id: fetchedPost._id,
              title: fetchedPost.title,
              topic: fetchedPost.category,
              author: authorName,
              // Store createdBy id so we can check ownership
              // eslint-disable-next-line no-underscore-dangle
              createdBy: cb ? String(cb._id || cb) : null,
              tags: fetchedPost.tags || [],
              body: fetchedPost.body,
              status: fetchedPost.status || 'published',
              comments: [],
            };
            setPost(transformedPost);

            // ── View increment — skip for the post's own author ───────────────
            const cu = getCurrentUser();
            // eslint-disable-next-line no-underscore-dangle
            const isAuthor = cu && cu._id && String(cu._id) === String(cb?._id || cb || '');
            if (!isAuthor) {
              const viewedPosts = JSON.parse(localStorage.getItem('af_viewed_posts') || '[]');
              if (!viewedPosts.includes(postId)) {
                // Fire-and-forget — increment on the server
                fetch(`${API_BASE}/posts/${postId}?view=1`).catch(() => { });
                viewedPosts.push(postId);
                localStorage.setItem('af_viewed_posts', JSON.stringify(viewedPosts));
                // Show the incremented count locally too
                fetchedPost.views = (fetchedPost.views || 0) + 1;
              }
            }
            // ─────────────────────────────────────────────────────────────────

            const fetchedLikes = fetchedPost.likes || [];
            setLikesCount(fetchedLikes.length);
            setViewsCount(fetchedPost.views || 0);

            // Broadcast the loaded view count to any listening components (like the cards)
            window.dispatchEvent(new CustomEvent('af-post-updated', {
              detail: {
                // eslint-disable-next-line no-underscore-dangle
                id: fetchedPost._id,
                views: fetchedPost.views || 0,
                likes: fetchedLikes.length,
              },
            }));

            // Check if current user explicitly likes this post (cu already declared above)
            // eslint-disable-next-line no-underscore-dangle
            if (cu && cu._id) {
              // eslint-disable-next-line no-underscore-dangle
              setHasLiked(fetchedLikes.includes(String(cu._id)));
            } else {
              setHasLiked(false);
            }

            // Fetch review data for this post
            // eslint-disable-next-line no-underscore-dangle
            const reviewUrl = `${API_BASE}/reviews/by-post/${fetchedPost._id}`;
            fetch(reviewUrl, { credentials: 'include' })
              .then((r) => { if (r.ok) return r.json(); return null; })
              .then((d) => {
                if (d && d.success) setReviewData(d.review);
                else setReviewData(null);
              })
              .catch(() => setReviewData(null));

            // If sidebarItemId wasn't supplied by the event (e.g. opened from cards view),
            // look it up so the Edit button can use it for location-move support.
            if (!sid) {
              fetch(`${API_BASE}/sidebar-items/by-post/${postId}`)
                .then((r) => r.json())
                .then((d) => { if (d.success) setSidebarItemId(d.sidebarItemId); })
                .catch(() => { /* non-fatal — edit will still work, just won't move */ });
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Network/fetch error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    // Listen for back-to-cards event
    const handleShowCards = () => {
      setPost(null);
      if (blockEl) blockEl.style.display = 'none';
      const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
      cardsWrappers.forEach((el) => { el.style.display = ''; });

      const tag = document.getElementById('af-hide-cards-initial');
      if (tag) tag.remove();
    };

    // Navigate away if the currently viewed post is deleted from the sidebar
    const handleItemDeleted = (e) => {
      const { itemId } = e.detail || {};
      if (itemId && sidebarItemId && itemId === sidebarItemId) {
        window.location.href = '/';
      }
    };

    window.addEventListener('load-forum-post', handleLoadPost);
    window.addEventListener('show-cards', handleShowCards);
    window.addEventListener('sidebar-item-deleted', handleItemDeleted);

    // Cross-page navigation: decorate() already read sessionStorage and
    // set pendingCrossPagePostId + injected a <style> to hide cards.
    // Call the handler directly — the listener is already attached above.
    if (pendingCrossPagePostId) {
      const pid = pendingCrossPagePostId;
      pendingCrossPagePostId = null;
      handleLoadPost({ detail: { postId: pid } }).then(() => {
        // We purposefully leave the `af-hide-cards-initial` style tag in the DOM.
        // It provides a guaranteed CSS-level block on the cards wrapper.
        // It will be cleaned up only when the user explicitly clicks "Home" or "Back"
        // (inside handleShowCards).
      });
    }

    return () => {
      window.removeEventListener('load-forum-post', handleLoadPost);
      window.removeEventListener('show-cards', handleShowCards);
      window.removeEventListener('sidebar-item-deleted', handleItemDeleted);
    };
  }, [blockEl, sidebarItemId]);

  if (!post) {
    return html`
      <div class="forum-post-wrapper">
        <div class="loading-state">
          ${loading ? 'Loading post...' : ''}
        </div>
      </div>
    `;
  }

  const addComment = () => {
    if (!inputValue.trim()) return;
    const newComment = { user: 'You', text: inputValue };
    setPost({
      ...post,
      comments: [...post.comments, newComment],
    });
    setInputValue('');
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('show-cards'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleLike = async () => {
    if (!currentUser) {
      // Prompt user to login if attempting to like without auth
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }

    // Optimistic UI Update
    const originallyLiked = hasLiked;
    const newLikesCount = originallyLiked ? likesCount - 1 : likesCount + 1;
    setHasLiked(!originallyLiked);
    setLikesCount(newLikesCount);

    // Broadcast optimistic update
    window.dispatchEvent(new CustomEvent('af-post-updated', {
      detail: { id: post.id, likes: newLikesCount },
    }));

    try {
      const response = await fetch(`${API_BASE}/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Server rejected like toggle');
      }
    } catch (error) {
      // Revert on failure
      const revertedLikesCount = originallyLiked ? newLikesCount + 1 : newLikesCount - 1;
      setHasLiked(originallyLiked);
      setLikesCount(revertedLikesCount);

      // Broadcast revert
      window.dispatchEvent(new CustomEvent('af-post-updated', {
        detail: { id: post.id, likes: revertedLikesCount },
      }));
    }
  };

  const canEdit = isOwner(post, currentUser);

  // Determine review context
  // eslint-disable-next-line no-underscore-dangle
  const currentUserId = currentUser ? String(currentUser._id) : null;
  const isReviewer = reviewData && currentUserId
    ? reviewData.reviewers.some((rv) => {
      const rvId = rv.userId && typeof rv.userId === 'object'
        // eslint-disable-next-line no-underscore-dangle
        ? String(rv.userId._id) : String(rv.userId);
      return rvId === currentUserId;
    })
    : false;
  const postStatus = post.status || 'published';
  const showReviewPanel = isReviewer && (postStatus === 'pending_review' || postStatus === 'changes_requested');
  const showChangesRequestedBanner = canEdit && postStatus === 'changes_requested';

  const handleReviewAction = async (actionStatus) => {
    if (!reviewData) return;

    if (actionStatus === 'changes_requested' && !reviewComment.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please provide a comment explaining what changes are needed.');
      return;
    }

    try {
      // eslint-disable-next-line no-underscore-dangle
      const response = await fetch(`${API_BASE}/reviews/${reviewData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: actionStatus, comment: reviewComment }),
      });
      if (response.ok) {
        setReviewComment('');
        window.dispatchEvent(new CustomEvent('refresh-sidebar'));
        window.dispatchEvent(new CustomEvent('refresh-cards'));

        // After any review action, go back to cards view / home
        window.dispatchEvent(new CustomEvent('show-cards'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Review action failed:', err);
    }
  };

  const handleResubmit = async () => {
    if (!reviewData) return;
    try {
      // eslint-disable-next-line no-underscore-dangle
      const response = await fetch(`${API_BASE}/reviews/${reviewData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetAll: true }),
      });
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('refresh-sidebar'));
        window.dispatchEvent(new CustomEvent('refresh-cards'));
        // Re-fetch review + post
        const rRes = await fetch(`${API_BASE}/reviews/by-post/${post.id}`, { credentials: 'include' });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData.success) setReviewData(rData.review);
        }
        setPost((prev) => ({ ...prev, status: 'pending_review' }));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Re-submit failed:', err);
    }
  };

  return html`
    <div class="forum-post-wrapper">
      ${loading && html`<div class="loading-overlay">Loading post...</div>`}

      <button
        class="spectrum-action-button spectrum-action-button-size-m spectrum-action-button-quiet forum-back-btn"
        onClick=${handleBack}
        aria-label="Back to Posts"
      >
        <${BackIcon} />
        <span class="spectrum-action-button-label">Back to Posts</span>
      </button>

      <div class="tags-row">
        ${post.tags.map((tag) => html`<span class="tag-pill">${tag}</span>`)}
      </div>

      <div class="post-title-row">
        <h1 class="post-title">${post.title}</h1>
        ${canEdit && html`
          <button class="post-edit-btn" title="Edit post" onClick=${() => openEditForm(post, sidebarItemId)}>
            <${EditIcon} />
            <span>Edit</span>
          </button>
        `}
      </div>

      <div class="post-meta">
        <span class="author-name">${post.author}</span>
        <span class="meta-separator">•</span>
        <span class="topic-name">${post.topic}</span>
        <span class="meta-separator">•</span>
        <span class="views-count">${viewsCount} Views</span>

        <button 
          class="like-btn ${hasLiked ? 'liked' : ''}" 
          onClick=${toggleLike}
          aria-label=${hasLiked ? 'Unlike post' : 'Like post'}
        >
          <${HeartIcon} filled=${hasLiked} />
          <span class="like-count">${likesCount}</span>
        </button>
      </div>

      ${showChangesRequestedBanner && html`
        <div class="review-changes-banner" style="background-color: #fff9e6; border: 1px solid #fec700; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b26e00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style="color: #b26e00; font-weight: 500;">Changes were requested \u2014 edit your post and re-submit for review.</span>
            </div>
            <button class="review-resubmit-btn" onClick=${handleResubmit} style="background-color: #d17f00; color: white; border: none; padding: 6px 16px; border-radius: 4px; font-weight: 600; cursor: pointer;">
              Re-submit for Review
            </button>
          </div>
          
          ${reviewData && reviewData.reviewers && reviewData.reviewers.some((rv) => rv.status === 'changes_requested' && rv.comment) ? html`
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(218, 31, 38, 0.2);">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #da1f26; text-transform: uppercase;">Reviewer Feedback:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b4b4b;">
                ${reviewData.reviewers.filter((rv) => rv.status === 'changes_requested' && rv.comment).map((rv) => html`
                  <li style="margin-bottom: 6px;">
                    <strong>${rv.userId?.firstName || 'Reviewer'}:</strong>
                    <span style="margin-left: 4px; font-style: italic;">"${rv.comment}"</span>
                  </li>
                `)}
              </ul>
            </div>
          ` : null}
        </div>
      `}

      <div
        class="post-body-raw"
        dangerouslySetInnerHTML=${{ __html: post.body }}
      />

      ${showReviewPanel && html`
        <div class="review-panel">
          <h3 class="review-panel-title">Peer Review</h3>
          <p class="review-panel-desc">You have been asked to review this post. Please provide your feedback below.</p>
          <textarea
            class="review-textarea"
            placeholder="Add a comment (optional)..."
            value=${reviewComment}
            onInput=${(e) => setReviewComment(e.target.value)}
            rows="3"
          />
          <div class="review-panel-actions">
            <button
              class="review-btn review-btn-approve"
              onClick=${() => handleReviewAction('approved')}
              title="Approve post"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approve
            </button>
            <button class="review-btn review-btn-changes" onClick=${() => handleReviewAction('changes_requested')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Request Changes
            </button>
          </div>
        </div>
      `}

      <hr class="post-divider" />

      <div class="discussion-section">
        <h3 class="discussion-header">
          Discussion <span class="count">(${post.comments.length})</span>
        </h3>

        <div class="comments-list" ref=${commentsListRef}>
          ${post.comments.map((c) => html`
            <div class="comment-row">
              <div class="comment-avatar">${c.user.charAt(0)}</div>
              <div class="comment-body">
                <div class="comment-user">${c.user}</div>
                <div class="comment-text">${c.text}</div>
              </div>
            </div>
          `)}
        </div>

        <div class="comment-form-container">
          <div class="comment-input-wrapper">
            <input
              type="text"
              placeholder="Add a comment..."
              class="comment-input"
              value=${inputValue}
              onInput=${(e) => setInputValue(e.target.value)}
              onKeyDown=${(e) => e.key === 'Enter' && addComment()}
            />
            <button class="send-btn" onClick=${addComment} aria-label="Post comment">
              <${ArrowIcon} />
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};

export default function decorate(block) {
  block.innerHTML = '';

  const storedPostId = sessionStorage.getItem('af_open_post');
  if (storedPostId) {
    sessionStorage.removeItem('af_open_post');
    pendingCrossPagePostId = storedPostId;

    // ── Force the block AND every ancestor visible immediately ──
    // AEM's loadSections() sets sections to display:none and only reveals
    // them as they scroll into view. We must counteract this for the
    // forum-post section since it needs to be visible on arrival.
    const forceVisible = (el) => {
      if (!el || el === document.body) return;
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      forceVisible(el.parentElement);
    };
    forceVisible(block);

    // MutationObserver: AEM may reset display AFTER decorate() runs.
    // Watch the block and its parent section — undo any display:none instantly.
    const section = block.closest('.section') || block.parentElement;
    const targets = [block, section].filter(Boolean);
    const observer = new MutationObserver(() => {
      targets.forEach((t) => {
        if (t && t.style.display === 'none') {
          t.style.setProperty('display', 'block', 'important');
          t.style.setProperty('visibility', 'visible', 'important');
        }
      });
    });
    targets.forEach((t) => observer.observe(t, { attributes: true, attributeFilter: ['style', 'class'] }));
    // Disconnect after 5s — by then AEM is done loading
    setTimeout(() => observer.disconnect(), 5000);

    // CSS rule to hide cards before they even mount
    if (!document.getElementById('af-hide-cards-initial')) {
      const style = document.createElement('style');
      style.id = 'af-hide-cards-initial';
      style.textContent = [
        '.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards',
        '{ display: none !important; }',
      ].join(' ');
      document.head.appendChild(style);
    }
  } else {
    // Normal page load — hide until a post is selected
    block.style.display = 'none';
  }

  render(html`<${ForumPost} blockEl=${block} />`, block);
}
