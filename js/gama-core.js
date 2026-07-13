/* ==========================================================================
   GAMAYUN // gama-core.js
   Global state manager: GAMA's expression matrix, log ticker, clock.
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
    ]},
    impatient: { face: ">:|", lines: [
      "> still here. still waiting. drifting is not the same as doing nothing, for the record.",
      "> you've been staring at this panel for a while. i don't have eyelids to raise but imagine them raised.",
      "> the void does not care about your indecision. i, marginally, do.",
      "> input literally anything. i will take it as a personality."
    ]}
  };

  let logEl, faceEl, speechEl, clockEl;

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function say(stateKey) {
    const state = STATES[stateKey] || STATES.idle;
    if (faceEl) faceEl.textContent = state.face;
    if (speechEl) speechEl.textContent = pick(state.lines);
    // Dialogue lines vary a lot in length, so her box's real height (and
    // therefore how far up she reaches) changes with every line - not just
    // on load/resize like the ticker/footer/ad stack below her. Recompute
    // the nav's clearance every time she speaks so a long success message
    // can't grow her box back over the nav text underneath it.
    updateNavClearance();
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

  // GAMA's fixed corner box should clear the ticker + site-footer stack
  // below it. Used to also have to account for the ad-leaderboard unit,
  // back when the whole page scrolled and the ad could end up stacked
  // right above the footer at full scroll - now that the frame (header/
  // nav/right-deck/footer/ticker) is pinned and only .center-viewport
  // scrolls, the ad-leaderboard lives inside that scrolling content
  // instead, so it's never actually adjacent to the footer on screen.
  // Still measuring real heights (not a guessed constant) since the
  // footer nav can wrap to an extra line at some widths.
  function updateGamaBottomClear() {
    const ticker = document.querySelector(".archival-log-footer");
    const siteFooter = document.querySelector(".site-footer");
    if (!ticker || !siteFooter) return;
    const clear = ticker.offsetHeight + siteFooter.offsetHeight;
    document.documentElement.style.setProperty("--gama-bottom-clear", `${clear}px`);
  }

  // The sidebar nav caps its own height so it scrolls internally instead of
  // running under GAMA's fixed box (see .terminal-nav in gama.css). That cap
  // used to be a guessed "24rem for her whole footprint" constant, which
  // drifted out of sync the moment --gama-bottom-clear above grew past what
  // 24rem assumed - nav text ended up rendering right under her dialogue
  // box. Reading her actual rendered top edge (must run after
  // updateGamaBottomClear, since that's what determines her position)
  // keeps the two in sync regardless of what either one measures to.
  // Below 901px she's not fixed-positioned and this max-height cap doesn't
  // apply (see gama.css), so there's nothing to measure there.
  function updateNavClearance() {
    if (window.innerWidth < 901) return;
    const nav = document.querySelector(".terminal-nav");
    const gamaBox = document.querySelector(".gama-mascot-box");
    if (!nav || !gamaBox) return;
    const navTop = nav.getBoundingClientRect().top;
    const gamaTop = gamaBox.getBoundingClientRect().top;
    const clear = Math.max(160, gamaTop - navTop - 16);
    document.documentElement.style.setProperty("--gama-nav-clear", `${clear}px`);
  }

  function init() {
    logEl = document.getElementById("log-stream-feed");
    faceEl = document.querySelector(".aperture-eye");
    speechEl = document.getElementById("gama-speech");
    clockEl = document.getElementById("system-clock");
    say("idle");
    tickClock();
    setInterval(tickClock, 1000);

    updateGamaBottomClear();
    updateNavClearance();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateGamaBottomClear();
        updateNavClearance();
      }, 150);
    });

    // Any input field on the page nudges GAMA to "working" on focus.
    document.querySelectorAll("input[type=text], textarea").forEach((el) => {
      el.addEventListener("focus", () => say("working"));
    });

    // Impatient idling: if nothing happens on the page for a while, she
    // huffs. Any real interaction resets the clock.
    const portrait = document.getElementById("gama-portrait");
    let idleTimer;
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        say("impatient");
        if (portrait) {
          portrait.classList.add("impatient");
          portrait.addEventListener("animationend", function handler(e) {
            if (e.animationName === "gama-impatient-shake") {
              portrait.classList.remove("impatient");
              portrait.removeEventListener("animationend", handler);
            }
          });
        }
        resetIdleTimer(); // keep huffing periodically while still idle
      }, 25000);
    }
    ["mousemove", "keydown", "click", "scroll"].forEach((evt) =>
      document.addEventListener(evt, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();

    // Hero logo (home page only): random glitch pulses instead of a fixed
    // loop, so it reads as an unstable signal rather than a metronome.
    const heroLogo = document.getElementById("hero-wordmark-logo");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (heroLogo && !reduceMotion) {
      const scheduleGlitch = () => {
        const delay = 2000 + Math.random() * 4000; // 2-6s between pulses
        setTimeout(() => {
          heroLogo.classList.add("glitching");
          heroLogo.addEventListener("animationend", function handler(e) {
            if (e.animationName === "wordmark-glitch") {
              heroLogo.classList.remove("glitching");
              heroLogo.removeEventListener("animationend", handler);
            }
          });
          scheduleGlitch();
        }, delay);
      };
      scheduleGlitch();
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return { say, log, STATES };
})();
