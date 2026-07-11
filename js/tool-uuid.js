/* UUID_GEN — v4 UUIDs via crypto.randomUUID (real CSPRNG, not Math.random). */

function generateUuids(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(crypto.randomUUID ? crypto.randomUUID() : fallbackUuid());
  }
  return out;
}

// Fallback for older browsers without crypto.randomUUID - still uses
// crypto.getRandomValues (CSPRNG), just assembles the v4 format manually.
function fallbackUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10,16).join("")}`;
}

function executeUuidGen() {
  const count = Math.min(50, Math.max(1, parseInt(document.getElementById("uuid-count").value) || 1));
  const out = document.getElementById("uuid-result");
  out.textContent = generateUuids(count).join("\n");
  GAMA.say("success");
  GAMA.log(`Generated ${count} UUID(s)`);
}
