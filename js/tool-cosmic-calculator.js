/* COSMIC_CALCULATOR — four real traditional systems (accurate date
   ranges/algorithms, not invented content), presented honestly as
   folklore rather than science - same standing rule as Divine Oracle/
   I Ching/Fate Draw elsewhere on this site. */

/* --- Western Zodiac: standard tropical-zodiac date ranges --- */
const COSMIC_WESTERN = [
  { name: "Capricorn", start: [12, 22], end: [1, 19], blurb: "Traditionally read as disciplined, dry-humored, plays the long game." },
  { name: "Aquarius", start: [1, 20], end: [2, 18], blurb: "Traditionally read as detached, original, allergic to fitting in." },
  { name: "Pisces", start: [2, 19], end: [3, 20], blurb: "Traditionally read as dreamy, absorbs other people's moods, hard to pin down." },
  { name: "Aries", start: [3, 21], end: [4, 19], blurb: "Traditionally read as bold, direct, impatient with slow starts." },
  { name: "Taurus", start: [4, 20], end: [5, 20], blurb: "Traditionally read as steady, stubborn, allergic to being rushed." },
  { name: "Gemini", start: [5, 21], end: [6, 20], blurb: "Traditionally read as quick, curious, allergic to boredom." },
  { name: "Cancer", start: [6, 21], end: [7, 22], blurb: "Traditionally read as protective, moody, remembers everything." },
  { name: "Leo", start: [7, 23], end: [8, 22], blurb: "Traditionally read as confident, warm, needs the room to notice." },
  { name: "Virgo", start: [8, 23], end: [9, 22], blurb: "Traditionally read as precise, self-critical, quietly reliable." },
  { name: "Libra", start: [9, 23], end: [10, 22], blurb: "Traditionally read as fair, indecisive, allergic to conflict." },
  { name: "Scorpio", start: [10, 23], end: [11, 21], blurb: "Traditionally read as intense, private, doesn't forgive quietly." },
  { name: "Sagittarius", start: [11, 22], end: [12, 21], blurb: "Traditionally read as blunt, restless, allergic to staying put." },
];

function westernZodiac(month, day) {
  for (const sign of COSMIC_WESTERN) {
    const [sm, sd] = sign.start;
    const [em, ed] = sign.end;
    if (sm > em) {
      // wraps across the new year (Capricorn)
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return sign;
    } else if ((month === sm && day >= sd) || (month === em && day <= ed) || (month > sm && month < em)) {
      return sign;
    }
  }
  return null;
}

/* --- Chinese Zodiac: standard 12-year animal cycle. Uses the
   Gregorian year, since exact Lunar New Year dates shift year to year
   (roughly Jan 21-Feb 20) and aren't hardcoded here - flagged plainly
   for anyone born in that window rather than silently asserting false
   precision. */
const COSMIC_CHINESE_ANIMALS = [
  { name: "Rat", blurb: "Traditionally read as resourceful, quick-witted, thrifty." },
  { name: "Ox", blurb: "Traditionally read as dependable, stubborn, quietly strong." },
  { name: "Tiger", blurb: "Traditionally read as brave, competitive, impatient with caution." },
  { name: "Rabbit", blurb: "Traditionally read as gentle, cautious, allergic to conflict." },
  { name: "Dragon", blurb: "Traditionally read as confident, ambitious, hard to ignore." },
  { name: "Snake", blurb: "Traditionally read as wise, private, reads a room instantly." },
  { name: "Horse", blurb: "Traditionally read as energetic, independent, allergic to standing still." },
  { name: "Goat", blurb: "Traditionally read as gentle, creative, needs reassurance." },
  { name: "Monkey", blurb: "Traditionally read as clever, mischievous, quick with a workaround." },
  { name: "Rooster", blurb: "Traditionally read as precise, confident, says what it thinks." },
  { name: "Dog", blurb: "Traditionally read as loyal, honest, worries more than it shows." },
  { name: "Pig", blurb: "Traditionally read as generous, easygoing, underestimated often." },
];
function chineseZodiac(year) {
  const animal = COSMIC_CHINESE_ANIMALS[((year - 4) % 12 + 12) % 12];
  return animal;
}

/* --- Numerology: standard Life Path Number - sum every digit of the
   birth date, reduce repeatedly, but stop early if the running sum
   hits a master number (11/22/33), the standard convention. */
const COSMIC_LIFEPATH_MEANINGS = {
  1: "The starter. Independent, driven, uncomfortable following someone else's plan.",
  2: "The mediator. Diplomatic, sensitive, works best paired with someone else.",
  3: "The communicator. Expressive, creative, allergic to silence.",
  4: "The builder. Practical, disciplined, distrusts shortcuts.",
  5: "The free agent. Adaptable, restless, allergic to routine.",
  6: "The caretaker. Responsible, nurturing, takes on more than asked.",
  7: "The seeker. Analytical, private, wants real answers over comfortable ones.",
  8: "The executive. Ambitious, results-driven, good with structure and money.",
  9: "The old soul. Compassionate, idealistic, sees the bigger picture first.",
  11: "Master number - the intuitive. Heightened sensitivity, a 2 with the volume turned up.",
  22: "Master number - the master builder. Big vision paired with the discipline to actually build it.",
  33: "Master number - the master teacher. A 6 with an unusually wide sense of responsibility.",
};
function reduceDigits(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((sum, d) => sum + parseInt(d, 10), 0);
  }
  return n;
}
function lifePathNumber(year, month, day) {
  // Standard flat-digit-sum method: every digit in the date (YYYY, MM,
  // DD) summed together in one pass, then reduced - not year/month/day
  // reduced separately first. Different numerology schools disagree on
  // exactly when master numbers get preserved; this is the simpler,
  // more commonly cited version and avoids asserting a single "true"
  // convention where none really exists.
  const digits = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const total = digits.split("").reduce((sum, d) => sum + parseInt(d, 10), 0);
  return reduceDigits(total);
}

/* --- Compatibility: deterministic (same pair of dates always gives
   the same read - a real hash, not fresh randomness each click), and
   explicitly labeled as entertainment only, not a real compatibility
   metric. --- */
function stringHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}
const COSMIC_COMPAT_FLAVOR = {
  high: ["Rare, easy alignment - the kind that doesn't need translating.", "Different enough to stay interesting, similar enough to not clash over it."],
  mid: ["Workable, with a couple of honest friction points worth naming out loud.", "Compatible in the ways that matter most, mismatched in the small daily stuff."],
  low: ["Real effort required - not impossible, just not automatic.", "You'll have to build the bridge yourselves. It can hold, but it won't build itself."],
};
function compatibilityRead(signA, signB) {
  const score = 40 + (stringHash(signA.name + signB.name) % 56); // 40-95
  const tier = score >= 78 ? "high" : score >= 58 ? "mid" : "low";
  const flavor = COSMIC_COMPAT_FLAVOR[tier][stringHash(signA.name + signB.name + tier) % COSMIC_COMPAT_FLAVOR[tier].length];
  return { score, flavor };
}

/* --- UI wiring --- */
function cosmicModeChanged() {
  const mode = document.getElementById("cosmic-mode").value;
  document.getElementById("cosmic-date2-wrap").style.display = mode === "compatibility" ? "" : "none";
  document.getElementById("cosmic-date1-label").firstChild.textContent = mode === "compatibility" ? "first birth date " : "birth date ";
  executeCosmicCalculator();
}

function parseDateInput(id) {
  const val = document.getElementById(id).value;
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function executeCosmicCalculator() {
  const mode = document.getElementById("cosmic-mode").value;
  const out = document.getElementById("cosmic-result");
  const date1 = parseDateInput("cosmic-date1");

  if (!date1) { out.textContent = "// enter a birth date"; GAMA.say("idle"); return; }

  if (mode === "western") {
    const sign = westernZodiac(date1.month, date1.day);
    out.innerHTML = `<strong>${sign.name}</strong><br>${sign.blurb}`;
  } else if (mode === "chinese") {
    const animal = chineseZodiac(date1.year);
    const nearCutoff = (date1.month === 1) || (date1.month === 2 && date1.day <= 20);
    out.innerHTML = `<strong>Year of the ${animal.name}</strong><br>${animal.blurb}` +
      (nearCutoff ? `<br><span style="color:var(--amber); font-size:0.8rem;">// Lunar New Year falls between Jan 21-Feb 20 depending on the year - born in this window, this could be off by one animal. Worth double-checking your exact year's cutoff.</span>` : "");
  } else if (mode === "numerology") {
    const num = lifePathNumber(date1.year, date1.month, date1.day);
    out.innerHTML = `<strong>Life Path ${num}</strong><br>${COSMIC_LIFEPATH_MEANINGS[num]}`;
  } else if (mode === "compatibility") {
    const date2 = parseDateInput("cosmic-date2");
    if (!date2) { out.textContent = "// enter both birth dates"; GAMA.say("idle"); return; }
    const signA = westernZodiac(date1.month, date1.day);
    const signB = westernZodiac(date2.month, date2.day);
    const { score, flavor } = compatibilityRead(signA, signB);
    out.innerHTML = `<strong>${signA.name} &amp; ${signB.name}: ${score}%</strong><br>${flavor}<br><span style="color:var(--phosphor-dim-text); font-size:0.8rem;">// for fun only - not a real compatibility metric</span>`;
  }
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", cosmicModeChanged);
