/* ============================================================
   LERNRAUM – UI MODULE
   Notifications, loading states, error handling, user feedback
============================================================ */

const LernraumUI = (() => {
  const notificationQueue = [];
  let toastContainer = null;
  let loadingCount = 0;

  /**
   * Initialisiere UI-System
   */
  function init() {
    toastContainer = document.getElementById('toast-wrap');
    if (!toastContainer) {
      console.warn('⚠️ toast-wrap element not found');
    }
    console.log('✅ UI Module initialized');
  }

  /**
   * NOTIFY - Zeige Benachrichtigung
   * Types: 'success', 'error', 'warning', 'info'
   */
  function notify(message, type = 'info', duration = 4000) {
    if (!toastContainer) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    const id = Date.now();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.dataset.id = id;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'i'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '•'}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" onclick="LernraumUI.dismissNotification(${id})" aria-label="Schließen">×</button>
    `;

    toastContainer.appendChild(toast);

    // Animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }

    return id;
  }

  function dismissNotification(id) {
    const toast = document.querySelector(`[data-id="${id}"]`);
    if (toast) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }
  }

  /**
   * LOADING - Zeige/verstecke Ladeindikator
   */
  function showLoading(message = 'Laden...') {
    loadingCount++;

    let overlay = document.getElementById('lernraum-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lernraum-loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text" id="lernraum-loading-text">${message}</div>
      `;
      document.body.appendChild(overlay);

      // Styles
      const style = document.createElement('style');
      style.textContent = `
        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 16px;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .loading-overlay.show {
          opacity: 1;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-text {
          color: white;
          font-size: 14px;
          font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }

    document.getElementById('lernraum-loading-text').textContent = message;
    setTimeout(() => overlay.classList.add('show'), 10);
  }

  function hideLoading() {
    loadingCount--;
    if (loadingCount <= 0) {
      loadingCount = 0;
      const overlay = document.getElementById('lernraum-loading-overlay');
      if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      }
    }
  }

  /**
   * ASYNC OPERATION mit Error Handling
   */
  async function asyncOperation(fn, options = {}) {
    const {
      loadingMessage = 'Wird ausgeführt...',
      successMessage = 'Erfolgreich!',
      errorMessage = 'Ein Fehler ist aufgetreten',
      showLoading: showLoader = true,
      showSuccess = true
    } = options;

    try {
      if (showLoader) showLoading(loadingMessage);

      const result = await fn();

      if (showLoader) hideLoading();
      if (showSuccess && successMessage) notify(successMessage, 'success');

      return { success: true, data: result };
    } catch (error) {
      if (showLoader) hideLoading();

      const message = error.message || errorMessage;
      notify(message, 'error', 6000);

      console.error('Operation failed:', error);
      return { success: false, error };
    }
  }

  /**
   * CONFIRM Dialog
   */
  async function confirm(message, options = {}) {
    const {
      title = 'Bestätigung',
      yesText = 'Ja',
      noText = 'Nein'
    } = options;

    return new Promise(resolve => {
      const confirmed = window.confirm(message);
      resolve(confirmed);
    });
  }

  /**
   * TOAST Style CSS (add to style.css)
   */
  function injectToastStyles() {
    if (document.getElementById('lernraum-toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'lernraum-toast-styles';
    style.textContent = `
      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        padding: 14px 16px;
        margin-bottom: 8px;
        box-shadow: var(--shadow-sm);
        font-size: 14px;
        animation: slideIn 0.3s ease;
        opacity: 0;
      }
      .toast.show {
        opacity: 1;
      }
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .toast-icon {
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
      }
      .toast-success { border-left: 4px solid var(--sage); }
      .toast-success .toast-icon { color: var(--sage-dark); }
      .toast-error { border-left: 4px solid var(--rust); }
      .toast-error .toast-icon { color: var(--rust); }
      .toast-warning { border-left: 4px solid var(--clay); }
      .toast-warning .toast-icon { color: var(--clay-dark); }
      .toast-info { border-left: 4px solid var(--dusk); }
      .toast-info .toast-icon { color: var(--dusk); }
      .toast-close {
        background: transparent;
        border: none;
        color: var(--ink-soft);
        cursor: pointer;
        font-size: 20px;
        padding: 0;
        margin-left: auto;
      }
      .toast-close:hover {
        color: var(--ink);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Escape HTML für sichere Anzeige
   */
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // Injiziere Styles bei Init
  function initStyles() {
    injectToastStyles();
  }

  return {
    init,
    notify,
    dismissNotification,
    showLoading,
    hideLoading,
    asyncOperation,
    confirm,
    escapeHtml
  };
})();

window.LernraumUI = LernraumUI;

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    LernraumUI.init();
  });
} else {
  LernraumUI.init();
}
