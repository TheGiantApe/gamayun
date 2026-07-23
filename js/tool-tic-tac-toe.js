/* TIC_TAC_TOE — real minimax for the "unbeatable" tier (exhaustively
   searches the full game tree; a 3x3 board is small enough that this
   needs no alpha-beta pruning to run instantly), not a canned response
   table. Lower tiers mix in random moves at increasing rates instead of
   being either trivially easy or unbeatable with nothing in between. */

const TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const TTT_OPTIMAL_CHANCE = { easy: 0.2, medium: 0.7, hard: 1 };

let tttBoard = Array(9).fill(null);
let tttOver = false;

function tttCheckWinner(board) {
  for (const [a, b, c] of TTT_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.includes(null) ? null : "draw";
}

function tttMinimax(board, isMaximizing) {
  const winner = tttCheckWinner(board);
  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (winner === "draw") return 0;

  let best = isMaximizing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = isMaximizing ? "O" : "X";
      const score = tttMinimax(board, !isMaximizing);
      board[i] = null;
      best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
    }
  }
  return best;
}

function tttBestMove(board) {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const score = tttMinimax(board, false);
      board[i] = null;
      if (score > bestScore) { bestScore = score; move = i; }
    }
  }
  return move;
}

function tttRandomMove(board) {
  const empty = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  return empty[Math.floor(Math.random() * empty.length)];
}

function tttComputerMove() {
  const difficulty = document.getElementById("ttt-difficulty").value;
  const useOptimal = Math.random() < TTT_OPTIMAL_CHANCE[difficulty];
  const move = useOptimal ? tttBestMove(tttBoard) : tttRandomMove(tttBoard);
  tttBoard[move] = "O";
}

function renderTicTacToe() {
  const board = document.getElementById("ttt-board");
  board.innerHTML = tttBoard
    .map((cell, i) => `<button onclick="tttPlayerMove(${i})" style="width:70px; height:70px; font-size:1.8rem;" ${cell || tttOver ? "disabled" : ""}>${cell || ""}</button>`)
    .join("");
}

function tttEndCheck() {
  const winner = tttCheckWinner(tttBoard);
  const status = document.getElementById("ttt-status");
  if (winner === "X") { status.textContent = "> you win"; tttOver = true; GAMA.say("success"); }
  else if (winner === "O") { status.textContent = "> GAMA wins"; tttOver = true; GAMA.say("idle"); }
  else if (winner === "draw") { status.textContent = "> draw"; tttOver = true; GAMA.say("idle"); }
  return !!winner;
}

function tttPlayerMove(i) {
  if (tttOver || tttBoard[i]) return;
  tttBoard[i] = "X";
  renderTicTacToe();
  if (tttEndCheck()) { renderTicTacToe(); return; }

  tttComputerMove();
  renderTicTacToe();
  tttEndCheck();
  renderTicTacToe();
}

function newTicTacToeGame() {
  tttBoard = Array(9).fill(null);
  tttOver = false;
  document.getElementById("ttt-status").textContent = "";
  renderTicTacToe();
  GAMA.say("idle");
}

// Numpad-layout key mapping (7-8-9 top row, 4-5-6 middle, 1-2-3 bottom) -
// matches the physical keypad convention most players already know for a
// 3x3 grid, rather than reading-order 1-9 which nobody reaches for.
const TTT_KEYPAD_TO_INDEX = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };

function tttIsTypingElsewhere() {
  const el = document.activeElement;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

document.addEventListener("keydown", (e) => {
  if (!document.getElementById("ttt-board") || tttIsTypingElsewhere()) return;
  const index = TTT_KEYPAD_TO_INDEX[e.key];
  if (index === undefined) return;
  tttPlayerMove(index);
  e.preventDefault();
});

document.addEventListener("DOMContentLoaded", newTicTacToeGame);
