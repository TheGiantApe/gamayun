/* URL_CODEC — percent-encode/decode. encodeURIComponent already covers the
   full reserved set correctly; the only gap is space-as-plus for the
   application/x-www-form-urlencoded convention some tools still expect. */

function urlEncode(str) {
  return encodeURIComponent(str);
}
function urlDecode(str) {
  return decodeURIComponent(str.replace(/\+/g, " "));
}

// A real percent-encoded byte (%2F, %3D, ...) is a hex pair that plain text
// essentially never contains by coincidence, so direction can be
// auto-detected instead of making the user pick it.
const URL_ENCODED_RE = /%[0-9A-Fa-f]{2}/;
function executeUrlAuto() {
  const raw = document.getElementById("url-input").value;
  const out = document.getElementById("url-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  if (URL_ENCODED_RE.test(raw)) {
    try {
      out.textContent = urlDecode(raw);
      GAMA.say("success");
    } catch (e) {
      GAMA.say("error");
      out.textContent = "// not valid percent-encoding";
    }
  } else {
    out.textContent = urlEncode(raw);
    GAMA.say("success");
  }
}
const executeUrlAutoDebounced = GAMA.debounce(executeUrlAuto, 300);
