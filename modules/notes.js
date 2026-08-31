/* ============================================================
   LERNRAUM – NOTES MODULE
   Note management, rendering, and UI
============================================================ */

const LernraumNotes = (() => {
  const { storage, utils, save } = LernraumCore;

  let selectedNoteId = null;
  let noteFolderFilter = 'alle';
  let showTrash = false;

  function getFilteredNotes(q = '') {
    if (!window.state?.notes) return [];
    q = (q || '').toLowerCase();
    return window.state.notes.filter(note => {
      if (!!note.deleted !== !!showTrash) return false;
      const hay = ((note.title || '') + ' ' + (note.content || '')).toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (noteFolderFilter === 'alle') return true;
      if (noteFolderFilter === 'ohne') return !note.folderId;
      return note.folderId === noteFolderFilter;
    });
  }

  async function createNote() {
    showTrash = false;
    const folderId = (noteFolderFilter !== 'alle' && noteFolderFilter !== 'ohne') ? noteFolderFilter : null;
    const note = {
      id: utils.uid(),
      title: '',
      content: '',
      folderId,
      favorite: false,
      deleted: false,
      createdAt: Date.now(),
      updated: Date.now()
    };
    window.state.notes.unshift(note);
    selectedNoteId = note.id;
    await save('lernraum_notes', window.state.notes);
    window.stats.notesCreated++;
    if (typeof window.saveStats === 'function') await window.saveStats();
    if (typeof window.renderNotesList === 'function') window.renderNotesList();
    setTimeout(() => document.getElementById('note-title')?.focus(), 50);
  }

  async function deleteNote(id) {
    const note = window.state.notes.find(item => item.id === id);
    if (!note) return;
    if (!window.confirm('Notiz in den Papierkorb verschieben?')) return;
    note.deleted = true;
    note.deletedAt = Date.now();
    note.updated = Date.now();
    selectedNoteId = null;
    await save('lernraum_notes', window.state.notes);
    showTrash = false;
    if (typeof window.renderNotesList === 'function') window.renderNotesList();
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
    utils.notify('Notiz in den Papierkorb verschoben.');
  }

  async function restoreNote(id) {
    const note = window.state.notes.find(item => item.id === id);
    if (!note) return;
    note.deleted = false;
    note.deletedAt = null;
    note.updated = Date.now();
    await save('lernraum_notes', window.state.notes);
    showTrash = false;
    selectedNoteId = id;
    if (typeof window.renderNotesList === 'function') window.renderNotesList();
    utils.notify('Notiz wiederhergestellt.');
  }

  async function permanentlyDeleteNote(id) {
    const note = window.state.notes.find(item => item.id === id);
    if (!note) return;
    if (!window.confirm('Notiz endgültig löschen?')) return;
    window.state.notes = window.state.notes.filter(item => item.id !== id);
    selectedNoteId = null;
    await save('lernraum_notes', window.state.notes);
    if (typeof window.renderNotesList === 'function') window.renderNotesList();
    utils.notify('Notiz endgültig gelöscht.');
  }

  return {
    getFilteredNotes,
    createNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    get selectedNoteId() { return selectedNoteId; },
    set selectedNoteId(id) { selectedNoteId = id; },
    get noteFolderFilter() { return noteFolderFilter; },
    set noteFolderFilter(f) { noteFolderFilter = f; },
    get showTrash() { return showTrash; },
    set showTrash(v) { showTrash = v; }
  };
})();

window.LernraumNotes = LernraumNotes;
