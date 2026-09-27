/* ============================================================
   LERNRAUM – FEEDBACK
   Kleines Fenster, in dem Nutzer Ideen oder Fehler melden können.
   Gespeichert in der Supabase-Tabelle "feedback" (nur Einfügen
   erlaubt – lesen kann nur der Betreiber im Supabase-Dashboard).
============================================================ */

function openFeedbackDialog() {
  document.getElementById('lernraum-feedback-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lernraum-feedback-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    display:flex; align-items:center; justify-content:center;
    padding:20px; background:rgba(0,0,0,.45);
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width:min(440px,100%);
    background:var(--surface,#fff); color:var(--ink,#222);
    border:1px solid var(--line,#ddd); border-radius:18px;
    padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.25);
    font-family:inherit;
  `;

  const field = `
    width:100%; box-sizing:border-box; padding:11px 12px; margin-bottom:9px;
    border:1px solid var(--line,#ddd); border-radius:10px;
    background:var(--bg,#fff); color:var(--ink,#222); font:inherit;
  `;
  const btn = (secondary) => `
    width:100%; padding:10px 12px; margin-top:8px; border-radius:10px;
    border:1px solid var(--line,#ddd);
    background:${secondary ? 'transparent' : 'var(--sage,#7c9473)'};
    color:${secondary ? 'var(--ink,#222)' : '#fff'};
    font:inherit; font-weight:700; cursor:pointer;
  `;

  const knownEmail = localStorage.getItem('lernraum_user_email') || '';

  panel.innerHTML = `
    <h2 style="margin:0 0 8px;">Feedback &amp; Ideen</h2>
    <p style="margin:0 0 16px;opacity:.7;">
      Was gefällt dir, was fehlt, was funktioniert nicht? Jede Rückmeldung hilft, Lernraum besser zu machen.
    </p>
    <textarea id="feedback-message" rows="5" maxlength="2000"
      placeholder="Deine Nachricht …" style="${field} resize:vertical;"></textarea>
    <input id="feedback-email" type="email" maxlength="200"
      placeholder="E-Mail für eine Antwort (optional)" style="${field}">
    <button id="feedback-send-btn" style="${btn(false)}">Absenden</button>
    <button id="feedback-close-btn" style="${btn(true)}">Schließen</button>
    <div id="feedback-status" style="margin-top:12px;font-size:12px;opacity:.75;"></div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const emailInput = document.getElementById('feedback-email');
  if (emailInput) emailInput.value = knownEmail;

  document.getElementById('feedback-close-btn')
    ?.addEventListener('click', () => overlay.remove());

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('feedback-send-btn')
    ?.addEventListener('click', sendFeedbackLernraum);

  setTimeout(() => document.getElementById('feedback-message')?.focus(), 50);
}


async function sendFeedbackLernraum() {
  const status = document.getElementById('feedback-status');
  const sendBtn = document.getElementById('feedback-send-btn');
  const message = (document.getElementById('feedback-message')?.value || '').trim();
  const email = (document.getElementById('feedback-email')?.value || '').trim();

  if (message.length < 3) {
    status.textContent = 'Bitte schreib kurz, worum es geht.';
    return;
  }

  if (typeof supabaseClient === 'undefined') {
    status.textContent = 'Feedback konnte gerade nicht gesendet werden. Bitte versuch es später noch einmal.';
    return;
  }

  sendBtn.disabled = true;
  status.textContent = 'Wird gesendet …';

  const { error } = await supabaseClient
    .from('feedback')
    .insert({
      message,
      email: email || null,
      page: 'lernraum'
    });

  if (error) {
    console.error('Feedback Fehler:', error);
    status.textContent = 'Senden fehlgeschlagen. Bitte versuch es später noch einmal.';
    sendBtn.disabled = false;
    return;
  }

  status.textContent = 'Danke für dein Feedback! 💚';
  setTimeout(() => document.getElementById('lernraum-feedback-overlay')?.remove(), 1600);
}
