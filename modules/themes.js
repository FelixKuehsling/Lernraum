/* ============================================================
   LERNRAUM – THEMES MODULE
   Dark mode, light mode, custom themes, system preference
============================================================ */

const LernraumThemes = (() => {
  const STORAGE_KEY = 'lernraum_theme_preference';
  let currentTheme = 'cream';

  const THEMES = {
    cream: {
      name: 'Light (Original)',
      isDark: false,
      colors: {
        bg: '#EAE1CC',
        bgSoft: '#F1E9D8',
        surface: '#FAF5EA',
        surfaceAlt: '#F0E8D6',
        ink: '#382F24',
        inkSoft: '#7A7061',
        inkFaint: '#A69C8B',
        line: '#DDD0B0',
        sage: '#7E9070',
        sageDark: '#5C6F51',
        sageTint: '#E3E9DC',
        clay: '#BE8C57',
        clayDark: '#9A6C39',
        clayTint: '#F2E4CC',
        rust: '#A65F49',
        rustTint: '#F2DED7',
        dusk: '#6E85A0',
        duskTint: '#E2E7EE',
        plum: '#8C6B87',
        plumTint: '#EBE0E7'
      }
    },

    dark: {
      name: 'Dark Mode',
      isDark: true,
      colors: {
        bg: '#1a1a1a',
        bgSoft: '#2d2d2d',
        surface: '#252525',
        surfaceAlt: '#1f1f1f',
        ink: '#e8e8e8',
        inkSoft: '#a0a0a0',
        inkFaint: '#707070',
        line: '#404040',
        sage: '#5fa878',
        sageDark: '#4a8a5f',
        sageTint: '#1d3d2b',
        clay: '#d99b5a',
        clayDark: '#a67239',
        clayTint: '#3d2a1a',
        rust: '#d97860',
        rustTint: '#472222',
        dusk: '#6e9dbf',
        duskTint: '#1e2a3a',
        plum: '#a87aa5',
        plumTint: '#2d1f35'
      }
    },

    midnight: {
      name: 'Midnight (Dunkel)',
      isDark: true,
      colors: {
        bg: '#0f0f0f',
        bgSoft: '#1a1a1a',
        surface: '#161616',
        surfaceAlt: '#121212',
        ink: '#f0f0f0',
        inkSoft: '#b0b0b0',
        inkFaint: '#808080',
        line: '#2a2a2a',
        sage: '#4a9d6f',
        sageDark: '#3a7d5f',
        sageTint: '#1a3a2a',
        clay: '#d9965a',
        clayDark: '#a96a39',
        clayTint: '#3d2a15',
        rust: '#d97060',
        rustTint: '#4a2222',
        dusk: '#6b9fb5',
        duskTint: '#1a2a38',
        plum: '#a575a0',
        plumTint: '#2a1a32'
      }
    },

    ocean: {
      name: 'Ocean (Blau)',
      isDark: true,
      colors: {
        bg: '#0d1b2a',
        bgSoft: '#1a2d3d',
        surface: '#16283a',
        surfaceAlt: '#122a38',
        ink: '#e0e8f0',
        inkSoft: '#a0b0c0',
        inkFaint: '#708090',
        line: '#2d3d4a',
        sage: '#4da878',
        sageDark: '#3a8a60',
        sageTint: '#1a3d2a',
        clay: '#d9a060',
        clayDark: '#a07540',
        clayTint: '#3d2a18',
        rust: '#d97860',
        rustTint: '#4a2220',
        dusk: '#5ba5c0',
        duskTint: '#1a2d38',
        plum: '#9070a8',
        plumTint: '#281a32'
      }
    },

    forest: {
      name: 'Forest (Grün)',
      isDark: true,
      colors: {
        bg: '#0f1a0f',
        bgSoft: '#1a2a1a',
        surface: '#162816',
        surfaceAlt: '#122612',
        ink: '#e0f0e0',
        inkSoft: '#a0c0a0',
        inkFaint: '#708070',
        line: '#2a3a2a',
        sage: '#4db85f',
        sageDark: '#3a9a4a',
        sageTint: '#1a4a2a',
        clay: '#d9a560',
        clayDark: '#a07a40',
        clayTint: '#3d2a18',
        rust: '#d97860',
        rustTint: '#4a2222',
        dusk: '#5ba0b8',
        duskTint: '#1a2a38',
        plum: '#a070a8',
        plumTint: '#2a1a32'
      }
    }
  };

  /**
   * Initialisiere Theme-System
   */
  function init() {
    // Load saved theme preference from localStorage
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme && THEMES[savedTheme]) {
      applyTheme(savedTheme);
    } else {
      // Apply system preference if available
      const systemPref = getSystemPreference();
      if (systemPref && THEMES[systemPref]) {
        applyTheme(systemPref);
      }
      // Otherwise CSS defaults to Cream
    }

    setupThemeToggle();
    setupKeyboardShortcut();
    console.log('✅ Themes Module initialized');
  }

  /**
   * Get System Preference (prefers-color-scheme)
   */
  function getSystemPreference() {
    if (window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'cream';
      }
    }
    return null;
  }

  /**
   * Apply Theme - Update CSS Variables
   */
  function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) {
      console.error(`Theme ${themeName} not found`);
      return;
    }

    const root = document.documentElement;

    // Set CSS variables with !important to override browser dark mode
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--${kebabCase(key)}`;
      root.style.setProperty(cssVar, value, 'important');
    });

    // Set data-theme attribute for CSS selectors
    root.setAttribute('data-theme', themeName);

    // Update meta theme-color for mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.sage);
    }

    // Save preference
    localStorage.setItem(STORAGE_KEY, themeName);
    currentTheme = themeName;

    // Dispatch event
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
  }

  /**
   * Setup Theme Toggle Button (falls vorhanden)
   */
  function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    // Update button state basierend auf aktuellem Theme
    updateToggleButton();

    // Theme menu
    createThemeMenu();

    // Listen to changes
    window.addEventListener('themechange', updateToggleButton);
  }

  function updateToggleButton() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const isDark = THEMES[currentTheme].isDark;
    toggleBtn.setAttribute('aria-pressed', isDark.toString());
    const label = toggleBtn.querySelector('.theme-switch-label');
    if (label) {
      label.textContent = isDark ? 'Dunkler Modus' : 'Heller Modus';
    }
  }

  /**
   * Quick Theme Menu (Cmd+Shift+T to open)
   */
  function createThemeMenu() {
    // Theme switcher in settings/menu
    const themeMenu = document.createElement('div');
    themeMenu.id = 'lernraum-theme-menu';
    themeMenu.className = 'theme-menu';
    themeMenu.style.display = 'none';

    let html = '<div class="theme-menu-items">';
    Object.entries(THEMES).forEach(([key, theme]) => {
      const active = key === currentTheme ? 'active' : '';
      html += `
        <button class="theme-menu-item ${active}" onclick="LernraumThemes.applyTheme('${key}')" title="${theme.name}">
          <span class="theme-dot" style="background: ${theme.colors.sage}"></span>
          ${theme.name}
        </button>
      `;
    });
    html += '</div>';
    themeMenu.innerHTML = html;

    document.body.appendChild(themeMenu);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      .theme-menu {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 8px;
        box-shadow: var(--shadow-md);
        z-index: 1000;
      }
      .theme-menu.show {
        display: block !important;
      }
      .theme-menu-items {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .theme-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: 1px solid transparent;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        color: var(--ink);
        transition: all 0.15s ease;
      }
      .theme-menu-item:hover {
        background: var(--bg-soft);
        border-color: var(--line);
      }
      .theme-menu-item.active {
        background: var(--sage-tint);
        border-color: var(--sage);
        color: var(--sage-dark);
      }
      .theme-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Keyboard Shortcut: Cmd/Ctrl + Shift + T
   */
  function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        const menu = document.getElementById('lernraum-theme-menu');
        if (menu) {
          menu.classList.toggle('show');
        }
      }
    });
  }

  /**
   * Toggle Dark/Light Quick
   */
  function toggleDarkLight() {
    const isDark = THEMES[currentTheme].isDark;
    const nextTheme = isDark ? 'cream' : 'dark';
    applyTheme(nextTheme);
  }

  /**
   * Get All Themes
   */
  function getThemes() {
    return Object.entries(THEMES).map(([key, theme]) => ({
      id: key,
      ...theme
    }));
  }

  /**
   * Get Current Theme
   */
  function getCurrentTheme() {
    return { id: currentTheme, ...THEMES[currentTheme] };
  }

  /**
   * Helper: Convert camelCase to kebab-case
   */
  function kebabCase(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  // Init when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    applyTheme,
    toggleDarkLight,
    getThemes,
    getCurrentTheme,
    getSystemPreference
  };
})();

window.LernraumThemes = LernraumThemes;
