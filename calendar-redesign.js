/* ============================================================
   LERNRAUM – KALENDER FINAL
   ------------------------------------------------------------
   ✓ Monat
   ✓ Woche 00:00 – 23:00
   ✓ Tag-Ansicht entfernt
   ✓ heutiger Tag grüner Kreis
   ✓ heutige Termine sichtbar
   ✓ Kategorien mit eigenen Farben
   ✓ Uhrzeit frei eingeben
   ✓ Termine löschen
   ✓ Creme-Design
   ✓ Kalender unten abgerundet
============================================================ */
(function () {
  const view = document.getElementById('view-calendar');
  if (!view) return;
  /* Eigener Kalenderzustand – unabhängig vom alten Kalendercode */
  let lrYear = new Date().getFullYear();
  let lrMonth = new Date().getMonth();
  let lrSelectedDate = lrTodayISO();
  let lrViewMode = 'month';
  let lrWeekStart = mondayOf(new Date());
  /* ==========================================================
     HILFSFUNKTIONEN
  ========================================================== */
  function pad2(value) {
    return String(value).padStart(2, '0');
  }
  function lrISO(date) {
    return (
      date.getFullYear() +
      '-' +
      pad2(date.getMonth() + 1) +
      '-' +
      pad2(date.getDate())
    );
  }
  function lrTodayISO() {
    return lrISO(new Date());
  }
  function parseLocalDate(iso) {
    if (!iso) {
      return new Date();
    }
    const parts = String(iso)
      .split('-')
      .map(Number);
    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      12,
      0,
      0
    );
  }
  function mondayOf(date) {
    const result = new Date(date);
    result.setHours(12, 0, 0, 0);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(
      result.getDate() + diff
    );
    return result;
  }
  function safeText(value) {
    if (typeof escapeHtml === 'function') {
      return escapeHtml(value || '');
    }
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  }
  function getEvents() {
    if (
      typeof state === 'undefined' ||
      !Array.isArray(state.events)
    ) {
      return [];
    }
    return state.events;
  }
  /* ==========================================================
     KATEGORIEN
  ========================================================== */
  const TYPE_LABELS = {
    termin: 'Persönlich',
    vorlesung: 'Vorlesung',
    uebung: 'Übung',
    seminar: 'Seminar',
    klausur: 'Klausur',
    abgabe: 'Abgabe',
    praktikum: 'Praktikum',
    lerngruppe: 'Lerngruppe',
    kurs: 'Kurs',
    test: 'Prüfung'
  };
  function typeLabel(type) {
    return TYPE_LABELS[type] || 'Persönlich';
  }
  function typeClass(type) {
    return 'lr-type-' + (type || 'termin');
  }
  /* ==========================================================
     UHRZEIT FREI EINGEBEN
  ========================================================== */
  function normalizeTime(value) {
    let text = String(value || '')
      .trim()
      .replace('.', ':');
    if (!text) {
      return '';
    }
    /* 9 → 09:00 */
    if (/^\d{1,2}$/.test(text)) {
      const hour = Number(text);
      if (hour >= 0 && hour <= 23) {
        return pad2(hour) + ':00';
      }
    }
    /* 930 → 09:30 */
    if (/^\d{3,4}$/.test(text)) {
      text = text.padStart(4, '0');
      const hour = Number(
        text.slice(0, 2)
      );
      const minute = Number(
        text.slice(2, 4)
      );
      if (
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59
      ) {
        return (
          pad2(hour) +
          ':' +
          pad2(minute)
        );
      }
    }
    /* 9:30 → 09:30 */
    const match = text.match(
      /^(\d{1,2}):(\d{1,2})$/
    );
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59
      ) {
        return (
          pad2(hour) +
          ':' +
          pad2(minute)
        );
      }
    }
    return text;
  }
  /* ==========================================================
     HTML
  ========================================================== */
  view.innerHTML = `
    <div class="lr-cal-page-head">
      <div>
        <div class="eyebrow">
          TERMINE &amp; FRISTEN
        </div>
        <h1 class="view-title">
          Kalender
        </h1>
      </div>
    </div>
    <div class="lr-cal-layout">
      <!-- LINKER KALENDER -->
      <section class="lr-cal-main">
        <div class="lr-cal-toolbar">
          <div class="lr-cal-nav">
            <button
              class="lr-cal-arrow"
              type="button"
              onclick="calShift(-1)"
            >
              ‹
            </button>
            <div
              class="lr-cal-label"
              id="cal-label"
            ></div>
            <button
              class="lr-cal-arrow"
              type="button"
              onclick="calShift(1)"
            >
              ›
            </button>
            <button
              class="lr-cal-today"
              type="button"
              onclick="calGoToday()"
            >
              Heute
            </button>
          </div>
          <div class="lr-cal-view-switch">
            <button
              class="cal-view-btn active"
              data-view="month"
              type="button"
              onclick="setCalViewMode('month')"
            >
              Monat
            </button>
            <button
              class="cal-view-btn"
              data-view="week"
              type="button"
              onclick="setCalViewMode('week')"
            >
              Woche
            </button>
          </div>
        </div>
        <!-- MONAT -->
        <div id="cal-month-wrap">
          <div
            class="lr-cal-dow-row"
            id="cal-dow-row"
          ></div>
          <div
            class="lr-cal-month-grid"
            id="cal-grid"
          ></div>
        </div>
        <!-- WOCHE -->
        <div
          id="cal-week-wrap"
          style="display:none;"
        ></div>
      </section>
      <!-- RECHTE SEITE -->
      <aside class="lr-cal-side">
        <div class="lr-cal-side-head">
          <h3>
            Eintrag
          </h3>
          <div class="lr-cal-plus">
            +
          </div>
        </div>
        <div class="lr-cal-form">
          <label class="lr-cal-field">
            <span>
              Titel
            </span>
            <input
              type="text"
              id="event-title"
              placeholder="z. B. Vorlesung, Abgabe …"
              autocomplete="off"
            >
          </label>
          <label class="lr-cal-field">
            <span>
              Datum
            </span>
            <input
              type="date"
              id="event-date"
            >
          </label>
          <label class="lr-cal-field">
            <span>
              Uhrzeit
            </span>
            <input
              type="text"
              id="event-time-simple"
              placeholder="z. B. 14:30"
              inputmode="numeric"
              autocomplete="off"
            >
          </label>
          <label class="lr-cal-field">
            <span>
              Kategorie
            </span>
            <select id="event-type">
              <option value="termin">
                Persönlich
              </option>
              <option value="vorlesung">
                Vorlesung
              </option>
              <option value="uebung">
                Übung
              </option>
              <option value="seminar">
                Seminar
              </option>
              <option value="klausur">
                Klausur
              </option>
              <option value="abgabe">
                Abgabe
              </option>
              <option value="praktikum">
                Praktikum
              </option>
              <option value="lerngruppe">
                Lerngruppe
              </option>
            </select>
          </label>
          <select
            id="event-recur"
            hidden
          >
            <option
              value="none"
              selected
            >
              Keine Wiederholung
            </option>
          </select>
          <button
            class="lr-cal-save"
            type="button"
            onclick="lrCalendarAddEvent()"
          >
            Speichern
          </button>
        </div>
        <div class="lr-cal-divider"></div>
        <div class="lr-cal-today-head">
          <h3>
            Heute
          </h3>
          <span id="lr-cal-today-date"></span>
        </div>
        <div
          class="lr-cal-today-list"
          id="lr-cal-today-list"
        ></div>
        <!-- Kompatibilität mit script.js -->
        <div id="day-panel-title" hidden></div>
        <div id="day-events" hidden></div>
        <div id="upcoming-events" hidden></div>
      </aside>
    </div>
  `;
  /* ==========================================================
     CSS
  ========================================================== */
  const oldStyle = document.getElementById(
    'lernraum-calendar-redesign-style'
  );
  if (oldStyle) {
    oldStyle.remove();
  }
  const style = document.createElement('style');
  style.id =
    'lernraum-calendar-redesign-style';
  style.textContent = `
    /* ========================================================
       BASIS
    ======================================================== */
    #view-calendar{
      --lr-cal-ink:#382f24;
      --lr-cal-muted:#7a7061;
      --lr-cal-line:#ddd0b0;
      --lr-cal-surface:#faf5ea;
      --lr-cal-cell:#fcf7ee;
      --lr-cal-soft:#f3ebdd;
      --lr-cal-sage:#718b69;
      --lr-cal-sage-soft:#e8efe2;
      padding-bottom:40px;
    }
    /* ========================================================
       KOPF
    ======================================================== */
    #view-calendar .lr-cal-page-head{
      margin-bottom:24px;
      display: flex;
      flex-direction: column;
    }
    #view-calendar .lr-cal-page-head > div {
      display: flex;
      flex-direction: column;
    }
    #view-calendar
    .lr-cal-page-head
    .view-title{
      margin:0;
      color:
        var(--lr-cal-ink);
      font-size:32px;
      line-height:1;
      font-family:'Fraunces',serif;
      font-weight:600;
    }
    #view-calendar .lr-cal-page-head .eyebrow{
      display:block !important;
      order:0 !important;
      margin-bottom:8px;
      color:var(--clay-dark);
      font-size:11px;
      letter-spacing:1.5px;
      text-transform:uppercase;
      font-family:'IBM Plex Mono',monospace;
      font-weight:500;
    }
    #view-calendar .lr-cal-page-head .view-title{
      display:block !important;
      order:1 !important;
    }
    #view-calendar .lr-cal-subtitle{
      margin-top:8px;
      color:
        var(--lr-cal-muted);
      font-size:14px;
    }
    /* ========================================================
       LAYOUT
    ======================================================== */
    #view-calendar .lr-cal-layout{
      width:100%;
      display:grid;
      grid-template-columns:
        minmax(0,1fr)
        300px;
      gap:18px;
      align-items:start;
    }
    #view-calendar .lr-cal-main,
    #view-calendar .lr-cal-side{
      background:
        var(--lr-cal-surface);
      border:
        1px solid
        var(--lr-cal-line);
      border-radius:20px;
      box-shadow:
        0 8px 25px
        rgba(56,47,36,.055);
    }
    #view-calendar .lr-cal-main{
      min-width:0;
      overflow:hidden;
      border-radius:20px;
    }
    /* ========================================================
       TOOLBAR
    ======================================================== */
    #view-calendar .lr-cal-toolbar{
      min-height:78px;
      padding:
        15px
        18px;
      display:flex;
      justify-content:
        space-between;
      align-items:center;
      gap:16px;
      border-bottom:
        1px solid
        var(--lr-cal-line);
      background:
        var(--lr-cal-surface);
    }
    #view-calendar .lr-cal-nav{
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
    }
    #view-calendar .lr-cal-arrow,
    #view-calendar .lr-cal-today{
      height:40px;
      border:
        1px solid
        var(--lr-cal-line);
      background:#fcf7ee;
      color:
        var(--lr-cal-ink);
      border-radius:10px;
      cursor:pointer;
    }
    #view-calendar .lr-cal-arrow{
      width:40px;
      font-size:24px;
    }
    #view-calendar .lr-cal-today{
      padding:
        0
        15px;
      font-weight:700;
      font-size:12px;
    }
    #view-calendar .lr-cal-label{
      min-width:150px;
      text-align:center;
      font-family:
        'Fraunces',
        serif;
      font-size:21px;
      font-weight:600;
      text-transform:capitalize;
    }
    /* ========================================================
       MONAT / WOCHE
    ======================================================== */
    #view-calendar .lr-cal-view-switch{
      display:flex;
      border:
        1px solid
        var(--lr-cal-line);
      background:
        var(--lr-cal-soft);
      border-radius:11px;
      overflow:hidden;
    }
    #view-calendar .cal-view-btn{
      min-width:82px;
      height:40px;
      padding:
        0
        16px;
      border:0;
      border-right:
        1px solid
        var(--lr-cal-line);
      background:transparent;
      color:
        var(--lr-cal-muted);
      cursor:pointer;
      font-weight:700;
      font-size:12px;
    }
    #view-calendar
    .cal-view-btn:last-child{
      border-right:0;
    }
    #view-calendar
    .cal-view-btn.active{
      background:
        var(--lr-cal-sage-soft);
      color:#4d6748;
    }
    /* ========================================================
       MONAT – WOCHENTAGE
    ======================================================== */
    #view-calendar .lr-cal-dow-row{
      display:grid;
      grid-template-columns:
        repeat(
          7,
          minmax(0,1fr)
        );
      border-bottom:
        1px solid
        var(--lr-cal-line);
    }
    #view-calendar .cal-dow{
      padding:
        12px
        8px;
      text-align:center;
      font-size:11px;
      font-weight:700;
      color:
        var(--lr-cal-muted);
    }
    /* ========================================================
       MONAT
    ======================================================== */
    #view-calendar #cal-month-wrap{
      overflow:hidden;
      border-radius:
        0
        0
        20px
        20px;
    }
    #view-calendar .lr-cal-month-grid{
      display:grid;
      grid-template-columns:
        repeat(
          7,
          minmax(0,1fr)
        );
      grid-template-rows:
        repeat(
          6,
          minmax(110px,1fr)
        );
      min-height:660px;
      overflow:hidden;
      border-radius:
        0
        0
        20px
        20px;
    }
    #view-calendar .lr-cal-day{
      position:relative;
      min-width:0;
      min-height:110px;
      padding:
        10px
        9px;
      background:
        var(--lr-cal-cell);
      border-right:
        1px solid
        var(--lr-cal-line);
      border-bottom:
        1px solid
        var(--lr-cal-line);
      cursor:pointer;
      overflow:hidden;
    }
    #view-calendar
    .lr-cal-day:nth-child(7n){
      border-right:0;
    }
    #view-calendar
    .lr-cal-day:nth-last-child(-n+7){
      border-bottom:0;
    }
    #view-calendar
    .lr-cal-day:nth-last-child(7){
      border-bottom-left-radius:20px;
    }
    #view-calendar
    .lr-cal-day:last-child{
      border-bottom-right-radius:20px;
    }
    #view-calendar
    .lr-cal-day.other-month{
      background:#f6efe3;
    }
    #view-calendar
    .lr-cal-day:hover{
      background:#f3ecdf;
    }
    #view-calendar
    .lr-cal-day.selected{
      box-shadow:
        inset
        0
        0
        0
        2px
        rgba(113,139,105,.22);
    }
    /* ========================================================
       DATUM
    ======================================================== */
    #view-calendar .lr-cal-date{
      width:30px;
      height:30px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border-radius:50%;
      color:#4c514c;
      font-size:12px;
      font-weight:600;
      position:relative;
      z-index:2;
    }
    #view-calendar
    .other-month
    .lr-cal-date{
      color:#aaa397;
    }
    /*
       HEUTE
       grüner Kreis bleibt IMMER sichtbar
    */
    #view-calendar
    .lr-cal-day.today
    .lr-cal-date{
      background:
        var(--lr-cal-sage)
        !important;
      color:#fff
        !important;
      font-weight:800;
      box-shadow:
        0
        0
        0
        3px
        rgba(113,139,105,.17);
    }
    /* ========================================================
       TERMINE IM MONAT
    ======================================================== */
    #view-calendar .lr-cal-events{
      display:flex;
      flex-direction:column;
      gap:4px;
      margin-top:5px;
    }
    #view-calendar .lr-cal-event{
      width:100%;
      position:relative;
      padding:
        6px
        27px
        6px
        7px;
      border:0;
      border-radius:8px;
      text-align:left;
      overflow:hidden;
      cursor:pointer;
      font-family:
        'Karla',
        sans-serif;
    }
    #view-calendar
    .lr-cal-event-type{
      display:flex;
      align-items:center;
      gap:5px;
      font-size:9px;
      font-weight:800;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:
        ellipsis;
    }
    #view-calendar
    .lr-cal-event-type::before{
      content:'';
      width:6px;
      height:6px;
      border-radius:50%;
      background:
        currentColor;
      flex-shrink:0;
    }
    #view-calendar
    .lr-cal-event-title{
      display:block;
      margin-top:3px;
      font-size:10px;
      font-weight:700;
      line-height:1.2;
      overflow:hidden;
      text-overflow:
        ellipsis;
      white-space:nowrap;
    }
    #view-calendar
    .lr-cal-event-time{
      display:block;
      margin-top:2px;
      font-size:9px;
      opacity:.78;
    }
    #view-calendar .lr-cal-more{
      padding-left:5px;
      font-size:9px;
      color:
        var(--lr-cal-muted);
    }
    /* ========================================================
       LÖSCHEN – MONAT
    ======================================================== */
    #view-calendar .lr-cal-delete{
      position:absolute;
      top:5px;
      right:5px;
      width:18px;
      height:18px;
      padding:0;
      display:grid;
      place-items:center;
      border:0;
      border-radius:50%;
      background:
        rgba(255,255,255,.68);
      color:inherit;
      cursor:pointer;
      font-size:14px;
      font-weight:900;
      line-height:1;
      opacity:.55;
    }
    #view-calendar
    .lr-cal-event:hover
    .lr-cal-delete{
      opacity:1;
    }
    #view-calendar
    .lr-cal-delete:hover{
      background:#fff;
      opacity:1;
    }
    /* ========================================================
       KATEGORIEFARBEN
    ======================================================== */
    #view-calendar .lr-type-vorlesung{
      background:#e6f3d5;
      color:#3f7c37;
    }
    #view-calendar .lr-type-uebung{
      background:#eee2f5;
      color:#8553ad;
    }
    #view-calendar .lr-type-seminar{
      background:#e4e7f8;
      color:#5368bf;
    }
    #view-calendar .lr-type-klausur{
      background:#fff0c2;
      color:#aa7800;
    }
    #view-calendar .lr-type-abgabe{
      background:#fde3ce;
      color:#d46b20;
    }
    #view-calendar .lr-type-praktikum{
      background:#d9f0ec;
      color:#15897e;
    }
    #view-calendar .lr-type-lerngruppe{
      background:#f7dce8;
      color:#c94478;
    }
    #view-calendar .lr-type-termin{
      background:#ddeaf7;
      color:#3679b4;
    }
    #view-calendar .lr-type-kurs{
      background:#e4ede0;
      color:#56784e;
    }
    #view-calendar .lr-type-test{
      background:#f5dcda;
      color:#b55046;
    }
    /* ========================================================
       RECHTE SEITE
    ======================================================== */
    #view-calendar .lr-cal-side{
      padding:20px;
      min-height:700px;
    }
    #view-calendar
    .lr-cal-side-head,
    #view-calendar
    .lr-cal-today-head{
      display:flex;
      align-items:center;
      justify-content:
        space-between;
      gap:10px;
    }
    #view-calendar
    .lr-cal-side h3{
      margin:0;
      font-family:
        'Fraunces',
        serif;
      font-size:19px;
    }
    #view-calendar .lr-cal-plus{
      width:32px;
      height:32px;
      border-radius:50%;
      background:
        var(--lr-cal-sage-soft);
      color:
        var(--lr-cal-sage);
      display:grid;
      place-items:center;
      font-size:18px;
      font-weight:800;
    }
    /* ========================================================
       FORMULAR
    ======================================================== */
    #view-calendar .lr-cal-form{
      display:flex;
      flex-direction:column;
      gap:11px;
      margin-top:18px;
    }
    #view-calendar
    .lr-cal-field span{
      display:block;
      margin-bottom:6px;
      color:
        var(--lr-cal-muted);
      font-size:11px;
      font-weight:700;
    }
    #view-calendar
    .lr-cal-field input,
    #view-calendar
    .lr-cal-field select{
      width:100%;
      height:40px;
      box-sizing:border-box;
      padding:
        0
        11px;
      border:
        1px solid
        var(--lr-cal-line);
      border-radius:9px;
      background:#fcf7ee;
      color:
        var(--lr-cal-ink);
      outline:none;
      font-family:
        'Karla',
        sans-serif;
      font-size:12px;
    }
    #view-calendar
    .lr-cal-field input:focus,
    #view-calendar
    .lr-cal-field select:focus{
      border-color:
        var(--lr-cal-sage);
      box-shadow:
        0
        0
        0
        3px
        rgba(113,139,105,.09);
    }
    #view-calendar .lr-cal-save{
      width:100%;
      height:42px;
      border:0;
      border-radius:9px;
      background:
        linear-gradient(
          135deg,
          #718b69,
          #607c5b
        );
      color:#fff;
      cursor:pointer;
      font-weight:800;
    }
    #view-calendar .lr-cal-divider{
      height:1px;
      background:
        var(--lr-cal-line);
      margin:
        22px
        0
        18px;
    }
    /* ========================================================
       HEUTE RECHTS
    ======================================================== */
    #view-calendar
    .lr-cal-today-head span{
      color:
        var(--lr-cal-muted);
      font-size:10px;
    }
    #view-calendar
    .lr-cal-today-list{
      margin-top:13px;
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    #view-calendar .lr-today-item{
      display:grid;
      grid-template-columns:
        34px
        minmax(0,1fr)
        auto
        24px;
      gap:8px;
      align-items:center;
      padding:9px;
      background:#fcf7ee;
      border:
        1px solid
        var(--lr-cal-line);
      border-radius:10px;
    }
    #view-calendar .lr-today-icon{
      width:34px;
      height:34px;
      border-radius:9px;
      display:grid;
      place-items:center;
      font-size:18px;
      font-weight:900;
    }
    #view-calendar .lr-today-title{
      font-size:11px;
      font-weight:800;
      overflow:hidden;
      text-overflow:
        ellipsis;
      white-space:nowrap;
    }
    #view-calendar .lr-today-time{
      margin-top:3px;
      font-size:9px;
      color:
        var(--lr-cal-muted);
    }
    #view-calendar .lr-today-kind{
      font-size:9px;
      color:
        var(--lr-cal-muted);
      white-space:nowrap;
    }
    #view-calendar .lr-today-delete{
      width:22px;
      height:22px;
      padding:0;
      display:grid;
      place-items:center;
      border:0;
      border-radius:50%;
      background:
        var(--lr-cal-soft);
      color:#8c7868;
      cursor:pointer;
      font-size:15px;
      font-weight:800;
    }
    #view-calendar
    .lr-today-delete:hover{
      background:#f4ded5;
      color:#a65f49;
    }
    #view-calendar
    .lr-cal-empty-today{
      padding:16px;
      border:
        1px dashed
        var(--lr-cal-line);
      border-radius:10px;
      text-align:center;
      color:
        var(--lr-cal-muted);
      font-size:11px;
    }
    /* ========================================================
       WOCHE – ALLE 24 STUNDEN
    ======================================================== */
    #view-calendar #cal-week-wrap{
      padding:14px;
      overflow:visible
        !important;
      background:
        var(--lr-cal-surface);
      border-radius:
        0
        0
        20px
        20px;
    }
    #view-calendar .lr-time-scroll{
      width:100%;
      height:auto
        !important;
      overflow:visible
        !important;
    }
    #view-calendar .lr-time-grid{
      width:100%;
      height:auto
        !important;
      display:grid;
      grid-template-columns:
        50px
        repeat(
          7,
          minmax(0,1fr)
        );
      /*
         Kopf + 24 Stunden
         48px pro Stunde
      */
      grid-template-rows:
        44px
        repeat(
          24,
          48px
        )
        !important;
      border:
        1px solid
        var(--lr-cal-line);
      border-radius:14px;
      overflow:hidden;
      background:#fcf7ee;
    }
    #view-calendar
    .lr-time-corner,
    #view-calendar
    .lr-time-day-head{
      display:flex;
      align-items:center;
      justify-content:center;
      background:#f7f0e4;
      border-bottom:
        1px solid
        var(--lr-cal-line);
      font-size:11px;
      font-weight:800;
    }
    #view-calendar .lr-time-day-head{
      border-left:
        1px solid
        var(--lr-cal-line);
      flex-direction:column;
      gap:2px;
    }
    #view-calendar
    .lr-time-day-head.today{
      background:
        var(--lr-cal-sage-soft);
      color:#4f6d49;
    }
    #view-calendar
    .lr-time-day-head strong{
      font-size:15px;
      font-family:
        'Fraunces',
        serif;
    }
    #view-calendar .lr-time-label{
      min-height:0
        !important;
      padding:
        8px
        6px
        0
        0;
      text-align:right;
      color:
        var(--lr-cal-muted);
      font-family:
        'IBM Plex Mono',
        monospace;
      font-size:9px;
      border-top:
        1px solid
        var(--lr-cal-line);
      background:#f7f0e4;
    }
    #view-calendar .lr-time-slot{
      position:relative;
      min-width:0;
      min-height:0
        !important;
      padding:3px;
      border-top:
        1px solid
        var(--lr-cal-line);
      border-left:
        1px solid
        var(--lr-cal-line);
      background:#fcf7ee;
      cursor:pointer;
      overflow:hidden;
    }
    #view-calendar
    .lr-time-slot:hover{
      background:#f3ecdf;
    }
    #view-calendar
    .lr-time-slot.today{
      background:#faf8e9;
    }
    #view-calendar .lr-time-event{
      width:100%;
      height:100%;
      min-height:35px;
      position:relative;
      padding:
        5px
        27px
        5px
        7px;
      border-radius:7px;
      overflow:hidden;
      font-size:10px;
      font-weight:800;
      line-height:1.2;
    }
    #view-calendar
    .lr-time-event small{
      display:block;
      margin-top:2px;
      font-size:8px;
      font-weight:600;
      opacity:.76;
    }
    #view-calendar .lr-time-delete{
      position:absolute;
      top:4px;
      right:4px;
      width:19px;
      height:19px;
      padding:0;
      border:0;
      border-radius:50%;
      display:grid;
      place-items:center;
      background:
        rgba(255,255,255,.68);
      color:inherit;
      cursor:pointer;
      font-size:14px;
      font-weight:900;
      opacity:.65;
    }
    #view-calendar
    .lr-time-event:hover
    .lr-time-delete{
      opacity:1;
    }
    #view-calendar
    .lr-time-delete:hover{
      background:#fff;
      opacity:1;
    }
    /* ========================================================
       TABLET
    ======================================================== */
    @media(max-width:1100px){
      #view-calendar .lr-cal-layout{
        grid-template-columns:1fr;
      }
      #view-calendar .lr-cal-side{
        min-height:0;
      }
    }
    /* ========================================================
       HANDY
    ======================================================== */
    @media(max-width:760px){
      #view-calendar .lr-cal-toolbar{
        flex-direction:column;
        align-items:stretch;
      }
      #view-calendar .lr-cal-nav{
        width:100%;
      }
      #view-calendar .lr-cal-label{
        flex:1;
        min-width:0;
        font-size:18px;
      }
      #view-calendar .lr-cal-today{
        display:none;
      }
      #view-calendar .lr-cal-view-switch{
        width:100%;
      }
      #view-calendar .cal-view-btn{
        flex:1;
      }
      #view-calendar #cal-week-wrap{
        overflow-x:auto
          !important;
      }
      #view-calendar .lr-time-grid{
        min-width:820px;
      }
    }
    /* ========================================================
       FINALER SCREENSHOT-FIX
       Kalender sichtbar + rechtes Menü kompakter
    ======================================================== */
    #view-calendar .lr-cal-layout{
      grid-template-columns:minmax(0,1fr) 260px !important;
      gap:18px !important;
      align-items:start !important;
    }
    #view-calendar .lr-cal-main{
      min-height:690px !important;
    }
    /* Im Referenzbild gibt es keinen Heute-Button oben */
    #view-calendar .lr-cal-today{
      display:none !important;
    }
    /* Wiederholung komplett ausblenden */
    #view-calendar #event-recur{
      display:none !important;
    }
    /* Rechtes Eintrag-Menü kleiner */
    #view-calendar .lr-cal-side{
      width:260px !important;
      min-height:0 !important;
      padding:18px !important;
      border-radius:18px !important;
    }
    #view-calendar .lr-cal-side h3{
      font-size:18px !important;
    }
    #view-calendar .lr-cal-plus{
      width:30px !important;
      height:30px !important;
      font-size:17px !important;
    }
    #view-calendar .lr-cal-form{
      gap:9px !important;
      margin-top:15px !important;
    }
    #view-calendar .lr-cal-field span{
      margin-bottom:5px !important;
      font-size:10.5px !important;
    }
    #view-calendar .lr-cal-field input,
    #view-calendar .lr-cal-field select{
      height:36px !important;
      padding:0 10px !important;
      font-size:11.5px !important;
    }
    #view-calendar .lr-cal-save{
      height:38px !important;
      font-size:11.5px !important;
    }
    #view-calendar .lr-cal-divider{
      margin:18px 0 15px !important;
    }
    /* Monatskalender wie im Screenshot:
       einzelne beige Kästchen mit Abstand */
    #view-calendar #cal-month-wrap{
      padding:0 14px 16px !important;
      overflow:visible !important;
    }
    #view-calendar .lr-cal-dow-row{
      gap:6px !important;
      border-bottom:0 !important;
      padding:0 0 7px !important;
    }
    #view-calendar .cal-dow{
      padding:7px 4px !important;
      font-size:9.5px !important;
    }
    #view-calendar .lr-cal-month-grid{
      display:grid !important;
      grid-template-columns:repeat(7,minmax(0,1fr)) !important;
      grid-template-rows:repeat(6,minmax(88px,1fr)) !important;
      gap:6px !important;
      min-height:560px !important;
      overflow:visible !important;
      border-radius:0 !important;
    }
    #view-calendar .lr-cal-day{
      display:block !important;
      visibility:visible !important;
      min-height:88px !important;
      padding:9px 8px !important;
      background:#f3ead8 !important;
      border:1px solid transparent !important;
      border-radius:10px !important;
      overflow:hidden !important;
    }
    #view-calendar .lr-cal-day.other-month{
      visibility:hidden !important;
      pointer-events:none !important;
    }
    #view-calendar .lr-cal-day:hover{
      background:#eee2cc !important;
      border-color:#d7c6a2 !important;
    }
    #view-calendar .lr-cal-date{
      width:auto !important;
      height:auto !important;
      min-width:20px !important;
      min-height:20px !important;
      font-size:11px !important;
    }
    #view-calendar .lr-cal-event{
      padding:4px 5px !important;
      border-radius:6px !important;
    }
    #view-calendar .lr-cal-event-type{
      display:none !important;
    }
    #view-calendar .lr-cal-event-title{
      margin-top:0 !important;
      font-size:8.5px !important;
    }
    #view-calendar .lr-cal-event-time{
      display:inline !important;
      margin:0 4px 0 0 !important;
      font-size:8px !important;
      font-weight:800 !important;
    }
    /* Löschen-Kreuz erst bei Hover, damit es ruhig aussieht */
    #view-calendar .lr-cal-delete{
      opacity:0 !important;
    }
    #view-calendar .lr-cal-event:hover .lr-cal-delete{
      opacity:.8 !important;
    }
    @media(max-width:1100px){
      #view-calendar .lr-cal-layout{
        grid-template-columns:1fr !important;
      }
      #view-calendar .lr-cal-side{
        width:100% !important;
      }
    }
    /* ========================================================
       DARK MODE
    ======================================================== */
    html.dark #view-calendar{
      --lr-cal-ink:#eee8dc;
      --lr-cal-muted:#b4ac9e;
      --lr-cal-line:#484c43;
      --lr-cal-surface:#30332d;
      --lr-cal-cell:#30332d;
      --lr-cal-soft:#292c27;
      --lr-cal-sage-soft:#364337;
    }
    html.dark
    #view-calendar .lr-cal-day.other-month{
      background:#292c27;
    }
    html.dark
    #view-calendar .lr-cal-arrow,
    html.dark
    #view-calendar .lr-cal-today,
    html.dark
    #view-calendar .lr-cal-field input,
    html.dark
    #view-calendar .lr-cal-field select,
    html.dark
    #view-calendar .lr-today-item,
    html.dark
    #view-calendar .lr-time-slot{
      background:#30332d;
    }
  `;
  document.head.appendChild(style);
  /* ==========================================================
     LÖSCHEN
  ========================================================== */
  window.lrDeleteCalendarEvent =
    async function (eventId) {
      const found =
        getEvents().find(
          item =>
            String(item.id) ===
            String(eventId)
        );
      if (!found) {
        return;
      }
      const confirmed =
        window.confirm(
          `"${found.title || 'Eintrag'}" wirklich löschen?`
        );
      if (!confirmed) {
        return;
      }
      try {
        if (
          typeof window.deleteEvent ===
          'function'
        ) {
          await window.deleteEvent(
            found.id
          );
        }
        else {
          state.events =
            state.events.filter(
              item =>
                String(item.id) !==
                String(found.id)
            );
          if (
            typeof window.saveState ===
            'function'
          ) {
            await window.saveState();
          }
        }
        renderCalendar();
        renderLRToday();
        if (
          typeof window.scheduleAppleCalendarUpdate ===
          'function'
        ) {
          window.scheduleAppleCalendarUpdate();
        }
      }
      catch (error) {
        console.error(
          'Eintrag konnte nicht gelöscht werden:',
          error
        );
      }
    };
  /* ==========================================================
     HEUTE RECHTS
  ========================================================== */
  function renderLRToday() {
    const label =
      document.getElementById(
        'lr-cal-today-date'
      );
    const list =
      document.getElementById(
        'lr-cal-today-list'
      );
    if (!label || !list) {
      return;
    }
    const today =
      lrTodayISO();
    label.textContent =
      parseLocalDate(today)
        .toLocaleDateString(
          'de-DE',
          {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }
        );
    const events =
      getEvents()
        .filter(
          event =>
            String(event.date) ===
            today
        )
        .sort(
          (a, b) =>
            (a.time || '')
              .localeCompare(
                b.time || ''
              )
        );
    if (!events.length) {
      list.innerHTML = `
        <div class="lr-cal-empty-today">
          Heute stehen keine Termine an.
        </div>
      `;
      return;
    }
    list.innerHTML =
      events
        .map(
          event => `
            <div class="lr-today-item">
              <div
                class="
                  lr-today-icon
                  ${typeClass(event.type)}
                "
              >
                •
              </div>
              <div>
                <div class="lr-today-title">
                  ${safeText(event.title || 'Termin')}
                </div>
                <div class="lr-today-time">
                  ${
                    event.time
                      ? safeText(event.time)
                      : 'Ganztägig'
                  }
                </div>
              </div>
              <div class="lr-today-kind">
                ${typeLabel(event.type)}
              </div>
              <button
                class="lr-today-delete"
                type="button"
                title="Eintrag löschen"
                data-event-id="${safeText(String(event.id || ''))}"
              >
                ×
              </button>
            </div>
          `
        )
        .join('');
    list
      .querySelectorAll(
        '.lr-today-delete'
      )
      .forEach(
        button => {
          button.addEventListener(
            'click',
            event => {
              event.stopPropagation();
              lrDeleteCalendarEvent(
                button.dataset.eventId
              );
            }
          );
        }
      );
  }
  /* ==========================================================
     MONATSANSICHT
  ========================================================== */
  window.renderMonthGrid =
    function () {
      const grid = document.getElementById('cal-grid');
      const dow = document.getElementById('cal-dow-row');
      if (!grid) return;
      if (dow) {
        dow.innerHTML = ['Mo','Di','Mi','Do','Fr','Sa','So']
          .map(day => `<div class="cal-dow">${day}</div>`)
          .join('');
      }
      const first = new Date(lrYear, lrMonth, 1, 12, 0, 0);
      const offset = (first.getDay() + 6) % 7;
      const startDate = new Date(lrYear, lrMonth, 1 - offset, 12, 0, 0);
      const today = lrTodayISO();
      let html = '';
      for (let index = 0; index < 42; index++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        const iso = lrISO(date);
        const otherMonth = date.getMonth() !== lrMonth;
        const isToday = iso === today;
        const isSelected = iso === lrSelectedDate;
        const events = getEvents()
          .filter(event => String(event.date) === iso)
          .sort((a,b) => (a.time || '').localeCompare(b.time || ''));
        const shown = events.slice(0, 3);
        const more = events.length - shown.length;
        html += `
          <div
            class="lr-cal-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
            data-date="${iso}"
          >
            <span class="lr-cal-date">${date.getDate()}</span>
            <div class="lr-cal-events">
              ${shown.map(event => `
                <div
                  class="lr-cal-event ${typeClass(event.type)}"
                  data-event-id="${safeText(String(event.id || ''))}"
                >
                  <button
                    class="lr-cal-delete"
                    type="button"
                    title="Eintrag löschen"
                    data-delete-event="${safeText(String(event.id || ''))}"
                  >×</button>
                  ${event.time ? `<span class="lr-cal-event-time">${safeText(event.time)}</span>` : ''}
                  <span class="lr-cal-event-title">${safeText(event.title || 'Termin')}</span>
                </div>
              `).join('')}
              ${more > 0 ? `<div class="lr-cal-more">+${more} weitere</div>` : ''}
            </div>
          </div>
        `;
      }
      grid.innerHTML = html;
      grid.querySelectorAll('.lr-cal-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
          lrCalendarSelectDay(day.dataset.date);
        });
      });
      grid.querySelectorAll('[data-delete-event]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          lrDeleteCalendarEvent(button.dataset.deleteEvent);
        });
      });
    };
  /* ==========================================================
     WOCHENANSICHT
     00:00 – 23:00
  ========================================================== */
  window.renderWeekView =
    function () {
      const wrap =
        document.getElementById(
          'cal-week-wrap'
        );
      if (!wrap) {
        return;
      }
      lrWeekStart =
        lrWeekStart ||
        mondayOf(
          parseLocalDate(
            lrSelectedDate
          ) || new Date()
        );
      const days = [];
      for (
        let index = 0;
        index < 7;
        index++
      ) {
        const day =
          new Date(
            lrWeekStart
          );
        day.setDate(
          day.getDate() +
          index
        );
        days.push(day);
      }
      const today =
        lrTodayISO();
      let html = `
        <div class="lr-time-scroll">
          <div class="lr-time-grid">
            <div class="lr-time-corner"></div>
      `;
      /* Tagesköpfe */
      days.forEach(
        day => {
          const iso =
            lrISO(day);
          html += `
            <div
              class="
                lr-time-day-head
                ${iso === today ? 'today' : ''}
              "
            >
              <span>
                ${
                  day.toLocaleDateString(
                    'de-DE',
                    {
                      weekday:
                        'short'
                    }
                  )
                }
              </span>
              <strong>
                ${day.getDate()}
              </strong>
            </div>
          `;
        }
      );
      /*
         ALLE 24 STUNDEN
      */
      for (
        let hour = 0;
        hour < 24;
        hour++
      ) {
        html += `
          <div class="lr-time-label">
            ${pad2(hour)}:00
          </div>
        `;
        days.forEach(
          day => {
            const iso =
              lrISO(day);
            const events =
              getEvents()
                .filter(
                  event => {
                    if (
                      String(event.date) !==
                      iso
                    ) {
                      return false;
                    }
                    if (!event.time) {
                      return false;
                    }
                    return (
                      parseInt(
                        String(event.time)
                          .slice(0, 2),
                        10
                      ) === hour
                    );
                  }
                );
            html += `
              <div
                class="
                  lr-time-slot
                  ${iso === today ? 'today' : ''}
                "
                data-slot-date="${iso}"
                data-slot-hour="${hour}"
              >
                ${
                  events
                    .map(
                      event => `
                        <div
                          class="
                            lr-time-event
                            ${typeClass(event.type)}
                          "
                        >
                          <button
                            class="lr-time-delete"
                            type="button"
                            title="Eintrag löschen"
                            data-delete-event="${safeText(String(event.id || ''))}"
                          >
                            ×
                          </button>
                          ${safeText(event.title || 'Termin')}
                          <small>
                            ${safeText(event.time)}
                          </small>
                        </div>
                      `
                    )
                    .join('')
                }
              </div>
            `;
          }
        );
      }
      html += `
          </div>
        </div>
      `;
      wrap.innerHTML =
        html;
      /* Stunde anklicken */
      wrap
        .querySelectorAll(
          '.lr-time-slot'
        )
        .forEach(
          slot => {
            slot.addEventListener(
              'click',
              () => {
                selectSlot(
                  slot.dataset.slotDate,
                  Number(
                    slot.dataset.slotHour
                  )
                );
              }
            );
          }
        );
      /* Termin löschen */
      wrap
        .querySelectorAll(
          '[data-delete-event]'
        )
        .forEach(
          button => {
            button.addEventListener(
              'click',
              event => {
                event.stopPropagation();
                lrDeleteCalendarEvent(
                  button.dataset.deleteEvent
                );
              }
            );
          }
        );
    };
  /* ==========================================================
     VIEW MODE
     NUR MONAT + WOCHE
  ========================================================== */
  window.setCalViewMode =
    function (mode) {
      lrViewMode = mode === 'week' ? 'week' : 'month';
      document
        .querySelectorAll('#view-calendar .cal-view-btn')
        .forEach(button => {
          button.classList.toggle('active', button.dataset.view === lrViewMode);
        });
      const monthWrap = document.getElementById('cal-month-wrap');
      const weekWrap = document.getElementById('cal-week-wrap');
      if (monthWrap) monthWrap.style.display = lrViewMode === 'month' ? 'block' : 'none';
      if (weekWrap) weekWrap.style.display = lrViewMode === 'week' ? 'block' : 'none';
      if (lrViewMode === 'week') {
        lrWeekStart = mondayOf(parseLocalDate(lrSelectedDate));
      }
      renderCalendar();
    };
  /* ==========================================================
     HAUPT-RENDER
  ========================================================== */
  window.renderCalendar =
    function () {
      const label = document.getElementById('cal-label');
      if (lrViewMode === 'week') {
        const start = lrWeekStart || mondayOf(parseLocalDate(lrSelectedDate));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        if (label) {
          label.textContent =
            start.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' }) +
            ' – ' +
            end.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' });
        }
        renderWeekView();
      } else {
        if (label) {
          label.textContent = new Date(lrYear, lrMonth, 1)
            .toLocaleDateString('de-DE', { month:'long', year:'numeric' });
        }
        renderMonthGrid();
      }
      renderLRToday();
    };
  /* ==========================================================
     NAVIGATION
  ========================================================== */
  window.calShift =
    function (direction) {
      if (lrViewMode === 'week') {
        lrWeekStart = new Date(lrWeekStart || mondayOf(parseLocalDate(lrSelectedDate)));
        lrWeekStart.setDate(lrWeekStart.getDate() + direction * 7);
        lrSelectedDate = lrISO(lrWeekStart);
        renderWeekView();
      } else {
        lrMonth += direction;
        if (lrMonth < 0) {
          lrMonth = 11;
          lrYear--;
        }
        if (lrMonth > 11) {
          lrMonth = 0;
          lrYear++;
        }
        renderCalendar();
      }
    };
  window.calGoToday =
    function () {
      const today = new Date();
      lrSelectedDate = lrTodayISO();
      lrYear = today.getFullYear();
      lrMonth = today.getMonth();
      lrWeekStart = mondayOf(today);
      const dateInput = document.getElementById('event-date');
      if (dateInput) dateInput.value = lrSelectedDate;
      renderCalendar();
    };
  /* ==========================================================
     TAG AUSWÄHLEN
     Bleibt in Monat – keine Tag-Ansicht mehr
  ========================================================== */
  window.lrCalendarSelectDay =
    function (iso) {
      if (!iso) return;
      lrSelectedDate = iso;
      const date = parseLocalDate(iso);
      lrYear = date.getFullYear();
      lrMonth = date.getMonth();
      const input = document.getElementById('event-date');
      if (input) input.value = iso;
      renderCalendar();
    };
  /* ==========================================================
     STUNDE IN WOCHE ANKLICKEN
  ========================================================== */
  window.selectSlot =
    function (
      iso,
      hour
    ) {
      selectedDate =
        iso;
      const dateInput =
        document.getElementById(
          'event-date'
        );
      if (dateInput) {
        dateInput.value =
          iso;
      }
      const timeInput =
        document.getElementById(
          'event-time-simple'
        );
      if (timeInput) {
        timeInput.value =
          pad2(hour) +
          ':00';
      }
      document
        .getElementById(
          'event-title'
        )
        ?.focus();
    };
  /* ==========================================================
     UHRZEIT FÜR DIE BESTEHENDE addEvent()-FUNKTION
  ========================================================== */
  window.getEventTime =
    function () {
      const input =
        document.getElementById(
          'event-time-simple'
        );
      if (!input) {
        return '';
      }
      const value =
        normalizeTime(
          input.value
        );
      input.value =
        value;
      return value;
    };
  window.setEventTime =
    function (
      value = ''
    ) {
      const input =
        document.getElementById(
          'event-time-simple'
        );
      if (input) {
        input.value =
          value || '';
      }
    };
  /* ==========================================================
     TERMIN SPEICHERN
  ========================================================== */
  window.lrCalendarAddEvent =
    async function () {
      const title =
        document.getElementById(
          'event-title'
        );
      const dateInput =
        document.getElementById(
          'event-date'
        );
      const timeInput =
        document.getElementById(
          'event-time-simple'
        );
      if (
        !title ||
        !title.value.trim()
      ) {
        title?.focus();
        return;
      }
      if (
        !dateInput ||
        !dateInput.value
      ) {
        if (dateInput) {
          dateInput.value =
            selectedDate ||
            lrTodayISO();
        }
      }
      selectedDate =
        dateInput?.value ||
        selectedDate ||
        lrTodayISO();
      const selected =
        parseLocalDate(
          selectedDate
        );
      calYear =
        selected.getFullYear();
      calMonth =
        selected.getMonth();
      if (timeInput) {
        timeInput.value =
          normalizeTime(
            timeInput.value
          );
      }
      const recur =
        document.getElementById(
          'event-recur'
        );
      if (recur) {
        recur.value =
          'none';
      }
      /*
        Bestehende Speicherfunktion aus script.js benutzen.
      */
      if (
        typeof window.addEvent ===
        'function'
      ) {
        await window.addEvent();
      }
      else if (
        typeof addEvent ===
        'function'
      ) {
        await addEvent();
      }
      /*
        Sofort neu zeichnen.
      */
      renderCalendar();
      renderLRToday();
      /*
        Eingabefelder danach leeren,
        Datum bleibt ausgewählt.
      */
      if (title) {
        title.value =
          '';
      }
      if (timeInput) {
        timeInput.value =
          '';
      }
    };
  /* ==========================================================
     DATUMSFELD
  ========================================================== */
  document
    .getElementById(
      'event-date'
    )
    ?.addEventListener(
      'change',
      function () {
        if (!this.value) {
          return;
        }
        selectedDate =
          this.value;
        const date =
          parseLocalDate(
            this.value
          );
        calYear =
          date.getFullYear();
        calMonth =
          date.getMonth();
        /*
          Im Wochenmodus ausgewählte Woche anpassen.
        */
        if (
          calViewMode ===
          'week'
        ) {
          weekStartDate =
            mondayOf(date);
        }
        renderCalendar();
      }
    );
  /* ==========================================================
     UHRZEIT FORMATIEREN
  ========================================================== */
  document
    .getElementById(
      'event-time-simple'
    )
    ?.addEventListener(
      'blur',
      function () {
        if (
          !this.value.trim()
        ) {
          return;
        }
        this.value =
          normalizeTime(
            this.value
          );
      }
    );
  /* ==========================================================
     ENTER IM TITEL = SPEICHERN
  ========================================================== */
  document
    .getElementById(
      'event-title'
    )
    ?.addEventListener(
      'keydown',
      function (event) {
        if (
          event.key ===
          'Enter'
        ) {
          event.preventDefault();
          lrCalendarAddEvent();
        }
      }
    );
  /* ==========================================================
     START
  ========================================================== */
  function startCalendar() {
    const now = new Date();
    /* Wenn das alte Script bereits ein ausgewähltes Datum hat,
       übernehmen wir es nur, wenn es gültig ist. */
    try {
      if (
        typeof selectedDate !== 'undefined' &&
        selectedDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
      ) {
        lrSelectedDate = selectedDate;
      }
    } catch (_) {}
    const selected = parseLocalDate(lrSelectedDate);
    lrYear = selected.getFullYear();
    lrMonth = selected.getMonth();
    lrWeekStart = mondayOf(selected);
    lrViewMode = 'month';
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
      dateInput.value = lrSelectedDate;
    }
    /* Wiederholung wirklich unsichtbar halten */
    const recur = document.getElementById('event-recur');
    if (recur) {
      recur.hidden = true;
      recur.style.display = 'none';
      recur.value = 'none';
    }
    setCalViewMode('month');
    /* Sicherheit: falls ein anderes Script unmittelbar danach
       den Inhalt überschreibt, noch einmal neu rendern. */
    setTimeout(() => {
      setCalViewMode('month');
    }, 80);
  }
  /* KEYBOARD SHORTCUTS */
  document.addEventListener('keydown', (e) => {
    /* Arrow Left = Woche/Monat zurück */
    if (e.key === 'ArrowLeft' && !e.ctrlKey) {
      calShift(-1);
      return;
    }
    /* Arrow Right = Woche/Monat vorwärts */
    if (e.key === 'ArrowRight' && !e.ctrlKey) {
      calShift(1);
      return;
    }
    /* Ctrl+T = Heute */
    if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      calGoToday();
      return;
    }
    /* Ctrl+N = Neues Event (fokus Titel) */
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      const titleInput = document.getElementById('event-title');
      if (titleInput) titleInput.focus();
      return;
    }
  });
  setTimeout(
    startCalendar,
    0
  );
})();