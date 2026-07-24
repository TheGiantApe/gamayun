/* PICK_ONE — orchestrator over 4 previously-separate "choose one for me"
   tools (Coin Flip, Dice Roller, the Decision Wheel family, Raffle
   Picker), consolidated per the Decision/RNG Tools Consolidation ticket.
   The underlying mechanisms are NOT rewritten - tool-coin-flip.js,
   tool-dice-roller.js, tool-decision-wheel.js, and tool-raffle-picker.js
   are all loaded unmodified, same IDs and function names they always
   had. This file only does two things: (1) show/hide the right panel
   for the selected mode, (2) for the 4 modes that share the wheel
   engine (bare custom list, Restaurant, Movie, Task), swap the wheel's
   placeholder/description/localStorage key/preset list underneath it
   when the sub-topic changes, since the wheel itself is a single DOM
   element reused across all four rather than four separate wheels.

   Team Picker stays a separate tool (a partition problem, not a
   pick-one-from-a-list problem) and isn't part of this. */

const PICKONE_PANELS = ["coin", "dice", "wheel-family", "raffle"];

// Every mode that shares the wheel engine. Keys match the <select>
// option values (restaurant/movie/task/wheel all resolve to the
// "wheel-family" panel; this map is what tells the shared wheel what
// to look/act like for whichever of the four is currently selected).
const PICKONE_WHEEL_MODES = {
  wheel: {
    desc: "One option per line. Add an optional weight with a trailing bar and number - \"Pizza | 3\" is three times as likely as a plain line - anything without one defaults to weight 1.",
    placeholder: "Pizza\nTacos\nSushi | 2\nBurgers",
    default: "Pizza\nTacos\nSushi | 2\nBurgers",
    storageKey: null, // ephemeral, same as the old standalone Decision Wheel
    presets: null,
  },
  restaurant: {
    desc: "Your list saves automatically in this browser - build your regular takeout rotation once, spin whenever \"what should we eat\" comes up again instead of retyping it every time. One option per line; add a weight (\"Thai | 2\") to make a place come up more often.",
    placeholder: "Thai place\nPizza\nTaco truck\nSushi | 2",
    default: "Thai place\nPizza\nTaco truck\nSushi | 2",
    storageKey: "gama_restaurant_list",
    presets: {
      "Mexican": ["Tacos", "Burrito", "Quesadilla", "Enchiladas", "Tamales", "Elote", "Chilaquiles", "Nachos"],
      "Italian": ["Pizza", "Pasta", "Risotto", "Calzone", "Lasagna", "Gnocchi", "Panini"],
      "Asian": ["Sushi", "Ramen", "Pad Thai", "Dumplings", "Fried Rice", "Pho", "Bibimbap", "Curry"],
      "Mediterranean": ["Gyro", "Falafel", "Hummus Plate", "Shawarma", "Kebab", "Greek Salad", "Baklava"],
      "American Comfort": ["Burger", "BBQ", "Fried Chicken", "Mac and Cheese", "Diner Breakfast", "Sandwich"],
      "Fast Casual": ["Poke Bowl", "Salad Bar", "Burrito Bowl", "Sub Sandwich", "Wings"],
    },
  },
  movie: {
    desc: "Your watchlist saves automatically in this browser - add to it over time, spin when it's time to actually pick something instead of scrolling forever. One title per line; add a weight to bias toward something you're more in the mood for.",
    placeholder: "add titles to your watchlist...",
    default: "",
    storageKey: "gama_watchlist",
    presets: {
      "Comedy": ["Rom-com", "Buddy comedy", "Dark comedy", "Slapstick", "Mockumentary", "Parody / spoof", "Workplace sitcom"],
      "Action": ["Heist", "Martial arts", "Spy thriller", "Disaster", "Superhero", "War"],
      "Drama": ["Coming of age", "Courtroom", "Biopic", "Family drama", "Slow burn"],
      "Horror": ["Slasher", "Psychological", "Found footage", "Supernatural", "Creature feature"],
      "Sci-Fi / Fantasy": ["Space opera", "Time travel", "Post-apocalyptic", "High fantasy", "Cyberpunk"],
      "Documentary": ["True crime", "Nature", "Music / concert film", "Historical", "Food"],
    },
  },
  task: {
    desc: "Paste your to-do list, spin to pick what to tackle when you're stuck deciding. Your list saves automatically in this browser. One task per line; add a weight (\"finish the report | 2\") to make something come up more often - decision fatigue is real, this is just a tiebreaker.",
    placeholder: "Reply to emails\nFold laundry\nFix that bug\nCall the dentist",
    default: "Reply to emails\nFold laundry\nFix that bug\nCall the dentist",
    storageKey: "gama_task_list",
    presets: null,
  },
};

function pickOnePanelFor(topic) {
  return topic in PICKONE_WHEEL_MODES ? "wheel-family" : topic;
}

function loadPickOneWheelList(mode) {
  if (mode.storageKey) {
    try {
      const saved = localStorage.getItem(mode.storageKey);
      if (saved !== null) return saved;
    } catch { /* localStorage unavailable - fall through to default */ }
  }
  return mode.default;
}

function savePickOneWheelList() {
  const topic = document.getElementById("pickone-topic").value;
  const mode = PICKONE_WHEEL_MODES[topic];
  if (!mode || !mode.storageKey) return; // "wheel" (bare custom) never persists, same as before
  try {
    localStorage.setItem(mode.storageKey, document.getElementById("wheel-input").value);
  } catch { /* localStorage unavailable - list just won't persist, same as elsewhere on this site */ }
}

function applyPickOnePreset() {
  const topic = document.getElementById("pickone-topic").value;
  const mode = PICKONE_WHEEL_MODES[topic];
  const presetName = document.getElementById("pickone-preset-select").value;
  if (!mode || !mode.presets || !presetName || !mode.presets[presetName]) return;
  document.getElementById("wheel-input").value = mode.presets[presetName].join("\n");
  redrawWheelFromInput();
  savePickOneWheelList();
}

function configureWheelFamilyPanel(topic) {
  const mode = PICKONE_WHEEL_MODES[topic];
  document.getElementById("pickone-wheel-desc").textContent = mode.desc;
  const textarea = document.getElementById("wheel-input");
  textarea.placeholder = mode.placeholder;
  textarea.value = loadPickOneWheelList(mode);

  const presetRow = document.getElementById("pickone-preset-row");
  const presetSelect = document.getElementById("pickone-preset-select");
  if (mode.presets) {
    presetSelect.innerHTML =
      '<option value="">&mdash; choose a preset &mdash;</option>' +
      Object.keys(mode.presets).map((name) => `<option value="${name}">${name}</option>`).join("");
    presetRow.style.display = "";
  } else {
    presetSelect.innerHTML = "";
    presetRow.style.display = "none";
  }

  redrawWheelFromInput();
}

function switchPickOneTopic() {
  const topic = document.getElementById("pickone-topic").value;
  const activePanel = pickOnePanelFor(topic);
  PICKONE_PANELS.forEach((p) => {
    const el = document.querySelector(`[data-pickone-panel="${p}"]`);
    if (el) el.hidden = p !== activePanel;
  });
  if (activePanel === "wheel-family") configureWheelFamilyPanel(topic);
}

document.addEventListener("DOMContentLoaded", switchPickOneTopic);
