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
   attempted here; that's stated honestly rather than implied. */

const SUDOKU_DIFFICULTY_CLUES = { easy: 40, medium: 32, hard: 26 };

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

function renderSudokuGrid(puzzle, givens) {
  const container = document.getElementById("sudoku-grid");
  container.innerHTML = "";
  const table = document.createElement("div");
  table.style.display = "grid";
  table.style.gridTemplateColumns = "repeat(9, 2rem)";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "numeric";
      input.maxLength = 1;
      input.id = `sudoku-cell-${r}-${c}`;
      input.value = puzzle && puzzle[r][c] ? puzzle[r][c] : "";
      input.style.width = "2rem";
      input.style.height = "2rem";
      input.style.textAlign = "center";
      input.style.fontSize = "1.1rem";
      input.style.background = givens && givens[r][c] ? "var(--phosphor-faint)" : "var(--void)";
      input.style.color = "var(--phosphor)";
      // 3x3 box dividers need to actually read as dividers at a glance -
      // a 1px/2px width difference in the same dim color was there in
      // logic but invisible in practice. Bright color + a real width jump
      // makes the box structure legible the way a real Sudoku grid needs.
      input.style.border = "1px solid var(--phosphor-dim)";
      input.style.borderTopWidth = r % 3 === 0 ? "3px" : "1px";
      input.style.borderTopColor = r % 3 === 0 ? "var(--phosphor)" : "var(--phosphor-dim)";
      input.style.borderLeftWidth = c % 3 === 0 ? "3px" : "1px";
      input.style.borderLeftColor = c % 3 === 0 ? "var(--phosphor)" : "var(--phosphor-dim)";
      input.style.borderRightWidth = c === 8 ? "3px" : "1px";
      input.style.borderRightColor = c === 8 ? "var(--phosphor)" : "var(--phosphor-dim)";
      input.style.borderBottomWidth = r === 8 ? "3px" : "1px";
      input.style.borderBottomColor = r === 8 ? "var(--phosphor)" : "var(--phosphor-dim)";
      input.readOnly = !!(givens && givens[r][c]);
      input.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^1-9]/g, "").slice(0, 1);
      });
      table.appendChild(input);
    }
  }
  container.appendChild(table);
}

function readSudokuGridFromInputs() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = document.getElementById(`sudoku-cell-${r}-${c}`).value;
      grid[r][c] = val ? parseInt(val, 10) : 0;
    }
  }
  return grid;
}

function generateSudokuPuzzle() {
  const difficulty = document.getElementById("sudoku-difficulty").value;
  const { puzzle, clueCount } = generateSudokuGrid(SUDOKU_DIFFICULTY_CLUES[difficulty]);
  const givens = puzzle.map((row) => row.map((v) => v !== 0));
  renderSudokuGrid(puzzle, givens);
  document.getElementById("sudoku-status").textContent = `> new puzzle: ${clueCount} clues`;
  GAMA.say("success");
}

function solveSudokuGrid() {
  const grid = readSudokuGridFromInputs();
  const status = document.getElementById("sudoku-status");

  // Validate the current entries don't already conflict before solving -
  // sudokuIsValid checks against the grid AS PASSED, so temporarily zero
  // each cell out to check it against the rest of the board.
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val === 0) continue;
      grid[r][c] = 0;
      const ok = sudokuIsValid(grid, r, c, val);
      grid[r][c] = val;
      if (!ok) {
        status.textContent = `// conflict at row ${r + 1}, column ${c + 1} - that digit already appears in this row/column/box`;
        GAMA.say("error");
        return;
      }
    }
  }

  const solvable = sudokuSolve(grid);
  if (!solvable) {
    status.textContent = "// no solution exists for this grid as entered";
    GAMA.say("error");
    return;
  }
  const givens = readSudokuGridFromInputs().map((row) => row.map((v) => v !== 0));
  renderSudokuGrid(grid, givens);
  status.textContent = "> solved";
  GAMA.say("success");
}

function clearSudokuGrid() {
  renderSudokuGrid(null, null);
  document.getElementById("sudoku-status").textContent = "";
  GAMA.say("idle");
}

document.addEventListener("DOMContentLoaded", generateSudokuPuzzle);
