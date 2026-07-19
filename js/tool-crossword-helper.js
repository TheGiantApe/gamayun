/* CROSSWORD_CLUE_HELPER — accepts standard crossword blank notation
   (_ or ?) directly instead of requiring an awkward manual reformat,
   filtering the same WORD_LIST dataset the Anagram Solver and Letter
   Rack Solver already use. */

const CROSSWORD_MAX_RESULTS = 200;

function executeCrosswordSearch() {
  const raw = document.getElementById("crossword-pattern").value.trim().toLowerCase();
  const out = document.getElementById("crossword-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }

  if (!/^[a-z_?]+$/.test(raw)) {
    out.textContent = "// only letters, _ and ? are valid pattern characters";
    GAMA.say("error");
    return;
  }

  const regex = new RegExp("^" + raw.replace(/[_?]/g, ".") + "$");
  const matches = WORD_LIST.filter((w) => w.length === raw.length && regex.test(w));

  if (!matches.length) {
    out.textContent = "// no matches in the word list";
    GAMA.say("idle");
    return;
  }
  const shown = matches.slice(0, CROSSWORD_MAX_RESULTS);
  const truncated = matches.length > CROSSWORD_MAX_RESULTS;
  out.innerHTML = `${matches.length} match${matches.length === 1 ? "" : "es"}${truncated ? ` (showing first ${CROSSWORD_MAX_RESULTS})` : ""}:<br>${shown.join(", ")}`;
  GAMA.say("success");
}
