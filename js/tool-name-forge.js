/* NAME_FORGE — nine themed name/phrase generators sharing one word-bank-
   and-pattern engine, instead of nine separate single-purpose pages.
   Every word bank here is original - no real band names, no franchise
   character names, no real people. Same modulo-pick convention already
   used elsewhere on this site (tool-username-gen.js) rather than
   rejection-sampling - fine for flavor-text randomness, not a security
   or fairness-critical context. */

function nfPick(arr) {
  return arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];
}

function nfPickN(arr, n) {
  return Array.from({ length: n }, () => nfPick(arr));
}

/* --- Metal Band --- */
const NF_METAL_PREFIX = ["Death", "Blood", "Iron", "Storm", "Doom", "Grave", "Black", "Night", "Ash", "Bone", "Frost", "Void", "Chaos", "Abyssal", "Cursed", "Molten", "Savage", "Eternal", "Silent", "Hollow"];
const NF_METAL_NOUN = ["Throne", "Reign", "Hammer", "Serpent", "Abyss", "Legion", "Wraith", "Cathedral", "Inferno", "Oblivion", "Requiem", "Sepulcher", "Leviathan", "Gallows", "Ashes", "Torment", "Dominion", "Coven", "Monolith", "Vortex"];
function genMetal() {
  const pattern = crypto.getRandomValues(new Uint32Array(1))[0] % 4;
  if (pattern === 0) return nfPick(NF_METAL_PREFIX) + nfPick(NF_METAL_NOUN);
  if (pattern === 1) return `${nfPick(NF_METAL_PREFIX)} ${nfPick(NF_METAL_NOUN)}`;
  if (pattern === 2) return `The ${nfPick(NF_METAL_NOUN)}s of ${nfPick(NF_METAL_PREFIX)}`;
  return `${nfPick(NF_METAL_NOUN)} ${nfPick(NF_METAL_NOUN)}`;
}

/* --- Pirate (individual) --- */
const NF_PIRATE_TITLE = ["Captain", "Commodore", "Admiral", "Quartermaster"];
const NF_PIRATE_FIRST = ["Silas", "Marguerite", "Bartholomew", "Isolde", "Cornelius", "Vesper", "Ezra", "Odalys", "Thaddeus", "Rosalind", "Cassius", "Wilhelmina", "Barnaby", "Seraphina", "Augustin"];
const NF_PIRATE_EPITHET = ["Blackscar", "Redtide", "Ironjaw", "Bonecutter", "Stormrider", "Deadeye", "Grimtooth", "Saltbones", "Wolfsbane", "Nightshade", "Crookfinger", "Foulwind", "Hollowgut", "Coldwater", "Ropeneck", "Ghostsail", "Rumrunner", "Cutthroat", "Tidewalker", "Ashenhook"];
function genPirate() {
  return `${nfPick(NF_PIRATE_TITLE)} ${nfPick(NF_PIRATE_FIRST)} "${nfPick(NF_PIRATE_EPITHET)}"`;
}

/* --- Pirate Ship & Crew --- */
const NF_SHIP_ADJ = ["Crimson", "Black", "Rotting", "Wailing", "Silver", "Ghostly", "Iron", "Sunken", "Howling", "Broken", "Drowned", "Bitter", "Restless", "Weeping", "Gilded"];
const NF_SHIP_NOUN = ["Widow", "Serpent", "Marauder", "Revenant", "Tempest", "Gallows", "Kraken", "Specter", "Maiden", "Vengeance", "Tide", "Reckoning", "Fathom", "Corsair", "Banshee"];
const NF_CREW_REP = ["feared", "unlucky", "legendary", "cursed", "forgotten", "notorious", "mutinous", "unstoppable", "half-starved but loyal", "quietly terrifying"];
function genPirateCrew() {
  const hands = 8 + (crypto.getRandomValues(new Uint32Array(1))[0] % 40);
  return `The ${nfPick(NF_SHIP_ADJ)} ${nfPick(NF_SHIP_NOUN)}\ncrew: ${hands} hands, ${nfPick(NF_CREW_REP)} reputation`;
}

/* --- Fantasy / RPG Character (shared name-building with D&D below) --- */
const NF_FANTASY_RACE = ["Human", "Elven", "Dwarven", "Half-Orc", "Halfling", "Tiefling", "Gnomish", "Dragonborn", "Fae-touched", "Orcish"];
const NF_FANTASY_CLASS = ["Ranger", "Paladin", "Rogue", "Sorcerer", "Warlock", "Druid", "Bard", "Barbarian", "Cleric", "Monk", "Wizard", "Fighter"];
const NF_SYLL_1 = ["Thal", "Ely", "Bran", "Isol", "Kael", "Ser", "Vor", "Lyr", "Dor", "Nym", "Fen", "Gwyn", "Or", "Syl", "Rhys"];
const NF_SYLL_2 = ["indra", "wen", "dor", "de", "ric", "ith", "ryn", "wyn", "ael", "essa", "or", "ian", "eth", "yra", "ond"];
const NF_FANTASY_SURNAME = ["Emberfall", "Nightwhisper", "Stormbrook", "Ashenvale", "Duskmere", "Ironroot", "Frostwind", "Shadowmere", "Brightwater", "Grimhollow", "Thornfield", "Moonshale", "Bloodmoor", "Sunspire", "Wyrmscale"];
function genFantasyName() {
  return `${nfPick(NF_SYLL_1)}${nfPick(NF_SYLL_2)} ${nfPick(NF_FANTASY_SURNAME)}`;
}
function genFantasy() {
  return `${genFantasyName()}, ${nfPick(NF_FANTASY_RACE)} ${nfPick(NF_FANTASY_CLASS)}`;
}

/* --- Superhero / Supervillain --- */
const NF_HERO_PREFIX = ["Captain", "The", "Doctor", "Agent"];
const NF_HERO_POWER = ["Storm", "Blaze", "Shadow", "Volt", "Titan", "Nova", "Phantom", "Comet", "Vortex", "Radiant", "Quicksilver", "Ironclad", "Aegis", "Meteor", "Prism", "Cipher", "Solstice", "Nimbus", "Zenith", "Ember"];
function genSuperhero() {
  const pattern = crypto.getRandomValues(new Uint32Array(1))[0] % 3;
  const power = nfPick(NF_HERO_POWER);
  if (pattern === 0) return `Captain ${power}`;
  if (pattern === 1) return `The ${power}`;
  return `${power}strike`;
}

const NF_VILLAIN_PREFIX = ["Doctor", "Baron", "Lord", "Madame", "The", "Professor"];
const NF_VILLAIN_DARK = ["Malice", "Nightmare", "Venom", "Chaos", "Ruin", "Blight", "Despair", "Cataclysm", "Oblivion", "Menace", "Dread", "Sorrow", "Havoc", "Perdition", "Malevolence", "Torment", "Grief", "Nemesis", "Corruption", "Wraithe"];
function genSupervillain() {
  return `${nfPick(NF_VILLAIN_PREFIX)} ${nfPick(NF_VILLAIN_DARK)}`;
}

/* --- D&D Character + Backstory Seed --- */
const NF_DND_INCIDENT = ["watched their village burn", "was exiled for a crime they didn't commit", "made a pact they don't fully understand", "lost a bet with something that wasn't human", "woke up with no memory of the last decade", "was the only survivor of a shipwreck", "stole something that wasn't meant to be stolen", "was raised by the wrong side of a war", "broke an oath they swore never to break", "found a door that shouldn't have existed"];
const NF_DND_GOAL = ["a way to undo it", "the truth about their bloodline", "revenge, quietly, patiently", "a debt paid in full", "a name worth remembering", "one more year of peace", "forgiveness they don't think they deserve", "the thing that was taken from them", "a place that will finally hold still"];
const NF_DND_FLAW = ["a temper they can't always control", "a debt to someone dangerous", "trusting the wrong people, every time", "a promise they already know they'll break", "a fear they'll never admit to", "a habit of running before it's necessary"];
function genDnd() {
  const race = nfPick(NF_FANTASY_RACE);
  const cls = nfPick(NF_FANTASY_CLASS);
  const name = genFantasyName();
  return `${name}, ${race} ${cls}\nA ${race.toLowerCase()} ${cls.toLowerCase()} who ${nfPick(NF_DND_INCIDENT)}, now seeking ${nfPick(NF_DND_GOAL)} - haunted by ${nfPick(NF_DND_FLAW)}.`;
}

/* --- Drag / Stage Persona --- */
const NF_PERSONA_ADJ = ["Crystal", "Vanity", "Scarlett", "Electra", "Velvet", "Diamond", "Raven", "Cherry", "Foxglove", "Champagne", "Marble", "Lavender", "Frostine", "Odessa", "Blaze"];
const NF_PERSONA_SURNAME = ["Devereaux", "Delight", "Sinclaire", "Nightingale", "St. Clair", "Monroe", "LaFleur", "Valentine", "Diamonde", "Duvall", "Fontaine", "Chevalier", "Roux", "Belle", "Storm"];
function genPersona() {
  return `${nfPick(NF_PERSONA_ADJ)} ${nfPick(NF_PERSONA_SURNAME)}`;
}

/* --- Cocktail --- */
const NF_COCKTAIL_MOOD = ["Smoking", "Velvet", "Midnight", "Bitter", "Wicked", "Gilded", "Restless", "Honeyed", "Feral", "Hollow", "Electric", "Forgotten", "Sultry", "Crooked", "Radiant"];
const NF_COCKTAIL_FLAVOR = ["Gin", "Rum", "Bourbon", "Amber", "Cherry", "Smoke", "Ember", "Citrus", "Clove", "Fig", "Basil", "Ginger", "Rose", "Chili", "Plum"];
const NF_COCKTAIL_SUFFIX = ["Serenade", "Fizz", "Sour", "Smash", "Spritz", "Mule", "Punch", "Old Fashioned", "Martini", "Julep", "Nightcap", "Sling", "Reverie"];
function genCocktail() {
  return `${nfPick(NF_COCKTAIL_MOOD)} ${nfPick(NF_COCKTAIL_FLAVOR)} ${nfPick(NF_COCKTAIL_SUFFIX)}`;
}

const NF_GENERATORS = {
  metal: genMetal,
  pirate: genPirate,
  "pirate-crew": genPirateCrew,
  fantasy: genFantasy,
  superhero: genSuperhero,
  supervillain: genSupervillain,
  dnd: genDnd,
  persona: genPersona,
  cocktail: genCocktail,
};

function executeNameForge() {
  const category = document.getElementById("nameforge-category").value;
  const generator = NF_GENERATORS[category];
  const out = document.getElementById("nameforge-result");
  out.textContent = generator();
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", executeNameForge);
