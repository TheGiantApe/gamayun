/* DICE_ROLLER — tabletop notation ("3d6+2") parsed and rolled via
   crypto.getRandomValues(), not Math.random(). Keeps a short in-memory
   roll history (not persisted - a fresh session starts with a clean log,
   matching this site's local-storage minimalism elsewhere). */

const DICE_HISTORY_MAX = 15;
let diceHistory = [];

/* Unbiased die roll in [1, sides] via rejection sampling - a plain
   modulo would slightly favor low numbers for most `sides` values. */
function rollDie(sides) {
  const range = 256 - (256 % sides);
  let byte;
  do { byte = crypto.getRandomValues(new Uint8Array(1))[0]; } while (byte >= range);
  return (byte % sides) + 1;
}

/* Parses "NdS+M" / "NdS-M" notation. Returns null if the string doesn't match. */
function parseDiceNotation(str) {
  const match = str.trim().toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier };
}

function renderDiceHistory() {
  const el = document.getElementById("dice-history");
  el.innerHTML = diceHistory.map((h) => `<div>&gt; ${h}</div>`).join("") || "<div>// no rolls yet</div>";
}

function performRoll(notation) {
  const parsed = parseDiceNotation(notation);
  const out = document.getElementById("dice-result");
  if (!parsed) {
    out.textContent = `// unreadable notation - use the form NdS or NdS+M (e.g. 3d6+2)`;
    GAMA.say("error");
    return;
  }
  const rolls = Array.from({ length: parsed.count }, () => rollDie(parsed.sides));
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier;
  const modStr = parsed.modifier ? (parsed.modifier > 0 ? `+${parsed.modifier}` : parsed.modifier) : "";
  out.textContent = `[${rolls.join(", ")}]${modStr ? " " + modStr : ""} = ${total}`;

  const label = `${parsed.count}d${parsed.sides}${modStr}`;
  diceHistory.unshift(`${label}: [${rolls.join(", ")}]${modStr ? " " + modStr : ""} = ${total}`);
  diceHistory = diceHistory.slice(0, DICE_HISTORY_MAX);
  renderDiceHistory();
  GAMA.say("success");
}

function executeDiceRoll() {
  performRoll(document.getElementById("dice-notation").value);
}

function quickRoll(sides) {
  document.getElementById("dice-notation").value = `1${sides}`;
  performRoll(`1${sides}`);
}

document.addEventListener("DOMContentLoaded", renderDiceHistory);
