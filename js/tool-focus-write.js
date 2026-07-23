/* FOCUS_WRITE — minimal distraction-free writing tool. Word count,
   local-storage autosave (debounced), optional typewriter-scroll mode.

   Typewriter scroll keeps the caret's line vertically centered as you
   type - useful, but only if it tracks *rendered* (wrapped) lines, not
   just explicit newlines, since most prose is written in long paragraphs
   with few hard breaks. Uses the standard "mirror div" technique: an
   offscreen div styled identically to the textarea (same font/width/
   padding/white-space wrapping), filled with the text up to the caret
   plus a marker span, so the marker's real rendered offsetTop gives the
   caret's true pixel position - accurate across wrapped lines, not an
   approximation from counting \n characters. */

const FOCUS_KEY = "gama_focus_draft";
let focusMirror = null;
let focusSaveTimer = null;

function focusWordCount(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function updateFocusWordCount() {
  const editor = document.getElementById("focus-editor");
  const el = document.getElementById("focus-wordcount");
  if (!editor || !el) return;
  const words = focusWordCount(editor.value);
  el.textContent = `${words} word${words === 1 ? "" : "s"}`;
  if (words > 0) GAMA.say("success");
}

function saveFocusDraft() {
  const editor = document.getElementById("focus-editor");
  const status = document.getElementById("focus-savestatus");
  try {
    localStorage.setItem(FOCUS_KEY, editor.value);
    if (status) status.textContent = "// saved";
  } catch {
    if (status) status.textContent = "// autosave unavailable (storage blocked)";
  }
}

function scheduleFocusSave() {
  const status = document.getElementById("focus-savestatus");
  if (status) status.textContent = "// saving...";
  clearTimeout(focusSaveTimer);
  focusSaveTimer = setTimeout(saveFocusDraft, 500);
}

function ensureFocusMirror(textarea) {
  if (focusMirror) return focusMirror;
  const mirror = document.createElement("div");
  const cs = getComputedStyle(textarea);
  const propsToCopy = [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textIndent",
  ];
  propsToCopy.forEach((p) => { mirror.style[p] = cs[p]; });
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  document.body.appendChild(mirror);
  focusMirror = mirror;
  return mirror;
}

function getCaretPixelY(textarea) {
  const mirror = ensureFocusMirror(textarea);
  mirror.style.width = textarea.clientWidth + "px";
  const caretPos = textarea.selectionStart;
  const before = textarea.value.substring(0, caretPos);
  mirror.textContent = "";
  mirror.appendChild(document.createTextNode(before));
  const marker = document.createElement("span");
  marker.textContent = ".";
  mirror.appendChild(marker);
  mirror.appendChild(document.createTextNode(textarea.value.substring(caretPos) || " "));
  return marker.offsetTop;
}

function applyTypewriterScroll() {
  const editor = document.getElementById("focus-editor");
  const toggle = document.getElementById("focus-typewriter");
  if (!editor || !toggle || !toggle.checked) return;
  const caretY = getCaretPixelY(editor);
  const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24;
  const target = caretY - editor.clientHeight / 2 + lineHeight / 2;
  editor.scrollTop = Math.max(0, target);
}

function executeFocusClear() {
  const editor = document.getElementById("focus-editor");
  if (!editor.value.trim() || confirm("Clear the current draft? This can't be undone.")) {
    editor.value = "";
    updateFocusWordCount();
    saveFocusDraft();
    editor.focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("focus-editor");
  if (!editor) return;

  try {
    const saved = localStorage.getItem(FOCUS_KEY);
    if (saved) editor.value = saved;
  } catch { /* storage unavailable - starts blank */ }

  updateFocusWordCount();

  editor.addEventListener("input", () => {
    updateFocusWordCount();
    scheduleFocusSave();
    applyTypewriterScroll();
  });
  editor.addEventListener("keyup", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) applyTypewriterScroll();
  });
  editor.addEventListener("click", applyTypewriterScroll);

  const toggle = document.getElementById("focus-typewriter");
  if (toggle) toggle.addEventListener("change", applyTypewriterScroll);
});
