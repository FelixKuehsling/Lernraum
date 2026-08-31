# Lernraum Modules

Die App ist jetzt in **modulare Komponenten** unterteilt für bessere Wartbarkeit und Struktur.

## Struktur

```
modules/
├── core.js          ← Shared utilities (storage, utils, uid, escapeHtml)
├── notes.js         ← Note management
├── tasks.js         ← Task/Todo management
├── [NEW]
├── flashcards.js    ← Flashcard system
├── events.js        ← Calendar events
└── stats.js         ← Statistics & analytics
```

## Verwendung

Jedes Modul exportiert seine Funktionen als globales Objekt:

```javascript
// Core
LernraumCore.utils.escapeHtml(text)
LernraumCore.save(key, data)

// Notes
LernraumNotes.createNote()
LernraumNotes.deleteNote(id)

// Tasks  
LernraumTasks.addTodo()
LernraumTasks.filteredWorkspaceTasks()
```

## Wie man ein neues Modul hinzufügt

1. **Datei erstellen:** `modules/feature.js`

```javascript
const LernraumFeature = (() => {
  const { utils, save } = LernraumCore;
  
  function myFunction() {
    // ...
  }
  
  return {
    myFunction,
    // ... weitere exported functions
  };
})();

window.LernraumFeature = LernraumFeature;
```

2. **In index.html laden:**

```html
<script src="modules/core.js"></script>
<script src="modules/feature.js"></script>
<script src="script.js"></script>
```

## Nächste Schritte

- ✅ Core-System etabliert
- ⏳ Flashcards in Module extrahieren
- ⏳ Events/Calendar in Module extrahieren
- ⏳ Stats in Module extrahieren
- ⏳ Alte script.js vereinfachen

## Design Tokens (CSS)

Neue CSS-Variablen in `style.css`:

```css
/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;

/* Border Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;

/* Typography */
--font-size-sm: 11.5px;
--font-size-base: 14px;
--font-size-lg: 15px;

/* Transitions */
--transition-fast: 0.1s ease;
--transition-base: 0.15s ease;
```

Verwende diese statt hardcodierter Werte! 🎨
