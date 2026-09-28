// Ende-zu-Ende-Test der Cloud-Synchronisierung gegen einen nachgebauten Supabase-Server (keine echten Daten).
module.exports=async p=>{
  const cloud={row:null}; let offline=false; const log2=[];
  const ctx=p.context();
  await p.unroute(/supabase\.co|gc\.zgo\.at|goatcounter/);
  await p.route(/gc\.zgo\.at|goatcounter/, r=>r.abort());
  await p.route(/supabase\.co/, async r=>{
    const req=r.request(); const u=new URL(req.url());
    if(offline) return r.abort('internetdisconnected');
    if(u.pathname.startsWith('/auth/v1')) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'U1',email:'t@x.at',aud:'authenticated',role:'authenticated'})});
    if(u.pathname==='/rest/v1/lernraum_sync'){
      if(req.method()==='GET'){ log2.push('GET'); const obj=/object\+json/.test(req.headers()['accept']||'');
        if(obj) return cloud.row? r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(cloud.row)}) : r.fulfill({status:406,contentType:'application/json',body:JSON.stringify({code:'PGRST116',message:'0 rows'})});
        return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(cloud.row?[cloud.row]:[])}); }
      if(req.method()==='POST'){ const b=JSON.parse(req.postData()); const row=Array.isArray(b)?b[0]:b; cloud.row={data:row.data,updated_at:row.updated_at}; log2.push('UPSERT todos='+row.data.todos.length); return r.fulfill({status:201,body:''}); }
    }
    if(u.pathname.startsWith('/storage/v1')) return r.fulfill({status:200,contentType:'application/json',body:'{}'});
    return r.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await p.evaluate(()=>{ const now=Math.floor(Date.now()/1000); localStorage.setItem('sb-jureyjdijtcfcsfcmfjz-auth-token', JSON.stringify({access_token:'fake',token_type:'bearer',expires_in:3600,expires_at:now+36000,refresh_token:'r',user:{id:'U1',email:'t@x.at',aud:'authenticated',role:'authenticated'}})); localStorage.setItem('lernraum_user','U1'); localStorage.setItem('lernraum_user_email','t@x.at'); });
  const todos=()=>p.evaluate(()=>state.todos.map(t=>t.text).join(','));
  const add=async t=>{ await p.evaluate(t=>{state.todos.unshift({id:'t'+Math.random(),text:t,done:false,priority:'mittel'}); return save('lernraum_todos',state.todos);},t); };
  const cloudTodos=()=>cloud.row? cloud.row.data.todos.map(t=>t.text).join(','):'(leer)';
  // A
  await p.reload(); await p.waitForTimeout(2500);
  console.log('A start: user', await p.evaluate(()=>lernraumSyncUser?.id), 'ready', await p.evaluate(()=>lernraumCloudReady), 'cloud', cloudTodos());
  await add('A1'); await p.waitForTimeout(2800); console.log('A after add: cloud', cloudTodos());
  await p.reload(); await p.waitForTimeout(2500); console.log('A reload local', await todos());
  console.log('settings status:', await p.evaluate(()=>{updateSyncStatus(); return document.getElementById('sync-status-text').textContent;}), '| button', await p.textContent('#lernraum-sync-button'));
  // B offline edit
  offline=true; await p.reload(); await p.waitForTimeout(4500); console.log('B offline ready', await p.evaluate(()=>lernraumCloudReady));
  await add('B-offline'); await p.waitForTimeout(2500); console.log('B cloud while offline', cloudTodos(), 'pending', await p.evaluate(()=>!!localStorage.getItem('lernraum_sync_pending')));
  offline=false; await p.evaluate(()=>window.dispatchEvent(new Event('online'))); await p.waitForTimeout(3000);
  console.log('B after online: cloud', cloudTodos(), '| local', await todos(), 'pending', await p.evaluate(()=>!!localStorage.getItem('lernraum_sync_pending')));
  // C other device newer
  const d=JSON.parse(JSON.stringify(cloud.row.data)); d.todos.unshift({id:'h',text:'C-Handy',done:false}); cloud.row={data:d,updated_at:new Date(Date.now()+1000).toISOString()};
  await p.evaluate(()=>{ Object.defineProperty(document,'hidden',{value:false,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(2000);
  console.log('C local', await todos());
  // D add then reload immediately
  await add('D-schnell'); await p.reload(); await p.waitForTimeout(3500);
  console.log('D local', await todos(), '| cloud', cloudTodos());
  // E cloud newer, no pending, fresh start
  const e=JSON.parse(JSON.stringify(cloud.row.data)); e.todos.unshift({id:'e',text:'E-Handy',done:false}); cloud.row={data:e,updated_at:new Date(Date.now()+1000).toISOString()};
  await p.reload(); await p.waitForTimeout(3000); console.log('E local', await todos());
  console.log('requests', log2.join(' '));
};
