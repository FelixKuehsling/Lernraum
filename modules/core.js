/* ============================================================
   LERNRAUM – CORE MODULE
   Shared utilities, storage, state management
============================================================ */

const LernraumCore = (() => {
  const NS = 'lernraum__';

  function buildKey(key, shared) {
    return NS + (shared ? 'shared__' : 'private__') + key;
  }

  const storage = {
    async get(key, shared = false) {
      try {
        const raw = localStorage.getItem(buildKey(key, shared));
        return raw === null ? null : { key, value: raw, shared };
      } catch (error) {
        console.error('storage.get error:', error);
        return null;
      }
    },

    async set(key, value, shared = false) {
      try {
        localStorage.setItem(buildKey(key, shared), value);
        return { key, value, shared };
      } catch (error) {
        console.error('storage.set error:', error);
        return null;
      }
    },

    async delete(key, shared = false) {
      try {
        const storageKey = buildKey(key, shared);
        const existed = localStorage.getItem(storageKey) !== null;
        localStorage.removeItem(storageKey);
        return { key, deleted: existed, shared };
      } catch (error) {
        console.error('storage.delete error:', error);
        return null;
      }
    },

    async list(prefix = '', shared = false) {
      try {
        const fullPrefix = buildKey(prefix, shared);
        const keys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const storageKey = localStorage.key(index);
          if (storageKey?.startsWith(fullPrefix)) {
            keys.push(storageKey.slice(NS.length + (shared ? 'shared__'.length : 'private__'.length)));
          }
        }
        return { keys, prefix, shared };
      } catch (error) {
        console.error('storage.list error:', error);
        return null;
      }
    }
  };

  const utils = {
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 11),

    escapeHtml: (s) => {
      const d = document.createElement('div');
      d.textContent = s == null ? '' : String(s);
      return d.innerHTML;
    },

    localISODate: (date = new Date()) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    todayISO: () => utils.localISODate(new Date()),

    notify: (msg, type = 'info') => {
      if (typeof window.notify === 'function') {
        window.notify(msg, type);
      }
    }
  };

  async function safeGet(key, fallback) {
    try {
      const r = await storage.get(key, false);
      return (r && r.value) ? JSON.parse(r.value) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  async function save(key, value) {
    try {
      await storage.set(key, JSON.stringify(value), false);
    } catch (e) {
      console.error('Save failed', e);
    }
  }

  return {
    storage,
    utils,
    safeGet,
    save
  };
})();

// Expose to global
window.LernraumCore = LernraumCore;
