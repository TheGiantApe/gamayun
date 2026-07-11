/* BASE64_CODEC — encode/decode, UTF-8 safe. */

function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64Decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

function executeBase64Encode() {
  const raw = document.getElementById("b64-input").value;
  const out = document.getElementById("b64-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  try {
    out.textContent = b64Encode(raw);
    GAMA.say("success");
  } catch (e) {
    GAMA.say("error");
    out.textContent = "// encoding failed";
  }
}
function executeBase64Decode() {
  const raw = document.getElementById("b64-input").value;
  const out = document.getElementById("b64-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  try {
    out.textContent = b64Decode(raw);
    GAMA.say("success");
  } catch (e) {
    GAMA.say("error");
    out.textContent = "// not valid base64";
  }
}
