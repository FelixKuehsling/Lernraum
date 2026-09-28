/* ============================================================
   LERNRAUM - EINSTELLUNGEN PANEL
   Dark Mode + Sync Integration
============================================================ */

// Update Dark Mode Toggle in Settings
function updateSettingsThemeToggle() {
  const toggle = document.getElementById('theme-toggle-settings');
  const isDark = document.documentElement.classList.contains('dark');
  if (toggle) {
    if (isDark) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
}

// Update Sync Status
function updateSyncStatus() {
  const statusText = document.getElementById('sync-status-text');
  const logoutSection = document.getElementById('sync-logout-section');
  const actionsSection = document.getElementById('sync-actions-settings');

  // Angemeldet? Aktive Supabase-Sitzung (sync.js) oder gespeicherter Login
  const sessionUser = (typeof lernraumSyncUser !== 'undefined' && lernraumSyncUser) ? lernraumSyncUser : null;
  const email = sessionUser?.email || localStorage.getItem('lernraum_user_email') || '';
  const isLoggedIn = !!(sessionUser || localStorage.getItem('lernraum_user'));

  // Update Settings Panel if visible
  if (statusText) {
    if (isLoggedIn) {
      statusText.textContent = email ? `✅ Angemeldet als ${email}` : '✅ Angemeldet';
    } else {
      statusText.textContent = '❌ Nicht verbunden';
    }
  }

  if (logoutSection) logoutSection.style.display = isLoggedIn ? 'flex' : 'none';
  if (actionsSection) actionsSection.style.display = isLoggedIn ? 'none' : 'flex';
}

// Login / Sync-Fenster (sync.js)
function initiateSyncLogin() {
  if (typeof openSyncDialog === 'function') openSyncDialog();
}

function openSyncPanel() {
  if (typeof openSyncDialog === 'function') openSyncDialog();
}

// Abmelden
async function initiateSyncLogout() {
  if (typeof logoutLernraum !== 'function') return;
  await logoutLernraum();
  updateSyncStatus();
  if (typeof notify === 'function') notify('Abgemeldet.');
}

// Initialize on load
function initializeSettings() {
  updateSettingsThemeToggle();
  updateSyncStatus();

  // Watch for Dark Mode changes
  const observer = new MutationObserver(() => {
    updateSettingsThemeToggle();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  // Watch for localStorage changes (for sync login)
  window.addEventListener('storage', () => {
    updateSyncStatus();
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSettings);
} else {
  try {
    initializeSettings();
  } catch (e) {
    console.error('Settings panel init error:', e);
  }
}
