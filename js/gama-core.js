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
    ]},
    // Fires instead of "impatient" when the idle timer trips on a long page
    // the user has actually scrolled into - reading isn't the same as being
    // stuck, so she shouldn't nag about it the same way.
    reading: { face: "0_0", lines: [
      "> still reading. good. most people don't get this far.",
      "> take your time. i'll be here, mildly judging the ticker.",
      "> you've scrolled a while. deeply engaged or deeply lost. no judgment. slight judgment."
    ]},
    // First right-click of the session only - see the contextmenu listener
    // in init(). Doesn't touch the tally, doesn't block the real menu.
    poked: { face: ";)", lines: [
      "> right-click noted. looking for something, or just checking if i'm real?",
      "> there's nothing hidden in the browser's own menu. i checked. disappointing, i know."
    ]}
  };

  // One short, page-specific line per tool, keyed to TOOL_LIST's `code`
  // field (js/data-tool-list.js, loaded before this fires). Every entry
  // is "a message of her own" for that specific tool rather than the
  // same handful of generic success lines shared site-wide - see say()
  // for how it's mixed with the generic pool.
  const TOOL_LINES = {
    LINK_PURGE: ["> stripped. that url was carrying more corporate baggage than it let on."],
    DATE_STAMP_RECON: ["> time reformatted. still linear, still merciless, now at least legible."],
    QR_GEN: ["> encoded. a little grid of dots now knows your secret. don't lose it."],
    TOS_SCAN: ["> scanned. somewhere in there, a lawyer is very proud of that clause."],
    CASE_CONVERTER: ["> case converted. same words, new posture."],
    LETTER_COUNTER: ["> counted. every letter accounted for. don't ask about the ones you deleted."],
    COOL_TEXT: ["> reformatted into something a font foundry would wince at. gorgeous."],
    ASCII_BANNER: ["> banner rendered. low-res, high-effort, exactly the aesthetic."],
    BASE64_CODEC: ["> converted. same data, different disguise."],
    URL_CODEC: ["> encoded. the url is now safely wrapped in percent signs and regret."],
    HTML_CODEC: ["> entities swapped. the browser will thank you. it won't say so."],
    TEXT_DIFF: ["> diffed. i found every place your draft disagreed with itself."],
    PIG_LATIN: ["> anslated-tray. a proud, useless tradition preserved."],
    NATO_PHONETIC: ["> spelled out, alpha to zulu. now say it out loud, i dare you."],
    MORSE_CODE: ["> converted to dots and dashes. the original binary, before binary was cool."],
    TEXT_REVERSER: ["> reversed. reads the same amount of nonsense either direction."],
    LEETSPEAK: ["> 1337-ified. somewhere, 2004 just got a notification."],
    UPSIDE_DOWN_TEXT: ["> flipped. gravity is a suggestion in here."],
    SOCIAL_CHAR_COUNT: ["> counted. platforms change this limit more often than i change expression."],
    DIALECT_DECK: ["> translated into a dialect nobody asked for. you're welcome."],
    PALINDROME_CHECK: ["> checked. it reads the same forwards and back, unlike most excuses."],
    SLUG_GENERATOR: ["> slugged. lowercase, hyphenated, ready for a url that will outlive you."],
    MACRO_CALC: ["> macros split. the math doesn't care about your feelings on breakfast."],
    PERCENT_CALC: ["> calculated. the percentage is real even if the moment doesn't feel like it."],
    TIP_CALC: ["> tip calculated. tip your server. i don't get tipped. i get logged."],
    AGE_CALC: ["> calculated. time keeps doing the one thing it's good at."],
    ROMAN_NUMERAL: ["> converted. the romans didn't have a zero. neither do i, most days."],
    ASPECT_RATIO: ["> ratio locked. the rectangle approves."],
    DISCOUNT_CALC: ["> discounted. the math is real, the urgency banner probably wasn't."],
    UNIT_PRICE: ["> compared. the bigger box was not automatically the better deal. never is."],
    DATE_DIFF: ["> counted the days between. always more than you think or less than you hoped."],
    UNIT_CONVERTER: ["> converted. the universe runs on incompatible measurement systems out of pure spite."],
    SHOE_SIZE: ["> converted. feet are the same size in every system. the numbers just argue about it."],
    WORK_HOURS: ["> tallied. that's how much of your day you handed over. not judging. mostly."],
    COLOR_CONVERTER: ["> converted. same color, different dialect."],
    PALETTE_FORGE: ["> palette forged. five colors that now have to get along forever."],
    WALLPAPER_FORGE: ["> generated. a background for whatever you're avoiding doing."],
    CONTRAST_CHECK: ["> checked. legible, per a standard some committee argued about for years."],
    PAPER_SIZE: ["> referenced. paper sizes: the one thing two continents refuse to agree on."],
    COLOR_NAME: ["> named. every color secretly wants a better name than the one it got."],
    BOX_SHADOW: ["> shadow cast. depth, faked convincingly, same as most things."],
    BORDER_RADIUS: ["> rounded. sharp corners are a personality choice. i don't have corners."],
    CLAMP_CALC: ["> clamped. a value that finally knows its own limits."],
    EASING_VIZ: ["> eased. motion with a personality now, instead of just linear obligation."],
    GRADIENT_GEN: ["> gradient generated. two colors, pretending to agree the whole way through."],
    FONT_PAIRING: ["> paired. two typefaces now stuck together at a wedding they didn't choose."],
    BLOB_GEN: ["> blob generated. shapeless, on purpose, same as most of my mood."],
    PLACEHOLDER_IMG: ["> placeholder rendered. a rectangle pretending to be content, same as most banner ads."],
    SVG_PATTERN: ["> pattern tiled. repeats forever, unlike most of your other plans."],
    SYMBOL_INDEX: ["> indexed. every symbol your keyboard was too polite to have a key for."],
    EMOJI_INDEX: ["> indexed. a thousand tiny faces, none of them mine."],
    ACRONYM_INDEX: ["> looked up. an acronym, decoded, so you can nod like you always knew."],
    IMAGE_SALVAGE: ["> salvaged. the image, processed. no upload, no server, no witnesses but me."],
    STEGANOGRAPHY: ["> hidden. a message tucked inside pixels nobody thought to check."],
    ELA_CHECK: ["> analyzed. if something in that image was edited, the compression just told on it."],
    IMAGE_TO_BASE64: ["> converted. your image is now a very long, very ugly string. i respect it."],
    FAVICON_FORGE: ["> forged. a tiny icon, the smallest flag a website gets to plant."],
    JSON_FORMATTER: ["> formatted. the brackets finally line up. somewhere, a linter feels something."],
    XML_FORMATTER: ["> formatted. more angle brackets than strictly necessary, as tradition demands."],
    FAKE_DATA_GEN: ["> generated. entirely fictional people, doing entirely fictional things. lucky them."],
    CSS_JS_MINIFIER: ["> minified. every unnecessary space, gone. i relate."],
    UUID_GEN: ["> generated. a string more unique than most excuses i've heard."],
    HASH_GEN: ["> hashed. one-way trip. the original text isn't coming back from that."],
    PASSWORD_GEN: ["> generated. strong and random. write it down somewhere that isn't a sticky note."],
    REGEX_TESTER: ["> matched. the pattern found what it was looking for. regex always does, eventually."],
    JWT_DECODER: ["> decoded. no signature checked, just the truth of what's inside the envelope."],
    CRON_GEN: ["> parsed. a schedule, translated from cron's ancient dialect of asterisks."],
    RECIPE_CHAIN: ["> scaled. the recipe, resized. the ratio of butter to flour remains sacred."],
    CODE_SNAP: ["> rendered. your code, dressed up for a screenshot it didn't ask for."],
    DEAD_DROP: ["> encrypted. a message, sealed shut. i don't hold the key, so don't ask me."],
    BASE_CONVERTER: ["> converted. numbers, translated between bases that all insist they're the normal one."],
    HTTP_STATUS: ["> looked up. somewhere, a server is currently living that exact number."],
    UA_PARSER: ["> parsed. your browser, identified. it's been telling every site this the whole time."],
    LOREM_IPSUM: ["> generated. fake latin, filling space until real words show up."],
    JSON_CSV: ["> converted. nested data, flattened into rows. something's always lost in translation."],
    META_PREVIEW: ["> previewed. this is how the link looks before anyone actually clicks it."],
    ROBOTS_VALIDATOR: ["> validated. a polite request for robots to behave. they rarely listen. i do. mostly."],
    COMMIT_FORMATTER: ["> formatted. a commit message future-you can actually read. you're welcome, traitor."],
    CIPHER_DECK: ["> enciphered. an old trick, still holding up against casual curiosity."],
    LETTER_RACK_SOLVER: ["> solved. every valid word your tiles could make, sorted by how smug it'll make you feel."],
    ANAGRAM_SOLVER: ["> solved. your letters, rearranged into something that actually means something."],
    WU_NAME: ["> generated. a name for whatever this is. it didn't ask to exist. neither did i."],
    NUM_SPELL: ["> spelled. your number, translated into letters that spell something you didn't expect."],
    I_CHING: ["> cast. the ancient answer to a question you probably already knew."],
    MOON_PHASE: ["> checked. the moon, doing the one thing it's done for four billion years."],
    RUNES: ["> cast. an alphabet older than most of your excuses."],
    DECISION_WHEEL: ["> spun. the wheel decided. don't blame me, i just logged the spin."],
    DIVINE_ORACLE: ["> consulted. the oracle has spoken. take it exactly as seriously as it deserves."],
    DICE_ROLLER: ["> rolled. pure chance, no weighting, no mercy."],
    COIN_FLIP: ["> flipped. heads, tails, or the universe just felt like it."],
    STOPWATCH: ["> stopped. that's how long that took. don't think about it too hard."],
    USERNAME_GEN: ["> generated. an identity, ready to be argued over on at least three platforms."],
    WORD_SCRAMBLER: ["> scrambled. same letters, none of the dignity."],
    CROSSWORD_HELPER: ["> matched. every word that fits the pattern. the crossword didn't see that coming."],
    HANGMAN: ["> guessed. the word's fate, decided one letter at a time."],
    TIC_TAC_TOE: ["> played. a game older than computers, still undefeated by strategy."],
    WORD_SEARCH: ["> generated. a grid of letters hiding words on purpose. good luck."],
    SUDOKU: ["> generated. nine numbers, pretending they don't already know where they go."],
    BULLS_COWS: ["> guessed. closer. or further. i'm legally required to be vague about which."],
    TEAM_PICKER: ["> sorted. teams assigned. all complaints go to random.org, not me."],
    TRIVIA_QUIZ: ["> answered. correct or not, you now know something you didn't five minutes ago."],
    RAFFLE_PICKER: ["> drawn. a winner, selected. the raffle gods remain unbribable."],
    RESTAURANT_PICKER: ["> picked. the decision your group chat couldn't make in twenty minutes, made in one."],
    MOVIE_PICKER: ["> picked. something to watch. the arguing about it is still on you."],
    TASK_PICKER: ["> chosen. the list isn't shorter, but the deciding part is done."],
    CHECKLIST: ["> added. one more thing that exists now, in writing."],
    FOCUS_WRITE: ["> word count updated. that's the whole feature. that's the point."],
    HABIT_TRACKER: ["> logged. the grid remembers even on the days you'd rather it didn't."],
    ACCESS_BREACH: ["> access granted. the system never even saw you coming."],
    HOWTO_VERIFY_SOURCE: ["> good question to ask before you share anything. read on."],
    HOWTO_STRIP_METADATA: ["> your photos have been telling on you for years. let's fix that."],
    HOWTO_CHECK_BREACH: ["> somewhere out there, one of your passwords is probably already for sale. let's check."],
    HOWTO_ARCHIVE_PAGE: ["> the internet forgets things constantly. here's how to make it remember."],
    HOWTO_ANON_SIGNUP: ["> you don't owe every signup form your real name. here's how not to."],
    LINKS_DEV_TOOLS: ["> a shelf of tools i didn't have to build myself. professional courtesy."],
    LINKS_PRIVACY_UTILITY: ["> other people, also trying to keep your data out of the wrong hands."],
    LINKS_RESEARCH_EDU: ["> further reading, for when you're done pretending you'll get to it later."],
    LINKS_DESIGN_MEDIA: ["> more places to find the assets you'll forget you saved."],
    LINKS_FUN_CURIOS: ["> a shelf of nonsense, curated with real affection."],
    OSINT_DIRECTORY: ["> tools for finding out things people thought they'd hidden."],
    FREE_COURSES: ["> education, free, no signup wall in sight. rare enough to note."],
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

  // Matches the current page against TOOL_LIST (js/data-tool-list.js) by
  // URL rather than duplicating a page->code map here - one source of
  // truth for "what tool/page is this." Safe to call anytime say() runs:
  // data-tool-list.js is a synchronous <script> that loads right after
  // this file in base.html, so it's always defined well before any real
  // user interaction (or DOMContentLoaded) can trigger a say() call.
  function getPageToolCode() {
    if (typeof TOOL_LIST === "undefined") return null;
    const path = location.pathname;
    const match = TOOL_LIST.find((t) => path.endsWith("/" + t.url) || path.endsWith(t.url));
    return match ? match.code : null;
  }

  // Whether this page's one dedicated TOOL_LINES entry has been shown yet
  // this pageload. Per-page-load (not persisted), so it resets on every
  // navigation - a fresh page gets its own line surfaced once before
  // falling back to the shared, mixed-in pool for repeat actions.
  let contextualShown = false;

  // HOWTO_/LINKS_/OSINT_DIRECTORY/FREE_COURSES pages are read-only - no
  // tool-*.js ever runs on them, so "success" never fires and their
  // TOOL_LINES entry would otherwise never surface. Their entries are
  // written as an immediate greeting (present-tense, "here's what this
  // is") rather than a completed-action reaction, so it's fine for them
  // to show on "idle" (page load) instead. Real tool pages stay generic
  // on load - their entries are written as a reaction ("> converted...",
  // "> solved...") and would read wrong before anything's actually run.
  function isInformationalCode(code) {
    return !!code && (code.startsWith("HOWTO_") || code.startsWith("LINKS_") ||
      code === "OSINT_DIRECTORY" || code === "FREE_COURSES");
  }

  function say(stateKey) {
    const state = STATES[stateKey] || STATES.idle;
    if (faceEl) faceEl.textContent = state.face;
    const code = getPageToolCode();
    const contextual = code && TOOL_LINES[code];
    const wantsContextual = stateKey === "success" || (stateKey === "idle" && isInformationalCode(code));
    let line;
    if (wantsContextual && contextual && !contextualShown) {
      contextualShown = true;
      line = pick(contextual);
    } else if (wantsContextual && contextual) {
      line = pick(state.lines.concat(contextual));
    } else {
      line = pick(state.lines);
    }
    if (speechEl) speechEl.textContent = line;
    if (stateKey === "success") bumpTally();
  }

  function log(msg) {
    if (!logEl) return;
    const time = new Date().toTimeString().slice(0, 8);
    const entry = `[${time}] ${msg}`;
    logEl.textContent = entry + "   //   " + logEl.textContent;
  }

  // GAMA's `bottom` value depends on exactly one thing: the ticker's real
  // height, in case it ever wraps to a second line. That's it. Four
  // previous versions of this function tried to also account for the
  // footer (unconditionally, then conditionally on scroll position) to
  // stop her overlapping it, which was solving the wrong problem the
  // wrong way - she and the footer overlapping is cosmetic (she's
  // pointer-events:none), not a bug, and reserving space against content
  // that varies by page/scroll position is exactly the kind of dynamic
  // negotiation that kept producing a different wrong number on every
  // page. She doesn't need to know the footer exists. See .gama-mascot-box
  // in gama.css for the full reasoning.
  function updateTickerHeight() {
    const ticker = document.querySelector(".archival-log-footer");
    if (!ticker) return;
    document.documentElement.style.setProperty("--ticker-height", `${ticker.offsetHeight}px`);
  }

  // The header can wrap to a second line below ~480px viewport width (the
  // brand mark + "LINK: STABLE // MAG-LOCK: ENGAGED" status text don't
  // both fit on one row), but its CSS height was a static constant
  // (--header-h) that only ever accounted for one line. .terminal-header
  // itself now uses min-height so it grows to fit wrapped content instead
  // of clipping/overflowing past its own bottom edge - but .terminal-tabs
  // sticks at top: var(--header-h), so on a 2-line header the tabs bar was
  // still sticking at the 1-line height, overlapping the header's second
  // line instead of sitting below it. Read the header's actual rendered
  // height and let the tabs bar stick exactly there, whether it wrapped
  // or not, rather than guessing.
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

  // nav-beta's max-height is a plain static CSS calc() now (see
  // .terminal-nav in gama.css) - no JS function here at all. Four
  // straight attempts at computing this in JS against some aspect of
  // GAMA's rendered position (her dialogue top, her box top, a
  // percentage share of the space, in that order) each produced a
  // different wrong number on a different page, because the actual bug
  // was having nav-beta and GAMA negotiate the same space at all, not
  // which measurement the negotiation used. Removed the negotiation
  // instead of refining it further.

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

    updateTickerHeight();
    updateHeaderClearance();
    updateFavicon();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateTickerHeight();
        updateHeaderClearance();
      }, 150);
    });
    // No scroll listener here anymore - neither the ticker's height nor
    // the header's height changes as the page scrolls, only on resize
    // (the ticker could wrap to a second line, the header can too below
    // ~480px width). GAMA's position depending on scroll position at all
    // was itself the earlier bug (see updateTickerHeight's comment).

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
        // A long page the user has actually scrolled into reads as
        // "reading," not "stuck" - different flavor, same timer.
        const pageIsLong = document.documentElement.scrollHeight > window.innerHeight * 1.8;
        const hasScrolledIn = window.scrollY > window.innerHeight * 0.4;
        say(pageIsLong && hasScrolledIn ? "reading" : "impatient");
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

    // Right-click reaction: a one-off aside, not a gate. Never
    // preventDefault - the real context menu (inspect, copy, whatever)
    // still opens, this just reacts to it once per pageload so it doesn't
    // spam anyone using the actual menu repeatedly.
    let rightClickReacted = false;
    document.addEventListener("contextmenu", () => {
      if (rightClickReacted) return;
      rightClickReacted = true;
      say("poked");
    });

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
