/* URL_CODEC — percent-encode/decode. encodeURIComponent already covers the
   full reserved set correctly; the only gap is space-as-plus for the
   application/x-www-form-urlencoded convention some tools still expect. */

function urlEncode(str) {
  return encodeURIComponent(str);
}
function urlDecode(str) {
  return decodeURIComponent(str.replace(/\+/g, " "));
}

function executeUrlEncode() {
  const raw = document.getElementById("url-input").value;
  const out = document.getElementById("url-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  out.textContent = urlEncode(raw);
  GAMA.say("success");
}
function executeUrlDecode() {
  const raw = document.getElementById("url-input").value;
  const out = document.getElementById("url-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  try {
    out.textContent = urlDecode(raw);
    GAMA.say("success");
  } catch (e) {
    GAMA.say("error");
    out.textContent = "// not valid percent-encoding";
  }
}
