/* CLUE_SOLVER — real constraint propagation, not just a marked-up grid.
   Only manual marks are ever persisted (clueState.marks). Everything the
   solver figures out lives in a separate derived layer (clueDerived) that
   gets recomputed from scratch on every change - this matters because a
   naive "keep piling on deductions" approach can't un-learn something: if
   you flip a manual mark, any auto-deduced fact that depended on the old
   value has to disappear too, not linger and produce a false contradiction.
   Recomputing fresh every time sidesteps that class of bug entirely.

   Three deduction rules run to a fixed point after every edit:
   1. A card YES for one owner is NO for every other owner (incl. case file).
   2. A card NO for every player is YES for the case file (elimination).
   3. If every card in a category but one is NO for the case file, the
      remaining card is YES for the case file (category has exactly 3/6/9
      cards and exactly one is in the envelope).
   Plus disjunction constraints ("Player showed me one of these 3 cards" -
   the standard outcome of a Clue suggestion when you don't get told which
   card) - these resolve automatically once only one candidate in the set
   is still unknown for that player. */

const CLUE_CATEGORIES = {
  suspect: ["Green", "Mustard", "Orchid", "Peacock", "Plum", "Scarlet"],
  weapon: ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench"],
  room: ["Ballroom", "Billiard Room", "Conservatory", "Dining Room", "Hall", "Kitchen", "Library", "Lounge", "Study"],
};
const CLUE_ALL_CARDS = [...CLUE_CATEGORIES.suspect, ...CLUE_CATEGORIES.weapon, ...CLUE_CATEGORIES.room];
const CLUE_CASE = "Case File";

let clueState = null; // { players: [names], marks: {card: {owner: 'yes'|'no'}}, disjunctions: [{player, cards:[..]}] } - manual facts only
let clueDerived = {}; // card -> owner -> 'yes'|'no', recomputed every time, never persisted
let clueContradictions = [];

function clueLoadSaved() {
  try {
    const raw = localStorage.getItem("gamayun-clue-solver");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt storage */ }
  return null;
}

function clueSave() {
  try { localStorage.setItem("gamayun-clue-solver", JSON.stringify(clueState)); } catch (e) { /* storage full/blocked, not fatal */ }
}

function clueInit() {
  const saved = clueLoadSaved();
  if (saved && saved.players && saved.marks) {
    clueState = saved;
  } else {
    clueState = { players: ["Player 1", "Player 2", "Player 3"], marks: {}, disjunctions: [] };
    for (const c of CLUE_ALL_CARDS) clueState.marks[c] = {};
  }
  cluePropagate();
  clueRenderPlayerList();
  clueRenderGrid();
  clueRenderDisjunctions();
}

function clueOwners() {
  return [...clueState.players, CLUE_CASE];
}

function clueManualMark(card, owner) {
  const m = clueState.marks[card] && clueState.marks[card][owner];
  return m || null;
}

function clueGetMark(card, owner) {
  return clueManualMark(card, owner) || (clueDerived[card] && clueDerived[card][owner]) || null;
}

function clueIsAuto(card, owner) {
  return !clueManualMark(card, owner) && !!(clueDerived[card] && clueDerived[card][owner]);
}

function clueSetDerived(card, owner, value) {
  if (!clueDerived[card]) clueDerived[card] = {};
  clueDerived[card][owner] = value;
}

function cluePropagate() {
  clueDerived = {};
  const owners = clueOwners();
  const contradictions = [];
  let changed = true;
  let guard = 0;
  while (changed && guard < 500) {
    changed = false;
    guard++;
    // Rule 1: yes anywhere -> no everywhere else
    for (const card of CLUE_ALL_CARDS) {
      const yesOwners = owners.filter((o) => clueGetMark(card, o) === "yes");
      if (yesOwners.length > 1) {
        contradictions.push(`${card}: marked YES for both ${yesOwners.join(" and ")}`);
      }
      if (yesOwners.length >= 1) {
        const yesOwner = yesOwners[0];
        for (const o of owners) {
          if (o === yesOwner) continue;
          if (clueGetMark(card, o) === "yes") continue; // already counted above
          if (clueManualMark(card, o) === "no") continue; // already known, nothing to derive
          if (clueDerived[card] && clueDerived[card][o] === "no") continue;
          clueSetDerived(card, o, "no");
          changed = true;
        }
      }
    }
    // Rule 2: no for every player -> yes for case file
    for (const card of CLUE_ALL_CARDS) {
      if (clueGetMark(card, CLUE_CASE) === "yes") continue;
      const allPlayersNo = clueState.players.length > 0 && clueState.players.every((p) => clueGetMark(card, p) === "no");
      if (allPlayersNo) {
        if (clueManualMark(card, CLUE_CASE) === "no") {
          contradictions.push(`${card}: no player has it, but Case File is marked NO too - no valid owner left`);
        } else if (clueGetMark(card, CLUE_CASE) !== "yes") {
          clueSetDerived(card, CLUE_CASE, "yes");
          changed = true;
        }
      }
    }
    // Rule 3: category elimination for the case file
    for (const cat in CLUE_CATEGORIES) {
      const cards = CLUE_CATEGORIES[cat];
      if (cards.some((c) => clueGetMark(c, CLUE_CASE) === "yes")) continue; // already solved
      const stillPossible = cards.filter((c) => clueGetMark(c, CLUE_CASE) !== "no");
      if (stillPossible.length === 1 && clueGetMark(stillPossible[0], CLUE_CASE) !== "yes") {
        clueSetDerived(stillPossible[0], CLUE_CASE, "yes");
        changed = true;
      } else if (stillPossible.length === 0) {
        contradictions.push(`${cat}: every card ruled out for Case File - something upstream is wrong`);
      }
    }
    // Disjunction resolution: "player has one of these 3 cards" - if all but
    // one are individually ruled out for that player, the last one is a yes.
    for (const dis of clueState.disjunctions) {
      const remaining = dis.cards.filter((c) => clueGetMark(c, dis.player) !== "no");
      if (remaining.length === 1 && clueGetMark(remaining[0], dis.player) !== "yes") {
        clueSetDerived(remaining[0], dis.player, "yes");
        changed = true;
      } else if (remaining.length === 0) {
        contradictions.push(`${dis.player} was shown one of {${dis.cards.join(", ")}}, but all three are ruled out`);
      }
    }
  }
  clueContradictions = [...new Set(contradictions)];
  return clueContradictions;
}

function clueCycleMark(card, owner) {
  if (clueIsAuto(card, owner)) { GAMA.say("error"); return; } // solver-locked, don't let a click silently fight the logic
  const current = clueManualMark(card, owner);
  const next = current === null ? "yes" : current === "yes" ? "no" : null;
  if (!clueState.marks[card]) clueState.marks[card] = {};
  if (next) clueState.marks[card][owner] = next;
  else delete clueState.marks[card][owner];
  cluePropagate();
  clueSave();
  clueRenderGrid();
  GAMA.say(clueContradictions.length ? "error" : "working");
}

function clueRenderPlayerList() {
  const box = document.getElementById("clue-player-list");
  box.innerHTML = clueState.players
    .map((p, i) => `<span class="clue-player-chip">${p}<button onclick="clueRemovePlayer(${i})" title="Remove player" aria-label="Remove ${p}">&times;</button></span>`)
    .join("");
  const sel = document.getElementById("clue-disjunction-player");
  if (sel) sel.innerHTML = clueState.players.map((p) => `<option value="${p}">${p}</option>`).join("");
}

function clueAddPlayer() {
  const input = document.getElementById("clue-new-player-name");
  const name = input.value.trim();
  if (!name || clueState.players.includes(name) || name === CLUE_CASE) { GAMA.say("error"); return; }
  clueState.players.push(name);
  input.value = "";
  cluePropagate();
  clueSave();
  clueRenderPlayerList();
  clueRenderGrid();
  clueRenderDisjunctions();
}

function clueRemovePlayer(index) {
  const removed = clueState.players[index];
  clueState.players.splice(index, 1);
  for (const card of CLUE_ALL_CARDS) if (clueState.marks[card]) delete clueState.marks[card][removed];
  clueState.disjunctions = clueState.disjunctions.filter((d) => d.player !== removed);
  cluePropagate();
  clueSave();
  clueRenderPlayerList();
  clueRenderGrid();
  clueRenderDisjunctions();
}

function clueRenderGrid() {
  const owners = clueOwners();
  const catLabels = { suspect: "WHO", weapon: "WHAT", room: "WHERE" };
  let html = `<table class="clue-grid"><thead><tr><th></th>${owners.map((o) => `<th>${o}</th>`).join("")}</tr></thead><tbody>`;
  for (const cat in CLUE_CATEGORIES) {
    html += `<tr class="clue-cat-row"><th colspan="${owners.length + 1}">${catLabels[cat]}</th></tr>`;
    for (const card of CLUE_CATEGORIES[cat]) {
      html += `<tr><th class="clue-card-name">${card}</th>`;
      for (const o of owners) {
        const mark = clueGetMark(card, o);
        const auto = clueIsAuto(card, o);
        const cls = mark === "yes" ? "clue-yes" : mark === "no" ? "clue-no" : "clue-unknown";
        const symbol = mark === "yes" ? "&#10003;" : mark === "no" ? "&times;" : "";
        html += `<td class="clue-cell ${cls}${auto ? " clue-auto" : ""}" onclick="clueCycleMark('${card.replace(/'/g, "\\'")}','${o.replace(/'/g, "\\'")}')" title="${auto ? "deduced automatically - click a manual cell instead" : "click to cycle: unknown -> yes -> no"}">${symbol}</td>`;
      }
      html += `</tr>`;
    }
  }
  html += `</tbody></table>`;
  document.getElementById("clue-grid").innerHTML = html;
  clueShowStatus();
}

function clueShowStatus() {
  const catLabels = { suspect: "Who", weapon: "What", room: "Where" };
  const out = document.getElementById("clue-status");
  if (clueContradictions.length) {
    out.innerHTML = `<span style="color:#ff4d4d;">&#9888; CONTRADICTION: ${clueContradictions.join("; ")} - re-check your marks.</span>`;
    return;
  }
  const solved = [];
  let solvedCount = 0;
  for (const cat in CLUE_CATEGORIES) {
    const hit = CLUE_CATEGORIES[cat].find((c) => clueGetMark(c, CLUE_CASE) === "yes");
    if (hit) solvedCount++;
    solved.push(`${catLabels[cat]}: ${hit ? hit.toUpperCase() : "?"}`);
  }
  if (solvedCount === 3) {
    out.innerHTML = `<span style="color:var(--phosphor); font-weight:bold;">&gt; SOLVED: ${solved.join(" &middot; ")}</span>`;
    GAMA.say("success");
    GAMA.log(`Clue solved: ${solved.join(", ")}`);
  } else {
    out.innerHTML = `<span style="color:var(--phosphor-dim-text);">${solved.join(" &middot; ")}</span>`;
  }
}

function clueRenderDisjunctions() {
  const box = document.getElementById("clue-disjunction-list");
  box.innerHTML = clueState.disjunctions.length
    ? clueState.disjunctions.map((d, i) =>
        `<div class="clue-disjunction-item">${d.player} has one of: ${d.cards.join(", ")} <button onclick="clueRemoveDisjunction(${i})" title="Remove">&times;</button></div>`
      ).join("")
    : `<div style="color:var(--phosphor-dim-text); font-size:0.85rem;">none yet - add one below after a suggestion where someone showed you a card without saying which.</div>`;
}

function clueAddDisjunction() {
  const player = document.getElementById("clue-disjunction-player").value;
  const checked = [...document.querySelectorAll(".clue-disjunction-card:checked")].map((el) => el.value);
  if (!player || checked.length !== 3) { GAMA.say("error"); return; }
  clueState.disjunctions.push({ player, cards: checked });
  document.querySelectorAll(".clue-disjunction-card").forEach((el) => (el.checked = false));
  cluePropagate();
  clueSave();
  clueRenderGrid();
  clueRenderDisjunctions();
}

function clueRemoveDisjunction(index) {
  clueState.disjunctions.splice(index, 1);
  cluePropagate();
  clueSave();
  clueRenderGrid();
  clueRenderDisjunctions();
}

function clueReset() {
  clueState = { players: clueState.players, marks: {}, disjunctions: [] };
  for (const c of CLUE_ALL_CARDS) clueState.marks[c] = {};
  cluePropagate();
  clueSave();
  clueRenderGrid();
  clueRenderDisjunctions();
  GAMA.say("idle");
}

document.addEventListener("DOMContentLoaded", clueInit);
