/* Boot-sequence script bank for the header status line on the homepage.
   Played one line at a time by js/boot-sequence.js, which then settles
   back to the resting line and stays there.

   THE GENRE, so additions stay on-model (Vin, 2026-08-13): these are
   "Read-And-Do Method" checklists - the movie scene where somebody walks
   a machine through its startup out loud - rewritten as one person
   talking to themselves while opening up shop. Not quoted dialogue, not
   a log dump: a person, alone, going down a list and answering himself.

   What makes one work:
     - It opens by announcing the job ("Alright, let's open up shop").
     - It's call-and-response. A question, then its own answer.
     - The answers are clipped. "Check." carries a whole beat by itself.
     - Something goes slightly wrong near the end and gets shrugged off.
     - It ends mid-procedure, not on a triumphant note. The site is
       already running by the time you'd have finished reading.

   Keep individual lines SHORT. They render in a single-line, no-wrap
   slot in the header - boot-sequence.js truncates rather than wraps, on
   purpose, because a growing header shoves the sticky tab bar around
   (see .terminal-header in gama.css). Roughly 45 characters is the safe
   ceiling; the longest lines below sit just under it.

   TO ADD A SCRIPT: append an object with a unique `id`, a `name` (for
   your own reference, never rendered), and `lines`. That's the whole
   contract. An optional `season` object {from:"MM-DD", to:"MM-DD"}
   restricts it to a date window - seasonal scripts are preferred over
   evergreen ones whenever their window is open, so an October visit
   gets the Halloween bank instead of the regular one. Windows may wrap
   the year end (from:"12-26", to:"01-02" works). */

const GAMA_BOOT_SCRIPTS = [
  {
    id: "flux",
    name: "Time circuits / flux capacitor",
    lines: [
      "Alright, let's get this place running.",
      "First, turn on the time circuits.",
      "[Flips switch]",
      "Good, the readout is live.",
      "Where you're going.",
      "Where you are.",
      "Where you've been.",
      "Everything is tracking.",
      "Now, input destination coordinates.",
      "November 5, 1955.",
      "Perfect.",
      "Wait, watch that tracking dial.",
      "That's the plutonium decay rate.",
      "Got to keep an eye on that.",
      "Next, is the flux capacitor pulsing?",
      "Pulsing.",
      "Check.",
      "Now wind her up to exactly 88.",
    ],
  },
  {
    id: "openshop",
    name: "Cockpit checklist / opening up shop",
    lines: [
      "Alright, let's open up shop.",
      "Auto-pilot?",
      "Engaged. Check.",
      "Heavy particles?",
      "Filtered. Check.",
      "Radar-range?",
      "Calibrated. Check.",
      "Blinkenlights?",
      "[Glances at console]",
      "Blinking. Check.",
      "Passive matrix?",
      "Switching to active. Check.",
      "Coffee maker?",
      "Brewing. Check.",
      "Artificial gravity?",
      "On. Wait. Off. Wait.",
      "Floating. Check.",
    ],
  },
  {
    id: "salvagebay",
    name: "Salvage bay cold open",
    lines: [
      "Right. Let's get the bay open.",
      "Bring the floods up slow.",
      "[Ticking, then light]",
      "There she is.",
      "Hull pressure?",
      "Holding. Check.",
      "Scrubbers?",
      "Running. Check.",
      "Grapple arm, full extension.",
      "[Whine of servos]",
      "Little stiff on the elbow.",
      "It'll loosen up.",
      "Manifest board?",
      "Lit. Check.",
      "Anything on the long-range?",
      "Quiet.",
      "Good. Quiet's good.",
      "Okay. Open the doors.",
    ],
  },
  {
    id: "darkroom",
    name: "Darkroom / develop the plates",
    lines: [
      "Okay. Doors shut, lock it.",
      "Safelight on.",
      "[Red glow]",
      "That's the one.",
      "Developer, sixty-eight degrees.",
      "Sixty-eight on the nose. Check.",
      "Stop bath?",
      "Poured. Check.",
      "Fixer?",
      "...Fixer.",
      "[Rummaging]",
      "Fixer. Check.",
      "Timer set. Agitate every thirty.",
      "Now we find out what we've got.",
      "Slide it in.",
      "And wait.",
      "Never gets old, this part.",
    ],
  },
  {
    id: "projectionist",
    name: "Projection booth, last show of the night",
    lines: [
      "Last show. Let's thread her up.",
      "Lamp?",
      "Struck. Check.",
      "Give it a minute to come up.",
      "Gate clean?",
      "[Blows across it]",
      "Clean. Check.",
      "Loop above, loop below.",
      "Both good. Check.",
      "Sound head?",
      "Reading. Check.",
      "Changeover cue on reel two.",
      "Marked. Check.",
      "Douser open.",
      "House lights down.",
      "And... roll it.",
    ],
  },
  {
    id: "brew",
    name: "Witch's brew (Halloween)",
    season: { from: "10-01", to: "10-31" },
    lines: [
      "Alright. Let's get the pot on.",
      "Fire up. Not too high.",
      "[Crackle]",
      "There we go.",
      "Water to the second ring.",
      "Filled. Check.",
      "Eye of newt?",
      "Two. Check.",
      "Toe of frog?",
      "...We're out of toe of frog.",
      "Knee of frog. Nobody'll know.",
      "Check.",
      "Now stir. Widdershins only.",
      "Other way. Other way.",
      "There.",
      "Wool of bat, and a good scream.",
      "[Screams politely]",
      "Check.",
      "Now we let her bubble.",
    ],
  },
  {
    id: "sleigh",
    name: "Sleigh pre-flight (late December)",
    season: { from: "12-18", to: "12-26" },
    lines: [
      "Okay. One night. Let's go.",
      "Runners waxed?",
      "Waxed. Check.",
      "Bells?",
      "[Shakes them once]",
      "Bells. Check.",
      "Manifest loaded, north to south.",
      "Loaded. Check.",
      "Reindeer, count off.",
      "...That's seven.",
      "[Counts again]",
      "That's eight. Check.",
      "Nose?",
      "Lit. Check.",
      "Altitude on my mark.",
      "And we're off.",
    ],
  },
];
