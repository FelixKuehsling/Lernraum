/* ============================================================
   LERNRAUM – RECURRING MODULE
   Recurring tasks, events, smart recurrence patterns
============================================================ */

const LernraumRecurring = (() => {
  const PATTERNS = {
    none: { name: 'Keine Wiederholung', value: 'none' },
    daily: { name: 'Täglich', value: 'daily' },
    weekdays: { name: 'Werktags (Mo-Fr)', value: 'weekdays' },
    weekends: { name: 'Wochenende (Sa-So)', value: 'weekends' },
    weekly: { name: 'Wöchentlich', value: 'weekly' },
    biweekly: { name: 'Alle 2 Wochen', value: 'biweekly' },
    monthly: { name: 'Monatlich', value: 'monthly' },
    quarterly: { name: 'Quartalsweise', value: 'quarterly' },
    yearly: { name: 'Jährlich', value: 'yearly' },
    custom: { name: 'Benutzerdefiniert', value: 'custom' }
  };

  /**
   * Create Recurring Item (Task or Event)
   */
  function createRecurring(item, pattern, options = {}) {
    return {
      ...item,
      recurring: {
        pattern,
        startDate: options.startDate || new Date().toISOString().split('T')[0],
        endDate: options.endDate || null,
        interval: options.interval || 1,
        daysOfWeek: options.daysOfWeek || [], // Für weekly
        dayOfMonth: options.dayOfMonth || null, // Für monthly
        skipped: options.skipped || [], // Array von skipped occurrences
        metadata: {
          createdAt: Date.now(),
          lastGenerated: null
        }
      }
    };
  }

  /**
   * Generate Occurrences - Erstelle einzelne Instanzen
   */
  function generateOccurrences(recurringItem, fromDate, toDate, limit = 52) {
    const { recurring, ...baseItem } = recurringItem;
    if (!recurring || recurring.pattern === 'none') return [baseItem];

    const occurrences = [];
    let currentDate = new Date(recurring.startDate);
    const endDate = toDate ? new Date(toDate) : new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 Jahr

    if (recurring.endDate) {
      endDate.setTime(Math.min(
        endDate.getTime(),
        new Date(recurring.endDate).getTime()
      ));
    }

    let count = 0;

    while (currentDate <= endDate && count < limit) {
      const dateStr = formatISO(currentDate);

      // Prüfe ob übersprungen
      if (!recurring.skipped?.includes(dateStr)) {
        occurrences.push({
          ...baseItem,
          id: `${baseItem.id}_${dateStr}`,
          parentId: baseItem.id,
          occurrenceDate: dateStr,
          isRecurrenceInstance: true,
          dueDate: dateStr,
          deadline: dateStr
        });
      }

      // Next Occurrence
      currentDate = nextOccurrence(currentDate, recurring);
      count++;
    }

    return occurrences;
  }

  /**
   * Calculate Next Occurrence Date
   */
  function nextOccurrence(currentDate, recurring) {
    const { pattern, interval, daysOfWeek } = recurring;
    const next = new Date(currentDate);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + interval);
        break;

      case 'weekdays':
        let dayCount = 0;
        while (dayCount < 1) {
          next.setDate(next.getDate() + 1);
          const day = next.getDay();
          if (day >= 1 && day <= 5) dayCount++;
        }
        break;

      case 'weekends':
        let weekendCount = 0;
        while (weekendCount < 1) {
          next.setDate(next.getDate() + 1);
          const day = next.getDay();
          if (day === 0 || day === 6) weekendCount++;
        }
        break;

      case 'weekly':
        next.setDate(next.getDate() + (interval * 7));
        break;

      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;

      case 'monthly':
        const day = currentDate.getDate();
        next.setMonth(next.getMonth() + interval);
        next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        break;

      case 'quarterly':
        next.setMonth(next.getMonth() + (3 * interval));
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + interval);
        break;

      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Skip Occurrence
   */
  function skipOccurrence(recurringItem, dateStr) {
    if (!recurringItem.recurring) return recurringItem;
    if (!recurringItem.recurring.skipped) {
      recurringItem.recurring.skipped = [];
    }
    if (!recurringItem.recurring.skipped.includes(dateStr)) {
      recurringItem.recurring.skipped.push(dateStr);
    }
    return recurringItem;
  }

  /**
   * Unskip Occurrence
   */
  function unskipOccurrence(recurringItem, dateStr) {
    if (!recurringItem.recurring?.skipped) return recurringItem;
    recurringItem.recurring.skipped = recurringItem.recurring.skipped.filter(d => d !== dateStr);
    return recurringItem;
  }

  /**
   * Modify Occurrence - Change one specific instance
   */
  function modifyOccurrence(parentItem, dateStr, changes) {
    return {
      ...parentItem,
      id: `${parentItem.id}_${dateStr}_modified`,
      parentId: parentItem.id,
      occurrenceDate: dateStr,
      isRecurrenceInstance: true,
      ...changes
    };
  }

  /**
   * Convert to HTML Select Options
   */
  function getRecurrenceOptions() {
    return Object.entries(PATTERNS).map(([key, pattern]) => ({
      value: key,
      label: pattern.name
    }));
  }

  /**
   * Human-readable recurrence text
   */
  function getRecurrenceText(recurringItem) {
    if (!recurringItem.recurring) return 'Keine Wiederholung';

    const { pattern, interval, daysOfWeek } = recurringItem.recurring;
    const patternName = PATTERNS[pattern]?.name || pattern;

    if (interval > 1) {
      return `${patternName} (alle ${interval})`;
    }
    return patternName;
  }

  /**
   * Format date as ISO (YYYY-MM-DD)
   */
  function formatISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get next N occurrences for preview
   */
  function getNextOccurrences(recurringItem, count = 5) {
    return generateOccurrences(
      recurringItem,
      new Date(),
      null,
      count
    ).slice(0, count);
  }

  /**
   * Get Recurrence Form HTML
   */
  function getRecurrenceForm(itemId = 'new') {
    const options = getRecurrenceOptions();
    let html = `
      <div class="recurrence-form">
        <label for="recurrence-${itemId}">Wiederholung:</label>
        <select id="recurrence-${itemId}" class="recurrence-select" onchange="LernraumRecurring.onPatternChange(this)">
    `;

    options.forEach(opt => {
      html += `<option value="${opt.value}">${opt.label}</option>`;
    });

    html += `
        </select>

        <div id="recurrence-options-${itemId}" class="recurrence-options" style="display:none; margin-top: 12px;">
          <label>
            <span>Intervall:</span>
            <input type="number" id="recurrence-interval-${itemId}" value="1" min="1" max="52">
          </label>

          <label>
            <span>Ende-Datum (optional):</span>
            <input type="date" id="recurrence-end-${itemId}">
          </label>

          <div id="recurrence-preview-${itemId}" style="margin-top: 12px; padding: 10px; background: var(--bg-soft); border-radius: var(--radius-md); font-size: 12px;">
          </div>
        </div>
      </div>
    `;

    return html;
  }

  function onPatternChange(selectEl) {
    const pattern = selectEl.value;
    const itemId = selectEl.id.replace('recurrence-', '');
    const optionsDiv = document.getElementById(`recurrence-options-${itemId}`);

    if (pattern === 'none') {
      optionsDiv.style.display = 'none';
    } else {
      optionsDiv.style.display = 'block';
      updateRecurrencePreview(itemId, pattern);
    }
  }

  function updateRecurrencePreview(itemId, pattern) {
    const previewDiv = document.getElementById(`recurrence-preview-${itemId}`);
    if (!previewDiv) return;

    const mockItem = {
      id: 'preview',
      recurring: {
        pattern,
        startDate: new Date().toISOString().split('T')[0]
      }
    };

    const occurrences = generateOccurrences(mockItem, new Date(), null, 5);
    let html = '<strong>Vorschau:</strong><br>';
    occurrences.slice(0, 5).forEach(occ => {
      const date = new Date(occ.dueDate);
      html += `${date.toLocaleDateString('de-DE', { weekday: 'short', month: 'short', day: 'numeric' })}<br>`;
    });

    previewDiv.innerHTML = html;
  }

  return {
    PATTERNS,
    createRecurring,
    generateOccurrences,
    nextOccurrence,
    skipOccurrence,
    unskipOccurrence,
    modifyOccurrence,
    getRecurrenceOptions,
    getRecurrenceText,
    getNextOccurrences,
    getRecurrenceForm,
    onPatternChange,
    formatISO
  };
})();

window.LernraumRecurring = LernraumRecurring;
