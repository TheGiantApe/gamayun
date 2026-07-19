/* UPSIDE_DOWN_TEXT — real flipped Unicode lookalikes (not a font trick),
   plus overall character order reversed since flipping a whole line of
   text upside-down also reverses its left-to-right reading order.
   Characters with no genuine flipped lookalike are flagged rather than
   silently dropped or left oddly unflipped. */

const FLIP_MAP = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ",
  j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ",
  s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9",
  "7": "ㄥ", "8": "8", "9": "6",
  ".": "˙", ",": "'", "'": ",", '"': ",,", "!": "¡", "?": "¿",
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{",
  "<": ">", ">": "<", "&": "⅋", "_": "‾", " ": " ",
};

function flipText(text) {
  const unflippable = new Set();
  const flipped = Array.from(text) // codepoint-aware split - a plain
    // .split("") breaks emoji and other non-BMP characters into two lone
    // surrogate halves, which then get reversed relative to each other
    // into an invalid, unrenderable sequence instead of one intact
    // (flagged) character.
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (FLIP_MAP[lower] === undefined) { unflippable.add(ch); return ch; }
      return FLIP_MAP[lower];
    })
    .reverse()
    .join("");
  return { flipped, unflippable: Array.from(unflippable) };
}

function executeUpsideDown() {
  const raw = document.getElementById("flip-input").value;
  const out = document.getElementById("flip-result");
  const warn = document.getElementById("flip-warning");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; warn.textContent = ""; return; }
  const { flipped, unflippable } = flipText(raw);
  out.textContent = flipped;
  warn.textContent = unflippable.length
    ? `// no real flipped lookalike for: ${unflippable.join(" ")} - left as-is`
    : "";
  GAMA.say("success");
}
