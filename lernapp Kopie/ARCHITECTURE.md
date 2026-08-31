# Lernraum Architecture

Die App ist nun modern strukturiert mit **modularen, performanten Komponenten**.

## 📦 Module Overview

```
modules/
├── core.js              ← Storage, Utils, Helpers
├── performance.js       ← Debounce, Throttle, Lazy Loading
├── storage.js           ← IndexedDB + localStorage fallback
├── ui.js                ← Notifications, Loading, Error Handling
├── notes.js             ← Note Management
├── tasks.js             ← Task Management
└── [future modules]
```

---

## 🎯 How to Use

### **1. Performance Optimization**

```javascript
// Debounce: Verzögerte Ausführung
const debouncedRender = LernraumPerformance.debounce(() => {
  renderTodos();
}, 300, 'renderTodos');

// Triggere oft
document.addEventListener('input', debouncedRender);

// Throttle: Maximal einmal pro Intervall
const throttledScroll = LernraumPerformance.throttle(() => {
  checkVisibleItems();
}, 100);

window.addEventListener('scroll', throttledScroll);

// Lazy Load Module (nur wenn nötig)
const flashcards = await LernraumPerformance.lazyLoad('flashcards');
flashcards.startStudy();

// Batch DOM Updates (verhindert Reflow-Thrashing)
LernraumPerformance.batchDOM(() => {
  item1.textContent = 'New';
  item2.style.color = 'red';
  item3.classList.add('active');
});
```

---

### **2. Data Layer (IndexedDB)**

```javascript
// Initialisiere Storage
await LernraumStorage.init();

// Speichere Daten (automatisch IndexedDB oder localStorage)
await LernraumStorage.put('todos', {
  id: 'todo-1',
  text: 'Aufgabe',
  status: 'geplant'
});

// Hole alle Todos
const todos = await LernraumStorage.getAll('todos');

// Query mit Index (schnell!)
const completedTodos = await LernraumStorage.queryIndex('todos', 'status', 'erledigt');

// Speichergröße prüfen
const size = await LernraumStorage.getStorageSize();
console.log(`Using ${size.percent}% of quota`);

// Migriere alte localStorage Daten
await LernraumStorage.migrateFromLocalStorage();
```

---

### **3. User Feedback & Error Handling**

```javascript
// Einfache Benachrichtigung
LernraumUI.notify('Gespeichert!', 'success');
LernraumUI.notify('Fehler beim Speichern', 'error', 6000);
LernraumUI.notify('Warnung!', 'warning');

// Mit Ladeindikator und Error-Handling
const result = await LernraumUI.asyncOperation(
  async () => {
    // Deine Operation
    const todo = { id: '123', text: 'Test' };
    await saveTodo(todo);
    return todo;
  },
  {
    loadingMessage: 'Speichere Aufgabe...',
    successMessage: 'Aufgabe gespeichert!',
    errorMessage: 'Fehler beim Speichern',
    showLoading: true,
    showSuccess: true
  }
);

if (result.success) {
  console.log('Saved:', result.data);
} else {
  console.error('Failed:', result.error);
}

// Bestätigung
const confirmed = await LernraumUI.confirm('Sicher löschen?');
```

---

### **4. Core Utilities**

```javascript
// Unique ID generieren
const id = LernraumCore.utils.uid();

// HTML sicher escapen
const safe = LernraumCore.utils.escapeHtml('<script>');

// Daten speichern
await LernraumCore.save('my-key', { data: 'value' });

// Daten laden (mit Fallback)
const data = await LernraumCore.safeGet('my-key', { default: 'value' });

// ISO Daten
const today = LernraumCore.utils.todayISO(); // "2026-08-29"
const date = LernraumCore.utils.localISODate(new Date('2026-01-01')); // "2026-01-01"

// Benachrichtigung
LernraumCore.utils.notify('Erfolg!', 'success');
```

---

## 🔄 Data Flow

```
User Interaction
    ↓
LernraumPerformance (Debounce/Throttle)
    ↓
Data Operation (Add/Edit/Delete)
    ↓
LernraumStorage (IndexedDB)
    ↓
LernraumUI (Feedback)
    ↓
Render
```

---

## ⚡ Performance Tips

1. **Debounce häufige Events:**
   ```javascript
   const save = LernraumPerformance.debounce(
     () => saveNote(note), 
     500
   );
   document.addEventListener('input', save);
   ```

2. **Lazy Load große Features:**
   ```javascript
   // Nur laden wenn Benutzer zu Flashcards geht
   async function goToFlashcards() {
     const fc = await LernraumPerformance.lazyLoad('flashcards');
     fc.renderUI();
   }
   ```

3. **Batch DOM Updates:**
   ```javascript
   // Statt einzelne Updates
   LernraumPerformance.batchDOM(() => {
     items.forEach(item => {
       item.innerHTML = 'new';
       item.style.color = 'red';
     });
   });
   ```

4. **Nutze Storage-Indizes:**
   ```javascript
   // Schnell: indexed query
   const urgent = await LernraumStorage.queryIndex('todos', 'status', 'geplant');
   
   // Langsam: filter nach getAll
   const urgent = (await LernraumStorage.getAll('todos'))
     .filter(t => t.status === 'geplant');
   ```

---

## 🔐 Error Handling Pattern

```javascript
// Immer asyncOperation verwenden:
const result = await LernraumUI.asyncOperation(
  async () => {
    if (!isValid(data)) {
      throw new Error('Ungültige Daten');
    }
    await save(data);
    return data;
  },
  {
    loadingMessage: 'Wird gespeichert...',
    successMessage: 'Erfolgreich gespeichert!',
    errorMessage: 'Fehler beim Speichern'
  }
);

// Oder manuell
try {
  LernraumUI.showLoading('Processing...');
  const result = await operation();
  LernraumUI.notify('Success!', 'success');
  return result;
} catch (error) {
  LernraumUI.notify(error.message, 'error');
  console.error('Operation failed:', error);
} finally {
  LernraumUI.hideLoading();
}
```

---

## 📊 Metrics & Monitoring

```javascript
// Render-Performance messen
LernraumPerformance.measureRender(() => {
  renderDashboard();
}, 'Dashboard Render');

// Metriken abrufen
const metrics = LernraumPerformance.getMetrics();
console.log(`Average render time: ${metrics.avgRenderTime}ms`);

// Storage nutzen
const storageSize = await LernraumStorage.getStorageSize();
if (storageSize.percent > 90) {
  LernraumUI.notify('Speicher fast voll!', 'warning');
}
```

---

## 🚀 Next Steps

1. ✅ Modulare Struktur
2. ✅ Performance-Optimierungen
3. ✅ IndexedDB-Integration
4. ✅ UX & Error Handling
5. ⏳ Extract mehr Features in Module (Flashcards, Events, Stats)
6. ⏳ Service Worker mit IndexedDB
7. ⏳ Offline-First Synchronization

---

## 📝 Adding New Modules

Siehe `modules/README.md` für detaillierte Anleitung.
