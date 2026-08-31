/* ============================================================
   LERNRAUM – ANALYTICS MODULE
   Learning insights, productivity stats, trends
============================================================ */

const LernraumAnalytics = (() => {
  /**
   * Calculate Learning Streak
   */
  function getStreak() {
    const history = window.learningHistory || [];
    if (!history.length) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateStr = formatISO(currentDate);
      const hasEntry = history.some(h => h.date === dateStr && h.duration > 0);

      if (!hasEntry) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * Calculate Weekly Learning Time
   */
  function getWeeklyLearningTime() {
    const history = window.learningHistory || [];
    const week = {};

    const mondayDate = new Date();
    const day = mondayDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    mondayDate.setDate(mondayDate.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate);
      date.setDate(date.getDate() + i);
      const dateStr = formatISO(date);
      const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });

      const dayTotal = history
        .filter(h => h.date === dateStr)
        .reduce((sum, h) => sum + (h.duration || 0), 0);

      week[dayName] = Math.round(dayTotal / 60); // In Minuten
    }

    return week;
  }

  /**
   * Get Learning by Subject
   */
  function getLearningBySubject() {
    const todos = window.state?.todos || [];
    const subjects = {};

    todos.forEach(todo => {
      const subject = todo.moduleId || 'Sonstiges';
      if (!subjects[subject]) {
        subjects[subject] = { count: 0, done: 0 };
      }
      subjects[subject].count++;
      if (todo.done) subjects[subject].done++;
    });

    return subjects;
  }

  /**
   * Get Productivity Score (0-100)
   */
  function getProductivityScore() {
    const todos = window.state?.todos || [];
    const today = new Date().toISOString().split('T')[0];

    const todaysTodos = todos.filter(t => {
      const dueDate = t.dueDate || t.deadline || t.date;
      return dueDate === today;
    });

    if (todaysTodos.length === 0) return 50;

    const completed = todaysTodos.filter(t => t.done).length;
    const score = Math.round((completed / todaysTodos.length) * 100);

    return Math.min(100, score);
  }

  /**
   * Get Next Learning Recommendation
   */
  function getRecommendation() {
    const todos = window.state?.todos || [];
    const now = new Date();

    const urgent = todos.find(t => {
      if (t.done) return false;
      const dueDate = new Date(t.dueDate || t.deadline || t.date || '9999-12-31');
      const hours = (dueDate - now) / (1000 * 60 * 60);
      return hours > 0 && hours <= 24;
    });

    if (urgent) {
      return `Konzentriere dich auf: "${urgent.text}"`;
    }

    const streak = getStreak();
    if (streak > 0 && streak % 7 === 0) {
      return `🔥 ${streak} Tage Streak! Mach weiter so!`;
    }

    return 'Einen Moment Lernen würde dir gut tun!';
  }

  /**
   * Generate Dashboard HTML
   */
  function getDashboardHTML() {
    const streak = getStreak();
    const weekly = getWeeklyLearningTime();
    const subjects = getLearningBySubject();
    const score = getProductivityScore();
    const recommendation = getRecommendation();

    const weeklyDays = Object.entries(weekly);
    const subjectEntries = Object.entries(subjects);
    const maxMinutes = Math.max(...Object.values(weekly), 60);

    return `
      <div class="analytics-grid">
        <!-- Streaks & Score -->
        <div class="analytics-card">
          <div class="analytics-stat">
            <div class="stat-value">🔥 ${streak}</div>
            <div class="stat-label">Tage Lernstreak</div>
          </div>
          <div class="analytics-stat">
            <div class="stat-value">⭐ ${score}%</div>
            <div class="stat-label">Produktivität heute</div>
          </div>
        </div>

        <!-- Weekly Chart -->
        <div class="analytics-card">
          <div class="stat-label">Lernzeit diese Woche</div>
          <div class="weekly-chart">
            ${weeklyDays.map(([day, minutes]) => {
              const height = (minutes / maxMinutes) * 100 || 10;
              return `
                <div class="chart-bar">
                  <div class="bar-fill" style="height: ${height}%; background: var(--sage);" title="${minutes}min"></div>
                  <div class="bar-label">${day}</div>
                  <div class="bar-value">${minutes}m</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- By Subject -->
        <div class="analytics-card">
          <div class="stat-label">Nach Fach</div>
          <div class="subject-list">
            ${subjectEntries.map(([subject, data]) => {
              const percent = Math.round((data.done / data.count) * 100) || 0;
              return `
                <div class="subject-row">
                  <div class="subject-name">${subject}</div>
                  <div class="subject-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="progress-text">${data.done}/${data.count}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recommendation -->
        <div class="analytics-card recommendation">
          <div class="recommendation-icon">💡</div>
          <div class="recommendation-text">${recommendation}</div>
        </div>
      </div>

      <style>
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          padding: 16px;
        }
        .analytics-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .analytics-stat {
          text-align: center;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          font-family: 'Fraunces', serif;
          color: var(--sage-dark);
        }
        .stat-label {
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 4px;
        }
        .weekly-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 8px;
          height: 150px;
        }
        .chart-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          height: 100%;
          justify-content: flex-end;
        }
        .bar-fill {
          width: 100%;
          border-radius: 4px 4px 0 0;
          transition: all 0.3s ease;
        }
        .bar-fill:hover {
          opacity: 0.8;
        }
        .bar-label {
          font-size: 11px;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .bar-value {
          font-size: 10px;
          color: var(--ink-faint);
        }
        .subject-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .subject-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 12px;
          align-items: center;
        }
        .subject-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .subject-progress {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .progress-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-soft);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--sage);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .progress-text {
          font-size: 11px;
          color: var(--ink-soft);
          min-width: 40px;
          text-align: right;
        }
        .recommendation {
          grid-column: 1 / -1;
          background: var(--sage-tint);
          border: 1px solid var(--sage);
          flex-direction: row;
          align-items: center;
          gap: 16px;
        }
        .recommendation-icon {
          font-size: 32px;
          flex-shrink: 0;
        }
        .recommendation-text {
          font-size: 14px;
          color: var(--sage-dark);
          font-weight: 600;
        }
      </style>
    `;
  }

  /**
   * Format ISO Date
   */
  function formatISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return {
    getStreak,
    getWeeklyLearningTime,
    getLearningBySubject,
    getProductivityScore,
    getRecommendation,
    getDashboardHTML
  };
})();

window.LernraumAnalytics = LernraumAnalytics;
