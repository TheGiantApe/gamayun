/* ASCII_BANNER — FIGlet-style renderer using the embedded SmSlant font
   (js/data-figlet-smslant.js). Glyphs are kerned (slid together until they'd
   touch, not overlap) rather than laid out full-width, which is what makes
   FIGlet banners look tight instead of gappy. Pure logic, no canvas/DOM,
   unlike the old density-sampling version - testable with plain `node -e`. */

function figletKernAmount(leftRows, rightRows) {
  let amount = null;
  for (let i = 0; i < leftRows.length; i++) {
    const l = leftRows[i], r = rightRows[i];
    const lTrim = l.length - l.replace(/ +$/, "").length;
    const rTrim = r.length - r.replace(/^ +/, "").length;
    const rowAmount = lTrim + rTrim;
    if (amount === null || rowAmount < amount) amount = rowAmount;
  }
  return amount || 0;
}

function figletRender(text, font = FIGLET_SMSLANT) {
  const height = font.height;
  let rows = new Array(height).fill("");
  let prevGlyph = null;
  let prevChar = null;

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    const glyph = font.chars[code] || font.chars[63] || font.chars[32];

    let smush = 0;
    if (prevGlyph && ch !== " " && prevChar !== " ") {
      smush = figletKernAmount(prevGlyph, glyph);
      const cap = Math.min(...prevGlyph.map((r) => r.length), ...glyph.map((r) => r.length)) - 1;
      smush = Math.max(0, Math.min(smush, cap));
    }

    const merged = new Array(height);
    for (let i = 0; i < height; i++) {
      const fullRow = rows[i];
      const gRow = glyph[i];
      if (smush > 0) {
        const take = Math.min(smush, fullRow.length - fullRow.replace(/ +$/, "").length);
        const remaining = smush - take;
        const fullRowTrim = take ? fullRow.slice(0, fullRow.length - take) : fullRow;
        merged[i] = fullRowTrim + gRow.slice(remaining);
      } else {
        merged[i] = fullRow + gRow;
      }
    }
    rows = merged;
    prevGlyph = glyph;
    prevChar = ch;
  }

  // trim fully-blank leading/trailing rows (e.g. descender row with no descenders in this text)
  while (rows.length && rows[0].trim() === "") rows.shift();
  while (rows.length && rows[rows.length - 1].trim() === "") rows.pop();
  return rows.join("\n");
}

function executeAsciiArt() {
  const raw = document.getElementById("ascii-input").value;
  const out = document.getElementById("ascii-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }
  GAMA.say("working");
  setTimeout(() => {
    try {
      const fontKey = document.getElementById("ascii-font").value;
      const font = ASCII_FONTS[fontKey];
      const art = figletRender(raw, font.data);
      out.textContent = art;
      GAMA.say("success");
      GAMA.log(`Rendered "${raw}" in ${font.label}`);
    } catch (e) {
      GAMA.say("error");
      out.textContent = "// rendering failed: " + e.message;
    }
  }, 100);
}

// Populated from the ASCII_FONTS registry once all data-figlet-*.js files
// have loaded (they're plain <script> tags before this one - see build.py).
const ASCII_FONTS = {
  smslant: { label: "SmSlant", data: FIGLET_SMSLANT },
  standard: { label: "Standard", data: FIGLET_STANDARD },
  slant: { label: "Slant", data: FIGLET_SLANT },
  small: { label: "Small", data: FIGLET_SMALL },
  big: { label: "Big", data: FIGLET_BIG },
  shadow: { label: "Shadow", data: FIGLET_SHADOW },
};
