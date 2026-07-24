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
   most "beautifier" tools' actual scope.

   Two correctness fixes added 2026-07-23, found running the equivalent
   logic (_src/minify.mjs, a build-time CLI copy of this same algorithm)
   against every JS file actually in this repo - both were latent bugs
   in THIS tool too, for anyone pasting real-world JS containing either
   pattern:

   1. Regex literals. /edg\//i (matches literal "edg/") contains an
      escaped slash immediately followed by its own closing slash - two
      real "/" characters in a row that are NOT a "//" line comment, but
      the tokenizer had no concept of a regex literal as a protected
      span (only strings), so it read that as a comment start and
      truncated the rest of the line.

   2. Nested template literals inside a `${...}` interpolation. Naive
      backtick-matching (scan for the next un-escaped backtick) breaks
      the moment a template literal's `${}` contains ANOTHER template
      literal, because the inner literal's own opening backtick gets
      misread as the outer one's closing backtick. */

// A `/` starts a regex literal (not division) unless the last thing that
// came before it already produced a value - an identifier/number,
// `)`, `]`, or a string that just closed. Anything else (an operator,
// `(`, `,`, `;`, `{`, `:`, a keyword like return/typeof/case, or start
// of file) means a `/` here can only be a regex, never division. This
// is the same heuristic real JS tokenizers use for this exact ambiguity.
const MINIFIER_REGEX_PRECEDING_KEYWORD = /(^|[^\w$])(return|typeof|instanceof|in|of|new|delete|void|throw|do|else|case|yield|await)$/;
function minifierIsRegexContext(out) {
  const trimmed = out.replace(/\s+$/, "");
  if (trimmed === "") return true;
  const lastChar = trimmed[trimmed.length - 1];
  if (/[\w$)\]]/.test(lastChar)) {
    return MINIFIER_REGEX_PRECEDING_KEYWORD.test(trimmed);
  }
  if (lastChar === '"' || lastChar === "'" || lastChar === "`") return false;
  return true;
}

// Finds the index just past a template literal's TRUE closing backtick
// (text[start] === "`"), correctly skipping over any nested
// strings/regexes/template literals inside `${...}` interpolations
// instead of naively stopping at the first backtick encountered.
function minifierFindTemplateLiteralEnd(text, start) {
  const n = text.length;
  let i = start + 1;
  while (i < n) {
    if (text[i] === "\\" && i + 1 < n) { i += 2; continue; }
    if (text[i] === "`") return i + 1;
    if (text[i] === "$" && text[i + 1] === "{") {
      i = minifierSkipInterpolationExpression(text, i + 2);
      continue;
    }
    i++;
  }
  return i; // unterminated - shouldn't happen in valid input
}

// Skips from just after a `${` to just after its matching `}`, correctly
// stepping over any nested strings, regexes, or template literals so a
// brace or backtick that belongs to one of those doesn't get mistaken
// for the interpolation's own closing brace.
function minifierSkipInterpolationExpression(text, start) {
  const n = text.length;
  let i = start;
  let depth = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < n && text[i] !== quote) { if (text[i] === "\\" && i + 1 < n) i += 2; else i++; }
      i++;
      continue;
    }
    if (ch === "`") { i = minifierFindTemplateLiteralEnd(text, i); continue; }
    if (ch === "{") { depth++; i++; continue; }
    if (ch === "}") {
      if (depth === 0) return i + 1;
      depth--; i++; continue;
    }
    i++;
  }
  return i;
}

function minifyStringSafe(text, { allowLineComments, tightenChars, stripSemicolonBeforeBrace }) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];

    // Template literal: found via minifierFindTemplateLiteralEnd (handles
    // nested ${...} correctly, see header comment) and copied verbatim,
    // including its interpolations - not run back through this
    // minifier, so nothing inside it can be misread as a comment or a
    // structural character.
    if (ch === "`") {
      const end = minifierFindTemplateLiteralEnd(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }

    // Single/double-quoted strings: copy verbatim (respecting backslash
    // escapes) so nothing inside them gets treated as a comment,
    // collapsed, or tightened around.
    if (ch === '"' || ch === "'") {
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

    // Regex literal /.../flags - JS only, checked before the line-comment
    // branch below. Copy verbatim (respecting backslash escapes and
    // [...] character classes, where an unescaped `/` is legal and does
    // NOT close the regex) so nothing inside it is misread as a comment
    // or a structural character.
    if (allowLineComments && ch === "/" && text[i + 1] !== "/" && minifierIsRegexContext(out)) {
      let j = i + 1;
      let inClass = false;
      let terminated = false;
      while (j < n) {
        if (text[j] === "\\" && j + 1 < n) { j += 2; continue; }
        if (text[j] === "[") { inClass = true; j++; continue; }
        if (text[j] === "]") { inClass = false; j++; continue; }
        if (text[j] === "\n") break; // unterminated - not actually a regex, bail
        if (text[j] === "/" && !inClass) { j++; terminated = true; break; }
        j++;
      }
      if (terminated) {
        while (j < n && /[a-z]/i.test(text[j])) j++; // flags
        out += text.slice(i, j);
        i = j;
        continue;
      }
      // Fell through: heuristic guessed wrong (rare - a bare `/` used as
      // an operator right after something isRegexContext treated as
      // "not a value"). Treat this one `/` as an ordinary character
      // rather than risk misreading the rest of the file as regex body.
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
