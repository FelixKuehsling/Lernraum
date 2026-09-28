/* ============================================================
   LERNRAUM – EINFÜHRUNG FÜR NEUE NUTZER
   ------------------------------------------------------------
   1. Willkommens-Tour beim allerersten Öffnen (nur wenn noch
      keine Daten vorhanden sind). Erneut aufrufbar über
      Einstellungen → „Einführung ansehen“ (openLernraumTour()).
   2. Hinweis-Banner am Dashboard, wenn jemand schon Daten hat,
      aber kein Konto: „Deine Daten sind nur in diesem Browser“.
============================================================ */
(function () {
  'use strict';

  const DONE_KEY = 'lernraum_onboarding_done';
  const BANNER_KEY = 'lernraum_backup_banner_hidden_until';
  const BANNER_SNOOZE_DAYS = 14;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Zustand ---------- */

  function isLoggedIn() {
    try { if (typeof lernraumSyncUser !== 'undefined' && lernraumSyncUser) return true; } catch (e) {}
    return !!ls.get('lernraum_user');
  }

  function dataCount() {
    try {
      const s = (typeof state !== 'undefined' && state) ? state : {};
      const mods = (typeof modules !== 'undefined' && Array.isArray(modules)) ? modules.length : 0;
      const plans = (typeof studyPlans !== 'undefined' && Array.isArray(studyPlans)) ? studyPlans.length : 0;
      return mods + plans +
        ['notes', 'todos', 'events', 'cards', 'docs']
          .reduce((n, k) => n + (Array.isArray(s[k]) ? s[k].length : 0), 0);
    } catch (e) {
      return 0;
    }
  }

  /* ---------- Styles ---------- */

  function addStyles() {
    if (document.getElementById('lr-onboarding-styles')) return;
    const style = document.createElement('style');
    style.id = 'lr-onboarding-styles';
    style.textContent = `
      #lr-tour{position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,16,10,.55);animation:lrTourFade .2s ease;}
      @keyframes lrTourFade{from{opacity:0}to{opacity:1}}
      #lr-tour .lr-tour-card{position:relative;width:min(480px,100%);max-height:92vh;overflow-y:auto;background:var(--surface,#FAF5EA);color:var(--ink,#382F24);border:1px solid var(--line,#DDD0B0);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);padding:28px 26px 22px;font-family:'Karla',system-ui,sans-serif;}
      #lr-tour .lr-tour-skip{position:absolute;top:14px;right:16px;border:none;background:none;color:var(--ink-soft,#7A7061);font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:6px;}
      #lr-tour .lr-tour-icon{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:32px;background:var(--bg-soft,#F1E9D8);margin-bottom:16px;}
      #lr-tour .lr-tour-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--sage-dark,#5C6F51);margin-bottom:6px;}
      #lr-tour h2{font-family:'Fraunces',Georgia,serif;font-size:26px;line-height:1.15;margin:0 0 10px;color:var(--ink,#382F24);}
      #lr-tour p{margin:0 0 12px;font-size:15px;line-height:1.55;color:var(--ink-soft,#7A7061);}
      #lr-tour ul{margin:4px 0 6px;padding:0;list-style:none;}
      #lr-tour li{display:flex;gap:10px;align-items:flex-start;padding:7px 0;font-size:14px;line-height:1.45;color:var(--ink,#382F24);border-top:1px dashed var(--line,#DDD0B0);}
      #lr-tour li:first-child{border-top:none;}
      #lr-tour li span:first-child{flex-shrink:0;width:22px;text-align:center;}
      #lr-tour .lr-tour-dots{display:flex;gap:6px;justify-content:center;margin:18px 0 14px;}
      #lr-tour .lr-tour-dots i{width:7px;height:7px;border-radius:50%;background:var(--line,#DDD0B0);transition:all .2s;}
      #lr-tour .lr-tour-dots i.on{width:20px;border-radius:4px;background:var(--sage,#7E9070);}
      #lr-tour .lr-tour-actions{display:flex;gap:10px;}
      #lr-tour .lr-tour-btn{flex:1;padding:12px 14px;border-radius:12px;border:1px solid var(--line,#DDD0B0);background:transparent;color:var(--ink,#382F24);font:inherit;font-weight:700;font-size:14px;cursor:pointer;}
      #lr-tour .lr-tour-btn.primary{background:var(--sage,#7E9070);border-color:var(--sage,#7E9070);color:#fff;}
      #lr-tour .lr-tour-btn:disabled{visibility:hidden;}
      #lr-tour .lr-tour-note{font-size:12.5px;padding:10px 12px;border-radius:12px;background:var(--bg-soft,#F1E9D8);color:var(--ink-soft,#7A7061);margin-top:6px;}
      #lr-backup-banner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px;padding:12px 14px;border:1px solid var(--line,#DDD0B0);border-left:4px solid var(--sage,#7E9070);border-radius:14px;background:var(--surface,#FAF5EA);color:var(--ink,#382F24);font-size:13.5px;}
      #lr-backup-banner .lr-bb-text{flex:1;min-width:200px;line-height:1.45;}
      #lr-backup-banner .lr-bb-text strong{display:block;margin-bottom:2px;}
      #lr-backup-banner .lr-bb-text span{color:var(--ink-soft,#7A7061);}
      #lr-backup-banner button{border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer;border:1px solid var(--line,#DDD0B0);background:transparent;color:var(--ink,#382F24);}
      #lr-backup-banner button.primary{background:var(--sage,#7E9070);border-color:var(--sage,#7E9070);color:#fff;}
      @media(max-width:520px){#lr-tour .lr-tour-card{padding:24px 18px 18px;border-radius:18px;}#lr-tour h2{font-size:22px;}#lr-tour p{font-size:14px;}}
    `;
    document.head.appendChild(style);
  }

  /* ---------- Tour ---------- */

  const STEPS = [
    {
      icon: '📚',
      eyebrow: 'Willkommen',
      title: 'Schön, dass du da bist!',
      body: '<p>Lernraum bündelt alles fürs Studium an einem Ort – kostenlos, direkt im Browser, am Laptop und am Handy.</p>' +
        '<p>In einer Minute zeigen wir dir, wie du am besten startest.</p>'
    },
    {
      icon: '🗂️',
      eyebrow: 'Schritt 1',
      title: 'Lege deine Module an',
      body: '<p>Ein Modul ist ein Fach oder eine Lehrveranstaltung, z. B. „Buchhaltung“ oder „Privatrecht“.</p>' +
        '<ul>' +
        '<li><span>🔗</span><span>Notizen, Aufgaben, Termine, Karteikarten und Unterlagen lassen sich einem Modul zuordnen.</span></li>' +
        '<li><span>📊</span><span>In der Modul-Übersicht siehst du dann alles zu einem Fach auf einen Blick.</span></li>' +
        '</ul>'
    },
    {
      icon: '🗓️',
      eyebrow: 'Schritt 2',
      title: 'Plane deine Woche',
      body: '<ul>' +
        '<li><span>📅</span><span><strong>Kalender:</strong> Vorlesungen als wiederkehrende Termine eintragen – einmal für das ganze Semester.</span></li>' +
        '<li><span>✅</span><span><strong>To-Do:</strong> Aufgaben mit Deadline und Priorität. Überfälliges wird markiert.</span></li>' +
        '<li><span>📝</span><span><strong>Lernplan:</strong> Lege fest, was du an welchem Tag lernst.</span></li>' +
        '</ul>'
    },
    {
      icon: '🧠',
      eyebrow: 'Schritt 3',
      title: 'Lerne mit System',
      body: '<ul>' +
        '<li><span>🃏</span><span><strong>Karteikarten:</strong> Üben mit Richtig/Falsch oder im Spielemodus gegen die Zeit.</span></li>' +
        '<li><span>⏱️</span><span><strong>Lernuhr:</strong> Minuten eintragen, Start drücken – deine Lernzeit landet automatisch in der Statistik.</span></li>' +
        '<li><span>📎</span><span><strong>Unterlagen:</strong> Skripten und PDFs hochladen und dem Modul zuordnen.</span></li>' +
        '</ul>'
    },
    {
      icon: '☁️',
      eyebrow: 'Wichtig',
      title: 'Sichere deine Daten',
      body: '<p>Ohne Konto speichert Lernraum alles <strong>nur in diesem Browser</strong>. Wenn du den Verlauf löschst oder das Gerät wechselst, sind die Daten weg.</p>' +
        '<p>Mit einem kostenlosen Konto werden sie sicher gespeichert und zwischen Laptop und Handy synchronisiert.</p>',
      final: true
    }
  ];

  let stepIndex = 0;

  function renderStep() {
    const overlay = document.getElementById('lr-tour');
    if (!overlay) return;
    const step = STEPS[stepIndex];
    const last = stepIndex === STEPS.length - 1;
    const loggedIn = isLoggedIn();

    let actions;
    if (last) {
      actions = loggedIn
        ? `<button type="button" class="lr-tour-btn" data-tour="back">Zurück</button>
           <button type="button" class="lr-tour-btn primary" data-tour="module">Erstes Modul anlegen</button>`
        : `<button type="button" class="lr-tour-btn" data-tour="finish">Ohne Konto starten</button>
           <button type="button" class="lr-tour-btn primary" data-tour="account">Konto erstellen</button>`;
    } else {
      actions = `<button type="button" class="lr-tour-btn" data-tour="back" ${stepIndex === 0 ? 'disabled' : ''}>Zurück</button>
                 <button type="button" class="lr-tour-btn primary" data-tour="next">${stepIndex === 0 ? 'Los geht’s' : 'Weiter'}</button>`;
    }

    overlay.querySelector('.lr-tour-card').innerHTML = `
      <button type="button" class="lr-tour-skip" data-tour="finish">Überspringen</button>
      <div class="lr-tour-icon" aria-hidden="true">${step.icon}</div>
      <div class="lr-tour-eyebrow">${step.eyebrow}</div>
      <h2 id="lr-tour-title">${step.title}</h2>
      ${step.body}
      ${last && loggedIn ? '<div class="lr-tour-note">✓ Du bist angemeldet – deine Daten werden bereits gesichert.</div>' : ''}
      <div class="lr-tour-dots" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i === stepIndex ? 'on' : ''}"></i>`).join('')}</div>
      <div class="lr-tour-actions">${actions}</div>
    `;
    overlay.querySelector('[data-tour="next"], [data-tour="account"], [data-tour="module"]')?.focus();
  }

  function closeTour() {
    ls.set(DONE_KEY, String(Date.now()));
    document.getElementById('lr-tour')?.remove();
    document.removeEventListener('keydown', onKey);
    renderBanner();
  }

  function onKey(e) {
    if (!document.getElementById('lr-tour')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeTour(); }
    else if (e.key === 'ArrowRight' && stepIndex < STEPS.length - 1) { e.preventDefault(); stepIndex++; renderStep(); }
    else if (e.key === 'ArrowLeft' && stepIndex > 0) { e.preventDefault(); stepIndex--; renderStep(); }
  }

  function onClick(e) {
    const btn = e.target.closest('[data-tour]');
    if (!btn) return;
    const action = btn.dataset.tour;
    if (action === 'next') { stepIndex = Math.min(stepIndex + 1, STEPS.length - 1); renderStep(); }
    else if (action === 'back') { stepIndex = Math.max(stepIndex - 1, 0); renderStep(); }
    else if (action === 'finish') { closeTour(); }
    else if (action === 'account') {
      closeTour();
      if (typeof openSyncDialog === 'function') openSyncDialog();
    }
    else if (action === 'module') {
      closeTour();
      if (typeof goToView === 'function') goToView('modules');
      setTimeout(() => { if (typeof workspaceNewModule === 'function') workspaceNewModule(); }, 150);
    }
  }

  window.openLernraumTour = function () {
    addStyles();
    document.getElementById('lr-tour')?.remove();
    stepIndex = 0;
    const overlay = document.createElement('div');
    overlay.id = 'lr-tour';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'lr-tour-title');
    overlay.innerHTML = '<div class="lr-tour-card"></div>';
    overlay.addEventListener('click', onClick);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
    renderStep();
  };

  /* ---------- Banner „Daten sichern“ ---------- */

  function renderBanner() {
    const dash = document.getElementById('view-dashboard');
    const existing = document.getElementById('lr-backup-banner');
    const hiddenUntil = Number(ls.get(BANNER_KEY) || 0);
    const show = dash && !isLoggedIn() && dataCount() > 0 && Date.now() > hiddenUntil && !document.getElementById('lr-tour');

    if (!show) { existing?.remove(); return; }
    if (existing) return;

    addStyles();
    const banner = document.createElement('div');
    banner.id = 'lr-backup-banner';
    banner.innerHTML = `
      <div class="lr-bb-text">
        <strong>☁️ Deine Daten sind nur in diesem Browser gespeichert.</strong>
        <span>Mit einem kostenlosen Konto gehen sie nicht verloren und sind auch am Handy da.</span>
      </div>
      <button type="button" data-bb="later">Später</button>
      <button type="button" class="primary" data-bb="account">Konto erstellen</button>`;
    banner.addEventListener('click', e => {
      const b = e.target.closest('[data-bb]');
      if (!b) return;
      if (b.dataset.bb === 'later') {
        ls.set(BANNER_KEY, String(Date.now() + BANNER_SNOOZE_DAYS * 86400000));
        banner.remove();
      } else if (typeof openSyncDialog === 'function') {
        openSyncDialog();
      }
    });

    const head = dash.querySelector('.view-head') || dash.firstElementChild;
    if (head && head.parentNode === dash) head.insertAdjacentElement('afterend', banner);
    else dash.prepend(banner);
  }

  /* ---------- Start ---------- */

  function start() {
    addStyles();
    const firstVisit = !ls.get(DONE_KEY) && dataCount() === 0 && !isLoggedIn();
    if (firstVisit) {
      window.openLernraumTour();
    } else {
      /* Bestehende Nutzer sollen die Tour nicht plötzlich sehen */
      if (!ls.get(DONE_KEY)) ls.set(DONE_KEY, 'existing-user');
      renderBanner();
    }
    /* Banner aktuell halten (Login/Logout, erste Daten angelegt) */
    setInterval(renderBanner, 4000);
  }

  function whenReady(fn) {
    /* Warten, bis app-v1.js seine Daten geladen hat */
    let tries = 0;
    const check = () => {
      tries++;
      const loaded = typeof state !== 'undefined' && state && Array.isArray(state.notes) && typeof modules !== 'undefined';
      if (loaded && tries > 3) fn();
      else if (tries < 40) setTimeout(check, 150);
      else fn();
    };
    check();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => whenReady(start));
  else whenReady(start);
})();
