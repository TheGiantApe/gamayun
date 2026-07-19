/* XML_FORMATTER — DOMParser for real validation (its parsererror node
   already carries a browser-native line/column message, same
   "point at the actual problem" bar as the JSON Formatter). Minify
   just strips inter-tag whitespace; beautify re-serializes with
   indentation via a manual node walk, since XMLSerializer alone doesn't
   pretty-print. */

function parseXml(raw) {
  const doc = new DOMParser().parseFromString(raw, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) return { ok: false, error: errorNode.textContent.trim() };
  return { ok: true, doc };
}

function indentXmlNode(node, depth, lines) {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim();
    if (text) lines.push(pad + text);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const attrs = [...node.attributes].map((a) => ` ${a.name}="${a.value}"`).join("");
  const children = [...node.childNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim()));

  if (!children.length) {
    lines.push(`${pad}<${node.tagName}${attrs}/>`);
    return;
  }
  if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
    lines.push(`${pad}<${node.tagName}${attrs}>${children[0].textContent.trim()}</${node.tagName}>`);
    return;
  }
  lines.push(`${pad}<${node.tagName}${attrs}>`);
  children.forEach((child) => indentXmlNode(child, depth + 1, lines));
  lines.push(`${pad}</${node.tagName}>`);
}

function beautifyXml(doc) {
  const lines = [];
  indentXmlNode(doc.documentElement, 0, lines);
  return lines.join("\n");
}

function minifyXml(raw) {
  return raw.replace(/>\s+</g, "><").trim();
}

function executeXmlFormat() {
  const raw = document.getElementById("xml-input").value;
  const mode = document.querySelector('input[name="xml-mode"]:checked').value;
  const out = document.getElementById("xml-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }

  const parsed = parseXml(raw);
  if (!parsed.ok) {
    out.textContent = "// " + parsed.error;
    GAMA.say("error");
    return;
  }
  out.textContent = mode === "minify" ? minifyXml(raw) : beautifyXml(parsed.doc);
  GAMA.say("success");
}
const executeXmlFormatDebounced = GAMA.debounce(executeXmlFormat, 300);
