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
  let pdfViewer = null;

  /* PDF-Anzeige mit pdf.js (liegt in vendor/, wird erst beim ersten PDF geladen).
     Nötig, weil iPhone/iPad PDFs im iframe nur als erste Seite zeigen. */
  const PDFJS_DIR = 'vendor/pdfjs-6.3.289/';
  let pdfjsPromise = null;
  function loadPdfjs() {
    if (!pdfjsPromise) {
      const base = new URL(PDFJS_DIR, document.baseURI).href;
      pdfjsPromise = import(base + 'pdf.min.js').then(lib => {
        lib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
        return { lib, base };
      });
      pdfjsPromise.catch(() => { pdfjsPromise = null; });
    }
    return pdfjsPromise;
  }

  function createPdfViewer(body, blob, fallback) {
    let destroyed = false, doc = null, loadTask = null, observer = null, zoom = 1, pages = [];
    const scroller = document.createElement('div');
    scroller.className = 'lr-pdf-scroller';
    scroller.innerHTML = '<div class="lr-pdf-status">PDF wird geladen …</div>';
    const tools = document.createElement('div');
    tools.className = 'lr-pdf-tools';
    tools.innerHTML = '<button type="button" data-z="-1" aria-label="Verkleinern">−</button>' +
      '<span class="lr-pdf-info"></span>' +
      '<button type="button" data-z="1" aria-label="Vergrößern">+</button>';
    body.classList.add('lr-pdf-body');
    body.appendChild(scroller);
    body.appendChild(tools);
    const info = tools.querySelector('.lr-pdf-info');

    function renderPage(p) {
      if (p.rendered || destroyed) return;
      p.rendered = true;
      doc.getPage(p.num).then(page => {
        if (destroyed) return;
        const vp = page.getViewport({ scale: p.cssWidth / page.getViewport({ scale: 1 }).width });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width * ratio);
        canvas.height = Math.floor(vp.height * ratio);
        canvas.style.width = vp.width + 'px';
        canvas.style.height = vp.height + 'px';
        p.el.style.height = vp.height + 'px';
        p.task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport: vp,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null });
        return p.task.promise.then(() => { if (!destroyed) { p.el.innerHTML = ''; p.el.appendChild(canvas); } });
      }).catch(() => { p.rendered = false; });
    }

    function layout() {
      if (destroyed || !doc) return;
      const keep = scroller.scrollHeight ? scroller.scrollTop / scroller.scrollHeight : 0;
      observer && observer.disconnect();
      pages.forEach(p => p.task && p.task.cancel && p.task.cancel());
      scroller.innerHTML = '';
      const cssWidth = Math.max(200, Math.min(scroller.clientWidth - 24, 900) * zoom);
      observer = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) renderPage(pages[+e.target.dataset.i]);
      }), { root: scroller, rootMargin: '600px 0px' });
      pages = [];
      for (let i = 0; i < doc.numPages; i++) {
        const el = document.createElement('div');
        el.className = 'lr-pdf-page';
        el.dataset.i = i;
        el.style.width = cssWidth + 'px';
        el.style.height = Math.round(cssWidth * doc._lrRatio) + 'px';
        scroller.appendChild(el);
        pages.push({ num: i + 1, el, cssWidth, rendered: false });
        observer.observe(el);
      }
      scroller.scrollTop = keep * scroller.scrollHeight;
      info.textContent = doc.numPages + (doc.numPages === 1 ? ' Seite' : ' Seiten') + ' · ' + Math.round(zoom * 100) + ' %';
    }

    tools.addEventListener('click', e => {
      const b = e.target.closest('button[data-z]');
      if (!b) return;
      zoom = Math.min(3, Math.max(0.5, zoom + (+b.dataset.z) * 0.25));
      layout();
    });

    loadPdfjs().then(({ lib, base }) => blob.arrayBuffer().then(data => {
      if (destroyed) return;
      const task = loadTask = lib.getDocument({ data, cMapUrl: base + 'cmaps/', cMapPacked: true,
        standardFontDataUrl: base + 'standard_fonts/', wasmUrl: base + 'wasm/', iccUrl: base + 'iccs/',
        isEvalSupported: false, enableXfa: false });
      return task.promise.then(d => {
        doc = d;
        if (destroyed) { task.destroy(); return; }
        return d.getPage(1).then(first => {
          const v = first.getViewport({ scale: 1 });
          d._lrRatio = v.height / v.width;
          layout();
        });
      });
    })).catch(() => { if (!destroyed) { scroller.remove(); tools.remove(); fallback(); } });

    const onResize = () => layout();
    window.addEventListener('resize', onResize);
    return {
      destroy() {
        destroyed = true;
        window.removeEventListener('resize', onResize);
        observer && observer.disconnect();
        pages.forEach(p => p.task && p.task.cancel && p.task.cancel());
        loadTask && loadTask.destroy();
      }
    };
  }

  function previewKind(meta, blob) {
    const type = (blob.type || meta.mime || '').toLowerCase();
    const name = (meta.name || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.startsWith('text/') || /\.(txt|md|csv)$/.test(name)) return 'frame';
    return null;
  }

  function closeDocViewer(fromHistory) {
    const el = document.getElementById('lr-doc-viewer');
    if (!el) return;
    el.remove();
    document.body.classList.remove('lr-doc-viewer-open');
    if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
    if (pdfViewer) { pdfViewer.destroy(); pdfViewer = null; }
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
    const showFrame = () => {
      const f = document.createElement('iframe');
      f.className = 'lr-doc-viewer-media lr-doc-viewer-frame';
      f.title = meta.name || 'Datei';
      f.src = viewerUrl;
      body.appendChild(f);
    };
    if (kind === 'pdf') pdfViewer = createPdfViewer(body, blob, showFrame);
    else if (kind === 'image') { media = document.createElement('img'); media.alt = meta.name || ''; }
    else if (kind === 'video' || kind === 'audio') { media = document.createElement(kind); media.controls = true; }
    else if (kind === 'frame') { media = document.createElement('iframe'); media.title = meta.name || 'Datei'; }
    if (media) {
      media.className = 'lr-doc-viewer-media lr-doc-viewer-' + kind;
      media.src = viewerUrl;
      body.appendChild(media);
    } else if (kind !== 'pdf') {
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
