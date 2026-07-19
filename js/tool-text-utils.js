/* TEXT_UTILS — Palindrome Checker, Slug Generator, Text Reverser. Small,
   unrelated text tools, one file (same pattern as tool-calculators.js). */

function executePalindromeCheck() {
  const raw = document.getElementById("pal-input").value;
  const out = document.getElementById("pal-result");
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleaned) { GAMA.say("idle"); out.textContent = ""; return; }

  const reversed = cleaned.split("").reverse().join("");
  if (cleaned === reversed) {
    out.textContent = `yes - "${raw}" is a palindrome (${cleaned.length} letters/digits, ignoring case/spacing/punctuation)`;
    GAMA.say("success");
    return;
  }

  let mismatches = 0;
  for (let i = 0; i < Math.floor(cleaned.length / 2); i++) {
    if (cleaned[i] !== cleaned[cleaned.length - 1 - i]) mismatches++;
  }
  out.textContent = `no - not a palindrome. ${mismatches} character change${mismatches === 1 ? "" : "s"} would make it one.`;
  GAMA.say("idle");
}

/* Unicode NFD splits an accented letter into base + combining-mark
   codepoints (U+0300-U+036F); stripping just the marks leaves the plain
   letter behind instead of deleting the whole character outright. */
function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function executeSlugGenerate() {
  const raw = document.getElementById("slug-input").value;
  const out = document.getElementById("slug-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }
  const slug = slugify(raw);
  out.textContent = slug || "// nothing left after stripping non-URL-safe characters";
  GAMA.say(slug ? "success" : "error");
}

function executeTextReverse() {
  const raw = document.getElementById("rev-input").value;
  const mode = document.querySelector('input[name="rev-mode"]:checked').value;
  const out = document.getElementById("rev-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }

  let result = raw;
  if (mode === "chars" || mode === "both") result = result.split("").reverse().join("");
  if (mode === "words" || mode === "both") result = result.split(" ").reverse().join(" ");
  // "both" reverses the full string first, then reverses word order on
  // top of that - net effect is each word's own spelling gets flipped
  // ("hello" -> "olleh") while the words stay in their original left-to-
  // right positions, a third distinct result from either mode alone.
  out.textContent = result;
  GAMA.say("success");
}
