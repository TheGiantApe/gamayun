/* HANGMAN — reuses the WORD_LIST dataset (from data-words.js) the
   Anagram Solver and Crossword Clue Helper already use, rather than a
   separate hand-picked word bank. Standard 6-wrong-guesses rule. */

const HANGMAN_GALLOWS = [
  " +---+\n |   |\n     |\n     |\n     |\n     |\n=========",
  " +---+\n |   |\n O   |\n     |\n     |\n     |\n=========",
  " +---+\n |   |\n O   |\n |   |\n     |\n     |\n=========",
  " +---+\n |   |\n O   |\n/|   |\n     |\n     |\n=========",
  " +---+\n |   |\n O   |\n/|\\  |\n     |\n     |\n=========",
  " +---+\n |   |\n O   |\n/|\\  |\n/    |\n     |\n=========",
  " +---+\n |   |\n O   |\n/|\\  |\n/ \\  |\n     |\n=========",
];
const HANGMAN_MAX_WRONG = 6;
const HANGMAN_LENGTH_RANGES = { short: [4, 5], medium: [6, 8], long: [9, 99] };

let hangmanWord = "";
let hangmanGuessed = new Set();
let hangmanWrongCount = 0;
let hangmanOver = false;

function newHangmanGame() {
  const [min, max] = HANGMAN_LENGTH_RANGES[document.getElementById("hangman-difficulty").value];
  const candidates = WORD_LIST.filter((w) => w.length >= min && w.length <= max && /^[a-z]+$/.test(w));
  hangmanWord = candidates[Math.floor(Math.random() * candidates.length)];
  hangmanGuessed = new Set();
  hangmanWrongCount = 0;
  hangmanOver = false;
  document.getElementById("hangman-status").textContent = "";
  renderHangman();
  GAMA.say("idle");
}

function renderHangman() {
  document.getElementById("hangman-gallows").textContent = HANGMAN_GALLOWS[hangmanWrongCount];
  document.getElementById("hangman-word").textContent = hangmanWord
    .split("")
    .map((ch) => (hangmanGuessed.has(ch) ? ch : "_"))
    .join(" ");
  const wrongLetters = [...hangmanGuessed].filter((ch) => !hangmanWord.includes(ch));
  document.getElementById("hangman-guessed").textContent = wrongLetters.length ? `wrong guesses: ${wrongLetters.join(", ")}` : "";
  renderHangmanKeyboard();
}

// On-screen A-Z buttons - the text input already worked, but typing a
// single letter on mobile means popping the OS keyboard just to tap one
// key. Real buttons are the touch-friendly path most hangman
// implementations offer alongside (not instead of) typed input.
function renderHangmanKeyboard() {
  const container = document.getElementById("hangman-keyboard");
  if (!container) return;
  container.innerHTML = "abcdefghijklmnopqrstuvwxyz"
    .split("")
    .map((ch) => {
      const guessed = hangmanGuessed.has(ch);
      const correct = guessed && hangmanWord.includes(ch);
      const disabled = guessed || hangmanOver;
      const color = guessed ? (correct ? "var(--phosphor)" : "var(--phosphor-dim-text)") : "var(--phosphor)";
      return `<button onclick="guessHangmanLetter('${ch}')" ${disabled ? "disabled" : ""} style="width:1.9rem; height:1.9rem; padding:0; font-size:0.85rem; color:${color}; opacity:${guessed ? "0.5" : "1"};">${ch.toUpperCase()}</button>`;
    })
    .join("");
}

function guessHangmanLetter(letter) {
  if (hangmanOver || !/^[a-z]$/.test(letter) || hangmanGuessed.has(letter)) return;

  hangmanGuessed.add(letter);
  if (!hangmanWord.includes(letter)) hangmanWrongCount++;

  const status = document.getElementById("hangman-status");
  if (hangmanWord.split("").every((ch) => hangmanGuessed.has(ch))) {
    hangmanOver = true;
    status.textContent = `> solved: ${hangmanWord}`;
    GAMA.say("success");
  } else if (hangmanWrongCount >= HANGMAN_MAX_WRONG) {
    hangmanOver = true;
    status.textContent = `> out of guesses. the word was: ${hangmanWord}`;
    GAMA.say("error");
  } else {
    GAMA.say(hangmanWord.includes(letter) ? "success" : "idle");
  }
  renderHangman();
}

function executeHangmanGuess() {
  const input = document.getElementById("hangman-letter-input");
  const letter = input.value.trim().toLowerCase();
  input.value = "";
  guessHangmanLetter(letter);
}

document.addEventListener("DOMContentLoaded", newHangmanGame);
