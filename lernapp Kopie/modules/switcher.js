/* ============================================================
   LERNRAUM – QUICK SWITCHER MODULE
   Cmd+K / Ctrl+K quick navigation & search
============================================================ */

const LernraumSwitcher = (() => {
  let isOpen = false;
  const recentViews = [];

  const COMMANDS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', action: () => goToView('dashboard') },
    { id: 'notes', label: 'Notizen', icon: '📝', action: () => goToView('notes') },
    { id: 'tasks', label: 'Aufgaben', icon: '✓', action: () => goToView('todo') },
    { id: 'calendar', label: 'Kalender', icon: '📅', action: () => goToView('calendar') },
    { id: 'cards', label: 'Karteikarten', icon: '🎴', action: () => goToView('cards') },
    { id: 'modules', label: 'Module', icon: '📚', action: () => goToView('modules') },
    { id: 'docs', label: 'Unterlagen', icon: '📁', action: () => goToView('docs') },
    { id: 'stats', label: 'Statistik', icon: '📈', action: () => goToView('stats') },
    { id: 'planner', label: 'Lernplan', icon: '🗓️', action: () => goToView('planner') },
    { id: 'dark-mode', label: 'Dark Mode Toggle', icon: '🌙', action: () => LernraumThemes.toggleDarkLight() },
    { id: 'themes', label: 'Theme Menü', icon: '🎨', action: () => openThemeMenu() }
  ];

  /**
   * Initialisiere Switcher
   */
  function init() {
    createSwitcherUI();
    setupKeyboardShortcut();
    console.log('✅ Quick Switcher initialized');
  }

  /**
   * Create Switcher Modal
   */
  function createSwitcherUI() {
    const modal = document.createElement('div');
    modal.id = 'lernraum-switcher';
    modal.className = 'switcher-modal';

    modal.innerHTML = `
      <div class="switcher-backdrop"></div>
      <div class="switcher-container">
        <div class="switcher-input-wrap">
          <span class="switcher-icon">🔍</span>
          <input
            type="text"
            id="switcher-input"
            class="switcher-input"
            placeholder="Seite oder Befehl eingeben... (Esc zum Schließen)"
            autocomplete="off"
          >
        </div>
        <div class="switcher-results" id="switcher-results"></div>
      </div>
    `;

    document.body.appendChild(modal);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      .switcher-modal {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 10000;
      }
      .switcher-modal.open {
        display: flex;
      }
      .switcher-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
      }
      .switcher-container {
        position: relative;
        margin: auto;
        width: 90%;
        max-width: 500px;
        max-height: 70vh;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        animation: switcherSlideIn 0.2s ease;
      }
      @keyframes switcherSlideIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .switcher-input-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid var(--line);
      }
      .switcher-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      .switcher-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: var(--ink);
        font-family: inherit;
      }
      .switcher-input::placeholder {
        color: var(--ink-faint);
      }
      .switcher-results {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      .switcher-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 14px;
      }
      .switcher-item:hover,
      .switcher-item.selected {
        background: var(--bg-soft);
        color: var(--ink);
      }
      .switcher-item.selected {
        background: var(--sage-tint);
        border-left: 3px solid var(--sage);
        padding-left: 9px;
      }
      .switcher-item-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      .switcher-item-label {
        flex: 1;
      }
      .switcher-item-keys {
        font-size: 11px;
        color: var(--ink-faint);
        font-family: 'IBM Plex Mono', monospace;
        background: var(--bg-soft);
        padding: 2px 6px;
        border-radius: 3px;
      }
      .switcher-empty {
        padding: 32px 16px;
        text-align: center;
        color: var(--ink-faint);
      }
    `;
    document.head.appendChild(style);

    // Event Listeners
    const input = document.getElementById('switcher-input');
    const backdrop = modal.querySelector('.switcher-backdrop');

    input.addEventListener('input', handleSearch);
    input.addEventListener('keydown', handleKeydown);
    backdrop.addEventListener('click', close);
  }

  /**
   * Fuzzy Search
   */
  function fuzzyMatch(search, text) {
    const searchLower = search.toLowerCase();
    const textLower = text.toLowerCase();

    if (textLower.includes(searchLower)) {
      return textLower.indexOf(searchLower);
    }

    let searchIdx = 0;
    let score = 0;
    for (let i = 0; i < textLower.length; i++) {
      if (textLower[i] === searchLower[searchIdx]) {
        searchIdx++;
        score += 10 - (i - searchIdx); // Bonus für zusammenhängende Chars
      }
    }

    return searchIdx === searchLower.length ? score : -1;
  }

  /**
   * Handle Search
   */
  function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('switcher-results');

    if (!query) {
      renderResults(COMMANDS.slice(0, 10), resultsDiv);
      return;
    }

    const filtered = COMMANDS
      .map(cmd => ({
        ...cmd,
        score: fuzzyMatch(query, cmd.label)
      }))
      .filter(cmd => cmd.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (filtered.length === 0) {
      resultsDiv.innerHTML = '<div class="switcher-empty">Keine Ergebnisse gefunden</div>';
    } else {
      renderResults(filtered, resultsDiv);
    }
  }

  /**
   * Render Results
   */
  function renderResults(results, container) {
    container.innerHTML = results.map((cmd, idx) => `
      <div class="switcher-item ${idx === 0 ? 'selected' : ''}" data-id="${cmd.id}" onclick="LernraumSwitcher.selectCommand('${cmd.id}')">
        <span class="switcher-item-icon">${cmd.icon}</span>
        <span class="switcher-item-label">${cmd.label}</span>
      </div>
    `).join('');
  }

  /**
   * Handle Keyboard Navigation
   */
  function handleKeydown(e) {
    const items = document.querySelectorAll('.switcher-item');
    const selected = document.querySelector('.switcher-item.selected');

    switch (e.key) {
      case 'Escape':
        close();
        break;

      case 'ArrowDown':
        e.preventDefault();
        selectNext(items, selected);
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectPrev(items, selected);
        break;

      case 'Enter':
        e.preventDefault();
        if (selected) {
          selected.click();
          close();
        }
        break;
    }
  }

  function selectNext(items, selected) {
    const selectedIdx = Array.from(items).indexOf(selected);
    const nextIdx = selectedIdx + 1 < items.length ? selectedIdx + 1 : 0;
    items[nextIdx].classList.add('selected');
    items.forEach((item, i) => {
      if (i !== nextIdx) item.classList.remove('selected');
    });
    items[nextIdx].scrollIntoView({ block: 'nearest' });
  }

  function selectPrev(items, selected) {
    const selectedIdx = Array.from(items).indexOf(selected);
    const prevIdx = selectedIdx - 1 >= 0 ? selectedIdx - 1 : items.length - 1;
    items[prevIdx].classList.add('selected');
    items.forEach((item, i) => {
      if (i !== prevIdx) item.classList.remove('selected');
    });
    items[prevIdx].scrollIntoView({ block: 'nearest' });
  }

  /**
   * Setup Keyboard Shortcut
   */
  function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    });
  }

  /**
   * Select Command
   */
  function selectCommand(id) {
    const cmd = COMMANDS.find(c => c.id === id);
    if (cmd) {
      addRecent(cmd.id);
      cmd.action();
    }
  }

  /**
   * Open/Close
   */
  function open() {
    const modal = document.getElementById('lernraum-switcher');
    if (modal) {
      modal.classList.add('open');
      document.getElementById('switcher-input').focus();
      isOpen = true;
    }
  }

  function close() {
    const modal = document.getElementById('lernraum-switcher');
    if (modal) {
      modal.classList.remove('open');
      document.getElementById('switcher-input').value = '';
      isOpen = false;
      handleSearch({ target: { value: '' } });
    }
  }

  function toggle() {
    isOpen ? close() : open();
  }

  /**
   * Recent Items
   */
  function addRecent(id) {
    if (!recentViews.includes(id)) {
      recentViews.unshift(id);
      if (recentViews.length > 5) recentViews.pop();
    }
  }

  /**
   * Helper
   */
  function goToView(view) {
    if (typeof window.goToView === 'function') {
      window.goToView(view);
    }
  }

  function openThemeMenu() {
    const menu = document.getElementById('lernraum-theme-menu');
    if (menu) {
      menu.classList.toggle('show');
    }
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    open,
    close,
    toggle,
    selectCommand,
    handleSearch
  };
})();

window.LernraumSwitcher = LernraumSwitcher;
