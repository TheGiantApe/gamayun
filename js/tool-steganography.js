/* STEGANOGRAPHY — LSB (least-significant-bit) encoding. A 32-bit length
   header (message byte count) followed by the UTF-8 message bytes, one bit
   per R/G/B channel. Output is always PNG - JPEG's lossy recompression
   destroys single-bit precision, so encoding into or re-sharing as JPEG
   silently breaks the hidden message. That's a property of LSB stego
   generally, not a bug here, but the UI warns about it.

   2026-08-07 fix: only fully-opaque pixels (alpha === 255) carry data.
   Found via a real manual click-through (embed, download, re-upload,
   extract - "no message found" on a genuinely just-encoded image) that
   partially-transparent pixels don't round-trip. Root cause: browsers
   premultiply RGB by alpha internally and un-premultiply on readback -
   for any pixel with 0 < alpha < 255 that's a lossy round-trip that can
   flip exactly the low bit this tool depends on, even before any
   download/re-save. Fully-opaque pixels have nothing to premultiply
   against (factor of 1), so they're unaffected - confirmed by testing
   against both a partially-transparent carrier (failed) and a fully
   opaque one (round-tripped byte-for-byte). Skipping non-opaque pixels
   entirely (not just the alpha channel) fixes this instead of just
   documenting it as a limitation. */

const STEGO_HEADER_BITS = 32;

function bytesToBits(bytes) {
  const bits = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    for (let b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
  }
  return bits;
}

function bitsToBytes(bits) {
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
    bytes[i] = v;
  }
  return bytes;
}

// Counts only fully-opaque pixels (alpha === 255) - see the file-header
// note on why partial transparency isn't safe to use for storage.
function stegoOpaquePixelCount(pixels) {
  let count = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] === 255) count++;
  }
  return count;
}

function stegoCapacityBytes(pixels) {
  const totalBits = stegoOpaquePixelCount(pixels) * 3;
  const usableBits = totalBits - STEGO_HEADER_BITS;
  return Math.max(0, Math.floor(usableBits / 8));
}

// pixels: Uint8ClampedArray in RGBA order (canvas ImageData.data). Mutates
// in place. messageBytes: Uint8Array. Throws if it won't fit. Only writes
// into R/G/B of pixels whose alpha is exactly 255 - see file header.
function encodeLsb(pixels, messageBytes) {
  const lengthBits = bytesToBits(new Uint8Array([
    (messageBytes.length >>> 24) & 0xff,
    (messageBytes.length >>> 16) & 0xff,
    (messageBytes.length >>> 8) & 0xff,
    messageBytes.length & 0xff,
  ]));
  const messageBits = bytesToBits(messageBytes);
  const allBits = new Uint8Array(lengthBits.length + messageBits.length);
  allBits.set(lengthBits, 0);
  allBits.set(messageBits, lengthBits.length);

  let bitIndex = 0;
  for (let p = 0; p * 4 < pixels.length && bitIndex < allBits.length; p++) {
    const base = p * 4;
    if (pixels[base + 3] !== 255) continue; // not fully opaque, skip the whole pixel
    for (let ch = 0; ch < 3 && bitIndex < allBits.length; ch++) {
      pixels[base + ch] = (pixels[base + ch] & 0xfe) | allBits[bitIndex];
      bitIndex++;
    }
  }
  if (bitIndex < allBits.length) {
    throw new Error("Message doesn't fit in this image's opaque pixels - use a larger or more opaque image, or a shorter message.");
  }
}

// pixels: Uint8ClampedArray RGBA. Returns the decoded Uint8Array message
// bytes. Only reads from R/G/B of fully-opaque pixels - see file header.
//
// Reads via one continuous generator rather than two separate loops (one
// for the header, one for the message) - the header is 32 bits, which
// isn't a multiple of 3 channels-per-opaque-pixel, so a naive second loop
// restarting at the next whole pixel silently drops whatever fraction of
// the boundary pixel the header read didn't consume. encodeLsb never had
// this problem since it writes header+message as one unbroken bitstream
// with no loop boundary between them - the reader needs the same property.
function* opaquePixelBits(pixels) {
  for (let p = 0; p * 4 < pixels.length; p++) {
    const base = p * 4;
    if (pixels[base + 3] !== 255) continue;
    for (let ch = 0; ch < 3; ch++) yield pixels[base + ch] & 1;
  }
}

function decodeLsb(pixels) {
  const bitGen = opaquePixelBits(pixels);
  const headerBits = new Uint8Array(STEGO_HEADER_BITS);
  for (let i = 0; i < STEGO_HEADER_BITS; i++) {
    const next = bitGen.next();
    if (next.done) throw new Error("No hidden message found in this image (or it wasn't encoded by this tool).");
    headerBits[i] = next.value;
  }
  const headerBytes = bitsToBytes(headerBits);
  const messageLength = (headerBytes[0] << 24) | (headerBytes[1] << 16) | (headerBytes[2] << 8) | headerBytes[3];
  // A plain (non-stego) image's low bits are effectively random, so the
  // "length" read out of one is garbage - bound it against what this image
  // could actually hold instead of trying to allocate/read a bogus size.
  const maxPossibleBytes = stegoCapacityBytes(pixels) + Math.ceil(STEGO_HEADER_BITS / 8);
  if (messageLength < 0 || messageLength > maxPossibleBytes) {
    throw new Error("No hidden message found in this image (or it wasn't encoded by this tool).");
  }
  const messageBitCount = messageLength * 8;
  const messageBits = new Uint8Array(messageBitCount);
  for (let i = 0; i < messageBitCount; i++) {
    const next = bitGen.next();
    if (next.done) {
      throw new Error("Couldn't read a complete message from this image - it may not contain one, or it's been recompressed since encoding.");
    }
    messageBits[i] = next.value;
  }
  return bitsToBytes(messageBits);
}

/* ---- UI wiring ---- */

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

let stegoEncodeFile = null;
let stegoDecodeFile = null;

async function handleStegoEncodeFile(file) {
  stegoEncodeFile = file;
  document.getElementById("stego-encode-filename").textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  const img = await loadImageFromFile(file);
  // Capacity now depends on how many pixels are actually fully opaque
  // (see the encodeLsb/decodeLsb header note), not just width*height - has
  // to be read off real pixel data, not just the image's dimensions.
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const cap = stegoCapacityBytes(pixels);
  const opaqueCount = stegoOpaquePixelCount(pixels);
  const totalCount = img.naturalWidth * img.naturalHeight;
  const transparencyNote = opaqueCount < totalCount
    ? ` (${Math.round(100 * (1 - opaqueCount / totalCount))}% of this image is transparent and can't hold data)`
    : "";
  document.getElementById("stego-capacity").textContent =
    `${img.naturalWidth}×${img.naturalHeight} - up to ~${cap.toLocaleString()} bytes of message capacity${transparencyNote}`;
  URL.revokeObjectURL(img.src);
}

async function executeStegoEncode() {
  if (!stegoEncodeFile) { GAMA.say("error"); return; }
  const message = document.getElementById("stego-message").value;
  const out = document.getElementById("stego-encode-result");
  const link = document.getElementById("stego-download-link");
  out.classList.remove("is-done");
  link.style.display = "none";
  if (!message) { out.textContent = "// enter a message to hide first"; return; }
  GAMA.say("working");
  try {
    const img = await loadImageFromFile(stegoEncodeFile);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const messageBytes = new TextEncoder().encode(message);
    encodeLsb(imageData.data, messageBytes);
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      const downloadName = stegoEncodeFile.name.replace(/\.[^.]+$/, "") + "-salvaged-intel.png";
      link.href = URL.createObjectURL(blob);
      link.download = downloadName;
      link.style.display = "inline-block";
      link.dataset.clicked = "";
      out.textContent = `✓ DONE - ${messageBytes.length} bytes embedded. Click DOWNLOAD PNG below to save the file - any other format (or re-saving as JPEG) will destroy the hidden data.`;
      out.classList.add("is-done");
      GAMA.say("success");
      GAMA.log(`Embedded ${messageBytes.length}-byte message via LSB`);
    }, "image/png");
  } catch (e) {
    GAMA.say("error");
    out.textContent = "// " + e.message;
  }
}

function confirmStegoDownload() {
  const link = document.getElementById("stego-download-link");
  const out = document.getElementById("stego-encode-result");
  if (link.dataset.clicked === "1") return;
  link.dataset.clicked = "1";
  out.textContent = `✓ SAVED - "${link.download}" sent to your browser's downloads. Remember: only PNG preserves the hidden message.`;
}

async function handleStegoDecodeFile(file) {
  stegoDecodeFile = file;
  document.getElementById("stego-decode-filename").textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  await executeStegoDecode();
}

async function executeStegoDecode() {
  if (!stegoDecodeFile) return;
  const out = document.getElementById("stego-decode-result");
  out.classList.remove("is-done");
  GAMA.say("working");
  try {
    const img = await loadImageFromFile(stegoDecodeFile);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const messageBytes = decodeLsb(imageData.data);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(messageBytes);
    out.textContent = `✓ EXTRACTED (${messageBytes.length} bytes):\n${text}`;
    out.classList.add("is-done");
    GAMA.say("success");
    GAMA.log(`Extracted a ${messageBytes.length}-byte hidden message`);
  } catch (e) {
    GAMA.say("error");
    out.textContent = "// " + e.message;
  }
}

function initSteganography() {
  const encInput = document.getElementById("stego-encode-file-input");
  const encZone = document.getElementById("stego-encode-dropzone");
  if (encInput && encZone) {
    encInput.addEventListener("change", () => { if (encInput.files[0]) handleStegoEncodeFile(encInput.files[0]); });
    encZone.addEventListener("click", () => encInput.click());
    ["dragover", "dragleave", "drop"].forEach((evt) =>
      encZone.addEventListener(evt, (e) => { e.preventDefault(); encZone.classList.toggle("dragover", evt === "dragover"); })
    );
    encZone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleStegoEncodeFile(file);
    });
  }

  const decInput = document.getElementById("stego-decode-file-input");
  const decZone = document.getElementById("stego-decode-dropzone");
  if (decInput && decZone) {
    decInput.addEventListener("change", () => { if (decInput.files[0]) handleStegoDecodeFile(decInput.files[0]); });
    decZone.addEventListener("click", () => decInput.click());
    ["dragover", "dragleave", "drop"].forEach((evt) =>
      decZone.addEventListener(evt, (e) => { e.preventDefault(); decZone.classList.toggle("dragover", evt === "dragover"); })
    );
    decZone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleStegoDecodeFile(file);
    });
  }
}
document.addEventListener("DOMContentLoaded", initSteganography);
