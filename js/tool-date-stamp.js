/* DATE_STAMP_RECON — parses messy human timestamps into machine notations.
   Also runs in reverse: a bare number is treated as a Unix epoch (seconds
   for up to 10 digits, milliseconds for 11+ - the same convention
   unixtimestamp.com and friends use, since Date.parse() can't tell a raw
   epoch integer from an unparseable string on its own). */

function parseToMachineStamp(inputStr) {
  const trimmed = inputStr.trim();
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    const ms = trimmed.replace("-", "").length >= 11 ? n : n * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  let cleaned = inputStr
    .replace(/(\d+)(st|nd|rd|th)\b/gi, "$1")
    .replace(/day of/gi, "");
  let timestamp = Date.parse(cleaned);
  if (isNaN(timestamp)) return null;
  return new Date(timestamp);
}

function formatOutputs(d) {
  // Use UTC getters, not local getters - Date.parse() on a bare "YYYY-MM-DD"
  // string produces UTC midnight, and reading that back with local getters
  // in a negative-UTC-offset timezone silently rolls the date back a day.
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const epoch = Math.floor(d.getTime() / 1000);
  return {
    "YYYYMMDD (filename-safe, UTC)": `${yyyy}${mm}${dd}`,
    "ISO 8601": d.toISOString(),
    "Unix Epoch": String(epoch),
    "Local time (your browser)": d.toString()
  };
}

function renderDateStamp(d, label) {
  const out = document.getElementById("date-result");
  const outputs = formatOutputs(d);
  out.innerHTML = Object.entries(outputs)
    .map(([k, val]) => `<div><span style="color:var(--phosphor-dim)">${k}:</span> ${val}</div>`)
    .join("");
  GAMA.say("success");
  GAMA.log(`Chronological debris converted: "${label}"`);
}

function executeDateStamp() {
  const input = document.getElementById("date-input");
  const out = document.getElementById("date-result");
  const raw = input.value;
  if (!raw.trim()) {
    GAMA.say("idle");
    return;
  }
  GAMA.say("working");
  setTimeout(() => {
    const parsed = parseToMachineStamp(raw);
    if (!parsed) {
      GAMA.say("error");
      out.textContent = "// unreadable timestamp";
      GAMA.log("Date recon failed - unparseable string");
      return;
    }
    renderDateStamp(parsed, raw);
  }, 250);
}

// "Now" button and the page's own default state both route through here -
// clears whatever's in the box so it's obvious the result is live/current,
// not a stale parse of old input.
function executeDateStampNow() {
  document.getElementById("date-input").value = "";
  renderDateStamp(new Date(), "now");
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("date-input")) executeDateStampNow();
});
