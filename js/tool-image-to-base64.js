/* IMAGE_TO_BASE64 — FileReader to a base64 data URI, plus an honest
   size warning. Base64 encoding itself inflates the original byte size
   by ~33%, and embedding a large data URI in CSS/HTML defeats browser
   caching (the image gets re-downloaded with every page load instead of
   cached once) - both worth flagging rather than just handing back a
   string with no context. */

const I2B64_WARN_BYTES = 10 * 1024; // 10KB - above this, embedding starts costing more than it saves

function initImageToBase64() {
  const dropzone = document.getElementById("i2b64-dropzone");
  const input = document.getElementById("i2b64-file-input");
  dropzone.addEventListener("click", () => input.click());
  ["dragover", "dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.toggle("dragover", evt === "dragover");
      if (evt === "drop") loadImageToBase64(e.dataTransfer.files[0]);
    })
  );
  input.addEventListener("change", () => loadImageToBase64(input.files[0]));

  document.getElementById("i2b64-copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("i2b64-result").textContent);
    GAMA.log("Copied data URI");
    GAMA.say("success");
  });
}

function loadImageToBase64(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUri = e.target.result;
    document.getElementById("i2b64-result").textContent = dataUri;
    const sizeBytes = new TextEncoder().encode(dataUri).length;
    const warn = document.getElementById("i2b64-warning");
    warn.textContent = sizeBytes > I2B64_WARN_BYTES
      ? `⚠ ${(sizeBytes / 1024).toFixed(1)}KB encoded (base64 adds ~33% over the original file size) - embedding something this large inline means it re-downloads on every page load instead of being cached separately. Fine for small icons/textures, not for photos.`
      : `${(sizeBytes / 1024).toFixed(1)}KB encoded - small enough that inline embedding is reasonable.`;
    GAMA.say("success");
  };
  reader.readAsDataURL(file);
}

document.addEventListener("DOMContentLoaded", initImageToBase64);
