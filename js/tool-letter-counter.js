/* LETTER_COUNTER — chars, words, sentences, reading time, readability.
   Flesch-Kincaid added from the Opticon build-queue pass (readabilityformulas.com
   was already flagged in idea_journal.txt) - cheapest win in that whole file
   since it's arithmetic bolted onto stats this tool already computes, not a
   new tool. Syllable counting is a standard vowel-group heuristic, not exact -
   every implementation of this formula approximates syllables the same way. */

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschScores(words, sentenceCount) {
  const wordCount = words.length;
  if (wordCount === 0) return null;
  const sentences = Math.max(1, sentenceCount);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const ease = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
  const grade = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  return { ease: Math.round(ease * 10) / 10, grade: Math.round(grade * 10) / 10 };
}

function easeLabel(ease) {
  if (ease >= 90) return "very easy (5th grade)";
  if (ease >= 70) return "easy (7th grade)";
  if (ease >= 60) return "plain English (8th-9th grade)";
  if (ease >= 50) return "fairly difficult (10th-12th grade)";
  if (ease >= 30) return "difficult (college)";
  return "very difficult (post-graduate)";
}

function analyzeText(raw) {
  const chars = raw.length;
  const charsNoSpace = raw.replace(/\s/g, "").length;
  const wordList = raw.trim().match(/\S+/g) || [];
  const words = wordList.length;
  const sentences = (raw.match(/[.!?]+(\s|$)/g) || []).length;
  const lines = raw ? raw.split(/\r\n|\r|\n/).length : 0;
  const readingMinutes = words / 200; // ~200wpm average
  const flesch = fleschScores(wordList, sentences);
  return { chars, charsNoSpace, words, sentences, lines, readingMinutes, flesch };
}

function executeLetterCount() {
  const raw = document.getElementById("count-input").value;
  const out = document.getElementById("count-result");
  const stats = analyzeText(raw);
  const readTime = stats.readingMinutes < 1
    ? `${Math.max(1, Math.round(stats.readingMinutes * 60))}s`
    : `${stats.readingMinutes.toFixed(1)}min`;
  const rows = [
    ["Characters", stats.chars],
    ["Characters (no spaces)", stats.charsNoSpace],
    ["Words", stats.words],
    ["Sentences", stats.sentences],
    ["Lines", stats.lines],
    ["Est. reading time", readTime]
  ];
  if (stats.flesch) {
    rows.push(["Readability (Flesch Reading Ease)", `${stats.flesch.ease} — ${easeLabel(stats.flesch.ease)}`]);
    rows.push(["Readability (Flesch-Kincaid Grade Level)", stats.flesch.grade]);
  }
  out.innerHTML = rows.map(([label, val]) => `<div><span style="color:var(--phosphor-dim)">${label}:</span> ${val}</div>`).join("");
  if (raw) GAMA.say("success"); else GAMA.say("idle");
}
