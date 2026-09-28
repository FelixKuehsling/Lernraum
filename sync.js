const SUPABASE_URL = 'https://jureyjdijtcfcsfcmfjz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_94JcCbPPozmYQY3LkQsKhQ_YQk3kW9v';

// Merken, ob die Seite über einen "Passwort zurücksetzen"-Link geöffnet wurde
const LERNRAUM_APP_URL = 'https://felixkuehsling.github.io/Lernraum/';
const lernraumIsPasswordRecovery =
  window.location.hash.includes('type=recovery');
let lernraumRecoveryDialogShown = false;

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

let lernraumSyncUser = null;
let lernraumSyncTimer = null;
let lernraumSyncIsApplying = false;
let lernraumLastSyncAt = null;
let lernraumCloudReady = false;

/* =========================================================
   SYNC BUTTON
========================================================= */

function createSyncUi() {
  const button = document.getElementById('lernraum-sync-button');
  if (!button) return;

  button.addEventListener('click', openSyncDialog);
  updateSyncButton();
}


function updateSyncButton() {
  const button = document.getElementById('lernraum-sync-button');

  if (!button) return;

  if (lernraumSyncUser) {
    button.textContent = '✓ Daten synchronisiert';
    button.title = lernraumSyncUser.email || '';
  } else {
    button.textContent = '☁ Daten sichern';
    button.title = '';
  }

  updateLastSyncStatus();

  if (typeof updateSyncStatus === 'function') {
    updateSyncStatus();
  }
}


/* =========================================================
   LETZTE SYNCHRONISIERUNG
========================================================= */

function updateLastSyncStatus() {
  const status = document.getElementById('lernraum-sync-status');

  if (!status) return;

  if (!lernraumSyncUser) {
    status.textContent = 'zuletzt gesichert: nie';
    return;
  }

  if (!lernraumLastSyncAt) {
    status.textContent = 'zuletzt gesichert: nie';
    return;
  }

  const date = new Date(lernraumLastSyncAt);

  if (Number.isNaN(date.getTime())) {
    status.textContent = 'zuletzt gesichert: jetzt';
    return;
  }

  const formatted = new Intl.DateTimeFormat(
    'de-DE',
    {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(date);

  status.textContent = 'zuletzt gesichert: ' + formatted;
}


/* =========================================================
   SYNC FENSTER
========================================================= */

function openSyncDialog() {
  // Get current session when opening (non-blocking)
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    lernraumSyncUser = session?.user || null;
  }).catch(e => console.error('Session check error:', e));

  const old = document.getElementById('lernraum-sync-overlay');

  if (old) old.remove();

  const overlay = document.createElement('div');

  overlay.id = 'lernraum-sync-overlay';

  overlay.style.cssText = `
    position:fixed;
    inset:0;
    z-index:99999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:rgba(0,0,0,.45);
  `;

  const panel = document.createElement('div');

  panel.style.cssText = `
    width:min(420px,100%);
    background:var(--surface,#fff);
    color:var(--ink,#222);
    border:1px solid var(--line,#ddd);
    border-radius:18px;
    padding:22px;
    box-shadow:0 20px 60px rgba(0,0,0,.25);
    font-family:inherit;
  `;

  if (lernraumSyncUser) {
    panel.innerHTML = `
      <h2 style="margin:0 0 8px;">
        Lernraum Sync
      </h2>

      <p style="margin:0 0 18px;opacity:.7;">
        Angemeldet als
        ${escapeSyncHtml(lernraumSyncUser.email || '')}
      </p>

      <button
        id="sync-now-btn"
        style="${syncButtonStyle()}"
      >
        Jetzt synchronisieren
      </button>

      <button
        id="sync-logout-btn"
        style="${syncButtonStyle()}"
      >
        Abmelden
      </button>

      <button
        id="sync-close-btn"
        style="${syncButtonStyle(true)}"
      >
        Schließen
      </button>

      <div
        id="sync-message"
        style="margin-top:12px;font-size:12px;opacity:.75;"
      ></div>
    `;
  } else {
    panel.innerHTML = `
      <h2 style="margin:0 0 8px;">
        Lernraum Sync
      </h2>

      <p style="margin:0 0 16px;opacity:.7;">
        Melde dich auf Mac und iPhone mit derselben E-Mail an.
      </p>

      <input
        id="sync-email"
        type="email"
        placeholder="E-Mail"
        style="${syncInputStyle()}"
      >

      <input
        id="sync-password"
        type="password"
        placeholder="Passwort"
        style="${syncInputStyle()}"
      >

      <button
        id="sync-login-btn"
        style="${syncButtonStyle()}"
      >
        Anmelden
      </button>

      <button
        id="sync-register-btn"
        style="${syncButtonStyle(true)}"
      >
        Neues Konto erstellen
      </button>

      <button
        id="sync-forgot-btn"
        type="button"
        style="display:block;width:100%;margin-top:10px;padding:4px;background:none;border:none;color:inherit;opacity:.7;font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;"
      >
        Passwort vergessen?
      </button>

      <button
        id="sync-close-btn"
        style="${syncButtonStyle(true)}"
      >
        Schließen
      </button>

      <div
        id="sync-message"
        style="margin-top:12px;font-size:12px;opacity:.75;"
      ></div>
    `;
  }

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  document
    .getElementById('sync-close-btn')
    ?.addEventListener(
      'click',
      () => overlay.remove()
    );

  overlay.addEventListener(
    'click',
    event => {
      if (event.target === overlay) {
        overlay.remove();
      }
    }
  );

  if (lernraumSyncUser) {
    document
      .getElementById('sync-now-btn')
      ?.addEventListener(
        'click',
        syncNow
      );

    document
      .getElementById('sync-upload-btn')
      ?.addEventListener(
        'click',
        async () => {
          const success = await uploadLernraumData();

          if (success) {
            setSyncMessage(
              'Daten wurden hochgeladen.'
            );
          }
        }
      );

    document
      .getElementById('sync-download-btn')
      ?.addEventListener(
        'click',
        async () => {
          const ok = confirm(
            'Cloud-Daten auf dieses Gerät laden? Lokale Lernraum-Daten werden ersetzt.'
          );

          if (!ok) return;

          await downloadLernraumData();
        }
      );

    document
      .getElementById('sync-logout-btn')
      ?.addEventListener(
        'click',
        logoutLernraum
      );
  } else {
    document
      .getElementById('sync-login-btn')
      ?.addEventListener(
        'click',
        loginLernraum
      );

    document
      .getElementById('sync-register-btn')
      ?.addEventListener(
        'click',
        registerLernraum
      );

    document
      .getElementById('sync-forgot-btn')
      ?.addEventListener(
        'click',
        resetPasswordLernraum
      );

    // Enter-Taste im Passwortfeld = Anmelden
    document
      .getElementById('sync-password')
      ?.addEventListener(
        'keydown',
        event => {
          if (event.key === 'Enter') loginLernraum();
        }
      );
  }
}


/* =========================================================
   STYLES
========================================================= */

function syncInputStyle() {
  return `
    width:100%;
    box-sizing:border-box;
    padding:11px 12px;
    margin-bottom:9px;
    border:1px solid var(--line,#ddd);
    border-radius:10px;
    background:var(--bg,#fff);
    color:var(--ink,#222);
    font:inherit;
  `;
}


function syncButtonStyle(secondary = false) {
  return `
    width:100%;
    padding:10px 12px;
    margin-top:8px;
    border-radius:10px;
    border:1px solid var(--line,#ddd);
    background:${
      secondary
        ? 'transparent'
        : 'var(--sage,#7c9473)'
    };
    color:${
      secondary
        ? 'var(--ink,#222)'
        : '#fff'
    };
    font:inherit;
    font-weight:700;
    cursor:pointer;
  `;
}


function setSyncMessage(message) {
  const element = document.getElementById('sync-message');

  if (element) {
    element.textContent = message;
  }
}


function escapeSyncHtml(value) {
  const div = document.createElement('div');

  div.textContent = value || '';

  return div.innerHTML;
}


/* =========================================================
   REGISTRIEREN
========================================================= */

async function registerLernraum() {
  const email =
    document
      .getElementById('sync-email')
      ?.value
      .trim();

  const password =
    document
      .getElementById('sync-password')
      ?.value;

  if (!email || !password) {
    setSyncMessage(
      'Bitte E-Mail und Passwort eingeben.'
    );

    return;
  }

  setSyncMessage(
    'Konto wird erstellt …'
  );

  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          LERNRAUM_APP_URL
      }
    });

  if (error) {
    setSyncMessage(error.message);
    return;
  }

  if (data.session) {
    lernraumSyncUser = data.user;

    // Speichere User in localStorage
    if (lernraumSyncUser) {
      localStorage.setItem('lernraum_user', lernraumSyncUser.id);
      localStorage.setItem('lernraum_user_email', lernraumSyncUser.email);
    }

    updateSyncButton();

    // Update settings panel status
    if (typeof updateSyncStatus === 'function') {
      updateSyncStatus();
    }

    await initializeCloudAfterLogin();

    openSyncDialog();
  } else {
    setSyncMessage(
      'Konto erstellt. Prüfe deine E-Mails und bestätige den Login-Link.'
    );
  }
}


/* =========================================================
   ANMELDEN
========================================================= */

async function loginLernraum() {
  const email =
    document
      .getElementById('sync-email')
      ?.value
      .trim();

  const password =
    document
      .getElementById('sync-password')
      ?.value;

  if (!email || !password) {
    setSyncMessage(
      'Bitte E-Mail und Passwort eingeben.'
    );

    return;
  }

  setSyncMessage(
    'Anmeldung läuft …'
  );

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    setSyncMessage(error.message);
    return;
  }

  lernraumSyncUser = data.user;

  // Speichere User in localStorage für settings.js
  if (lernraumSyncUser) {
    localStorage.setItem('lernraum_user', lernraumSyncUser.id);
    localStorage.setItem('lernraum_user_email', lernraumSyncUser.email);
  }

  updateSyncButton();

  // Update settings panel status
  if (typeof updateSyncStatus === 'function') {
    updateSyncStatus();
  }

  await initializeCloudAfterLogin();

  openSyncDialog();
}


/* =========================================================
   PASSWORT VERGESSEN
========================================================= */

async function resetPasswordLernraum() {
  const email =
    document
      .getElementById('sync-email')
      ?.value
      .trim();

  if (!email) {
    setSyncMessage(
      'Bitte zuerst oben deine E-Mail-Adresse eingeben.'
    );
    return;
  }

  setSyncMessage('E-Mail wird gesendet …');

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(
      email,
      { redirectTo: LERNRAUM_APP_URL }
    );

  if (error) {
    setSyncMessage(error.message);
    return;
  }

  setSyncMessage(
    'Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Schau auch im Spam-Ordner nach.'
  );
}


/* =========================================================
   NEUES PASSWORT SETZEN (nach Klick auf den Link in der E-Mail)
========================================================= */

function openNewPasswordDialog() {
  if (lernraumRecoveryDialogShown) return;
  lernraumRecoveryDialogShown = true;

  document
    .getElementById('lernraum-sync-overlay')
    ?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lernraum-sync-overlay';
  overlay.style.cssText = `
    position:fixed;
    inset:0;
    z-index:99999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:rgba(0,0,0,.45);
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width:min(420px,100%);
    background:var(--surface,#fff);
    color:var(--ink,#222);
    border:1px solid var(--line,#ddd);
    border-radius:18px;
    padding:22px;
    box-shadow:0 20px 60px rgba(0,0,0,.25);
    font-family:inherit;
  `;

  panel.innerHTML = `
    <h2 style="margin:0 0 8px;">Neues Passwort</h2>
    <p style="margin:0 0 16px;opacity:.7;">
      Wähle ein neues Passwort für dein Lernraum-Konto.
    </p>
    <input
      id="sync-new-password"
      type="password"
      placeholder="Neues Passwort (mind. 6 Zeichen)"
      autocomplete="new-password"
      style="${syncInputStyle()}"
    >
    <input
      id="sync-new-password-2"
      type="password"
      placeholder="Neues Passwort wiederholen"
      autocomplete="new-password"
      style="${syncInputStyle()}"
    >
    <button id="sync-save-password-btn" style="${syncButtonStyle()}">
      Passwort speichern
    </button>
    <div id="sync-message" style="margin-top:12px;font-size:12px;opacity:.75;"></div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  document
    .getElementById('sync-save-password-btn')
    ?.addEventListener('click', saveNewPasswordLernraum);
}


async function saveNewPasswordLernraum() {
  const pw1 = document.getElementById('sync-new-password')?.value || '';
  const pw2 = document.getElementById('sync-new-password-2')?.value || '';

  if (pw1.length < 6) {
    setSyncMessage('Das Passwort muss mindestens 6 Zeichen lang sein.');
    return;
  }

  if (pw1 !== pw2) {
    setSyncMessage('Die beiden Passwörter stimmen nicht überein.');
    return;
  }

  setSyncMessage('Wird gespeichert …');

  const { error } =
    await supabaseClient.auth.updateUser({ password: pw1 });

  if (error) {
    setSyncMessage(error.message);
    return;
  }

  setSyncMessage('Passwort geändert. Du bist jetzt angemeldet.');

  setTimeout(() => {
    document
      .getElementById('lernraum-sync-overlay')
      ?.remove();
  }, 1500);
}


/* =========================================================
   ABMELDEN
========================================================= */

async function logoutLernraum() {
  await supabaseClient.auth.signOut();

  lernraumSyncUser = null;
  lernraumLastSyncAt = null;
  lernraumCloudReady = false;
  clearTimeout(lernraumSyncTimer);
  lernraumSyncTimer = null;

  // Lösche User aus localStorage
  localStorage.removeItem('lernraum_user');
  localStorage.removeItem('lernraum_user_email');

  updateSyncButton();

  document
    .getElementById('lernraum-sync-overlay')
    ?.remove();
}


/* =========================================================
   SNAPSHOT ERSTELLEN
========================================================= */

function createLernraumSnapshot() {
  return {
    version: 1,

    savedAt: Date.now(),

    notes:
      state.notes || [],

    todos:
      state.todos || [],

    events:
      state.events || [],

    cards:
      state.cards || [],

    cardFolders:
      state.cardFolders || [],

    noteFolders:
      state.noteFolders || [],

    /* Unterlagen: nur die Liste (Name, Größe, …). Die Dateien
       selbst liegen im Supabase-Speicher (docs-sync.js). */
    docs:
      state.docs || [],

    docFolders:
      state.docFolders || [],

    modules:
      typeof modules !== 'undefined'
        ? modules
        : [],

    stats:
      typeof stats !== 'undefined'
        ? stats
        : null,

    learningHistory:
      typeof learningHistory !== 'undefined'
        ? learningHistory
        : [],

    studyPlans:
      typeof studyPlans !== 'undefined'
        ? studyPlans
        : [],

    gameHighscore:
      typeof gameHighscore !== 'undefined'
        ? gameHighscore
        : 0
  };
}


/* =========================================================
   CLOUD UPLOAD
========================================================= */

async function uploadLernraumData() {
  if (
    !lernraumSyncUser ||
    lernraumSyncIsApplying
  ) {
    return false;
  }

  const snapshot =
    createLernraumSnapshot();

  const syncTime =
    new Date().toISOString();

  const { error } =
    await supabaseClient
      .from('lernraum_sync')
      .upsert({
        user_id:
          lernraumSyncUser.id,

        data:
          snapshot,

        updated_at:
          syncTime
      });

  if (error) {
    console.error(
      'Sync Upload Fehler:',
      error
    );

    setSyncMessage(
      'Sync fehlgeschlagen: ' +
      error.message
    );

    return false;
  }

  lernraumLastSyncAt =
    syncTime;

  updateSyncButton();

  return true;
}


/* =========================================================
   CLOUD DOWNLOAD
========================================================= */

async function downloadLernraumData() {
  if (!lernraumSyncUser) {
    return false;
  }

  const { data, error } =
    await supabaseClient
      .from('lernraum_sync')
      .select(
        'data, updated_at'
      )
      .eq(
        'user_id',
        lernraumSyncUser.id
      )
      .maybeSingle();

  if (error) {
    console.error(
      'Sync Download Fehler:',
      error
    );

    setSyncMessage(
      'Cloud-Daten konnten nicht geladen werden.'
    );

    return false;
  }

  if (!data?.data) {
    return false;
  }

  lernraumLastSyncAt =
    data.updated_at || null;

  updateLastSyncStatus();

  await applyLernraumSnapshot(
    data.data
  );

  setSyncMessage(
    'Cloud-Daten wurden geladen.'
  );

  return true;
}


/* =========================================================
   CLOUD DATEN ANWENDEN
========================================================= */

async function applyLernraumSnapshot(snapshot) {
  lernraumSyncIsApplying = true;

  try {
    state.notes =
      Array.isArray(snapshot.notes)
        ? snapshot.notes
        : [];

    state.todos =
      Array.isArray(snapshot.todos)
        ? snapshot.todos
        : [];

    state.events =
      Array.isArray(snapshot.events)
        ? snapshot.events
        : [];

    state.cards =
      Array.isArray(snapshot.cards)
        ? snapshot.cards
        : [];

    state.cardFolders =
      Array.isArray(snapshot.cardFolders)
        ? snapshot.cardFolders
        : [];

    state.noteFolders =
      Array.isArray(snapshot.noteFolders)
        ? snapshot.noteFolders
        : [];

    /* Unterlagen: Cloud-Liste übernehmen, aber lokale Dateien,
       die noch nicht hochgeladen wurden, behalten. Ältere
       Sicherungen ohne Unterlagen-Liste ändern nichts. */
    if (Array.isArray(snapshot.docs)) {
      const cloudIds = new Set(snapshot.docs.map(doc => doc.id));
      const pendingLocal = (state.docs || []).filter(
        doc => !doc.cloud && !cloudIds.has(doc.id)
      );
      state.docs = [...snapshot.docs, ...pendingLocal];
    }

    if (Array.isArray(snapshot.docFolders)) {
      state.docFolders = snapshot.docFolders;
    }

    if (
      typeof modules !== 'undefined'
    ) {
      modules =
        Array.isArray(snapshot.modules)
          ? snapshot.modules
          : [];
    }

    if (
      typeof stats !== 'undefined' &&
      snapshot.stats
    ) {
      stats =
        snapshot.stats;
    }

    if (
      typeof learningHistory !== 'undefined'
    ) {
      learningHistory =
        Array.isArray(
          snapshot.learningHistory
        )
          ? snapshot.learningHistory
          : [];
    }

    if (
      typeof studyPlans !== 'undefined'
    ) {
      studyPlans =
        Array.isArray(snapshot.studyPlans)
          ? snapshot.studyPlans
          : [];
    }

    if (
      typeof gameHighscore !== 'undefined'
    ) {
      gameHighscore =
        Number(snapshot.gameHighscore) ||
        0;
    }


    const saves = [
      save(
        'lernraum_notes',
        state.notes
      ),

      save(
        'lernraum_todos',
        state.todos
      ),

      save(
        'lernraum_events',
        state.events
      ),

      save(
        'lernraum_flashcards',
        state.cards
      ),

      save(
        'lernraum_card_folders',
        state.cardFolders
      ),

      save(
        'lernraum_note_folders',
        state.noteFolders
      ),

      save(
        'lernraum_docs_index',
        state.docs || []
      ),

      save(
        'lernraum_doc_folders',
        state.docFolders || []
      )
    ];


    if (
      typeof modules !== 'undefined'
    ) {
      saves.push(
        save(
          'lernraum_modules',
          modules
        )
      );
    }


    if (
      typeof stats !== 'undefined'
    ) {
      saves.push(
        save(
          'lernraum_stats',
          stats
        )
      );
    }


    if (
      typeof learningHistory !== 'undefined'
    ) {
      saves.push(
        save(
          'lernraum_learning_history',
          learningHistory
        )
      );
    }


    if (
      typeof studyPlans !== 'undefined'
    ) {
      saves.push(
        save(
          'lernraum_study_plans',
          studyPlans
        )
      );
    }


    if (
      typeof gameHighscore !== 'undefined'
    ) {
      saves.push(
        save(
          'lernraum_game_highscore',
          gameHighscore
        )
      );
    }


    await Promise.all(saves);


    if (
      typeof renderAllEnhanced ===
      'function'
    ) {
      renderAllEnhanced();
    }

  } finally {
    lernraumSyncIsApplying = false;
  }
}


/* =========================================================
   NACH LOGIN CLOUD PRÜFEN
========================================================= */

async function initializeCloudAfterLogin() {
  if (!lernraumSyncUser) return;

  lernraumCloudReady = false;

  const { data, error } =
    await supabaseClient
      .from('lernraum_sync')
      .select(
        'data, updated_at'
      )
      .eq(
        'user_id',
        lernraumSyncUser.id
      )
      .maybeSingle();

  if (error) {
    console.error(
      'Cloud Initialisierung Fehler:',
      error
    );

    return;
  }


  if (data?.data) {
    lernraumLastSyncAt =
      data.updated_at || null;

    updateLastSyncStatus();

    await applyLernraumSnapshot(
      data.data
    );
  } else {
    await uploadLernraumData();
  }

  lernraumCloudReady = true;

  /* Unterlagen, die noch nur lokal liegen, hochladen */
  if (typeof window.lernraumSyncDocs === 'function') {
    window.lernraumSyncDocs();
  }
}


/* =========================================================
   AUTOMATISCHER SYNC
   Jede Änderung (save) wird kurz danach in die Cloud geladen.
   Erst nachdem die Cloud-Daten beim Start geladen wurden –
   sonst könnte ein veralteter Stand die Cloud überschreiben.
========================================================= */


function scheduleCloudSync() {
  if (
    !lernraumSyncUser ||
    !lernraumCloudReady ||
    lernraumSyncIsApplying
  ) {
    return;
  }

  clearTimeout(lernraumSyncTimer);

  lernraumSyncTimer = setTimeout(() => {
    lernraumSyncTimer = null;
    uploadLernraumData();
  }, 2000);
}

/* save() aus app-v1.js erweitern. Muss nach dem Laden von
   app-v1.js passieren (das wird mit „defer“ geladen), daher
   Aufruf beim Start in initLernraumSync(). */
function installCloudSyncHook() {
  if (typeof window.save !== 'function' || window.save.lernraumCloudHook) {
    return;
  }

  const originalSave = window.save;

  const wrappedSave = async function (key, ...rest) {
    const result = await originalSave.call(this, key, ...rest);

    /* Statistik wird während der Lernuhr alle paar Sekunden
       gespeichert – dafür nicht jedes Mal hochladen. */
    if (key !== 'lernraum_stats') {
      scheduleCloudSync();
    }

    return result;
  };

  wrappedSave.lernraumCloudHook = true;
  window.save = wrappedSave;
}

/* Wenn die Seite wieder in den Vordergrund kommt: neuere
   Cloud-Daten (z. B. vom Handy) übernehmen. */
async function refreshFromCloudIfNewer() {
  if (!lernraumSyncUser || lernraumSyncIsApplying || lernraumSyncTimer) {
    return;
  }

  /* Start-Abgleich war fehlgeschlagen (z. B. offline) → erneut versuchen */
  if (!lernraumCloudReady) {
    await initializeCloudAfterLogin();
    return;
  }

  const { data, error } = await supabaseClient
    .from('lernraum_sync')
    .select('updated_at')
    .eq('user_id', lernraumSyncUser.id)
    .maybeSingle();

  if (error || !data?.updated_at) return;

  const cloudTime = new Date(data.updated_at).getTime();
  const localTime = lernraumLastSyncAt
    ? new Date(lernraumLastSyncAt).getTime()
    : 0;

  if (cloudTime > localTime && !lernraumSyncTimer) {
    await downloadLernraumData();
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshFromCloudIfNewer();
  }
});


/* =========================================================
   MANUELL SYNCHRONISIEREN
========================================================= */

async function syncNow() {
  if (!lernraumSyncUser) return;

  setSyncMessage(
    'Synchronisiere …'
  );

  const uploaded =
    await uploadLernraumData();

  if (uploaded) {
    setSyncMessage(
      'Synchronisiert.'
    );
  }
}


/* =========================================================
   START
========================================================= */

async function initLernraumSync() {
  installCloudSyncHook();
  createSyncUi();

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();

  lernraumSyncUser =
    session?.user || null;

  updateSyncButton();


  if (lernraumSyncUser) {
    await initializeCloudAfterLogin();
  }

  if (lernraumIsPasswordRecovery && lernraumSyncUser) {
    openNewPasswordDialog();
  }


  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
      lernraumSyncUser =
        session?.user || null;

      updateSyncButton();

      if (event === 'PASSWORD_RECOVERY') {
        openNewPasswordDialog();
      }

      if (
        lernraumSyncUser &&
        event === 'SIGNED_IN'
      ) {
        await initializeCloudAfterLogin();
      }
    }
  );
}


window.addEventListener(
  'DOMContentLoaded',
  initLernraumSync
);
