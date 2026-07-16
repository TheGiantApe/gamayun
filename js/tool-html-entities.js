/* HTML_ENTITY_CODEC — encode escapes the 5 reserved chars plus any
   non-ASCII codepoint as a numeric entity. Decode uses DOMParser against
   a detached, inert document (never attached to the live DOM, so nothing
   in the input - script tags, event-handler attributes - ever executes
   or loads a resource) rather than the classic innerHTML-on-a-textarea
   trick, which can be broken out of with a literal "</textarea>". */

function htmlEntityEncode(str) {
  return [...str].map((ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: {
        const cp = ch.codePointAt(0);
        return cp > 127 ? `&#${cp};` : ch;
      }
    }
  }).join("");
}

function htmlEntityDecode(str) {
  const doc = new DOMParser().parseFromString(str, "text/html");
  return doc.documentElement.textContent;
}

// A real entity reference (&amp; &#39; &#x27; ...) is a syntax no plain
// sentence produces by accident, so direction can be auto-detected instead
// of making the user pick it.
const HTML_ENTITY_RE = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;
function executeHtmlEntityAuto() {
  const raw = document.getElementById("entity-input").value;
  const out = document.getElementById("entity-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  out.textContent = HTML_ENTITY_RE.test(raw) ? htmlEntityDecode(raw) : htmlEntityEncode(raw);
  GAMA.say("success");
}
const executeHtmlEntityAutoDebounced = GAMA.debounce(executeHtmlEntityAuto, 300);
