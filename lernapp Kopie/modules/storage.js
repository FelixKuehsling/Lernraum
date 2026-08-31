/* ============================================================
   LERNRAUM – STORAGE MODULE
   IndexedDB with localStorage fallback
   Faster, structured, offline-first data layer
============================================================ */

const LernraumStorage = (() => {
  const DB_NAME = 'lernraum-db';
  const DB_VERSION = 1;
  let db = null;
  const supportsIDB = 'indexedDB' in window;

  const STORES = {
    notes: { keyPath: 'id' },
    todos: { keyPath: 'id' },
    events: { keyPath: 'id' },
    cards: { keyPath: 'id' },
    modules: { keyPath: 'id' },
    cardFolders: { keyPath: 'id' },
    noteFolders: { keyPath: 'id' },
    docFolders: { keyPath: 'id' },
    docs: { keyPath: 'id' },
    stats: { keyPath: 'type' }
  };

  /**
   * Initialisiere IndexedDB
   */
  async function init() {
    if (!supportsIDB) {
      console.warn('⚠️ IndexedDB not supported, using localStorage fallback');
      return false;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB init failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve(true);
      };

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        // Erstelle alle Object Stores
        Object.entries(STORES).forEach(([name, config]) => {
          if (!database.objectStoreNames.contains(name)) {
            const store = database.createObjectStore(name, config);
            // Erstelle Indizes für häufige Queries
            if (name === 'todos') {
              store.createIndex('status', 'status');
              store.createIndex('dueDate', 'dueDate');
            }
            if (name === 'notes') {
              store.createIndex('folderId', 'folderId');
              store.createIndex('deleted', 'deleted');
            }
            if (name === 'events') {
              store.createIndex('date', 'date');
              store.createIndex('type', 'type');
            }
            if (name === 'cards') {
              store.createIndex('folderId', 'folderId');
              store.createIndex('box', 'box');
            }
          }
        });
      };
    });
  }

  /**
   * GET - Hole einzelnes Item
   */
  async function get(store, key) {
    if (!db) return localStorage.getItem(key);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * GETALL - Hole alle Items
   */
  async function getAll(store) {
    if (!db) {
      const raw = localStorage.getItem(store);
      return raw ? JSON.parse(raw) : [];
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * PUT - Speichere Item
   */
  async function put(store, data) {
    if (!db) {
      localStorage.setItem(store, JSON.stringify(data));
      return data;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(data);
    });
  }

  /**
   * PUTALL - Speichere mehrere Items
   */
  async function putAll(store, items) {
    if (!db) {
      localStorage.setItem(store, JSON.stringify(items));
      return items;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);

      items.forEach(item => objectStore.put(item));

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve(items);
    });
  }

  /**
   * DELETE - Lösche Item
   */
  async function delete_(store, key) {
    if (!db) {
      localStorage.removeItem(key);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * CLEAR - Leere einen Store
   */
  async function clear(store) {
    if (!db) {
      localStorage.removeItem(store);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * QUERY mit Index
   * z.B. queryIndex('todos', 'status', 'erledigt')
   */
  async function queryIndex(store, indexName, value) {
    if (!db) {
      const raw = localStorage.getItem(store);
      if (!raw) return [];
      const all = JSON.parse(raw);
      return all.filter(item => item[indexName] === value);
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const index = objectStore.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Speichergröße prüfen
   */
  async function getStorageSize() {
    if (!navigator.storage?.estimate) {
      return { used: 0, quota: 0, percent: 0 };
    }

    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage,
      quota: estimate.quota,
      percent: Math.round((estimate.usage / estimate.quota) * 100)
    };
  }

  /**
   * Migration: localStorage → IndexedDB
   */
  async function migrateFromLocalStorage() {
    if (!db) return;

    for (const [store] of Object.entries(STORES)) {
      const raw = localStorage.getItem(store);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const items = Array.isArray(data) ? data : [data];
          await putAll(store, items);
          console.log(`✅ Migrated ${store} to IndexedDB`);
        } catch (e) {
          console.error(`Failed to migrate ${store}:`, e);
        }
      }
    }
  }

  return {
    init,
    get,
    getAll,
    put,
    putAll,
    delete: delete_,
    clear,
    queryIndex,
    getStorageSize,
    migrateFromLocalStorage,
    isSupported: () => supportsIDB
  };
})();

window.LernraumStorage = LernraumStorage;
