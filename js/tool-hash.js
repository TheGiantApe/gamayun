/* HASH_GEN — SHA-1/256/384/512 via native SubtleCrypto (Web Crypto API).
   No MD5: it's not in SubtleCrypto (deliberately, it's cryptographically
   broken) and this tool isn't going to ship a hand-rolled implementation
   just to tick a checkbox - noted on the page instead of silently omitted. */

async function hashText(text, algo) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function executeHash() {
  const raw = document.getElementById("hash-input").value;
  const out = document.getElementById("hash-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  GAMA.say("working");
  const algos = [["SHA-1", "SHA-1"], ["SHA-256", "SHA-256"], ["SHA-384", "SHA-384"], ["SHA-512", "SHA-512"]];
  const results = await Promise.all(algos.map(async ([label, algo]) => [label, await hashText(raw, algo)]));
  out.innerHTML = results.map(([label, hash]) =>
    `<div style="margin-bottom:0.3rem;"><span style="color:var(--phosphor-dim)">${label}:</span><br><span style="word-break:break-all;">${hash}</span></div>`
  ).join("");
  GAMA.say("success");
}
