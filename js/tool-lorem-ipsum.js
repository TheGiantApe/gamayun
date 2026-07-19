/* LOREM_IPSUM — classic Latin word bank, plus a genuinely distinct GAMA-
   flavored variant (not just the same generator with different colors -
   an actual different word bank pulled from this site's own salvage/
   archive vocabulary) built the same way: random sentence lengths,
   random word draws, real capitalization/punctuation. */

const LOREM_LATIN_WORDS = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod " +
  "tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam " +
  "quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo " +
  "consequat duis aute irure in reprehenderit voluptate velit esse cillum " +
  "eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident " +
  "sunt culpa qui officia deserunt mollit anim id est laborum").split(" ");

const LOREM_GAMA_WORDS = ("salvage recovered fragment signal archive corporate debris residual " +
  "transmission decrypted protocol legacy system corrupted packet " +
  "unverified origin cross-reference scavenged data-stream orbital " +
  "wreckage phosphor static drift log entry maintenance cycle raven-key " +
  "seal wideband intercept dormant relay flagged anomaly cataloged " +
  "unclassified salvage-run mag-lock stable transponder oscillator " +
  "waveform obsolete hardware quiet frequency abandoned outpost").split(" ");

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generateLoremSentence(words) {
  const length = randomInt(6, 14);
  const picked = Array.from({ length }, () => words[randomInt(0, words.length - 1)]);
  const sentence = picked.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

function generateLoremParagraph(words) {
  const sentenceCount = randomInt(3, 6);
  return Array.from({ length: sentenceCount }, () => generateLoremSentence(words)).join(" ");
}

function executeLoremGenerate() {
  const style = document.querySelector('input[name="lorem-style"]:checked').value;
  const words = style === "gama" ? LOREM_GAMA_WORDS : LOREM_LATIN_WORDS;
  const count = Math.max(1, Math.min(20, parseInt(document.getElementById("lorem-count").value, 10) || 3));
  const out = document.getElementById("lorem-result");
  out.textContent = Array.from({ length: count }, () => generateLoremParagraph(words)).join("\n\n");
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", executeLoremGenerate);
