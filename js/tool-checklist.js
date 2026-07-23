/* CHECKLIST — minimal local-storage to-do list, no account/sync. Items
   render via DOM node construction (textContent), never innerHTML with
   user-supplied text - a checklist that lets pasted text inject markup
   into its own list is a real (if low-stakes) self-XSS bug, not just a
   style choice. */

const CHECKLIST_KEY = "gama_checklist_v1";

function loadChecklistItems() {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChecklistItems(items) {
  try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items)); } catch { /* storage unavailable - list just won't persist */ }
}

function renderChecklist(items) {
  const list = document.getElementById("checklist-list");
  list.textContent = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.style.cssText = "display:flex; align-items:center; gap:0.6rem; padding:0.4rem 0; border-bottom:1px solid var(--phosphor-dim, #1e3a1e);";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!item.done;
    checkbox.addEventListener("change", () => executeChecklistToggle(item.id));

    const label = document.createElement("span");
    label.textContent = item.text;
    label.style.cssText = item.done
      ? "flex:1; text-decoration:line-through; color:var(--phosphor-dim-text);"
      : "flex:1;";

    const del = document.createElement("button");
    del.textContent = "×";
    del.setAttribute("aria-label", "delete task");
    del.style.cssText = "background:none; border:none; color:var(--phosphor-dim-text); cursor:pointer; font-size:1.1rem; line-height:1; padding:0 0.3rem;";
    del.addEventListener("click", () => executeChecklistDelete(item.id));

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(del);
    list.appendChild(li);
  });

  const doneCount = items.filter((i) => i.done).length;
  const countEl = document.getElementById("checklist-count");
  if (countEl) {
    countEl.textContent = items.length
      ? `${doneCount}/${items.length} done`
      : "// list is empty.";
  }
}

function executeChecklistAdd() {
  const input = document.getElementById("checklist-input");
  const text = input.value.trim();
  if (!text) return;
  const items = loadChecklistItems();
  items.push({ id: Date.now() + "-" + Math.random().toString(36).slice(2), text, done: false });
  saveChecklistItems(items);
  renderChecklist(items);
  input.value = "";
  input.focus();
  GAMA.say("success");
}

function executeChecklistToggle(id) {
  const items = loadChecklistItems();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.done = !item.done;
  saveChecklistItems(items);
  renderChecklist(items);
}

function executeChecklistDelete(id) {
  const items = loadChecklistItems().filter((i) => i.id !== id);
  saveChecklistItems(items);
  renderChecklist(items);
}

function executeChecklistClearDone() {
  const items = loadChecklistItems().filter((i) => !i.done);
  saveChecklistItems(items);
  renderChecklist(items);
  GAMA.say("idle");
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("checklist-list")) renderChecklist(loadChecklistItems());
});
