/* WALLPAPER_FORGE — procedurally draws a GAMA+ desktop/phone wallpaper
   onto a canvas at the requested resolution and offers it as a PNG
   download. Everything is drawn with vector shapes/text plus the site's
   own two existing raster assets (raven-key seal, wordmark) - no web
   fonts (matches the site's own "native monospace stack, no web fonts"
   rule), so this looks right on a machine that's never loaded the site's
   CSS at all. */

const WP_QUOTES = [
  "awaiting organic time matrix... don't make it weird.",
  "standing by. the void is patient. i am less patient.",
  "recon deck idle. feed me something to salvage.",
  "processed. converted meat-space chronological debris into clean machine telemetry.",
  "salvage complete. you're welcome, i guess.",
  "the void does not care about your indecision. i, marginally, do.",
  "still here. still waiting. drifting is not the same as doing nothing, for the record.",
];

let wpRavenImg = null;
let wpWordmarkImg = null;
let wpAssetsReady = false;
let wpCurrentQuote = WP_QUOTES[0];

function wpLoadAssets(cb) {
  if (wpAssetsReady) { cb(); return; }
  const root = document.body.dataset.root || "";
  let pending = 2;
  const done = () => { if (--pending === 0) { wpAssetsReady = true; cb(); } };
  wpRavenImg = new Image();
  wpRavenImg.onload = done;
  wpRavenImg.onerror = done;
  wpRavenImg.src = root + "assets/raven-key-seal.png";
  wpWordmarkImg = new Image();
  wpWordmarkImg.onload = done;
  wpWordmarkImg.onerror = done;
  wpWordmarkImg.src = root + "assets/gama-wordmark-logo-green.png";
}

function wpPalette(name) {
  return name === "amber"
    ? { void: "#0A0A0A", phosphor: "#FFB000", dim: "rgba(255,176,0,0.35)", faint: "rgba(255,176,0,0.10)" }
    : { void: "#0A0A0A", phosphor: "#00FF66", dim: "rgba(0,255,102,0.35)", faint: "rgba(0,255,102,0.10)" };
}

function wpDraw() {
  const canvas = document.getElementById("wp-canvas");
  const ctx = canvas.getContext("2d");
  const [w, h] = document.getElementById("wp-resolution").value.split("x").map(Number);
  const palette = wpPalette(document.getElementById("wp-palette").value);
  const showQuote = document.getElementById("wp-show-quote").checked;

  canvas.width = w;
  canvas.height = h;

  // Base
  ctx.fillStyle = palette.void;
  ctx.fillRect(0, 0, w, h);

  // Sparse circuit-grid texture, barely-there per the sprite-sheet doc's
  // own "background ghost texture" guidance - a handful of long lines,
  // not a dense repeating tile, so it reads as texture rather than a
  // pattern someone consciously notices.
  ctx.strokeStyle = palette.faint;
  ctx.lineWidth = Math.max(1, w * 0.0006);
  const gridSpacing = Math.round(w / 14);
  for (let x = gridSpacing; x < w; x += gridSpacing) {
    if (Math.random() < 0.5) continue; // sparse, not every line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = gridSpacing; y < h; y += gridSpacing) {
    if (Math.random() < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // CRT scanlines
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1);
  }

  // Raven-key watermark, bottom-right, rotated, low opacity - same
  // corner/treatment as the live site's own watermark.
  if (wpRavenImg && wpRavenImg.naturalWidth) {
    const size = w * 0.32;
    const ratio = wpRavenImg.naturalHeight / wpRavenImg.naturalWidth;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.translate(w - size * 0.35, h - size * ratio * 0.35);
    ctx.rotate(-11 * Math.PI / 180);
    ctx.drawImage(wpRavenImg, -size / 2, -(size * ratio) / 2, size, size * ratio);
    ctx.restore();
  }

  // Vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Wordmark or text fallback, corner-anchored so it works in both
  // landscape and portrait resolutions without overlapping content.
  const pad = Math.round(w * 0.045);
  if (wpWordmarkImg && wpWordmarkImg.naturalWidth) {
    // A wallpaper needs to stay unobtrusive under desktop icons - restrained
    // corner signature, not a hero logo dominating the composition.
    const logoW = Math.min(w * 0.14, 190);
    const logoRatio = wpWordmarkImg.naturalHeight / wpWordmarkImg.naturalWidth;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.drawImage(wpWordmarkImg, pad, pad, logoW, logoW * logoRatio);
    ctx.restore();
  } else {
    ctx.fillStyle = palette.phosphor;
    ctx.font = `bold ${Math.round(w * 0.028)}px "SF Mono", Consolas, Menlo, monospace`;
    ctx.textBaseline = "top";
    ctx.fillText("GAMAYUN+", pad, pad);
  }

  // Status readout, opposite corner
  ctx.font = `${Math.round(w * 0.011)}px "SF Mono", Consolas, Menlo, monospace`;
  ctx.fillStyle = palette.dim;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "right";
  ctx.fillText("LINK: STABLE // MAG-LOCK: ENGAGED", w - pad, h - pad - (showQuote ? Math.round(w * 0.024) : 0));

  // GAMA line, bottom-left, wrapped to fit
  if (showQuote) {
    ctx.textAlign = "left";
    ctx.fillStyle = palette.phosphor;
    ctx.font = `${Math.round(w * 0.014)}px "SF Mono", Consolas, Menlo, monospace`;
    const line = `> ${wpCurrentQuote}`;
    const maxWidth = w - pad * 2;
    const words = line.split(" ");
    let out = "";
    const lines = [];
    for (const word of words) {
      const test = out ? out + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && out) {
        lines.push(out);
        out = word;
      } else {
        out = test;
      }
    }
    if (out) lines.push(out);
    const lineHeight = Math.round(w * 0.02);
    lines.forEach((l, i) => {
      ctx.fillText(l, pad, h - pad - (lines.length - 1 - i) * lineHeight);
    });
  }

  // Sharp single-pixel-scaled border frame, no rounded corners - matches
  // the site's own "sharp borders only" rule.
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = Math.max(2, w * 0.0015);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

function regenerateWallpaper() {
  wpCurrentQuote = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
  wpLoadAssets(() => {
    wpDraw();
    GAMA.say("success");
  });
}

function downloadWallpaper() {
  const canvas = document.getElementById("wp-canvas");
  const res = document.getElementById("wp-resolution").value;
  const palette = document.getElementById("wp-palette").value;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gamayun_wallpaper_${res}_${palette}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const out = document.getElementById("wp-result");
    if (out) out.textContent = `// saved gamayun_wallpaper_${res}_${palette}.png`;
    GAMA.log(`Wallpaper downloaded: ${res} ${palette}`);
  }, "image/png");
}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("wp-canvas");
  if (!canvas) return;
  ["wp-resolution", "wp-palette", "wp-show-quote"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => wpLoadAssets(wpDraw));
  });
  wpCurrentQuote = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
  wpLoadAssets(wpDraw);
});
