/* VAULT_BREACH — terminal-styled sibling to Password Breach (ACCESS_BREACH),
   built to retire the old Bulls & Cows tool per Vin's explicit call: the
   mechanism was fine, the presentation was the problem. "X bulls, Y cows"
   is jargon that requires already knowing the game to parse; this reports
   the same two counts in plain language instead ("in position" / "right
   digit, wrong spot"), styled like Password Breach's hex-address terminal
   log rather than a bare bulls/cows game board.

   Unlike Password Breach (click a candidate word, single feedback count),
   this is a typed numeric-code guess with the FULLER two-part feedback
   classic Bulls & Cows gives - the terminal word game's own spec
   deliberately withholds the second half. Genuinely different puzzle,
   same visual family. Kept as its own page rather than folded into
   Password Breach's engine since guessing a typed number code and
   clicking a candidate word are different enough interactions to share
   little beyond styling. */

const VAULT_STATS_KEY = "gama_vault_breach_stats";

let vbTarget = "";
let vbLength = 4;
let vbPoolSize = 10;
let vbAllowDupes = false;
let vbAttemptsMax = 10;
let vbHistory = [];
let vbOver = false;

function vaultRandomDigit(poolSize) {
  const range = 256 - (256 % poolSize);
  let byte;
  do { byte = crypto.getRandomValues(new Uint8Array(1))[0]; } while (byte >= range);
  return byte % poolSize;
}

function generateVaultTarget(length, poolSize, allowDupes) {
  if (allowDupes || poolSize < length) {
    return Array.from({ length }, () => vaultRandomDigit(poolSize)).join("");
  }
  const digits = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = digits.length - 1; i > 0; i--) {
    const j = vaultRandomDigit(i + 1);
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, length).join("");
}

/* Classic two-pass Mastermind/Bulls & Cows scoring: exact-position
   matches first, then remaining digits matched by value only (each
   target/guess digit consumed at most once so e.g. target "112" vs
   guess "211" scores 1 in-position + 2 right-value, not 3). */
function scoreVaultGuess(target, guess) {
  let inPosition = 0;
  const targetRemain = [];
  const guessRemain = [];
  for (let i = 0; i < target.length; i++) {
    if (target[i] === guess[i]) inPosition++;
    else { targetRemain.push(target[i]); guessRemain.push(guess[i]); }
  }
  let wrongSpot = 0;
  const used = Array(targetRemain.length).fill(false);
  for (const g of guessRemain) {
    const idx = targetRemain.findIndex((t, i) => t === g && !used[i]);
    if (idx !== -1) { wrongSpot++; used[idx] = true; }
  }
  return { inPosition, wrongSpot };
}

function loadVaultStats() {
  try {
    const raw = localStorage.getItem(VAULT_STATS_KEY);
    return raw ? JSON.parse(raw) : { solved: 0, lockouts: 0 };
  } catch {
    return { solved: 0, lockouts: 0 };
  }
}

function saveVaultStats(stats) {
  try { localStorage.setItem(VAULT_STATS_KEY, JSON.stringify(stats)); } catch { /* unavailable - just won't persist */ }
}

function renderVaultStats() {
  const stats = loadVaultStats();
  document.getElementById("vb-stats").textContent = `vaults cracked: ${stats.solved} // lockouts: ${stats.lockouts}`;
}

function newVaultBreachGame() {
  vbLength = parseInt(document.getElementById("vb-length").value, 10);
  vbPoolSize = parseInt(document.getElementById("vb-pool").value, 10) + 1; // slider is max digit value, pool size is +1
  vbAllowDupes = document.getElementById("vb-allow-dupes").checked;
  vbAttemptsMax = parseInt(document.getElementById("vb-attempts").value, 10);

  vbTarget = generateVaultTarget(vbLength, vbPoolSize, vbAllowDupes);
  vbHistory = [];
  vbOver = false;

  document.getElementById("vb-meta").textContent =
    `attempts remaining: ${vbAttemptsMax}/${vbAttemptsMax} // ${vbLength} digits, range 0-${vbPoolSize - 1}${vbAllowDupes ? "" : ", no repeats"}`;
  document.getElementById("vb-result").textContent = "> new vault sealed. crack it.";
  document.getElementById("vb-guess-input").value = "";
  renderVaultTerminal();
  renderVaultStats();
  GAMA.say("idle");
}

function renderVaultTerminal() {
  const container = document.getElementById("vb-terminal");
  container.innerHTML = "";
  let hexAddr = 0xfac5;
  if (!vbHistory.length) {
    const line = document.createElement("div");
    line.style.color = "var(--phosphor-dim-text)";
    line.textContent = "// no attempts logged yet";
    container.appendChild(line);
    return;
  }
  for (const h of vbHistory) {
    const lineEl = document.createElement("div");
    const addr = document.createElement("span");
    addr.textContent = `0x${hexAddr.toString(16).toUpperCase()}  `;
    addr.style.color = "var(--phosphor-dim-text)";
    lineEl.appendChild(addr);
    hexAddr += 0x0a;

    const guessSpan = document.createElement("span");
    guessSpan.textContent = h.guess;
    guessSpan.style.color = "var(--phosphor)";
    lineEl.appendChild(guessSpan);

    const feedback = document.createElement("span");
    feedback.style.color = "var(--phosphor-dim-text)";
    feedback.textContent = `  > ${h.inPosition} in position, ${h.wrongSpot} right digit wrong spot`;
    lineEl.appendChild(feedback);

    container.appendChild(lineEl);
  }
}

function executeVaultBreachGuess() {
  if (vbOver) return;
  const input = document.getElementById("vb-guess-input");
  const guess = input.value.trim();
  input.value = "";

  const validChars = new RegExp(`^[0-${Math.min(vbPoolSize - 1, 9)}]+$`);
  if (guess.length !== vbLength || !validChars.test(guess) || [...guess].some((d) => parseInt(d, 10) >= vbPoolSize)) {
    document.getElementById("vb-result").textContent = `// guess must be exactly ${vbLength} digits, each between 0 and ${vbPoolSize - 1}`;
    GAMA.say("error");
    return;
  }
  if (!vbAllowDupes && new Set(guess).size !== guess.length) {
    document.getElementById("vb-result").textContent = "// this vault doesn't allow repeated digits in a guess";
    GAMA.say("error");
    return;
  }

  const { inPosition, wrongSpot } = scoreVaultGuess(vbTarget, guess);
  vbHistory.unshift({ guess, inPosition, wrongSpot });
  renderVaultTerminal();

  const result = document.getElementById("vb-result");
  const attemptsUsed = vbHistory.length;
  const attemptsLeft = vbAttemptsMax - attemptsUsed;
  document.getElementById("vb-meta").textContent =
    `attempts remaining: ${Math.max(0, attemptsLeft)}/${vbAttemptsMax} // ${vbLength} digits, range 0-${vbPoolSize - 1}${vbAllowDupes ? "" : ", no repeats"}`;

  if (inPosition === vbLength) {
    vbOver = true;
    result.textContent = `> VAULT CRACKED in ${attemptsUsed} attempt${attemptsUsed === 1 ? "" : "s"}: ${vbTarget}`;
    const stats = loadVaultStats();
    stats.solved++;
    saveVaultStats(stats);
    renderVaultStats();
    GAMA.say("success");
  } else if (attemptsUsed >= vbAttemptsMax) {
    vbOver = true;
    result.textContent = `> LOCKOUT. the code was: ${vbTarget}`;
    const stats = loadVaultStats();
    stats.lockouts++;
    saveVaultStats(stats);
    renderVaultStats();
    GAMA.say("error");
  } else {
    result.textContent = `> ${inPosition} in position, ${wrongSpot} right digit wrong spot - ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`;
    GAMA.say("idle");
  }
}

/* Escape aborts, but it counts as a lockout - same anti-restart-spam
   intent as Password Breach's identical mechanic. */
function vaultIsTypingElsewhere() {
  const el = document.activeElement;
  if (!el) return false;
  return (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
    && el.id !== "vb-guess-input";
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !document.getElementById("vb-terminal") || vaultIsTypingElsewhere()) return;
  if (vbOver) return;
  vbOver = true;
  const stats = loadVaultStats();
  stats.lockouts++;
  saveVaultStats(stats);
  document.getElementById("vb-result").textContent = `> connection aborted (counts as a lockout). the code was: ${vbTarget}`;
  renderVaultStats();
  GAMA.say("error");
  e.preventDefault();
});

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("vb-terminal")) newVaultBreachGame();
});
