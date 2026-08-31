/* ============================================================
   LERNRAUM – TASKS MODULE
   Task/Todo management and workspace
============================================================ */

const LernraumTasks = (() => {
  const { utils, save } = LernraumCore;

  let taskRange = 'week';
  let taskDisplay = 'table';
  let taskStatusFilter = 'all';
  let taskModuleFilter = 'all';
  let taskSort = 'deadline';

  function normalizeTask(t) {
    if (!t) return t;
    if (!t.deadline && t.dueDate) t.deadline = t.dueDate;
    if (!t.status && t.done) t.status = 'erledigt';
    if (!t.status && !t.done) t.status = t.status || 'geplant';
    if (t.status === 'erledigt' && !t.done) t.done = true;
    if (t.done && t.status !== 'erledigt') t.status = 'erledigt';
    return t;
  }

  function filteredWorkspaceTasks() {
    if (!window.state?.todos) return [];
    let tasks = window.state.todos.map(normalizeTask);

    const range = taskRange || 'all';
    if (range !== 'all') {
      const { start, end } = taskRangeDates(range);
      tasks = tasks.filter(t => {
        const d = t.deadline || t.dueDate || t.date;
        if (!d) return range === 'all';
        const taskDate = new Date(d);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= start && taskDate < end;
      });
    }

    if (taskStatusFilter && taskStatusFilter !== 'all') {
      tasks = tasks.filter(t => t.status === taskStatusFilter);
    }

    if (taskModuleFilter && taskModuleFilter !== 'all') {
      tasks = tasks.filter(t => t.moduleId === taskModuleFilter);
    }

    return tasks.sort((a, b) => {
      if (taskSort === 'deadline') {
        const aDate = new Date(a.deadline || a.dueDate || a.date || '9999-12-31');
        const bDate = new Date(b.deadline || b.dueDate || b.date || '9999-12-31');
        return aDate - bDate;
      }
      if (taskSort === 'title') {
        return (a.text || '').localeCompare(b.text || '');
      }
      return 0;
    });
  }

  function taskRangeDates(range) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (range === 'week') {
      const monday = new Date(now);
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      const end = new Date(monday);
      end.setDate(monday.getDate() + 7);
      return { start: monday, end };
    }

    if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }

    return { start: new Date(1900, 0, 1), end: new Date(2100, 11, 31) };
  }

  async function addTodo() {
    const todoText = document.getElementById('dash-quick-todo')?.value?.trim();
    if (!todoText) return;

    const todo = {
      id: utils.uid(),
      text: todoText,
      done: false,
      status: 'geplant',
      created: Date.now()
    };

    window.state.todos.push(todo);
    await save('lernraum_todos', window.state.todos);
    window.stats.todosCreated++;
    if (typeof window.saveStats === 'function') await window.saveStats();
    if (typeof window.renderTodos === 'function') window.renderTodos();
    if (document.getElementById('dash-quick-todo')) {
      document.getElementById('dash-quick-todo').value = '';
    }
  }

  async function toggleTodo(id) {
    const todo = window.state.todos.find(t => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
    todo.status = todo.done ? 'erledigt' : 'geplant';
    await save('lernraum_todos', window.state.todos);
    if (typeof window.renderTodos === 'function') window.renderTodos();
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
  }

  return {
    normalizeTask,
    filteredWorkspaceTasks,
    taskRangeDates,
    addTodo,
    toggleTodo,
    get taskRange() { return taskRange; },
    set taskRange(v) { taskRange = v; },
    get taskDisplay() { return taskDisplay; },
    set taskDisplay(v) { taskDisplay = v; },
    get taskStatusFilter() { return taskStatusFilter; },
    set taskStatusFilter(v) { taskStatusFilter = v; },
    get taskModuleFilter() { return taskModuleFilter; },
    set taskModuleFilter(v) { taskModuleFilter = v; },
    get taskSort() { return taskSort; },
    set taskSort(v) { taskSort = v; }
  };
})();

window.LernraumTasks = LernraumTasks;
