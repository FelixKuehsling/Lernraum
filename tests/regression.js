// Regression: fresh profile, exercise features, dump deterministic summary to $OUT
const fs=require('fs');
module.exports=async p=>{
  const R={}; const step=async(name,fn)=>{ try{ R[name]=await fn(); }catch(e){ R[name]='FAIL '+e.message.split('\n')[0]; } };
  await p.waitForTimeout(1500);
  await step('tour', async()=>{ const v=await p.isVisible('#lr-tour'); if(v) await p.click('[data-tour="finish"]'); return v; });
  const view=async v=>{ await p.click(`.nav-item[data-view="${v}"]`); await p.waitForTimeout(350); };
  // Module
  await step('module', async()=>{ await view('modules'); await p.evaluate(()=>workspaceNewModule()); await p.waitForTimeout(200);
    await p.fill('#ws-module-name','Buchhaltung'); await p.click('#modal-backdrop >> text=Speichern'); await p.waitForTimeout(300);
    await p.evaluate(()=>workspaceNewModule()); await p.waitForTimeout(200); await p.fill('#ws-module-name','Privatrecht'); await p.click('#modal-backdrop >> text=Speichern'); await p.waitForTimeout(300);
    return await p.evaluate(()=>modules.map(m=>m.name)); });
  // Todo
  await step('todo', async()=>{ await view('dashboard'); for(const t of ['Skript lesen','Übung 3']){ await p.fill('#dash-quick-todo',t); await p.press('#dash-quick-todo','Enter'); await p.waitForTimeout(200);} 
    await view('todo'); return await p.evaluate(()=>state.todos.map(t=>t.text)); });
  // Calendar
  await step('calendar', async()=>{ await view('calendar');
    await p.fill('#event-date','2026-10-05'); await p.fill('#event-time-simple','14:30'); await p.fill('#event-title','Klausur'); await p.click('#view-calendar >> text=Speichern'); await p.waitForTimeout(300);
    await p.fill('#event-date','2026-10-06'); await p.fill('#event-time-simple','09:00'); await p.fill('#event-title','Vorlesung'); await p.selectOption('#lr-recur','weekly'); await p.fill('#lr-recur-until','2026-11-03'); await p.click('#view-calendar >> text=Speichern'); await p.waitForTimeout(300);
    await p.evaluate(()=>setCalViewMode && setCalViewMode('week')); await p.waitForTimeout(200); await p.evaluate(()=>setCalViewMode('month')); 
    return await p.evaluate(()=>state.events.map(e=>e.date+' '+e.time+' '+e.title+(e.recurId?' R':'')).sort()); });
  // Notes
  await step('notes', async()=>{ await view('notes'); await p.evaluate(()=>createNote()); await p.waitForTimeout(200);
    await p.fill('#note-title','Bilanz'); await p.evaluate(()=>{const c=document.getElementById('note-content'); if(c){ if(c.isContentEditable) c.innerText='Aktiva = Passiva'; else c.value='Aktiva = Passiva'; c.dispatchEvent(new Event('input',{bubbles:true}));}});
    const sv=await p.$('#view-notes button:has-text("Speichern")'); if(sv) await sv.click(); await p.waitForTimeout(400);
    return await p.evaluate(()=>state.notes.filter(n=>!n.deleted).map(n=>n.title+'|'+(n.content||'').replace(/<[^>]+>/g,'').trim())); });
  // Cards
  await step('cards', async()=>{ await view('cards'); for(const [f,b] of [['Aktiva','Vermögen'],['Passiva','Kapital'],['GuV','Gewinn und Verlust']]){ await p.fill('#fc-new-front',f); await p.fill('#fc-new-back',b); await p.click('#fc-manage-wrap >> text=Speichern'); await p.waitForTimeout(200);} 
    return await p.evaluate(()=>state.cards.map(c=>c.front+'='+c.back)); });
  await step('study', async()=>{ await p.evaluate(()=>setFcMode('study')); await p.waitForTimeout(300); const t=(await p.innerText('#view-cards')).slice(0,200).replace(/\s+/g,' '); await p.evaluate(()=>setFcMode('game')); await p.waitForTimeout(300); const g=(await p.innerText('#view-cards')).length>0; await p.evaluate(()=>setFcMode('manage')); return [t.length>10,g]; });
  // Plan
  await step('plan', async()=>{ await view('planner'); await p.fill('#plan-date','2026-10-07'); await p.fill('#plan-title','BWL Kapitel 3'); await p.fill('#plan-duration','60'); await p.click('#plan-save-btn'); await p.waitForTimeout(300);
    return await p.evaluate(()=>studyPlans.map(s=>s.date+' '+(s.title||'')+' '+(s.duration||''))); });
  // Docs
  await step('docs', async()=>{ await view('docs'); await p.evaluate(()=>{document.getElementById('doc-folder-input').value='Skripten'; return addDocFolder();}); await p.waitForTimeout(300);
    await p.setInputFiles('#doc-file-input',{name:'test.txt',mimeType:'text/plain',buffer:Buffer.from('hallo welt')}); await p.waitForTimeout(800);
    return await p.evaluate(()=>({folders:state.docFolders.map(f=>f.name), docs:(state.docs||[]).map(d=>d.name)})); });
  // Lernuhr
  await step('lernuhr', async()=>{ await p.evaluate(()=>{ const i=document.getElementById('lernuhr-custom-minutes'); if(i) i.value='1'; }); await p.evaluate(()=>toggleLernuhr()); await p.waitForTimeout(2300); const r1=await p.evaluate(()=>lernuhrRunning); await p.evaluate(()=>toggleLernuhr()); await p.waitForTimeout(200); return [r1, await p.evaluate(()=>lernuhrRunning)]; });
  // Stats & all views text
  const views=await p.$$eval('.nav-item[data-view]',e=>[...new Set(e.map(x=>x.dataset.view))]);
  R.views={};
  for(const v of views){ await view(v); R.views[v]=(await p.evaluate(v=>{const el=document.getElementById('view-'+v); return el? el.innerText.replace(/\d{1,2}:\d{2}(:\d{2})?/g,'T').replace(/\s+/g,' ').trim():'MISSING';},v)); }
  await shot((process.env.TAG||'reg')+'-dash');
  // theme + reload persistence
  await step('theme', async()=>{ await p.evaluate(()=>toggleTheme()); const d=await p.evaluate(()=>document.documentElement.classList.contains('dark')); await p.reload(); await p.waitForTimeout(1500); return [d, await p.evaluate(()=>document.documentElement.classList.contains('dark'))]; });
  await step('persist', async()=>p.evaluate(()=>({m:modules.length,t:state.todos.length,e:state.events.length,n:state.notes.length,c:state.cards.length,p:studyPlans.length,h:learningHistory.length})));
  await step('settings', async()=>{ await view('settings'); return (await p.innerText('#view-settings')).replace(/\s+/g,' ').slice(0,400); });
  // Mobile-ish: module detail
  await step('moduleDetail', async()=>{ await view('modules'); const c=await p.$('#view-modules [onclick*="openModule"]'); if(c){ await c.click(); await p.waitForTimeout(300);} return (await p.innerText('#view-modules')).replace(/\s+/g,' ').slice(0,300); });
  R.errors=errs.slice();
  fs.writeFileSync(process.env.OUT||require('os').tmpdir()+'/lernraum-reg.json', JSON.stringify(R,null,1));
  log('written', Object.keys(R).length, 'errors', errs.length);
};
