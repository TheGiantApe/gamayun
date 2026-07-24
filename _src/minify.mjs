/* Build-time CSS/JS minifier CLI. The core algorithm started as a
   verbatim copy of js/tool-css-js-minifier.js (the site's own live
   minifier tool) - same string/comment-aware character-walk pass, not a
   naive regex replace, for the reason documented there: a regex
   minifier corrupts a JS string like "http://example.com" or a CSS
   content: "a { b }" value.

   Extended here (2026-07-23) with two fixes after running this against
   every JS file actually in the repo surfaced real corruption the
   original algorithm never hit (worth porting both fixes back into
   js/tool-css-js-minifier.js, since the live user-facing tool has the
   same two latent bugs):

   1. Regex literals. /edg\//i (matches literal "edg/") contains an
      escaped slash immediately followed by its own closing slash - two
      real "/" characters in a row that are NOT a "//" line comment, but
      the original tokenizer had no concept of a regex literal as a
      protected span (only strings), so it read that as a comment start
      and truncated the rest of the line. Confirmed corrupting 7 files
      (tool-user-agent-parser.js, tool-tos-scan.js,
      tool-robots-validator.js, tool-meta-preview.js, tool-json-csv.js,
      tool-iifym.js, tool-dead-drop.js) via `node --check` on the output
      before this fix.

   2. Nested template literals inside a `${...}` interpolation. The
      original backtick handling just scans for the next un-escaped
      backtick to close the string - correct for a plain template
      literal, wrong the moment its `${}` contains ANOTHER template
      literal, because the inner literal's own opening backtick gets
      misread as the outer one's closing backtick. Confirmed corrupting
      tool-iifym.js (a `${cond ? \`...\` : ""}` pattern). Fixed by
      properly tracking `${...}` nesting depth (and any strings/regexes/
      further template literals inside it) to find the TRUE closing
      backtick, at the cost of not minifying whitespace/comments inside
      an interpolation's expression - correctness over that small extra
      byte saving.

   Usage: node _src/minify.mjs <css|js> <input-file> > <output-file>
*/

// A `/` starts a regex literal (not division) unless the last thing that
// came before it already produced a value - an identifier/number,
// `)`, `]`, or a string that just closed. Anything else (an operator,
// `(`, `,`, `;`, `{`, `:`, a keyword like return/typeof/case, or start
// of file) means a `/` here can only be a regex, never division. This
// is the same heuristic real JS tokenizers use for this exact ambiguity.
const REGEX_PRECEDING_KEYWORD = /(^|[^\w$])(return|typeof|instanceof|in|of|new|delete|void|throw|do|else|case|yield|await)$/;
function isRegexContext(out) {
  const trimmed = out.replace(/\s+$/, "");
  if (trimmed === "") return true;
  const lastChar = trimmed[trimmed.length - 1];
  if (/[\w$)\]]/.test(lastChar)) {
    return REGEX_PRECEDING_KEYWORD.test(trimmed);
  }
  if (lastChar === '"' || lastChar === "'" || lastChar === "`") return false;
  return true;
}

// Finds the index just past a template literal's TRUE closing backtick
// (text[start] === "`"), correctly skipping over any nested
// strings/regexes/template literals inside `${...}` interpolations
// instead of naively stopping at the first backtick encountered.
function findTemplateLiteralEnd(text, start) {
  const n = text.length;
  let i = start + 1;
  while (i < n) {
    if (text[i] === "\\" && i + 1 < n) { i += 2; continue; }
    if (text[i] === "`") return i + 1;
    if (text[i] === "$" && text[i + 1] === "{") {
      i = skipInterpolationExpression(text, i + 2);
      continue;
    }
    i++;
  }
  return i; // unterminated - shouldn't happen in valid input
}

// Skips from just after a `${` to just after its matching `}`, correctly
// stepping over any nested strings, regexes, or template literals (which
// can themselves contain `{`/`}`/backticks) so a brace or backtick that
// belongs to one of those doesn't get mistaken for the interpolation's
// own closing brace.
function skipInterpolationExpression(text, start) {
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
    if (ch === "`") { i = findTemplateLiteralEnd(text, i); continue; }
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

    // Template literal: found via findTemplateLiteralEnd (handles nested
    // ${...} correctly, see header comment) and copied verbatim,
    // including its interpolations - not run back through this
    // minifier, so nothing inside it can be misread as a comment or a
    // structural character.
    if (ch === "`") {
      const end = findTemplateLiteralEnd(text, i);
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
    if (allowLineComments && ch === "/" && text[i + 1] !== "/" && isRegexContext(out)) {
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
  return minifyStringSafe(text, { allowLineComments: true, tightenChars: "{};", stripSemicolonBeforeBrace: false });
}

const [, , mode, inputPath] = process.argv;
if (!mode || !inputPath || !["css", "js"].includes(mode)) {
  console.error("Usage: node minify.mjs <css|js> <input-file>");
  process.exit(1);
}

const fs = await import("node:fs");
const raw = fs.readFileSync(inputPath, "utf-8");
const result = mode === "css" ? minifyCss(raw) : minifyJs(raw);
process.stdout.write(result);
