export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('sm_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('sm_token');
}

export function setSession(token, user) {
  localStorage.setItem('sm_token', token);
  localStorage.setItem('sm_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('sm_token');
  localStorage.removeItem('sm_user');
}

export function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

export function requireGuest() {
  if (getToken()) {
    window.location.href = 'index.html';
  }
}
