import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

const API_BASE = 'http://localhost:5000/api';

// ============================================
// ICONS
// ============================================

const ArrowIcon = () => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path d="M11.5 8.5H2v1h9.5l-3.5 3.5 .7.7 4.7-4.7-4.7-4.7-.7.7 3.5 3.5z" fill="currentColor"/>
  </svg>
`;

const BackIcon = () => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
`;

const EditIcon = () => html`
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="display:block;flex-shrink:0;">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

const HeartIcon = ({ filled }) => html`
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
    fill="${filled ? 'currentColor' : 'none'}" 
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    class="${filled ? 'heart-filled' : 'heart-outline'}">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
`;

// ============================================
// HELPERS
// ============================================

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

  // Transform raw <pre> tags into the locked two-column Flexbox layout
  useEffect(() => {
    if (!post || !post.body) return;

    const preTags = document.querySelectorAll('.post-body-raw pre');
    preTags.forEach((pre) => {
      if (pre.classList.contains('formatted-code-block')) return;

      const codeText = pre.textContent;
      const lines = codeText.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      const gutter = document.createElement('div');
      gutter.className = 'code-gutter';
      lines.forEach((_, i) => {
        const span = document.createElement('span');
        span.textContent = i + 1;
        gutter.appendChild(span);
      });

      const content = document.createElement('div');
      content.className = 'code-content';
      content.textContent = codeText;

      pre.innerHTML = '';
      pre.classList.add('formatted-code-block');
      pre.appendChild(gutter);
      pre.appendChild(content);
    });
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

            // Check if current user explicitly likes this post
            const cu = getCurrentUser();
            // eslint-disable-next-line no-underscore-dangle
            if (cu && cu._id) {
              // eslint-disable-next-line no-underscore-dangle
              setHasLiked(fetchedLikes.includes(String(cu._id)));
            } else {
              setHasLiked(false);
            }

            // Fetch review data for this post
            // eslint-disable-next-line no-underscore-dangle
            fetch(`${API_BASE}/reviews/by-post/${fetchedPost._id}`, { credentials: 'include' })
              .then((r) => { if (r.ok) return r.json(); return null; })
              .then((d) => { if (d && d.success) setReviewData(d.review); else setReviewData(null); })
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

        if (actionStatus === 'changes_requested') {
          // Go back to the homepage / cards view
          window.dispatchEvent(new CustomEvent('show-cards'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Re-fetch review data
        // eslint-disable-next-line no-underscore-dangle
        const rRes = await fetch(`${API_BASE}/reviews/by-post/${post.id}`, { credentials: 'include' });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData.success) setReviewData(rData.review);
        }
        // Re-fetch post to get updated status
        const pRes = await fetch(`${API_BASE}/posts/${post.id}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && pData.post) {
            setPost((prev) => ({ ...prev, status: pData.post.status }));
          }
        }
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
        <div class="review-changes-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Changes were requested \u2014 edit your post and re-submit for review.</span>
          <button class="review-resubmit-btn" onClick=${handleResubmit}>Re-submit for Review</button>
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
            <button class="review-btn review-btn-approve" onClick=${() => handleReviewAction('approved')}>
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
  // Hide the block initially — it only shows when a post is loaded
  block.style.display = 'none';
  block.innerHTML = '';
  render(html`<${ForumPost} blockEl=${block} />`, block);
}
