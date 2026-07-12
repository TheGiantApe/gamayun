/* IMAGE_TOOLS — EXIF metadata reader/stripper, resize, and format
   conversion. All Canvas/File API, no server. Re-encoding an image
   through <canvas> naturally drops EXIF (pixel data only, no metadata
   channel) - that's how the "strip" side works. The "read" side is a
   real hand-rolled EXIF/TIFF parser so users can actually SEE what a
   photo was leaking (camera model, GPS coordinates) before it's
   stripped, rather than just trusting an invisible removal. */

const EXIF_TAGS = {
  0x010F: "Make", 0x0110: "Model", 0x0131: "Software",
  0x0132: "DateTime", 0x9003: "DateTimeOriginal",
  0x0112: "Orientation", 0xA002: "PixelXDimension", 0xA003: "PixelYDimension",
};
const GPS_IFD_TAG = 0x8825;
const EXIF_IFD_TAG = 0x8769;

function readString(bytes) {
  let end = bytes.indexOf(0);
  if (end === -1) end = bytes.length;
  return new TextDecoder("ascii").decode(bytes.slice(0, end));
}

/* Parses one IFD (Image File Directory) starting at `offset` within
   `view`/`tiffStart`. Returns { entries: {tag: value}, next: offset|0 }. */
function parseIfd(view, tiffStart, offset, little) {
  const count = view.getUint16(tiffStart + offset, little);
  const entries = {};
  for (let i = 0; i < count; i++) {
    const entryOffset = tiffStart + offset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, little);
    const type = view.getUint16(entryOffset + 2, little);
    const numValues = view.getUint32(entryOffset + 4, little);
    const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const size = (typeSizes[type] || 1) * numValues;
    const valueOffset = size <= 4 ? entryOffset + 8 : tiffStart + view.getUint32(entryOffset + 8, little);

    let value;
    if (type === 2) { // ASCII
      value = readString(new Uint8Array(view.buffer, valueOffset, numValues));
    } else if (type === 3) { // SHORT
      value = numValues === 1 ? view.getUint16(valueOffset, little) : null;
    } else if (type === 4) { // LONG
      value = numValues === 1 ? view.getUint32(valueOffset, little) : null;
    } else if (type === 5 || type === 10) { // RATIONAL / SRATIONAL
      const vals = [];
      for (let j = 0; j < numValues; j++) {
        const num = type === 5 ? view.getUint32(valueOffset + j * 8, little) : view.getInt32(valueOffset + j * 8, little);
        const den = type === 5 ? view.getUint32(valueOffset + j * 8 + 4, little) : view.getInt32(valueOffset + j * 8 + 4, little);
        vals.push(den === 0 ? 0 : num / den);
      }
      value = numValues === 1 ? vals[0] : vals;
    } else {
      value = null; // unsupported type for our purposes (BYTE/UNDEFINED/etc)
    }
    entries[tag] = value;
  }
  const next = view.getUint32(tiffStart + offset + 2 + count * 12, little);
  return { entries, next };
}

function dmsToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length !== 3) return null;
  const [d, m, s] = dms;
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec;
}

/* Main entry point. Returns null if no EXIF segment found (most PNGs,
   many web-optimized JPEGs, and anything already stripped). */
function parseExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.getUint16(0) !== 0xFFD8) return null; // not a JPEG

  let offset = 2;
  let app1Offset = null;
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) {
      const sig = readString(new Uint8Array(view.buffer, offset + 4, 6));
      if (sig.startsWith("Exif")) { app1Offset = offset + 4 + 6; break; }
    }
    if ((marker & 0xFF00) !== 0xFF00) break; // not a marker, bail
    if (marker === 0xFFDA) break; // start of scan, no more markers before image data
    const segLen = view.getUint16(offset + 2);
    offset += 2 + segLen;
  }
  if (app1Offset === null) return null;

  const tiffStart = app1Offset;
  const byteOrder = view.getUint16(tiffStart);
  const little = byteOrder === 0x4949; // "II"
  if (!little && byteOrder !== 0x4D4D) return null; // not "MM" either - malformed

  const ifd0Offset = view.getUint32(tiffStart + 4, little);
  const { entries: ifd0 } = parseIfd(view, tiffStart, ifd0Offset, little);

  const result = {};
  for (const [tagHex, name] of Object.entries(EXIF_TAGS)) {
    const tag = Number(tagHex);
    if (ifd0[tag] !== undefined && ifd0[tag] !== null) result[name] = ifd0[tag];
  }

  // Sub-IFDs (EXIF and GPS) are pointed to by tags in IFD0, not inline.
  // Their pointer values are already TIFF-relative offsets, same as
  // ifd0Offset above - no further adjustment needed.
  if (ifd0[EXIF_IFD_TAG]) {
    const { entries: exifIfd } = parseIfd(view, tiffStart, ifd0[EXIF_IFD_TAG], little);
    for (const [tagHex, name] of Object.entries(EXIF_TAGS)) {
      const tag = Number(tagHex);
      if (exifIfd[tag] !== undefined && exifIfd[tag] !== null) result[name] = exifIfd[tag];
    }
  }
  if (ifd0[GPS_IFD_TAG]) {
    const { entries: gps } = parseIfd(view, tiffStart, ifd0[GPS_IFD_TAG], little);
    const lat = dmsToDecimal(gps[2], gps[1]);
    const lon = dmsToDecimal(gps[4], gps[3]);
    if (lat !== null) result.GPSLatitude = lat;
    if (lon !== null) result.GPSLongitude = lon;
  }
  return Object.keys(result).length ? result : null;
}

/* ---- Canvas-based resize/convert/strip ---- */

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function processImage(file, { maxDim, format, quality }) {
  const img = await loadImageFromFile(file);
  let { naturalWidth: w, naturalHeight: h } = img;
  if (maxDim && Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  const mime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[format] || "image/jpeg";
  return new Promise((resolve) => canvas.toBlob((blob) => resolve({ blob, width: w, height: h }), mime, quality));
}

/* ---- UI wiring ---- */

const EXIF_LABELS = {
  Make: "Camera make", Model: "Camera model", Software: "Software",
  DateTime: "Date/time", DateTimeOriginal: "Date taken", Orientation: "Orientation",
  PixelXDimension: "Width (EXIF)", PixelYDimension: "Height (EXIF)",
  GPSLatitude: "GPS latitude", GPSLongitude: "GPS longitude",
};

let currentFile = null;
let currentResult = null;

function renderMetadata(exif) {
  const box = document.getElementById("img-metadata");
  if (!exif) {
    box.innerHTML = `<p style="color:var(--phosphor-dim-text);">// no EXIF metadata found in this file. either it never had any, or something already stripped it.</p>`;
    return;
  }
  const hasGPS = "GPSLatitude" in exif;
  const rows = Object.entries(exif).map(([key, val]) => {
    const label = EXIF_LABELS[key] || key;
    const value = typeof val === "number" ? (Number.isInteger(val) ? val : val.toFixed(6)) : val;
    return `<div class="exif-row${key.startsWith("GPS") ? " exif-row-gps" : ""}"><span class="exif-key">${label}</span><span class="exif-val">${value}</span></div>`;
  }).join("");
  const warning = hasGPS
    ? `<p class="exif-gps-warning">&#9888; This file has GPS coordinates embedded. Anyone you send the original to can find out exactly where it was taken.</p>`
    : "";
  box.innerHTML = warning + `<div class="exif-table">${rows}</div>`;
}

async function handleImageFile(file) {
  currentFile = file;
  currentResult = null;
  document.getElementById("img-filename").textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  document.getElementById("img-download-row").style.display = "none";
  GAMA.say("working");

  try {
    const buf = await file.arrayBuffer();
    renderMetadata(parseExif(buf));
    GAMA.say("success");
    GAMA.log(`Loaded ${file.name}, scanned for EXIF`);
  } catch (e) {
    GAMA.say("error");
    document.getElementById("img-metadata").innerHTML = `// couldn't read that file: ${e.message}`;
  }
}

async function executeProcessImage() {
  if (!currentFile) return;
  const maxDim = parseInt(document.getElementById("img-maxdim").value, 10) || 0;
  const format = document.getElementById("img-format").value;
  GAMA.say("working");
  const { blob, width, height } = await processImage(currentFile, { maxDim, format, quality: 0.9 });
  currentResult = blob;

  const link = document.getElementById("img-download-link");
  link.href = URL.createObjectURL(blob);
  const ext = format === "jpeg" ? "jpg" : format;
  link.download = currentFile.name.replace(/\.[^.]+$/, "") + `-salvaged.${ext}`;
  document.getElementById("img-download-info").textContent =
    `${width}×${height}, ${(blob.size / 1024).toFixed(0)} KB, no metadata (re-encoded from scratch)`;
  document.getElementById("img-download-row").style.display = "block";
  GAMA.say("success");
  GAMA.log(`Processed ${currentFile.name} -> ${width}x${height} ${format}, EXIF stripped`);
}

function initImageTools() {
  const input = document.getElementById("img-file-input");
  const dropzone = document.getElementById("img-dropzone");
  if (!input || !dropzone) return;

  input.addEventListener("change", () => { if (input.files[0]) handleImageFile(input.files[0]); });
  dropzone.addEventListener("click", () => input.click());
  ["dragover", "dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.toggle("dragover", evt === "dragover"); })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageFile(file);
  });

  document.getElementById("img-process-btn").addEventListener("click", executeProcessImage);
}
document.addEventListener("DOMContentLoaded", initImageTools);
