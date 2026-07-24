/* RHYME_FINDER — reuses the existing WORD_LIST (data-words.js, already
   loaded by Hangman/Crossword Clue Helper/Access Breach) rather than a
   separate dataset. This is honestly a spelling-suffix matcher, not a
   real phonetic rhyme engine - there's no pronunciation dictionary
   (CMUdict-style) bundled here, and building one is a bigger dataset-
   sourcing task than this tool. Said plainly in the page copy rather
   than implied as more than it is. */

const RHYME_MAX_RESULTS = 60;
const RHYME_SUFFIX_LENGTHS = [4, 3, 2]; // tries the longest suffix first, falls back if too few matches

function findRhymes(word) {
  const clean = word.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 2) return { suffix: "", matches: [] };

  for (const len of RHYME_SUFFIX_LENGTHS) {
    if (clean.length < len) continue;
    const suffix = clean.slice(-len);
    const matches = WORD_LIST.filter((w) => w !== clean && w.endsWith(suffix));
    if (matches.length > 0) {
      return { suffix, matches: matches.slice(0, RHYME_MAX_RESULTS), total: matches.length };
    }
  }
  return { suffix: clean.slice(-2), matches: [] };
}

function executeRhymeFinder() {
  const input = document.getElementById("rhyme-input").value;
  const out = document.getElementById("rhyme-result");
  if (!input.trim()) { out.textContent = ""; GAMA.say("idle"); return; }

  const { suffix, matches, total } = findRhymes(input);
  if (!matches.length) {
    out.textContent = `// nothing in the word list shares an ending with "${input.trim()}"`;
    GAMA.say("error");
    return;
  }
  const truncatedNote = total > matches.length ? ` (showing ${matches.length} of ${total})` : "";
  out.innerHTML = `<span style="color:var(--phosphor-dim-text); font-size:0.8rem;">matched on "-${suffix}"${truncatedNote}</span><br>${matches.join(", ")}`;
  GAMA.say("success");
}
