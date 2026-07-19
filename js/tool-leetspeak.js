/* LEETSPEAK_CONVERTER — intensity-scaled substitution. Each tier adds
   more aggressive substitutions on top of the last rather than swapping
   to a different map, so raising the slider only ever adds noise. */

const LEET_LIGHT = { a: "4", e: "3", l: "1", o: "0", s: "5", t: "7" };
const LEET_MEDIUM = { i: "1", g: "9", b: "8", z: "2" };
const LEET_HEAVY = { c: "(", u: "|_|", w: "vv", m: "/\\/\\", n: "|\\|", v: "\\/", h: "#" };

const LEET_LABELS = { 1: "light", 2: "medium", 3: "heavy" };

function leetify(text, intensity) {
  const map = { ...LEET_LIGHT, ...(intensity >= 2 ? LEET_MEDIUM : {}), ...(intensity >= 3 ? LEET_HEAVY : {}) };
  return text
    .split("")
    .map((ch) => map[ch.toLowerCase()] ?? ch)
    .join("");
}

function executeLeetspeak() {
  const raw = document.getElementById("leet-input").value;
  const intensity = parseInt(document.getElementById("leet-intensity").value, 10);
  document.getElementById("leet-intensity-label").textContent = LEET_LABELS[intensity];
  const out = document.getElementById("leet-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  out.textContent = leetify(raw, intensity);
  GAMA.say("success");
}
