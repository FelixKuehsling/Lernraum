/* ============================================================
   LERNRAUM – DATEN EXPORTIEREN / IMPORTIEREN, KONTO LÖSCHEN
   (Einstellungen)
============================================================ */
(function () {
  'use strict';

  const DOC_EXPORT_LIMIT = 100 * 1024 * 1024; // Dateien nur bis 100 MB gesamt mit exportieren
  const BACKUP_FORMAT = 'lernraum-backup';

  function loggedInUser() {
    try { return (typeof lernraumSyncUser !== 'undefined' && lernraumSyncUser) || null; }
    catch (e) { return null; }
  }

  function toast(msg, type) {
    if (typeof notify === 'function') notify(msg, type);
    else alert(msg);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function todayStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /* ---------- Export ---------- */

  window.exportLernraumData = async function () {
    if (typeof createLernraumSnapshot !== 'function') return;
    const button = document.getElementById('lr-export-btn');
    if (button) { button.disabled = true; button.textContent = 'Wird erstellt …'; }

    try {
      const snapshot = createLernraumSnapshot();
      const files = {};
      let total = 0;
      let skipped = 0;

      for (const doc of (state.docs || [])) {
        try {
          const blob = await window.idbGetFile(doc.id);
          if (!blob) { skipped++; continue; }
          if (total + blob.size > DOC_EXPORT_LIMIT) { skipped++; continue; }
          total += blob.size;
          files[doc.id] = await blobToDataUrl(blob);
        } catch (e) {
          skipped++;
        }
      }

      const backup = {
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        snapshot,
        files
      };

      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lernraum-backup-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      toast(skipped
        ? `Backup gespeichert (${skipped} Datei${skipped === 1 ? '' : 'en'} ohne Inhalt – zu groß oder nicht auf diesem Gerät).`
        : 'Backup gespeichert.');
    } catch (e) {
      console.error('Export fehlgeschlagen:', e);
      toast('Backup konnte nicht erstellt werden.', 'error');
    } finally {
      if (button) { button.disabled = false; button.textContent = '↓ Backup herunterladen'; }
    }
  };

  /* ---------- Import ---------- */

  window.importLernraumData = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) importFromFile(file);
    };
    input.click();
  };

  async function importFromFile(file) {
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch (e) {
      toast('Die Datei ist kein gültiges Lernraum-Backup.', 'error');
      return;
    }

    const snapshot = backup?.format === BACKUP_FORMAT ? backup.snapshot : backup;
    const looksValid = snapshot && typeof snapshot === 'object' &&
      ['notes', 'todos', 'events', 'cards'].some(k => Array.isArray(snapshot[k]));
    if (!looksValid) {
      toast('Die Datei ist kein gültiges Lernraum-Backup.', 'error');
      return;
    }

    const date = backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString('de-DE') : 'unbekannt';
    const where = loggedInUser() ? 'auf diesem Gerät und in deinem Konto' : 'auf diesem Gerät';
    if (!window.confirm(`Backup vom ${date} laden?\n\nAlle aktuellen Lernraum-Daten ${where} werden dadurch ersetzt.`)) return;

    try {
      const files = backup.files || {};

      /* Dateien zuerst lokal speichern */
      const docs = Array.isArray(snapshot.docs) ? snapshot.docs.map(d => ({ ...d })) : [];
      for (const doc of docs) {
        const dataUrl = files[doc.id];
        if (!dataUrl) continue;
        const blob = await (await fetch(dataUrl)).blob();
        await window.idbPutFile(doc.id, doc.mime ? new Blob([blob], { type: doc.mime }) : blob);
        doc.cloud = false; // wird bei Login neu hochgeladen
      }

      state.docs = [];
      await applyLernraumSnapshot({ ...snapshot, docs });

      if (loggedInUser()) {
        await uploadLernraumData();
        if (typeof window.lernraumSyncDocs === 'function') window.lernraumSyncDocs();
      }

      toast('Backup geladen.');
    } catch (e) {
      console.error('Import fehlgeschlagen:', e);
      toast('Backup konnte nicht geladen werden.', 'error');
    }
  }

  /* ---------- Konto löschen ---------- */

  window.openDeleteAccountDialog = function () {
    const user = loggedInUser();

    if (!user) {
      openModal(`
        <div class="modal-head"><h2 style="margin:0;font-size:18px;">Konto löschen</h2></div>
        <p style="font-size:14px;line-height:1.5;color:var(--ink-soft);">Du bist gerade nicht angemeldet. Melde dich zuerst mit dem Konto an, das du löschen möchtest.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
          <button class="btn" onclick="closeModal(); openSyncDialog();">Anmelden</button>
        </div>`);
      return;
    }

    openModal(`
      <div class="modal-head"><h2 style="margin:0;font-size:18px;color:var(--error);">Konto endgültig löschen</h2></div>
      <p style="font-size:14px;line-height:1.5;color:var(--ink-soft);margin:10px 0;">
        Dein Konto <strong>${escapeHtml(user.email || '')}</strong> und alle in der Cloud gespeicherten Daten (Notizen, Termine, Karteikarten, Unterlagen …) werden gelöscht. Das kann nicht rückgängig gemacht werden.
      </p>
      <p style="font-size:13px;line-height:1.5;color:var(--ink-soft);margin:10px 0;">Tipp: Lade vorher ein Backup herunter, wenn du deine Daten behalten möchtest.</p>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:12px 0;cursor:pointer;">
        <input type="checkbox" id="lr-delete-local" checked> Auch alle Daten auf diesem Gerät löschen
      </label>
      <label style="display:block;font-size:13px;margin:12px 0 6px;">Zum Bestätigen <strong>LÖSCHEN</strong> eingeben:</label>
      <input type="text" id="lr-delete-confirm" autocomplete="off" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg-soft);color:var(--ink);font:inherit;">
      <div id="lr-delete-status" style="font-size:12.5px;color:var(--error);min-height:18px;margin-top:8px;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
        <button class="btn" id="lr-delete-go" style="background:var(--error);border-color:var(--error);color:#fff;" onclick="deleteLernraumAccount()">Konto löschen</button>
      </div>`);
    setTimeout(() => document.getElementById('lr-delete-confirm')?.focus(), 50);
  };

  window.deleteLernraumAccount = async function () {
    const user = loggedInUser();
    const status = document.getElementById('lr-delete-status');
    const button = document.getElementById('lr-delete-go');
    const typed = (document.getElementById('lr-delete-confirm')?.value || '').trim().toUpperCase();
    const deleteLocal = !!document.getElementById('lr-delete-local')?.checked;

    if (!user) return;
    if (typed !== 'LÖSCHEN' && typed !== 'LOESCHEN') {
      status.textContent = 'Bitte „LÖSCHEN“ eingeben.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Wird gelöscht …';
    status.textContent = '';

    /* Keine weiteren Uploads mehr */
    try {
      clearTimeout(lernraumSyncTimer);
      lernraumSyncTimer = null;
      lernraumCloudReady = false;
    } catch (e) {}

    try {
      /* 1. Hochgeladene Dateien entfernen */
      const bucket = supabaseClient.storage.from('lernraum-docs');
      for (let round = 0; round < 20; round++) {
        const { data: list, error } = await bucket.list(user.id, { limit: 1000 });
        if (error || !list?.length) break;
        const { error: removeError } = await bucket.remove(list.map(f => `${user.id}/${f.name}`));
        if (removeError) throw removeError;
        if (list.length < 1000) break;
      }

      /* 2. Konto und Cloud-Daten löschen (Datenbank-Funktion) */
      const { error } = await supabaseClient.rpc('delete_my_account');
      if (error) throw error;
    } catch (e) {
      console.error('Konto löschen fehlgeschlagen:', e);
      status.textContent = 'Löschen fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler') + '. Bitte später erneut versuchen.';
      button.disabled = false;
      button.textContent = 'Konto löschen';
      try { lernraumCloudReady = true; } catch (err) {}
      return;
    }

    /* 3. Abmelden (Sitzung ist ohnehin ungültig) */
    try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch (e) {}
    try { lernraumSyncUser = null; lernraumLastSyncAt = null; } catch (e) {}

    /* 4. Optional lokale Daten löschen */
    if (deleteLocal) {
      /* Auch den Speicher im laufenden Programm leeren – sonst schreibt
         die App beim Neuladen (pagehide) Module wieder zurück. */
      try {
        modules = [];
        ['notes', 'todos', 'events', 'cards', 'cardFolders', 'noteFolders', 'docs', 'docFolders']
          .forEach(k => { state[k] = []; });
        learningHistory = [];
        studyPlans = [];
      } catch (e) {}
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('lernraum') || k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}
      await new Promise(resolve => {
        try {
          const req = indexedDB.deleteDatabase('lernraum_files');
          req.onsuccess = req.onerror = req.onblocked = () => resolve();
        } catch (e) { resolve(); }
      });
    } else {
      try {
        localStorage.removeItem('lernraum_user');
        localStorage.removeItem('lernraum_user_email');
        (state.docs || []).forEach(d => { d.cloud = false; });
        await save('lernraum_docs_index', state.docs || []);
      } catch (e) {}
    }

    closeModal();
    alert('Dein Konto wurde gelöscht.');
    location.reload();
  };

  /* ---------- Anzeige in den Einstellungen ---------- */

  function updateAccountCard() {
    const hint = document.getElementById('lr-delete-hint');
    if (!hint) return;
    const user = loggedInUser();
    hint.textContent = user
      ? `Löscht ${user.email || 'dein Konto'} und alle Daten in der Cloud.`
      : 'Nur möglich, wenn du angemeldet bist.';
  }

  setInterval(updateAccountCard, 3000);
  document.addEventListener('DOMContentLoaded', updateAccountCard);
})();
