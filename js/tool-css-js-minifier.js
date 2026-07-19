/* CSS_JS_MINIFIER — a single string/comment-aware character-walk pass,
   not a naive regex replace. Regex-based minifiers routinely corrupt a
   JS string like "http://example.com" (the "//" reads as a comment
   start) or a CSS content: "a { b }" value (the braces read as
   structural). This tokenizer tracks whether it's inside a string or
   comment and only strips/collapses whitespace when it's actually safe
   to - critically, the structural-character tightening (no space around
   { } : ; ,) happens INSIDE this same walk, not as a second regex pass
   over the already-assembled output. A second pass has no way to tell
   "these braces are inside a string" from "these braces are real CSS
   structure," so it would re-corrupt exactly what the first pass just
   protected. It does NOT do semantic JS minification (renaming
   variables, etc.) - scope is comment/whitespace removal only, same as
   most "beautifier" tools' actual scope. */

function minifyStringSafe(text, { allowLineComments, tightenChars, stripSemicolonBeforeBrace }) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];

    // String literals: copy verbatim (respecting backslash escapes) so
    // nothing inside them gets treated as a comment, collapsed, or
    // tightened around.
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n && text[i] !== quote) {
        if (text[i] === "\\" && i + 1 < n) { out += text[i] + text[i + 1]; i += 2; }
        else { out += text[i]; i++; }
      }
      if (i < n) { out += text[i]; i++; }
      continue;
    }

    // Block comment /* ... */ - always applies (CSS and JS both).
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // Line comment // ... - JS only, CSS has no such syntax.
    if (allowLineComments && ch === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }

    // A structural character: drop any whitespace already emitted right
    // before it, emit it, then skip any whitespace right after it too.
    if (tightenChars.includes(ch)) {
      out = out.replace(/\s+$/, "");
      if (stripSemicolonBeforeBrace && ch === "}" && out.endsWith(";")) out = out.slice(0, -1);
      out += ch;
      i++;
      while (i < n && /\s/.test(text[i])) i++;
      continue;
    }

    // Ordinary whitespace outside strings/comments/structural chars:
    // collapse any run to a single space (still needed between e.g.
    // selector combinators or value keywords).
    if (/\s/.test(ch)) {
      while (i < n && /\s/.test(text[i])) i++;
      if (out && !/\s$/.test(out)) out += " ";
      continue;
    }

    out += ch;
    i++;
  }
  return out.trim();
}

function minifyCss(text) {
  return minifyStringSafe(text, { allowLineComments: false, tightenChars: "{}:;,", stripSemicolonBeforeBrace: true });
}

function minifyJs(text) {
  // Conservative only: tighten spacing around block punctuation. Anything
  // riskier (removing spaces between identifiers) is skipped on purpose -
  // that's how "var x" vs "varx" corruption happens.
  return minifyStringSafe(text, { allowLineComments: true, tightenChars: "{};", stripSemicolonBeforeBrace: false });
}

/* Beautify = re-indent a minified/compact string by brace depth. Doesn't
   attempt real syntax-aware formatting (line-breaking long expressions,
   etc.) - just inserts a newline+indent after { and ; and before }. */
function beautifyByBraceDepth(text) {
  let depth = 0;
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n && text[i] !== quote) {
        if (text[i] === "\\" && i + 1 < n) { out += text[i] + text[i + 1]; i += 2; }
        else { out += text[i]; i++; }
      }
      if (i < n) { out += text[i]; i++; }
      continue;
    }
    if (ch === "{") {
      depth++;
      out += " {\n" + "  ".repeat(depth);
      i++;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      out = out.replace(/\s+$/, "");
      out += "\n" + "  ".repeat(depth) + "}\n" + "  ".repeat(depth);
      i++;
      continue;
    }
    if (ch === ";") {
      out += ";\n" + "  ".repeat(depth);
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out.split("\n").map((l) => l.trimEnd()).filter((l, idx, arr) => l !== "" || idx === arr.length - 1).join("\n");
}

function executeMinify() {
  const raw = document.getElementById("minify-input").value;
  const lang = document.querySelector('input[name="minify-lang"]:checked').value;
  const mode = document.querySelector('input[name="minify-mode"]:checked').value;
  const out = document.getElementById("minify-result");
  const stats = document.getElementById("minify-stats");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; stats.textContent = ""; return; }

  const minified = lang === "css" ? minifyCss(raw) : minifyJs(raw);
  const result = mode === "minify" ? minified : beautifyByBraceDepth(minified);
  out.textContent = result;

  const before = new TextEncoder().encode(raw).length;
  const after = new TextEncoder().encode(result).length;
  const pct = before ? Math.round((1 - after / before) * 100) : 0;
  stats.textContent = mode === "minify" ? `${before}B → ${after}B (${pct >= 0 ? pct + "% smaller" : Math.abs(pct) + "% larger"})` : `${after}B beautified`;
  GAMA.say("success");
}
const executeMinifyDebounced = GAMA.debounce(executeMinify, 300);
