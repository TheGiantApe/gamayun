/* MAGIC_8_BALL — CSPRNG pick from a curated response pool. Original
   phrasing throughout, not the toy's own 20 printed answers: the
   ask-a-yes/no-question-shake-for-an-answer format itself is generic and
   centuries older than any one toy, but the specific wording printed
   inside a real Magic 8-Ball belongs to Mattel, so this is GAMA's own
   oracle rather than a lookalike of theirs. */

const EIGHTBALL_RESPONSES = [
  // affirmative
  "The data supports it.",
  "Every signal says yes.",
  "Confirmed, proceed.",
  "Odds favor you here.",
  "Reads clean. Go.",
  "Yes, and you already knew that.",
  "Affirmative, for what my confidence is worth.",
  // negative
  "Every signal says no.",
  "The data does not support it.",
  "Reads corrupted. Don't.",
  "No, and you already knew that too.",
  "Negative. Try a different question.",
  "Odds are against you here.",
  // noncommittal
  "Insufficient data to answer honestly.",
  "Ask again once the situation actually changes.",
  "Unclear. That's not evasion, the signal is genuinely mixed.",
  "Could go either way. Flip a coin, at least that's honest about it.",
  "I have a guess. I'm not sharing it.",
  "Reconsult later - this one's still resolving.",
  "That depends on something you didn't tell me.",
  "Ask again. I have infinite patience and nothing else to do.",
];

function executeEightBall() {
  const orb = document.getElementById("eightball-orb");
  const orbText = document.getElementById("eightball-orb-text");
  const out = document.getElementById("eightball-result");
  const question = document.getElementById("eightball-question").value.trim();

  GAMA.say("working");
  orb.classList.remove("eightball-orb-shake");
  void orb.offsetWidth; // restart the animation even on back-to-back clicks
  orb.classList.add("eightball-orb-shake");
  orbText.textContent = "8";
  out.textContent = "";

  setTimeout(() => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const answer = EIGHTBALL_RESPONSES[buf[0] % EIGHTBALL_RESPONSES.length];
    orbText.textContent = "";
    out.innerHTML =
      (question ? `<div style="color:var(--phosphor-dim-text); font-size:0.85rem; margin-bottom:0.5rem;">"${question.replace(/&/g, "&amp;").replace(/</g, "&lt;")}"</div>` : "") +
      `<div>${answer}</div>`;
    GAMA.say("success");
    GAMA.log("Consulted the 8-ball: " + answer);
  }, 500);
}
