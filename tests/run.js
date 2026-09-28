// Test-Runner: node tests/run.js tests/<script>.js
// Vorher: Webserver im Repo starten:  python3 -m http.server 8765
// Env: PORT (8765), PROFILE (Browser-Profil-Ordner, leer = frisch), MOBILE=1 (390x844)
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const mobile = process.env.MOBILE === '1';
  const profile = process.env.PROFILE || fs.mkdtempSync(path.join(os.tmpdir(), 'lernraum-'));
  const ctx = await chromium.launchPersistentContext(profile, {
    viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 860 },
    isMobile: mobile, hasTouch: mobile, acceptDownloads: true
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR|goatcounter|Failed to fetch/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept(global.__prompt || 'Test'));
  // Kein echter Supabase-/GoatCounter-Traffic in Tests
  await p.route(/supabase\.co|gc\.zgo\.at|goatcounter/, r => r.abort());
  await p.goto('http://localhost:' + (process.env.PORT || 8765) + '/', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  Object.assign(global, { p, errs, log: console.log, shot: n => p.screenshot({ path: path.join(os.tmpdir(), n + '.png') }) });
  try { await require(path.resolve(process.argv[2]))(p); } catch (e) { console.log('STEP-FAIL', e.message.split('\n')[0]); process.exitCode = 1; }
  console.log('ERRORS:', errs.length ? '\n  ' + errs.join('\n  ') : 'none');
  if (errs.length) process.exitCode = 1;
  await ctx.close();
})();
