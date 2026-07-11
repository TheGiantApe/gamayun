/* LETTER_COUNTER — chars, words, sentences, reading time */

function analyzeText(raw) {
  const chars = raw.length;
  const charsNoSpace = raw.replace(/\s/g, "").length;
  const words = (raw.trim().match(/\S+/g) || []).length;
  const sentences = (raw.match(/[.!?]+(\s|$)/g) || []).length;
  const lines = raw ? raw.split(/\r\n|\r|\n/).length : 0;
  const readingMinutes = words / 200; // ~200wpm average
  return { chars, charsNoSpace, words, sentences, lines, readingMinutes };
}

function executeLetterCount() {
  const raw = document.getElementById("count-input").value;
  const out = document.getElementById("count-result");
  const stats = analyzeText(raw);
  const readTime = stats.readingMinutes < 1
    ? `${Math.max(1, Math.round(stats.readingMinutes * 60))}s`
    : `${stats.readingMinutes.toFixed(1)}min`;
  out.innerHTML = [
    ["Characters", stats.chars],
    ["Characters (no spaces)", stats.charsNoSpace],
    ["Words", stats.words],
    ["Sentences", stats.sentences],
    ["Lines", stats.lines],
    ["Est. reading time", readTime]
  ].map(([label, val]) => `<div><span style="color:var(--phosphor-dim)">${label}:</span> ${val}</div>`).join("");
  if (raw) GAMA.say("success"); else GAMA.say("idle");
}
