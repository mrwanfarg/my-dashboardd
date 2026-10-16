import { store } from '../store.js';
import { api } from '../api.js';
import { createTaskCard, openEditTaskModal } from '../components/TaskCard.js';
import { Toast } from '../components/Toast.js';
import { createEmptyState } from '../components/EmptyState.js';

let timerInterval = null;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function renderTodayView(container) {
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Today's Command Schedule</h2>
        <p>Prioritize your time blocks and enter deep focus flow.</p>
      </div>
      <button class="btn btn-primary" id="todayAddTaskBtn">+ Schedule for Today</button>
    </div>

    <div class="today-grid">
      <!-- TIME SLOTS TIMELINE -->
      <div class="timeline-column">
        <!-- MORNING -->
        <div class="timeline-block">
          <div class="timeline-header">
            <div class="timeline-title">🌅 Morning Deep Work</div>
            <div class="timeline-time">08:00 — 12:00</div>
          </div>
          <div class="task-list" id="slotMorningTasks"></div>
        </div>

        <!-- AFTERNOON -->
        <div class="timeline-block">
          <div class="timeline-header">
            <div class="timeline-title">☀️ Afternoon Execution</div>
            <div class="timeline-time">12:00 — 17:00</div>
          </div>
          <div class="task-list" id="slotAfternoonTasks"></div>
        </div>

        <!-- EVENING -->
        <div class="timeline-block">
          <div class="timeline-header">
            <div class="timeline-title">🌙 Evening Wrap-up</div>
            <div class="timeline-time">17:00 — 21:00</div>
          </div>
          <div class="task-list" id="slotEveningTasks"></div>
        </div>
      </div>

      <!-- FOCUS TIMER & POMODORO WIDGET -->
      <div class="focus-column">
        <div class="focus-timer-card">
          <div class="eyebrow" style="color: var(--violet-light);">DEEP WORK POMODORO</div>
          <h3 id="timerTaskTitle" style="font-size: 15px; margin: 4px 0 8px;">General Focus Session</h3>
          <div class="timer-status-text" id="timerModeText">Work Session · Stay disciplined</div>

          <div class="timer-display" id="timerClockDisplay">25:00</div>

          <div class="timer-controls">
            <button class="btn btn-primary" id="timerStartBtn">▶ Start Focus</button>
            <button class="btn btn-secondary" id="timerResetBtn">↺ Reset</button>
            <button class="btn btn-secondary" id="timerAddFiveBtn">+5 min</button>
          </div>

          <div style="display: flex; justify-content: center; gap: 8px; margin-top: 18px;">
            <button class="filter-pill active" id="timerModeWork">25m Work</button>
            <button class="filter-pill" id="timerModeBreak">5m Break</button>
          </div>

          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border);">
            <button class="btn btn-success btn-small" id="timerLogSessionBtn">✓ Log Completed Focus Session</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add Task Button
  container.querySelector('#todayAddTaskBtn').addEventListener('click', () => {
    openEditTaskModal({ dueDate: today });
  });

  // Render Time Slot Blocks
  function renderSlots() {
    const todayTasks = store.state.tasks.filter(t => t.dueDate === today);
    const morningEl = container.querySelector('#slotMorningTasks');
    const afternoonEl = container.querySelector('#slotAfternoonTasks');
    const eveningEl = container.querySelector('#slotEveningTasks');

    morningEl.innerHTML = '';
    afternoonEl.innerHTML = '';
    eveningEl.innerHTML = '';

    const morningTasks = todayTasks.filter(t => !t.timeSlot || t.timeSlot === 'morning');
    const afternoonTasks = todayTasks.filter(t => t.timeSlot === 'afternoon');
    const eveningTasks = todayTasks.filter(t => t.timeSlot === 'evening');

    const renderList = (el, list, emptyMsg) => {
      if (list.length === 0) {
        el.innerHTML = `<div style="color: var(--muted); font-size: 11px; padding: 10px; font-style: italic;">${emptyMsg}</div>`;
      } else {
        list.forEach(t => el.appendChild(createTaskCard(t, { compact: true })));
      }
    };

    renderList(morningEl, morningTasks, 'No morning tasks scheduled.');
    renderList(afternoonEl, afternoonTasks, 'No afternoon tasks scheduled.');
    renderList(eveningEl, eveningTasks, 'No evening tasks scheduled.');
  }

  // TIMER LOGIC
  const clockEl = container.querySelector('#timerClockDisplay');
  const startBtn = container.querySelector('#timerStartBtn');
  const resetBtn = container.querySelector('#timerResetBtn');
  const addFiveBtn = container.querySelector('#timerAddFiveBtn');
  const modeWorkBtn = container.querySelector('#timerModeWork');
  const modeBreakBtn = container.querySelector('#timerModeBreak');
  const logBtn = container.querySelector('#timerLogSessionBtn');
  const taskTitleEl = container.querySelector('#timerTaskTitle');

  function updateClockDisplay() {
    clockEl.textContent = formatTime(store.state.timer.secondsLeft);
    startBtn.textContent = store.state.timer.isRunning ? '⏸ Pause' : '▶ Start Focus';
    if (store.state.timer.activityName) {
      taskTitleEl.textContent = store.state.timer.activityName;
    }
  }

  startBtn.addEventListener('click', () => {
    const isRunning = !store.state.timer.isRunning;
    store.state.timer.isRunning = isRunning;
    if (isRunning) {
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (store.state.timer.secondsLeft > 0) {
          store.state.timer.secondsLeft--;
          updateClockDisplay();
        } else {
          clearInterval(timerInterval);
          store.state.timer.isRunning = false;
          updateClockDisplay();
          Toast.success('🎉 Pomodoro Session Completed! Take a break.');
        }
      }, 1000);
    } else {
      clearInterval(timerInterval);
    }
    updateClockDisplay();
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    store.state.timer.isRunning = false;
    store.state.timer.secondsLeft = store.state.timer.totalSeconds;
    updateClockDisplay();
  });

  addFiveBtn.addEventListener('click', () => {
    store.state.timer.secondsLeft += 300;
    store.state.timer.totalSeconds += 300;
    updateClockDisplay();
  });

  modeWorkBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    modeWorkBtn.classList.add('active');
    modeBreakBtn.classList.remove('active');
    store.state.timer.mode = 'work';
    store.state.timer.isRunning = false;
    store.state.timer.secondsLeft = 25 * 60;
    store.state.timer.totalSeconds = 25 * 60;
    container.querySelector('#timerModeText').textContent = 'Work Session · Deep focus flow';
    updateClockDisplay();
  });

  modeBreakBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    modeBreakBtn.classList.add('active');
    modeWorkBtn.classList.remove('active');
    store.state.timer.mode = 'break';
    store.state.timer.isRunning = false;
    store.state.timer.secondsLeft = 5 * 60;
    store.state.timer.totalSeconds = 5 * 60;
    container.querySelector('#timerModeText').textContent = 'Short Break · Hydrate and stretch';
    updateClockDisplay();
  });

  logBtn.addEventListener('click', async () => {
    const elapsedMinutes = Math.max(1, Math.round((store.state.timer.totalSeconds - store.state.timer.secondsLeft) / 60)) || 25;
    try {
      await api.logTimeSession({
        activityName: store.state.timer.activityName || 'Deep Work Session',
        taskId: store.state.timer.linkedTaskId,
        durationMinutes: elapsedMinutes,
        notes: `Focus session recorded on ${today}`
      });
      Toast.success(`Logged ${elapsedMinutes}m focus session to backend! ⚡`);
      await store.refreshAll();
    } catch {
      Toast.error('Could not log focus session');
    }
  });

  renderSlots();
  updateClockDisplay();

  store.subscribe('tasks', () => renderSlots());
}
