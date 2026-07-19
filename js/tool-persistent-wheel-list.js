/* PERSISTENT_WHEEL_LIST — thin persistence layer over the Decision
   Wheel's existing engine (tool-decision-wheel.js), reused as-is rather
   than duplicated. Auto-saves the wheel's textarea to localStorage under
   whichever key the page declares via data-storage-key, and reloads it
   on return - the actual differentiator called for over a plain
   spin-a-list tool: your regular takeout spots or watchlist don't need
   retyping every visit. */

function initPersistentWheelList() {
  const textarea = document.getElementById("wheel-input");
  const key = textarea.dataset.storageKey;
  let saved;
  try { saved = localStorage.getItem(key); } catch { saved = null; }
  if (saved) {
    textarea.value = saved;
    redrawWheelFromInput();
  }
  textarea.addEventListener("input", () => {
    try { localStorage.setItem(key, textarea.value); } catch { /* localStorage unavailable - list just won't persist */ }
  });
}

document.addEventListener("DOMContentLoaded", initPersistentWheelList);
