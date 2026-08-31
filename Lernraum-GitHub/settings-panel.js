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

  if (!statusText) return;

  // Check if user is logged in (check localStorage or Supabase session)
  const user = localStorage.getItem('lernraum_user');
  const email = localStorage.getItem('lernraum_user_email');

  if (user && email) {
    statusText.textContent = `✅ Angemeldet als ${email}`;
    if (logoutSection) logoutSection.style.display = 'block';
    if (actionsSection) actionsSection.style.display = 'flex';
  } else {
    statusText.textContent = '❌ Nicht verbunden';
    if (logoutSection) logoutSection.style.display = 'none';
    if (actionsSection) actionsSection.style.display = 'flex';
  }
}

// Login Flow
async function initiateSyncLogin() {
  // This will open the sync panel from sync.js
  if (typeof openSyncLoginModal === 'function') {
    openSyncLoginModal();
  } else {
    // Fallback: trigger sync button click
    const syncBtn = document.getElementById('lernraum-sync-button');
    if (syncBtn) syncBtn.click();
  }
}

// Logout Flow
async function initiateSyncLogout() {
  if (typeof signOut === 'function') {
    await signOut();
    updateSyncStatus();
    alert('Abgemeldet!');
  }
}

// Open Sync Panel
function openSyncPanel() {
  if (typeof triggerSyncPanel === 'function') {
    triggerSyncPanel();
  } else {
    const syncBtn = document.getElementById('lernraum-sync-button');
    if (syncBtn) syncBtn.click();
  }
}

// Initialize on load
function initializeSettings() {
  updateSettingsThemeToggle();
  updateSyncStatus();

  // Watch for changes
  const observer = new MutationObserver(() => {
    updateSyncStatus();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
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
