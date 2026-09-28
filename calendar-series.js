/* ============================================================
   LERNRAUM – WIEDERKEHRENDE TERMINE & TERMINE BEARBEITEN
   ------------------------------------------------------------
   Lädt nach calendar-redesign-v3.js und ersetzt dort:
   - lrCalendarAddEvent   (Speichern-Button im Kalender)
   - lrDeleteCalendarEvent (Löschen – fragt bei Serien nach)
   und ergänzt:
   - lrEditCalendarEvent  (Bearbeiten-Dialog)

   Datenformat eines Termins (kompatibel mit bisherigen Daten):
   { id, date:'YYYY-MM-DD', time:'HH:MM'|'', title, type:'termin',
     moduleId, recurId?, recur?:'weekly'|'biweekly'|'monthly',
     recurUntil?:'YYYY-MM-DD' }
============================================================ */
(function () {
  'use strict';

  const DEFAULT_COUNTS = { weekly: 14, biweekly: 7, monthly: 12 };
  const MAX_OCCURRENCES = 200;
  const RECUR_LABELS = {
    none: 'Keine Wiederholung',
    weekly: 'Jede Woche',
    biweekly: 'Alle 2 Wochen',
    monthly: 'Jeden Monat'
  };

  /* ---------- Hilfsfunktionen ---------- */

  const pad2 = n => String(n).padStart(2, '0');
  const isoOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayIso = () => isoOf(new Date());

  function parseIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function normalizeTime(value) {
    let text = String(value || '').trim().replace('.', ':');
    if (!text) return '';
    if (/^\d{1,2}$/.test(text)) {
      const h = Number(text);
      return h >= 0 && h <= 23 ? pad2(h) + ':00' : '';
    }
    if (/^\d{3,4}$/.test(text)) {
      text = text.padStart(4, '0');
      text = text.slice(0, 2) + ':' + text.slice(2);
    }
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(text);
    if (!m) return '';
    const h = Number(m[1]), min = Number(m[2]);
    if (h > 23 || min > 59) return '';
    return pad2(h) + ':' + pad2(min);
  }

  function uidSafe() {
    if (typeof uid === 'function') return uid();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function events() {
    if (typeof state === 'undefined') return [];
    if (!Array.isArray(state.events)) state.events = [];
    return state.events;
  }

  async function persist() {
    if (typeof save === 'function') await save('lernraum_events', state.events);
    try { if (typeof window.renderCalendar === 'function') window.renderCalendar(); } catch (e) {}
    try { if (typeof window.renderDashboard === 'function') window.renderDashboard(); } catch (e) {}
    try { if (typeof window.renderModules === 'function') window.renderModules(); } catch (e) {}
  }

  function seriesOf(ev) {
    if (!ev || !ev.recurId) return [];
    return events().filter(e => e.recurId === ev.recurId);
  }

  function toast(msg, type) {
    if (typeof notify === 'function') notify(msg, type);
  }

  /* Termine einer Serie erzeugen */
  function buildDates(startIso, recur, untilIso) {
    const start = parseIso(startIso);
    if (!start) return [];
    if (!recur || recur === 'none') return [startIso];

    const until = parseIso(untilIso);
    const count = until ? MAX_OCCURRENCES : DEFAULT_COUNTS[recur] || 1;
    const dates = [];
    const preferredDay = start.getDate();

    for (let i = 0; i < count; i++) {
      let d;
      if (recur === 'monthly') {
        const y = start.getFullYear();
        const m = start.getMonth() + i;
        const last = new Date(y, m + 1, 0).getDate();
        d = new Date(y, m, Math.min(preferredDay, last));
      } else {
        d = new Date(start);
        d.setDate(d.getDate() + i * (recur === 'biweekly' ? 14 : 7));
      }
      if (until && d > until) break;
      dates.push(isoOf(d));
    }
    return dates;
  }

  /* ---------- Kleiner Dialog (hell & dunkel) ---------- */

  function openDialog(innerHtml) {
    document.getElementById('lr-series-dialog')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'lr-series-dialog';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.45);';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" style="width:min(440px,100%);max-height:88vh;overflow-y:auto;background:var(--surface,#fff);color:var(--ink,#222);border:1px solid var(--line,#ddd);border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:inherit;">
        ${innerHtml}
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  const fieldStyle = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--bg,#fff);color:var(--ink,#222);font:inherit;';
  const labelStyle = 'display:flex;flex-direction:column;gap:5px;margin-bottom:10px;font-size:12px;font-weight:700;color:var(--ink-soft,#666);';
  const btnStyle = (primary, danger) => `width:100%;padding:10px 12px;margin-top:8px;border-radius:10px;border:1px solid var(--line,#ddd);background:${danger ? 'var(--error,#b4533f)' : primary ? 'var(--sage,#7c9473)' : 'transparent'};color:${primary || danger ? '#fff' : 'var(--ink,#222)'};font:inherit;font-weight:700;cursor:pointer;`;

  function choose(title, text, options) {
    return new Promise(resolve => {
      const overlay = openDialog(`
        <h2 style="margin:0 0 8px;font-size:18px;">${esc(title)}</h2>
        <p style="margin:0 0 12px;opacity:.75;font-size:14px;">${esc(text)}</p>
        ${options.map(([value, label, kind]) => `<button type="button" data-choice="${esc(value)}" style="${btnStyle(kind === 'primary', kind === 'danger')}">${esc(label)}</button>`).join('')}
        <button type="button" data-choice="" style="${btnStyle(false, false)}">Abbrechen</button>
      `);
      const done = value => { overlay.remove(); resolve(value || null); };
      overlay.addEventListener('click', e => { if (e.target === overlay) done(null); });
      overlay.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => done(b.dataset.choice)));
    });
  }

  /* ---------- Formular im Kalender erweitern ---------- */

  function injectRecurControls() {
    const saveBtn = document.querySelector('#view-calendar .lr-cal-save');
    if (!saveBtn || document.getElementById('lr-recur')) return;

    const wrap = document.createElement('div');
    wrap.id = 'lr-recur-wrap';
    wrap.innerHTML = `
      <label class="lr-cal-field">
        <span>Wiederholung</span>
        <select id="lr-recur">
          ${Object.entries(RECUR_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
      </label>
      <label class="lr-cal-field" id="lr-recur-until-field" style="display:none;">
        <span>Bis (optional)</span>
        <input type="date" id="lr-recur-until">
        <small id="lr-recur-hint" style="font-size:11px;opacity:.65;font-weight:500;"></small>
      </label>`;
    saveBtn.parentNode.insertBefore(wrap, saveBtn);

    const recur = document.getElementById('lr-recur');
    const untilField = document.getElementById('lr-recur-until-field');
    const until = document.getElementById('lr-recur-until');
    const hint = document.getElementById('lr-recur-hint');

    const updateHint = () => {
      const r = recur.value;
      untilField.style.display = r === 'none' ? 'none' : '';
      if (r === 'none') return;
      const start = document.getElementById('event-date')?.value || todayIso();
      const n = buildDates(start, r, until.value).length;
      hint.textContent = until.value
        ? `${n} Termine werden angelegt.`
        : `Ohne Enddatum: ${DEFAULT_COUNTS[r]} Termine (${r === 'monthly' ? 'ca. 1 Jahr' : 'ca. 1 Semester'}).`;
    };
    recur.addEventListener('change', updateHint);
    until.addEventListener('change', updateHint);
    document.getElementById('event-date')?.addEventListener('change', updateHint);
  }

  /* ---------- Speichern (neu) ---------- */

  window.lrCalendarAddEvent = async function () {
    const titleEl = document.getElementById('event-title');
    const dateEl = document.getElementById('event-date');
    const timeEl = document.getElementById('event-time-simple');
    const moduleEl = document.getElementById('event-module');
    const recurEl = document.getElementById('lr-recur');
    const untilEl = document.getElementById('lr-recur-until');

    const title = (titleEl?.value || '').trim();
    if (!title) { titleEl?.focus(); return; }

    const date = dateEl?.value || todayIso();
    if (dateEl && !dateEl.value) dateEl.value = date;

    const rawTime = timeEl?.value || '';
    const time = normalizeTime(rawTime);
    if (rawTime.trim() && !time) {
      toast('Uhrzeit bitte wie 14:30 eingeben.', 'error');
      timeEl?.focus();
      return;
    }

    const recur = recurEl?.value || 'none';
    const until = recur !== 'none' ? (untilEl?.value || '') : '';
    if (until && until < date) {
      toast('Das Enddatum liegt vor dem ersten Termin.', 'error');
      untilEl?.focus();
      return;
    }

    const moduleId = moduleEl?.value || '';
    const dates = buildDates(date, recur, until);
    const recurId = recur !== 'none' ? uidSafe() : undefined;

    dates.forEach(d => {
      const ev = { id: uidSafe(), date: d, title, time, type: 'termin', moduleId };
      if (recurId) Object.assign(ev, { recurId, recur, recurUntil: until || dates[dates.length - 1] });
      events().push(ev);
    });

    await persist();
    /* Kalender auf den Monat des (ersten) Termins springen lassen */
    if (typeof window.lrCalendarSelectDay === 'function') window.lrCalendarSelectDay(date);

    if (titleEl) titleEl.value = '';
    if (timeEl) timeEl.value = '';
    if (recurEl) { recurEl.value = 'none'; recurEl.dispatchEvent(new Event('change')); }
    if (untilEl) untilEl.value = '';

    toast(dates.length > 1 ? `${dates.length} Termine angelegt.` : 'Termin gespeichert.');
  };

  /* ---------- Löschen (mit Serien-Abfrage) ---------- */

  window.lrDeleteCalendarEvent = async function (eventId) {
    const ev = events().find(e => String(e.id) === String(eventId));
    if (!ev) return;
    const series = seriesOf(ev);

    if (series.length > 1) {
      const choice = await choose(
        'Termin löschen',
        `„${ev.title || 'Termin'}“ gehört zu einer Serie mit ${series.length} Terminen.`,
        [['one', 'Nur diesen Termin', 'danger'], ['future', 'Diesen und alle folgenden'], ['all', 'Ganze Serie']]
      );
      if (!choice) return;
      state.events = events().filter(e => {
        if (e.recurId !== ev.recurId) return true;
        if (choice === 'all') return false;
        if (choice === 'future') return e.date < ev.date;
        return String(e.id) !== String(ev.id);
      });
    } else {
      if (!window.confirm(`„${ev.title || 'Termin'}“ wirklich löschen?`)) return;
      state.events = events().filter(e => String(e.id) !== String(ev.id));
    }
    await persist();
  };

  /* ---------- Bearbeiten ---------- */

  window.lrEditCalendarEvent = function (eventId, onDone) {
    const ev = events().find(e => String(e.id) === String(eventId));
    if (!ev) return;
    const series = seriesOf(ev);
    const mods = (typeof modules !== 'undefined' && Array.isArray(modules)) ? modules : [];

    const overlay = openDialog(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;font-size:18px;">Termin bearbeiten</h2>
        <button type="button" data-close aria-label="Schließen" style="border:none;background:none;font-size:20px;cursor:pointer;color:var(--ink-soft,#999);">✕</button>
      </div>
      <label style="${labelStyle}">Titel<input id="lr-edit-title" type="text" style="${fieldStyle}" value="${esc(ev.title || '')}"></label>
      <label style="${labelStyle}">Datum<input id="lr-edit-date" type="date" style="${fieldStyle}" value="${esc(ev.date || '')}"></label>
      <label style="${labelStyle}">Uhrzeit<input id="lr-edit-time" type="text" inputmode="numeric" placeholder="z. B. 14:30 (leer = ganztägig)" style="${fieldStyle}" value="${esc(ev.time || '')}"></label>
      <label style="${labelStyle}">Modul
        <select id="lr-edit-module" style="${fieldStyle}">
          <option value="">Kein Modul</option>
          ${mods.map(m => `<option value="${esc(m.id)}" ${m.id === ev.moduleId ? 'selected' : ''}>${esc((m.icon ? m.icon + ' ' : '') + (m.name || 'Modul'))}</option>`).join('')}
        </select>
      </label>
      ${series.length > 1 ? `
        <div style="margin:4px 0 6px;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:10px;font-size:13px;">
          <div style="font-weight:700;margin-bottom:6px;">🔁 Serie mit ${series.length} Terminen (${esc(RECUR_LABELS[ev.recur] || 'wiederkehrend')})</div>
          <label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer;"><input type="radio" name="lr-edit-scope" value="one" checked> Nur diesen Termin ändern</label>
          <label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer;"><input type="radio" name="lr-edit-scope" value="future"> Diesen und alle folgenden</label>
          <label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer;"><input type="radio" name="lr-edit-scope" value="all"> Alle Termine der Serie</label>
        </div>` : ''}
      <button type="button" data-save style="${btnStyle(true, false)}">Speichern</button>
      <button type="button" data-delete style="${btnStyle(false, false)}color:var(--error,#b4533f);">Termin löschen</button>
    `);

    const close = () => { overlay.remove(); if (typeof onDone === 'function') onDone(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('[data-close]').addEventListener('click', () => overlay.remove());
    setTimeout(() => document.getElementById('lr-edit-title')?.focus(), 30);

    overlay.querySelector('[data-delete]').addEventListener('click', async () => {
      overlay.remove();
      await window.lrDeleteCalendarEvent(ev.id);
      if (typeof onDone === 'function') onDone();
    });

    overlay.querySelector('[data-save]').addEventListener('click', async () => {
      const title = document.getElementById('lr-edit-title').value.trim();
      const date = document.getElementById('lr-edit-date').value;
      const rawTime = document.getElementById('lr-edit-time').value;
      const time = normalizeTime(rawTime);
      const moduleId = document.getElementById('lr-edit-module').value;
      const scope = overlay.querySelector('input[name="lr-edit-scope"]:checked')?.value || 'one';

      if (!title) { document.getElementById('lr-edit-title').focus(); return; }
      if (!parseIso(date)) { document.getElementById('lr-edit-date').focus(); return; }
      if (rawTime.trim() && !time) { toast('Uhrzeit bitte wie 14:30 eingeben.', 'error'); return; }

      if (scope === 'one' || series.length <= 1) {
        Object.assign(ev, { title, date, time, moduleId });
      } else {
        /* Datumsänderung als Verschiebung auf die ganze Auswahl übertragen */
        const shiftDays = Math.round((parseIso(date) - parseIso(ev.date)) / 86400000);
        const oldDate = ev.date;
        series
          .filter(e => scope === 'all' || e.date >= oldDate)
          .forEach(e => {
            const d = parseIso(e.date);
            d.setDate(d.getDate() + shiftDays);
            Object.assign(e, { title, time, moduleId, date: isoOf(d) });
          });
      }
      await persist();
      toast('Termin gespeichert.');
      close();
    });
  };

  /* ---------- Start ---------- */

  function start() {
    injectRecurControls();
    /* Falls das Kalender-Formular später neu gezeichnet wird */
    const view = document.getElementById('view-calendar');
    if (view && 'MutationObserver' in window) {
      new MutationObserver(() => injectRecurControls()).observe(view, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 150));
  else setTimeout(start, 150);
})();
