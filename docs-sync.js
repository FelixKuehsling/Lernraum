/* ============================================================
   LERNRAUM – UNTERLAGEN IN DER CLOUD
   ------------------------------------------------------------
   Ohne Konto liegen hochgeladene Dateien nur im Browser
   (IndexedDB). Browser – vor allem Safari auf iPhone/Mac –
   löschen diese Daten nach einiger Zeit ohne Nachfrage.

   Mit Konto wird jede Datei zusätzlich im privaten Supabase-
   Speicher abgelegt (Bucket „lernraum-docs“, Ordner = User-ID).
   Fehlt eine Datei lokal, wird sie beim Öffnen automatisch
   aus der Cloud geladen – auch auf anderen Geräten.
============================================================ */
(function () {
  'use strict';

  const BUCKET = 'lernraum-docs';
  const CLOUD_MAX_BYTES = 50 * 1024 * 1024;

  let syncRunning = false;
  let syncAgain = false;

  /* ---------- Hilfen ---------- */

  function user() {
    try { return (typeof lernraumSyncUser !== 'undefined' && lernraumSyncUser) || null; }
    catch (e) { return null; }
  }

  function cloudReady() {
    try { return !!user() && typeof lernraumCloudReady !== 'undefined' && lernraumCloudReady; }
    catch (e) { return false; }
  }

  function bucket() {
    return supabaseClient.storage.from(BUCKET);
  }

  function pathFor(docId) {
    return `${user().id}/${docId}`;
  }

  function docs() {
    return (typeof state !== 'undefined' && Array.isArray(state.docs)) ? state.docs : [];
  }

  /* Browser bitten, die gespeicherten Daten nicht automatisch zu löschen */
  async function requestPersistentStorage() {
    try {
      if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
        await navigator.storage.persist();
      }
    } catch (e) {}
  }

  /* ---------- Hochladen ---------- */

  async function uploadDoc(doc) {
    const blob = await idbGetFileLocal(doc.id);
    if (!blob) return false;
    if (blob.size > CLOUD_MAX_BYTES) return false;

    const { error } = await bucket().upload(pathFor(doc.id), blob, {
      upsert: true,
      contentType: doc.mime || blob.type || 'application/octet-stream'
    });

    if (error) {
      console.warn('Unterlage konnte nicht gesichert werden:', doc.name, error.message);
      return false;
    }
    return true;
  }

  /* Alle Unterlagen hochladen, die noch nicht in der Cloud sind */
  async function syncDocs() {
    if (!cloudReady()) return;
    if (syncRunning) { syncAgain = true; return; }
    syncRunning = true;

    try {
      let changed = false;
      for (const doc of docs().filter(d => !d.cloud)) {
        if (!cloudReady()) break;
        try {
          if (await uploadDoc(doc)) {
            doc.cloud = true;
            changed = true;
          }
        } catch (e) {
          console.warn('Unterlagen-Sync:', e);
        }
      }
      if (changed) {
        await save('lernraum_docs_index', docs());
        if (typeof renderDocList === 'function') renderDocList();
      }
    } finally {
      syncRunning = false;
      renderCloudHint();
      if (syncAgain) { syncAgain = false; setTimeout(syncDocs, 500); }
    }
  }

  window.lernraumSyncDocs = syncDocs;

  /* ---------- Lokalen Speicher erweitern ---------- */

  const idbGetFileLocal = window.idbGetFile;
  const idbPutFileLocal = window.idbPutFile;
  const idbDeleteFileLocal = window.idbDeleteFile;

  /* Datei fehlt lokal → aus der Cloud holen und lokal ablegen */
  window.idbGetFile = async function (id) {
    let blob = null;
    try { blob = await idbGetFileLocal(id); } catch (e) {}
    if (blob) return blob;

    const meta = docs().find(d => d.id === id);
    if (!meta || !meta.cloud || !user()) return blob;

    if (typeof notify === 'function') notify('Lade „' + meta.name + '“ aus der Cloud …');

    const { data, error } = await bucket().download(pathFor(id));
    if (error || !data) {
      console.warn('Cloud-Download fehlgeschlagen:', error?.message);
      return null;
    }
    const file = meta.mime ? new Blob([data], { type: meta.mime }) : data;
    try { await idbPutFileLocal(id, file); } catch (e) {}
    return file;
  };

  /* Nach dem Speichern einer neuen Datei gleich sichern */
  window.idbPutFile = async function (id, file) {
    const result = await idbPutFileLocal(id, file);
    requestPersistentStorage();
    return result;
  };

  window.idbDeleteFile = async function (id) {
    const meta = docs().find(d => d.id === id);
    const result = await idbDeleteFileLocal(id);
    if (meta?.cloud && user()) {
      bucket().remove([pathFor(id)]).then(({ error }) => {
        if (error) console.warn('Cloud-Löschen fehlgeschlagen:', error.message);
      });
    }
    return result;
  };

  /* Neue oder geänderte Unterlagen-Liste → Upload anstoßen */
  const saveBefore = window.save;
  window.save = async function (key, ...rest) {
    const result = await saveBefore.call(this, key, ...rest);
    if (key === 'lernraum_docs_index' && docs().some(d => !d.cloud)) {
      setTimeout(syncDocs, 300);
    }
    return result;
  };

  /* Öffnen: Datei in einer Ansicht innerhalb der App zeigen (mit Zurück-Knopf).
     Früher ging ein neues Fenster auf – in der Handy-App (Startbildschirm)
     kam man daraus nicht mehr zurück. */
  let viewerUrl = null;

  function previewKind(meta, blob) {
    const type = (blob.type || meta.mime || '').toLowerCase();
    const name = (meta.name || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'frame';
    if (type.startsWith('text/') || /\.(txt|md|csv)$/.test(name)) return 'frame';
    return null;
  }

  function closeDocViewer(fromHistory) {
    const el = document.getElementById('lr-doc-viewer');
    if (!el) return;
    el.remove();
    document.body.classList.remove('lr-doc-viewer-open');
    if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
    if (!fromHistory && history.state && history.state.lrDocViewer) history.back();
  }
  window.closeDocViewer = () => closeDocViewer(false);

  /* Zurück-Taste von Handy/Browser schließt die Ansicht statt die App zu verlassen */
  window.addEventListener('popstate', () => closeDocViewer(true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('lr-doc-viewer')) closeDocViewer(false);
  });

  function showDocViewer(meta, blob) {
    closeDocViewer(true);
    viewerUrl = URL.createObjectURL(blob);
    const kind = previewKind(meta, blob);
    const el = document.createElement('div');
    el.id = 'lr-doc-viewer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="lr-doc-viewer-bar">' +
        '<button type="button" class="btn ghost small lr-doc-viewer-back">‹ Zurück</button>' +
        '<div class="lr-doc-viewer-name"></div>' +
        '<button type="button" class="btn small lr-doc-viewer-dl">Herunterladen</button>' +
      '</div>' +
      '<div class="lr-doc-viewer-body"></div>';
    el.querySelector('.lr-doc-viewer-name').textContent = meta.name || 'Datei';
    el.querySelector('.lr-doc-viewer-back').onclick = () => closeDocViewer(false);
    el.querySelector('.lr-doc-viewer-dl').onclick = () => window.downloadDoc(meta.id);
    const body = el.querySelector('.lr-doc-viewer-body');
    let media;
    if (kind === 'image') { media = document.createElement('img'); media.alt = meta.name || ''; }
    else if (kind === 'video' || kind === 'audio') { media = document.createElement(kind); media.controls = true; }
    else if (kind === 'frame') { media = document.createElement('iframe'); media.title = meta.name || 'Datei'; }
    if (media) {
      media.className = 'lr-doc-viewer-media lr-doc-viewer-' + kind;
      media.src = viewerUrl;
      body.appendChild(media);
    } else {
      body.innerHTML = '<div class="lr-doc-viewer-empty"><span class="emoji">📄</span>' +
        'Für diesen Dateityp gibt es keine Vorschau.<br>Lade die Datei herunter, um sie zu öffnen.</div>';
    }
    document.body.appendChild(el);
    document.body.classList.add('lr-doc-viewer-open');
    history.pushState({ lrDocViewer: true }, '');
    el.querySelector('.lr-doc-viewer-back').focus();
  }

  window.openDoc = async function (id) {
    const meta = docs().find(d => d.id === id);
    if (!meta) return;
    try {
      const blob = await window.idbGetFile(id);
      if (!blob) throw new Error('fehlt');
      showDocViewer(meta, blob);
    } catch (e) {
      notify(missingText(meta), 'error');
    }
  };

  window.downloadDoc = async function (id) {
    const meta = docs().find(d => d.id === id);
    if (!meta) return;
    try {
      const blob = await window.idbGetFile(id);
      if (!blob) throw new Error('fehlt');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = meta.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      notify(missingText(meta), 'error');
    }
  };

  function missingText(meta) {
    if (!user()) return 'Datei nicht mehr auf diesem Gerät gespeichert.';
    if (!meta.cloud) return 'Datei liegt nur auf dem Gerät, auf dem sie hochgeladen wurde.';
    return 'Datei konnte nicht geladen werden. Bitte Internetverbindung prüfen.';
  }

  /* ---------- Hinweis in „Unterlagen“ ---------- */

  function renderCloudHint() {
    const list = document.getElementById('doc-list');
    if (!list) return;
    let hint = document.getElementById('doc-cloud-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'doc-cloud-hint';
      hint.style.cssText = 'margin:4px 0 12px;padding:10px 12px;border-radius:12px;background:var(--bg-soft);border:1px solid var(--line);font-size:12.5px;line-height:1.45;color:var(--ink-soft);';
      list.parentNode.insertBefore(hint, list);
    }

    if (!user()) {
      hint.innerHTML = '⚠️ Unterlagen sind nur in diesem Browser gespeichert und können vom Browser nach einiger Zeit gelöscht werden. ' +
        '<a href="#" style="color:var(--sage-dark);font-weight:700;" onclick="openSyncDialog();return false;">Mit Konto sichern</a>';
      return;
    }

    const pending = docs().filter(d => !d.cloud).length;
    hint.textContent = pending
      ? `☁ ${pending} Unterlage${pending === 1 ? '' : 'n'} noch nicht gesichert${syncRunning ? ' – wird hochgeladen …' : ' (max. 50 MB pro Datei)'}.`
      : '☁ Alle Unterlagen sind in deinem Konto gesichert und auf allen Geräten verfügbar.';
  }

  if (typeof window.renderDocList === 'function') {
    const renderDocListBefore = window.renderDocList;
    window.renderDocList = function () {
      const result = renderDocListBefore.apply(this, arguments);
      renderCloudHint();
      return result;
    };
  }

  /* Zurück zur Seite / wieder online → ausstehende Uploads nachholen */
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(syncDocs, 1500); });
  window.addEventListener('online', () => setTimeout(syncDocs, 1500));
  setInterval(renderCloudHint, 5000);
})();
