/* ANAGRAM_SOLVER — depends on WORD_LIST from data-words.js (same 52k-word
   list Letter Rack Solver and Num Spell use). Two result tiers: exact anagrams
   (use every letter, the classic puzzle-page definition of "anagram") and
   sub-words (valid words using a subset of the letters) - most anagram
   sites show both, and they're a genuinely different query from Letter Rack
   Solver's rack-with-wildcards search. */

function letterCounts(s) {
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

function countsEqual(a, b) {
  for (const k in a) if (a[k] !== b[k]) return false;
  for (const k in b) if (a[k] !== b[k]) return false;
  return true;
}

function canFormSubset(word, rackCounts) {
  const need = letterCounts(word);
  for (const ch in need) {
    if ((rackCounts[ch] || 0) < need[ch]) return false;
  }
  return true;
}

function solveAnagram(rawInput) {
  const letters = rawInput.toLowerCase().replace(/[^a-z]/g, "");
  if (!letters) return { exact: [], sub: [] };
  const counts = letterCounts(letters);
  const exact = [];
  const sub = [];
  for (const w of WORD_LIST) {
    if (w.length < 2 || w.length > letters.length) continue;
    if (w.length === letters.length) {
      if (countsEqual(letterCounts(w), counts)) { exact.push(w); continue; }
    }
    if (canFormSubset(w, counts)) sub.push(w);
  }
  exact.sort();
  sub.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return { exact, sub };
}

function executeAnagram() {
  const raw = document.getElementById("anagram-input").value;
  const out = document.getElementById("anagram-result");
  if (!raw.trim()) { out.innerHTML = ""; GAMA.say("idle"); return; }
  GAMA.say("working");
  setTimeout(() => {
    const { exact, sub } = solveAnagram(raw);
    if (exact.length === 0 && sub.length === 0) {
      GAMA.say("error");
      out.textContent = "// nothing formable from those letters";
      return;
    }
    GAMA.say("success");
    let html = "";
    if (exact.length) {
      html += `<div style="color:var(--phosphor-dim); margin-bottom:0.4rem;">exact anagrams (use every letter):</div>` +
        `<div style="margin-bottom:1rem;">${exact.map((w) => `<span style="display:inline-block;margin:0.15rem 0.6rem 0.15rem 0;">${w.toUpperCase()}</span>`).join("")}</div>`;
    }
    const subTop = sub.slice(0, 100);
    if (subTop.length) {
      html += `<div style="color:var(--phosphor-dim); margin-bottom:0.4rem;">also formable from a subset (${sub.length} total, longest first):</div>` +
        `<div>${subTop.map((w) => `<span style="display:inline-block;margin:0.15rem 0.6rem 0.15rem 0;">${w.toUpperCase()}</span>`).join("")}</div>`;
    }
    out.innerHTML = html;
    GAMA.log(`"${raw}" -> ${exact.length} exact, ${sub.length} sub-word anagrams`);
  }, 150);
}
