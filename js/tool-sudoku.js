/* SUDOKU — a real backtracking solver backs both directions of this
   tool. Puzzle generation starts from a complete, randomly-filled valid
   solution, then removes cells one at a time, re-solving (with a
   solution-COUNTING variant that stops as soon as it finds a second
   solution, not just "any" solution) after every removal to confirm the
   puzzle still has exactly one solution before keeping that removal -
   not cell-count guessing that might produce an ambiguous puzzle.
   Difficulty here is approximated by clue count (easy/medium/hard),
   same as most free generators - a real technique-based difficulty
   rating (which solving techniques a human would need) is a
   meaningfully bigger project than backtracking alone and isn't
   attempted here; that's stated honestly rather than implied.

   State is a plain in-memory model (sudokuGiven/Values/Notes), not DOM
   input values - the grid re-renders fully from that state on every
   change. This is what makes notes mode possible at all (a notes cell
   renders a 3x3 mini-grid of candidates, not a single character, so a
   plain <input> can't hold both representations).

   Hint mode uses two real, honestly-scoped human-solving techniques
   (naked singles, hidden singles) computed fresh from current board
   state every time - not a stored solution lookup, so it works
   correctly regardless of which path the player is solving through. */

const SUDOKU_DIFFICULTY_CLUES = { easy: 40, medium: 32, hard: 26 };
const SUDOKU_SETTINGS_KEY = "gama_sudoku_settings";

let sudokuGiven = null;    // 9x9 bool
let sudokuValues = null;   // 9x9 number, 0 = empty
let sudokuNotes = null;    // 9x9 array of Set<number>
let sudokuSelected = null; // [r, c] | null
let sudokuMode = "digit";  // "digit" | "notes"
let sudokuHintCell = null; // [r, c] | null - last hint given, cleared on next move

function sudokuIsValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3, boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function sudokuFindEmpty(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function shuffledDigits() {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

/* Fills `grid` in place with a complete valid solution via randomized
   backtracking. Returns true/false for success (should always succeed
   from an empty grid). */
function sudokuFillSolution(grid) {
  const empty = sudokuFindEmpty(grid);
  if (!empty) return true;
  const [row, col] = empty;
  for (const num of shuffledDigits()) {
    if (sudokuIsValid(grid, row, col, num)) {
      grid[row][col] = num;
      if (sudokuFillSolution(grid)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

/* Counts solutions up to `limit` (default 2), for uniqueness checks -
   stops searching the instant it's found enough to know the puzzle is
   NOT uniquely solvable, rather than exhaustively enumerating every
   solution (which would be far slower and is unnecessary information). */
function sudokuCountSolutions(grid, limit = 2) {
  const empty = sudokuFindEmpty(grid);
  if (!empty) return 1;
  const [row, col] = empty;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (sudokuIsValid(grid, row, col, num)) {
      grid[row][col] = num;
      count += sudokuCountSolutions(grid, limit - count);
      grid[row][col] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

/* Solves `grid` in place (fixed digit order is fine here - this isn't
   generating variety, just finding an answer). Returns true if solved. */
function sudokuSolve(grid) {
  const empty = sudokuFindEmpty(grid);
  if (!empty) return true;
  const [row, col] = empty;
  for (let num = 1; num <= 9; num++) {
    if (sudokuIsValid(grid, row, col, num)) {
      grid[row][col] = num;
      if (sudokuSolve(grid)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

function generateSudokuGrid(targetClues) {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  sudokuFillSolution(solution);

  const puzzle = solution.map((row) => [...row]);
  const cells = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  let clueCount = 81;
  for (const [r, c] of cells) {
    if (clueCount <= targetClues) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const testGrid = puzzle.map((row) => [...row]);
    if (sudokuCountSolutions(testGrid, 2) === 1) {
      clueCount--;
    } else {
      puzzle[r][c] = backup; // removing this cell made the puzzle ambiguous - put it back
    }
  }
  return { puzzle, solution, clueCount };
}

/* --- Hint-mode logic: naked singles, hidden singles, honest and no further --- */

function sudokuComputeCandidates(values, row, col) {
  if (values[row][col] !== 0) return [];
  const cands = [];
  for (let n = 1; n <= 9; n++) {
    if (sudokuIsValid(values, row, col, n)) cands.push(n);
  }
  return cands;
}

function sudokuFindNakedSingle(values) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r][c] !== 0) continue;
      const cands = sudokuComputeCandidates(values, r, c);
      if (cands.length === 1) {
        return { r, c, value: cands[0], reason: "only one number fits here" };
      }
    }
  }
  return null;
}

function sudokuUnitCells(unitType, index) {
  const cells = [];
  if (unitType === "row") {
    for (let c = 0; c < 9; c++) cells.push([index, c]);
  } else if (unitType === "col") {
    for (let r = 0; r < 9; r++) cells.push([r, index]);
  } else {
    const boxRow = Math.floor(index / 3) * 3, boxCol = (index % 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++)
      for (let c = boxCol; c < boxCol + 3; c++) cells.push([r, c]);
  }
  return cells;
}

function sudokuFindHiddenSingle(values) {
  for (const unitType of ["row", "col", "box"]) {
    for (let index = 0; index < 9; index++) {
      const cells = sudokuUnitCells(unitType, index);
      for (let n = 1; n <= 9; n++) {
        let found = null;
        let count = 0;
        for (const [r, c] of cells) {
          if (values[r][c] !== 0) continue;
          if (sudokuComputeCandidates(values, r, c).includes(n)) {
            count++;
            found = [r, c];
          }
        }
        if (count === 1) {
          const unitLabel = unitType === "box" ? "3x3 box" : unitType;
          return { r: found[0], c: found[1], value: n, reason: `the only cell in this ${unitLabel} that can take a ${n}` };
        }
      }
    }
  }
  return null;
}

function sudokuFindConflicts(values) {
  const conflicts = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = values[r][c];
      if (v === 0) continue;
      for (let cc = 0; cc < 9; cc++) {
        if (cc !== c && values[r][cc] === v) { conflicts.add(`${r},${c}`); conflicts.add(`${r},${cc}`); }
      }
      for (let rr = 0; rr < 9; rr++) {
        if (rr !== r && values[rr][c] === v) { conflicts.add(`${r},${c}`); conflicts.add(`${rr},${c}`); }
      }
      const boxRow = Math.floor(r / 3) * 3, boxCol = Math.floor(c / 3) * 3;
      for (let rr = boxRow; rr < boxRow + 3; rr++) {
        for (let cc = boxCol; cc < boxCol + 3; cc++) {
          if ((rr !== r || cc !== c) && values[rr][cc] === v) { conflicts.add(`${r},${c}`); conflicts.add(`${rr},${cc}`); }
        }
      }
    }
  }
  return conflicts;
}

function sudokuIsPeer(r1, c1, r2, c2) {
  if (r1 === r2 && c1 === c2) return false;
  if (r1 === r2 || c1 === c2) return true;
  return Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3);
}

/* --- Settings (localStorage, preferences only - no puzzle-state persistence) --- */

function loadSudokuSettings() {
  try {
    const raw = localStorage.getItem(SUDOKU_SETTINGS_KEY);
    if (!raw) return { autoClearNotes: true, conflictHighlight: true };
    const parsed = JSON.parse(raw);
    return {
      autoClearNotes: parsed.autoClearNotes !== false,
      conflictHighlight: parsed.conflictHighlight !== false,
    };
  } catch {
    return { autoClearNotes: true, conflictHighlight: true };
  }
}

function saveSudokuSettings() {
  const settings = {
    autoClearNotes: document.getElementById("sudoku-autoclear-notes").checked,
    conflictHighlight: document.getElementById("sudoku-conflict-highlight").checked,
  };
  try { localStorage.setItem(SUDOKU_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* unavailable - just won't persist */ }
  renderSudoku();
}

/* --- State setup + rendering --- */

function setSudokuState(puzzle, givens) {
  sudokuGiven = givens || Array.from({ length: 9 }, () => Array(9).fill(false));
  sudokuValues = puzzle ? puzzle.map((row) => [...row]) : Array.from({ length: 9 }, () => Array(9).fill(0));
  sudokuNotes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  sudokuSelected = null;
  sudokuHintCell = null;
}

function renderSudoku() {
  const container = document.getElementById("sudoku-grid");
  if (!container || !sudokuValues) return;
  const settings = loadSudokuSettings();
  const conflicts = settings.conflictHighlight ? sudokuFindConflicts(sudokuValues) : new Set();
  const selVal = sudokuSelected ? sudokuValues[sudokuSelected[0]][sudokuSelected[1]] : 0;

  container.textContent = "";
  const table = document.createElement("div");
  table.style.display = "grid";
  // minmax(0, 2.4rem), not a bare 2.4rem: a fixed track size never
  // shrinks below its own value regardless of container width, which
  // forced the whole grid (and the page under it) wider than the
  // viewport on a real mobile-width render - confirmed 367px grid in a
  // 320px tool-card. minmax's 0 floor lets grid actually shrink the
  // columns to fit when there's less than 9 * 2.4rem of room.
  table.style.gridTemplateColumns = "repeat(9, minmax(0, 2.4rem))";
  table.style.maxWidth = "100%";

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.tabIndex = 0;
      cell.className = "sudoku-cell";
      // Fill whatever width the (now-shrinkable) grid track actually
      // gave this column, rather than insisting on a fixed 2.4rem that
      // would just overflow its own track again on a narrow grid.
      // aspect-ratio keeps it square as it shrinks instead of a fixed
      // height fighting the now-variable width.
      cell.style.width = "100%";
      cell.style.aspectRatio = "1";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.fontSize = "1.2rem";
      cell.style.cursor = "pointer";
      cell.style.boxSizing = "border-box";
      cell.style.color = "var(--phosphor)";
      cell.style.outline = "none";

      const isGiven = sudokuGiven[r][c];
      const isSelected = sudokuSelected && sudokuSelected[0] === r && sudokuSelected[1] === c;
      const isPeer = sudokuSelected && sudokuIsPeer(sudokuSelected[0], sudokuSelected[1], r, c);
      const isSameNumber = selVal !== 0 && sudokuValues[r][c] === selVal;
      const isConflict = conflicts.has(`${r},${c}`);
      const isHint = sudokuHintCell && sudokuHintCell[0] === r && sudokuHintCell[1] === c;

      let bg = isGiven ? "var(--phosphor-faint)" : "var(--void)";
      if (isPeer) bg = "rgba(57,255,20,0.06)";
      if (isSameNumber) bg = "rgba(57,255,20,0.16)";
      if (isSelected) bg = "rgba(57,255,20,0.28)";
      if (isHint) bg = "rgba(255,149,0,0.30)";
      cell.style.background = bg;
      if (isConflict) cell.style.color = "#ff4d4d";

      cell.style.border = "1px solid var(--phosphor-dim)";
      cell.style.borderTopWidth = r % 3 === 0 ? "3px" : "1px";
      cell.style.borderTopColor = r % 3 === 0 ? "var(--phosphor)" : "var(--phosphor-dim)";
      cell.style.borderLeftWidth = c % 3 === 0 ? "3px" : "1px";
      cell.style.borderLeftColor = c % 3 === 0 ? "var(--phosphor)" : "var(--phosphor-dim)";
      cell.style.borderRightWidth = c === 8 ? "3px" : "1px";
      cell.style.borderRightColor = c === 8 ? "var(--phosphor)" : "var(--phosphor-dim)";
      cell.style.borderBottomWidth = r === 8 ? "3px" : "1px";
      cell.style.borderBottomColor = r === 8 ? "var(--phosphor)" : "var(--phosphor-dim)";

      const value = sudokuValues[r][c];
      if (value !== 0) {
        cell.textContent = String(value);
        if (isGiven) cell.style.fontWeight = "bold";
      } else if (sudokuNotes[r][c].size > 0) {
        const notesGrid = document.createElement("div");
        notesGrid.style.display = "grid";
        notesGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
        notesGrid.style.width = "100%";
        notesGrid.style.height = "100%";
        notesGrid.style.fontSize = "0.55rem";
        notesGrid.style.color = "var(--phosphor-dim-text)";
        notesGrid.style.lineHeight = "1";
        for (let n = 1; n <= 9; n++) {
          const noteDigit = document.createElement("div");
          noteDigit.style.display = "flex";
          noteDigit.style.alignItems = "center";
          noteDigit.style.justifyContent = "center";
          noteDigit.textContent = sudokuNotes[r][c].has(n) ? String(n) : "";
          notesGrid.appendChild(noteDigit);
        }
        cell.appendChild(notesGrid);
      }

      cell.addEventListener("click", () => selectSudokuCell(r, c));
      table.appendChild(cell);
    }
  }
  container.appendChild(table);

  // Every render rebuilds the grid from scratch, which destroys and
  // replaces the previously-focused cell node - without re-focusing its
  // replacement here, focus silently falls out of the grid after every
  // single keypress (placeSudokuDigit/clearSudokuCell re-render too),
  // which then trips the focus guard in handleSudokuKeydown and makes
  // continuous typing/arrow-navigation stop working after one keystroke.
  if (sudokuSelected) {
    const [sr, sc] = sudokuSelected;
    const el = container.querySelector(`.sudoku-cell[data-r="${sr}"][data-c="${sc}"]`);
    if (el) el.focus();
  }
}

function selectSudokuCell(r, c) {
  sudokuSelected = [r, c];
  sudokuHintCell = null;
  renderSudoku();
}

function clearNotesFromPeers(r, c, digit) {
  for (let rr = 0; rr < 9; rr++) {
    for (let cc = 0; cc < 9; cc++) {
      if (sudokuIsPeer(r, c, rr, cc)) sudokuNotes[rr][cc].delete(digit);
    }
  }
}

function placeSudokuDigit(r, c, digit) {
  if (sudokuGiven[r][c]) return;
  const settings = loadSudokuSettings();
  if (sudokuMode === "notes") {
    if (sudokuValues[r][c] !== 0) return; // no notes on a filled cell
    if (sudokuNotes[r][c].has(digit)) sudokuNotes[r][c].delete(digit);
    else sudokuNotes[r][c].add(digit);
  } else {
    sudokuValues[r][c] = digit;
    sudokuNotes[r][c].clear();
    if (settings.autoClearNotes) clearNotesFromPeers(r, c, digit);
  }
  sudokuHintCell = null;
  renderSudoku();
}

function clearSudokuCell(r, c) {
  if (sudokuGiven[r][c]) return;
  sudokuValues[r][c] = 0;
  sudokuNotes[r][c].clear();
  renderSudoku();
}

function handleSudokuKeydown(e) {
  if (!sudokuSelected || !sudokuValues) return;
  // Guard on real DOM focus, not just internal selection state - without
  // this, digit/arrow/N keys get hijacked from any other input on the
  // page (site search, difficulty select, etc.) any time a cell happens
  // to still be "selected" internally, even after focus moved elsewhere.
  if (!document.activeElement || !document.activeElement.closest("#sudoku-grid")) return;
  const [r, c] = sudokuSelected;
  if (e.key >= "1" && e.key <= "9") {
    placeSudokuDigit(r, c, parseInt(e.key, 10));
    e.preventDefault();
  } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    clearSudokuCell(r, c);
    e.preventDefault();
  } else if (e.key === "ArrowUp" && r > 0) { selectSudokuCell(r - 1, c); e.preventDefault(); }
  else if (e.key === "ArrowDown" && r < 8) { selectSudokuCell(r + 1, c); e.preventDefault(); }
  else if (e.key === "ArrowLeft" && c > 0) { selectSudokuCell(r, c - 1); e.preventDefault(); }
  else if (e.key === "ArrowRight" && c < 8) { selectSudokuCell(r, c + 1); e.preventDefault(); }
  else if (e.key.toLowerCase() === "n") { toggleSudokuMode(); e.preventDefault(); }
}

function toggleSudokuMode() {
  sudokuMode = sudokuMode === "digit" ? "notes" : "digit";
  const btn = document.getElementById("sudoku-mode-toggle");
  if (btn) btn.textContent = `> MODE: ${sudokuMode.toUpperCase()}`;
}

/* --- Toolbar actions --- */

function generateSudokuPuzzle() {
  const difficulty = document.getElementById("sudoku-difficulty").value;
  const { puzzle, clueCount } = generateSudokuGrid(SUDOKU_DIFFICULTY_CLUES[difficulty]);
  const givens = puzzle.map((row) => row.map((v) => v !== 0));
  setSudokuState(puzzle, givens);
  renderSudoku();
  document.getElementById("sudoku-status").textContent = `> new puzzle: ${clueCount} clues`;
  GAMA.say("success");
}

function solveSudokuGrid() {
  const status = document.getElementById("sudoku-status");
  const conflicts = sudokuFindConflicts(sudokuValues);
  if (conflicts.size > 0) {
    const [r, c] = [...conflicts][0].split(",").map(Number);
    status.textContent = `// conflict at row ${r + 1}, column ${c + 1} - that digit already appears in this row/column/box`;
    GAMA.say("error");
    return;
  }
  const grid = sudokuValues.map((row) => [...row]);
  const solvable = sudokuSolve(grid);
  if (!solvable) {
    status.textContent = "// no solution exists for this grid as entered";
    GAMA.say("error");
    return;
  }
  sudokuValues = grid;
  sudokuNotes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  sudokuHintCell = null;
  renderSudoku();
  status.textContent = "> solved";
  GAMA.say("success");
}

function clearSudokuGrid() {
  setSudokuState(null, null);
  renderSudoku();
  document.getElementById("sudoku-status").textContent = "";
  GAMA.say("idle");
}

function giveSudokuHint() {
  const status = document.getElementById("sudoku-status");
  const naked = sudokuFindNakedSingle(sudokuValues);
  const found = naked || sudokuFindHiddenSingle(sudokuValues);
  if (!found) {
    status.textContent = "// no naked or hidden single available right now - this needs a technique beyond what the tutor covers, or the grid's already solved";
    GAMA.say("idle");
    return;
  }
  sudokuHintCell = [found.r, found.c];
  sudokuSelected = [found.r, found.c];
  renderSudoku();
  status.textContent = `> hint: row ${found.r + 1}, column ${found.c + 1} is a ${found.value} - ${found.reason}`;
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("sudoku-grid")) return;
  const settings = loadSudokuSettings();
  const autoClearEl = document.getElementById("sudoku-autoclear-notes");
  const conflictEl = document.getElementById("sudoku-conflict-highlight");
  if (autoClearEl) autoClearEl.checked = settings.autoClearNotes;
  if (conflictEl) conflictEl.checked = settings.conflictHighlight;
  document.addEventListener("keydown", handleSudokuKeydown);
  generateSudokuPuzzle();
});
