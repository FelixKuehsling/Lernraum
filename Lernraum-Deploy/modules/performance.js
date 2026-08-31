/* ============================================================
   LERNRAUM – PERFORMANCE MODULE
   Debouncing, throttling, lazy loading, render optimization
============================================================ */

const LernraumPerformance = (() => {
  const debounceMap = new Map();
  const throttleMap = new Map();

  /**
   * Debounce: Verzögerte Ausführung nach mehreren Aufrufen
   * Nützlich für: Input-Events, Resize, Scroll, Save-Operationen
   */
  function debounce(fn, delay, key = null) {
    return function (...args) {
      const id = key || fn.toString();

      if (debounceMap.has(id)) {
        clearTimeout(debounceMap.get(id));
      }

      const timeoutId = setTimeout(() => {
        fn.apply(this, args);
        debounceMap.delete(id);
      }, delay);

      debounceMap.set(id, timeoutId);
    };
  }

  /**
   * Throttle: Maximale Häufigkeit der Ausführung
   * Nützlich für: Scroll-Events, Mouse-Move, Animation Frames
   */
  function throttle(fn, delay, key = null) {
    let lastCall = 0;
    const id = key || fn.toString();

    return function (...args) {
      const now = Date.now();

      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  /**
   * RequestAnimationFrame Throttle: Optimiert für Browser-Rendering
   */
  function rafThrottle(fn) {
    let rafId = null;
    let pending = false;

    return function (...args) {
      if (!pending) {
        pending = true;
        rafId = requestAnimationFrame(() => {
          fn.apply(this, args);
          pending = false;
        });
      }
    };
  }

  /**
   * Lazy Load Module: Lade Code nur wenn nötig
   * Beispiel: await lazyLoad('flashcards')
   */
  const moduleCache = new Map();

  async function lazyLoad(moduleName) {
    if (moduleCache.has(moduleName)) {
      return moduleCache.get(moduleName);
    }

    try {
      const scriptTag = document.createElement('script');
      scriptTag.src = `modules/${moduleName}.js`;

      return new Promise((resolve, reject) => {
        scriptTag.onload = () => {
          const module = window[`Lernraum${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`];
          if (module) {
            moduleCache.set(moduleName, module);
            resolve(module);
          } else {
            reject(new Error(`Module ${moduleName} not found`));
          }
        };

        scriptTag.onerror = () => reject(new Error(`Failed to load module ${moduleName}`));
        document.head.appendChild(scriptTag);
      });
    } catch (error) {
      console.error(`Error loading module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Batch DOM Updates: Sammle mehrere DOM-Änderungen
   * Verhindert thrashing von Reflows/Repaints
   */
  let batchQueue = [];
  let batchScheduled = false;

  function batchDOM(fn) {
    batchQueue.push(fn);

    if (!batchScheduled) {
      batchScheduled = true;
      requestAnimationFrame(() => {
        batchQueue.forEach(f => f());
        batchQueue = [];
        batchScheduled = false;
      });
    }
  }

  /**
   * Memory-Efficient Event Listener
   * Automatisches Cleanup
   */
  function onceListener(element, event, handler) {
    const wrappedHandler = (e) => {
      handler(e);
      element.removeEventListener(event, wrappedHandler);
    };
    element.addEventListener(event, wrappedHandler);
  }

  /**
   * Intersection Observer für Lazy Loading von Content
   */
  function observeElementLoad(element, callback, options = {}) {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { ...defaultOptions, ...options });

    observer.observe(element);
    return observer;
  }

  /**
   * Speichere Render-Performance Metriken
   */
  const metrics = {
    renders: 0,
    lastRenderTime: 0,
    avgRenderTime: 0
  };

  function measureRender(fn, label = 'Render') {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    metrics.renders++;
    metrics.lastRenderTime = duration;
    metrics.avgRenderTime = (metrics.avgRenderTime * (metrics.renders - 1) + duration) / metrics.renders;

    if (duration > 16.67) { // Warnung wenn > 1 Frame bei 60fps
      console.warn(`⚠️ ${label} took ${duration.toFixed(2)}ms (slow)`);
    }

    return result;
  }

  function getMetrics() {
    return { ...metrics };
  }

  return {
    debounce,
    throttle,
    rafThrottle,
    lazyLoad,
    batchDOM,
    onceListener,
    observeElementLoad,
    measureRender,
    getMetrics
  };
})();

window.LernraumPerformance = LernraumPerformance;
