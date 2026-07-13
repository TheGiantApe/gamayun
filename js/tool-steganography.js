/* STEGANOGRAPHY — LSB (least-significant-bit) encoding. A 32-bit length
   header (message byte count) followed by the UTF-8 message bytes, one bit
   per R/G/B channel (alpha untouched). Output is always PNG - JPEG's lossy
   recompression destroys single-bit precision, so encoding into or
   re-sharing as JPEG silently breaks the hidden message. That's a property
   of LSB stego generally, not a bug here, but the UI warns about it. */

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

function stegoCapacityBytes(width, height) {
  const totalBits = width * height * 3;
  const usableBits = totalBits - STEGO_HEADER_BITS;
  return Math.max(0, Math.floor(usableBits / 8));
}

// pixels: Uint8ClampedArray in RGBA order (canvas ImageData.data). Mutates
// in place. messageBytes: Uint8Array. Throws if it won't fit.
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

  const numPixelChannels = pixels.length; // includes alpha, but we skip every 4th
  let bitIndex = 0;
  for (let i = 0; i < numPixelChannels && bitIndex < allBits.length; i++) {
    if ((i + 1) % 4 === 0) continue; // skip alpha channel
    pixels[i] = (pixels[i] & 0xfe) | allBits[bitIndex];
    bitIndex++;
  }
  if (bitIndex < allBits.length) {
    throw new Error("Message doesn't fit in this image - use a larger image or a shorter message.");
  }
}

// pixels: Uint8ClampedArray RGBA. Returns the decoded Uint8Array message bytes.
function decodeLsb(pixels) {
  const headerBits = new Uint8Array(STEGO_HEADER_BITS);
  let bitIndex = 0;
  let i = 0;
  for (; i < pixels.length && bitIndex < STEGO_HEADER_BITS; i++) {
    if ((i + 1) % 4 === 0) continue;
    headerBits[bitIndex] = pixels[i] & 1;
    bitIndex++;
  }
  const headerBytes = bitsToBytes(headerBits);
  const messageLength = (headerBytes[0] << 24) | (headerBytes[1] << 16) | (headerBytes[2] << 8) | headerBytes[3];
  // A plain (non-stego) image's low bits are effectively random, so the
  // "length" read out of one is garbage - bound it against what this image
  // could actually hold instead of trying to allocate/read a bogus size.
  const maxPossibleBytes = Math.floor((pixels.length * 3) / 4 / 8);
  if (messageLength < 0 || messageLength > maxPossibleBytes) {
    throw new Error("No hidden message found in this image (or it wasn't encoded by this tool).");
  }
  const messageBitCount = messageLength * 8;
  const messageBits = new Uint8Array(messageBitCount);
  let mIndex = 0;
  for (; i < pixels.length && mIndex < messageBitCount; i++) {
    if ((i + 1) % 4 === 0) continue;
    messageBits[mIndex] = pixels[i] & 1;
    mIndex++;
  }
  if (mIndex < messageBitCount) {
    throw new Error("Couldn't read a complete message from this image - it may not contain one, or it's been recompressed since encoding.");
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
  const cap = stegoCapacityBytes(img.naturalWidth, img.naturalHeight);
  document.getElementById("stego-capacity").textContent =
    `${img.naturalWidth}×${img.naturalHeight} - up to ~${cap.toLocaleString()} bytes of message capacity`;
  URL.revokeObjectURL(img.src);
}

async function executeStegoEncode() {
  if (!stegoEncodeFile) { GAMA.say("error"); return; }
  const message = document.getElementById("stego-message").value;
  const out = document.getElementById("stego-encode-result");
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
      const link = document.getElementById("stego-download-link");
      link.href = URL.createObjectURL(blob);
      link.download = stegoEncodeFile.name.replace(/\.[^.]+$/, "") + "-salvaged-intel.png";
      link.style.display = "inline-block";
      out.textContent = `// embedded ${messageBytes.length} bytes. download as PNG - any other format (or re-saving as JPEG) will destroy the hidden data.`;
      GAMA.say("success");
      GAMA.log(`Embedded ${messageBytes.length}-byte message via LSB`);
    }, "image/png");
  } catch (e) {
    GAMA.say("error");
    out.textContent = "// " + e.message;
  }
}

async function handleStegoDecodeFile(file) {
  stegoDecodeFile = file;
  document.getElementById("stego-decode-filename").textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  await executeStegoDecode();
}

async function executeStegoDecode() {
  if (!stegoDecodeFile) return;
  const out = document.getElementById("stego-decode-result");
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
    out.textContent = text;
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
