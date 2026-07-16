/* NUM_SPELL — what does your phone number spell. Classic T9 keypad mapping.
   Depends on WORD_LIST from data-words.js (load that script first). */

const KEYPAD = {
  a: "2", b: "2", c: "2",
  d: "3", e: "3", f: "3",
  g: "4", h: "4", i: "4",
  j: "5", k: "5", l: "5",
  m: "6", n: "6", o: "6",
  p: "7", q: "7", r: "7", s: "7",
  t: "8", u: "8", v: "8",
  w: "9", x: "9", y: "9", z: "9"
};

let WORD_INDEX = null; // digit-string -> [words], built lazily on first use

function wordToDigits(word) {
  let out = "";
  for (const ch of word) out += KEYPAD[ch] || "?";
  return out;
}

function buildIndex() {
  WORD_INDEX = {};
  for (const w of WORD_LIST) {
    const d = wordToDigits(w);
    if (!WORD_INDEX[d]) WORD_INDEX[d] = [];
    WORD_INDEX[d].push(w);
  }
}

function findMatches(digits) {
  if (!WORD_INDEX) buildIndex();
  const clean = digits.replace(/\D/g, "");
  const found = []; // { word, start, len }
  for (let start = 0; start < clean.length; start++) {
    for (let len = clean.length - start; len >= 3; len--) {
      const window = clean.slice(start, start + len);
      const matches = WORD_INDEX[window];
      if (matches) {
        matches.forEach((w) => found.push({ word: w, start, len }));
      }
    }
  }
  // longest matches first, then by position
  found.sort((a, b) => b.len - a.len || a.start - b.start);
  return { clean, found };
}

function executeNumberSpell() {
  const input = document.getElementById("phone-input");
  const out = document.getElementById("spell-result");
  const raw = input.value;
  if (!raw.trim()) {
    GAMA.say("idle");
    return;
  }
  GAMA.say("working");
  setTimeout(() => {
    const { clean, found } = findMatches(raw);
    if (!clean || clean.length < 3) {
      GAMA.say("error");
      out.textContent = "// need at least 3 digits to work with";
      return;
    }
    if (found.length === 0) {
      GAMA.say("error");
      out.textContent = `// searched ${clean} against ${WORD_LIST.length} words. nothing spells out. your number is disappointingly random.`;
      GAMA.log(`No word matches found for ${clean}`);
      return;
    }
    GAMA.say("success");
    const top = found.slice(0, 25);
    out.innerHTML =
      `<div style="color:var(--phosphor-dim); margin-bottom:0.5rem;">${found.length} match(es) found in ${clean}:</div>` +
      top.map(m =>
        `<div>${clean.slice(0, m.start)}<strong style="color:var(--phosphor); text-shadow:0 0 4px var(--phosphor);">${m.word.toUpperCase()}</strong>${clean.slice(m.start + m.len)}</div>`
      ).join("");
    GAMA.log(`Top match: ${found[0].word.toUpperCase()} inside ${clean}`);
  }, 200);
}
const executeNumberSpellDebounced = GAMA.debounce(executeNumberSpell, 300);
