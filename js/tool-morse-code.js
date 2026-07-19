/* MORSE_CODE — text<->Morse with real tone playback via Web Audio API.
   Direction is auto-detected: Morse only ever contains . - space and /,
   so unlike NATO Phonetic (real English words overlap with code words)
   there's nothing ambiguous to guess wrong. Timing follows the standard
   PARIS convention (unit length = 1.2/WPM seconds; dash = 3 units, intra-
   letter gap = 1 unit, inter-letter gap = 3 units, inter-word gap = 7
   units) so playback timing is accurate, not just "beeps at some rate." */

const MORSE_MAP = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.",
  h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.",
  o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-",
  v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};
const MORSE_TO_CHAR = Object.fromEntries(Object.entries(MORSE_MAP).map(([ch, code]) => [code, ch]));

function textToMorse(text) {
  return text.toLowerCase().split(" ").map((word) =>
    word.split("").map((ch) => MORSE_MAP[ch] || ch).join(" ")
  ).join(" / ");
}

function morseToText(morse) {
  return morse.split(/\s*\/\s*/).map((word) =>
    word.trim().split(/\s+/).filter(Boolean).map((code) => MORSE_TO_CHAR[code] || "").join("")
  ).join(" ");
}

function isMorseInput(str) {
  return /^[.\-\s/]+$/.test(str.trim()) && /[.\-]/.test(str);
}

function executeMorse() {
  const raw = document.getElementById("morse-input").value;
  const out = document.getElementById("morse-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }
  out.textContent = isMorseInput(raw) ? morseToText(raw) : textToMorse(raw);
  GAMA.say("success");
}
const executeMorseDebounced = GAMA.debounce(executeMorse, 300);

/* Plays whatever's currently in the result box (always the Morse form,
   regardless of which direction the input was) as actual tones. */
function playMorseTones() {
  const raw = document.getElementById("morse-input").value;
  const morse = isMorseInput(raw) ? raw : textToMorse(raw);
  if (!morse.trim()) return;

  const wpm = parseInt(document.getElementById("morse-wpm").value, 10);
  const unit = 1.2 / wpm;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let t = ctx.currentTime;

  const beep = (duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 600;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, t);
    osc.start(t);
    osc.stop(t + duration);
    t += duration;
  };

  // Parsed as words/letters (not a raw character scan) so the "/" word
  // separator - which textToMorse renders as " / ", three characters -
  // can't get its surrounding spaces double-counted on top of it.
  const words = morse.trim().split(/\s*\/\s*/).filter(Boolean);
  words.forEach((word, wi) => {
    const letters = word.trim().split(/\s+/).filter(Boolean);
    letters.forEach((letter, li) => {
      for (const symbol of letter) {
        if (symbol === ".") { beep(unit); t += unit; }
        else if (symbol === "-") { beep(unit * 3); t += unit; }
      }
      if (li < letters.length - 1) t += unit * 2; // last symbol's trailing 1 unit + 2 more = 3 total between letters
    });
    if (wi < words.length - 1) t += unit * 6; // last symbol's trailing 1 unit + 6 more = 7 total between words
  });
  GAMA.say("working");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("morse-wpm").addEventListener("input", (e) => {
    document.getElementById("morse-wpm-label").textContent = `${e.target.value} wpm`;
  });
  document.getElementById("morse-play-btn").addEventListener("click", playMorseTones);
});
