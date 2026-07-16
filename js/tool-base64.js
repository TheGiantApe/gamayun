/* BASE64_CODEC — encode/decode, UTF-8 safe. */

function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64Decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

// Valid base64 and plain text share too much of the same character set to
// tell them apart reliably (short plain words are often valid base64 too),
// so this stays a real mode toggle instead of auto-detection.
function executeBase64() {
  const raw = document.getElementById("b64-input").value;
  const decode = document.querySelector('input[name="b64-mode"]:checked').value === "decode";
  const out = document.getElementById("b64-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  try {
    out.textContent = decode ? b64Decode(raw) : b64Encode(raw);
    GAMA.say("success");
  } catch (e) {
    GAMA.say("error");
    out.textContent = decode ? "// not valid base64" : "// encoding failed";
  }
}
const executeBase64Debounced = GAMA.debounce(executeBase64, 300);
