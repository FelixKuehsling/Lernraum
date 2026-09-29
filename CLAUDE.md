# Lernraum – Projektkontext für Claude Code

Lern-Web-App für Studierende (Deutsch). Live: https://felixkuehsling.github.io/Lernraum/
Betreiber: Felix Kühsling. Antworte ihm auf Deutsch, kurz und verständlich; er ist kein
Profi-Entwickler. Klare Anweisungen direkt umsetzen, ohne lange Rückfragen.

## Aufbau

Reines HTML/CSS/JS ohne Build-Schritt, gehostet auf GitHub Pages (Branch `main`,
jeder Push ist nach ~1 Min. live). Cache-Busting über `?v=` an den Script-/CSS-Tags
in `index.html` – **bei jeder Änderung an einer JS/CSS-Datei die Versionsnummer erhöhen.**

Ladereihenfolge in `index.html` (wichtig!):
1. `vendor/supabase-2.117.2.js`, dann **ohne defer**: `sync.js`, `settings-panel.js`
2. **mit defer** (laufen danach): `app-v1.js`, `calendar-redesign-v3.js`, `calendar-series.js`,
   `docs-sync.js`, `onboarding.js`, `account-tools.js`
3. Inline `dashboard-v3-script`, `notifications.js`

Folge: `sync.js` läuft **vor** `app-v1.js`. Dinge aus app-v1 (z. B. `save`) dort erst in
`DOMContentLoaded` erweitern (siehe `installCloudSyncHook`).

| Datei | Inhalt |
|---|---|
| `app-v1.js` | Hauptlogik: Dashboard, Notizen, Aufgaben, Module, Karteikarten, Lernplan, Unterlagen (IndexedDB `lernraum_files`), Lernuhr, Statistik. Globale Zustände: `state` (notes, todos, events, cards, docs, docFolders …), `modules`, `learningHistory`, `studyPlans`, `stats`. Speichern immer über `save(key, value)` (localStorage, Präfix `lernraum__private__`). |
| `calendar-redesign-v3.js` | Kalender (Monat/Woche, Tages-Popup), überschreibt Kalender-Funktionen via `window.*` |
| `calendar-series.js` | Neue Termine inkl. Wiederholung, Bearbeiten (`lrEditCalendarEvent`), Löschen mit Serien-Auswahl |
| `sync.js` | Supabase-Login/Registrierung/Passwort-Reset, Cloud-Sync (ganzer Snapshot in Tabelle `lernraum_sync`, last-writer-wins, Schutz für nicht hochgeladene Änderungen via `lernraum_sync_pending`) |
| `docs-sync.js` | Unterlagen-Dateien im Supabase-Storage-Bucket `lernraum-docs` (`<user_id>/<doc_id>`), lädt fehlende Dateien automatisch aus der Cloud. Außerdem die Datei-Ansicht in der App (`openDoc`, Zurück-Knopf); PDFs über pdf.js aus `vendor/pdfjs-*/` (erst beim ersten PDF geladen, nötig fürs iPhone) |
| `account-tools.js` | Backup-Export/-Import (JSON inkl. Dateien), Konto löschen (RPC `delete_my_account`) |
| `onboarding.js` | Einführungs-Tour für neue Nutzer + Banner „Daten nur im Browser“ |
| `settings-panel.js` | Status-Anzeige in den Einstellungen |
| `rechtliches.html` | Impressum & Datenschutz – bei neuen Datenverarbeitungen anpassen! |

Farben/Theme: CSS-Variablen in `style.css` (`--bg`, `--surface`, `--ink`, `--sage`, `--error` …),
Dunkelmodus über Klasse `html.dark`. Schriften lokal in `assets/fonts/` (keine Google-Fonts-Verbindung).

## Supabase (vom Betreiber eingerichtet)

- Tabelle `lernraum_sync` (user_id, data jsonb, updated_at) mit RLS: nur eigene Zeile
- Storage-Bucket `lernraum-docs` (privat, 50 MB/Datei), Policies: nur eigener Ordner
- Funktion `delete_my_account()` (security definer)
- Site URL / Redirect: `https://felixkuehsling.github.io/Lernraum/**`

Neue Datenbank-Änderungen kann Claude nicht selbst ausführen: SQL an Felix geben,
er fügt es im Supabase SQL Editor ein.

## Tests

Playwright (Chromium) + lokaler Server:

```bash
python3 -m http.server 8765 &          # im Repo-Ordner
node tests/run.js tests/regression.js  # alle Kernfunktionen, schreibt JSON-Ergebnis
node tests/run.js tests/sync-e2e.js    # Sync gegen nachgebauten Supabase-Server
MOBILE=1 node tests/run.js tests/regression.js
python3 tests/compare.py alt.json neu.json   # Ergebnisse vorher/nachher vergleichen
```

Vorgehen bei Änderungen: vorher Regression laufen lassen (OUT=vorher.json), ändern,
nachher (OUT=nachher.json), vergleichen. Am Handy-Format (MOBILE=1) und im Dunkelmodus
per Screenshot prüfen.

## Bekannte Eigenheiten

- In app-v1.js gibt es noch Schichten von Überschreibungen (`const old = fn; fn = function(){ old(); … }`).
  Vor dem Entfernen einer Funktion prüfen, ob sie später überschrieben/umhüllt wird.
- Template-Strings nie über mehrere Zeilen umbrechen, wenn sie Datumswerte bauen
  (hat früher kaputte Datumsangaben erzeugt).
- Nutzereingaben beim Einfügen in HTML immer mit `escapeHtml` escapen.

## Mögliche nächste Schritte

- Ideen aus dem Feedback umsetzen
- app-v1.js weiter entflechten (Überschreibungs-Schichten zusammenführen)
