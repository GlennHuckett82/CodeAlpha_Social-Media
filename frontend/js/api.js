import CONFIG from './config.js';

async function request(method, path, data, headers = {}) {
  const url = CONFIG.API_BASE_URL + path;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (data !== null && data !== undefined) {
    options.body = JSON.stringify(data);
  }
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || json.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return json;
}

function getAuthHeaders() {
  const token = localStorage.getItem('sm_token');
  if (token) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }
  return { 'Content-Type': 'application/json' };
}

function buildQs(params) {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : '';
}

const api = {
  auth: {
    register: (data) => request('POST', '/api/auth/register', data),
    login: (data) => request('POST', '/api/auth/login', data),
  },
  posts: {
    getFeed: (params = {}) => request('GET', `/api/posts${buildQs(params)}`),
    getPost: (id) => request('GET', `/api/posts/${id}`),
    createPost: (data) => request('POST', '/api/posts', data, getAuthHeaders()),
    deletePost: (id) => request('DELETE', `/api/posts/${id}`, null, getAuthHeaders()),
  },
  comments: {
    addComment: (postId, data) =>
      request('POST', `/api/posts/${postId}/comments`, data, getAuthHeaders()),
    deleteComment: (postId, commentId) =>
      request('DELETE', `/api/posts/${postId}/comments/${commentId}`, null, getAuthHeaders()),
  },
  likes: {
    toggleLike: (postId) => request('POST', `/api/posts/${postId}/like`, null, getAuthHeaders()),
  },
  users: {
    getProfile: (username) => request('GET', `/api/users/${username}`),
    getUserPosts: (username, params = {}) =>
      request('GET', `/api/users/${username}/posts${buildQs(params)}`),
    updateProfile: (data) => request('PATCH', '/api/users/me', data, getAuthHeaders()),
    toggleFollow: (username) =>
      request('POST', `/api/users/${username}/follow`, null, getAuthHeaders()),
    getFollowers: (username) => request('GET', `/api/users/${username}/followers`),
    getFollowing: (username) => request('GET', `/api/users/${username}/following`),
  },
};

export default api;
