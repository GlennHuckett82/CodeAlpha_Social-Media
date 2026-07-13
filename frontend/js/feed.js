import api from './api.js';
import { requireAuth, getCurrentUser } from './auth-guard.js';

requireAuth();

const currentUser = getCurrentUser();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const postFeed      = document.getElementById('post-feed');
const postTemplate  = document.getElementById('post-card-template');
const composeForm   = document.getElementById('compose-form');
const composeContent = document.getElementById('compose-content');
const composeImage  = document.getElementById('compose-image');
const charCounter   = document.getElementById('char-counter');
const postSubmitBtn = document.getElementById('post-submit-btn');
const loadMoreBtn   = document.getElementById('load-more-btn');
const feedErrorDiv  = document.getElementById('feed-error');
const feedEmptyMsg  = document.getElementById('feed-empty');

// ── State ────────────────────────────────────────────────────────────────────
let currentPage = 1;
let isLoading   = false;
let hasMore     = true;

// ── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000; // seconds
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function showFeedError(msg) {
  feedErrorDiv.textContent = msg;
  feedErrorDiv.hidden = false;
}

function hideFeedError() {
  feedErrorDiv.textContent = '';
  feedErrorDiv.hidden = true;
}

function updateEmptyState() {
  feedEmptyMsg.hidden = postFeed.children.length > 0;
}

// ── Build a comment <li> from a comment object ────────────────────────────────
// comment.author may be a populated object or a bare ObjectId string
function buildCommentNode(comment, postId) {
  const li = document.createElement('li');
  li.className = 'comment-item';
  li.dataset.commentId = comment._id;

  const authorIsObj = comment.author && typeof comment.author === 'object';
  const username    = authorIsObj ? comment.author.username    : null;
  const displayName = authorIsObj ? (comment.author.displayName || username) : null;
  const authorId    = authorIsObj ? comment.author._id : String(comment.author);

  const meta = document.createElement('div');
  meta.className = 'comment-meta';

  if (displayName) {
    const nameEl = document.createElement('span');
    nameEl.className = 'comment-author';
    nameEl.textContent = displayName;
    meta.appendChild(nameEl);
  }

  if (username) {
    const handleEl = document.createElement('span');
    handleEl.className = 'comment-handle';
    handleEl.textContent = ` @${username}`;
    meta.appendChild(handleEl);
  }

  const timeEl = document.createElement('span');
  timeEl.className = 'comment-time';
  timeEl.textContent = ` · ${relativeTime(comment.createdAt)}`;
  meta.appendChild(timeEl);

  // Delete button — only for own comments (when we know the author)
  const isOwn = currentUser && authorId && authorId === currentUser.id;
  if (isOwn) {
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'post-card__action-btn comment-delete-btn';
    delBtn.setAttribute('aria-label', 'Delete comment');
    delBtn.textContent = '✕';
    meta.appendChild(delBtn);
  }

  const textEl = document.createElement('p');
  textEl.className = 'comment-text';
  textEl.textContent = comment.content;

  li.append(meta, textEl);
  return li;
}

// ── Build a post card <li> from a post object ─────────────────────────────────
function buildPostCard(post) {
  const frag = postTemplate.content.cloneNode(true);
  const li   = frag.querySelector('.post-card');
  li.dataset.postId = post._id;

  // Avatar
  const avatar = li.querySelector('.post-card__avatar');
  const avatarUrl = post.author.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=1d9bf0&color=fff&size=48`;
  avatar.src = avatarUrl;

  // Profile link
  const profileLink = li.querySelector('.post-card__profile-link');
  profileLink.href = `profile.html?u=${encodeURIComponent(post.author.username)}`;
  profileLink.textContent = post.author.displayName || post.author.username;

  // Username + time
  li.querySelector('.post-card__username').textContent = `@${post.author.username}`;
  const timeEl = li.querySelector('.post-card__time');
  timeEl.textContent = relativeTime(post.createdAt);
  timeEl.dateTime = post.createdAt;

  // Content
  li.querySelector('.post-card__content').textContent = post.content;

  // Optional image
  const imgEl = li.querySelector('.post-card__image');
  if (post.imageUrl) {
    imgEl.src = post.imageUrl;
    imgEl.hidden = false;
    imgEl.addEventListener('error', () => { imgEl.hidden = true; });
  }

  // Avatar fallback
  avatar.addEventListener('error', () => { avatar.hidden = true; });

  // Like button
  const liked = currentUser && Array.isArray(post.likes)
    && post.likes.some((id) => String(id) === currentUser.id);
  const likeBtn = li.querySelector('.post-card__like-btn');
  likeBtn.classList.toggle('post-card__action-btn--liked', liked);
  likeBtn.setAttribute('aria-pressed', String(liked));
  likeBtn.querySelector('.like-icon').textContent = liked ? '♥' : '♡';
  li.querySelector('.like-count').textContent = post.likeCount ?? post.likes.length;

  // Comment count
  li.querySelector('.comment-count').textContent = post.commentCount ?? post.comments.length;

  // Delete button (own posts only)
  const deleteBtn = li.querySelector('.post-card__delete-btn');
  if (currentUser && post.author._id === currentUser.id) {
    deleteBtn.hidden = false;
  }

  // Pre-render existing comments (author may not be populated from feed)
  const commentList = li.querySelector('.comment-list');
  if (Array.isArray(post.comments)) {
    post.comments.forEach((c) => commentList.appendChild(buildCommentNode(c, post._id)));
  }

  return li;
}

// ── Wire interactive events on a rendered post card ───────────────────────────
function wirePostCard(li) {
  const postId = li.dataset.postId;

  // ── Like toggle ──
  li.querySelector('.post-card__like-btn').addEventListener('click', async () => {
    try {
      const { liked, likeCount } = await api.likes.toggleLike(postId);
      const likeBtn = li.querySelector('.post-card__like-btn');
      likeBtn.classList.toggle('post-card__action-btn--liked', liked);
      likeBtn.setAttribute('aria-pressed', String(liked));
      likeBtn.querySelector('.like-icon').textContent = liked ? '♥' : '♡';
      li.querySelector('.like-count').textContent = likeCount;
    } catch { /* silent */ }
  });

  // ── Comments toggle ──
  const commentsSection = li.querySelector('.post-card__comments');
  li.querySelector('.post-card__comment-btn').addEventListener('click', () => {
    const nowHidden = !commentsSection.hidden;
    commentsSection.hidden = nowHidden;
    if (!nowHidden) {
      commentsSection.querySelector('.comment-input').focus();
    }
  });

  // ── Add comment ──
  const commentForm = li.querySelector('.comment-form');
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input   = commentForm.querySelector('.comment-input');
    const content = input.value.trim();
    if (!content) return;
    const submitBtn = commentForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const { data: updatedPost } = await api.comments.addComment(postId, { content });
      // The response contains the full post with last comment populated
      const newComment = updatedPost.comments[updatedPost.comments.length - 1];
      const commentList = li.querySelector('.comment-list');
      commentList.appendChild(buildCommentNode(newComment, postId));
      input.value = '';
      // Update count
      const countEl = li.querySelector('.comment-count');
      countEl.textContent = Number(countEl.textContent) + 1;
    } catch { /* silent */ }
    finally { submitBtn.disabled = false; }
  });

  // ── Delete comment (delegated) ──
  li.querySelector('.comment-list').addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.comment-delete-btn');
    if (!delBtn) return;
    const commentItem = delBtn.closest('.comment-item');
    const commentId   = commentItem.dataset.commentId;
    try {
      await api.comments.deleteComment(postId, commentId);
      commentItem.remove();
      const countEl = li.querySelector('.comment-count');
      countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
    } catch { /* silent */ }
  });

  // ── Delete post ──
  const deleteBtn = li.querySelector('.post-card__delete-btn');
  if (!deleteBtn.hidden) {
    deleteBtn.addEventListener('click', async () => {
      // eslint-disable-next-line no-alert
      if (!window.confirm('Delete this post? This cannot be undone.')) return;
      try {
        await api.posts.deletePost(postId);
        li.remove();
        updateEmptyState();
      } catch { /* silent */ }
    });
  }
}

// ── Render an array of posts into the feed ────────────────────────────────────
function renderPosts(posts, prepend = false) {
  posts.forEach((post) => {
    const li = buildPostCard(post);
    wirePostCard(li);
    if (prepend) {
      postFeed.prepend(li);
    } else {
      postFeed.appendChild(li);
    }
  });
  updateEmptyState();
}

// ── Load a page of posts ──────────────────────────────────────────────────────
async function loadFeed() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading…';
  hideFeedError();

  try {
    const { data: posts, pagination } = await api.posts.getFeed({ page: currentPage, limit: 10 });
    renderPosts(posts);
    hasMore = currentPage < pagination.totalPages;
    if (hasMore) {
      currentPage += 1;
    } else {
      loadMoreBtn.hidden = true;
    }
  } catch (err) {
    showFeedError(err.message || 'Failed to load posts.');
  } finally {
    isLoading = false;
    loadMoreBtn.disabled = false;
    if (hasMore) loadMoreBtn.textContent = 'Load more';
  }
}

// ── Compose form ──────────────────────────────────────────────────────────────
composeContent.addEventListener('input', () => {
  const len = composeContent.value.length;
  charCounter.textContent = `${len} / 500`;
  charCounter.classList.toggle('char-counter--warn', len > 450);
});

composeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideFeedError();
  const content  = composeContent.value.trim();
  if (!content) return;
  const imageUrl = composeImage.value.trim() || undefined;

  postSubmitBtn.disabled = true;
  postSubmitBtn.textContent = 'Posting…';

  try {
    const { data: rawPost } = await api.posts.createPost({
      content,
      ...(imageUrl && { imageUrl }),
    });

    // Author is not populated in create response — inject current user
    const newPost = {
      ...rawPost,
      author: {
        _id:         currentUser.id,
        username:    currentUser.username,
        displayName: currentUser.displayName || currentUser.username,
        avatarUrl:   '',
      },
      likes:        [],
      comments:     [],
      likeCount:    0,
      commentCount: 0,
    };

    renderPosts([newPost], true);
    composeContent.value = '';
    composeImage.value   = '';
    charCounter.textContent = '0 / 500';
    charCounter.classList.remove('char-counter--warn');
  } catch (err) {
    showFeedError(err.message || 'Failed to create post.');
  } finally {
    postSubmitBtn.disabled = false;
    postSubmitBtn.textContent = 'Post';
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  loadMoreBtn.addEventListener('click', loadFeed);
});
