import { getCurrentUser, clearSession } from './auth-guard.js';

function initHeader() {
  const container = document.getElementById('header-user');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) return;

  container.innerHTML = `
    <a href="profile.html?u=${encodeURIComponent(user.username)}" class="header-user-link">
      @${user.username}
    </a>
    <button type="button" id="logout-btn" class="btn btn-secondary">Logout</button>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', initHeader);
