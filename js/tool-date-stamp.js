/* DATE_STAMP_RECON — parses messy human timestamps into machine notations. */

function parseToMachineStamp(inputStr) {
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
    const outputs = formatOutputs(parsed);
    out.innerHTML = Object.entries(outputs)
      .map(([label, val]) => `<div><span style="color:var(--phosphor-dim)">${label}:</span> ${val}</div>`)
      .join("");
    GAMA.say("success");
    GAMA.log(`Chronological debris converted: "${raw}"`);
  }, 250);
}
