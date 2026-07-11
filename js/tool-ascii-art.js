/* ASCII_BANNER — renders text to a hidden canvas, samples pixel brightness
   per grid cell, maps to ASCII density characters. Works for any text the
   browser's font can render (including non-Latin scripts), unlike a
   hand-authored bitmap font which would only cover the letters I bothered
   to draw. Browser-only (Canvas 2D) - not unit-testable outside a browser,
   unlike the rest of the tools here. */

const DENSITY = " .:-=+*#%@";

function textToAscii(text, fontSize = 40, charWidthPx = 8, charHeightPx = 16) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSize}px monospace`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 20;
  const height = fontSize * 1.6;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "white";
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textBaseline = "top";
  ctx.fillText(text, 10, fontSize * 0.2);

  const imgData = ctx.getImageData(0, 0, width, height).data;
  const cols = Math.floor(width / charWidthPx);
  const rows = Math.floor(height / charHeightPx);
  let lines = [];
  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      let sum = 0, count = 0;
      for (let y = row * charHeightPx; y < (row + 1) * charHeightPx; y++) {
        for (let x = col * charWidthPx; x < (col + 1) * charWidthPx; x++) {
          const idx = (y * width + x) * 4;
          if (idx < imgData.length) { sum += imgData[idx]; count++; }
        }
      }
      const brightness = count ? sum / count / 255 : 0;
      const charIdx = Math.min(DENSITY.length - 1, Math.floor(brightness * DENSITY.length));
      line += DENSITY[charIdx];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  // trim fully-blank leading/trailing lines
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.join("\n");
}

function executeAsciiArt() {
  const raw = document.getElementById("ascii-input").value;
  const out = document.getElementById("ascii-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }
  GAMA.say("working");
  setTimeout(() => {
    try {
      const art = textToAscii(raw);
      out.textContent = art;
      GAMA.say("success");
      GAMA.log(`Rasterized "${raw}" to ASCII density map`);
    } catch (e) {
      GAMA.say("error");
      out.textContent = "// rendering failed: " + e.message;
    }
  }, 100);
}
