/* PALETTE_FORGE — 5-swatch color palette generator with per-swatch lock.
   Traffic research (coolors.co, ~1.4M visits/month) flagged this as the
   best effort-to-value ratio in the Opticon build-queue pass: random HSL
   generation + a lock toggle, no external dependencies. GAMAYUN already
   has single-color conversion (Color Converter) - this is the distinct
   "generate/lock/shuffle a set" use case that tool doesn't cover. */

const PALETTE_SIZE = 5;
let paletteState = []; // [{ hex, locked }, ...]

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return "#" + [toHex(f(0)), toHex(f(8)), toHex(f(4))].join("");
}

function hexToRgbLocal(hex) {
  const num = parseInt(hex.replace("#", ""), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgbLocal(hex);
  const [rl, gl, bl] = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function randomSwatch() {
  const h = Math.floor(Math.random() * 360);
  const s = 50 + Math.floor(Math.random() * 36); // 50-85%, avoids muddy/neon extremes
  const l = 35 + Math.floor(Math.random() * 36); // 35-70%, avoids near-black/near-white
  return { hex: hslToHex(h, s, l), locked: false };
}

function initPaletteIfEmpty() {
  if (paletteState.length === 0) {
    paletteState = Array.from({ length: PALETTE_SIZE }, randomSwatch);
  }
}

function renderPalette() {
  const container = document.getElementById("palette-swatches");
  container.innerHTML = paletteState
    .map((sw, i) => {
      const fg = relativeLuminance(sw.hex) > 0.45 ? "#000" : "#fff";
      const lockGlyph = sw.locked ? "&#128274;" : "&#128275;";
      return `<div style="flex:1; background:${sw.hex}; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:0.5rem; cursor:pointer; color:${fg}; font-family:var(--font-mono, monospace); font-size:0.8rem;">
        <span onclick="event.stopPropagation(); togglePaletteLock(${i})" title="lock/unlock this swatch" style="cursor:pointer;">${lockGlyph}</span>
        <span onclick="copyPaletteSwatch(${i})" title="click to copy hex">${sw.hex}</span>
      </div>`;
    })
    .join("");
}

function togglePaletteLock(i) {
  paletteState[i].locked = !paletteState[i].locked;
  renderPalette();
}

function copyPaletteSwatch(i) {
  const hex = paletteState[i].hex;
  navigator.clipboard.writeText(hex);
  GAMA.log(`Copied: ${hex}`);
  GAMA.say("success");
}

function executePaletteGenerate() {
  initPaletteIfEmpty();
  paletteState = paletteState.map((sw) => (sw.locked ? sw : randomSwatch()));
  renderPalette();
  document.getElementById("palette-result").textContent = "";
  GAMA.say("success");
}

function executePaletteExport() {
  initPaletteIfEmpty();
  const hexList = paletteState.map((sw) => sw.hex).join(", ");
  const cssVars = paletteState.map((sw, i) => `  --palette-${i + 1}: ${sw.hex};`).join("\n");
  const out = document.getElementById("palette-result");
  out.textContent = `${hexList}\n\n:root {\n${cssVars}\n}`;
  navigator.clipboard.writeText(out.textContent);
  GAMA.log("Copied full export");
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("palette-swatches");
  if (container) {
    initPaletteIfEmpty();
    renderPalette();
  }
});
