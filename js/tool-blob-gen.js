/* SVG_BLOB_GENERATOR — points placed around a circle at randomized
   radii, then connected with a real Catmull-Rom-to-cubic-Bezier closed
   curve (not a jagged straight-line polygon, and not a fake wobble
   filter) - the same curve-fitting technique used in most real
   generative-shape tools. */

function generateBlobPoints(numPoints, size, irregularity) {
  const points = [];
  const center = size / 2;
  const baseRadius = size * 0.35;
  const irregularityFraction = irregularity / 100;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = baseRadius * (1 - irregularityFraction / 2 + Math.random() * irregularityFraction);
    points.push({ x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) });
  }
  return points;
}

function catmullRomToBezierPath(points) {
  const n = points.length;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
  }
  return d + "Z";
}

function renderBlob() {
  const numPoints = parseInt(document.getElementById("blob-points").value, 10);
  const irregularity = parseInt(document.getElementById("blob-irregularity").value, 10);
  const color = document.getElementById("blob-color").value;
  const points = generateBlobPoints(numPoints, 300, irregularity);
  const path = catmullRomToBezierPath(points);

  const svg = document.getElementById("blob-svg");
  svg.innerHTML = `<path d="${path}" fill="${color}" />`;

  const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><path d="${path}" fill="${color}"/></svg>`;
  const blob = new Blob([svgSource], { type: "image/svg+xml" });
  document.getElementById("blob-download").href = URL.createObjectURL(blob);
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", renderBlob);
