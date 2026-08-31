/* Lernraum – bereinigtes Hauptscript. */
/* ============================================================
   LERNRAUM - CLEANED BASE
   Doppelte, spaeter ueberschriebene Funktionsdeklarationen entfernt.
============================================================ */
(function () {
  const NS = 'lernraum__';
  function buildKey(key, shared) {
    return NS + (shared ? 'shared__' : 'private__') + key;
  }
  window.storage = window.storage || {
    async get(key, shared = false) {
      try {
        const raw = localStorage.getItem(buildKey(key, shared));
        if (raw === null) return null;
        return {
          key, value: raw, shared }
        ;
      }
      catch (error) {
        console.error('storage.get Fehler:', error);
        return null;
      }
    }
    , 
    async set(key, value, shared = false) {
      try {
        localStorage.setItem(buildKey(key, shared), value);
        return {
          key, value, shared }
        ;
      }
      catch (error) {
        console.error('storage.set Fehler:', error);
        return null;
      }
    }
    , 
    async delete(key, shared = false) {
      try {
        const storageKey = buildKey(key, shared);
        const existed = localStorage.getItem(storageKey) !== null;
        localStorage.removeItem(storageKey);
        return {
          key, deleted: existed, shared }
        ;
      }
      catch (error) {
        console.error('storage.delete Fehler:', error);
        return null;
      }
    }
    , 
    async list(prefix = '', shared = false) {
      try {
        const fullPrefix = buildKey(prefix, shared);
        const keys = [];
        for (let index = 0;
        index < localStorage.length;
        index += 1) {
          const storageKey = localStorage.key(index);
          if (storageKey && storageKey.startsWith(fullPrefix)) {
            keys.push(storageKey.slice(NS.length + (shared ? 'shared__'.length : 'private__'.length)));
          }
        }
        return {
          keys, prefix, shared }
        ;
      }
      catch (error) {
        console.error('storage.list Fehler:', error);
        return null;
      }
    }
  }
  ;
}
)();
async function safeGet(key, fallback){
  try{
    const r = await window.storage.get(key, false);
    return (r && r.value) ? JSON.parse(r.value) : fallback;
  }
  catch(e){
    return fallback;
  }
}
async function save(key, value){
  try{
    await window.storage.set(key, JSON.stringify(value), false);
  }
  catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}
let state = {
  notes: [], todos: [], events: [], cards: [], cardFolders: [], docFolders: [],
  docs: [], noteFolders: [] }
;
let modules = [];
let taskRange = 'week';
let taskDisplay = 'table';
let taskSort = 'deadline';
let taskModuleFilter = 'all';
let taskStatusFilter = 'all';
let taskPriorityFilter = 'all';
const TASK_UI_KEY = 'lernraum_task_ui';
let selectedNoteId = null;
let noteFolderFilter = 'alle';
let calYear, calMonth, selectedDate = null;
let calViewMode = 'month';
let weekStartDate = null;
let dashCalYear, dashCalMonth;
let fcMode = 'manage';
let fcFolderFilter = 'alle';
let docFolderFilter = 'alle';
let studyIndex = 0;
let studyOrder = [];
let flipped = false;
let studyResults = {
}
;
let studyFinished = false;
const WEEKLY_RECUR_COUNT = 14;
const MONTHLY_RECUR_COUNT = 12;
const LEITNER_INTERVALS_MS = {
  1: 0, 
  2: 1 * 86400000, 
  3: 3 * 86400000, 
  4: 7 * 86400000, 
  5: 14 * 86400000
}
;
function leitnerNextDue(box){
  return Date.now() + (LEITNER_INTERVALS_MS[box] || 0);
}
const GAME_TIME = 12;
const GAME_ROUND_LENGTH = 10;
let gameCards = [];
let gameScore = 0;
let gameLives = 3;
let gameStreak = 0;
let gameQuestion = null;
let gameOptions = [];
let gameTimer = null;
let gameTimeLeft = 0;
let gameOver = false;
let gameAnswered = false;
let gameQuestionsAnswered = 0;
let gameHighscore = 0;
let lernuhrTotal = 30 * 60;
let lernuhrRemaining = 30 * 60;
let lernuhrRunning = false;
let lernuhrInterval = null;
const LERNUHR_CIRC = 2 * Math.PI * 44;
function renderLernuhr(){
  const progress = document.getElementById('lernuhr-progress');
  const timeEl = document.getElementById('lernuhr-time');
  const widget = document.getElementById('lernuhr-widget');
  const toggleBtn = document.getElementById('lernuhr-toggle');
  if(!progress || !timeEl || !widget || !toggleBtn) return;
  progress.style.strokeDasharray = String(LERNUHR_CIRC);
  const frac = lernuhrTotal > 0 ? Math.max(0, lernuhrRemaining / lernuhrTotal) : 0;
  progress.style.strokeDashoffset = String(LERNUHR_CIRC * (1 - frac));
  const mins = Math.floor(lernuhrRemaining / 60);
  const secs = lernuhrRemaining % 60;
  timeEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2,
  '0');
  widget.classList.toggle('running', lernuhrRunning);
  widget.classList.toggle('done', lernuhrRemaining <= 0);
  toggleBtn.textContent = lernuhrRunning ? '\u275A\u275A' : '\u25B6';
  toggleBtn.title = lernuhrRunning ? 'Pause' : 'Start';
}
function toggleLernuhr(){
  if(lernuhrRunning) pauseLernuhr();
  else startLernuhr();
}
function startLernuhr(){
  if(lernuhrRemaining <= 0 || lernuhrRunning) return;
  lernuhrRunning = true;
  renderLernuhr();
  lernuhrInterval = setInterval(async ()=> {
    lernuhrRemaining--;
    stats.lernuhrSeconds++;
    if(stats.lernuhrSeconds % 5 === 0){
      await saveStats();
    }
    if(lernuhrRemaining <= 0){
      lernuhrRemaining = 0;
      pauseLernuhr();
      await saveStats();
    }
    renderLernuhr();
  }
  , 1000);
}
function pauseLernuhr(){
  lernuhrRunning = false;
  if(lernuhrInterval){
    clearInterval(lernuhrInterval);
    lernuhrInterval = null;
  }
  renderLernuhr();
}
async function resetLernuhr(){
  pauseLernuhr();
  lernuhrRemaining = lernuhrTotal;
  await saveStats();
  renderLernuhr();
}
function setLernuhrPreset(min){
  pauseLernuhr();
  lernuhrTotal = min * 60;
  lernuhrRemaining = lernuhrTotal;
  document.querySelectorAll('.lernuhr-preset-btn').forEach(b=> b.classList.toggle('active',
  parseInt(b.dataset.min, 10) === min));
  renderLernuhr();
}
let stats = defaultStats();
function defaultStats(){
  return {
    cardsAnswered: 0, 
    notesCreated: 0, 
    todosCompleted: 0, 
    lernuhrSeconds: 0, 
    gamesPlayed: 0,
    perfectGames: 0,
    maxStreak: 0
  }
  ;
}
async function saveStats(){
  await save('lernraum_stats', stats);
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,
7);
const EVENT_TYPE_LABELS = {
  termin: 'Sonstiges', abgabe: 'Abgabe', 
  vorlesung: 'Vorlesung', uebung: '\u00DCbung', seminar: 'Seminar', klausur: 'Klausur',
  praktikum: 'Praktikum', lerngruppe: 'Lerngruppe', 
  kurs: 'Kurs', test: 'Pr\u00FCfung'
}
;
document.querySelectorAll('.nav-item').forEach(el=> {
  el.addEventListener('click', ()=> activateView(el.dataset.view));
}
);
function activateView(view){
  document.querySelectorAll('.nav-item').forEach(n=> n.classList.toggle('active',
  n.dataset.view===view));
  document.querySelectorAll('.view').forEach(v=> v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  if(view === 'dashboard') renderDashboard();
  if(view === 'todo') renderTodos();
  if(view === 'modules') renderModules();
  if(view !== 'cards'){
    stopGameTimer();
  }
  else if(fcMode === 'game' && !gameOver && gameQuestion){
    startGameTimer();
  }
}
function goToView(view){
  activateView(view);
}
function localISODate(date = new Date()){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}
-${month}
-${day}
`;
}
function todayISO(){
  return localISODate(new Date());
}
function renderDashboard(){
  const now = new Date();
  const weekday = now.toLocaleDateString('de-DE', {
    weekday: 'long'}
  );
  const dateStr = now.toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric'}
  );
  document.getElementById('dash-date').textContent = weekday + ' \u00B7 ' + dateStr;
  const hour = now.getHours();
  const greet = hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';
  document.getElementById('dash-greeting').textContent = greet + '!';
  document.getElementById('stat-todos').textContent = state.todos.filter(t=> !t.done).length;
  document.getElementById('stat-notes').textContent = state.notes.length;
  const upcoming = state.events.filter(e=> e.date >= todayISO()).sort((a,
  b)=> (a.date+a.time).localeCompare(b.date+b.time));
  document.getElementById('stat-next').textContent = upcoming.length ? fmtEventShort(upcoming[0]) : 'Keine geplant';
  const list = document.getElementById('dash-upcoming');
  if(!upcoming.length){
    list.innerHTML = '<div class="empty compact">Noch keine Termine im Kalender.</div>';
  }
  else {
    list.innerHTML = upcoming.slice(0, 5).map(e=> 
    `<li class="mini-row"><span class="dot"></span><span style="flex:1;">${escapeHtml(e.title)}
  </span><span class="evt-type-tag ${e.type|| 'termin'}
">${EVENT_TYPE_LABELS[e.type]|| 'Termin'}
</span><span style="font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--ink-soft);">${fmtDateShort(e.date)}
${e.time? ' \u00B7 '+e.time : ''}
</span></li>`
).join('');
}
renderDashTodoPreview();
renderDashCalendar();
}
function eventDotsHtml(iso){
  const types = [...new Set(state.events.filter(e=> e.date===iso).map(e=> e.type|| 'termin'))].slice(0,
  3);
  if(!types.length) return '';
  return `<span class="evt-dots">${types.map(t=> `<span class="evt-dot ${t}
"></span>`).join('')}
</span>`;
}
function fmtEventShort(e){
  return escapeHtml(e.title) + ' (' + fmtDateShort(e.date) + ')';
}
function fmtDateShort(iso){
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit'}
  );
}
function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}
function renderDashTodoPreview(){
  const priorityRank = { hoch: 0, mittel: 1, niedrig: 2 };
  const open = state.todos
    .map(normalizeTask)
    .filter(t => !t.done)
    .sort((a, b) => {
      const aDeadline = a.deadline || '9999-99-99';
      const bDeadline = b.deadline || '9999-99-99';
      if(aDeadline !== bDeadline){
        return aDeadline.localeCompare(bDeadline);
      }
      return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    })
    .slice(0, 5);
  const wrap = document.getElementById('dash-todo-preview');
  if(!wrap) return;
  if(!open.length){
    wrap.innerHTML = '<div class="empty compact"><span class="emoji">✅</span>Keine offenen Aufgaben.</div>';
    return;
  }
  wrap.innerHTML = open.map(t => `
    <li class="mini-row">
      <div class="mini-check" onclick="toggleTodo('${t.id}')"></div>
      <span style="flex:1;min-width:0;">
        ${escapeHtml(t.text)}
      </span>
      ${taskPriorityHtml(t.priority)}
    </li>
  `).join('');
}
function renderDashCalendar(){
  if(dashCalYear === undefined){
    const now = new Date();
    dashCalYear = now.getFullYear();
    dashCalMonth = now.getMonth();
  }
  document.getElementById('dash-cal-dow-row').innerHTML = DOWS.map(d=> `<div class="mini-cal-dow">${d}
</div>`).join('');
document.getElementById('dash-cal-label').textContent = MONTHS[dashCalMonth] + ' ' + dashCalYear;
const first = new Date(dashCalYear, dashCalMonth, 1);
let startOffset = first.getDay() - 1;
if(startOffset < 0) startOffset = 6;
const daysInMonth = new Date(dashCalYear, dashCalMonth+1, 0).getDate();
const grid = document.getElementById('dash-cal-grid');
let html = '';
for(let i= 0;
i<startOffset;
i++) html += '<div class="mini-cal-day blank"></div>';
for(let d= 1;
d<=daysInMonth;
d++){
  const iso = `${dashCalYear}
-${String(dashCalMonth+1).padStart(2, '0')}
-${String(d).padStart(2, '0')}
`;
const isToday = iso === todayISO();
html += `<div class="mini-cal-day ${isToday? 'today': ''}
" onclick="goToCalendarDay('${iso}
')">${d}
${eventDotsHtml(iso)}
</div>`;
}
grid.innerHTML = html;
}
function dashCalShift(dir){
  dashCalMonth += dir;
  if(dashCalMonth < 0){
    dashCalMonth = 11;
    dashCalYear--;
  }
  if(dashCalMonth > 11){
    dashCalMonth = 0;
    dashCalYear++;
  }
  renderDashCalendar();
}
function goToCalendarDay(iso){
  selectedDate = iso;
  calYear = parseInt(iso.slice(0, 4));
  calMonth = parseInt(iso.slice(5, 7)) - 1;
  activateView('calendar');
  setCalViewMode('day');
}
async function quickAddTodo(){
  const input = document.getElementById('dash-quick-todo');
  const text = input.value.trim();
  if(!text) return;
  state.todos.unshift({
    id: uid(), text, done: false, priority: 'mittel'}
  );
  await save('lernraum_todos', state.todos);
  input.value = '';
  renderDashboard();
  renderTodos();
}
function renderNoteFolderChips(){
  const wrap = document.getElementById('note-folder-chips');
  const chips = [{
    id: 'alle', name: 'Alle'}
  , ...state.noteFolders];
  wrap.innerHTML = chips.map(f => `
    <button class="folder-chip ${noteFolderFilter===f.id? 'active': ''}
" onclick="setNoteFolderFilter('${f.id}
')">
      ${escapeHtml(f.name)}
${(f.id!=='alle' && f.id!=='ohne') ? `<span class="del-x" onclick="event.stopPropagation(); deleteNoteFolder('${f.id}
')">\u2715</span>` : ''}
    </button>`).join('');
}
function setNoteFolderFilter(id){
  noteFolderFilter = id;
  renderNoteFolderChips();
  renderNotesList();
}
async function addNoteFolder(){
  const input = document.getElementById('note-folder-input');
  const name = input.value.trim();
  if(!name) return;
  state.noteFolders.push({
    id: uid(), name}
  );
  await save('lernraum_note_folders', state.noteFolders);
  input.value = '';
  await saveStats();
  renderNoteFolderChips();
  renderNoteEditor();
}
async function deleteNoteFolder(id){
  state.noteFolders = state.noteFolders.filter(f=> f.id!==id);
  state.notes.forEach(n=> {
    if(n.folderId===id) n.folderId = null;
  }
  );
  await save('lernraum_note_folders', state.noteFolders);
  await save('lernraum_notes', state.notes);
  if(noteFolderFilter===id) noteFolderFilter = 'alle';
  renderNoteFolderChips();
  renderNotesList();
}
function debounce(fn, ms){
  let t;
  return (...args)=> {
    clearTimeout(t);
    t = setTimeout(()=> fn(...args), ms);
  }
  ;
}
async function updateNoteFields(){
  const note = state.notes.find(n=> n.id===selectedNoteId);
  if(!note) return;
  note.title = document.getElementById('note-title').value;
  note.content = document.getElementById('note-content').value;
  note.updated = Date.now();
  await save('lernraum_notes', state.notes);
  renderNotesList(false);
}
async function updateNoteFolder(folderId){
  const note = state.notes.find(n=> n.id===selectedNoteId);
  if(!note) return;
  note.folderId = folderId;
  note.updated = Date.now();
  await save('lernraum_notes', state.notes);
  renderNotesList();
}
async function createNote(){
  showTrash=false;
  const folderId=(noteFolderFilter!=='alle'&&noteFolderFilter!=='ohne')?noteFolderFilter:null;
  const note={id:uid(),title:'',content:'',folderId,moduleId:'',favorite:false,deleted:false,createdAt:Date.now(),updated:Date.now()};
  state.notes.unshift(note);selectedNoteId=note.id;
  await save('lernraum_notes',state.notes);stats.notesCreated++;await saveStats();renderNotesList();setTimeout(()=>document.getElementById('note-title')?.focus(),50);
}
function selectNote(id){
  selectedNoteId = id;
  renderNotesList();
}
const TASK_STATUS_LABELS = { geplant: 'Geplant', bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };
function normalizeTask(t){
  if(!t) return t;
  if(!t.deadline && t.dueDate) t.deadline = t.dueDate;
  if(t.deadline === undefined) t.deadline = '';
  if(t.progress === undefined || t.progress === null) t.progress = t.done ? 100 : 0;
  if(!t.status) t.status = t.done ? 'erledigt' : 'geplant';
  if(t.moduleId === undefined || t.moduleId === null) t.moduleId = '';
  if(t.project === undefined || t.project === null) t.project = '';
  if(!t.kind) t.kind = 'aufgabe';
  if(!t.priority) t.priority = 'mittel';
  if(!t.createdAt) t.createdAt = Date.now();
  return t;
}
function moduleById(id){
  return modules.find(m=> m.id===id);
}
function loadTaskUi(){
  try{
    const x = JSON.parse(localStorage.getItem(TASK_UI_KEY)|| '{}');
    taskRange= x.taskRange|| 'week';
    taskDisplay= x.taskDisplay|| 'table';
    taskSort= x.taskSort|| 'deadline';
    taskModuleFilter= x.taskModuleFilter|| 'all';
    taskStatusFilter= x.taskStatusFilter|| 'all';
  }
  catch(e){
  }
}
function saveTaskUi(){
  localStorage.setItem(TASK_UI_KEY, JSON.stringify({
    taskRange, taskDisplay, taskSort, taskModuleFilter, taskStatusFilter}
  ));
}
function taskRangeDates(range){
  const today= new Date();
  today.setHours(12, 0, 0, 0);
  if(range==='week'){
    const start= new Date(today), day= start.getDay()|| 7;
    start.setDate(start.getDate()-day+1);
    const end= new Date(start);
    end.setDate(end.getDate()+6);
    return [localISODate(start), localISODate(end)];
  }
  if(range==='month'){
    const start= new Date(today.getFullYear(), today.getMonth(), 1, 12), end= new Date(today.getFullYear(),
    today.getMonth()+1, 0, 12);
    return [localISODate(start), localISODate(end)];
  }
  return [null, null];
}
function parseLocalTaskDate(iso){
  if(!iso)return null;
  const [y, m, d]= iso.split('-').map(Number);
  return new Date(y, m-1, d, 12);
}
function filteredWorkspaceTasks(){
  let arr= state.todos.map(normalizeTask).slice();
  const [from, to]= taskRangeDates(taskRange);
  if(taskRange==='week'|| taskRange==='month')arr= arr.filter(t=> t.deadline&& t.deadline>=from&& t.deadline<=to);
  if(taskRange==='deadlines')arr= arr.filter(t=> t.deadline|| t.kind==='abgabe');
  if(taskModuleFilter!=='all')arr= arr.filter(t=> t.moduleId===taskModuleFilter);
  if(taskStatusFilter!=='all')arr= arr.filter(t=> t.status===taskStatusFilter);
  if(taskPriorityFilter!=='all')arr= arr.filter(t=> t.priority===taskPriorityFilter);
  arr.sort((a, b)=> {
    if(taskSort==='progress')return (b.progress|| 0)-(a.progress|| 0);
    if(taskSort==='title')return String(a.text|| '').localeCompare(String(b.text|| ''),
    'de');
    if(taskSort==='module')return String(moduleById(a.moduleId)?.name|| '').localeCompare(String(moduleById(b.moduleId)?.name|| ''),
    'de');
    return (a.deadline|| '9999-99-99').localeCompare(b.deadline|| '9999-99-99');
  }
  );
  return arr;
}
function taskDeadlineHtml(iso){
  if(!iso)return '<span style="color:var(--ink-faint)">\u2014</span>';
  const d= parseLocalTaskDate(iso), overdue= iso<todayISO();
  return `<span class="db-deadline ${overdue? 'overdue': ''}
">${d.toLocaleDateString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric'}
)}
</span>`;
}
function taskProgressHtml(v){
  v= Math.max(0, Math.min(100, Number(v)|| 0));
  return `<div class="db-progress"><span class="db-progress-num">${v}
%</span><div class="db-progress-track"><div class="db-progress-fill" style="width:${v}
%"></div></div></div>`;
}
function taskStatusHtml(status){
  const s= TASK_STATUS_LABELS[status]? status: 'geplant';
  return `<span class="db-chip status-${s}
">${TASK_STATUS_LABELS[s]}
</span>`;
}
function taskPriorityHtml(priority){
  const p = ['niedrig','mittel','hoch'].includes(priority)
    ? priority
    : 'mittel';
  const labels = {
    niedrig: 'Niedrig',
    mittel: 'Mittel',
    hoch: 'Hoch'
  };
  return `<span class="tag ${p}">${labels[p]}</span>`;
}
function taskModuleHtml(id){
  const m= moduleById(id);
  return m? `<span class="db-chip">${escapeHtml(m.icon|| '\u25A3')}
 ${escapeHtml(m.name)}
</span>`: '<span style="color:var(--ink-faint)">\u2014</span>';
}
async function addTodo(){
  workspaceNewTask();
}
async function toggleTodo(id){
  return workspaceToggleTask(id);
}
async function deleteTodo(id){
  return workspaceDeleteTask(id);
}
function setTodoFilter(f){
  taskStatusFilter = f==='offen' ? 'all' : f==='erledigt' ? 'erledigt' : 'all';
  if(f==='offen') taskRange= 'all';
  saveTaskUi();
  renderTodos();
}
function renderTodos(){
  taskRange='all';
  const wrap=document.getElementById('workspace-task-content');
  if(!wrap) return;
  state.todos.forEach(normalizeTask);
  const tabs=document.getElementById('task-range-tabs'); if(tabs) tabs.style.display='none';
  const note=document.getElementById('task-range-note'); if(note) note.style.display='none';
  const moduleSel=document.getElementById('task-module-filter');
  if(moduleSel){
    moduleSel.innerHTML='<option value="all">Alle Module</option>'+modules.map(m=>`<option value="${m.id}">${escapeHtml(m.icon||'📚')} ${escapeHtml(m.name)}</option>`).join('');
    if(!modules.some(m=>m.id===taskModuleFilter)) taskModuleFilter='all';
    moduleSel.value=taskModuleFilter;
  }
  const prioritySel=document.getElementById('task-priority-filter');
  if(prioritySel){ prioritySel.value=taskPriorityFilter; }
  const statusSel=document.getElementById('task-status-filter');
  if(statusSel){
    const idea=statusSel.querySelector('option[value="idee"]'); if(idea) idea.remove();
    if(taskStatusFilter==='idee') taskStatusFilter='all';
    statusSel.value=taskStatusFilter;
  }
  const sortSel=document.getElementById('task-sort'); if(sortSel) sortSel.value=taskSort;
  document.querySelectorAll('.view-kind-btn').forEach(b=>b.classList.toggle('active',b.dataset.display===taskDisplay));
  const tasks=filteredWorkspaceTasks().map(t=>{ if(t.status==='idee') t.status='geplant'; return t; });
  if(taskDisplay==='board') renderTaskBoard(tasks); else renderTaskTable(tasks);
}
function renderTaskTable(tasks){
  const wrap=document.getElementById('workspace-task-content');
  if(!wrap) return;
  wrap.innerHTML=`<div class="db-shell" style="overflow-x:auto"><table class="db-table"><thead><tr>
    <th>Aufgabe</th><th>Deadline</th><th>Priorität</th><th>Modul</th><th>Typ</th><th>Status</th><th></th>
  </tr></thead><tbody>${tasks.map(task=>`<tr>
    <td><div class="db-title-cell"><button class="db-check ${task.done?'done':''}" onclick="workspaceToggleTask('${task.id}')"></button><span style="${task.done?'text-decoration:line-through;color:var(--ink-faint)':''}">${escapeHtml(task.text)}</span></div></td>
    <td>${taskDeadlineHtml(task.deadline)}</td>
    <td>${taskPriorityHtml(task.priority)}</td>
    <td>${taskModuleHtml(task.moduleId)}</td>
    <td>${task.kind?`<span class="db-chip">${escapeHtml(task.kind)}</span>`:'—'}</td>
    <td>${taskStatusHtml(task.status)}</td>
    <td><div class="db-actions"><button class="icon-btn" onclick="workspaceEditTask('${task.id}')" title="Bearbeiten">✎</button><button class="icon-btn" onclick="workspaceDeleteTask('${task.id}')" title="Löschen">✕</button></div></td>
  </tr>`).join('')}</tbody></table><button class="db-new-row" onclick="workspaceNewTask()">＋ Neue Aufgabe</button></div>`;
}
function renderTaskBoard(tasks){
  const wrap=document.getElementById('workspace-task-content');
  if(!wrap) return;
  const statuses=['geplant','bearbeitung','erledigt'];
  wrap.innerHTML=`<div class="board-grid" style="grid-template-columns:repeat(3,minmax(220px,1fr))">${statuses.map(status=>{
    const list=tasks.filter(t=>(t.status==='idee'?'geplant':t.status)===status);
    return `<section class="board-col"><div class="board-col-head"><span>${TASK_STATUS_LABELS[status]}</span><span class="board-count">${list.length}</span></div>${list.map(t=>`<article class="task-board-card" onclick="workspaceEditTask('${t.id}')"><div class="task-board-title">${escapeHtml(t.text)}</div><div class="task-board-meta">${taskPriorityHtml(t.priority)} ${taskModuleHtml(t.moduleId)} ${t.deadline?taskDeadlineHtml(t.deadline):''} ${t.kind?`<span class="db-chip">${escapeHtml(t.kind)}</span>`:''}</div></article>`).join('')}<button class="db-new-row" style="border:0" onclick="workspaceNewTask('${status}')">＋ Neu</button></section>`;
  }).join('')}</div>`;
}
async function persistWorkspaceTodos(){
  await save('lernraum_todos', state.todos);
  renderTodos();
  renderModules();
  renderDashboard();
}
function taskEditorHtml(task, editing){
  const status = ['geplant','bearbeitung','erledigt'].includes(task.status)
    ? task.status
    : 'geplant';
  const priority = ['niedrig','mittel','hoch'].includes(task.priority)
    ? task.priority
    : 'mittel';
  return `
    <div class="modal-head">
      <div>
        <div class="eyebrow">${editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</div>
        <h3>${editing ? escapeHtml(task.text || 'Aufgabe') : 'Neue Aufgabe'}</h3>
      </div>
      <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="editor-grid">
      <label class="wide">Titel
        <input
          id="ws-task-title"
          type="text"
          value="${escapeHtml(task.text || '')}"
          placeholder="z. B. Kapitel 4 lernen"
          autocomplete="off"
        >
      </label>
      <label>Deadline
        <input
          id="ws-task-deadline"
          type="date"
          value="${escapeHtml(task.deadline || '')}"
        >
      </label>
      <label>Priorität
        <select id="ws-task-priority">
          <option value="niedrig" ${priority==='niedrig'?'selected':''}>Niedrig</option>
          <option value="mittel" ${priority==='mittel'?'selected':''}>Mittel</option>
          <option value="hoch" ${priority==='hoch'?'selected':''}>Hoch</option>
        </select>
      </label>
      <label>Status
        <select id="ws-task-status">
          <option value="geplant" ${status==='geplant'?'selected':''}>Geplant</option>
          <option value="bearbeitung" ${status==='bearbeitung'?'selected':''}>In Bearbeitung</option>
          <option value="erledigt" ${status==='erledigt'?'selected':''}>Erledigt</option>
        </select>
      </label>
      <label>Typ
        <input
          id="ws-task-kind"
          type="text"
          value="${escapeHtml(task.kind || '')}"
          placeholder="z. B. Hausaufgabe, Prüfung, Lernen"
        >
      </label>
      <label>Modul
        <select id="ws-task-module">
          <option value="">Kein Modul</option>
          ${modules.map(m=>`<option value="${m.id}" ${task.moduleId===m.id?'selected':''}>${escapeHtml(m.icon||'📚')} ${escapeHtml(m.name)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn ghost" onclick="closeModal()">Abbrechen</button>
      <button type="button" class="btn" onclick="workspaceSaveTask('${editing ? task.id : ''}')">Speichern</button>
    </div>`;
}
function workspaceNewTask(initialStatus='geplant', moduleId=''){
  const task = { text:'', deadline:'', status: initialStatus==='erledigt'?'erledigt':initialStatus==='bearbeitung'?'bearbeitung':'geplant', kind:'', moduleId, done:false, priority:'mittel', progress:0, project:'' };
  openModal(taskEditorHtml(task,false));
  setTimeout(()=>document.getElementById('ws-task-title')?.focus(),0);
}
function workspaceEditTask(id){
  const task=state.todos.find(item=>item.id===id);
  if(!task) return;
  normalizeTask(task);
  if(task.status==='idee') task.status='geplant';
  openModal(taskEditorHtml(task,true));
}
async function workspaceSaveTask(id=''){
  const title=document.getElementById('ws-task-title')?.value.trim();
  if(!title){ document.getElementById('ws-task-title')?.focus(); return; }
  const status=document.getElementById('ws-task-status')?.value || 'geplant';
  const data={
    text:title,
    deadline:document.getElementById('ws-task-deadline')?.value || '',
    status,
    kind:document.getElementById('ws-task-kind')?.value.trim() || '',
    moduleId:document.getElementById('ws-task-module')?.value || '',
    done:status==='erledigt',
    priority:document.getElementById('ws-task-priority')?.value || 'mittel',
    progress:status==='erledigt'?100:0,
    project:''
  };
  if(id){
    const task=state.todos.find(item=>item.id===id);
    if(!task) return;
    Object.assign(task,data,{updatedAt:Date.now()});
  }else{
    state.todos.unshift({id:uid(),createdAt:Date.now(),updatedAt:Date.now(),...data});
  }
  closeModal();
  await persistWorkspaceTodos();
  if(typeof notify==='function') notify(id?'Aufgabe gespeichert.':'Aufgabe erstellt.');
}
async function workspaceToggleTask(id){
  const t= state.todos.find(x=> x.id===id);
  if(!t)return;
  normalizeTask(t);
  const wasDone= t.done;
  t.done= !t.done;
  t.status= t.done? 'erledigt': 'bearbeitung';
  t.progress= t.done? 100: Math.min(Number(t.progress)|| 0, 90);
  if(t.done&& !wasDone){
    stats.todosCompleted++;
    await saveStats();
  }
  await persistWorkspaceTodos();
}
async function workspaceDeleteTask(id){
  if(!confirm('Aufgabe wirklich l\u00F6schen?'))return;
  state.todos= state.todos.filter(t=> t.id!==id);
  await persistWorkspaceTodos();
}
function workspaceSetRange(range){
  taskRange= range;
  saveTaskUi();
  renderTodos();
}
function workspaceSetDisplay(display){
  taskDisplay= display;
  saveTaskUi();
  renderTodos();
}
function workspaceTaskFilterChanged(){
  taskModuleFilter= document.getElementById('task-module-filter').value;
  taskStatusFilter= document.getElementById('task-status-filter').value;
  taskPriorityFilter= document.getElementById('task-priority-filter')?.value || 'all';
  taskSort= document.getElementById('task-sort').value;
  saveTaskUi();
  renderTodos();
}
function workspaceTaskFilterModule(id){
  taskModuleFilter= id;
  taskRange= 'all';
  saveTaskUi();
  renderTodos();
}
async function saveModules(){
  await save('lernraum_modules', modules);
}
const MONTHS = ['Januar', 'Februar', 'M\u00E4rz', 'April', 'Mai', 'Juni',
'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DOWS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEK_HOURS = Array.from({
  length: 14}
, (_, i)=> i+7);
function initCalendar(){
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedDate = todayISO();
  weekStartDate = getMonday(new Date());
  document.getElementById('cal-dow-row').innerHTML = DOWS.map(d=> `<div class="cal-dow">${d}
</div>`).join('');
}
function getMonday(d){
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function isoOf(d){
  return localISODate(d);
}
function setCalViewMode(mode){
  calViewMode = mode;
  document.querySelectorAll('.cal-view-btn').forEach(b=> b.classList.toggle('active',
  b.dataset.view===mode));
  document.getElementById('cal-month-wrap').style.display = mode==='month' ? 'block' : 'none';
  document.getElementById('cal-week-wrap').style.display = mode==='week' ? 'block' : 'none';
  document.getElementById('cal-day-wrap').style.display = mode==='day' ? 'block' : 'none';
  if(mode==='week' && selectedDate){
    weekStartDate = getMonday(new Date(selectedDate+'T00:00:00'));
  }
  if(mode==='day' && !selectedDate){
    selectedDate = todayISO();
  }
  renderCalendar();
}
function calShift(dir){
  if(calViewMode === 'day'){
    const d = new Date(selectedDate+'T00:00:00');
    d.setDate(d.getDate() + dir);
    selectedDate = isoOf(d);
    renderCalendar();
    return;
  }
  if(calViewMode === 'week'){
    weekStartDate.setDate(weekStartDate.getDate() + dir* 7);
    renderCalendar();
    return;
  }
  calMonth += dir;
  if(calMonth < 0){
    calMonth = 11;
    calYear--;
  }
  if(calMonth > 11){
    calMonth = 0;
    calYear++;
  }
  renderCalendar();
}
function calGoToday(){
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedDate = todayISO();
  weekStartDate = getMonday(new Date());
  renderCalendar();
}
function renderCalendar(){
  if(calViewMode === 'week'){
    document.getElementById('cal-label').textContent = weekLabel();
    renderWeekView();
  }
  else if(calViewMode === 'day'){
    const d = new Date(selectedDate+'T00:00:00');
    document.getElementById('cal-label').textContent = d.toLocaleDateString('de-DE',
    {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}
    );
    renderDayTimelineView();
  }
  else {
    document.getElementById('cal-label').textContent = MONTHS[calMonth] + ' ' + calYear;
    renderMonthGrid();
  }
  renderDayPanel();
  renderUpcomingEvents();
}
function weekLabel(){
  const end = new Date(weekStartDate);
  end.setDate(end.getDate()+6);
  const fmt = d => d.toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit'}
  );
  return 'KW ' + getIsoWeek(weekStartDate) + ' \u00B7 ' + fmt(weekStartDate) + ' \u2013 ' + fmt(end);
}
function getIsoWeek(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1)/ 7);
}
function renderMonthGrid(){
  const first = new Date(calYear, calMonth, 1);
  let startOffset = first.getDay() - 1;
  if(startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const grid = document.getElementById('cal-grid');
  let html = '';
  for(let i= 0;
  i<startOffset;
  i++) html += '<div class="cal-day blank"></div>';
  for(let d= 1;
  d<=daysInMonth;
  d++){
    const iso = `${calYear}
  -${String(calMonth+1).padStart(2, '0')}
-${String(d).padStart(2, '0')}
`;
const isToday = iso === todayISO();
const isSel = iso === selectedDate;
const count = state.events.filter(e=> e.date===iso).length;
html += `<div class="cal-day ${isToday? 'today': ''}
 ${isSel? 'selected': ''}
" onclick="selectDay('${iso}
')" ondblclick="openDayView('${iso}
')">
      <span class="cal-day-num">${d}
</span>
      ${count ? `<span class="cal-day-count">${count}
</span>` : ''}
      ${eventDotsHtml(iso)}
    </div>`;
}
grid.innerHTML = html;
}
function renderWeekView(){
  const wrap = document.getElementById('cal-week-wrap');
  const days = Array.from({
    length: 7}
  , (_, i)=> {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate()+i);
    return d;
  }
  );
  const todayIso = todayISO();
  let headHtml = '<div class="week-head"><div></div>';
  days.forEach(d=> {
    const iso = isoOf(d);
    headHtml += `<div class="week-head-cell ${iso===todayIso? 'today': ''}
   ${iso===selectedDate? 'selected': ''}
" style="cursor:pointer;" onclick="openDayView('${iso}
')">${DOWS[i7(d)]}
<span class="wd-num">${d.getDate()}
</span></div>`;
}
);
headHtml += '</div>';
let alldayHtml = '<div class="week-allday-row"><div></div>';
days.forEach(d=> {
  const iso = isoOf(d);
  const evts = state.events.filter(e=> e.date===iso && !e.time);
  alldayHtml += `<div class="week-allday-cell">${evts.map(e=> `<div class="week-allday-chip evt-type-tag ${e.type|| 'termin'}
" onclick="openDayView('${iso}
')" title="${escapeHtml(e.title)}
">${escapeHtml(e.title)}
</div>`).join('')}
</div>`;
}
);
alldayHtml += '</div>';
let bodyHtml = '<div class="week-grid" style="grid-template-rows:repeat(' + WEEK_HOURS.length + ', 38px);">';
WEEK_HOURS.forEach(hour=> {
  bodyHtml += `<div class="week-hour-label">${String(hour).padStart(2, '0')}
:00</div>`;
days.forEach(d=> {
  const iso = isoOf(d);
  const evts = state.events.filter(e=> {
    if(e.date !== iso || !e.time) return false;
    const h = parseInt(e.time.slice(0, 2), 10);
    return h === hour;
  }
  );
  bodyHtml += `<div class="week-col" onclick="selectSlot('${iso}
', ${hour}
)">`;
evts.forEach(e=> {
  bodyHtml += `<div class="week-evt ${e.type|| 'termin'}
" title="${escapeHtml(e.time+' '+e.title)}
" onclick="event.stopPropagation(); openDayView('${iso}
')">${e.time}
 ${escapeHtml(e.title)}
</div>`;
}
);
bodyHtml += `</div>`;
}
);
}
);
bodyHtml += '</div>';
wrap.innerHTML = headHtml + alldayHtml + bodyHtml;
}
function renderDayTimelineView(){
  const wrap = document.getElementById('cal-day-wrap');
  const iso = selectedDate;
  const alldayEvts = state.events.filter(e=> e.date===iso && !e.time);
  let alldayHtml = '';
  if(alldayEvts.length){
    alldayHtml = '<div class="week-allday-row" style="grid-template-columns:44px 1fr;"><div></div><div class="week-allday-cell">' +
    alldayEvts.map(e=> `<div class="week-allday-chip evt-type-tag ${e.type|| 'termin'}
  " title="${escapeHtml(e.title)}
">${escapeHtml(e.title)}
</div>`).join('') +
'</div></div>';
}
let bodyHtml = '<div class="week-grid" style="grid-template-columns:44px 1fr; grid-template-rows:repeat(' + WEEK_HOURS.length + ', 38px);">';
WEEK_HOURS.forEach(hour=> {
  bodyHtml += `<div class="week-hour-label">${String(hour).padStart(2, '0')}
:00</div>`;
const hourEvts = state.events.filter(e=> {
  if(e.date !== iso || !e.time) return false;
  const h = parseInt(e.time.slice(0, 2), 10);
  return h === hour;
}
);
bodyHtml += `<div class="week-col" onclick="selectSlot('${iso}
', ${hour}
)">`;
hourEvts.forEach(e=> {
  bodyHtml += `<div class="week-evt ${e.type|| 'termin'}
" title="${escapeHtml(e.time+' '+e.title)}
" onclick="event.stopPropagation();">${e.time}
 ${escapeHtml(e.title)}
</div>`;
}
);
bodyHtml += `</div>`;
}
);
bodyHtml += '</div>';
wrap.innerHTML = alldayHtml + bodyHtml;
}
function i7(d){
  const day = d.getDay();
  return day===0 ? 6 : day-1;
}
function openDayView(iso){
  selectedDate = iso;
  setCalViewMode('day');
}
function selectDay(iso){
  selectedDate = iso;
  if(calViewMode === 'week' || calViewMode === 'day'){
    renderDayPanel();
  }
  else {
    renderCalendar();
  }
}
function selectSlot(iso, hour){
  selectedDate = iso;
  renderDayPanel();
  setEventTime(String(hour).padStart(2, '0') + ':00');
  const titleInput = document.getElementById('event-title');
  if(titleInput) titleInput.focus();
}
function getEventTime(){
  const hour = document.getElementById('event-time-hour')?.value || '';
  const minute = document.getElementById('event-time-minute')?.value || '';
  if(!hour && !minute) return '';
  return `${hour || '00'}
:${minute || '00'}
`;
}
function setEventTime(value = ''){
  const hourSelect = document.getElementById('event-time-hour');
  const minuteSelect = document.getElementById('event-time-minute');
  const [hour = '', minute = ''] = value ? value.split(':') : [];
  if(hourSelect) hourSelect.value = hour;
  if(minuteSelect) minuteSelect.value = minute;
}
function renderUpcomingEvents(){
  const upcoming = state.events.filter(e=> e.date >= todayISO()).sort((a,
  b)=> (a.date+(a.time|| '')).localeCompare(b.date+(b.time|| ''))).slice(0,
  5);
  const wrap = document.getElementById('upcoming-events');
  wrap.innerHTML = upcoming.length ? upcoming.map(e=> `
    <div class="event-row">
      <span class="time">${fmtDateShort(e.date)}
${e.time? ' '+e.time: ''}
</span>
      <span class="txt">${escapeHtml(e.title)}
</span>
      <span class="evt-type-tag ${e.type|| 'termin'}
">${EVENT_TYPE_LABELS[e.type]|| 'Termin'}
</span>
    </div>`).join('') : '<div class="day-events-empty">Keine bevorstehenden Termine.</div>';
}
async function addEvent(){
  const titleInput = document.getElementById('event-title');
  const title = titleInput.value.trim();
  if(!title){
    titleInput.focus();
    return;
  }
  const dateInput = document.getElementById('event-date');
  const dateVal = (dateInput && dateInput.value) ? dateInput.value : selectedDate;
  const time = getEventTime();
  const type = document.getElementById('event-type').value;
  const recur = document.getElementById('event-recur').value;
  if(recur === 'none'){
    state.events.push({
      id: uid(), date: dateVal, title, time, type}
    );
  }
  else if(recur === 'monthly'){
    const recurId = uid();
    const base = new Date(dateVal+'T00:00:00');
    const preferredDay = base.getDate();
    for(let i= 0;
    i<MONTHLY_RECUR_COUNT;
    i++){
      const targetYear = base.getFullYear();
      const targetMonth = base.getMonth() + i;
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const d = new Date(targetYear, targetMonth, Math.min(preferredDay, lastDay));
      state.events.push({
        id: uid(), date: isoOf(d), title, time, type, recurId}
      );
    }
  }
  else {
    const stepDays = recur === 'biweekly' ? 14 : 7;
    const recurId = uid();
    const base = new Date(dateVal+'T00:00:00');
    for(let i= 0;
    i<WEEKLY_RECUR_COUNT;
    i++){
      const d = new Date(base);
      d.setDate(d.getDate() + i* stepDays);
      state.events.push({
        id: uid(), date: isoOf(d), title, time, type, recurId}
      );
    }
  }
  await save('lernraum_events', state.events);
  titleInput.value = '';
  setEventTime('');
  document.getElementById('event-type').value = 'termin';
  document.getElementById('event-recur').value = 'none';
  renderCalendar();
  renderDashboard();
}
async function deleteEvent(id){
  state.events = state.events.filter(e=> e.id!==id);
  await save('lernraum_events', state.events);
  renderCalendar();
  renderDashboard();
}
async function deleteEventSeries(recurId){
  state.events = state.events.filter(e=> e.recurId!==recurId);
  await save('lernraum_events', state.events);
  renderCalendar();
  renderDashboard();
}
function icsEscape(s){
  return String(s|| '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g,
  '\\,').replace(/\n/g, '\\n');
}
function icsDateStamp(){
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function exportIcs(){
  if(!state.events.length){
    alert('Es sind noch keine Termine im Kalender.');
    return;
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lernraum//DE',
  'CALSCALE:GREGORIAN'];
  state.events.forEach(e=> {
    const dateCompact = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + e.id + '@lernraum');
    lines.push('DTSTAMP:' + icsDateStamp());
    if(e.time){
      const [hh, mm] = e.time.split(':');
      const startCompact = dateCompact + 'T' + hh + mm + '00';
      const endDate = new Date(e.date+'T'+e.time+':00');
      endDate.setHours(endDate.getHours()+1);
      const endCompact = isoOf(endDate).replace(/-/g, '') + 'T' + String(endDate.getHours()).padStart(2,
      '0') + String(endDate.getMinutes()).padStart(2, '0') + '00';
      lines.push('DTSTART:' + startCompact);
      lines.push('DTEND:' + endCompact);
    }
    else {
      const endDate = new Date(e.date+'T00:00:00');
      endDate.setDate(endDate.getDate()+1);
      lines.push('DTSTART;VALUE=DATE:' + dateCompact);
      lines.push('DTEND;VALUE=DATE:' + isoOf(endDate).replace(/-/g, ''));
    }
    lines.push('SUMMARY:' + icsEscape(e.title));
    lines.push('CATEGORIES:' + icsEscape(EVENT_TYPE_LABELS[e.type] || 'Termin'));
    lines.push('END:VEVENT');
  }
  );
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], {
    type: 'text/calendar;charset=utf-8'}
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lernraum-kalender.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function renderFlashcards(){
  renderFcFolderChips();
  renderFcManage();
  if(fcMode === 'study'){
    renderStudySetup();
  }
}
function renderFcFolderChips(){
  const wrap = document.getElementById('fc-folder-chips');
  if(!wrap) return;
  const chips = [{ id: 'alle', name: 'Alle' }, ...state.cardFolders];
  wrap.innerHTML = chips.map(folder => `
    <button
      type="button"
      class="folder-chip ${fcFolderFilter === folder.id ? 'active' : ''}"
      data-fc-folder="${escapeHtml(folder.id)}"
    >
      ${escapeHtml(folder.name)}
      ${
        folder.id !== 'alle'
          ? `<span class="del-x" data-fc-delete-folder="${escapeHtml(folder.id)}" title="Kategorie löschen">✕</span>`
          : ''
      }
    </button>
  `).join('');
  const select = document.getElementById('fc-new-folder');
  if(select){
    select.innerHTML =
      `<option value="">Ohne Kategorie</option>` +
      state.cardFolders.map(folder => `
        <option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>
      `).join('');
    if(state.cardFolders.some(folder => folder.id === fcFolderFilter)){
      select.value = fcFolderFilter;
    }else{
      select.value = '';
    }
  }
}
function setFcFolderFilter(id){
  fcFolderFilter = id || 'alle';
  renderFcFolderChips();
  renderFcManage();
}
async function addCardFolder(){
  const input = document.getElementById('fc-folder-input');
  if(!input) return;
  const name = input.value.trim();
  if(!name){
    if(typeof notify === 'function') notify('Bitte einen Kategorienamen eingeben.', 'error');
    input.focus();
    return;
  }
  const exists = state.cardFolders.some(folder =>
    String(folder.name || '').trim().toLowerCase() === name.toLowerCase()
  );
  if(exists){
    if(typeof notify === 'function') notify('Diese Kategorie gibt es bereits.', 'error');
    input.focus();
    return;
  }
  state.cardFolders.push({
    id: uid(),
    name
  });
  await save('lernraum_card_folders', state.cardFolders);
  input.value = '';
  renderFcFolderChips();
  renderFcManage();
  if(typeof notify === 'function') notify('Kategorie erstellt.');
}
async function deleteCardFolder(id){
  const folder = state.cardFolders.find(item => item.id === id);
  if(!folder) return;
  if(!window.confirm(`Kategorie "${folder.name}" löschen? Die Karten bleiben erhalten.`)){
    return;
  }
  state.cardFolders = state.cardFolders.filter(item => item.id !== id);
  state.cards.forEach(card => {
    if(card.folderId === id){
      card.folderId = null;
    }
  });
  if(fcFolderFilter === id){
    fcFolderFilter = 'alle';
  }
  await Promise.all([
    save('lernraum_card_folders', state.cardFolders),
    save('lernraum_flashcards', state.cards)
  ]);
  renderFcFolderChips();
  renderFcManage();
  renderDashboard();
  if(typeof notify === 'function') notify('Kategorie gelöscht.');
}
function getFilteredCardIndices(){
  return state.cards
    .map((card, index) => index)
    .filter(index => {
      const card = state.cards[index];
      if(fcFolderFilter === 'alle') return true;
      if(fcFolderFilter === 'ohne') return !card.folderId;
      return card.folderId === fcFolderFilter;
    });
}
function renderFcManage(){
  const wrap = document.getElementById('fc-manage-list');
  if(!wrap) return;
  const indices = getFilteredCardIndices();
  const countEl = document.getElementById('fc-manage-count');
  if(countEl){
    countEl.textContent = `${indices.length} ${indices.length === 1 ? 'Karte' : 'Karten'}`;
  }
  if(!indices.length){
    wrap.innerHTML = `
      <div class="empty">
        <span class="emoji">🗂️</span>
        Keine Karteikarten in dieser Kategorie.<br>
        Trag oben Begriff und Bedeutung ein und klicke auf „Speichern“.
      </div>
    `;
    return;
  }
  wrap.innerHTML = indices.map(index => {
    const card = state.cards[index];
    return `
      <div class="fc-row" data-card-id="${escapeHtml(card.id)}">
        <input
          type="text"
          value="${escapeHtml(card.front || '')}"
          placeholder="Begriff"
          data-card-field="front"
          data-card-id="${escapeHtml(card.id)}"
        >
        <button
          type="button"
          class="icon-btn divider"
          data-card-action="swap"
          data-card-id="${escapeHtml(card.id)}"
          title="Seiten tauschen"
          aria-label="Seiten tauschen"
        >⇄</button>
        <input
          type="text"
          value="${escapeHtml(card.back || '')}"
          placeholder="Bedeutung"
          data-card-field="back"
          data-card-id="${escapeHtml(card.id)}"
        >
        <select
          data-card-field="folderId"
          data-card-id="${escapeHtml(card.id)}"
          aria-label="Kategorie"
        >
          <option value="" ${!card.folderId ? 'selected' : ''}>Ohne Kategorie</option>
          ${state.cardFolders.map(folder => `
            <option
              value="${escapeHtml(folder.id)}"
              ${card.folderId === folder.id ? 'selected' : ''}
            >${escapeHtml(folder.name)}</option>
          `).join('')}
        </select>
        <button
          type="button"
          class="icon-btn"
          data-card-action="delete"
          data-card-id="${escapeHtml(card.id)}"
          title="Karte löschen"
          aria-label="Karte löschen"
        >✕</button>
      </div>
    `;
  }).join('');
}
async function saveNewCard(){
  const frontInput = document.getElementById('fc-new-front');
  const backInput = document.getElementById('fc-new-back');
  const folderSelect = document.getElementById('fc-new-folder');
  if(!frontInput || !backInput) return;
  const front = frontInput.value.trim();
  const back = backInput.value.trim();
  if(!front && !back){
    if(typeof notify === 'function'){
      notify('Bitte Begriff oder Bedeutung eingeben.', 'error');
    }
    frontInput.focus();
    return;
  }
  state.cards.push({
    id: uid(),
    front,
    back,
    folderId: folderSelect?.value || null,
    box: 1,
    dueDate: Date.now(),
    createdAt: Date.now()
  });
  await save('lernraum_flashcards', state.cards);
  frontInput.value = '';
  backInput.value = '';
  if(folderSelect) folderSelect.value = '';
  renderFcManage();
  renderDashboard();
  frontInput.focus();
  if(typeof notify === 'function') notify('Karte gespeichert.');
}
async function updateCard(id, field, value){
  const card = state.cards.find(item => item.id === id);
  if(!card) return;
  if(field === 'folderId'){
    card.folderId = value || null;
  }else{
    card[field] = value;
  }
  await save('lernraum_flashcards', state.cards);
}
async function swapCardSides(id){
  const card = state.cards.find(item => item.id === id);
  if(!card) return;
  [card.front, card.back] = [card.back, card.front];
  await save('lernraum_flashcards', state.cards);
  renderFcManage();
  if(typeof notify === 'function') notify('Seiten getauscht.');
}
async function deleteCard(id){
  const card = state.cards.find(item => item.id === id);
  if(!card) return;
  if(!window.confirm('Diese Karteikarte wirklich löschen?')) return;
  state.cards = state.cards.filter(item => item.id !== id);
  await save('lernraum_flashcards', state.cards);
  renderFcManage();
  if(fcMode === 'study'){
    renderStudy();
  }
  renderDashboard();
  if(typeof notify === 'function') notify('Karte gelöscht.');
}
function setFcMode(mode){
  if(!['manage', 'study', 'game'].includes(mode)){
    mode = 'manage';
  }
  fcMode = mode;
  document.querySelectorAll('.fc-mode-btn-item').forEach(button => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
  const manageWrap = document.getElementById('fc-manage-wrap');
  const studyWrap = document.getElementById('fc-study-wrap');
  const gameWrap = document.getElementById('fc-game-wrap');
  if(manageWrap) manageWrap.style.display = mode === 'manage' ? 'block' : 'none';
  if(studyWrap) studyWrap.style.display = mode === 'study' ? 'block' : 'none';
  if(gameWrap) gameWrap.style.display = mode === 'game' ? 'block' : 'none';
  stopGameTimer();
  if(mode === 'manage'){
    renderFcFolderChips();
    renderFcManage();
  }else if(mode === 'study'){
    renderStudySetup();
  }else if(mode === 'game'){
    startGame();
  }
}
function startGame(){
  const indices = getFilteredCardIndices().filter(i => state.cards[i].front.trim() && state.cards[i].back.trim());
  gameCards = indices;
  gameScore = 0;
  gameLives = 3;
  gameStreak = 0;
  gameOver = false;
  gameQuestion = null;
  gameQuestionsAnswered = 0;
  if(gameCards.length < 2){
    renderGame();
    return;
  }
  nextGameQuestion();
}
function nextGameQuestion(){
  gameAnswered = false;
  const idx = gameCards[Math.floor(Math.random()* gameCards.length)];
  const card = state.cards[idx];
  const pool = gameCards
  .map(i => state.cards[i].back)
  .filter(b => b && b !== card.back);
  const uniquePool = [...new Set(pool)];
  for(let i= uniquePool.length-1;
  i>0;
  i--){
    const j= Math.floor(Math.random()* (i+1));
    [uniquePool[i], uniquePool[j]]= [uniquePool[j], uniquePool[i]];
  }
  const distractors = uniquePool.slice(0, 3);
  const options = [...distractors, card.back];
  for(let i= options.length-1;
  i>0;
  i--){
    const j= Math.floor(Math.random()* (i+1));
    [options[i], options[j]]= [options[j], options[i]];
  }
  gameQuestion = {
    front: card.front, back: card.back }
  ;
  gameOptions = options;
  gameTimeLeft = GAME_TIME;
  renderGame();
  startGameTimer();
}
function startGameTimer(){
  stopGameTimer();
  gameTimer = setInterval(()=> {
    gameTimeLeft--;
    updateGameTimerBar();
    if(gameTimeLeft <= 0){
      stopGameTimer();
      answerGame(null);
    }
  }
  , 1000);
}
function stopGameTimer(){
  if(gameTimer){
    clearInterval(gameTimer);
    gameTimer = null;
  }
}
function updateGameTimerBar(){
  const fill = document.getElementById('game-timerbar-fill');
  if(!fill) return;
  const pct = Math.max(0, (gameTimeLeft / GAME_TIME) * 100);
  fill.style.width = pct + '%';
  fill.classList.toggle('warn', gameTimeLeft <= 4);
}
async function answerGame(chosen){
  if(gameAnswered || !gameQuestion) return;
  gameAnswered = true;
  stopGameTimer();
  const correct = chosen === gameQuestion.back;
  stats.cardsAnswered++;
  if(correct){
    gameStreak++;
    gameScore += 10 + (gameStreak > 1 ? (gameStreak - 1) * 2 : 0);
    if(gameStreak > stats.maxStreak) stats.maxStreak = gameStreak;
  }
  else {
    gameStreak = 0;
    gameLives--;
  }
  await saveStats();
  document.querySelectorAll('.game-option-btn').forEach(btn=> {
    btn.disabled = true;
    if(btn.dataset.value === gameQuestion.back) btn.classList.add('correct');
    else if(btn.dataset.value === chosen) btn.classList.add('wrong');
  }
  );
  updateGameTopbar();
  await new Promise(r=> setTimeout(r, 700));
  gameQuestionsAnswered++;
  if(gameLives <= 0 || gameQuestionsAnswered >= GAME_ROUND_LENGTH){
    await finishGame();
  }
  else {
    nextGameQuestion();
  }
}
async function finishGame(){
  gameOver = true;
  stopGameTimer();
  stats.gamesPlayed++;
  if(gameLives === 3) stats.perfectGames++;
  await saveStats();
  if(gameScore > gameHighscore){
    gameHighscore = gameScore;
    await save('lernraum_game_highscore', gameHighscore);
  }
  renderGame();
}
function updateGameTopbar(){
  const wrap = document.getElementById('game-topbar');
  if(wrap) wrap.innerHTML = gameTopbarHtml();
}
function gameTopbarHtml(){
  let hearts = '';
  for(let i= 0;
  i<3;
  i++) hearts += `<span class="heart ${i>=gameLives? 'lost': ''}
">\u2665</span>`;
return `
    <div class="game-lives">${hearts}
</div>
    <span class="game-score">Punkte: ${gameScore}
</span>
    <span class="game-streak">Serie: ${gameStreak}
</span>
  `;
}
function renderGame(){
  const wrap = document.getElementById('game-content');
  if(!wrap) return;
  if(gameCards.length < 2){
    wrap.innerHTML = '<div class="empty"><span class="emoji">\u{1F3AE}</span>Du brauchst mindestens 2 Karteikarten mit Begriff und Bedeutung in dieser Kategorie, um zu spielen.</div>';
    return;
  }
  if(gameOver){
    const isNew = gameScore === gameHighscore && gameScore > 0;
    wrap.innerHTML = `
      <div class="game-over">
        <div class="big-num">${gameScore}
  </div>
        <p>Punkte erreicht</p>
        <div class="game-high ${isNew? 'new': ''}
">${isNew ? 'Neuer Rekord!' : 'Rekord: ' + gameHighscore + ' Punkte'}
</div>
        <div class="study-finish-actions">
          <button class="btn" onclick="startGame()">
Nochmal spielen</button>
          <button class="btn ghost" onclick="setFcMode('manage')">
Fertig</button>
        </div>
      </div>
    `;
return;
}
wrap.innerHTML = `
    <div class="game-topbar" id="game-topbar">${gameTopbarHtml()}
</div>
    <div class="game-timerbar-track"><div class="game-timerbar-fill" id="game-timerbar-fill" style="width:100%;">
</div></div>
    <div class="game-question-card">${escapeHtml(gameQuestion.front) || '(ohne Begriff)'}
</div>
    <div class="game-options-grid">
      ${gameOptions.map((opt, i) => `<button class="game-option-btn" data-value="${escapeHtml(opt)}
" onclick="answerGame(this.dataset.value)"><span class="game-option-num">${i+1}
</span>${escapeHtml(opt) || '(leer)'}
</button>`).join('')}
    </div>
  `;
}
function startStudySession(indices){
  const now = Date.now();
  const sorted = [...indices].sort((a, b)=> {
    const ca = state.cards[a], cb = state.cards[b];
    const boxA = ca.box || 1, boxB = cb.box || 1;
    const dueA = (ca.dueDate === undefined || ca.dueDate === null) ? 0 : ca.dueDate;
    const dueB = (cb.dueDate === undefined || cb.dueDate === null) ? 0 : cb.dueDate;
    const isDueA = dueA <= now ? 1 : 0;
    const isDueB = dueB <= now ? 1 : 0;
    if(isDueA !== isDueB) return isDueB - isDueA;
    if(boxA !== boxB) return boxA - boxB;
    return Math.random() - 0.5;
  }
  );
  studyOrder = sorted;
  studyIndex = 0;
  flipped = false;
  studyResults = {
  }
  ;
  studyFinished = false;
  renderStudy();
}
function countResults(){
  let correct = 0, wrong = 0;
  const seen = new Set();
  studyOrder.forEach(idx=> {
    const c = state.cards[idx];
    if(!c || seen.has(c.id)) return;
    seen.add(c.id);
    if(studyResults[c.id] === 'correct') correct++;
    else if(studyResults[c.id] === 'wrong') wrong++;
  }
  );
  return {
    correct, wrong}
  ;
}
async function markCard(result){
  if(studyFinished||!studyOrder.length) return;
  const cardIndex=studyOrder[studyIndex];
  const card=state.cards[cardIndex];
  if(!card) return;
  studyResults[card.id]=result;
  card.box=card.box||1;
  card.box=result==='correct'?Math.min(5,card.box+1):1;
  card.dueDate=leitnerNextDue(card.box);
  await save('lernraum_flashcards',state.cards);
  stats.cardsAnswered++;await saveStats();
  flipped=false;
  studyIndex+=1;
  if(studyIndex>=studyOrder.length) studyFinished=true;
  renderStudy();
}
function studyBack(){
  if(studyIndex === 0) return;
  flipped = false;
  studyIndex--;
  renderStudy();
}
function renderStudyFinish(){
  const wrap=document.getElementById('study-content');
  const {correct,wrong}=countResults();
  const total=correct+wrong;
  wrap.innerHTML=`<div class="study-finish"><div class="big-num">${correct}<span class="of"> / ${total}</span></div><p>${correct} richtig · ${wrong} falsch</p><div class="study-finish-actions">${wrong?'<button class="btn" onclick="repeatWrongCards()">Falsche üben</button>':''}<button class="btn ghost" onclick="startStudySession(getFilteredCardIndices())">Alle üben</button><button class="btn ghost" onclick="setFcMode('manage')">Fertig</button></div></div>`;
}
function repeatWrongCards(){
  const wrongIds = studyOrder.filter(idx => state.cards[idx] && studyResults[state.cards[idx].id] === 'wrong').map(idx => state.cards[idx].id);
  const indices = state.cards.map((c, i)=> i).filter(i => wrongIds.includes(state.cards[i].id));
  startStudySession(indices);
}
function flipCard(){
  flipped = !flipped;
  document.getElementById('flip-card').classList.toggle('flipped');
}
function shuffleStudy(){
  for(let i= studyOrder.length-1;
  i>0;
  i--){
    const j = Math.floor(Math.random()* (i+1));
    [studyOrder[i], studyOrder[j]] = [studyOrder[j], studyOrder[i]];
  }
  studyIndex = 0;
  flipped = false;
  renderStudy();
}
document.addEventListener('keydown', (e)=> {
  const tag = (e.target && e.target.tagName) || '';
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const cardsView = document.getElementById('view-cards');
  if(!cardsView || !cardsView.classList.contains('active')) return;
  if(fcMode === 'study' && !studyFinished && studyOrder.length){
    if(e.code === 'Space'){
      e.preventDefault();
      flipCard();
    }
    else if(e.code === 'ArrowRight'){
      e.preventDefault();
      markCard('correct');
    }
    else if(e.code === 'ArrowLeft'){
      e.preventDefault();
      markCard('wrong');
    }
    else if(e.code === 'ArrowUp'){
      e.preventDefault();
      studyBack();
    }
    return;
  }
  if(fcMode === 'game' && !gameOver && gameQuestion && !gameAnswered){
    const num = parseInt(e.key, 10);
    if(num >= 1 && num <= gameOptions.length){
      e.preventDefault();
      answerGame(gameOptions[num-1]);
    }
  }
}
);
function renderDocFolderChips(){
  const wrap = document.getElementById('doc-folder-chips');
  const chips = [{
    id: 'alle', name: 'Alle'}
  , ...state.docFolders];
  wrap.innerHTML = chips.map(f => `
    <button class="folder-chip ${docFolderFilter===f.id? 'active': ''}
" onclick="setDocFolderFilter('${f.id}
')">
      ${escapeHtml(f.name)}
${(f.id!=='alle' && f.id!=='ohne') ? `<span class="del-x" onclick="event.stopPropagation(); deleteDocFolder('${f.id}
')">\u2715</span>` : ''}
    </button>`).join('');
}
function setDocFolderFilter(id){
  docFolderFilter = id;
  renderDocFolderChips();
  renderDocList();
}
async function addDocFolder(){
  const input = document.getElementById('doc-folder-input');
  const name = input.value.trim();
  if(!name) return;
  state.docFolders.push({
    id: uid(), name}
  );
  await save('lernraum_doc_folders', state.docFolders);
  input.value = '';
  await saveStats();
  renderDocFolderChips();
}
async function deleteDocFolder(id){
  state.docFolders = state.docFolders.filter(f=> f.id!==id);
  state.docs.forEach(d=> {
    if(d.folderId===id) d.folderId = null;
  }
  );
  await save('lernraum_doc_folders', state.docFolders);
  await save('lernraum_docs_index', state.docs);
  if(docFolderFilter===id) docFolderFilter = 'alle';
  renderDocFolderChips();
  renderDocList();
}
function getFilteredDocs(){
  const q=(window.lrDocSearchQuery||'').trim().toLowerCase();
  return state.docs.filter(doc=>{
    const folderOk=docFolderFilter==='alle'?true:docFolderFilter==='ohne'?!doc.folderId:doc.folderId===docFolderFilter;
    const searchOk=!q||(doc.name||'').toLowerCase().includes(q);
    return folderOk&&searchOk;
  });
}
function fmtBytes(n){
  if(n < 1024) return n + ' B';
  if(n < 1024* 1024) return (n/ 1024).toFixed(0) + ' KB';
  return (n/ 1024/ 1024).toFixed(1) + ' MB';
}
function fileExtTag(name){
  const parts = name.split('.');
  return (parts.length > 1 ? parts.pop() : '?').toUpperCase().slice(0, 4);
}
async function updateDocFolder(id, folderId){
  const d = state.docs.find(x=> x.id===id);
  if(d){
    d.folderId = folderId;
    await save('lernraum_docs_index', state.docs);
  }
}
async function init(){
  state.notes = await safeGet('lernraum_notes', []);
  state.todos = await safeGet('lernraum_todos', []);
  state.events = await safeGet('lernraum_events', []);
  state.cards = await safeGet('lernraum_flashcards', []);
  state.cardFolders = await safeGet('lernraum_card_folders', []);
  state.docFolders = await safeGet('lernraum_doc_folders', []);
  state.docs = await safeGet('lernraum_docs_index', []);
  state.noteFolders = await safeGet('lernraum_note_folders', []);
  modules = await safeGet('lernraum_modules', []);
  if(!Array.isArray(modules)) modules = [];
  loadTaskUi();
  state.todos.forEach(normalizeTask);
  selectedNoteId = state.notes[0]?.id || null;
  gameHighscore = await safeGet('lernraum_game_highscore', 0);
  stats = await safeGet('lernraum_stats', defaultStats());
  initCalendar();
  renderDashboard();
  renderNoteFolderChips();
  renderNotesList();
  renderTodos();
  renderModules();
  renderCalendar();
  renderFlashcards();
  renderDocFolderChips();
  renderDocList();
  document.querySelectorAll('.fc-mode-btn-item').forEach(b=> b.classList.toggle('active',
  b.dataset.mode==='manage'));
  renderLernuhr();
}
(function(){
  const FOCUS_VIEWS = ['notes', 'cards', 'docs'];
  let focusMode = false;
  const style = document.createElement('style');
  style.textContent = `
    .focus-toggle-btn{
      display:flex; align-items:center; justify-content:center; gap:8px;
      width:100%; margin-top:14px; padding:10px 12px;
      background:var(--bg-soft); border:1px solid var(--line); border-radius:12px;
      color:var(--ink-soft); font-weight:700; font-size:12.5px; cursor:pointer;
      font-family:'Karla', sans-serif;
      transition:background .15s ease, color .15s ease, border-color .15s ease;
    }
    .focus-toggle-btn:hover{ background:var(--surface); color:var(--ink); }
    .focus-toggle-btn.active{
      background:var(--sage); color:#fff; border-color:var(--sage);
    }
    .focus-toggle-btn .ico{ width:16px; height:16px; flex-shrink:0; }
    .nav-item.focus-hidden{ display:none !important; }
  `;
  document.head.appendChild(style);
  const lernuhr = document.getElementById('lernuhr-widget');
  const btn = document.createElement('button');
  btn.className = 'focus-toggle-btn';
  btn.innerHTML = `
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>
    </svg>
    <span id="focus-toggle-label">
Fokus-Modus</span>
  `;
  btn.onclick = toggleFocusMode;
  if (lernuhr && lernuhr.parentNode) {
    lernuhr.parentNode.insertBefore(btn, lernuhr.nextSibling);
  }
  else {
    document.querySelector('.sidebar').appendChild(btn);
  }
  function toggleFocusMode(){
    focusMode = !focusMode;
    applyFocusMode();
  }
  function applyFocusMode(){
    document.querySelectorAll('.nav-item').forEach(item=> {
      const isFocusView = FOCUS_VIEWS.includes(item.dataset.view);
      item.classList.toggle('focus-hidden', focusMode && !isFocusView);
    }
    );
    btn.classList.toggle('active', focusMode);
    document.getElementById('focus-toggle-label').textContent = 
    focusMode ? 'Fokus-Modus beenden' : 'Fokus-Modus';
    if(focusMode){
      const activeItem = document.querySelector('.nav-item.active');
      const activeView = activeItem ? activeItem.dataset.view : null;
      if(!FOCUS_VIEWS.includes(activeView)){
        activateView('cards');
      }
    }
  }
}
)();
const MAX_INDEXED_DOC_BYTES = 100 * 1024 * 1024;
let learningHistory = [];
let studyPlans = [];
let lrEditingPlanId = null;
let showTrash = false;
let editingEventId = null;
let pomodoroRounds = 0;
let currentPomodoroMode = 'focus';
let sessionStartedAt = null;
function notify(message, type= 'ok'){
  const wrap= document.getElementById('toast-wrap');
  if(!wrap) return;
  const el= document.createElement('div');
  el.className= 'toast '+type;
  el.textContent= message;
  wrap.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=> {
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 250);
  }
  , 2800);
}
function confirmAction(message){
  return Promise.resolve(window.confirm(message));
}
function openModal(html){
  const b= document.getElementById('modal-backdrop'), m= document.getElementById('app-modal');
  m.innerHTML= html;
  b.hidden= false;
}
function closeModal(){
  document.getElementById('modal-backdrop').hidden= true;
  document.getElementById('app-modal').innerHTML= '';
}
function closeModalFromBackdrop(e){
  if(e.target.id==='modal-backdrop') closeModal();
}
function openDocDb(){
  return new Promise((resolve, reject)=> {
    const req= indexedDB.open('lernraum_files', 1);
    req.onupgradeneeded= ()=> {
      const db= req.result;
      if(!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    }
    ;
    req.onsuccess= ()=> resolve(req.result);
    req.onerror= ()=> reject(req.error);
  }
  );
}
async function idbPutFile(id, file){
  const db= await openDocDb();
  return new Promise((res, rej)=> {
    const tx= db.transaction('files', 'readwrite');
    tx.objectStore('files').put(file, id);
    tx.oncomplete= ()=> res();
    tx.onerror= ()=> rej(tx.error);
  }
  );
}
async function idbGetFile(id){
  const db= await openDocDb();
  return new Promise((res, rej)=> {
    const r= db.transaction('files').objectStore('files').get(id);
    r.onsuccess= ()=> res(r.result);
    r.onerror= ()=> rej(r.error);
  }
  );
}
async function idbDeleteFile(id){
  const db= await openDocDb();
  return new Promise((res, rej)=> {
    const tx= db.transaction('files', 'readwrite');
    tx.objectStore('files').delete(id);
    tx.oncomplete= ()=> res();
    tx.onerror= ()=> rej(tx.error);
  }
  );
}
async function migrateLegacyDocs(){
  for(const d of state.docs){
    if(d.storage==='idb') continue;
    try{
      const old= await window.storage.get('doc:'+d.id, false);
      if(old?.value){
        const blob= await (await fetch(old.value)).blob();
        await idbPutFile(d.id, blob);
        d.storage= 'idb';
        await window.storage.delete('doc:'+d.id, false);
      }
    }
    catch(e){
      console.warn('Migration \u00FCbersprungen', d.name, e);
    }
  }
  await save('lernraum_docs_index', state.docs);
}
async function handleDocUpload(evt){
  const files= [...evt.target.files];
  evt.target.value= '';
  if(!files.length) return;
  for(const file of files){
    if(file.size>MAX_INDEXED_DOC_BYTES){
      notify(file.name+' ist gr\u00F6\u00DFer als 100 MB.', 'error');
      continue;
    }
    const id= uid();
    try{
      await idbPutFile(id, file);
      state.docs.push({
        id, name: file.name, size: file.size, mime: file.type, folderId: (docFolderFilter!=='alle'&& docFolderFilter!=='ohne')? docFolderFilter: null,
        added: Date.now(), storage: 'idb'}
      );
      notify(file.name+' gespeichert.');
    }
    catch(e){
      notify('Datei konnte nicht gespeichert werden.', 'error');
    }
  }
  await save('lernraum_docs_index', state.docs);
  renderDocList();
  updateStorageMeter();
}
async function downloadDoc(id){
  const meta= state.docs.find(x=> x.id===id);
  if(!meta)return;
  try{
    const blob= await idbGetFile(id);
    if(!blob)throw 0;
    const url= URL.createObjectURL(blob);
    const a= document.createElement('a');
    a.href= url;
    a.download= meta.name;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  }
  catch(e){
    notify('Datei nicht gefunden.', 'error');
  }
}
async function openDoc(id){
  const meta= state.docs.find(x=> x.id===id);
  if(!meta)return;
  try{
    const blob= await idbGetFile(id);
    const url= URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(()=> URL.revokeObjectURL(url), 60000);
  }
  catch(e){
    notify('Vorschau nicht m\u00F6glich.', 'error');
  }
}
async function deleteDoc(id){
  if(!(await confirmAction('Diese Unterlage wirklich l\u00F6schen?')))return;
  await idbDeleteFile(id).catch(()=> {
  }
  );
  state.docs= state.docs.filter(d=> d.id!==id);
  await save('lernraum_docs_index', state.docs);
  renderDocList();
  updateStorageMeter();
}
function renderDocList(){
  const wrap = document.getElementById('doc-list');
  if(!wrap) return;
  const query = String(window.lrDocSearchQuery || '').trim().toLowerCase();
  const docs = getFilteredDocs()
    .filter(doc => !query || String(doc.name || '').toLowerCase().includes(query))
    .sort((a, b) => b.added - a.added);
  if(!docs.length){
    wrap.innerHTML = '<div class="empty"><span class="emoji">📁</span>Keine Unterlagen gefunden.</div>';
    return;
  }
  const icons = {
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>`
  };
  wrap.innerHTML = docs.map(doc => {
    const folder = state.docFolders.find(f => f.id === doc.folderId);
    return `
      <div class="doc-row lr-doc-final-row">
        <div class="doc-icon">${fileExtTag(doc.name)}</div>
        <div class="lr-doc-info">
          <div class="doc-name">${escapeHtml(doc.name)}</div>
          <div class="doc-meta">
            ${fmtBytes(doc.size)} · ${new Date(doc.added).toLocaleDateString('de-DE')}${folder ? ' · ' + escapeHtml(folder.name) : ''}
          </div>
        </div>
        <select
          class="lr-doc-category"
          onchange="updateDocFolder('${doc.id}', this.value || null)"
          title="Kategorie"
          aria-label="Kategorie"
        >
          <option value="">Kategorie</option>
          ${state.docFolders.map(f => `
            <option value="${f.id}" ${doc.folderId === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>
          `).join('')}
        </select>
        <div class="lr-doc-actions">
          <button type="button" class="lr-doc-action-btn" onclick="openDoc('${doc.id}')" title="Ansehen" aria-label="Ansehen">${icons.eye}</button>
          <button type="button" class="lr-doc-action-btn" onclick="downloadDoc('${doc.id}')" title="Herunterladen" aria-label="Herunterladen">${icons.download}</button>
          <button type="button" class="lr-doc-action-btn" onclick="renameDoc('${doc.id}')" title="Umbenennen" aria-label="Umbenennen">${icons.edit}</button>
          <button type="button" class="lr-doc-action-btn danger" onclick="deleteDoc('${doc.id}')" title="Löschen" aria-label="Löschen">${icons.trash}</button>
        </div>
      </div>
    `;
  }).join('');
}
async function updateStorageMeter(){
  const el=document.getElementById('storage-meter');
  if(el) el.style.display='none';
}
async function exportBackup(){
  const payload= {
    version: 2, created: new Date().toISOString(), data: {
      ...state, stats, learningHistory, studyPlans, gameHighscore}
    , files: []}
  ;
  for(const d of state.docs){
    try{
      const blob= await idbGetFile(d.id);
      if(blob){
        const data= await blobToDataUrl(blob);
        payload.files.push({
          id: d.id, data}
        );
      }
    }
    catch(e){
    }
  }
  downloadText(JSON.stringify(payload), 'lernraum-backup-'+todayISO()+'.json',
  'application/json');
  notify('Backup erstellt.');
}
function blobToDataUrl(blob){
  return new Promise((res, rej)=> {
    const r= new FileReader();
    r.onload= ()=> res(r.result);
    r.onerror= rej;
    r.readAsDataURL(blob);
  }
  );
}
function dataUrlToBlob(data){
  const [h, b]= data.split(',');
  const mime= (h.match(/:(.*?);/)|| [])[1]|| 'application/octet-stream';
  const bin= atob(b);
  const a= new Uint8Array(bin.length);
  for(let i= 0;
  i<bin.length;
  i++)a[i]= bin.charCodeAt(i);
  return new Blob([a], {
    type: mime}
  );
}
function downloadText(text, name, type= 'text/plain'){
  const u= URL.createObjectURL(new Blob([text], {
    type}
  ));
  const a= document.createElement('a');
  a.href= u;
  a.download= name;
  a.click();
  setTimeout(()=> URL.revokeObjectURL(u), 1000);
}
async function importBackup(evt){
  const f= evt.target.files[0];
  evt.target.value= '';
  if(!f)return;
  if(!(await confirmAction('Vorhandene Daten durch dieses Backup ersetzen?')))return;
  try{
    const p= JSON.parse(await f.text());
    if(!p.data|| !p.version)throw 0;
    Object.assign(state, p.data);
    stats= p.data.stats|| defaultStats();
    learningHistory= p.data.learningHistory|| [];
    studyPlans= p.data.studyPlans|| [];
    gameHighscore= p.data.gameHighscore|| 0;
    for(const x of p.files|| [])await idbPutFile(x.id, dataUrlToBlob(x.data));
    await persistAll();
    renderAllEnhanced();
    notify('Backup importiert.');
  }
  catch(e){
    notify('Ung\u00FCltige Backup-Datei.', 'error');
  }
}
async function persistAll(){
  await Promise.all([save('lernraum_notes', state.notes), save('lernraum_todos',
  state.todos), save('lernraum_events', state.events), save('lernraum_flashcards',
  state.cards), save('lernraum_card_folders', state.cardFolders), save('lernraum_doc_folders',
  state.docFolders), save('lernraum_docs_index', state.docs), save('lernraum_note_folders',
  state.noteFolders), save('lernraum_stats', stats), save('lernraum_learning_history',
  learningHistory), save('lernraum_study_plans', studyPlans)]);
}
function runGlobalSearch(q){
  const wrap= document.getElementById('global-search-results');
  q= q.trim().toLowerCase();
  if(!q){
    wrap.classList.remove('open');
    wrap.innerHTML= '';
    return;
  }
  const items= [];
  state.notes.filter(n=> (n.title+' '+n.content+' '+(n.tags|| '')).toLowerCase().includes(q)&& !n.deleted).slice(0,
  5).forEach(n=> items.push({
    type: 'Notiz', title: n.title|| 'Ohne Titel', view: 'notes', id: n.id}
  ));
  state.cards.filter(c=> (c.front+' '+c.back).toLowerCase().includes(q)).slice(0,
  5).forEach(c=> items.push({
    type: 'Karte', title: c.front, view: 'cards', id: c.id}
  ));
  state.todos.filter(t=> t.text.toLowerCase().includes(q)).slice(0, 5).forEach(t=> items.push({
    type: 'Aufgabe', title: t.text, view: 'todo'}
  ));
  state.events.filter(e=> e.title.toLowerCase().includes(q)).slice(0, 5).forEach(e=> items.push({
    type: 'Termin', title: e.title+' \u00B7 '+e.date, view: 'calendar', date: e.date}
  ));
  state.docs.filter(d=> d.name.toLowerCase().includes(q)).slice(0, 5).forEach(d=> items.push({
    type: 'Unterlage', title: d.name, view: 'docs'}
  ));
  wrap.innerHTML= items.length? items.slice(0, 12).map((x, i)=> `<button onclick='openSearchResult(${JSON.stringify(JSON.stringify(x))}
)'><span>${x.type}
</span>${escapeHtml(x.title)}
</button>`).join(''): '<div class="search-empty">Keine Treffer</div>';
wrap.classList.add('open');
}
function openSearchResult(raw){
  const x= JSON.parse(raw);
  document.getElementById('global-search').value= '';
  runGlobalSearch('');
  activateView(x.view);
  if(x.view==='notes'&& x.id){
    selectedNoteId= x.id;
    renderNotesList();
  }
  if(x.view==='calendar'&& x.date)goToCalendarDay(x.date);
}
function getFilteredNotes(q=''){
  q=(q||'').toLowerCase();
  return state.notes.filter(note=>{
    if(!!note.deleted!==!!showTrash) return false;
    const hay=((note.title||'')+' '+(note.content||'')).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(noteFolderFilter==='alle') return true;
    if(noteFolderFilter==='ohne') return !note.folderId;
    return note.folderId===noteFolderFilter;
  });
}
function renderNotesList(){
  const q=(document.getElementById('note-search')?.value||'').trim().toLowerCase();
  const wrap=document.getElementById('notes-list');
  if(!wrap) return;
  const notes=getFilteredNotes(q).sort((a,b)=>(b.favorite?1:0)-(a.favorite?1:0)||(b.updated||0)-(a.updated||0));
  wrap.innerHTML=notes.length?notes.map(note=>`<button type="button" class="note-item ${note.id===selectedNoteId?'active':''}" data-note-id="${note.id}" style="width:100%;text-align:left;font-family:inherit;color:inherit"><h4>${note.favorite?'★ ':''}${escapeHtml(note.title||'Ohne Titel')}</h4><p>${escapeHtml(note.content||'Kein Inhalt').slice(0,70)}</p></button>`).join(''):`<div class="empty"><span class="emoji">${showTrash?'🗑':'🗒'}</span>${showTrash?'Papierkorb ist leer.':'Noch keine Notizen.'}</div>`;
  wrap.querySelectorAll('[data-note-id]').forEach(btn=>btn.addEventListener('click',()=>{selectedNoteId=btn.dataset.noteId;renderNotesList();}));
  renderNoteEditor();
}
function renderNoteEditor(){
  const wrap=document.getElementById('note-editor-wrap');
  if(!wrap) return;
  const note=state.notes.find(item=>item.id===selectedNoteId);
  if(!note){
    wrap.innerHTML=`<div class="empty"><span class="emoji">${showTrash?'🗑':'✎'}</span>${showTrash?'Wähle eine gelöschte Notiz aus.':'Wähle links eine Notiz aus oder erstelle eine neue.'}</div>`;
    return;
  }
  if(note.deleted){
    wrap.innerHTML=`<div class="note-toolbar"><span class="note-meta">Gelöschte Notiz</span></div><input class="note-title-input" value="${escapeHtml(note.title||'')}" disabled><textarea disabled style="width:100%;min-height:390px;resize:none;line-height:1.6">${escapeHtml(note.content||'')}</textarea><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn ghost" onclick="restoreNote('${note.id}')">Wiederherstellen</button><button class="btn danger" onclick="permanentlyDeleteNote('${note.id}')">Endgültig löschen</button></div>`;
    return;
  }
  wrap.innerHTML=`<div class="note-toolbar"><span class="note-meta">${note.updated?'Zuletzt gespeichert: '+new Date(note.updated).toLocaleString('de-DE'):'Neue Notiz'}</span><button type="button" id="note-favorite-btn" class="icon-btn favorite-btn ${note.favorite?'active':''}" title="Favorit">${note.favorite?'★':'☆'}</button><select id="note-folder-select" class="note-folder-select"><option value="">Ohne Kategorie</option>${state.noteFolders.map(f=>`<option value="${f.id}" ${note.folderId===f.id?'selected':''}>${escapeHtml(f.name)}</option>`).join('')}</select><button type="button" class="btn danger small" id="note-delete-btn">Löschen</button></div><input type="text" class="note-title-input" id="note-title" value="${escapeHtml(note.title||'')}" placeholder="Titel"><textarea id="note-content" placeholder="Schreib deine Notizen …" style="width:100%;min-height:390px;resize:vertical;line-height:1.6"></textarea><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="btn ghost" id="note-cancel-btn">Abbrechen</button><button type="button" class="btn" id="note-save-btn">Speichern</button></div>`;
  document.getElementById('note-content').value=note.content||'';
  const capture=()=>{note.title=document.getElementById('note-title')?.value.trim()||'';note.content=document.getElementById('note-content')?.value||'';note.folderId=document.getElementById('note-folder-select')?.value||null;};
  document.getElementById('note-favorite-btn')?.addEventListener('click',async()=>{capture();note.favorite=!note.favorite;note.updated=Date.now();await save('lernraum_notes',state.notes);renderNotesList();});
  document.getElementById('note-delete-btn')?.addEventListener('click',()=>deleteNote(note.id));
  document.getElementById('note-cancel-btn')?.addEventListener('click',()=>{selectedNoteId=null;renderNotesList();});
  document.getElementById('note-save-btn')?.addEventListener('click',async()=>{capture();if(!note.title&&!note.content.trim()){document.getElementById('note-title')?.focus();return;}note.updated=Date.now();await save('lernraum_notes',state.notes);selectedNoteId=null;renderNotesList();renderDashboard();if(typeof notify==='function')notify('Notiz gespeichert.');});
}
async function toggleNoteFavorite(id){
  const note=state.notes.find(item=>item.id===id);if(!note)return;note.favorite=!note.favorite;note.updated=Date.now();await save('lernraum_notes',state.notes);renderNotesList();
}
async function deleteNote(id){
  const note=state.notes.find(item=>item.id===id); if(!note) return;
  if(!window.confirm('Notiz in den Papierkorb verschieben?')) return;
  note.deleted=true;note.deletedAt=Date.now();note.updated=Date.now();selectedNoteId=null;
  await save('lernraum_notes',state.notes);showTrash=false;renderNotesList();renderDashboard();if(typeof renderModules==='function')renderModules();if(typeof notify==='function')notify('Notiz in den Papierkorb verschoben.');
}
async function restoreNote(id){
  const note=state.notes.find(item=>item.id===id);if(!note)return;note.deleted=false;note.deletedAt=null;note.updated=Date.now();await save('lernraum_notes',state.notes);showTrash=false;selectedNoteId=id;renderNotesList();if(typeof notify==='function')notify('Notiz wiederhergestellt.');
}
async function permanentlyDeleteNote(id){
  const note=state.notes.find(item=>item.id===id);if(!note)return;if(!window.confirm('Notiz endgültig löschen?'))return;state.notes=state.notes.filter(item=>item.id!==id);selectedNoteId=null;await save('lernraum_notes',state.notes);renderNotesList();if(typeof notify==='function')notify('Notiz endgültig gelöscht.');
}
function dueCardIndices(){
  const now= Date.now();
  return getFilteredCardIndices().filter(i=> (state.cards[i].dueDate?? 0)<=now);
}
function updateDueCardIndicators(){
  const n = state.cards.filter(c => (c.dueDate ?? 0) <= Date.now()).length;
  const dashboardCount = document.getElementById('dash-due-cards');
  if(dashboardCount){
    dashboardCount.textContent = n + (n === 1 ? ' Karteikarte wartet' : ' Karteikarten warten');
  }
}
function openDueCards(){
  activateView('cards');
  fcFolderFilter= 'alle';
  setFcMode('study');
  startStudySession(dueCardIndices());
}
function renderStudy(){
  const wrap=document.getElementById('study-content');
  if(!wrap) return;
  if(studyFinished){renderStudyFinish();return;}
  if(!studyOrder.length){renderStudySetup();return;}
  if(studyIndex<0)studyIndex=0;
  if(studyIndex>=studyOrder.length){studyFinished=true;renderStudyFinish();return;}
  const card=state.cards[studyOrder[studyIndex]];
  if(!card){studyIndex++;renderStudy();return;}
  const results=countResults();
  const pct=Math.round((studyIndex/studyOrder.length)*100);
  wrap.innerHTML=`<div class="study-counter"><span class="correct">✓ Richtig: ${results.correct}</span><span class="wrong">✗ Falsch: ${results.wrong}</span><span class="study-progress">Karte ${studyIndex+1} / ${studyOrder.length}</span></div><div class="study-progress-track"><div class="study-progress-fill" style="width:${pct}%"></div></div><div class="flip-card ${flipped?'flipped':''}" id="flip-card" onclick="flipCard()"><div class="flip-inner"><div class="flip-face flip-front">${escapeHtml(card.front)||'(ohne Begriff)'}<span class="flip-hint">Umdrehen</span></div><div class="flip-face flip-back">${escapeHtml(card.back)||'(ohne Bedeutung)'}<span class="flip-hint">Antwort</span></div></div></div><div class="study-rate-row"><button class="btn wrong-btn" onclick="markCard('wrong')">✗ Falsch</button><button class="btn correct-btn" onclick="markCard('correct')">✓ Richtig</button></div><div class="study-kbd-hint"><kbd>Leertaste</kbd> Karte umdrehen · <kbd>←</kbd> falsch · <kbd>→</kbd> richtig</div>`;
}
function exportCardsCsv(){
  const rows= [['Vorderseite', 'R\u00FCckseite', 'Kategorie'], ...state.cards.map(c=> [c.front,
  c.back, state.cardFolders.find(f=> f.id===c.folderId)?.name|| ''])];
  const csv= rows.map(r=> r.map(v=> '"'+String(v|| '').replace(/"/g, '""')+'"').join(';')).join('\n');
  downloadText('\ufeff'+csv, 'lernraum-karteikarten.csv', 'text/csv;charset=utf-8');
}
async function importCardsCsv(evt){
  const f= evt.target.files[0];
  evt.target.value= '';
  if(!f)return;
  const lines= (await f.text()).split(/\r?\n/).filter(Boolean);
  let added= 0;
  for(const line of lines.slice(1)){
    const cols= parseCsvLine(line);
    if(!cols[0]&& !cols[1])continue;
    let folderId= null;
    if(cols[2]){
      let folder= state.cardFolders.find(x=> x.name===cols[2]);
      if(!folder){
        folder= {
          id: uid(), name: cols[2]}
        ;
        state.cardFolders.push(folder);
      }
      folderId= folder.id;
    }
    state.cards.push({
      id: uid(), front: cols[0]|| '', back: cols[1]|| '', folderId, box: 1,
      dueDate: Date.now()}
    );
    added++;
  }
  await save('lernraum_flashcards', state.cards);
  await save('lernraum_card_folders', state.cardFolders);
  renderFlashcards();
  notify(added+' Karten importiert.');
}
function parseCsvLine(line){
  const out= [];
  let cur= '', q= false;
  for(let i= 0;
  i<line.length;
  i++){
    const c= line[i];
    if(c==='"'&& line[i+1]==='"'){
      cur+='"';
      i++;
    }
    else if(c==='"')q= !q;
    else if(c===';'&& !q){
      out.push(cur);
      cur= '';
    }
    else cur+=c;
  }
  out.push(cur);
  return out;
}
function renderDayPanel(){
  const d= new Date(selectedDate+'T00:00:00');
  document.getElementById('day-panel-title').textContent= d.toLocaleDateString('de-DE',
  {
    weekday: 'long', day: 'numeric', month: 'long'}
  );
  const dateInput= document.getElementById('event-date');
  if(dateInput)dateInput.value= selectedDate;
  const evts= state.events.filter(e=> e.date===selectedDate).sort((a, b)=> (a.time|| '').localeCompare(b.time|| ''));
  const wrap= document.getElementById('day-events');
  wrap.innerHTML= evts.length? evts.map(e=> `<div class="event-row"><span class="time">${e.time|| 'ganzt\u00E4gig'}
${e.endTime? '\u2013'+e.endTime: ''}
</span><span class="txt"><strong>${escapeHtml(e.title)}
</strong>${e.location? `<small>${escapeHtml(e.location)}
</small>`: ''}
</span><span class="evt-type-tag ${e.type|| 'termin'}
">${EVENT_TYPE_LABELS[e.type]|| 'Termin'}
</span><button class="icon-btn" onclick="editEvent('${e.id}
')" title="Bearbeiten">\u270E</button><button class="icon-btn" onclick="deleteEvent('${e.id}
')">\u2715</button></div>`).join(''): '<div class="day-events-empty">Keine Termine an diesem Tag.</div>';
}
function editEvent(id){
  const e= state.events.find(x=> x.id===id);
  if(!e)return;
  editingEventId= id;
  const [h= '', m= '']= (e.time|| '').split(':');
  document.getElementById('event-date').value= e.date;
  document.getElementById('event-time-hour').value= h;
  document.getElementById('event-time-minute').value= m;
  document.getElementById('event-title').value= e.title;
  document.getElementById('event-type').value= e.type|| 'termin';
  openModal(`<h2>Termin bearbeiten</h2><div class="modal-form"><label>Endzeit<input id="edit-end-time" type="time" value="${e.endTime|| ''}
"></label><label>Ort<input id="edit-location" type="text" value="${escapeHtml(e.location|| '')}
"></label><label>Beschreibung<textarea id="edit-description">${escapeHtml(e.description|| '')}
</textarea></label><label>Erinnerung<select id="edit-reminder"><option value="0">
Keine</option><option value="10" ${e.reminder==10? 'selected': ''}
>10 Minuten vorher</option><option value="30" ${e.reminder==30? 'selected': ''}
>30 Minuten vorher</option><option value="60" ${e.reminder==60? 'selected': ''}
>1 Stunde vorher</option><option value="1440" ${e.reminder==1440? 'selected': ''}
>1 Tag vorher</option></select></label><div class="modal-actions"><button class="btn ghost" onclick="closeModal()">
Abbrechen</button><button class="btn" onclick="saveEventEdit()">Speichern</button>
</div></div>`);
}
async function saveEventEdit(){
  const e= state.events.find(x=> x.id===editingEventId);
  if(!e)return;
  e.date= document.getElementById('event-date').value;
  e.time= getEventTime();
  e.title= document.getElementById('event-title').value.trim();
  e.type= document.getElementById('event-type').value;
  e.endTime= document.getElementById('edit-end-time').value;
  e.location= document.getElementById('edit-location').value.trim();
  e.description= document.getElementById('edit-description').value.trim();
  e.reminder= Number(document.getElementById('edit-reminder').value);
  await save('lernraum_events', state.events);
  editingEventId= null;
  closeModal();
  renderCalendar();
  renderDashboard();
  notify('Termin aktualisiert.');
}
function localDateKey(ts= Date.now()){
  const d= new Date(ts);
  return `${d.getFullYear()}
-${String(d.getMonth()+1).padStart(2, '0')}
-${String(d.getDate()).padStart(2, '0')}
`;
}
async function logLearningSession(seconds, subject= 'Allgemein', kind= 'focus'){
  if(seconds<10)return;
  learningHistory.push({
    id: uid(), date: localDateKey(), started: sessionStartedAt|| Date.now()-seconds* 1000,
    seconds, subject: subject.trim()|| 'Allgemein', kind}
  );
  await save('lernraum_learning_history', learningHistory);
  renderDashboardEnhancements();
}
function setPomodoroMode(mode){
  currentPomodoroMode= mode;
  const mins= {
    focus: 25, short: 5, long: 15, custom: 30}
  [mode];
  setLernuhrPreset(mins);
}
const originalStartLernuhr= startLernuhr;
startLernuhr= function(){
  if(!lernuhrRunning)sessionStartedAt= Date.now();
  originalStartLernuhr();
}
;
const originalPauseLernuhr= pauseLernuhr;
pauseLernuhr= function(){
  const was= lernuhrRunning, elapsed= sessionStartedAt? Math.floor((Date.now()-sessionStartedAt)/ 1000): 0;
  originalPauseLernuhr();
  if(was&& elapsed>=10){
    logLearningSession(elapsed, document.getElementById('pomodoro-subject')?.value|| 'Allgemein',
    currentPomodoroMode);
    sessionStartedAt= null;
  }
}
;
function renderLearningStats(){
  const grid = document.getElementById('learning-stat-grid');
  if(!grid) return;
  const total = learningHistory.reduce((sum, item) => sum + item.seconds, 0);
  const week = historyLastDays(7).reduce((sum, item) => sum + item.seconds, 0);
  const today = learningHistory
    .filter(item => item.date === todayISO())
    .reduce((sum, item) => sum + item.seconds, 0);
  grid.innerHTML = [
    ['Heute', fmtDuration(today)],
    ['Diese Woche', fmtDuration(week)],
    ['Gesamt', fmtDuration(total)]
  ].map(item => `<div class="stat-card"><div class="stat-num">${item[1]}</div><div class="stat-label">${item[0]}</div></div>`).join('');
  renderWeekChart('stats-week-chart', 7);
  const subjects = {};
  learningHistory.forEach(item => {
    subjects[item.subject] = (subjects[item.subject] || 0) + item.seconds;
  });
  const subjectsWrap = document.getElementById('stats-subjects');
  if(subjectsWrap){
    subjectsWrap.innerHTML = Object.entries(subjects)
      .sort((a, b) => b[1] - a[1])
      .map(([name, seconds]) => `<div class="subject-row"><span>${escapeHtml(name)}</span><strong>${fmtDuration(seconds)}</strong></div>`)
      .join('') || '<div class="empty compact">Noch keine Lernsitzungen.</div>';
  }
}
function historyLastDays(n){
  const cutoff= new Date();
  cutoff.setDate(cutoff.getDate()-n+1);
  cutoff.setHours(0, 0, 0, 0);
  return learningHistory.filter(x=> new Date(x.date+'T00:00:00')>=cutoff);
}
function fmtDuration(sec){
  const h= Math.floor(sec/ 3600), m= Math.floor((sec% 3600)/ 60);
  return h? `${h}
h ${m}
m`: `${m}
 Min.`;
}
function renderWeekChart(id, n= 7){
  const el= document.getElementById(id);
  if(!el)return;
  const vals= [];
  for(let i= n-1;
  i>=0;
  i--){
    const d= new Date();
    d.setDate(d.getDate()-i);
    const key= localDateKey(d.getTime());
    vals.push({
      label: d.toLocaleDateString('de-DE', {
        weekday: 'short'}
      ), seconds: learningHistory.filter(x=> x.date===key).reduce((s, x)=> s+x.seconds,
      0)}
    );
  }
  const max= Math.max(1, ...vals.map(x=> x.seconds));
  el.innerHTML= vals.map(x=> `<div class="week-bar"><div class="week-bar-value">${Math.round(x.seconds/ 60)}
</div><div class="week-bar-track"><div style="height:${Math.max(3, x.seconds/ max* 100)}
%"></div></div><span>${x.label}
</span></div>`).join('');
}
async function resetLearningHistory(){
  if(!(await confirmAction('Lernverlauf wirklich zur\u00FCcksetzen?')))return;
  learningHistory= [];
  await save('lernraum_learning_history', learningHistory);
  renderLearningStats();
  renderDashboardEnhancements();
}
function normalizeManualStudyPlans(){
  if(!Array.isArray(studyPlans)) studyPlans = [];
  const migrated = [];
  let changed = false;
  studyPlans.forEach(item => {
    if(item && Array.isArray(item.tasks)){
      changed = true;
      item.tasks.forEach(task => {
        migrated.push({
          id: task.id || uid(),
          date: task.date || item.targetDate || todayISO(),
          title: task.title || item.title || 'Lerneinheit',
          details: '',
          duration: Number(task.minutes) || 0,
          done: false,
          createdAt: item.created || Date.now()
        });
      });
      return;
    }
    migrated.push({
      id: item.id || uid(),
      date: item.date || item.targetDate || todayISO(),
      title: item.title || 'Lerneinheit',
      details: item.details || '',
      duration: Number(item.duration || item.minutes) || 0,
      done: Boolean(item.done),
      createdAt: item.createdAt || item.created || Date.now()
    });
  });
  studyPlans = migrated;
  if(changed) save('lernraum_study_plans', studyPlans);
}
function clearStudyPlanForm(){
  const title = document.getElementById('plan-title');
  const date = document.getElementById('plan-date');
  const details = document.getElementById('plan-details');
  const duration = document.getElementById('plan-duration');
  const saveBtn = document.getElementById('plan-save-btn');
  const cancelBtn = document.getElementById('plan-cancel-edit');
  if(title) title.value = '';
  if(date) date.value = '';
  if(details) details.value = '';
  if(duration) duration.value = '';
  if(saveBtn) saveBtn.textContent = '+ Eintragen';
  if(cancelBtn) cancelBtn.hidden = true;
  lrEditingPlanId = null;
}
function cancelStudyPlanEdit(){
  clearStudyPlanForm();
}
async function createStudyPlan(){
  normalizeManualStudyPlans();
  const titleEl = document.getElementById('plan-title');
  const dateEl = document.getElementById('plan-date');
  const detailsEl = document.getElementById('plan-details');
  const durationEl = document.getElementById('plan-duration');
  const title = titleEl?.value.trim() || '';
  const date = dateEl?.value || '';
  const details = detailsEl?.value.trim() || '';
  const duration = Math.max(0, Number(durationEl?.value || 0));
  if(!date){
    notify('Bitte zuerst ein Datum auswählen.', 'error');
    dateEl?.focus();
    return;
  }
  if(!title){
    notify('Bitte eintragen, was du lernen möchtest.', 'error');
    titleEl?.focus();
    return;
  }
  if(lrEditingPlanId){
    const item = studyPlans.find(entry => entry.id === lrEditingPlanId);
    if(item){
      item.date = date;
      item.title = title;
      item.details = details;
      item.duration = duration;
      item.updatedAt = Date.now();
    }
    notify('Lerneinheit gespeichert.');
  }else{
    studyPlans.push({
      id: uid(),
      date,
      title,
      details,
      duration,
      done: false,
      createdAt: Date.now()
    });
    notify('Lerneinheit eingetragen.');
  }
  await save('lernraum_study_plans', studyPlans);
  clearStudyPlanForm();
  renderStudyPlans();
}
function editStudyPlan(id){
  normalizeManualStudyPlans();
  const item = studyPlans.find(entry => entry.id === id);
  if(!item) return;
  lrEditingPlanId = id;
  const title = document.getElementById('plan-title');
  const date = document.getElementById('plan-date');
  const details = document.getElementById('plan-details');
  const duration = document.getElementById('plan-duration');
  const saveBtn = document.getElementById('plan-save-btn');
  const cancelBtn = document.getElementById('plan-cancel-edit');
  if(title) title.value = item.title || '';
  if(date) date.value = item.date || '';
  if(details) details.value = item.details || '';
  if(duration) duration.value = item.duration || '';
  if(saveBtn) saveBtn.textContent = 'Änderungen speichern';
  if(cancelBtn) cancelBtn.hidden = false;
  title?.focus();
}
async function toggleStudyPlanEntry(id){
  normalizeManualStudyPlans();
  const item = studyPlans.find(entry => entry.id === id);
  if(!item) return;
  item.done = !item.done;
  await save('lernraum_study_plans', studyPlans);
  renderStudyPlans();
}
async function deleteStudyPlan(id){
  if(!(await confirmAction('Lerneinheit wirklich löschen?'))) return;
  studyPlans = studyPlans.filter(entry => entry.id !== id);
  if(lrEditingPlanId === id) clearStudyPlanForm();
  await save('lernraum_study_plans', studyPlans);
  renderStudyPlans();
}
function renderStudyPlans(){
  const wrap = document.getElementById('study-plan-list');
  if(!wrap) return;
  normalizeManualStudyPlans();
  const entries = studyPlans.slice().sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
    if(dateCompare) return dateCompare;
    return Number(a.createdAt || 0) - Number(b.createdAt || 0);
  });
  if(!entries.length){
    wrap.innerHTML = '<div class="planner-empty">Noch keine Lerneinheiten eingetragen.<br>Links kannst du deinen ersten Lerntag anlegen.</div>';
    return;
  }
  const grouped = new Map();
  entries.forEach(entry => {
    const key = entry.date || todayISO();
    if(!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  });
  wrap.innerHTML = [...grouped.entries()].map(([date, items]) => {
    const day = new Date(date + 'T00:00:00');
    const heading = day.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
    const year = day.getFullYear();
    return `<section class="planner-day-group">
      <div class="planner-day-title"><strong>${escapeHtml(heading)}</strong><span>${year}</span></div>
      ${items.map(item => `<div class="planner-entry ${item.done ? 'done' : ''}">
        <button class="planner-entry-check ${item.done ? 'done' : ''}" type="button" onclick="toggleStudyPlanEntry('${item.id}')" title="${item.done ? 'Als offen markieren' : 'Als erledigt markieren'}"></button>
        <div class="planner-entry-main">
          <div class="planner-entry-title">${escapeHtml(item.title)}</div>
          ${item.details ? `<div class="planner-entry-details">${escapeHtml(item.details)}</div>` : ''}
          ${item.duration ? `<div class="planner-entry-meta">ca. ${Number(item.duration)} Min.</div>` : ''}
        </div>
        <div class="planner-entry-actions">
          <button class="icon-btn" type="button" onclick="editStudyPlan('${item.id}')" title="Bearbeiten">✎</button>
          <button class="icon-btn" type="button" onclick="deleteStudyPlan('${item.id}')" title="Löschen">✕</button>
        </div>
      </div>`).join('')}
    </section>`;
  }).join('');
}
async function addPlanTasksToTodos(){
  normalizeManualStudyPlans();
  const existing = new Set(state.todos.map(todo => todo.planTaskId).filter(Boolean));
  let added = 0;
  studyPlans
    .filter(item => !item.done && item.date >= todayISO() && !existing.has(item.id))
    .forEach(item => {
      state.todos.push({
        id: uid(),
        text: item.duration ? `${item.title} (${item.duration} Min.)` : item.title,
        done: false,
        priority: 'mittel',
        dueDate: item.date,
        deadline: item.date,
        status: 'geplant',
        kind: 'Lernen',
        moduleId: '',
        progress: 0,
        project: '',
        planTaskId: item.id,
        createdAt: Date.now()
      });
      added++;
    });
  await save('lernraum_todos', state.todos);
  renderTodos();
  renderDashboard();
  notify(added ? `${added} Einträge zu To-Do übernommen.` : 'Keine neuen offenen Einträge zum Übernehmen.');
}
function renderDashboardEnhancements(){
  updateDueCardIndicators();
  renderWeekChart('dash-week-bars', 7);
}
function updateThemeSwitch(){
  const isDark= document.documentElement.classList.contains('dark');
  const button= document.getElementById('theme-toggle');
  const label= document.getElementById('theme-switch-label');
  if(button){
    button.setAttribute('aria-pressed', String(isDark));
    button.title= isDark? 'Zum hellen Modus wechseln': 'Zum dunklen Modus wechseln';
  }
  if(label)label.textContent= isDark? 'Dunkler Modus': 'Heller Modus';
}
function toggleTheme(){
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('lernraum_theme', document.documentElement.classList.contains('dark')? 'dark': 'light');
  updateThemeSwitch();
}
function renderAllEnhanced(){
  renderDashboard();
  renderDashboardEnhancements();
  renderNotesList();
  renderTodos();
  renderModules();
  renderCalendar();
  renderFlashcards();
  renderDocFolderChips();
  renderDocList();
  renderLearningStats();
  renderStudyPlans();
  updateStorageMeter();
}
const oldActivateView= activateView;
activateView= function(view){
  oldActivateView(view);
  if(view==='stats')renderLearningStats();
  if(view==='planner')renderStudyPlans();
  if(view==='modules')renderModules();
  if(view==='todo')renderTodos();
}
;
(async function initEnhanced(){
  await init();
  learningHistory= await safeGet('lernraum_learning_history', []);
  studyPlans= await safeGet('lernraum_study_plans', []);
  normalizeManualStudyPlans();
  state.notes.forEach(n=> {
    if(n.favorite===undefined)n.favorite= false;
    if(n.deleted===undefined)n.deleted= false;
    if(n.tags===undefined)n.tags= '';
  }
  );
  state.cards.forEach(c=> {
    if(c.dueDate===undefined)c.dueDate= Date.now();
  }
  );
  await migrateLegacyDocs();
  if(localStorage.getItem('lernraum_theme')==='dark')document.documentElement.classList.add('dark');
  updateThemeSwitch();
  const fileInput= document.getElementById('doc-file-input');
  if(fileInput)fileInput.multiple= true;
  renderAllEnhanced();
}
)();
let lernraumInstallPrompt = null;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.error('Service Worker konnte nicht registriert werden:', error);
    }
    );
  }
  );
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  lernraumInstallPrompt = event;
  const button = document.getElementById('pwa-install-btn');
  if (button) button.hidden = false;
}
);
async function installLernraumApp(){
  if (!lernraumInstallPrompt) return;
  lernraumInstallPrompt.prompt();
  try {
    await lernraumInstallPrompt.userChoice;
  }
  finally {
    lernraumInstallPrompt = null;
    const button = document.getElementById('pwa-install-btn');
    if (button) button.hidden = true;
  }
}
window.addEventListener('appinstalled', () => {
  lernraumInstallPrompt = null;
  const button = document.getElementById('pwa-install-btn');
  if (button) button.hidden = true;
}
);
/* ============================================================
   LERNRAUM – EINFACHE LERNUHR
   Lernen / Pause · eigene Zeit · Start/Stop · Neustart
============================================================ */
let lernuhrSimpleMode = 'lernen';
let lernuhrSimpleMinutes = '';
let lernuhrSimpleStartedAt = null;
/* ---------- OBERFLÄCHE ---------- */
function buildSimpleLernuhr(){
  const widget = document.getElementById('lernuhr-widget');
  if(!widget) return;
  widget.innerHTML = `
    <div class="lr-simple-timer">
      <div class="lr-simple-mode">
        <button
          id="lernuhr-mode-lernen"
          class="lr-simple-mode-btn active"
          onclick="setSimpleLernuhrMode('lernen')">
          Lernen
        </button>
        <button
          id="lernuhr-mode-pause"
          class="lr-simple-mode-btn"
          onclick="setSimpleLernuhrMode('pause')">
          Pause
        </button>
      </div>
      <div class="lr-simple-time" id="lernuhr-time">
        00:00
      </div>
      <label class="lr-simple-input-label">
        Minuten
        <input
          id="lernuhr-custom-minutes"
          class="lr-simple-input"
          type="number"
          min="1"
          max="999"
          step="1"
          inputmode="numeric"
          placeholder="z. B. 45"
          oninput="simpleLernuhrMinutesChanged()">
      </label>
      <div class="lr-simple-actions">
        <button
          id="lernuhr-toggle"
          class="lr-simple-start"
          onclick="toggleLernuhr()">
          Start
        </button>
        <button
          class="lr-simple-reset"
          onclick="resetLernuhr()">
          ↻
        </button>
      </div>
    </div>
  `;
  addSimpleLernuhrStyles();
  renderLernuhr();
}
/* ---------- DESIGN ---------- */
function addSimpleLernuhrStyles(){
  if(document.getElementById('lr-simple-timer-style')) return;
  const style = document.createElement('style');
  style.id = 'lr-simple-timer-style';
  style.textContent = `
    #lernuhr-widget{
      padding:14px !important;
      height:auto !important;
    }
    .lr-simple-timer{
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:10px;
      width:100%;
    }
    .lr-simple-mode{
      display:grid;
      grid-template-columns:1fr 1fr;
      width:100%;
      padding:3px;
      gap:3px;
      border-radius:10px;
      background:var(--bg-soft);
      border:1px solid var(--line);
    }
    .lr-simple-mode-btn{
      border:0;
      background:transparent;
      color:var(--ink-soft);
      border-radius:8px;
      padding:7px 5px;
      cursor:pointer;
      font-family:'Karla',sans-serif;
      font-size:11px;
      font-weight:700;
    }
    .lr-simple-mode-btn.active{
      background:var(--sage);
      color:#fff;
    }
    .lr-simple-time{
      font-family:'IBM Plex Mono',monospace;
      font-size:25px;
      line-height:1;
      font-weight:600;
      color:var(--ink);
      margin:5px 0 2px;
      letter-spacing:-1px;
    }
    .lr-simple-input-label{
      width:100%;
      display:flex;
      flex-direction:column;
      gap:4px;
      color:var(--ink-soft);
      font-size:9px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .lr-simple-input{
      width:100%;
      box-sizing:border-box;
      border:1px solid var(--line);
      background:var(--surface);
      color:var(--ink);
      border-radius:9px;
      padding:8px 9px;
      outline:none;
      font-family:'Karla',sans-serif;
      font-size:12px;
      text-align:center;
    }
    .lr-simple-input:focus{
      border-color:var(--sage);
    }
    .lr-simple-actions{
      display:grid;
      grid-template-columns:1fr 35px;
      gap:6px;
      width:100%;
    }
    .lr-simple-start,
    .lr-simple-reset{
      border:0;
      border-radius:9px;
      cursor:pointer;
      font-family:'Karla',sans-serif;
      font-weight:700;
      min-height:34px;
    }
    .lr-simple-start{
      background:var(--sage);
      color:white;
    }
    .lr-simple-start.running{
      background:var(--terracotta);
    }
    .lr-simple-reset{
      background:var(--bg-soft);
      border:1px solid var(--line);
      color:var(--ink);
      font-size:17px;
    }
    .lr-simple-status{
      min-height:13px;
      font-size:9px;
      color:var(--ink-faint);
      text-align:center;
    }
  `;
  document.head.appendChild(style);
}
/* ---------- LERNEN / PAUSE AUSWÄHLEN ---------- */
function setSimpleLernuhrMode(mode){
  if(mode !== 'lernen' && mode !== 'pause') return;
  pauseLernuhr();
  lernuhrSimpleMode = mode;
  document
    .getElementById('lernuhr-mode-lernen')
    ?.classList.toggle('active', mode === 'lernen');
  document
    .getElementById('lernuhr-mode-pause')
    ?.classList.toggle('active', mode === 'pause');
  currentPomodoroMode = mode === 'lernen'
    ? 'focus'
    : 'break';
  applySimpleLernuhrMinutes();
  renderLernuhr();
}
/* ---------- EIGENE ZEIT ---------- */
function simpleLernuhrMinutesChanged(){
  const input = document.getElementById('lernuhr-custom-minutes');
  if(!input) return;
  lernuhrSimpleMinutes = input.value;
  if(!lernuhrRunning){
    applySimpleLernuhrMinutes();
  }
}
function applySimpleLernuhrMinutes(){
  const input = document.getElementById('lernuhr-custom-minutes');
  const minutes = Math.floor(
    Number(input?.value || lernuhrSimpleMinutes || 0)
  );
  if(!minutes || minutes < 1){
    lernuhrTotal = 0;
    lernuhrRemaining = 0;
  } else {
    lernuhrTotal = minutes * 60;
    lernuhrRemaining = lernuhrTotal;
  }
  renderLernuhr();
}
/* Alte Funktionen kompatibel halten */
setLernuhrPreset = function(min){
  const input = document.getElementById('lernuhr-custom-minutes');
  if(input){
    input.value = min || '';
  }
  lernuhrSimpleMinutes = min || '';
  pauseLernuhr();
  applySimpleLernuhrMinutes();
};
setPomodoroMode = function(mode){
  setSimpleLernuhrMode(
    mode === 'focus' ? 'lernen' : 'pause'
  );
};
/* ---------- ANZEIGE ---------- */
renderLernuhr = function(){
  const timeEl = document.getElementById('lernuhr-time');
  const toggleBtn = document.getElementById('lernuhr-toggle');
  const status = document.getElementById('lernuhr-simple-status');
  if(!timeEl || !toggleBtn) return;
  const safeRemaining = Math.max(0, lernuhrRemaining);
  const mins = Math.floor(safeRemaining / 60);
  const secs = safeRemaining % 60;
  timeEl.textContent =
    String(mins).padStart(2, '0') +
    ':' +
    String(secs).padStart(2, '0');
  toggleBtn.textContent = lernuhrRunning
    ? 'Stop'
    : 'Start';
  toggleBtn.classList.toggle(
    'running',
    lernuhrRunning
  );
  if(status){
    if(lernuhrRunning){
      status.textContent =
        lernuhrSimpleMode === 'lernen'
          ? 'Lernzeit läuft'
          : 'Pause läuft';
    }
    else if(lernuhrRemaining <= 0){
      status.textContent =
        lernuhrTotal > 0
          ? 'Fertig'
          : 'Zeit eingeben';
    }
    else{
      status.textContent =
        lernuhrSimpleMode === 'lernen'
          ? 'Bereit zum Lernen'
          : 'Bereit für Pause';
    }
  }
};
/* ---------- START / STOP ---------- */
toggleLernuhr = function(){
  if(lernuhrRunning){
    pauseLernuhr();
  } else {
    startLernuhr();
  }
};
startLernuhr = function(){
  if(lernuhrRunning) return;
  if(lernuhrRemaining <= 0){
    const input =
      document.getElementById('lernuhr-custom-minutes');
    const minutes = Math.floor(
      Number(input?.value || 0)
    );
    if(!minutes || minutes < 1){
      input?.focus();
      return;
    }
    lernuhrTotal = minutes * 60;
    lernuhrRemaining = lernuhrTotal;
  }
  lernuhrRunning = true;
  lernuhrSimpleStartedAt = Date.now();
  renderLernuhr();
  lernuhrInterval = setInterval(async () => {
    lernuhrRemaining--;
    /* Nur echte Lernzeit zählt für Statistik */
    if(lernuhrSimpleMode === 'lernen'){
      stats.lernuhrSeconds++;
      if(stats.lernuhrSeconds % 5 === 0){
        await saveStats();
        }
    }
    if(lernuhrRemaining <= 0){
      lernuhrRemaining = 0;
      const elapsed = lernuhrSimpleStartedAt
        ? Math.floor(
            (Date.now() - lernuhrSimpleStartedAt) / 1000
          )
        : 0;
      lernuhrRunning = false;
      if(lernuhrInterval){
        clearInterval(lernuhrInterval);
        lernuhrInterval = null;
      }
      if(lernuhrSimpleMode === 'lernen'){
        await saveStats();
        if(
          elapsed >= 10 &&
          typeof logLearningSession === 'function'
        ){
          await logLearningSession(
            elapsed,
            'Allgemein',
            'focus'
          );
        }
      }
      lernuhrSimpleStartedAt = null;
      renderLernuhr();
      return;
    }
    renderLernuhr();
  }, 1000);
};
pauseLernuhr = function(){
  if(!lernuhrRunning){
    renderLernuhr();
    return;
  }
  const elapsed = lernuhrSimpleStartedAt
    ? Math.floor(
        (Date.now() - lernuhrSimpleStartedAt) / 1000
      )
    : 0;
  lernuhrRunning = false;
  if(lernuhrInterval){
    clearInterval(lernuhrInterval);
    lernuhrInterval = null;
  }
  /* Gestoppte Lernzeit ebenfalls speichern */
  if(
    lernuhrSimpleMode === 'lernen' &&
    elapsed >= 10 &&
    typeof logLearningSession === 'function'
  ){
    logLearningSession(
      elapsed,
      'Allgemein',
      'focus'
    );
  }
  lernuhrSimpleStartedAt = null;
  saveStats();
  renderLernuhr();
};
/* ---------- NEUSTART ---------- */
resetLernuhr = async function(){
  lernuhrRunning = false;
  if(lernuhrInterval){
    clearInterval(lernuhrInterval);
    lernuhrInterval = null;
  }
  lernuhrSimpleStartedAt = null;
  const input =
    document.getElementById('lernuhr-custom-minutes');
  const minutes = Math.floor(
    Number(input?.value || 0)
  );
  lernuhrTotal =
    minutes > 0
      ? minutes * 60
      : 0;
  lernuhrRemaining = lernuhrTotal;
  await saveStats();
  renderLernuhr();
};
/* ---------- STARTZUSTAND ---------- */
lernuhrRunning = false;
lernuhrTotal = 0;
lernuhrRemaining = 0;
buildSimpleLernuhr();
/* ============================================================
   LERNRAUM – NEUES DASHBOARD
============================================================ */
function renderNewDashboardExtras(){
  const today = todayISO();
  const now = new Date();
  /* ---------- DATUM IM HEUTE-BEREICH ---------- */
  const todayLabel =
    document.getElementById('dash-today-label');
  if(todayLabel){
    todayLabel.textContent =
      now.toLocaleDateString(
        'de-DE',
        {
          weekday:'long',
          day:'numeric',
          month:'long'
        }
      );
  }
  /* ---------- HEUTIGE AUFGABEN ---------- */
  const todayTasks =
    state.todos
      .map(normalizeTask)
      .filter(task =>
        !task.done &&
        task.deadline === today
      );
  const todayTaskCount =
    document.getElementById(
      'dash-task-today-count'
    );
  if(todayTaskCount){
    todayTaskCount.textContent =
      `Heute (${todayTasks.length})`;
  }
  const todosToday =
    document.getElementById(
      'dash-todos-today'
    );
  if(todosToday){
    todosToday.textContent =
      todayTasks.length
        ? `${todayTasks.length} heute fällig`
        : 'Heute nichts fällig';
  }
  const todayWrap =
    document.getElementById(
      'dash-today-tasks'
    );
  if(todayWrap){
    if(!todayTasks.length){
      todayWrap.innerHTML = `
        <div
          style="
            font-size:11.5px;
            color:var(--ink-faint);
            padding:7px 0;
          "
        >
          Keine Aufgaben für heute.
        </div>
      `;
    } else {
      todayWrap.innerHTML =
        todayTasks
          .slice(0,4)
          .map(task => `
            <div class="dash-today-task">
              <button
                class="db-check"
                onclick="workspaceToggleTask('${task.id}')"
              ></button>
              <span>
                ${escapeHtml(task.text)}
              </span>
              <small>
                heute
              </small>
            </div>
          `)
          .join('');
    }
  }
  /* ---------- NÄCHSTER TERMIN ---------- */
  const upcoming =
    state.events
      .filter(event =>
        event.date >= today
      )
      .sort((a,b) =>
        (
          a.date +
          (a.time || '')
        ).localeCompare(
          b.date +
          (b.time || '')
        )
      );
  const nextDetail =
    document.getElementById(
      'dash-next-detail'
    );
  if(nextDetail){
    if(upcoming.length){
      const event =
        upcoming[0];
      nextDetail.textContent =
        `${fmtDateShort(event.date)}${
          event.time
            ? ' · ' + event.time
            : ''
        }`;
    } else {
      nextDetail.textContent =
        'Noch nichts geplant';
    }
  }
  /* ---------- LERNZEIT DIESE WOCHE ---------- */
  const weekSeconds =
    historyLastDays(7)
      .reduce(
        (sum,item) =>
          sum + item.seconds,
        0
      );
  const weekLabel =
    fmtDuration(
      weekSeconds
    );
  const weekElement =
    document.getElementById(
      'dash-week-learning'
    );
  if(weekElement){
    weekElement.textContent =
      weekLabel;
  }
  const progressTime =
    document.getElementById(
      'dash-progress-time'
    );
  if(progressTime){
    progressTime.textContent =
      weekLabel;
  }
  /*
     Wochenziel:
     vorerst 10 Stunden
  */
  const targetSeconds =
    10 * 60 * 60;
  const percentage =
    Math.min(
      100,
      Math.round(
        weekSeconds /
        targetSeconds *
        100
      )
    );
  const statProgress =
    document.getElementById(
      'dash-stat-progress-fill'
    );
  if(statProgress){
    statProgress.style.width =
      percentage + '%';
  }
  const lineProgress =
    document.getElementById(
      'dash-progress-line-fill'
    );
  if(lineProgress){
    lineProgress.style.width =
      percentage + '%';
  }
  const circle =
    document.querySelector(
      '.dash-progress-circle'
    );
  if(circle){
    circle.style.setProperty(
      '--dash-progress',
      percentage + '%'
    );
  }
  /* ---------- MOTIVATION ---------- */
  const progressMessage =
    document.getElementById(
      'dash-progress-message'
    );
  if(progressMessage){
    if(weekSeconds === 0){
      progressMessage.textContent =
        'Heute anfangen';
    }
    else if(percentage < 25){
      progressMessage.textContent =
        'Guter Anfang';
    }
    else if(percentage < 60){
      progressMessage.textContent =
        'Du bist gut dabei';
    }
    else if(percentage < 100){
      progressMessage.textContent =
        'Fast am Wochenziel';
    }
    else{
      progressMessage.textContent =
        'Wochenziel erreicht';
    }
  }
}
/* Bestehendes Dashboard erweitern */
const oldLernraumDashboardRender =
  renderDashboard;
renderDashboard =
  function(){
    oldLernraumDashboardRender();
    renderNewDashboardExtras();
  };
/* Direkt einmal aktualisieren */
setTimeout(
  () => {
    if(
      document
        .getElementById(
          'view-dashboard'
        )
    ){
      renderDashboard();
      renderDashboardEnhancements();
    }
  },
  100
);
/* ============================================================
   APPLE KALENDER
============================================================ */
function syncAppleCalendar(){
  const feedUrl = localStorage.getItem(
    'lernraum_apple_calendar_feed'
  );
  if(!feedUrl){
    alert(
      'Der Apple-Kalender-Link wird noch eingerichtet.'
    );
    return;
  }
  const webcalUrl =
    feedUrl.replace(
      /^https?:\/\//,
      'webcal://'
    );
  window.location.href = webcalUrl;
}
/* ============================================================
   LERNRAUM – MODUL-ZENTRALE
   Eine einzige saubere Modul-Implementierung.
============================================================ */
let activeModuleId = null;
function prepareModuleConnections(){
  [state.notes, state.todos, state.cards, state.events, state.docs].forEach(group => {
    if(!Array.isArray(group)) return;
    group.forEach(item => {
      if(item && (item.moduleId === undefined || item.moduleId === null)){
        item.moduleId = '';
      }
    });
  });
}
function getModuleData(moduleId){
  return {
    notes: state.notes.filter(item => item.moduleId === moduleId && !item.deleted),
    todos: state.todos.filter(item => item.moduleId === moduleId),
    cards: state.cards.filter(item => item.moduleId === moduleId),
    events: state.events.filter(item => item.moduleId === moduleId),
    docs: state.docs.filter(item => item.moduleId === moduleId)
  };
}
async function persistModules(){
  if(!Array.isArray(modules)) modules = [];
  await save('lernraum_modules', modules);
  try{
    localStorage.setItem('lernraum_modules_backup', JSON.stringify(modules));
  }catch(error){
    console.warn('Modul-Backup fehlgeschlagen:', error);
  }
}
async function restoreModulesBackupIfNeeded(){
  if(Array.isArray(modules) && modules.length) return;
  try{
    const raw = localStorage.getItem('lernraum_modules_backup');
    if(!raw) return;
    const backup = JSON.parse(raw);
    if(!Array.isArray(backup) || !backup.length) return;
    modules = backup;
    await save('lernraum_modules', modules);
  }catch(error){
    console.warn('Modul-Backup konnte nicht geladen werden:', error);
  }
}
function renderModules(){
  prepareModuleConnections();
  const grid = document.getElementById('module-grid');
  if(!grid) return;
  const summary = document.getElementById('module-summary');
  if(summary){
    summary.textContent =
      `${modules.length} ${modules.length === 1 ? 'Modul' : 'Module'} · ` +
      `${state.todos.filter(task => !task.done).length} offene Aufgaben`;
  }
  const cards = modules.map(module => {
    const data = getModuleData(module.id);
    const doneTasks = data.todos.filter(task => task.done).length;
    const openTasks = data.todos.filter(task => !task.done).length;
    const progress = data.todos.length
      ? Math.round((doneTasks / data.todos.length) * 100)
      : 0;
    return `
      <button
        class="module-card lr-module-central-card"
        onclick="workspaceOpenModule('${module.id}')"
      >
        <div class="module-cover">
          ${
            module.cover
              ? `<img src="${module.cover}" alt="">`
              : escapeHtml(module.icon || '📚')
          }
        </div>
        <div class="module-body">
          <div class="module-title">${escapeHtml(module.name || 'Ohne Namen')}</div>
          <div class="module-sub">
            <span>▣ ${escapeHtml(module.semester || 'Dieses Semester')}</span>
            <span>${progress}%</span>
          </div>
          <div class="db-progress-track" style="width:100%;margin-top:9px">
            <div class="db-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="lr-module-card-counts">
            <span>✓ ${openTasks}</span>
            <span>✎ ${data.notes.length}</span>
            <span>◫ ${data.cards.length}</span>
            <span>◷ ${data.events.length}</span>
            <span>↥ ${data.docs.length}</span>
          </div>
        </div>
      </button>
    `;
  }).join('');
  grid.innerHTML = cards + `
    <button
      class="module-card module-add-card"
      onclick="workspaceNewModule()"
    >
      ＋ Neues Modul
    </button>
  `;
}
function moduleEditorHtml(module, editing){
  return `
    <div class="modal-head">
      <div>
        <div class="eyebrow">${editing ? 'Modul bearbeiten' : 'Neues Modul'}</div>
        <h3>${editing ? escapeHtml(module.name || '') : 'Modul anlegen'}</h3>
      </div>
      <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="editor-grid">
      <label class="wide">
        Modulname
        <input
          id="ws-module-name"
          type="text"
          value="${escapeHtml(module.name || '')}"
          placeholder="z. B. Mathematik"
          autocomplete="off"
        >
      </label>
      <label>
        Symbol
        <input
          id="ws-module-icon"
          type="text"
          value="${escapeHtml(module.icon || '📚')}"
          maxlength="4"
        >
      </label>
      <label>
        Semester
        <input
          id="ws-module-semester"
          type="text"
          value="${escapeHtml(module.semester || 'Dieses Semester')}"
          placeholder="z. B. 1. Semester"
        >
      </label>
      <label class="wide">
        Titelbild
        <small>optional · maximal 2 MB</small>
        <input
          id="ws-module-cover"
          type="file"
          accept="image/*"
        >
      </label>
    </div>
    <div class="modal-actions">
      ${
        editing
          ? `<button type="button" class="btn danger" onclick="workspaceDeleteModule('${module.id}')">Löschen</button>`
          : ''
      }
      <span style="flex:1"></span>
      <button type="button" class="btn ghost" onclick="closeModal()">
        Abbrechen
      </button>
      <button
        type="button"
        class="btn"
        id="ws-module-save"
        onclick="workspaceSaveModule('${editing ? module.id : ''}')"
      >
        Speichern
      </button>
    </div>
  `;
}
function workspaceNewModule(){
  openModal(
    moduleEditorHtml(
      {
        name: '',
        icon: '📚',
        semester: 'Dieses Semester',
        cover: ''
      },
      false
    )
  );
  setTimeout(() => {
    document.getElementById('ws-module-name')?.focus();
  }, 50);
}
function workspaceEditModule(id){
  const module = moduleById(id);
  if(!module) return;
  openModal(moduleEditorHtml(module, true));
}
function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
      reader.error || new Error('Datei konnte nicht gelesen werden.')
    );
    reader.readAsDataURL(file);
  });
}
async function workspaceSaveModule(id = ''){
  const nameInput = document.getElementById('ws-module-name');
  const iconInput = document.getElementById('ws-module-icon');
  const semesterInput = document.getElementById('ws-module-semester');
  const coverInput = document.getElementById('ws-module-cover');
  const saveButton = document.getElementById('ws-module-save');
  if(!nameInput) return;
  const name = nameInput.value.trim();
  if(!name){
    nameInput.focus();
    if(typeof notify === 'function'){
      notify('Bitte einen Modulnamen eingeben.', 'error');
    }
    return;
  }
  if(saveButton){
    saveButton.disabled = true;
    saveButton.textContent = 'Speichert …';
  }
  try{
    const icon = iconInput?.value.trim() || '📚';
    const semester = semesterInput?.value.trim() || 'Dieses Semester';
    const file = coverInput?.files?.[0];
    let cover = id ? (moduleById(id)?.cover || '') : '';
    if(file){
      if(file.size > 2 * 1024 * 1024){
        throw new Error('Das Titelbild darf maximal 2 MB groß sein.');
      }
      cover = await fileToDataUrl(file);
    }
    if(id){
      const module = moduleById(id);
      if(!module){
        throw new Error('Modul nicht gefunden.');
      }
      Object.assign(module, {
        name,
        icon,
        semester,
        cover,
        updatedAt: Date.now()
      });
    }else{
      modules.push({
        id: uid(),
        name,
        icon,
        semester,
        cover,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    await persistModules();
    closeModal();
    renderModules();
    if(typeof renderTodos === 'function'){
      renderTodos();
    }
    if(typeof renderDashboard === 'function'){
      renderDashboard();
    }
    if(typeof notify === 'function'){
      notify(id ? 'Modul gespeichert.' : 'Modul erstellt.');
    }
  }catch(error){
    console.error('Modul speichern fehlgeschlagen:', error);
    if(saveButton){
      saveButton.disabled = false;
      saveButton.textContent = 'Speichern';
    }
    if(typeof notify === 'function'){
      notify(error?.message || 'Modul konnte nicht gespeichert werden.', 'error');
    }else{
      alert(error?.message || 'Modul konnte nicht gespeichert werden.');
    }
  }
}
async function workspaceDeleteModule(id){
  const module = moduleById(id);
  if(!module) return;
  if(!window.confirm(`"${module.name}" wirklich löschen?`)) return;
  modules = modules.filter(item => item.id !== id);
  [state.todos, state.notes, state.cards, state.events, state.docs].forEach(group => {
    group.forEach(item => {
      if(item.moduleId === id){
        item.moduleId = '';
      }
    });
  });
  await Promise.all([
    persistModules(),
    save('lernraum_todos', state.todos),
    save('lernraum_notes', state.notes),
    save('lernraum_flashcards', state.cards),
    save('lernraum_events', state.events),
    save('lernraum_docs_index', state.docs)
  ]);
  closeModal();
  renderModules();
  if(typeof renderTodos === 'function'){
    renderTodos();
  }
  if(typeof renderDashboard === 'function'){
    renderDashboard();
  }
  if(typeof notify === 'function'){
    notify('Modul gelöscht.');
  }
}
function workspaceOpenModule(moduleId){
  prepareModuleConnections();
  const module = moduleById(moduleId);
  if(!module) return;
  activeModuleId = moduleId;
  const data = getModuleData(moduleId);
  const openTasks = data.todos.filter(task => !task.done);
  const upcomingEvents = data.events
    .filter(event => event.date >= todayISO())
    .sort((a, b) =>
      (a.date + (a.time || '')).localeCompare(
        b.date + (b.time || '')
      )
    );
  openModal(`
    <div class="module-workspace lr-module-center">
      <div class="modal-head">
        <div class="module-detail-head">
          <div class="module-detail-ico">
            ${
              module.cover
                ? `<img src="${module.cover}" alt="">`
                : escapeHtml(module.icon || '📚')
            }
          </div>
          <div>
            <div class="eyebrow">${escapeHtml(module.semester || 'Modul')}</div>
            <h3>${escapeHtml(module.name)}</h3>
            <div class="lr-module-center-sub">Alles zu diesem Modul an einem Ort</div>
          </div>
        </div>
        <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
      </div>
      <div class="lr-module-stats">
        <button onclick="openModuleArea('${module.id}','notes')">
          <strong>${data.notes.length}</strong>
          <span>Notizen</span>
        </button>
        <button onclick="openModuleArea('${module.id}','cards')">
          <strong>${data.cards.length}</strong>
          <span>Karteikarten</span>
        </button>
        <button onclick="openModuleArea('${module.id}','todo')">
          <strong>${openTasks.length}</strong>
          <span>Aufgaben</span>
        </button>
        <button onclick="openModuleArea('${module.id}','calendar')">
          <strong>${data.events.length}</strong>
          <span>Termine</span>
        </button>
        <button onclick="openModuleArea('${module.id}','docs')">
          <strong>${data.docs.length}</strong>
          <span>Dateien</span>
        </button>
      </div>
      <div class="lr-module-content-grid">
        <section class="lr-module-section">
          <div class="lr-module-section-head">
            <div>
              <div class="eyebrow">Aufgaben</div>
              <h4>Offen</h4>
            </div>
            <button
              class="link-btn"
              onclick="closeModal();workspaceNewTask('geplant','${module.id}')"
            >
              + Aufgabe
            </button>
          </div>
          <div class="lr-module-list">
            ${
              openTasks.length
                ? openTasks.slice(0, 6).map(task => `
                    <div class="lr-module-row">
                      <button
                        class="db-check ${task.done ? 'done' : ''}"
                        onclick="workspaceToggleTask('${task.id}')"
                      ></button>
                      <span>${escapeHtml(task.text)}</span>
                      ${
                        task.deadline
                          ? `<small>${fmtDateShort(task.deadline)}</small>`
                          : ''
                      }
                    </div>
                  `).join('')
                : `<div class="lr-module-empty">Noch keine offenen Aufgaben.</div>`
            }
          </div>
        </section>
        <section class="lr-module-section">
          <div class="lr-module-section-head">
            <div>
              <div class="eyebrow">Kalender</div>
              <h4>Nächste Termine</h4>
            </div>
          </div>
          <div class="lr-module-list">
            ${
              upcomingEvents.length
                ? upcomingEvents.slice(0, 6).map(event => `
                    <div class="lr-module-row">
                      <span class="lr-module-event-dot lr-type-${event.type || 'termin'}"></span>
                      <span>${escapeHtml(event.title)}</span>
                      <small>
                        ${fmtDateShort(event.date)}
                        ${event.time ? ' · ' + escapeHtml(event.time) : ''}
                      </small>
                    </div>
                  `).join('')
                : `<div class="lr-module-empty">Keine kommenden Termine.</div>`
            }
          </div>
        </section>
        <section class="lr-module-section">
          <div class="lr-module-section-head">
            <div>
              <div class="eyebrow">Notizen</div>
              <h4>Zuletzt bearbeitet</h4>
            </div>
          </div>
          <div class="lr-module-list">
            ${
              data.notes.length
                ? data.notes
                    .slice()
                    .sort((a,b) => (b.updated || 0) - (a.updated || 0))
                    .slice(0, 6)
                    .map(note => `
                      <div class="lr-module-row">
                        <span>✎</span>
                        <span>${escapeHtml(note.title || 'Ohne Titel')}</span>
                      </div>
                    `).join('')
                : `<div class="lr-module-empty">Noch keine Notizen.</div>`
            }
          </div>
        </section>
        <section class="lr-module-section">
          <div class="lr-module-section-head">
            <div>
              <div class="eyebrow">Karteikarten</div>
              <h4>Sammlung</h4>
            </div>
          </div>
          <div class="lr-module-list">
            ${
              data.cards.length
                ? data.cards.slice(0, 6).map(card => `
                    <div class="lr-module-row">
                      <span>◫</span>
                      <span>${escapeHtml(card.front || 'Ohne Begriff')}</span>
                    </div>
                  `).join('')
                : `<div class="lr-module-empty">Noch keine Karteikarten.</div>`
            }
          </div>
        </section>
        <section class="lr-module-section lr-module-section-wide">
          <div class="lr-module-section-head">
            <div>
              <div class="eyebrow">Unterlagen</div>
              <h4>Dateien</h4>
            </div>
          </div>
          <div class="lr-module-list">
            ${
              data.docs.length
                ? data.docs.slice(0, 8).map(doc => `
                    <div class="lr-module-row">
                      <span>↥</span>
                      <span>${escapeHtml(doc.name)}</span>
                      <small>${fmtBytes(doc.size || 0)}</small>
                    </div>
                  `).join('')
                : `<div class="lr-module-empty">Noch keine Unterlagen.</div>`
            }
          </div>
        </section>
      </div>
      <div class="modal-actions lr-module-actions">
        <button class="btn ghost" onclick="workspaceEditModule('${module.id}')">
          Modul bearbeiten
        </button>
        <span style="flex:1"></span>
        <button
          class="btn"
          onclick="closeModal();workspaceNewTask('geplant','${module.id}')"
        >
          + Aufgabe
        </button>
      </div>
    </div>
  `);
}
function openModuleArea(moduleId, view){
  activeModuleId = moduleId;
  closeModal();
  if(view === 'todo'){
    taskModuleFilter = moduleId;
    taskRange = 'all';
    saveTaskUi();
    activateView('todo');
    renderTodos();
    return;
  }
  activateView(view);
}
(function installModuleCenterStyles(){
  if(document.getElementById('lernraum-module-center-style')) return;
  const style = document.createElement('style');
  style.id = 'lernraum-module-center-style';
  style.textContent = `
    .modal:has(.lr-module-center),
    .modal:has(.module-workspace){
      width:min(94vw,1380px) !important;
      max-width:1380px !important;
      height:min(90vh,920px) !important;
      max-height:90vh !important;
      padding:26px !important;
      overflow:auto !important;
    }
    .lr-module-center,
    .module-workspace{
      width:100% !important;
      min-width:0 !important;
    }
    .lr-module-center .module-detail-head{
      margin-bottom:0;
    }
    .lr-module-center .module-detail-head h3{
      margin:3px 0 0;
      font-family:'Fraunces',serif;
      font-size:27px;
    }
    .lr-module-center-sub{
      margin-top:5px;
      color:var(--ink-soft);
      font-size:12px;
    }
    .lr-module-central-card .module-body{
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    .lr-module-card-counts{
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
      margin-top:5px;
      color:var(--ink-faint);
      font:9.5px 'IBM Plex Mono',monospace;
    }
    .lr-module-stats{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:10px;
      margin:20px 0;
    }
    .lr-module-stats button{
      min-height:82px;
      padding:14px 8px;
      border:1px solid var(--line);
      border-radius:13px;
      background:var(--bg-soft);
      color:var(--ink);
      cursor:pointer;
    }
    .lr-module-stats button:hover{
      border-color:var(--sage);
      background:var(--sage-tint);
    }
    .lr-module-stats strong{
      display:block;
      margin-bottom:5px;
      font-family:'Fraunces',serif;
      font-size:27px;
    }
    .lr-module-stats span{
      color:var(--ink-soft);
      font-size:11px;
      font-weight:700;
    }
    .lr-module-content-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:14px;
    }
    .lr-module-section{
      min-width:0;
      padding:17px;
      border:1px solid var(--line);
      border-radius:15px;
      background:var(--surface);
    }
    .lr-module-section-wide{
      grid-column:1/-1;
    }
    .lr-module-section-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:10px;
    }
    .lr-module-section-head h4{
      margin:3px 0 0;
      font-size:16px;
    }
    .lr-module-list{
      display:flex;
      flex-direction:column;
    }
    .lr-module-row{
      min-height:41px;
      display:flex;
      align-items:center;
      gap:9px;
      padding:8px 3px;
      border-bottom:1px solid var(--line);
      font-size:12.5px;
    }
    .lr-module-row:last-child{
      border-bottom:0;
    }
    .lr-module-row > span:nth-child(2){
      flex:1;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .lr-module-row small{
      color:var(--ink-faint);
      font:9.5px 'IBM Plex Mono',monospace;
      white-space:nowrap;
    }
    .lr-module-empty{
      padding:12px 2px;
      color:var(--ink-faint);
      font-size:11.5px;
    }
    .lr-module-event-dot{
      width:8px;
      height:8px;
      flex:0 0 8px;
      border-radius:50%;
      background:var(--ink-faint);
    }
    .lr-type-vorlesung{background:var(--sage-dark);}
    .lr-type-uebung{background:var(--sage);}
    .lr-type-seminar{background:var(--dusk);}
    .lr-type-klausur{background:var(--clay-dark);}
    .lr-type-abgabe{background:var(--rust);}
    .lr-type-praktikum{background:var(--plum);}
    .lr-type-lerngruppe{background:var(--clay);}
    .lr-type-termin{background:var(--ink-faint);}
    .lr-module-actions{
      margin-top:18px;
      padding-top:16px;
      border-top:1px solid var(--line);
    }
    @media(max-width:900px){
      .modal:has(.lr-module-center),
      .modal:has(.module-workspace){
        width:96vw !important;
        height:92vh !important;
        max-height:92vh !important;
        padding:20px !important;
      }
      .lr-module-stats{
        grid-template-columns:repeat(3,1fr);
      }
      .lr-module-content-grid{
        grid-template-columns:1fr;
      }
      .lr-module-section-wide{
        grid-column:auto;
      }
    }
    @media(max-width:640px){
      .modal:has(.lr-module-center),
      .modal:has(.module-workspace){
        width:100% !important;
        height:94vh !important;
        max-height:94vh !important;
        border-radius:16px !important;
        padding:16px !important;
      }
      .lr-module-stats{
        grid-template-columns:repeat(2,1fr);
      }
    }
  `;
  document.head.appendChild(style);
})();
setTimeout(async () => {
  await restoreModulesBackupIfNeeded();
  prepareModuleConnections();
  renderModules();
}, 800);
window.addEventListener('pagehide', () => {
  try{
    localStorage.setItem(
      'lernraum_modules_backup',
      JSON.stringify(Array.isArray(modules) ? modules : [])
    );
  }catch(error){
    console.warn('Modul-Backup beim Verlassen fehlgeschlagen:', error);
  }
});
/* ============================================================
   FINAL UI INTEGRATION - AUFGABEN, NOTIZEN, KARTEIKARTEN, UNTERLAGEN
============================================================ */
function renderStudySetup(){
  const wrap=document.getElementById('study-content');
  if(!wrap) return;
  const folders=state.cardFolders;
  wrap.innerHTML=`<div class="card" style="max-width:520px;margin:20px auto;text-align:left"><div class="eyebrow">Übungsmodus</div><h3 style="font-family:'Fraunces',serif;margin:6px 0 14px">Was möchtest du üben?</h3><label style="display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:var(--ink-soft)">Kartengruppe<select id="study-start-group"><option value="alle">Alle Karteikarten</option>${folders.map(f=>`<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}</select></label><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn" onclick="startStudyFromSelection()">Übung starten</button></div></div>`;
}
function startStudyFromSelection(){
  const selected=document.getElementById('study-start-group')?.value||'alle';
  const indices=state.cards.map((card,index)=>index).filter(index=>selected==='alle'||state.cards[index].folderId===selected);
  startStudySession(indices);
}
async function renameDoc(id){
  const doc=state.docs.find(item=>item.id===id);
  if(!doc) return;
  const next=window.prompt('Dateiname ändern:',doc.name);
  if(next===null) return;
  const name=next.trim();
  if(!name||name===doc.name) return;
  doc.name=name;
  await save('lernraum_docs_index',state.docs);
  renderDocList();
}
function toggleTrashView(){
  showTrash=!showTrash;
  selectedNoteId=null;
  renderNotesList();
  installNotesTrashButton();
}
function installNotesTrashButton(){
  const view=document.getElementById('view-notes');
  if(!view) return;
  document.getElementById('trash-toggle')?.remove();
  if(document.getElementById('lr-notes-trash-button')) return;
  const create=[...view.querySelectorAll('.view-head button')].find(b=>(b.textContent||'').toLowerCase().includes('notiz'));
  if(!create) return;
  const button=document.createElement('button');
  button.type='button';button.id='lr-notes-trash-button';button.className='btn ghost';button.textContent='🗑 Papierkorb';
  button.onclick=()=>{showTrash=true;selectedNoteId=null;renderNotesList();};
  create.parentNode.insertBefore(button,create);
}
function installDocsFinalLayout(){
  const view=document.getElementById('view-docs');
  if(!view) return;
  const card=view.querySelector('.card');
  const chips=document.getElementById('doc-folder-chips');
  const folderAdd=view.querySelector('.folder-add');
  const input=document.getElementById('doc-file-input');
  const list=document.getElementById('doc-list');
  if(!card||!chips||!folderAdd||!input||!list) return;
  view.querySelectorAll('.doc-upload-row').forEach(row=>row.style.display='none');
  document.getElementById('storage-meter')?.style.setProperty('display','none','important');
  let toolbar=document.getElementById('lr-doc-final-toolbar');
  if(!toolbar){
    toolbar=document.createElement('div');toolbar.id='lr-doc-final-toolbar';
    toolbar.innerHTML='<div id="lr-doc-final-top"></div><div id="lr-doc-final-bottom"></div>';
    card.insertBefore(toolbar,list);
  }
  const top=document.getElementById('lr-doc-final-top');
  const bottom=document.getElementById('lr-doc-final-bottom');
  top.appendChild(chips);top.appendChild(folderAdd);
  let search=document.getElementById('lr-doc-search');
  if(!search){search=document.createElement('input');search.type='text';search.id='lr-doc-search';search.placeholder='⌕  Unterlagen suchen ...';search.addEventListener('input',()=>{window.lrDocSearchQuery=search.value;renderDocList();});}
  bottom.appendChild(search);
  let upload=document.getElementById('lr-doc-final-upload');
  if(!upload){upload=document.createElement('button');upload.type='button';upload.id='lr-doc-final-upload';upload.className='btn small';upload.textContent='↥  Datei hochladen';upload.onclick=()=>input.click();}
  bottom.appendChild(upload);
}
function installFinalUiStyles(){
  if(document.getElementById('lr-final-ui-styles')) return;
  const style = document.createElement('style');
  style.id = 'lr-final-ui-styles';
  style.textContent = `
    #view-docs #lr-doc-final-toolbar{
      display:flex;
      flex-direction:column;
      gap:14px;
      margin-bottom:10px;
    }
    #view-docs #lr-doc-final-top{
      display:flex;
      align-items:center;
      gap:38px;
      flex-wrap:wrap;
    }
    #view-docs #lr-doc-final-top #doc-folder-chips{
      display:flex!important;
      flex-direction:row!important;
      align-items:center!important;
      gap:8px!important;
      flex-wrap:wrap!important;
      margin:0!important;
      width:auto!important;
    }
    #view-docs #lr-doc-final-top #doc-folder-chips .folder-chip{
      flex:0 0 auto!important;
      width:auto!important;
      margin:0!important;
      white-space:nowrap!important;
    }
    #view-docs #lr-doc-final-top .folder-add{
      display:flex!important;
      align-items:center!important;
      gap:7px!important;
      margin:0 0 0 4px!important;
      width:auto!important;
    }
    #view-docs #lr-doc-final-top .folder-add input{
      width:190px!important;
      max-width:190px!important;
      height:31px!important;
      min-height:31px!important;
      padding:5px 9px!important;
      font-size:11px!important;
      border-radius:9px!important;
    }
    #view-docs #lr-doc-final-top .folder-add button{
      height:31px!important;
      min-height:31px!important;
      padding:0 10px!important;
      font-size:10.5px!important;
      border-radius:8px!important;
    }
    #view-docs #lr-doc-final-bottom{
      display:flex;
      align-items:center;
      justify-content:flex-start;
      gap:9px;
      width:100%;
      padding:0 0 8px;
      border-bottom:1px solid var(--line);
    }
    #view-docs #lr-doc-search{
      width:240px!important;
      min-width:240px!important;
      max-width:240px!important;
      flex:0 0 240px!important;
      height:34px!important;
      padding:7px 11px!important;
      font-size:11.5px!important;
      background:var(--surface)!important;
    }
    #view-docs #lr-doc-final-upload{
      height:32px!important;
      min-height:32px!important;
      padding:0 11px!important;
      font-size:11px!important;
      white-space:nowrap!important;
      margin:0!important;
    }
    #view-docs .lr-doc-final-row{
      display:grid!important;
      grid-template-columns:42px minmax(0,1fr) auto auto!important;
      align-items:center!important;
      gap:12px!important;
      padding:10px 12px!important;
      margin:0!important;
      border:0!important;
      border-bottom:1px solid var(--line)!important;
      border-radius:0!important;
      background:transparent!important;
    }
    #view-docs .lr-doc-final-row:last-child{
      border-bottom:0!important;
    }
    #view-docs .lr-doc-info{
      min-width:0;
    }
    #view-docs .lr-doc-category{
      width:92px!important;
      min-width:92px!important;
      padding:5px 7px!important;
      font-size:10.5px!important;
    }
    #view-docs .lr-doc-actions{
      display:flex!important;
      align-items:center!important;
      gap:5px!important;
    }
    #view-docs .lr-doc-action-btn{
      width:32px!important;
      height:32px!important;
      min-width:32px!important;
      min-height:32px!important;
      padding:0!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      border:1px solid var(--line)!important;
      border-radius:8px!important;
      background:var(--surface)!important;
      color:var(--ink)!important;
      cursor:pointer!important;
      transition:background .15s ease,border-color .15s ease,color .15s ease,transform .1s ease;
    }
    #view-docs .lr-doc-action-btn svg{
      width:15px!important;
      height:15px!important;
      display:block!important;
      stroke:currentColor!important;
    }
    #view-docs .lr-doc-action-btn:hover{
      background:var(--sage-tint)!important;
      border-color:var(--sage)!important;
      color:var(--sage-dark)!important;
    }
    #view-docs .lr-doc-action-btn:active{
      transform:scale(.95);
    }
    #view-docs .lr-doc-action-btn.danger:hover{
      background:var(--rust-tint)!important;
      border-color:var(--rust)!important;
      color:var(--rust)!important;
    }
    #view-docs .doc-icon{
      width:36px!important;
      height:36px!important;
      font-size:9px!important;
    }
    #view-docs .doc-meta{
      font-size:10.5px!important;
    }
    @media(max-width:760px){
      #view-docs #lr-doc-final-top{gap:12px}
      #view-docs #lr-doc-final-top .folder-add{width:100%!important;margin-left:0!important}
      #view-docs #lr-doc-final-bottom{flex-wrap:wrap}
      #view-docs #lr-doc-search{width:220px!important;min-width:220px!important;max-width:220px!important;flex-basis:220px!important}
      #view-docs .lr-doc-final-row{grid-template-columns:36px minmax(0,1fr)!important}
      #view-docs .lr-doc-category,#view-docs .lr-doc-actions{grid-column:2}
    }
  `;
  document.head.appendChild(style);
}
const lrFinalActivateView=activateView;
activateView=function(view){
  lrFinalActivateView(view);
  if(view==='notes') setTimeout(()=>{installNotesTrashButton();renderNotesList();},0);
  if(view==='docs') setTimeout(()=>{installDocsFinalLayout();renderDocFolderChips();renderDocList();},0);
};
setTimeout(()=>{
  installFinalUiStyles();
  installNotesTrashButton();
  installDocsFinalLayout();
  renderDocFolderChips();
  renderDocList();
},250);
/* To-Do: Nur Tabelle und Board rechts ausrichten. */
(function(){
  function moveTodoViewButtons(){
    const view = document.getElementById('view-todo');
    if(!view) return;
    const bar = view.querySelector('.workspace-bar');
    if(!bar) return;
    const buttons = [...view.querySelectorAll('.view-kind-btn')];
    if(!buttons.length) return;
    let right = document.getElementById('todo-view-buttons-right');
    if(!right){
      right = document.createElement('div');
      right.id = 'todo-view-buttons-right';
      bar.appendChild(right);
    }
    buttons.forEach(button => right.appendChild(button));
  }
  moveTodoViewButtons();
  setTimeout(moveTodoViewButtons, 300);
})();
/* ============================================================
   KARTEIKARTEN – STABILE BUTTON-BINDINGS
============================================================ */
(function installFlashcardBindings(){
  function bindStaticButtons(){
    const view = document.getElementById('view-cards');
    if(!view) return;
    view.querySelectorAll('.fc-mode-btn-item').forEach(button => {
      button.removeAttribute('onclick');
      button.onclick = () => setFcMode(button.dataset.mode);
    });
    const saveButton = view.querySelector('.fc-create-form .btn');
    if(saveButton){
      saveButton.removeAttribute('onclick');
      saveButton.onclick = saveNewCard;
    }
    const tools = view.querySelector('.fc-tools-row');
    if(tools){
      const exportButton = [...tools.querySelectorAll('button')]
        .find(button => /CSV exportieren/i.test(button.textContent || ''));
      if(exportButton){
        exportButton.removeAttribute('onclick');
        exportButton.onclick = exportCardsCsv;
      }
    }
    const csvInput = document.getElementById('card-csv-input');
    if(csvInput){
      csvInput.removeAttribute('onchange');
      csvInput.onchange = importCardsCsv;
    }
    const folderInput = document.getElementById('fc-folder-input');
    if(folderInput){
      folderInput.onkeydown = event => {
        if(event.key === 'Enter'){
          event.preventDefault();
          addCardFolder();
        }
      };
      const addFolderButton = folderInput.parentElement?.querySelector('button');
      if(addFolderButton){
        addFolderButton.removeAttribute('onclick');
        addFolderButton.onclick = addCardFolder;
      }
    }
    const frontInput = document.getElementById('fc-new-front');
    const backInput = document.getElementById('fc-new-back');
    [frontInput, backInput].forEach(input => {
      if(!input) return;
      input.onkeydown = event => {
        if(event.key === 'Enter' && (event.metaKey || event.ctrlKey)){
          event.preventDefault();
          saveNewCard();
        }
      };
    });
  }
  document.addEventListener('click', event => {
    const folderDelete = event.target.closest('[data-fc-delete-folder]');
    if(folderDelete){
      event.preventDefault();
      event.stopPropagation();
      deleteCardFolder(folderDelete.dataset.fcDeleteFolder);
      return;
    }
    const folderButton = event.target.closest('[data-fc-folder]');
    if(folderButton){
      event.preventDefault();
      setFcFolderFilter(folderButton.dataset.fcFolder);
      return;
    }
    const actionButton = event.target.closest('[data-card-action]');
    if(actionButton){
      event.preventDefault();
      const id = actionButton.dataset.cardId;
      const action = actionButton.dataset.cardAction;
      if(action === 'swap') swapCardSides(id);
      if(action === 'delete') deleteCard(id);
    }
  });
  document.addEventListener('input', event => {
    const input = event.target.closest('[data-card-field][data-card-id]');
    if(!input || input.tagName === 'SELECT') return;
    updateCard(
      input.dataset.cardId,
      input.dataset.cardField,
      input.value
    );
  });
  document.addEventListener('change', event => {
    const select = event.target.closest('select[data-card-field][data-card-id]');
    if(!select) return;
    updateCard(
      select.dataset.cardId,
      select.dataset.cardField,
      select.value
    );
    if(select.dataset.cardField === 'folderId' && fcFolderFilter !== 'alle'){
      renderFcManage();
    }
  });
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      bindStaticButtons();
      renderFcFolderChips();
      renderFcManage();
      setFcMode('manage');
    }, { once: true });
  }else{
    bindStaticButtons();
    renderFcFolderChips();
    renderFcManage();
    setFcMode('manage');
  }
  const originalActivateViewForCards = activateView;
  activateView = function(view){
    originalActivateViewForCards(view);
    if(view === 'cards'){
      setTimeout(() => {
        bindStaticButtons();
        renderFcFolderChips();
        renderFcManage();
        setFcMode(fcMode || 'manage');
      }, 0);
    }
  };
})();
/* ============================================================
   FIX – KARTEIKARTEN SPIELEMODUS
   Richtige Antworten werden wieder korrekt erkannt
============================================================ */
function renderGame() {
  const wrap = document.getElementById('game-content');
  if (!wrap) return;
  if (gameCards.length < 2) {
    wrap.innerHTML = `
      <div class="empty">
        <span class="emoji">🎮</span>
        Du brauchst mindestens 2 Karteikarten mit Begriff und Bedeutung
        in dieser Kategorie, um zu spielen.
      </div>
    `;
    return;
  }
  if (gameOver) {
    const isNew = gameScore === gameHighscore && gameScore > 0;
    wrap.innerHTML = `
      <div class="game-over">
        <div class="big-num">${gameScore}</div>
        <p>Punkte erreicht</p>
        <div class="game-high ${isNew ? 'new' : ''}">
          ${isNew ? 'Neuer Rekord!' : 'Rekord: ' + gameHighscore + ' Punkte'}
        </div>
        <div class="study-finish-actions">
          <button class="btn" onclick="startGame()">
            Nochmal spielen
          </button>
          <button class="btn ghost" onclick="setFcMode('manage')">
            Fertig
          </button>
        </div>
      </div>
    `;
    return;
  }
  wrap.innerHTML = `
    <div class="game-topbar" id="game-topbar">
      ${gameTopbarHtml()}
    </div>
    <div class="game-timerbar-track">
      <div
        class="game-timerbar-fill"
        id="game-timerbar-fill"
        style="width:100%;">
      </div>
    </div>
    <div class="game-question-card">
      ${escapeHtml(gameQuestion.front) || '(ohne Begriff)'}
    </div>
    <div class="game-options-grid">
      ${gameOptions.map((option, index) => `
        <button
          type="button"
          class="game-option-btn"
          data-option-index="${index}"
          onclick="answerGameByIndex(${index})">
          <span class="game-option-num">
            ${index + 1}
          </span>
          ${escapeHtml(option) || '(leer)'}
        </button>
      `).join('')}
    </div>
  `;
}
function answerGameByIndex(index) {
  const chosen = gameOptions[index];
  if (chosen === undefined) return;
  answerGameFixed(chosen);
}
function answerGameFixed(chosen) {
  if (gameAnswered || gameOver || !gameQuestion) return;
  gameAnswered = true;
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  const correct =
    String(chosen).trim() ===
    String(gameQuestion.back).trim();
  document
    .querySelectorAll('.game-option-btn')
    .forEach(btn => {
      btn.disabled = true;
      const index = Number(btn.dataset.optionIndex);
      const value = gameOptions[index];
      if (
        String(value).trim() ===
        String(gameQuestion.back).trim()
      ) {
        btn.classList.add('correct');
      }
      else if (
        String(value).trim() ===
        String(chosen).trim()
      ) {
        btn.classList.add('wrong');
      }
    });
  if (correct) {
    gameStreak++;
    const bonus =
      Math.max(0, Math.floor(gameTimeLeft));
    gameScore +=
      100 +
      bonus * 5 +
      Math.max(0, gameStreak - 1) * 25;
  } else {
    gameStreak = 0;
    gameLives--;
  }
  const topbar =
    document.getElementById('game-topbar');
  if (topbar) {
    topbar.innerHTML = gameTopbarHtml();
  }
  setTimeout(() => {
    if (gameLives <= 0) {
      gameOver = true;
      if (gameScore > gameHighscore) {
        gameHighscore = gameScore;
        try {
          localStorage.setItem(
            'gameHighscore',
            String(gameHighscore)
          );
        } catch (e) {}
      }
      renderGame();
      return;
    }
    nextGameQuestion();
  }, 900);
}
/* ============================================================
   DASHBOARD – LERNPLAN / DEADLINE / KALENDER-MARKIERUNGEN
============================================================ */
(function(){
  'use strict';
  /* ========================================================
     HILFSFUNKTIONEN
  ======================================================== */
  function lrDashDate(value){
    if(!value) return null;
    if(value instanceof Date){
      return isNaN(value) ? null : value;
    }
    const str = String(value).trim();
    if(!str) return null;
    /* YYYY-MM-DD */
    const iso =
      str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso){
      return new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3])
      );
    }
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }
  function lrDashDateKey(value){
    const d = lrDashDate(value);
    if(!d) return '';
    const y = d.getFullYear();
    const m =
      String(d.getMonth() + 1)
        .padStart(2,'0');
    const day =
      String(d.getDate())
        .padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function lrTodayStart(){
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }
  function lrEscape(value){
    if(typeof escapeHtml === 'function'){
      return escapeHtml(String(value ?? ''));
    }
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function lrDayName(date){
    return date
      .toLocaleDateString(
        'de-DE',
        { weekday:'short' }
      )
      .replace('.','');
  }
  function lrShortDate(date){
    return date.toLocaleDateString(
      'de-DE',
      {
        day:'2-digit',
        month:'2-digit'
      }
    );
  }
  /* ========================================================
     LERNPLAN-EINTRÄGE FINDEN
  ======================================================== */
  function lrPlanItems(){
    const result = [];
    /*
       Unterstützt mehrere mögliche Namen,
       falls dein Lernplan über die Zeit geändert wurde.
    */
    const sources = [
      Array.isArray(studyPlans) ? studyPlans : [],
      state?.studyPlan,
      state?.studyPlans,
      state?.planner,
      state?.planEntries,
      state?.learningPlan,
      state?.learningPlans
    ];
    sources.forEach(source => {
      if(!Array.isArray(source)) return;
      source.forEach(item => {
        if(!item) return;
        /* Plan besitzt einzelne Tasks */
        if(Array.isArray(item.tasks)){
          item.tasks.forEach(task => {
            if(!task) return;
            result.push({
              id:
                task.id ||
                item.id ||
                '',
              title:
                task.title ||
                task.text ||
                task.subject ||
                item.title ||
                'Lerneinheit',
              detail:
                task.detail ||
                task.description ||
                task.topic ||
                item.subject ||
                '',
              date:
                task.date ||
                task.day ||
                item.date ||
                '',
              time:
                task.time ||
                task.startTime ||
                '',
              done:
                Boolean(
                  task.done ||
                  task.completed
                )
            });
          });
          return;
        }
        /* Direkter Lernplan-Eintrag */
        result.push({
          id:
            item.id ||
            '',
          title:
            item.title ||
            item.text ||
            item.subject ||
            item.topic ||
            'Lerneinheit',
          detail:
            item.detail ||
            item.description ||
            item.note ||
            '',
          date:
            item.date ||
            item.day ||
            item.startDate ||
            '',
          time:
            item.time ||
            item.startTime ||
            '',
          done:
            Boolean(
              item.done ||
              item.completed
            )
        });
      });
    });
    /* Doppelte Einträge entfernen */
    const unique = [];
    const seen = new Set();
    result.forEach(item => {
      const key =
        `${item.id}|${item.title}|${item.date}|${item.time}`;
      if(seen.has(key)) return;
      seen.add(key);
      unique.push(item);
    });
    return unique;
  }
  /* ========================================================
     LERNPLAN AUF DASHBOARD
  ======================================================== */
  window.renderDashboardPlanPreview =
  function(){
    const wrap =
      document.getElementById(
        'dash-plan-preview'
      );
    if(!wrap) return;
    const today =
      lrTodayStart();
    const items =
      lrPlanItems()
        .filter(item => {
          if(item.done) return false;
          const d =
            lrDashDate(item.date);
          if(!d) return false;
          d.setHours(0,0,0,0);
          return d >= today;
        })
        .sort((a,b) => {
          const da =
            lrDashDate(a.date);
          const db =
            lrDashDate(b.date);
          return da - db;
        })
        .slice(0,3);
    if(!items.length){
      wrap.innerHTML = `
        <div class="dash-plan-empty">
          <div class="dash-plan-empty-icon">
            ◷
          </div>
          <strong>
            Noch nichts geplant
          </strong>
          <span>
            Erstelle im Lernplan deine nächste Lerneinheit.
          </span>
        </div>
      `;
      return;
    }
    wrap.innerHTML =
      items.map(item => {
        const date =
          lrDashDate(item.date);
        return `
          <div class="dash-plan-item">
            <div class="dash-plan-date">
              <strong>
                ${date.getDate()}
              </strong>
              <span>
                ${lrDayName(date)}
              </span>
            </div>
            <div class="dash-plan-info">
              <strong>
                ${lrEscape(item.title)}
              </strong>
              ${
                item.detail
                  ? `
                    <small>
                      ${lrEscape(item.detail)}
                    </small>
                  `
                  : `
                    <small>
                      ${lrShortDate(date)}
                    </small>
                  `
              }
            </div>
            ${
              item.time
                ? `
                  <div class="dash-plan-time">
                    ${lrEscape(item.time)}
                  </div>
                `
                : ''
            }
          </div>
        `;
      }).join('');
  };
  /* ========================================================
     NÄCHSTE DEADLINE
  ======================================================== */
  window.renderDashboardDeadline =
  function(){
    const bar =
      document.getElementById(
        'dash-deadline-bar'
      );
    const titleEl =
      document.getElementById(
        'dash-deadline-title'
      );
    const metaEl =
      document.getElementById(
        'dash-deadline-meta'
      );
    if(!bar || !titleEl || !metaEl){
      return;
    }
    const todos = Array.isArray(state?.todos) ? state.todos : [];
    const today =
      lrTodayStart();
    const next =
      todos
        .filter(todo => {
          if(
            todo.done ||
            todo.completed
          ){
            return false;
          }
          const deadline =
            todo.deadline ||
            todo.dueDate ||
            todo.date;
          return Boolean(
            lrDashDate(deadline)
          );
        })
        .sort((a,b) => {
          const da =
            lrDashDate(
              a.deadline ||
              a.dueDate ||
              a.date
            );
          const db =
            lrDashDate(
              b.deadline ||
              b.dueDate ||
              b.date
            );
          return da - db;
        })[0];
    if(!next){
      bar.classList.remove('urgent');
      titleEl.textContent =
        'Keine Deadline geplant';
      metaEl.textContent =
        'Du hast aktuell keine offene Aufgabe mit Deadline.';
      return;
    }
    const deadline =
      lrDashDate(
        next.deadline ||
        next.dueDate ||
        next.date
      );
    const deadlineDay =
      new Date(deadline);
    deadlineDay.setHours(0,0,0,0);
    const diff =
      Math.round(
        (
          deadlineDay -
          today
        ) /
        86400000
      );
    let when;
    if(diff < 0){
      when =
        `${Math.abs(diff)} Tag${
          Math.abs(diff) === 1
            ? ''
            : 'e'
        } überfällig`;
    }
    else if(diff === 0){
      when = 'Heute fällig';
    }
    else if(diff === 1){
      when = 'Morgen fällig';
    }
    else{
      when =
        `Fällig am ${
          deadline.toLocaleDateString(
            'de-DE',
            {
              day:'2-digit',
              month:'2-digit',
              year:'numeric'
            }
          )
        }`;
    }
    titleEl.textContent =
      next.title ||
      next.text ||
      next.name ||
      'Aufgabe';
    const priority =
      next.priority ||
      next.prio ||
      '';
    metaEl.textContent =
      priority
        ? `${when} · Priorität: ${priority.charAt(0).toUpperCase() + priority.slice(1)}`
        : when;
    bar.classList.toggle(
      'urgent',
      diff <= 1
    );
  };
  /* ========================================================
     MINI-KALENDER MARKIEREN
  ======================================================== */
  window.renderDashboardCalendarMarkers =
  function(){
    const grid =
      document.getElementById(
        'dash-cal-grid'
      );
    const label =
      document.getElementById(
        'dash-cal-label'
      );
    if(!grid || !label) return;
    const monthNames = {
      januar:0,
      februar:1,
      märz:2,
      maerz:2,
      april:3,
      mai:4,
      juni:5,
      juli:6,
      august:7,
      september:8,
      oktober:9,
      november:10,
      dezember:11
    };
    const parts =
      label.textContent
        .trim()
        .toLowerCase()
        .split(/\s+/);
    if(parts.length < 2) return;
    const month =
      monthNames[parts[0]];
    const year =
      Number(parts[1]);
    if(
      month === undefined ||
      !year
    ){
      return;
    }
    const eventDates =
      new Set();
    const taskDates =
      new Set();
    const planDates =
      new Set();
    /* Termine */
    const events = Array.isArray(state?.events) ? state.events : [];
    events.forEach(event => {
      const key =
        lrDashDateKey(
          event.date ||
          event.startDate ||
          event.start
        );
      if(key){
        eventDates.add(key);
      }
    });
    /* Aufgaben */
    const todos = Array.isArray(state?.todos) ? state.todos : [];
    todos.forEach(todo => {
      if(
        todo.done ||
        todo.completed
      ){
        return;
      }
      const key =
        lrDashDateKey(
          todo.deadline ||
          todo.dueDate ||
          todo.date
        );
      if(key){
        taskDates.add(key);
      }
    });
    /* Lernplan */
    lrPlanItems()
      .filter(item => !item.done)
      .forEach(item => {
        const key =
          lrDashDateKey(item.date);
        if(key){
          planDates.add(key);
        }
      });
    grid
      .querySelectorAll(
        '.mini-cal-day'
      )
      .forEach(day => {
        const old =
          day.querySelector(
            '.dash-cal-markers'
          );
        if(old){
          old.remove();
        }
        if(
          day.classList.contains('blank')
        ){
          return;
        }
        const number =
          Number(
            day.textContent.trim()
          );
        if(
          !number ||
          number < 1 ||
          number > 31
        ){
          return;
        }
        const key =
          lrDashDateKey(
            new Date(
              year,
              month,
              number
            )
          );
        const types = [];
        if(eventDates.has(key)){
          types.push('event');
        }
        if(taskDates.has(key)){
          types.push('task');
        }
        if(planDates.has(key)){
          types.push('plan');
        }
        if(!types.length){
          return;
        }
        const markers =
          document.createElement('div');
        markers.className =
          'dash-cal-markers';
        markers.innerHTML =
          types
            .slice(0,3)
            .map(
              type =>
                `<span class="dash-cal-marker ${type}"></span>`
            )
            .join('');
        day.appendChild(markers);
      });
  };
  /* ========================================================
     ALLES AKTUALISIEREN
  ======================================================== */
  window.refreshDashboardExtras =
  function(){
    renderDashboardPlanPreview();
    renderDashboardDeadline();
    /*
       Kalender minimal verzögert,
       damit zuerst dein bestehender Kalender gerendert wird.
    */
    setTimeout(
      renderDashboardCalendarMarkers,
      30
    );
  };
  /* ========================================================
     DASHBOARD-RENDERING ERWEITERN
  ======================================================== */
  if(
    typeof window.renderDashboard ===
    'function'
  ){
    const originalDashboard =
      window.renderDashboard;
    window.renderDashboard =
    function(){
      const result =
        originalDashboard.apply(
          this,
          arguments
        );
      setTimeout(
        refreshDashboardExtras,
        0
      );
      return result;
    };
  }
  /* ========================================================
     KALENDER-PFEILE MIT MARKIERUNGEN
  ======================================================== */
  if(
    typeof window.dashCalShift ===
    'function'
  ){
    const originalShift =
      window.dashCalShift;
    window.dashCalShift =
    function(){
      const result =
        originalShift.apply(
          this,
          arguments
        );
      setTimeout(
        renderDashboardCalendarMarkers,
        40
      );
      return result;
    };
  }
  /* ========================================================
     START
  ======================================================== */
  function start(){
    refreshDashboardExtras();
  }
  if(
    document.readyState ===
    'loading'
  ){
    document.addEventListener(
      'DOMContentLoaded',
      start
    );
  }
  else{
    start();
  }
})();
/* ============================================================
   WEBSITE-LERNZEIT
   Misst aktive Zeit auf der Website.
   Nach 5 Minuten ohne Aktivität wird pausiert.
============================================================ */
(function(){
  'use strict';
  const STORAGE_KEY = 'lernraum_site_learning_time_v1';
  const IDLE_LIMIT_MS = 5 * 60 * 1000;
  const TICK_MS = 1000;
  let lastActivityAt = Date.now();
  let lastTickAt = Date.now();
  let active = !document.hidden;
  function siteDateKey(date = new Date()){
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }
  function loadSiteLearningTime(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === 'object' ? data : {};
    }catch(e){
      return {};
    }
  }
  function saveSiteLearningTime(data){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(e){}
  }
  function addActiveSeconds(seconds){
    if(seconds <= 0) return;
    const data = loadSiteLearningTime();
    const key = siteDateKey();
    data[key] = Math.max(0, Number(data[key]) || 0) + seconds;
    saveSiteLearningTime(data);
  }
  function siteWeekSeconds(){
    const data = loadSiteLearningTime();
    let total = 0;
    for(let i = 0; i < 7; i++){
      const d = new Date();
      d.setHours(0,0,0,0);
      d.setDate(d.getDate() - i);
      total += Number(data[siteDateKey(d)]) || 0;
    }
    return Math.floor(total);
  }
  function formatSiteLearningTime(seconds){
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if(h > 0){
      return `${h} h ${m} Min.`;
    }
    return `${m} Min.`;
  }
  function updateSiteLearningDashboard(){
    const seconds = siteWeekSeconds();
    const label = document.getElementById('dash-week-learning');
    if(label){
      label.textContent = formatSiteLearningTime(seconds);
    }
    const progress = document.getElementById('dash-stat-progress-fill');
    if(progress){
      const tenHourGoal = 10 * 60 * 60;
      const percent = Math.min(100, (seconds / tenHourGoal) * 100);
      progress.style.width = `${percent}%`;
    }
  }
  function markActivity(){
    lastActivityAt = Date.now();
    active = !document.hidden;
  }
  function tick(){
    const now = Date.now();
    const elapsed = Math.max(0, Math.min(2, (now - lastTickAt) / 1000));
    lastTickAt = now;
    const idle = now - lastActivityAt >= IDLE_LIMIT_MS;
    if(!document.hidden && active && !idle){
      addActiveSeconds(elapsed);
    }
    updateSiteLearningDashboard();
  }
  [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'pointermove',
    'pointerdown'
  ].forEach(eventName => {
    window.addEventListener(eventName, markActivity, { passive:true });
  });
  document.addEventListener('visibilitychange', () => {
    lastTickAt = Date.now();
    if(document.hidden){
      active = false;
    }else{
      active = true;
      lastActivityAt = Date.now();
    }
  });
  window.addEventListener('focus', markActivity);
  window.addEventListener('blur', () => {
    active = false;
  });
  setInterval(tick, TICK_MS);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', updateSiteLearningDashboard);
  }else{
    updateSiteLearningDashboard();
  }
  // Nach bestehenden Dashboard-Renders den aktiven Website-Wert wieder einsetzen.
  if(typeof window.renderDashboardEnhancements === 'function'){
    const originalRenderDashboardEnhancements = window.renderDashboardEnhancements;
    window.renderDashboardEnhancements = function(){
      const result = originalRenderDashboardEnhancements.apply(this, arguments);
      updateSiteLearningDashboard();
      return result;
    };
  }
  if(typeof window.renderDashboard === 'function'){
    const originalRenderDashboardForSiteTime = window.renderDashboard;
    window.renderDashboard = function(){
      const result = originalRenderDashboardForSiteTime.apply(this, arguments);
      updateSiteLearningDashboard();
      return result;
    };
  }
})();