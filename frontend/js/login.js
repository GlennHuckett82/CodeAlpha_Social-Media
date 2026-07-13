import api from './api.js';
import { requireGuest, setSession } from './auth-guard.js';

requireGuest();

const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const errorDiv = document.getElementById('error-message');

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.hidden = false;
}

function hideError() {
  errorDiv.textContent = '';
  errorDiv.hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = form.email.value.trim();
  const password = form.password.value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const { token, user } = await api.auth.login({ email, password });
    setSession(token, user);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message || 'Invalid email or password.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});
