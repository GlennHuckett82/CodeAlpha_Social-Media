import api from './api.js';
import { requireGuest, setSession } from './auth-guard.js';

requireGuest();

const form = document.getElementById('register-form');
const submitBtn = document.getElementById('submit-btn');
const errorDiv = document.getElementById('error-message');

const USERNAME_RE = /^\w{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.hidden = false;
}

function hideError() {
  errorDiv.textContent = '';
  errorDiv.hidden = true;
}

function validate(username, email, password) {
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3–30 characters: letters, numbers, and underscores only.';
  }
  if (!EMAIL_RE.test(email)) {
    return 'Please enter a valid email address.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const username = form.username.value.trim();
  const displayName = form.displayName.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;

  const validationError = validate(username, email, password);
  if (validationError) {
    showError(validationError);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  const payload = { username, email, password };
  if (displayName) payload.displayName = displayName;

  try {
    const { token, user } = await api.auth.register(payload);
    setSession(token, user);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message || 'Registration failed. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
