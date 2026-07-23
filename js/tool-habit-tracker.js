/* HABIT_TRACKER — a few named habits, a simple grid of the last 21 days
   per habit, click a day to toggle it done. All local storage, no
   account. Dates are stored/keyed by local calendar day (YYYY-MM-DD via
   local getFullYear/getMonth/getDate, not toISOString(), which is UTC
   and would misfile a day near midnight for anyone not on UTC). */

const HABIT_KEY = "gama_habit_tracker_v1";
const HABIT_DAYS_SHOWN = 21;

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function habitDateForOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return localDateStr(d);
}

function loadHabitData() {
  try {
    const raw = localStorage.getItem(HABIT_KEY);
    if (!raw) return { habits: [], log: {} };
    const parsed = JSON.parse(raw);
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      log: parsed.log && typeof parsed.log === "object" ? parsed.log : {},
    };
  } catch {
    return { habits: [], log: {} };
  }
}

function saveHabitData(data) {
  try { localStorage.setItem(HABIT_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

function renderHabitTracker() {
  const data = loadHabitData();
  const container = document.getElementById("habit-list");
  container.textContent = "";

  if (!data.habits.length) {
    const empty = document.createElement("p");
    empty.style.color = "var(--phosphor-dim-text)";
    empty.style.fontSize = "0.85rem";
    empty.textContent = "// no habits tracked yet. add one above.";
    container.appendChild(empty);
    return;
  }

  const days = [];
  for (let i = HABIT_DAYS_SHOWN - 1; i >= 0; i--) days.push(habitDateForOffset(i));
  const todayStr = habitDateForOffset(0);

  data.habits.forEach((habit) => {
    const row = document.createElement("div");
    row.style.cssText = "margin-bottom:1.1rem;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem;";
    const name = document.createElement("span");
    name.textContent = habit.name;
    name.style.cssText = "flex:1; font-size:0.9rem;";
    const streak = document.createElement("span");
    streak.textContent = `${habitCurrentStreak(data.log[habit.id] || {}, days)} day streak`;
    streak.style.cssText = "color:var(--phosphor-dim-text); font-size:0.75rem;";
    const del = document.createElement("button");
    del.textContent = "×";
    del.setAttribute("aria-label", `delete ${habit.name}`);
    del.style.cssText = "background:none; border:none; color:var(--phosphor-dim-text); cursor:pointer; font-size:1rem; line-height:1;";
    del.addEventListener("click", () => executeHabitDelete(habit.id));
    header.appendChild(name);
    header.appendChild(streak);
    header.appendChild(del);
    row.appendChild(header);

    const grid = document.createElement("div");
    grid.style.cssText = "display:flex; gap:3px; flex-wrap:wrap;";
    const log = data.log[habit.id] || {};
    days.forEach((dateStr) => {
      const cell = document.createElement("div");
      const done = !!log[dateStr];
      cell.title = dateStr + (dateStr === todayStr ? " (today)" : "");
      cell.style.cssText = `width:16px; height:16px; cursor:pointer; border:1px solid var(--phosphor-dim, #1e3a1e); background:${done ? "var(--phosphor, #39ff14)" : "transparent"};` + (dateStr === todayStr ? " outline:1px solid var(--phosphor, #39ff14); outline-offset:1px;" : "");
      cell.addEventListener("click", () => executeHabitToggleDay(habit.id, dateStr));
      grid.appendChild(cell);
    });
    row.appendChild(grid);
    container.appendChild(row);
  });
}

function habitCurrentStreak(log, daysAscending) {
  const mostRecentFirst = [...daysAscending].reverse();
  let streak = 0;
  for (const d of mostRecentFirst) {
    if (log[d]) streak++; else break;
  }
  return streak;
}

function executeHabitAdd() {
  const input = document.getElementById("habit-input");
  const text = input.value.trim();
  if (!text) return;
  const data = loadHabitData();
  data.habits.push({ id: Date.now() + "-" + Math.random().toString(36).slice(2), name: text });
  saveHabitData(data);
  renderHabitTracker();
  input.value = "";
  input.focus();
  GAMA.say("success");
}

function executeHabitDelete(id) {
  const data = loadHabitData();
  data.habits = data.habits.filter((h) => h.id !== id);
  delete data.log[id];
  saveHabitData(data);
  renderHabitTracker();
}

function executeHabitToggleDay(habitId, dateStr) {
  const data = loadHabitData();
  if (!data.log[habitId]) data.log[habitId] = {};
  if (data.log[habitId][dateStr]) delete data.log[habitId][dateStr];
  else data.log[habitId][dateStr] = true;
  saveHabitData(data);
  renderHabitTracker();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("habit-list")) renderHabitTracker();
});
