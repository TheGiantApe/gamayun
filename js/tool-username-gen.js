/* USERNAME_GENERATOR — combinatorics off the user's own keywords, biased
   toward pronounceable results (adjective + keyword, or keyword +
   keyword, plus a short suffix) rather than a keyword glued to random
   noise, which is the usual failure mode of simpler generators. */

const UNAME_ADJECTIVES = [
  "quiet", "wild", "salty", "lucky", "sleepy", "bold", "quick", "calm",
  "rusty", "bright", "faded", "loose", "sharp", "gentle", "stray", "odd",
];
const UNAME_SUFFIXES = ["", "", "x", "hq", "co", "prime", "official", "real"];

function randomPick(arr) {
  return arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];
}

function randomDigits(n) {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % Math.pow(10, n)).padStart(n, "0");
}

function cleanKeyword(word) {
  return word.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function generateUsernames(keywords) {
  const words = keywords.map(cleanKeyword).filter(Boolean);
  if (!words.length) return [];
  const results = new Set();

  while (results.size < 8 && results.size < words.length * 8) {
    const word = randomPick(words);
    const pattern = crypto.getRandomValues(new Uint32Array(1))[0] % 4;
    let candidate;
    if (pattern === 0) candidate = `${randomPick(UNAME_ADJECTIVES)}_${word}${Math.random() < 0.5 ? randomDigits(2) : ""}`;
    else if (pattern === 1 && words.length > 1) candidate = `${word}_${randomPick(words.filter((w) => w !== word))}`;
    else if (pattern === 2) candidate = `${word}${randomPick(UNAME_SUFFIXES)}${randomDigits(2)}`;
    else candidate = `the_real_${word}`;
    results.add(candidate);
  }
  return Array.from(results);
}

function executeUsernameGen() {
  const raw = document.getElementById("uname-keywords").value;
  const out = document.getElementById("uname-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }
  const keywords = raw.split(/[,\s]+/).filter(Boolean);
  const names = generateUsernames(keywords);
  out.innerHTML = names.length ? names.join("<br>") : "// nothing usable after stripping non-alphanumeric characters";
  GAMA.say(names.length ? "success" : "error");
}
