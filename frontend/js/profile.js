import api from './api.js';
import { requireAuth, getCurrentUser } from './auth-guard.js';

requireAuth();

const currentUser = getCurrentUser();

// ── URL param ─────────────────────────────────────────────────────────────────
// Links use ?u=username (consistent with header.js and feed.js)
const params   = new URLSearchParams(window.location.search);
const username = params.get('u') || currentUser.username;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const avatarEl          = document.getElementById('profile-avatar');
const displayNameEl     = document.getElementById('profile-display-name');
const usernameEl        = document.getElementById('profile-username');
const bioEl             = document.getElementById('profile-bio');
const statPosts         = document.getElementById('stat-posts');
const statFollowers     = document.getElementById('stat-followers');
const statFollowing     = document.getElementById('stat-following');
const actionsEl         = document.getElementById('profile-actions');
const editSection       = document.getElementById('edit-profile-section');
const editForm          = document.getElementById('edit-profile-form');
const editDisplayName   = document.getElementById('edit-display-name');
const editBio           = document.getElementById('edit-bio');
const editAvatarUrl     = document.getElementById('edit-avatar-url');
const editErrorDiv      = document.getElementById('edit-error');
const saveBtn           = document.getElementById('save-profile-btn');
const cancelEditBtn     = document.getElementById('cancel-edit-btn');
const profileErrorDiv   = document.getElementById('profile-error');
const postsList         = document.getElementById('profile-posts');
const postsEmptyMsg     = document.getElementById('profile-posts-empty');
const loadMoreBtn       = document.getElementById('load-more-btn');
const postTemplate      = document.getElementById('post-card-template');

// ── State ─────────────────────────────────────────────────────────────────────
let profileData   = null;
let isFollowing   = false;
let postsPage     = 1;
let postsLoading  = false;
let postsHasMore  = true;

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function avatarSrc(user) {
  return user.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=1d9bf0&color=fff&size=96`;
}

function showProfileError(msg) {
  profileErrorDiv.textContent = msg;
  profileErrorDiv.hidden = false;
}

function showEditError(msg) {
  editErrorDiv.textContent = msg;
  editErrorDiv.hidden = false;
}

function hideEditError() {
  editErrorDiv.textContent = '';
  editErrorDiv.hidden = true;
}

// ── Post card helpers (mirrored from feed.js) ─────────────────────────────────
function buildCommentNode(comment) {
  const li = document.createElement('li');
  li.className = 'comment-item';
  li.dataset.commentId = comment._id;

  const authorIsObj = comment.author && typeof comment.author === 'object';
  const uname       = authorIsObj ? comment.author.username    : null;
  const dname       = authorIsObj ? (comment.author.displayName || uname) : null;
  const authorId    = authorIsObj ? comment.author._id : String(comment.author);

  const meta = document.createElement('div');
  meta.className = 'comment-meta';

  if (dname) {
    const nameEl = document.createElement('span');
    nameEl.className = 'comment-author';
    nameEl.textContent = dname;
    meta.appendChild(nameEl);
  }
  if (uname) {
    const handleEl = document.createElement('span');
    handleEl.className = 'comment-handle';
    handleEl.textContent = ` @${uname}`;
    meta.appendChild(handleEl);
  }

  const timeEl = document.createElement('span');
  timeEl.className = 'comment-time';
  timeEl.textContent = ` · ${relativeTime(comment.createdAt)}`;
  meta.appendChild(timeEl);

  if (currentUser && authorId === currentUser.id) {
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

function buildPostCard(post) {
  const frag = postTemplate.content.cloneNode(true);
  const li   = frag.querySelector('.post-card');
  li.dataset.postId = post._id;

  const avatar = li.querySelector('.post-card__avatar');
  avatar.setAttribute('src', avatarSrc(post.author));

  const profileLink = li.querySelector('.post-card__profile-link');
  profileLink.href = `profile.html?u=${encodeURIComponent(post.author.username)}`;
  profileLink.textContent = post.author.displayName || post.author.username;

  li.querySelector('.post-card__username').textContent = `@${post.author.username}`;
  const timeEl = li.querySelector('.post-card__time');
  timeEl.textContent = relativeTime(post.createdAt);
  timeEl.dateTime = post.createdAt;

  li.querySelector('.post-card__content').textContent = post.content;

  const imgEl = li.querySelector('.post-card__image');
  if (post.imageUrl) {
    imgEl.setAttribute('src', post.imageUrl);
    imgEl.hidden = false;
    imgEl.addEventListener('error', () => { imgEl.hidden = true; });
  }

  // Avatar fallback
  avatar.addEventListener('error', () => { avatar.hidden = true; });

  const liked = currentUser && Array.isArray(post.likes)
    && post.likes.some((id) => String(id) === currentUser.id);
  const likeBtn = li.querySelector('.post-card__like-btn');
  likeBtn.classList.toggle('post-card__action-btn--liked', liked);
  likeBtn.setAttribute('aria-pressed', String(liked));
  likeBtn.querySelector('.like-icon').textContent = liked ? '♥' : '♡';
  li.querySelector('.like-count').textContent = post.likeCount ?? post.likes.length;
  li.querySelector('.comment-count').textContent = post.commentCount ?? post.comments.length;

  const deleteBtn = li.querySelector('.post-card__delete-btn');
  if (currentUser && post.author._id === currentUser.id) {
    deleteBtn.hidden = false;
  }

  const commentList = li.querySelector('.comment-list');
  if (Array.isArray(post.comments)) {
    post.comments.forEach((c) => commentList.appendChild(buildCommentNode(c)));
  }

  return li;
}

function wirePostCard(li) {
  const postId = li.dataset.postId;

  li.querySelector('.post-card__like-btn').addEventListener('click', async () => {
    try {
      const { liked, likeCount } = await api.likes.toggleLike(postId);
      const btn = li.querySelector('.post-card__like-btn');
      btn.classList.toggle('post-card__action-btn--liked', liked);
      btn.setAttribute('aria-pressed', String(liked));
      btn.querySelector('.like-icon').textContent = liked ? '♥' : '♡';
      li.querySelector('.like-count').textContent = likeCount;
    } catch { /* silent */ }
  });

  const commentsSection = li.querySelector('.post-card__comments');
  li.querySelector('.post-card__comment-btn').addEventListener('click', () => {
    const nowHidden = !commentsSection.hidden;
    commentsSection.hidden = nowHidden;
    if (!nowHidden) commentsSection.querySelector('.comment-input').focus();
  });

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
      const newComment = updatedPost.comments[updatedPost.comments.length - 1];
      const commentList = li.querySelector('.comment-list');
      commentList.appendChild(buildCommentNode(newComment));
      input.value = '';
      const countEl = li.querySelector('.comment-count');
      countEl.textContent = Number(countEl.textContent) + 1;
    } catch { /* silent */ }
    finally { submitBtn.disabled = false; }
  });

  li.querySelector('.comment-list').addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.comment-delete-btn');
    if (!delBtn) return;
    const commentItem = delBtn.closest('.comment-item');
    try {
      await api.comments.deleteComment(postId, commentItem.dataset.commentId);
      commentItem.remove();
      const countEl = li.querySelector('.comment-count');
      countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
    } catch { /* silent */ }
  });

  const deleteBtn = li.querySelector('.post-card__delete-btn');
  if (!deleteBtn.hidden) {
    deleteBtn.addEventListener('click', async () => {
      // eslint-disable-next-line no-alert
      if (!window.confirm('Delete this post? This cannot be undone.')) return;
      try {
        await api.posts.deletePost(postId);
        li.remove();
        postsEmptyMsg.hidden = postsList.children.length > 0;
      } catch { /* silent */ }
    });
  }
}

function renderPosts(posts) {
  posts.forEach((post) => {
    const li = buildPostCard(post);
    wirePostCard(li);
    postsList.appendChild(li);
  });
  postsEmptyMsg.hidden = postsList.children.length > 0;
}

// ── Load user posts ───────────────────────────────────────────────────────────
async function loadPosts() {
  if (postsLoading || !postsHasMore) return;
  postsLoading = true;
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading…';

  try {
    const { data: posts, pagination } = await api.users.getUserPosts(username, {
      page: postsPage,
      limit: 10,
    });
    renderPosts(posts);
    postsHasMore = postsPage < pagination.totalPages;
    if (postsHasMore) {
      postsPage += 1;
      loadMoreBtn.hidden = false;
    } else {
      loadMoreBtn.hidden = true;
    }
  } catch { /* silent */ }
  finally {
    postsLoading = false;
    loadMoreBtn.disabled = false;
    if (postsHasMore) loadMoreBtn.textContent = 'Load more';
  }
}

// ── Render profile header ─────────────────────────────────────────────────────
function renderProfile(profile) {
  document.title = `@${profile.username} — Alpha Chat`;

  avatarEl.setAttribute('src', avatarSrc(profile));
  avatarEl.alt = `${profile.displayName || profile.username}'s avatar`;

  displayNameEl.textContent = profile.displayName || profile.username;
  usernameEl.textContent    = `@${profile.username}`;
  bioEl.textContent         = profile.bio || '';
  bioEl.hidden              = !profile.bio;

  statPosts.textContent     = profile.postCount     ?? 0;
  statFollowers.textContent = profile.followerCount ?? 0;
  statFollowing.textContent = profile.followingCount ?? 0;
}

// ── Follow / unfollow button ──────────────────────────────────────────────────
function buildFollowButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id   = 'follow-btn';
  btn.className = isFollowing ? 'btn btn-secondary' : 'btn btn-primary';
  btn.textContent = isFollowing ? 'Following' : 'Follow';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { following, followerCount } = await api.users.toggleFollow(username);
      isFollowing = following;
      btn.className   = isFollowing ? 'btn btn-secondary' : 'btn btn-primary';
      btn.textContent = isFollowing ? 'Following' : 'Follow';
      statFollowers.textContent = followerCount;
    } catch { /* silent */ }
    finally { btn.disabled = false; }
  });

  return btn;
}

// ── Edit profile ──────────────────────────────────────────────────────────────
function openEditForm() {
  editDisplayName.value = profileData.displayName || '';
  editBio.value         = profileData.bio         || '';
  editAvatarUrl.value   = profileData.avatarUrl    || '';
  hideEditError();
  editSection.hidden = false;
  editDisplayName.focus();
}

cancelEditBtn.addEventListener('click', () => {
  editSection.hidden = true;
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideEditError();

  const updates = {};
  const dn = editDisplayName.value.trim();
  const b  = editBio.value.trim();
  const av = editAvatarUrl.value.trim();

  if (dn)  updates.displayName = dn;
  if (b)   updates.bio         = b;
  if (av)  updates.avatarUrl   = av;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const { data: updated } = await api.users.updateProfile(updates);
    // Reflect changes in the page without reload
    profileData = { ...profileData, ...updated };
    renderProfile(profileData);
    // Update the avatar preview
    avatarEl.setAttribute('src', avatarSrc(profileData));
    editSection.hidden = true;
  } catch (err) {
    showEditError(err.message || 'Could not save profile.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

// ── Determine initial isFollowing state ───────────────────────────────────────
async function checkIsFollowing() {
  try {
    // Fetch first page of followers and check if current user is among them
    const { data: followers } = await api.users.getFollowers(username);
    isFollowing = followers.some((f) => f._id === currentUser.id || f.id === currentUser.id);
  } catch { isFollowing = false; }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: profile } = await api.users.getProfile(username);
    profileData = profile;
    renderProfile(profile);

    const isOwnProfile = profile.id === currentUser.id
      || String(profile.id) === String(currentUser.id);

    if (isOwnProfile) {
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit Profile';
      editBtn.addEventListener('click', openEditForm);
      actionsEl.appendChild(editBtn);
    } else {
      // Follow/unfollow button — check current following state first
      await checkIsFollowing();
      actionsEl.appendChild(buildFollowButton());
    }

    await loadPosts();
    loadMoreBtn.addEventListener('click', loadPosts);
  } catch (err) {
    if (err.status === 404) {
      showProfileError('User not found.');
    } else {
      showProfileError(err.message || 'Failed to load profile.');
    }
  }
});
