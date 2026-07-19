/* SOCIAL_CHAR_COUNT — all platform limits shown at once instead of
   picking one first. Limits are maintained/curated, not computed - they
   genuinely drift as platforms change policy, so this is flagged rather
   than presented as permanently authoritative. */

const SOCIAL_LIMITS = [
  { name: "X / Twitter", limit: 280 },
  { name: "Threads", limit: 500 },
  { name: "Bluesky", limit: 300 },
  { name: "Instagram caption", limit: 2200 },
  { name: "TikTok caption", limit: 2200 },
  { name: "LinkedIn post", limit: 3000 },
  { name: "YouTube description", limit: 5000 },
  { name: "Facebook post", limit: 63206 },
];

function executeSocialCount() {
  const text = document.getElementById("social-input").value;
  const out = document.getElementById("social-result");
  if (!text) { GAMA.say("idle"); out.innerHTML = ""; return; }

  const chars = Array.from(text).length; // codepoint count, not UTF-16 length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const rows = SOCIAL_LIMITS.map((p) => {
    const remaining = p.limit - chars;
    const over = remaining < 0;
    return `<div class="exif-row${over ? " exif-row-gps" : ""}"><span class="exif-key">${p.name}</span><span>${chars} / ${p.limit.toLocaleString()}${over ? ` (${Math.abs(remaining)} over)` : ""}</span></div>`;
  }).join("");

  out.innerHTML = `<p style="font-size:0.85rem; margin-bottom:0.5rem;">${chars} characters, ${words} words</p><div class="exif-table">${rows}</div>`;
  GAMA.say("success");
}
