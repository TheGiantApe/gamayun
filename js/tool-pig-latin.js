/* PIG_LATIN — classic schoolyard cipher. Vowel-leading words get "way"
   appended; consonant-leading words move the leading consonant cluster
   (qu treated as one unit) to the end and add "ay". Case and surrounding
   punctuation are preserved per-word so a sentence round-trips readably. */

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function pigLatinWord(word) {
  const lower = word.toLowerCase();
  if (!lower) return word;
  if (VOWELS.has(lower[0])) return word + "way";

  let i = 0;
  while (i < lower.length && !VOWELS.has(lower[i])) {
    if (lower[i] === "q" && lower[i + 1] === "u") { i += 2; continue; }
    i++;
  }
  if (i === 0 || i >= word.length) return word + "ay"; // no vowel found at all
  const head = word.slice(0, i);
  const tail = word.slice(i);
  return tail + head.toLowerCase() + "ay";
}

function toPigLatin(text) {
  return text.replace(/[A-Za-z]+/g, (word) => {
    const converted = pigLatinWord(word);
    // Preserve a capitalized first letter (e.g. "Hello" -> "Ellohay", not "ellohay").
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      return converted[0].toUpperCase() + converted.slice(1);
    }
    return converted;
  });
}

function executePigLatin() {
  const text = document.getElementById("pig-latin-input").value;
  const out = document.getElementById("pig-latin-result");
  out.textContent = text ? toPigLatin(text) : "";
  GAMA.say(text ? "success" : "idle");
}
