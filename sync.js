const SUPABASE_URL = 'https://jureyjdijtcfcsfcmfjz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_94JcCbPPozmYQY3LkQsKhQ_YQk3kW9v';

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

// Fallback updateSyncStatus wenn settings-panel.js nicht geladen
function updateSyncStatus() {
  const user = localStorage.getItem('lernraum_user');
  const email = localStorage.getItem('lernraum_user_email');

  // Update Settings Panel if exists
  const statusText = document.getElementById('sync-status-text');
  if (statusText) {
    if (user && email) {
      statusText.textContent = `✅ Angemeldet als ${email}`;
    } else {
      statusText.textContent = '❌ Nicht verbunden';
    }
  }

  // Update Logout Section
  const logoutSection = document.getElementById('sync-logout-section');
  if (logoutSection) {
    logoutSection.style.display = (user && email) ? 'block' : 'none';
  }
}


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
}


/* =========================================================
   LETZTE SYNCHRONISIERUNG
========================================================= */

function createLastSyncStatus() {
  if (document.getElementById('lernraum-sync-status')) return;

  const button = document.getElementById('lernraum-sync-button');

  if (!button) return;

  const status = document.createElement('div');

  status.id = 'lernraum-sync-status';

  status.style.cssText = `
    margin-top:5px;
    margin-bottom:2px;
    text-align:center;
    font-family:inherit;
    font-size:10px;
    line-height:1.3;
    color:var(--ink);
    opacity:.55;
  `;

  button.insertAdjacentElement(
    'afterend',
    status
  );

  updateLastSyncStatus();
}


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
          'https://felixkuehsling.github.io/Lernraum/lernapp/'
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
   ABMELDEN
========================================================= */

async function logoutLernraum() {
  await supabaseClient.auth.signOut();

  lernraumSyncUser = null;
  lernraumLastSyncAt = null;

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
}


/* =========================================================
   AUTOMATISCHER SYNC
========================================================= */

function scheduleCloudSync() {
  if (
    !lernraumSyncUser ||
    lernraumSyncIsApplying
  ) {
    return;
  }

  clearTimeout(
    lernraumSyncTimer
  );

  lernraumSyncTimer =
    setTimeout(
      () => {
        uploadLernraumData();
      },
      1200
    );
}


/* =========================================================
   SAVE ERWEITERN
========================================================= */

const originalLernraumSave =
  window.save;

if (
  typeof originalLernraumSave ===
  'function'
) {
  window.save =
    async function (...args) {
      const result =
        await originalLernraumSave(
          ...args
        );

      scheduleCloudSync();

      return result;
    };
}


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


  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
      lernraumSyncUser =
        session?.user || null;

      updateSyncButton();

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

/* ============================================================
   LERNRAUM – APPLE KALENDER SYNC
   Lernraum → Apple Kalender
============================================================ */

const APPLE_CAL_BUCKET = 'calendar-feeds';
const APPLE_CAL_TOKEN_KEY = 'lernraum_apple_calendar_token';


/* ---------- ZUFÄLLIGEN KALENDER-TOKEN ERZEUGEN ---------- */

function getAppleCalendarToken(){

  let token = localStorage.getItem(
    APPLE_CAL_TOKEN_KEY
  );

  if(!token){

    if(window.crypto?.randomUUID){
      token = crypto.randomUUID();
    } else {
      token =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
    }

    localStorage.setItem(
      APPLE_CAL_TOKEN_KEY,
      token
    );
  }

  return token;
}


/* ---------- TEXT FÜR .ICS SICHER MACHEN ---------- */

function appleIcsEscape(value){

  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}


/* ---------- DATUM YYYY-MM-DD → YYYYMMDD ---------- */

function appleDateCompact(value){

  return String(value || '')
    .replace(/-/g, '');
}


/* ---------- ZEIT IN KALENDERFORMAT ---------- */

function appleDateTimeCompact(date, time){

  const hhmm =
    String(time || '00:00')
      .replace(':', '');

  return (
    appleDateCompact(date) +
    'T' +
    hhmm +
    '00'
  );
}


/* ---------- GANZEN LERNRAUM-KALENDER ALS ICS BAUEN ---------- */

function buildAppleCalendarIcs(){

  const lines = [

    'BEGIN:VCALENDAR',

    'VERSION:2.0',

    'PRODID:-//Lernraum//Apple Calendar//DE',

    'CALSCALE:GREGORIAN',

    'METHOD:PUBLISH',

    'X-WR-CALNAME:Lernraum',

    'X-WR-TIMEZONE:Europe/Berlin',

    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',

    'X-PUBLISHED-TTL:PT1H'

  ];


  const events =
    Array.isArray(state?.events)
      ? [...state.events]
      : [];


  events.forEach(event => {

    if(!event?.date) return;


    lines.push('BEGIN:VEVENT');


    /* feste UID = Apple erkennt spätere Änderungen */

    lines.push(
      'UID:' +
      appleIcsEscape(event.id || uid()) +
      '@lernraum'
    );


    lines.push(
      'DTSTAMP:' +
      new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z')
    );


    /* ---------- TERMIN MIT UHRZEIT ---------- */

    if(event.time){

      lines.push(
        'DTSTART;TZID=Europe/Berlin:' +
        appleDateTimeCompact(
          event.date,
          event.time
        )
      );


      if(event.endTime){

        lines.push(
          'DTEND;TZID=Europe/Berlin:' +
          appleDateTimeCompact(
            event.date,
            event.endTime
          )
        );

      } else {

        /* Standard: 1 Stunde */

        const start =
          new Date(
            `${event.date}T${event.time}:00`
          );

        start.setHours(
          start.getHours() + 1
        );


        const endDate =
          localISODate(start);


        const endTime =
          String(
            start.getHours()
          ).padStart(2, '0') +
          ':' +
          String(
            start.getMinutes()
          ).padStart(2, '0');


        lines.push(
          'DTEND;TZID=Europe/Berlin:' +
          appleDateTimeCompact(
            endDate,
            endTime
          )
        );

      }

    }


    /* ---------- GANZTÄGIGER TERMIN ---------- */

    else {

      lines.push(
        'DTSTART;VALUE=DATE:' +
        appleDateCompact(event.date)
      );


      const end =
        new Date(
          event.date + 'T12:00:00'
        );

      end.setDate(
        end.getDate() + 1
      );


      lines.push(
        'DTEND;VALUE=DATE:' +
        appleDateCompact(
          localISODate(end)
        )
      );

    }


    /* ---------- TITEL ---------- */

    lines.push(
      'SUMMARY:' +
      appleIcsEscape(
        event.title || 'Lernraum'
      )
    );


    /* ---------- ORT ---------- */

    if(event.location){

      lines.push(
        'LOCATION:' +
        appleIcsEscape(
          event.location
        )
      );

    }


    /* ---------- BESCHREIBUNG ---------- */

    if(event.description){

      lines.push(
        'DESCRIPTION:' +
        appleIcsEscape(
          event.description
        )
      );

    }


    /* ---------- KATEGORIE ---------- */

    if(event.type){

      lines.push(
        'CATEGORIES:' +
        appleIcsEscape(
          typeof EVENT_TYPE_LABELS !== 'undefined'
            ? (
                EVENT_TYPE_LABELS[event.type] ||
                event.type
              )
            : event.type
        )
      );

    }


    lines.push('END:VEVENT');

  });


  lines.push('END:VCALENDAR');


  return lines.join('\r\n');
}


/* ---------- KALENDER ZU SUPABASE HOCHLADEN ---------- */

async function publishAppleCalendar(){

  try{

    const {
      data: userData,
      error: userError
    } =
      await supabaseClient.auth.getUser();


    if(userError){
      throw userError;
    }


    const user =
      userData?.user;


    if(!user){

      throw new Error(
        'Bitte zuerst bei Lernraum anmelden.'
      );

    }


    const token =
      getAppleCalendarToken();


    /*
      Pfad:
      USER-ID / zufälliger-token.ics

      Unsere Storage-Policies erlauben
      jedem Nutzer nur seinen eigenen Ordner.
    */

    const path =
      `${user.id}/${token}.ics`;


    const ics =
      buildAppleCalendarIcs();


    const blob =
      new Blob(
        [ics],
        {
          type:
            'text/calendar;charset=utf-8'
        }
      );


    const {
      error: uploadError
    } =
      await supabaseClient
        .storage
        .from(APPLE_CAL_BUCKET)
        .upload(
          path,
          blob,
          {
            upsert: true,
            contentType:
              'text/calendar;charset=utf-8',
            cacheControl: '60'
          }
        );


    if(uploadError){
      throw uploadError;
    }


    const {
      data: publicData
    } =
      supabaseClient
        .storage
        .from(APPLE_CAL_BUCKET)
        .getPublicUrl(path);


    const publicUrl =
      publicData?.publicUrl;


    if(!publicUrl){

      throw new Error(
        'Kalender-Link konnte nicht erstellt werden.'
      );

    }


    localStorage.setItem(
      'lernraum_apple_calendar_feed',
      publicUrl
    );


    return publicUrl;

  }

  catch(error){

    console.error(
      'Apple Kalender Sync Fehler:',
      error
    );

    throw error;

  }

}


/* ============================================================
   BUTTON:
    Mit Apple Kalender synchronisieren
============================================================ */

async function syncAppleCalendar(){

  const button =
    document.querySelector(
      '[onclick="syncAppleCalendar()"]'
    );


  const oldText =
    button?.textContent;


  try{

    if(button){

      button.disabled = true;

      button.textContent =
        'Wird vorbereitet …';

    }


    const publicUrl =
      await publishAppleCalendar();


    /*
      https:// wird zu webcal://
      → Apple Kalender erkennt es als Abo.
    */

    const webcalUrl =
      publicUrl.replace(
        /^https:\/\//i,
        'webcal://'
      );


    if(button){

      button.textContent =
        ' Apple Kalender öffnen';

    }


    window.location.href =
      webcalUrl;

  }

  catch(error){

    alert(
      error?.message ||
      'Apple Kalender konnte nicht verbunden werden.'
    );


    if(button){

      button.textContent =
        oldText ||
        ' Mit Apple Kalender synchronisieren';

    }

  }

  finally{

    if(button){

      button.disabled = false;

    }

  }

}


/* ============================================================
   KALENDER AUTOMATISCH AKTUALISIEREN
============================================================ */

let appleCalendarUpdateTimer = null;


function scheduleAppleCalendarUpdate(){

  /*
    Nur automatisch hochladen,
    wenn Apple Kalender bereits einmal
    eingerichtet wurde.
  */

  if(
    !localStorage.getItem(
      'lernraum_apple_calendar_feed'
    )
  ){
    return;
  }


  clearTimeout(
    appleCalendarUpdateTimer
  );


  appleCalendarUpdateTimer =
    setTimeout(
      async () => {

        try{

          await publishAppleCalendar();

          console.log(
            'Apple Kalender aktualisiert.'
          );

        }

        catch(error){

          console.warn(
            'Apple Kalender konnte nicht automatisch aktualisiert werden.',
            error
          );

        }

      },
      1200
    );

}


/* ---------- TERMIN HINZUFÜGEN ---------- */

if(
  typeof window.addEvent === 'function'
){

  const originalAddEvent =
    window.addEvent;


  window.addEvent =
    async function(...args){

      const result =
        await originalAddEvent.apply(
          this,
          args
        );

      scheduleAppleCalendarUpdate();

      return result;

    };

}


/* ---------- TERMIN LÖSCHEN ---------- */

if(
  typeof window.deleteEvent === 'function'
){

  const originalDeleteEvent =
    window.deleteEvent;


  window.deleteEvent =
    async function(...args){

      const result =
        await originalDeleteEvent.apply(
          this,
          args
        );

      scheduleAppleCalendarUpdate();

      return result;

    };

}


/* ---------- SERIE LÖSCHEN ---------- */

if(
  typeof window.deleteEventSeries === 'function'
){

  const originalDeleteEventSeries =
    window.deleteEventSeries;


  window.deleteEventSeries =
    async function(...args){

      const result =
        await originalDeleteEventSeries.apply(
          this,
          args
        );

      scheduleAppleCalendarUpdate();

      return result;

    };

}


/* ---------- TERMIN BEARBEITEN ---------- */

if(
  typeof window.saveEventEdit === 'function'
){

  const originalSaveEventEdit =
    window.saveEventEdit;


  window.saveEventEdit =
    async function(...args){

      const result =
        await originalSaveEventEdit.apply(
          this,
          args
        );

      scheduleAppleCalendarUpdate();

      return result;

    };

}

/* ============================================================
   APPLE SYNC – FIX FÜR NEUEN KALENDER
============================================================ */

if (typeof window.lrCalendarAddEvent === 'function') {

  const originalLrCalendarAddEvent =
    window.lrCalendarAddEvent;

  window.lrCalendarAddEvent =
    async function (...args) {

      const result =
        await originalLrCalendarAddEvent.apply(
          this,
          args
        );

      setTimeout(() => {
        scheduleAppleCalendarUpdate();
      }, 500);

      return result;
    };
}
