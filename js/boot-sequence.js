/* Header boot sequence - homepage only, once per session.
   Walks one script from js/data-boot-scripts.js through the header's
   .system-status slot a line at a time, then settles back to the resting
   line ("LINK: STABLE // MAG-LOCK: ENGAGED") and leaves it there.

   WHY IT'S GATED THE WAY IT IS

   Homepage only: .system-status lives in base.html, so it renders on all
   ~150 pages. A 25-second monologue in the header of a tool page is
   noise while you're trying to use the tool. Vin picked homepage-only,
   once per session (2026-08-13); this file is only loaded on index.html
   (see the `js` list on the home entry in _src/build.py), and the
   sessionStorage guard below covers same-session returns to the homepage.

   Never wraps: the header is `justify-content: space-between` with a
   min-height that grows when the status text wraps - and gama-core.js's
   updateHeaderClearance() feeds that height into the sticky offset of
   .terminal-tabs. So a status line long enough to wrap would grow the
   header and shove the tab bar down, on every single beat of the script.
   That's a visible jolt roughly once a second. The .booting class pins
   the slot to one line and clips overflow, which makes layout shift
   structurally impossible rather than merely unlikely. Scripts are
   written short (see the note in data-boot-scripts.js) so clipping
   should never actually engage on a desktop-width header.

   Skipped below 901px: even pinned to one line, a narrow viewport would
   show a truncated fragment of each line, which is worse than not
   playing it at all. 901px is the site's existing desktop breakpoint
   (see .command-bridge-grid). Below it the resting line just stays put.

   Skipped under prefers-reduced-motion: a line of text replacing itself
   ~18 times is motion. Site convention is to honor the query (7 other
   places in gama.css do). The resting line stays put there too.

   Nothing here is load-bearing: every failure path leaves the resting
   line exactly as the server rendered it. */

(function () {
  "use strict";

  var RESTING_LINE = "LINK: STABLE // MAG-LOCK: ENGAGED";
  var SESSION_KEY = "gama_boot_played";
  var LAST_SCRIPT_KEY = "gama_boot_last_script";
  var MIN_WIDTH = 901;

  /* Per-line dwell: a floor so short beats ("Check.") still land as their
     own moment, plus time proportional to length so longer lines are
     actually readable, capped so nothing stalls. */
  var DWELL_BASE_MS = 620;
  var DWELL_PER_CHAR_MS = 38;
  var DWELL_MAX_MS = 2100;
  var LEAD_IN_MS = 900;
  var SETTLE_MS = 1400;

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* sessionStorage throws in some privacy modes rather than just being
     empty, and this is decorative - a storage failure must not take the
     header with it. On failure we report "already played" so the
     sequence silently declines to run instead of replaying every load. */
  function alreadyPlayedThisSession() {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return true;
    }
  }

  function markPlayed() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {
      /* no-op - see above */
    }
  }

  function readLastScriptId() {
    try {
      return window.localStorage.getItem(LAST_SCRIPT_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeLastScriptId(id) {
    try {
      window.localStorage.setItem(LAST_SCRIPT_KEY, id);
    } catch (e) {
      /* no-op */
    }
  }

  /* Inclusive MM-DD window that may wrap the year end, so a window like
     {from:"12-26", to:"01-02"} is expressible. Comparison is on the
     zero-padded "MM-DD" string, which sorts correctly within a year. */
  function inSeason(season, today) {
    if (!season || !season.from || !season.to) return false;
    var mmdd =
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    if (season.from <= season.to) {
      return mmdd >= season.from && mmdd <= season.to;
    }
    return mmdd >= season.from || mmdd <= season.to;
  }

  /* Seasonal scripts outrank evergreen ones entirely: if any window is
     open today, the pick comes from that pool only. Otherwise the pool
     is every script without a season. Within the pool, avoid repeating
     whatever played last time so consecutive visits differ - unless the
     pool has only one script, in which case repeating it is the only
     option and is fine. */
  function chooseScript(scripts, today) {
    var seasonal = scripts.filter(function (s) {
      return inSeason(s.season, today);
    });
    var pool = seasonal.length ? seasonal : scripts.filter(function (s) {
      return !s.season;
    });
    if (!pool.length) pool = scripts;
    if (!pool.length) return null;

    var lastId = readLastScriptId();
    var fresh = pool.filter(function (s) {
      return s.id !== lastId;
    });
    var candidates = fresh.length ? fresh : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function dwellFor(line) {
    return Math.min(DWELL_BASE_MS + line.length * DWELL_PER_CHAR_MS, DWELL_MAX_MS);
  }

  function play(statusEl, script) {
    var lines = script.lines;
    var i = 0;
    statusEl.classList.add("booting");

    function step() {
      if (i >= lines.length) {
        window.setTimeout(function () {
          statusEl.textContent = RESTING_LINE;
          statusEl.classList.remove("booting");
        }, SETTLE_MS);
        return;
      }
      var line = lines[i];
      statusEl.textContent = line;
      i += 1;
      window.setTimeout(step, dwellFor(line));
    }

    window.setTimeout(step, LEAD_IN_MS);
  }

  function init() {
    var statusEl = document.querySelector(".terminal-header .system-status");
    if (!statusEl) return;
    if (typeof GAMA_BOOT_SCRIPTS === "undefined" || !GAMA_BOOT_SCRIPTS.length) return;
    if (window.innerWidth < MIN_WIDTH) return;
    if (prefersReducedMotion()) return;
    if (alreadyPlayedThisSession()) return;

    var script = chooseScript(GAMA_BOOT_SCRIPTS, new Date());
    if (!script) return;

    markPlayed();
    writeLastScriptId(script.id);
    play(statusEl, script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
