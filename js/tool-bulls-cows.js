/* BULLS_AND_COWS — adjustable digit-length and duplicate-digit toggle,
   unlike most fixed-4-digit-no-repeats implementations. Target sequence
   drawn via the same crypto RNG as the rest of this site's random tools. */

let bcTarget = "";
let bcLength = 4;
let bcAllowDupes = false;
let bcGuesses = [];
let bcOver = false;

function randomDigit() {
  return crypto.getRandomValues(new Uint8Array(1))[0] % 10;
}

function generateBullsCowsTarget(length, allowDupes) {
  if (allowDupes) {
    return Array.from({ length }, randomDigit).join("");
  }
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, length).join("");
}

function scoreBullsCows(target, guess) {
  let bulls = 0;
  const targetRemain = [];
  const guessRemain = [];
  for (let i = 0; i < target.length; i++) {
    if (target[i] === guess[i]) bulls++;
    else { targetRemain.push(target[i]); guessRemain.push(guess[i]); }
  }
  let cows = 0;
  const used = Array(targetRemain.length).fill(false);
  for (const g of guessRemain) {
    const idx = targetRemain.findIndex((t, i) => t === g && !used[i]);
    if (idx !== -1) { cows++; used[idx] = true; }
  }
  return { bulls, cows };
}

// Scales with digit length (longer sequences are genuinely harder to
// crack) rather than a flat number regardless of difficulty - floored at
// 10 so short sequences still get a real, non-trivial number of tries.
function bullsCowsMaxGuesses(length) {
  return Math.max(10, length * 3);
}

function newBullsCowsGame() {
  bcLength = parseInt(document.getElementById("bc-length").value, 10);
  bcAllowDupes = document.getElementById("bc-allow-dupes").checked;
  bcTarget = generateBullsCowsTarget(bcLength, bcAllowDupes);
  bcGuesses = [];
  bcOver = false;
  document.getElementById("bc-status").textContent = `> new sequence locked in: ${bcLength} digits${bcAllowDupes ? "" : ", no repeats"} - ${bullsCowsMaxGuesses(bcLength)} guesses before it's revealed`;
  renderBullsCowsHistory();
  GAMA.say("idle");
}

function renderBullsCowsHistory() {
  document.getElementById("bc-history").innerHTML = bcGuesses
    .map((g) => `${g.guess} &rarr; ${g.bulls} bulls, ${g.cows} cows`)
    .join("<br>");
}

function executeBullsCowsGuess() {
  if (bcOver) return;
  const input = document.getElementById("bc-guess-input");
  const guess = input.value.trim();
  input.value = "";

  if (!/^\d+$/.test(guess) || guess.length !== bcLength) {
    document.getElementById("bc-status").textContent = `// guess must be exactly ${bcLength} digits`;
    GAMA.say("error");
    return;
  }
  if (!bcAllowDupes && new Set(guess).size !== guess.length) {
    document.getElementById("bc-status").textContent = "// this game doesn't allow repeated digits in the guess";
    GAMA.say("error");
    return;
  }

  const { bulls, cows } = scoreBullsCows(bcTarget, guess);
  bcGuesses.unshift({ guess, bulls, cows });
  renderBullsCowsHistory();

  const status = document.getElementById("bc-status");
  const maxGuesses = bullsCowsMaxGuesses(bcLength);
  if (bulls === bcLength) {
    bcOver = true;
    status.textContent = `> cracked it in ${bcGuesses.length} guess${bcGuesses.length === 1 ? "" : "es"}: ${bcTarget}`;
    GAMA.say("success");
  } else if (bcGuesses.length >= maxGuesses) {
    bcOver = true;
    status.textContent = `> out of guesses (${maxGuesses} used). the sequence was: ${bcTarget}`;
    GAMA.say("error");
  } else {
    status.textContent = `${bulls} bulls, ${cows} cows - ${maxGuesses - bcGuesses.length} guess${maxGuesses - bcGuesses.length === 1 ? "" : "es"} left`;
    GAMA.say("idle");
  }
}

document.addEventListener("DOMContentLoaded", newBullsCowsGame);
