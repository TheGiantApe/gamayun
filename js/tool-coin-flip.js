/* COIN_FLIP — single or batch, running tally. crypto.getRandomValues()
   over Math.random(); 256 splits evenly by 2 so a plain modulo has no
   bias here (unlike the die roller, no rejection sampling needed). */

let coinTally = { heads: 0, tails: 0 };

function flipOneCoin() {
  return crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? "heads" : "tails";
}

function renderCoinTally() {
  document.getElementById("coin-tally").textContent =
    `tally: ${coinTally.heads} heads, ${coinTally.tails} tails (${coinTally.heads + coinTally.tails} total)`;
}

function executeCoinFlip(count) {
  const results = Array.from({ length: count }, flipOneCoin);
  results.forEach((r) => coinTally[r]++);
  const out = document.getElementById("coin-result");
  if (count === 1) {
    out.textContent = results[0].toUpperCase();
  } else {
    const h = results.filter((r) => r === "heads").length;
    out.textContent = `${h} heads, ${count - h} tails (of ${count})`;
  }
  renderCoinTally();
  GAMA.say("success");
}

function resetCoinTally() {
  coinTally = { heads: 0, tails: 0 };
  document.getElementById("coin-result").textContent = "";
  renderCoinTally();
  GAMA.say("idle");
}

document.addEventListener("DOMContentLoaded", renderCoinTally);
