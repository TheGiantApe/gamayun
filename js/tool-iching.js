/* I_CHING — three-coin casting method, real CSPRNG (crypto.getRandomValues,
   same as UUID_GEN/PASSWORD_GEN) rather than Math.random. Six lines cast
   bottom to top; a moving (6 or 9) line flips in the resulting hexagram.
   See data-iching.js for the hexagram table and its verification note. */

function castLineValue() {
  // 3 "coins": heads=3 tails=2 each, sum in {6,7,8,9}.
  let sum = 0;
  const rand = new Uint8Array(3);
  crypto.getRandomValues(rand);
  for (let i = 0; i < 3; i++) sum += (rand[i] % 2 === 0) ? 2 : 3; // even byte=tails(2), odd=heads(3)
  return sum;
}

// Returns array of 6 line values, index 0 = bottom (first cast) .. index 5 = top.
function castHexagramLines() {
  return Array.from({ length: 6 }, castLineValue);
}

function isYang(lineValue) { return lineValue === 7 || lineValue === 9; }
function isMoving(lineValue) { return lineValue === 6 || lineValue === 9; }

// pattern string convention (matches data-iching.js): index 0 = TOP line,
// index 5 = BOTTOM line. `lines` here is bottom-to-top (index 0 = bottom).
function linesToPattern(lines, resulting) {
  const topToBottom = [...lines].reverse();
  return topToBottom.map((v) => {
    let yang = isYang(v);
    if (resulting && isMoving(v)) yang = !yang;
    return yang ? "1" : "0";
  }).join("");
}

function lookupHexagram(pattern) {
  return ICHING_HEXAGRAMS.find((h) => h.pattern === pattern) || null;
}

function castIChing() {
  const lines = castHexagramLines();
  const primaryPattern = linesToPattern(lines, false);
  const hasMoving = lines.some(isMoving);
  const resultPattern = hasMoving ? linesToPattern(lines, true) : null;
  return {
    lines,
    primary: lookupHexagram(primaryPattern),
    result: resultPattern ? lookupHexagram(resultPattern) : null,
  };
}

/* ---- Rendering ---- */

function renderLineGlyph(lineValue) {
  const yang = isYang(lineValue);
  const moving = isMoving(lineValue);
  const bar = yang ? "━━━━━━━━━" : "━━━━  ━━━━";
  const marker = moving ? (yang ? "  (changing, 9)" : "  (changing, 6)") : "";
  return bar + marker;
}

function renderHexagramText(hex, lines) {
  if (!hex) return "// no match found - this shouldn't happen, flag it";
  const linesTopToBottom = lines ? [...lines].reverse() : null;
  const diagram = linesTopToBottom ? linesTopToBottom.map(renderLineGlyph).join("\n") : "";
  return `#${hex.n} ${hex.cn}  ${hex.name}\n\n${diagram}\n\n${hex.blurb}`;
}

function executeIChingCast() {
  const out = document.getElementById("iching-result");
  GAMA.say("working");
  setTimeout(() => {
    const cast = castIChing();
    let text = "PRIMARY HEXAGRAM\n" + renderHexagramText(cast.primary, cast.lines);
    if (cast.result) {
      text += "\n\n\nRESULTING HEXAGRAM (after moving lines change)\n" +
        `#${cast.result.n} ${cast.result.cn}  ${cast.result.name}\n\n${cast.result.blurb}`;
    }
    out.textContent = text;
    GAMA.say("success");
    GAMA.log(`Cast hexagram #${cast.primary ? cast.primary.n : "?"}${cast.result ? " -> #" + cast.result.n : ""}`);
  }, 300);
}
