/* PASSWORD_GEN — real CSPRNG (crypto.getRandomValues), rejection-sampled
   so every character set stays uniformly distributed (no modulo bias). */

const PW_CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>/?",
};
const PW_AMBIGUOUS = "il1Lo0O";

function randomInt(max) {
  // Rejection sampling against a uniform byte range to avoid modulo bias.
  const range = 256 - (256 % max);
  const arr = new Uint8Array(1);
  let x;
  do { crypto.getRandomValues(arr); x = arr[0]; } while (x >= range);
  return x % max;
}

function generatePassword(length, opts) {
  let pool = "";
  if (opts.lower) pool += PW_CHARSETS.lower;
  if (opts.upper) pool += PW_CHARSETS.upper;
  if (opts.digits) pool += PW_CHARSETS.digits;
  if (opts.symbols) pool += PW_CHARSETS.symbols;
  if (opts.excludeAmbiguous) pool = [...pool].filter((c) => !PW_AMBIGUOUS.includes(c)).join("");
  if (!pool) return null;
  let out = "";
  for (let i = 0; i < length; i++) out += pool[randomInt(pool.length)];
  return out;
}

function passwordEntropyBits(length, opts) {
  let poolSize = 0;
  if (opts.lower) poolSize += PW_CHARSETS.lower.length;
  if (opts.upper) poolSize += PW_CHARSETS.upper.length;
  if (opts.digits) poolSize += PW_CHARSETS.digits.length;
  if (opts.symbols) poolSize += PW_CHARSETS.symbols.length;
  if (opts.excludeAmbiguous) poolSize -= PW_AMBIGUOUS.length;
  if (poolSize <= 0) return 0;
  return length * Math.log2(poolSize);
}

function readPwOptions() {
  return {
    lower: document.getElementById("pw-lower").checked,
    upper: document.getElementById("pw-upper").checked,
    digits: document.getElementById("pw-digits").checked,
    symbols: document.getElementById("pw-symbols").checked,
    excludeAmbiguous: document.getElementById("pw-exclude-ambiguous").checked,
  };
}

function executePasswordGen() {
  const length = Math.min(128, Math.max(4, parseInt(document.getElementById("pw-length").value) || 16));
  const opts = readPwOptions();
  const out = document.getElementById("pw-result");
  const entropyEl = document.getElementById("pw-entropy");
  const pw = generatePassword(length, opts);
  if (pw === null) {
    GAMA.say("error");
    out.textContent = "// select at least one character set";
    entropyEl.textContent = "";
    return;
  }
  out.textContent = pw;
  const bits = passwordEntropyBits(length, opts);
  entropyEl.textContent = `~${bits.toFixed(1)} bits of entropy`;
  GAMA.say("success");
  GAMA.log(`Generated a ${length}-char password (~${bits.toFixed(0)} bits)`);
}
