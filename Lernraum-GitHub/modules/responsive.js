/* ============================================================
   LERNRAUM – RESPONSIVE & ANIMATIONS MODULE
   Mobile-first design, micro-interactions, smooth transitions
============================================================ */

const LernraumResponsive = (() => {
  /**
   * Inject Mobile & Animation Styles
   */
  function init() {
    injectStyles();
    setupMobileNav();
    setupGestureSupport();
    console.log('✅ Responsive & Animations initialized');
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ============================================================
         ANIMATIONS & TRANSITIONS
      ============================================================ */
      * {
        --transition: var(--transition-base, 0.15s ease);
      }

      /* Page Transitions */
      .view {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Button Interactions */
      button, a, [role="button"] {
        transition: all var(--transition);
      }

      button:hover, a:hover, [role="button"]:hover {
        transform: translateY(-1px);
      }

      button:active, a:active, [role="button"]:active {
        transform: translateY(0);
      }

      /* Card Hover */
      .card {
        transition: all var(--transition);
      }

      .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      /* Checkbox Animation */
      .checkbox, input[type="checkbox"] {
        transition: all var(--transition);
      }

      .checkbox:checked {
        animation: checkmark 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      @keyframes checkmark {
        0% {
          transform: scale(0.8);
        }
        50% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
        }
      }

      /* Input Focus */
      input, textarea, select {
        transition: border-color var(--transition), box-shadow var(--transition);
      }

      input:focus, textarea:focus, select:focus {
        border-color: var(--sage);
        box-shadow: 0 0 0 3px var(--sage-tint);
      }

      /* Modal Animation */
      .modal {
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Success Pulse */
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .success {
        animation: pulse 0.6s ease;
      }

      /* ============================================================
         MOBILE RESPONSIVE DESIGN
      ============================================================ */

      @media (max-width: 768px) {
        /* Sidebar → Bottom Navigation */
        .app {
          flex-direction: column;
        }

        .sidebar {
          width: 100%;
          height: auto;
          border-right: none;
          border-bottom: 1px solid var(--line);
          border-top: 1px solid var(--line);
          padding: 0;
          flex-direction: row;
          overflow-x: auto;
          order: 1;
          flex-shrink: 0;
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 100 !important;
          background: var(--bg) !important;
        }

        .sidebar-foot {
          display: none;
        }

        .brand {
          display: none;
        }

        .nav-item {
          flex: 1;
          min-width: 70px;
          border-radius: 0;
          border: none;
          padding: 8px 4px;
          gap: 4px;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-size: 11px;
          text-align: center;
        }

        .nav-item .ico {
          width: 24px;
          height: 24px;
          font-size: 16px;
        }

        .nav-item.active::before {
          display: none;
        }

        .nav-item.active {
          border-bottom: 3px solid var(--sage);
          border-radius: 0;
        }

        /* Main Content */
        .main {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 80px !important;
        }

        /* Views */
        .view {
          padding: 12px;
          max-width: 100%;
        }

        /* Cards */
        .card {
          margin-bottom: 12px;
        }

        /* Buttons */
        .btn {
          padding: 10px 14px;
          font-size: 13px;
          width: 100%;
        }

        /* Forms */
        input, textarea, select {
          font-size: 16px; /* Prevents zoom on iOS */
          width: 100%;
          padding: 14px 12px !important;
          min-height: 48px !important;
          border-radius: 8px !important;
          margin-bottom: 12px !important;
        }

        /* Grid adjustments */
        .dash-new-stats,
        .dash-new-main-grid,
        .module-grid {
          grid-template-columns: 1fr !important;
        }

        /* Hide desktop elements */
        .desktop-only {
          display: none;
        }

        /* Sidebar button adjustments */
        .pwa-install-btn {
          width: 100%;
        }

        /* Theme toggle button */
        .theme-switch {
          width: 40px;
          height: 40px;
        }
      }

      @media (max-width: 480px) {
        /* Extra small phones */
        .sidebar {
          height: 60px;
        }

        .nav-item {
          padding: 6px 2px;
          font-size: 10px;
        }

        .view {
          padding: 8px;
        }

        .card {
          padding: 16px !important;
          margin-bottom: 16px !important;
        }

        .view-title {
          font-size: 20px;
          margin-bottom: 16px !important;
        }

        .eyebrow {
          font-size: 10px;
        }
      }

      /* Touch-friendly targets */
      @media (hover: none) and (pointer: coarse) {
        button, a, [role="button"] {
          min-height: 44px;
          min-width: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* Hover effects disabled on touch */
        button:hover, a:hover {
          transform: none;
        }

        /* Slightly larger touch targets */
        .icon-btn {
          width: 44px;
          height: 44px;
        }
      }

      /* ============================================================
         LANDSCAPE ORIENTATION
      ============================================================ */

      @media (max-width: 1024px) and (orientation: landscape) {
        .sidebar {
          width: 120px;
          height: 100%;
          flex-direction: column;
          border-right: 1px solid var(--line);
          border-bottom: none;
        }

        .nav-item {
          width: 100%;
          flex-direction: column;
          min-width: auto;
        }
      }

      /* ============================================================
         ACCESSIBILITY
      ============================================================ */

      /* Focus visible for keyboard navigation */
      button:focus-visible,
      a:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--sage);
        outline-offset: 2px;
      }

      /* Reduced motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: more) {
        button {
          border: 2px solid currentColor;
        }

        .nav-item.active {
          border-width: 2px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup Mobile Navigation
   */
  function setupMobileNav() {
    // Mobile nav wird durch CSS automatisch gesteuert
    // Aber wir können hier JS-Features für Gesten hinzufügen
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Smooth scroll on mobile
      document.documentElement.style.scrollBehavior = 'smooth';

      // Add mobile class
      document.body.classList.add('mobile-view');
    }
  }

  /**
   * Setup Gesture Support
   */
  function setupGestureSupport() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      const diff = touchStartX - touchEndX;
      const threshold = 50;

      // Swipe left - next view
      if (diff > threshold) {
        // Kann für View-Navigation genutzt werden
      }

      // Swipe right - previous view
      if (diff < -threshold) {
        // Kann für View-Navigation genutzt werden
      }
    }
  }

  /**
   * Trigger Animation
   */
  function triggerAnimation(element, animationClass) {
    element.classList.add(animationClass);
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, 600);
  }

  /**
   * Confetti for Success
   */
  function showConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 8 + 4,
        life: 1,
        color: ['#7E9070', '#BE8C57', '#A65F49', '#6E85A0'][Math.floor(Math.random() * 4)]
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life -= 0.01;

        if (p.life <= 0) {
          particles.splice(i, 1);
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 6, 6);
      });

      ctx.globalAlpha = 1;

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }

    animate();
  }

  return {
    init,
    triggerAnimation,
    showConfetti
  };
})();

window.LernraumResponsive = LernraumResponsive;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    LernraumResponsive.init();
  });
} else {
  LernraumResponsive.init();
}
