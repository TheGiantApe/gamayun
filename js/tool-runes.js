/* RUNES — Elder Futhark transliteration (24 runes, verified order/names/
   sound-values against a reference source rather than typed from memory -
   the 3 aettir groupings and specific rune order are easy to misremember).
   English has 26 letters + the th/ng digraphs the Futhark has dedicated
   runes for, so the 5 letters without a direct rune (C, Q, V, X, Y) use
   the common phonetic-substitution convention most rune generators use -
   this is an approximation, not a scholarly transliteration standard. */

const ELDER_FUTHARK = [
  { rune: "ᚠ", name: "Fehu", sound: "f" },
  { rune: "ᚢ", name: "Uruz", sound: "u" },
  { rune: "ᚦ", name: "Thurisaz", sound: "th" },
  { rune: "ᚨ", name: "Ansuz", sound: "a" },
  { rune: "ᚱ", name: "Raido", sound: "r" },
  { rune: "ᚲ", name: "Kaunan", sound: "k" },
  { rune: "ᚷ", name: "Gebo", sound: "g" },
  { rune: "ᚹ", name: "Wunjo", sound: "w" },
  { rune: "ᚺ", name: "Hagalaz", sound: "h" },
  { rune: "ᚾ", name: "Naudiz", sound: "n" },
  { rune: "ᛁ", name: "Isaz", sound: "i" },
  { rune: "ᛃ", name: "Jeran", sound: "j" },
  { rune: "ᛇ", name: "Eihwaz", sound: "ï" },
  { rune: "ᛈ", name: "Pertho", sound: "p" },
  { rune: "ᛉ", name: "Algiz", sound: "z" },
  { rune: "ᛊ", name: "Sowilo", sound: "s" },
  { rune: "ᛏ", name: "Tiwaz", sound: "t" },
  { rune: "ᛒ", name: "Berkanan", sound: "b" },
  { rune: "ᛖ", name: "Ehwaz", sound: "e" },
  { rune: "ᛗ", name: "Mannaz", sound: "m" },
  { rune: "ᛚ", name: "Laguz", sound: "l" },
  { rune: "ᛜ", name: "Ingwaz", sound: "ng" },
  { rune: "ᛞ", name: "Dagaz", sound: "d" },
  { rune: "ᛟ", name: "Othala", sound: "o" },
];

const LATIN_TO_RUNE = {
  F: "ᚠ", U: "ᚢ", A: "ᚨ", R: "ᚱ", K: "ᚲ", G: "ᚷ", W: "ᚹ",
  H: "ᚺ", N: "ᚾ", I: "ᛁ", J: "ᛃ", P: "ᛈ", Z: "ᛉ", S: "ᛊ",
  T: "ᛏ", B: "ᛒ", E: "ᛖ", M: "ᛗ", L: "ᛚ", D: "ᛞ", O: "ᛟ",
  // approximate substitutions for letters without a dedicated rune
  C: "ᚲ", Q: "ᚲ", V: "ᚹ", Y: "ᛁ",
};

function textToRunes(text) {
  const upper = text.toUpperCase();
  let out = "";
  for (let i = 0; i < upper.length; i++) {
    const two = upper.slice(i, i + 2);
    if (two === "TH") { out += "ᚦ"; i++; continue; }
    if (two === "NG") { out += "ᛜ"; i++; continue; }
    const ch = upper[i];
    if (ch === "X") { out += "ᚲᛊ"; continue; } // X -> "KS"
    out += LATIN_TO_RUNE[ch] || ch; // non-letters (spaces, punctuation) pass through as-is
  }
  return out;
}

function executeRunes() {
  const text = document.getElementById("runes-input").value;
  const out = document.getElementById("runes-result");
  out.textContent = text ? textToRunes(text) : "";
  GAMA.say(text ? "success" : "idle");
}
