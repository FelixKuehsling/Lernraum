/* ============================================================
   LERNRAUM - BENACHRICHTIGUNGEN
   Browser Notifications API mit Zeit-Einstellungen
============================================================ */

let notificationsEnabled = false;
let notificationSettings = {
  calendarTime: 'day',
  deadlineTime: '3days'
};

// Initialize on load
function initializeNotifications() {
  try {
    const saved = localStorage.getItem('lernraum_notifications');
    if (saved) {
      const settings = JSON.parse(saved);
      notificationsEnabled = settings.enabled || false;
      notificationSettings = settings.settings || notificationSettings;
    }
  } catch (e) {
    console.error('Notifications init error:', e);
  }

  updateNotificationUI();

  if (notificationsEnabled && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  scheduleNotifications();
}

// Toggle notifications
function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;

  if (notificationsEnabled && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          notificationsEnabled = false;
          alert('Benachrichtigungen müssen im Browser aktiviert sein');
        }
      });
    }
  }

  updateNotificationUI();
  saveNotificationSettings();
}

// Update UI
function updateNotificationUI() {
  const toggle = document.getElementById('notif-toggle');
  const settings = document.getElementById('notif-settings');
  const calSelect = document.getElementById('cal-time');
  const deadlineSelect = document.getElementById('deadline-time');

  if (toggle) {
    if (notificationsEnabled) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
  if (settings) {
    settings.style.display = notificationsEnabled ? 'block' : 'none';
  }
  if (calSelect) calSelect.value = notificationSettings.calendarTime || 'day';
  if (deadlineSelect) deadlineSelect.value = notificationSettings.deadlineTime || '3days';
}

// Save settings
function saveNotificationSettings() {
  const calSelect = document.getElementById('cal-time');
  const deadlineSelect = document.getElementById('deadline-time');

  notificationSettings = {
    calendarTime: calSelect.value,
    deadlineTime: deadlineSelect.value
  };

  const data = {
    enabled: notificationsEnabled,
    settings: notificationSettings
  };

  localStorage.setItem('lernraum_notifications', JSON.stringify(data));
  alert('Benachrichtigungseinstellungen gespeichert!');
}

// Scheduler
function scheduleNotifications() {
  if (!notificationsEnabled) return;

  setInterval(() => {
    checkCalendarEvents();
    checkDeadlines();
  }, 60000);

  checkCalendarEvents();
  checkDeadlines();
}

// Check calendar events
function checkCalendarEvents() {
  if (!notificationsEnabled || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const events = localStorage.getItem('lernraum_events');
    if (!events) return;

    const eventsList = JSON.parse(events);
    const now = new Date();
    const notifiedKey = 'lernraum_notified_events';
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

    const minutesMap = {
      'week': 10080,
      '3days': 4320,
      'day': 1440,
      'hour': 60
    };

    const targetMinutes = minutesMap[notificationSettings.calendarTime] || 1440;

    eventsList.forEach(event => {
      const eventDate = new Date(event.date + 'T' + event.time);
      const diffMinutes = (eventDate - now) / (1000 * 60);
      const eventKey = event.id + '_' + notificationSettings.calendarTime;

      const buffer = Math.min(5, targetMinutes / 4);
      if (diffMinutes > (targetMinutes - buffer) && diffMinutes <= targetMinutes && !notified.includes(eventKey)) {
        const timeStr = notificationSettings.calendarTime === 'week' ? 'nächste Woche' :
                       notificationSettings.calendarTime === '3days' ? 'in 3 Tagen' :
                       notificationSettings.calendarTime === 'day' ? 'morgen' :
                       'bald';
        sendNotification(`📅 ${event.title}`, `${timeStr} um ${event.time}`);
        notified.push(eventKey);
      }
    });

    localStorage.setItem(notifiedKey, JSON.stringify(notified));
  } catch (e) {
    console.error('Calendar notification error:', e);
  }
}

// Check deadlines
function checkDeadlines() {
  if (!notificationsEnabled || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const todos = localStorage.getItem('lernraum_todos');
    if (!todos) return;

    const todoList = JSON.parse(todos);
    const now = new Date();
    const notifiedKey = 'lernraum_notified_deadlines';
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

    const daysMap = {
      'week': 7,
      '3days': 3,
      'day': 1,
      'hour': 0.05
    };

    const targetDays = daysMap[notificationSettings.deadlineTime] || 3;

    todoList.forEach(todo => {
      if (!todo.deadline) return;

      const deadlineDate = new Date(todo.deadline);
      const diffDays = (deadlineDate - now) / (1000 * 60 * 60 * 24);
      const todoKey = todo.id + '_' + notificationSettings.deadlineTime;

      const buffer = Math.min(0.2, targetDays / 4);
      if (diffDays > (targetDays - buffer) && diffDays <= targetDays && !notified.includes(todoKey)) {
        const timeStr = notificationSettings.deadlineTime === 'week' ? 'nächste Woche fällig' :
                       notificationSettings.deadlineTime === '3days' ? 'in 3 Tagen fällig' :
                       notificationSettings.deadlineTime === 'day' ? 'morgen fällig' :
                       'sehr bald fällig';
        sendNotification(`📝 ${todo.title}`, timeStr);
        notified.push(todoKey);
      }
    });

    localStorage.setItem(notifiedKey, JSON.stringify(notified));
  } catch (e) {
    console.error('Deadline notification error:', e);
  }
}

// Send notification
function sendNotification(title, options) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body: typeof options === 'string' ? options : options.body,
      icon: 'assets/app-icon-192.png',
      badge: 'assets/app-icon-192.png',
      tag: title,
      requireInteraction: false
    });
  } catch (e) {
    console.error('Send notification error:', e);
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
  try {
    initializeNotifications();
  } catch (e) {
    console.error('Notifications initialization error:', e);
  }
}
