/* STOPWATCH — performance.now()-backed (not Date.now(), which can jump
   if the system clock adjusts mid-run), with lap splitting and a
   CSV export of the lap list. */

let stopwatchRunning = false;
let stopwatchStartTime = 0;
let stopwatchElapsedAtPause = 0;
let stopwatchInterval = null;
let stopwatchLaps = [];

function formatStopwatchTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function stopwatchCurrentElapsed() {
  return stopwatchRunning ? stopwatchElapsedAtPause + (performance.now() - stopwatchStartTime) : stopwatchElapsedAtPause;
}

function stopwatchTick() {
  document.getElementById("stopwatch-display").textContent = formatStopwatchTime(stopwatchCurrentElapsed());
}

function stopwatchToggle() {
  const btn = document.getElementById("stopwatch-start-btn");
  if (stopwatchRunning) {
    stopwatchElapsedAtPause = stopwatchCurrentElapsed();
    stopwatchRunning = false;
    clearInterval(stopwatchInterval);
    btn.textContent = "> RESUME";
  } else {
    stopwatchStartTime = performance.now();
    stopwatchRunning = true;
    stopwatchInterval = setInterval(stopwatchTick, 30);
    btn.textContent = "> PAUSE";
  }
  GAMA.say("working");
}

function stopwatchLap() {
  const total = stopwatchCurrentElapsed();
  const prevTotal = stopwatchLaps.length ? stopwatchLaps[stopwatchLaps.length - 1].total : 0;
  stopwatchLaps.push({ n: stopwatchLaps.length + 1, split: total - prevTotal, total });
  renderStopwatchLaps();
}

function renderStopwatchLaps() {
  const el = document.getElementById("stopwatch-laps");
  el.innerHTML = stopwatchLaps
    .slice()
    .reverse()
    .map((l) => `<div>lap ${l.n}: ${formatStopwatchTime(l.split)} &nbsp; (total ${formatStopwatchTime(l.total)})</div>`)
    .join("");
  document.getElementById("stopwatch-export-row").style.display = stopwatchLaps.length ? "" : "none";
}

function stopwatchReset() {
  clearInterval(stopwatchInterval);
  stopwatchRunning = false;
  stopwatchElapsedAtPause = 0;
  stopwatchLaps = [];
  document.getElementById("stopwatch-start-btn").textContent = "> START";
  document.getElementById("stopwatch-display").textContent = "00:00.00";
  renderStopwatchLaps();
  GAMA.say("idle");
}

function exportStopwatchLaps() {
  const csv = "lap,split,total\n" + stopwatchLaps.map((l) => `${l.n},${formatStopwatchTime(l.split)},${formatStopwatchTime(l.total)}`).join("\n");
  navigator.clipboard.writeText(csv);
  GAMA.log("Copied lap data as CSV");
  GAMA.say("success");
}
