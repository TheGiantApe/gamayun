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

  let logEl, faceEl, speechEl;

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
    // No nav-clearance recompute needed here anymore - updateNavClearance()
    // no longer depends on anything about her (position, dialogue length),
    // just the viewport and nav's own top. See its own comment for why.
  }

  function log(msg) {
    if (!logEl) return;
    const time = new Date().toTimeString().slice(0, 8);
    const entry = `[${time}] ${msg}`;
    logEl.textContent = entry + "   //   " + logEl.textContent;
  }

  // GAMA's fixed corner box should clear whatever's pinned below it in the
  // fixed frame. .site-footer moved inside .center-viewport a while back so
  // it no longer eats frame space on short viewports - but .content-flex-
  // fill's flex-grow (see .center-viewport in gama.css) still pins the
  // footer to the frame's visual bottom edge on any page whose own content
  // doesn't overflow the pane, which is most tool pages. From the user's
  // eye, the footer IS still part of the fixed-looking stack most of the
  // time, even though it's technically scrolling content - it only actually
  // scrolls out of this spot on pages long enough to overflow. Measuring
  // only the ticker (as this used to) left her floating at the ticker's
  // height alone, landing her right on top of the footer's brand column on
  // any normal-length page - reproduced live on BASE64_CODEC. Measuring
  // both and summing them fixes that; on a long page where the footer has
  // actually scrolled away this still just reserves a bit of unused space
  // above the ticker, not a visible problem.
  function updateGamaBottomClear() {
    const ticker = document.querySelector(".archival-log-footer");
    const footer = document.querySelector(".site-footer");
    if (!ticker) return;
    const clear = ticker.offsetHeight + (footer ? footer.offsetHeight : 0);
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

  // Favicon rotation between GAMA's face, the raven-key seal, and the
  // wordmark - "always appear, but somewhat randomly, page-related or
  // event-based" per spec. Priority order, first match wins:
  // 1. Event-based: a quiet chance at the wordmark once the Scrapbook's
  //    unlocked (5+ eggs found) - reads as a small reward, not an
  //    announcement.
  // 2. Random: a small independent chance to show a different one than
  //    the page would normally get, so it's never fully predictable.
  // 3. Page-related: wiki/log/about/legal-type pages (the site's own
  //    reference/institutional content) get the raven-key seal, since
  //    that's the mark's actual job - the homepage gets the wordmark as
  //    the first-impression brand mark - every real tool page gets GAMA's
  //    own face, since she's the one narrating it.
  // Picked once per page load, not swapped mid-session - a favicon
  // changing under you while you're using a tool would read as broken,
  // not charming. getEggCount() is defined further down but hoisted
  // (function declaration, not const), safe to call from here.
  function updateFavicon() {
    const link = document.getElementById("favicon-link");
    if (!link) return;
    const ICONS = {
      mascot: "/assets/icons/favicon-mascot.ico",
      ravenkey: "/assets/icons/favicon-ravenkey.ico",
      wordmark: "/assets/icons/favicon-wordmark.ico",
    };

    if (getEggCount() >= 5 && Math.random() < 0.4) {
      link.href = ICONS.wordmark;
      return;
    }

    if (Math.random() < 0.08) {
      const pool = [ICONS.mascot, ICONS.ravenkey, ICONS.wordmark];
      link.href = pool[Math.floor(Math.random() * pool.length)];
      return;
    }

    const path = location.pathname;
    const isHome = path === "/" || path.endsWith("/index.html");
    const isInstitutional = /\/pages\/(wiki-|wiki-index|about|log|changelog|legal|privacy|terms|sitemap|contact|scrapbook)/.test(path);
    link.href = isHome ? ICONS.wordmark : isInstitutional ? ICONS.ravenkey : ICONS.mascot;
  }

  // The sidebar nav caps its own height so it scrolls internally instead of
  // spilling arbitrarily far down the page. History of getting this wrong,
  // because it matters for judging any future change here:
  //
  // - Originally chased GAMA's dialogue top exactly (zero overlap, but
  //   coupled nav's size to her, which shrank whenever her own footprint
  //   grew).
  // - Tried decoupling entirely by measuring against the ticker instead -
  //   real content nav shouldn't render under, and NOT her position at
  //   all. But the ticker sits well below where she actually is (she
  //   needs clearance above the footer+ticker), so that let nav grow tall
  //   enough on pages with a long active category that her fixed,
  //   constant-height box ended up stranded in the MIDDLE of a long
  //   scrolled-into-view nav list instead of just grazing its tail.
  // - Bounding against her real box-top worked but was still, structurally,
  //   "nav's size depends on her" - technically not coupled to her content
  //   anymore, but the dependency itself was the objection.
  //
  // Tried a fixed 60/40 percentage split of the nav-alpha-to-ticker
  // distance next - clean in theory, but measured against her REAL
  // rendered position on a real page: her actual footprint (portrait +
  // dialogue + the footer/ticker clearance she needs below her, which is
  // a separate, legitimate requirement from anything about nav-beta) ate
  // roughly 65-70% of that same zone on an ordinary viewport, not 40%. A
  // fixed percentage can't be honored when the thing it's supposed to
  // leave room for is bigger than the room it's given - it just produces
  // confident, wrong overlap instead of the honest, minor kind.
  //
  // What "her position depends on the ticker, not on nav" actually means
  // in code: her `bottom` value is computed purely from the ticker/
  // footer (updateGamaBottomClear, unchanged, never referenced nav) -
  // that's a real, one-way fact about her. Nav, in turn, has to know
  // where that leaves her in order to not render on top of her - that
  // dependency runs the other way and is unavoidable, not a bug to
  // engineer around. So: measure her REAL current top edge (dialogue if
  // present, since it extends further up than the portrait box) and cap
  // nav just short of it. Zero overlap, no artificial floor forcing nav
  // to claim space that isn't there, and nav's size is a direct
  // consequence of her real position rather than a percentage guess that
  // doesn't match her real footprint.
  function updateNavClearance() {
    if (window.innerWidth < 901) return;
    const nav = document.querySelector(".terminal-nav");
    const gamaBox = document.querySelector(".gama-mascot-box");
    if (!nav || !gamaBox) return;
    const dialogue = document.querySelector(".gama-dialogue");
    const navTop = nav.getBoundingClientRect().top;
    const boxTop = gamaBox.getBoundingClientRect().top;
    const dialogueTop = dialogue ? dialogue.getBoundingClientRect().top : boxTop;
    const gamaTop = Math.min(boxTop, dialogueTop);
    const clear = Math.max(80, gamaTop - navTop - 12);
    document.documentElement.style.setProperty("--gama-nav-clear", `${clear}px`);
  }

  function init() {
    logEl = document.getElementById("log-stream-feed");
    faceEl = document.querySelector(".aperture-eye");
    speechEl = document.getElementById("gama-speech");
    say("idle");
    const visits = bumpReturnVisits();
    if (visits > 1 && speechEl) {
      speechEl.textContent = `> welcome back. this is visit number ${visits}, not that i'm counting. (i'm counting.)`;
    }
    renderTally(getTally());
    initEasterEggs();

    updateGamaBottomClear();
    updateNavClearance();
    updateHeaderClearance();
    updateFavicon();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateGamaBottomClear();
        updateNavClearance();
        updateHeaderClearance();
      }, 150);
    });
    // All three measurements above run at DOMContentLoaded, before her
    // portrait image (and the footer/raven-watermark images) have
    // necessarily finished loading - .gama-mascot-box's rendered height
    // depends on that image's real dimensions, so measuring before it
    // loads can capture a box that's shorter than its final size, which
    // then understates how far up she actually reaches once everything
    // settles. Re-measuring once on window "load" (fires after every
    // resource, including images, has finished) catches that instead of
    // leaving nav clearance permanently wrong on whatever it guessed pre-
    // load. Was the real cause of nav-beta still overlapping her dialogue
    // even after the measurement logic itself was fixed to be correct.
    window.addEventListener("load", () => {
      updateGamaBottomClear();
      updateNavClearance();
      updateHeaderClearance();
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
