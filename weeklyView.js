import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

function getWeekDateRange() {
  const start = new Date();
  const daysSinceSaturday = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - daysSinceSaturday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export function renderWeeklyView(container) {
  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>This Week's Habit & Goal Matrix</h2>
        <p id="weeklyRangeLabel">${getWeekDateRange()}</p>
      </div>
    </div>

    <!-- OVERALL PROGRESS PANEL -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Weekly Target Progress</h3>
          <p>Discipline builds momentum. Check each day as you fulfill your habits.</p>
        </div>
        <span class="stat-icon">✓</span>
      </div>

      <div class="weekly-summary-panel">
        <div>
          <div class="weekly-summary-label">Overall Completion</div>
          <div class="weekly-summary-number" id="weeklyPageOverallNumber">0%</div>
        </div>
        <div class="stat-caption" id="weeklyPageOverallCount">0 completed</div>
      </div>

      <div class="progress-track" style="height: 8px;">
        <div class="progress-fill" id="weeklyPageOverallFill" style="width: 0%;"></div>
      </div>
    </div>

    <!-- HABIT MATRIX TABLE -->
    <div class="panel" style="padding: 16px 20px;">
      <div class="weekly-table-wrap">
        <table class="weekly-table">
          <thead>
            <tr>
              <th style="text-align: left; padding-left: 16px;">Habit / Recurring Goal</th>
              <th>Sat</th>
              <th>Sun</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Progress</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="weeklyTableBody"></tbody>
        </table>
      </div>
    </div>

    <!-- ADD HABIT FORM -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Add New Weekly Habit</h3>
          <p>What routine or practice do you want to master this week?</p>
        </div>
        <span class="stat-icon">+</span>
      </div>

      <form id="weeklyNewHabitForm" style="display: grid; grid-template-columns: minmax(0, 1fr) 150px auto; gap: 12px; align-items: center;">
        <input class="field" id="weeklyHabitName" type="text" maxlength="100" placeholder="e.g. Gym Workout, Reading, Deep Work Block" required>
        <input class="field" id="weeklyHabitTarget" type="number" min="1" max="7" value="5" placeholder="Target days (1-7)" required>
        <button class="btn btn-primary" type="submit">+ Add Habit</button>
      </form>
    </div>
  `;

  // Render Table
  function renderMatrix() {
    const tbody = container.querySelector('#weeklyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const goals = store.state.weeklyGoals;

    let totalTarget = 0;
    let totalCompleted = 0;

    if (goals.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="padding: 24px; color: var(--muted); font-style: italic;">
            No weekly habits defined yet. Add your first habit below!
          </td>
        </tr>
      `;
    } else {
      goals.forEach(goal => {
        const days = Array.isArray(goal.days) ? goal.days : [false, false, false, false, false, false, false];
        const completedDays = days.filter(Boolean).length;
        const target = Number(goal.target) || 1;
        const progress = Math.min(100, Math.round((completedDays / target) * 100));

        totalTarget += target;
        totalCompleted += Math.min(completedDays, target);

        const row = document.createElement('tr');

        // Name cell
        const nameCell = document.createElement('td');
        nameCell.className = 'weekly-goal-name';
        nameCell.innerHTML = `
          ${goal.name}
          <span class="weekly-goal-target">Target: ${target} days/week</span>
        `;
        row.appendChild(nameCell);

        // Days 0..6
        days.forEach((checked, dayIdx) => {
          const td = document.createElement('td');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'weekly-check';
          cb.checked = checked;
          cb.setAttribute('aria-label', `${goal.name} Day ${dayIdx + 1}`);

          cb.addEventListener('change', async () => {
            try {
              await api.toggleWeeklyGoalDay(goal.id, dayIdx);
              await store.refreshAll();
            } catch {
              cb.checked = !cb.checked;
              Toast.error('Could not update habit');
            }
          });

          td.appendChild(cb);
          row.appendChild(td);
        });

        // Progress cell
        const progCell = document.createElement('td');
        progCell.className = 'weekly-progress-cell';
        progCell.innerHTML = `
          <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px;">${completedDays}/${target} days</div>
          <div class="progress-track" style="height: 5px;">
            <div class="progress-fill ${progress >= 100 ? 'green' : ''}" style="width: ${progress}%;"></div>
          </div>
        `;
        row.appendChild(progCell);

        // Delete cell
        const delCell = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'weekly-delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = `Delete ${goal.name}`;
        delBtn.addEventListener('click', () => {
          Modal.confirm({
            title: 'Delete Weekly Habit',
            message: `Delete habit "${goal.name}"?`,
            confirmText: 'Delete',
            onConfirm: async () => {
              try {
                await api.deleteWeeklyGoal(goal.id);
                Toast.success('Habit removed');
                await store.refreshAll();
              } catch {
                Toast.error('Could not delete habit');
              }
            }
          });
        });
        delCell.appendChild(delBtn);
        row.appendChild(delCell);

        tbody.appendChild(row);
      });
    }

    // Overall Progress
    const overall = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
    container.querySelector('#weeklyPageOverallNumber').textContent = `${overall}%`;
    container.querySelector('#weeklyPageOverallCount').textContent = `${totalCompleted} / ${totalTarget} target days completed`;
    container.querySelector('#weeklyPageOverallFill').style.width = `${overall}%`;
  }

  // Form submit
  const form = container.querySelector('#weeklyNewHabitForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nameInput = container.querySelector('#weeklyHabitName');
    const targetInput = container.querySelector('#weeklyHabitTarget');
    const name = nameInput.value.trim();
    const target = Number(targetInput.value);

    if (!name || target < 1 || target > 7) {
      Toast.error('Please enter a valid habit name and target days (1-7)');
      return;
    }

    try {
      await api.createWeeklyGoal({ name, target });
      nameInput.value = '';
      targetInput.value = '5';
      Toast.success('Weekly habit registered! ⚡');
      await store.refreshAll();
    } catch {
      Toast.error('Failed to create weekly habit');
    }
  });

  renderMatrix();
  store.subscribe('weeklyGoals', () => renderMatrix());
}
