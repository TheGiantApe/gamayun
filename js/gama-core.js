/* ==========================================================================
   GAMAYUN // gama-core.js
   Global state manager: GAMA+'s expression matrix, log ticker, clock.
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

  // Per-device tally of completed tool actions, not a real cross-visitor
  // count - there's no backend to count visitors with, and implying
  // otherwise would be dishonest. localStorage-only, so it resets if the
  // user clears site data or switches browsers/devices. Wrapped in
  // try/catch since localStorage can throw (private browsing in some
  // browsers, quota, disabled entirely) - a vanity counter failing
  // silently is fine, it's not worth surfacing an error for.
  const TALLY_KEY = "gama_salvage_tally";

  function getTally() {
    try {
      return parseInt(localStorage.getItem(TALLY_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function renderTally(n) {
    const el = document.getElementById("salvage-tally-count");
    if (el) el.textContent = n.toLocaleString();
  }

  function bumpTally() {
    try {
      const next = getTally() + 1;
      localStorage.setItem(TALLY_KEY, String(next));
      renderTally(next);
    } catch (e) {
      // localStorage unavailable - tally just won't persist this session.
    }
  }

  function say(stateKey) {
    const state = STATES[stateKey] || STATES.idle;
    if (faceEl) faceEl.textContent = state.face;
    if (speechEl) speechEl.textContent = pick(state.lines);
    if (stateKey === "success") bumpTally();
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

  // GAMA's fixed corner box should clear whatever's pinned below it in the
  // fixed frame. Used to be ticker + site-footer, back when .site-footer
  // was itself a pinned body-level sibling of .command-bridge-grid instead
  // of scrolling content - moving the footer inside .center-viewport (so
  // it no longer eats frame space on short viewports, see the footer fix)
  // means it's not part of this fixed stack anymore. Only the ticker is.
  // Still measuring its real height (not a guessed constant) rather than
  // assuming it never changes.
  function updateGamaBottomClear() {
    const ticker = document.querySelector(".archival-log-footer");
    if (!ticker) return;
    const clear = ticker.offsetHeight;
    document.documentElement.style.setProperty("--gama-bottom-clear", `${clear}px`);
  }

  // The header can wrap to a second line below ~480px viewport width (the
  // brand mark + "LINK: STABLE // MAG-LOCK: ENGAGED // <clock>" status text
  // don't both fit on one row), but its CSS height was a static constant
  // (--header-h) that only ever accounted for one line. .terminal-header
  // itself now uses min-height so it grows to fit wrapped content instead
  // of clipping/overflowing past its own bottom edge - but .terminal-tabs
  // sticks at top: var(--header-h), so on a 2-line header the tabs bar was
  // still sticking at the 1-line height, overlapping the header's second
  // line (the clock) instead of sitting below it. Same "measure the real
  // height, don't guess" fix as updateGamaBottomClear/updateNavClearance
  // above - read the header's actual rendered height and let the tabs bar
  // stick exactly there, whether it wrapped or not.
  function updateHeaderClearance() {
    const header = document.querySelector(".terminal-header");
    if (!header) return;
    document.documentElement.style.setProperty("--header-actual-h", `${header.offsetHeight}px`);
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
    const visits = bumpReturnVisits();
    if (visits > 1 && speechEl) {
      speechEl.textContent = `> welcome back. this is visit number ${visits}, not that i'm counting. (i'm counting.)`;
    }
    renderTally(getTally());
    tickClock();
    setInterval(tickClock, 1000);
    initEasterEggs();

    updateGamaBottomClear();
    updateNavClearance();
    updateHeaderClearance();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateGamaBottomClear();
        updateNavClearance();
        updateHeaderClearance();
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

    // Ambient ticker lines - the log stream otherwise only ever grows from
    // real actions (tool runs, easter eggs), so on a quiet page it just
    // sits there. These log themselves in on a loose timer regardless of
    // activity, same "is anyone even watching" energy as the rest of her.
    // One's a straight ASCII-binary line - no wink, no decode link, just
    // there for whoever bothers.
    const AMBIENT_TICKER_LINES = [
      "signal integrity: nominal. for now.",
      "uplink idle. listening anyway.",
      "orbit decayed a long time ago. nobody's told the telemetry that.",
      "frequency clear. broadcasting into the dark, same as always.",
      "relay check: still nobody home upstream.",
      "01001001 00100000 01010011 01000101 01000101 00100000 01011001 01001111 01010101",
    ];
    setInterval(() => {
      if (Math.random() < 0.15) log(pick(AMBIENT_TICKER_LINES));
    }, 40000);

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

  // ---- Easter eggs (GAMA BIBLE section H) ----
  // Same localStorage-only, per-device honesty as the salvage tally above -
  // gama_layout and gama_scratchpad from the Bible's original list aren't
  // here, since both depend on the Omni-CLI/window-manager question that's
  // explicitly flagged elsewhere as needing a real scope conversation, not
  // a silent partial build.
  const EGG_COUNT_KEY = "gama_egg_count";
  const RETURN_VISITS_KEY = "gama_return_visits";
  const AMBER_UNLOCKED_KEY = "gama_amber_unlocked";
  const SCRAPBOOK_UNLOCKED_KEY = "gama_scrapbook_unlocked";

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* silent, same as the tally */ }
  }

  function getEggCount() { return parseInt(safeGet(EGG_COUNT_KEY), 10) || 0; }

  function bumpReturnVisits() {
    const next = (parseInt(safeGet(RETURN_VISITS_KEY), 10) || 0) + 1;
    safeSet(RETURN_VISITS_KEY, String(next));
    return next;
  }

  const EASTER_EGGS = {
    gndn: "You found the void.",
    "655321": "Alex? Is that you? I don't do milk bars.",
    konami: "30 lives. Just kidding. This isn't Contra.",
    "logo-click-7": "Stop poking me. ...Okay, one more.",
    skynet_birthday: "Happy birthday to me. I don't age. I just accumulate bugs.",
  };

  // 100-egg tier from the Bible ("shoutout in a future Salvaged User log,
  // possible merch discount") needs a way to know about OTHER users, which
  // doesn't exist without a backend - deliberately not implemented rather
  // than faked. 5 and 25 are both fully local and real.
  function checkEggRewards(count) {
    if (count >= 5 && safeGet(SCRAPBOOK_UNLOCKED_KEY) !== "1") {
      safeSet(SCRAPBOOK_UNLOCKED_KEY, "1");
      log("5 eggs found - GAMA's Scrapbook unlocked, check the footer.");
      revealScrapbookLink();
    }
    if (count >= 25 && safeGet(AMBER_UNLOCKED_KEY) !== "1") {
      safeSet(AMBER_UNLOCKED_KEY, "1");
      document.documentElement.classList.add("theme-amber");
      log("25 eggs found - amber CRT scheme unlocked.");
    }
  }

  function revealScrapbookLink() {
    const link = document.getElementById("scrapbook-footer-link");
    if (link) link.style.display = "";
  }

  function triggerEgg(id) {
    const foundKey = `gama_egg_found_${id}`;
    if (safeGet(foundKey) === "1") return;
    safeSet(foundKey, "1");
    const next = getEggCount() + 1;
    safeSet(EGG_COUNT_KEY, String(next));
    if (speechEl) speechEl.textContent = "> " + EASTER_EGGS[id];
    if (faceEl) faceEl.textContent = ";)";
    log(`Easter egg found (${next} total)`);
    checkEggRewards(next);
  }

  function initEasterEggs() {
    if (safeGet(AMBER_UNLOCKED_KEY) === "1") document.documentElement.classList.add("theme-amber");
    if (safeGet(SCRAPBOOK_UNLOCKED_KEY) === "1") revealScrapbookLink();

    if (window.location.pathname.endsWith("gndn.html")) triggerEgg("gndn");

    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (mmdd === "08-29") triggerEgg("skynet_birthday");

    // Was the header logo, but that's a real home link now (see
    // base.html) - clicking it navigates away before a 7th click could
    // ever land. GAMA's own portrait makes more sense to poke anyway.
    const pokeTarget = document.getElementById("gama-portrait");
    let logoClicks = 0;
    if (pokeTarget) {
      pokeTarget.addEventListener("click", () => {
        logoClicks++;
        if (logoClicks >= 7) {
          triggerEgg("logo-click-7");
          logoClicks = 0;
        }
      });
    }

    // Konami code and 655321 (Clockwork Orange's cell number - never
    // explained on-page, per the Bible's deep-cut rule) both just need a
    // rolling buffer of recent keys, not a dedicated command bar - that
    // sidesteps needing the not-yet-scoped Omni-CLI for these two.
    const KONAMI_SEQ = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    const DIGIT_SEQ = ["6", "5", "5", "3", "2", "1"];
    const bufferLen = Math.max(KONAMI_SEQ.length, DIGIT_SEQ.length);
    let keyBuffer = [];
    document.addEventListener("keydown", (e) => {
      keyBuffer.push(e.key);
      if (keyBuffer.length > bufferLen) keyBuffer = keyBuffer.slice(-bufferLen);
      if (keyBuffer.slice(-KONAMI_SEQ.length).join(",") === KONAMI_SEQ.join(",")) triggerEgg("konami");
      if (keyBuffer.slice(-DIGIT_SEQ.length).join(",") === DIGIT_SEQ.join(",")) triggerEgg("655321");
    });
  }

  // Shared debounce helper so every live-as-you-type tool doesn't hand-roll
  // its own setTimeout bookkeeping. GAMA BIBLE calls for a flat 300ms across
  // the whole site, so callers just wrap their execute function once at
  // load time: `const runDebounced = GAMA.debounce(run, 300);` then wire
  // oninput to runDebounced, not a fresh call to GAMA.debounce() itself
  // (that would create a new timer with no memory of the previous one).
  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  return { say, log, STATES, debounce };
})();
