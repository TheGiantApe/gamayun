/* ==========================================================================
   GAMAYUN // gama-core.js
   Global state manager: G.A.M.A.'s expression matrix, log ticker, clock.
   Zero dependencies. Every tool script calls into GAMA.say() / GAMA.log().
   ========================================================================== */

const GAMA = (() => {
  const STATES = {
    idle:    { face: "0_0", lines: [
      "> awaiting organic time matrix... don't make it weird.",
      "> standing by. the void is patient. i am less patient.",
      "> recon deck idle. feed me something to salvage."
    ]},
    success: { face: ";)", lines: [
      "> processed. converted meat-space chronological debris into clean machine telemetry.",
      "> recon positive. that's one less piece of corporate residue in the wild.",
      "> salvage complete. you're welcome, i guess."
    ]},
    working: { face: ">_<", lines: [
      "> flattening the present moment. blink and you'll have to re-index it.",
      "> parsing payload. this is the exciting part, allegedly.",
      "> binary compilation in progress. hold your organics still."
    ]},
    error:   { face: "x_x", lines: [
      "> recon failed. time is a construct, but whatever you just typed isn't even a valid one.",
      "> structural mismatch. i've seen cleaner garbage drifting in low orbit.",
      "> negative. try again, or don't. i log it either way."
    ]}
  };

  let logEl, faceEl, speechEl, clockEl;

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function say(stateKey) {
    const state = STATES[stateKey] || STATES.idle;
    if (faceEl) faceEl.textContent = state.face;
    if (speechEl) speechEl.textContent = pick(state.lines);
  }

  function log(msg) {
    if (!logEl) return;
    const time = new Date().toTimeString().slice(0, 8);
    const entry = `[${time}] ${msg}`;
    logEl.textContent = entry + "   //   " + logEl.textContent;
  }

  function tickClock() {
    if (!clockEl) return;
    clockEl.textContent = new Date().toTimeString().slice(0, 8);
  }

  function init() {
    logEl = document.getElementById("log-stream-feed");
    faceEl = document.querySelector(".aperture-eye");
    speechEl = document.getElementById("gama-speech");
    clockEl = document.getElementById("system-clock");
    say("idle");
    tickClock();
    setInterval(tickClock, 1000);

    // Any input field on the page nudges G.A.M.A. to "working" on focus.
    document.querySelectorAll("input[type=text], textarea").forEach((el) => {
      el.addEventListener("focus", () => say("working"));
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  return { say, log, STATES };
})();
