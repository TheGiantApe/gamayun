/* WORD_SEARCH_GENERATOR — real grid-placement algorithm: words try
   random positions/directions and are only rejected on an actual letter
   conflict, so two words are free to cross and share a letter the way a
   real word search does (a naive generator that refuses ANY overlap
   wastes a huge amount of the grid and fails to place longer word
   lists). Longest words placed first since they're hardest to fit. */

const WS_DIRECTIONS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const WS_MAX_ATTEMPTS = 200;

let wsGrid = [];
let wsPlacements = {};
let wsSolutionShown = false;

function wsTryPlaceWord(grid, size, word, [dr, dc], startRow, startCol) {
  const endRow = startRow + dr * (word.length - 1);
  const endCol = startCol + dc * (word.length - 1);
  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return null;
  for (let i = 0; i < word.length; i++) {
    const r = startRow + dr * i, c = startCol + dc * i;
    const existing = grid[r][c];
    if (existing !== null && existing !== word[i]) return null;
  }
  const cells = [];
  for (let i = 0; i < word.length; i++) {
    const r = startRow + dr * i, c = startCol + dc * i;
    grid[r][c] = word[i];
    cells.push([r, c]);
  }
  return cells;
}

function generateWordSearchGrid(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = {};
  const unplaced = [];

  const sorted = [...words].sort((a, b) => b.length - a.length);
  for (const word of sorted) {
    if (word.length > size) { unplaced.push(word); continue; }
    let placed = null;
    for (let attempt = 0; attempt < WS_MAX_ATTEMPTS && !placed; attempt++) {
      const dir = WS_DIRECTIONS[Math.floor(Math.random() * WS_DIRECTIONS.length)];
      const startRow = Math.floor(Math.random() * size);
      const startCol = Math.floor(Math.random() * size);
      placed = wsTryPlaceWord(grid, size, word, dir, startRow, startCol);
    }
    if (placed) placements[word] = placed;
    else unplaced.push(word);
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = letters[Math.floor(Math.random() * 26)];
    }
  }
  return { grid, placements, unplaced };
}

function renderWordSearch() {
  const size = wsGrid.length;
  const solutionCells = new Set();
  if (wsSolutionShown) {
    Object.values(wsPlacements).forEach((cells) => cells.forEach(([r, c]) => solutionCells.add(`${r},${c}`)));
  }
  const rows = wsGrid.map((row, r) =>
    row.map((ch, c) => {
      const highlighted = solutionCells.has(`${r},${c}`);
      return `<span style="display:inline-block; width:1.4em; text-align:center; ${highlighted ? "color:var(--void); background:var(--phosphor);" : ""}">${ch}</span>`;
    }).join("")
  );
  document.getElementById("wordsearch-grid").innerHTML = rows.join("<br>");
}

function executeWordSearchGenerate() {
  const size = parseInt(document.getElementById("wordsearch-size").value, 10);
  let raw = document.getElementById("wordsearch-input").value.trim();
  let words;
  if (raw) {
    words = raw.split("\n").map((w) => w.trim().toUpperCase().replace(/[^A-Z]/g, "")).filter(Boolean);
  } else {
    const candidates = WORD_LIST.filter((w) => w.length >= 4 && w.length <= 9 && /^[a-z]+$/.test(w));
    const picked = new Set();
    while (picked.size < 8) picked.add(candidates[Math.floor(Math.random() * candidates.length)].toUpperCase());
    words = [...picked];
  }
  words = [...new Set(words)]; // de-dupe

  const result = generateWordSearchGrid(words, size);
  wsGrid = result.grid;
  wsPlacements = result.placements;
  wsSolutionShown = false;
  document.getElementById("wordsearch-toggle-btn").textContent = "> SHOW SOLUTION";

  renderWordSearch();
  document.getElementById("wordsearch-wordlist").innerHTML = words.map((w) => (result.unplaced.includes(w) ? `<s>${w}</s>` : w)).join(" &middot; ");
  document.getElementById("wordsearch-warning").textContent = result.unplaced.length
    ? `⚠ couldn't fit: ${result.unplaced.join(", ")} - try a larger grid size`
    : "";
  GAMA.say("success");
}

function toggleWordSearchSolution() {
  wsSolutionShown = !wsSolutionShown;
  document.getElementById("wordsearch-toggle-btn").textContent = wsSolutionShown ? "> HIDE SOLUTION" : "> SHOW SOLUTION";
  renderWordSearch();
}

document.addEventListener("DOMContentLoaded", executeWordSearchGenerate);
