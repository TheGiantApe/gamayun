/* PLACEHOLDER_IMAGE — defaults to this site's own CRT phosphor look
   (dark background, green text, scanlines) instead of a flat gray box,
   the one thing every competing placeholder-image generator ships
   identically. Canvas-rendered, downloadable as a real PNG. */

function renderPlaceholder() {
  const width = Math.max(16, Math.min(2000, parseInt(document.getElementById("ph-width").value, 10) || 640));
  const height = Math.max(16, Math.min(2000, parseInt(document.getElementById("ph-height").value, 10) || 360));
  const text = document.getElementById("ph-text").value.trim() || `${width} × ${height}`;
  const bg = document.getElementById("ph-bg").value;
  const fg = document.getElementById("ph-fg").value;
  const scanlines = document.getElementById("ph-scanlines").checked;

  const canvas = document.getElementById("ph-canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(width, height);
  ctx.moveTo(width, 0); ctx.lineTo(0, height);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (scanlines) {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = fg;
    for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = fg;
  ctx.font = `${Math.max(12, Math.round(Math.min(width, height) * 0.08))}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  document.getElementById("ph-download").href = canvas.toDataURL("image/png");
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", renderPlaceholder);
