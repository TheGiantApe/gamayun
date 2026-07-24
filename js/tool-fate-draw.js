/* FATE_DRAW — six novelty draw/generator modes sharing one engine.
   Same honesty standard as Divine Oracle/I Ching elsewhere on this
   site: framed as a novelty draw, not a real prediction. Tarot uses
   the traditional 22-card Major Arcana structure (a centuries-old
   public domain tradition predating any single publisher, same
   footing as I Ching/Runes) with entirely original one-line readings
   written for this tool - not any specific deck's published wording. */

function fdPick(arr) {
  return arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];
}

/* --- Tarot --- */
const FD_TAROT = [
  { name: "The Fool", meaning: "A start with no map. Risk isn't the danger here - false certainty is." },
  { name: "The Magician", meaning: "You already have what you need. Stop waiting for permission." },
  { name: "The High Priestess", meaning: "The answer is quieter than you're listening for." },
  { name: "The Empress", meaning: "Growth, but slow. Nothing here rewards rushing it." },
  { name: "The Emperor", meaning: "Structure holds. So does the person who built it." },
  { name: "The Hierophant", meaning: "Tradition has an answer. You don't have to like it to use it." },
  { name: "The Lovers", meaning: "A choice, not a feeling. Choose like it's permanent." },
  { name: "The Chariot", meaning: "Momentum without direction is just noise. Aim before you move." },
  { name: "Strength", meaning: "The quiet kind. The kind that doesn't need an audience." },
  { name: "The Hermit", meaning: "Nobody's coming to get you started. Go anyway." },
  { name: "Wheel of Fortune", meaning: "Nothing you're feeling right now is permanent. Good or bad." },
  { name: "Justice", meaning: "The math comes out even eventually. Not on your schedule, though." },
  { name: "The Hanged Man", meaning: "Stop pushing. The stuck feeling is the lesson, not the obstacle." },
  { name: "Death", meaning: "Not that kind. The kind where something ends so something else can start." },
  { name: "Temperance", meaning: "The mix matters more than either ingredient alone." },
  { name: "The Devil", meaning: "The chain was never actually locked. Check." },
  { name: "The Tower", meaning: "It was going to fall eventually. Better now than load-bearing." },
  { name: "The Star", meaning: "Quiet hope, not loud hope - the kind that survives being wrong once." },
  { name: "The Moon", meaning: "Something's distorted right now. Wait for daylight before deciding what." },
  { name: "The Sun", meaning: "Uncomplicated good. Rare enough to just take it without picking it apart." },
  { name: "Judgement", meaning: "An old account is due. Settle it or keep carrying it - your call." },
  { name: "The World", meaning: "A full circle closing. Something else opens the moment it does." },
];
function genTarot() {
  const card = fdPick(FD_TAROT);
  return `${card.name}\n${card.meaning}`;
}

/* --- Fortune Cookie --- */
const FD_FORTUNES = [
  "The thing you're avoiding is smaller than the avoiding.",
  "A closed door rarely locks itself.",
  "Someone is about to ask a favor you should feel free to refuse.",
  "The best time was a while ago. The second best time is still available.",
  "You will be right about something and wrong about the timing.",
  "Patience is not the same as waiting.",
  "A small risk taken now prevents a larger one later.",
  "The thing you're quietly proud of, someone else needed to see today.",
  "Not every silence is a rejection.",
  "You already made the decision. You're just narrating it now.",
  "The map is wrong about one detail. You'll find it eventually.",
  "Help arrives right after you stop performing that you don't need it.",
  "The apology you're owed may never come. Proceed anyway.",
  "A stranger's advice will matter more than a friend's, just this once.",
  "The thing that broke was already load-bearing for something else.",
  "You are one honest conversation away from a lighter week.",
  "The version of the plan you're overthinking is the one that works.",
  "Someone remembers a kindness you've already forgotten doing.",
];
function genFortune() {
  const fortune = fdPick(FD_FORTUNES);
  const nums = new Set();
  while (nums.size < 6) nums.add(1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 49));
  return `${fortune}\nlucky numbers: ${[...nums].sort((a, b) => a - b).join(", ")}`;
}

/* --- Lucky Numbers (standalone, larger draw) --- */
function genLuckyNumbers() {
  const nums = new Set();
  while (nums.size < 6) nums.add(1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 49));
  return `${[...nums].sort((a, b) => a - b).join(", ")}\n// no guarantee implied. none at all.`;
}

/* --- Sign From the Universe --- */
const FD_SIGNS = [
  "That repeating number you keep noticing isn't a message - it's pattern recognition doing its job a little too well. Still, noted.",
  "The universe does not send parking spots. That one was just luck.",
  "You were thinking about them right before they reached out. Correlation, not telepathy. Still nice, though.",
  "The song that came on wasn't for you specifically. Enjoy it anyway.",
  "That gut feeling is pattern-matching from experience you've forgotten having. Trust it exactly that much.",
  "Nothing lined up on purpose. It lining up anyway is still allowed to mean something to you.",
  "The universe is not tracking your specific inconvenience today. Small mercy: neither is anyone else.",
  "That coincidence had odds. Low, but not zero. You just happened to be standing in them.",
  "No one sent you this moment. You get to decide what it's for anyway.",
];
function genUniverseSign() {
  return fdPick(FD_SIGNS);
}

/* --- Personal Motto & Crest --- */
const FD_MOTTOS = [
  "Never apologize for the load-bearing parts.",
  "Slow is a pace, not a failure.",
  "Built to be repaired, not replaced.",
  "First, do not flinch.",
  "Held together on purpose.",
  "Quiet work outlasts loud claims.",
  "Bend before you break, break before you bow.",
  "Keep the receipts.",
  "Steady hands, short memory for grudges.",
  "Earned, not given.",
  "Small fires, put out early.",
  "Measure twice. Then measure again.",
];
const FD_CREST_ANIMAL = ["a fox mid-step", "a heron, one leg raised", "a badger, unbothered", "a raven with something shiny", "a moth facing the wrong light", "a tortoise, unhurried", "a crow counting", "a hare, mid-decision"];
const FD_CREST_OBJECT = ["a bent key", "a single lantern", "an open ledger", "a coiled rope", "a cracked bell", "a folded map", "a lit candle stub", "an anchor with no chain"];
const FD_CREST_COLOR = ["phosphor green", "oxidized copper", "deep indigo", "antique silver", "ash grey", "faded amber"];
function genMotto() {
  return `"${fdPick(FD_MOTTOS)}"\ncrest: ${fdPick(FD_CREST_ANIMAL)}, holding ${fdPick(FD_CREST_OBJECT)}, on a field of ${fdPick(FD_CREST_COLOR)}.`;
}

/* --- Fictional Deity Name --- */
const FD_DEITY_SYLL_1 = ["Or", "Vex", "Thal", "Nym", "Ur", "Kal", "Sev", "Bre", "Ith", "Wyn"];
const FD_DEITY_SYLL_2 = ["idon", "ara", "esh", "orin", "aeth", "una", "ivor", "eth", "ys", "andra"];
const FD_DEITY_DOMAIN = ["Rust", "Second Chances", "Unanswered Calls", "Almost-Kept Promises", "Static", "Lost Receipts", "Quiet Rooms", "Nearly-Empty Tanks", "Spare Keys", "Overdue Library Books", "Cold Coffee", "Half-Finished Projects", "Left Turns", "Deja Vu", "Forgotten Passwords", "Small Kindnesses Nobody Saw"];
function genDeity() {
  const name = `${fdPick(FD_DEITY_SYLL_1)}${fdPick(FD_DEITY_SYLL_2)}`;
  return `${name}, Patron of ${fdPick(FD_DEITY_DOMAIN)}`;
}

const FD_GENERATORS = {
  tarot: genTarot,
  fortune: genFortune,
  "lucky-numbers": genLuckyNumbers,
  "universe-sign": genUniverseSign,
  motto: genMotto,
  deity: genDeity,
};

function executeFateDraw() {
  const category = document.getElementById("fate-category").value;
  const generator = FD_GENERATORS[category];
  document.getElementById("fate-result").textContent = generator();
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", executeFateDraw);
