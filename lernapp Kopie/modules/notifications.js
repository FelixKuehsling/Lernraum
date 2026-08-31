/* ============================================================
   LERNRAUM – SMART NOTIFICATIONS MODULE
   Intelligent reminders, learning notifications, motivational messages
============================================================ */

const LernraumNotifications = (() => {
  const NOTIFICATION_TYPES = {
    TASK_REMINDER: 'task_reminder',
    TASK_DUE_TODAY: 'task_due_today',
    TASK_OVERDUE: 'task_overdue',
    LEARNING_REMINDER: 'learning_reminder',
    STREAK_MILESTONE: 'streak_milestone',
    STUDY_SESSION: 'study_session',
    GOAL_PROGRESS: 'goal_progress',
    CUSTOM: 'custom'
  };

  let settings = {
    enabled: true,
    dndStart: '22:00',
    dndEnd: '08:00',
    taskReminders: true,
    learningReminders: true,
    motivationalMessages: true,
    soundEnabled: false
  };

  /**
   * Initialisiere Smart Notifications
   */
  function init() {
    loadSettings();
    setupReminders();
    console.log('✅ Smart Notifications initialized');
  }

  /**
   * Checke ob gerade "Do Not Disturb" aktiv ist
   */
  function isInDND() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (settings.dndStart > settings.dndEnd) {
      // z.B. 22:00 bis 08:00
      return currentTime >= settings.dndStart || currentTime < settings.dndEnd;
    } else {
      // z.B. 08:00 bis 22:00
      return currentTime >= settings.dndStart && currentTime < settings.dndEnd;
    }
  }

  /**
   * Task Reminder - Vor Deadline
   */
  function checkTaskReminders() {
    if (!settings.enabled || !settings.taskReminders) return;

    const todos = window.state?.todos || [];
    const now = new Date();

    todos.forEach(todo => {
      if (todo.done || !todo.dueDate && !todo.deadline) return;

      const dueDate = new Date(todo.dueDate || todo.deadline);
      const diffHours = (dueDate - now) / (1000 * 60 * 60);

      // Reminder 24h vorher
      if (diffHours > 0 && diffHours <= 24 && !todo.reminderShown24h) {
        notify({
          type: NOTIFICATION_TYPES.TASK_REMINDER,
          title: 'Aufgabe fällig morgen',
          message: `"${todo.text}" ist morgen fällig`,
          action: () => goToView('todo')
        });
        todo.reminderShown24h = true;
      }

      // Reminder 1h vorher
      if (diffHours > 0 && diffHours <= 1 && !todo.reminderShown1h) {
        notify({
          type: NOTIFICATION_TYPES.TASK_DUE_TODAY,
          title: 'Aufgabe in 1h fällig!',
          message: `"${todo.text}" wird bald fällig`,
          action: () => goToView('todo'),
          priority: 'high'
        });
        todo.reminderShown1h = true;
      }

      // Overdue warning
      if (diffHours < 0 && !todo.overdueShown) {
        notify({
          type: NOTIFICATION_TYPES.TASK_OVERDUE,
          title: '⚠️ Aufgabe überfällig!',
          message: `"${todo.text}" ist seit ${Math.abs(Math.floor(diffHours))}h fällig`,
          action: () => goToView('todo'),
          priority: 'critical'
        });
        todo.overdueShown = true;
      }
    });
  }

  /**
   * Learning Reminder - Zeit zu lernen
   */
  function checkLearningReminder() {
    if (!settings.enabled || !settings.learningReminders) return;
    if (isInDND()) return;

    const lastLearningTime = localStorage.getItem('lernraum_last_learning');
    const now = Date.now();
    const hoursWithoutLearning = (now - (lastLearningTime || now)) / (1000 * 60 * 60);

    // Reminder nach 12h ohne Lernen
    if (hoursWithoutLearning > 12) {
      notify({
        type: NOTIFICATION_TYPES.LEARNING_REMINDER,
        title: '📚 Zeit zum Lernen?',
        message: `Du hast ${Math.floor(hoursWithoutLearning)}h nicht gelernt. Jetzt eine kurze Einheit?`,
        action: () => goToView('cards'),
        icon: '📚'
      });
    }
  }

  /**
   * Streak Milestone
   */
  function checkStreakMilestone(streakDays) {
    if (!settings.enabled || !settings.motivationalMessages) return;

    const milestones = [7, 14, 30, 100, 365];
    const wasShown = localStorage.getItem(`streak_milestone_${streakDays}`);

    if (milestones.includes(streakDays) && !wasShown) {
      const messages = {
        7: '🔥 7 Tage Lernstreak! Super Anfang!',
        14: '🌟 14 Tage Lernstreak! Du machst das super!',
        30: '🏆 30 Tage Lernstreak! Du bist unglaublich!',
        100: '👑 100 Tage Lernstreak! LEGENDE!',
        365: '🎉 365 Tage Lernstreak! Du hast es geschafft!'
      };

      notify({
        type: NOTIFICATION_TYPES.STREAK_MILESTONE,
        title: messages[streakDays],
        message: 'Beeindruckend! Mach weiter so!',
        priority: 'high',
        duration: 0 // Länger anzeigen
      });

      localStorage.setItem(`streak_milestone_${streakDays}`, 'true');
    }
  }

  /**
   * Motivational Message
   */
  function sendMotivationalMessage() {
    if (!settings.enabled || !settings.motivationalMessages) return;
    if (isInDND()) return;

    const messages = [
      '💪 Du schaffst das! Kleine Schritte führen zu großen Zielen.',
      '🌟 Jeden Tag ein bisschen lernen - das ist der Weg zum Erfolg!',
      '🎯 Konzentriere dich jetzt 25 Minuten. Du packst das!',
      '✨ Dein zukünftiges Ich wird dir dafür danken!',
      '🚀 Du bist auf dem richtigen Weg. Weiter so!',
      '📚 Lernen ist wie ein Muskel - je mehr du trainierst, desto stärker wird er.',
      '🏆 Jede Minute Lernen zählt. Großartig gemacht!',
      '💡 Fragen ist ein Zeichen von Intelligenz. Weiter forschen!'
    ];

    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    notify({
      type: NOTIFICATION_TYPES.CUSTOM,
      message: randomMsg,
      priority: 'low',
      duration: 4000
    });
  }

  /**
   * Main Notification Function
   */
  function notify(options) {
    const {
      type = NOTIFICATION_TYPES.CUSTOM,
      title = '',
      message = '',
      action = null,
      icon = '💬',
      priority = 'normal',
      duration = 5000
    } = options;

    // Prüfe DND
    if (priority !== 'critical' && isInDND()) return;

    // Nutze LernraumUI für Anzeigeisnotification
    if (typeof LernraumUI !== 'undefined') {
      const typeMap = {
        [NOTIFICATION_TYPES.TASK_OVERDUE]: 'error',
        [NOTIFICATION_TYPES.STREAK_MILESTONE]: 'success',
        [NOTIFICATION_TYPES.LEARNING_REMINDER]: 'info'
      };

      const uiType = typeMap[type] || 'info';
      LernraumUI.notify(
        title ? `${title}\n${message}` : message,
        uiType,
        duration
      );
    }

    // Browser Notification (falls Permission)
    if (Notification.permission === 'granted' && settings.soundEnabled) {
      new Notification(title || 'Lernraum', {
        body: message,
        icon: '/assets/app-icon-192.png',
        tag: type,
        badge: icon
      });
    }

    // Speichere Benachrichtigung
    storeNotification({ type, title, message, timestamp: Date.now() });

    // Call action wenn vorhanden
    if (action) {
      setTimeout(action, 1000);
    }
  }

  /**
   * Setup Interval Checks
   */
  function setupReminders() {
    // Check every 5 minutes
    setInterval(() => {
      checkTaskReminders();
      checkLearningReminder();
    }, 5 * 60 * 1000);

    // Motivational message every 2 hours
    setInterval(() => {
      sendMotivationalMessage();
    }, 2 * 60 * 60 * 1000);

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Store Notification History
   */
  function storeNotification(notification) {
    const key = 'lernraum_notifications';
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    stored.push(notification);
    // Keep only last 50
    if (stored.length > 50) {
      stored.shift();
    }
    localStorage.setItem(key, JSON.stringify(stored));
  }

  /**
   * Get Notification Settings
   */
  function getSettings() {
    return { ...settings };
  }

  /**
   * Update Settings
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    localStorage.setItem('lernraum_notification_settings', JSON.stringify(settings));
  }

  /**
   * Load Settings from Storage
   */
  function loadSettings() {
    const stored = localStorage.getItem('lernraum_notification_settings');
    if (stored) {
      settings = { ...settings, ...JSON.parse(stored) };
    }
  }

  /**
   * Global Helpers
   */
  function goToView(view) {
    if (typeof window.goToView === 'function') {
      window.goToView(view);
    }
  }

  return {
    NOTIFICATION_TYPES,
    init,
    notify,
    checkTaskReminders,
    checkLearningReminder,
    checkStreakMilestone,
    sendMotivationalMessage,
    getSettings,
    updateSettings,
    isInDND
  };
})();

window.LernraumNotifications = LernraumNotifications;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    LernraumNotifications.init();
  });
} else {
  LernraumNotifications.init();
}
