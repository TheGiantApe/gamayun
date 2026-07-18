/* DEAD_DROP — AES-256-GCM encryption (Web Crypto API), entire encrypted
   payload packed into the URL fragment. Fragments are never transmitted in
   an HTTP request (everything after "#" is browser-local), so the link
   itself is the only "storage" - there is no server component, not even
   a temporary one, which is a stronger claim than most "self-destructing
   note" services can make (most of those still hold an encrypted blob
   server-side between creation and viewing).

   "Self-destruct" is real but deliberately scoped: this browser marks a
   payload as seen in localStorage after the first successful decrypt, and
   refuses to re-display it on this device. It cannot delete the secret
   from anyone else who has the link, or from this same browser's history -
   that limitation is stated on the page, not buried. */

function b64urlEncode(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deadDropDeriveWrapKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function deadDropEncrypt(message, passphrase) {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(message));
  const rawKey = await crypto.subtle.exportKey("raw", key);

  const payload = { v: 1, iv: b64urlEncode(iv), ct: b64urlEncode(ct) };
  if (passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));
    const wrapKey = await deadDropDeriveWrapKey(passphrase, salt);
    const wrappedKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv: wrapIv }, wrapKey, rawKey);
    Object.assign(payload, { pp: true, salt: b64urlEncode(salt), wrapIv: b64urlEncode(wrapIv), wrappedKey: b64urlEncode(wrappedKey) });
  } else {
    Object.assign(payload, { pp: false, key: b64urlEncode(rawKey) });
  }
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
}

async function deadDropDecrypt(packed, passphrase) {
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(packed)));
  let rawKey;
  if (payload.pp) {
    const wrapKey = await deadDropDeriveWrapKey(passphrase, b64urlDecode(payload.salt));
    rawKey = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64urlDecode(payload.wrapIv) }, wrapKey, b64urlDecode(payload.wrappedKey));
  } else {
    rawKey = b64urlDecode(payload.key);
  }
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64urlDecode(payload.iv) }, key, b64urlDecode(payload.ct));
  return new TextDecoder().decode(pt);
}

function deadDropSeenKey(packed) {
  return "gama_deaddrop_seen:" + packed.slice(0, 64);
}

async function executeDeadDropCreate() {
  const message = document.getElementById("deaddrop-message").value;
  const passphrase = document.getElementById("deaddrop-passphrase").value;
  const out = document.getElementById("deaddrop-create-result");
  if (!message.trim()) { GAMA.say("idle"); out.innerHTML = ""; return; }
  GAMA.say("working");
  const packed = await deadDropEncrypt(message, passphrase || null);
  const url = window.location.origin + window.location.pathname + "#" + packed;
  out.innerHTML =
    `<p style="color:var(--phosphor-dim-text); font-size:0.8rem;">Sealed. This link decrypts the message${passphrase ? " once the passphrase is entered" : ""} - nothing was sent anywhere to generate it.</p>` +
    `<div class="result-block is-done" style="margin-top:0.5rem;">${url}</div>` +
    `<button style="margin-top:0.5rem;" onclick="navigator.clipboard.writeText('${url.replace(/'/g, "\\'")}'); GAMA.say('success'); GAMA.log('Dead drop link copied.')">&gt; COPY LINK</button>`;
  GAMA.say("success");
  GAMA.log("Sealed a dead drop, " + message.length + " characters.");
}

async function executeDeadDropOpen() {
  const packed = window.location.hash.slice(1);
  const passphrase = document.getElementById("deaddrop-open-passphrase").value;
  const out = document.getElementById("deaddrop-open-result");
  GAMA.say("working");
  try {
    const message = await deadDropDecrypt(packed, passphrase || undefined);
    localStorage.setItem(deadDropSeenKey(packed), "1");
    out.innerHTML =
      `<p style="color:var(--phosphor-dim-text); font-size:0.8rem;">Decrypted. Marked as viewed on this device - reloading this link here won't show it again.</p>` +
      `<pre style="white-space:pre-wrap; margin-top:0.5rem;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
    document.getElementById("deaddrop-passphrase-row").style.display = "none";
    GAMA.say("success");
  } catch (e) {
    out.innerHTML = `<p style="color:var(--amber);">// decryption failed - wrong passphrase, or the link is incomplete/corrupted.</p>`;
    GAMA.say("error");
  }
}

function initDeadDrop() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  document.getElementById("deaddrop-create-view").style.display = "none";
  document.getElementById("deaddrop-open-view").style.display = "block";
  const out = document.getElementById("deaddrop-open-result");

  if (localStorage.getItem(deadDropSeenKey(hash))) {
    out.innerHTML = `<p style="color:var(--phosphor-dim-text);">// already viewed on this device. The sender can generate a new link if this needs resending.</p>`;
    return;
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(hash)));
  } catch (e) {
    out.innerHTML = `<p style="color:var(--amber);">// this link looks incomplete or corrupted - the full URL, including everything after the #, is needed to decrypt.</p>`;
    return;
  }

  if (payload.pp) {
    document.getElementById("deaddrop-passphrase-row").style.display = "flex";
    out.innerHTML = `<p style="color:var(--phosphor-dim-text); font-size:0.85rem;">// passphrase-protected. Enter it above to decrypt.</p>`;
  } else {
    executeDeadDropOpen();
  }
}

document.addEventListener("DOMContentLoaded", initDeadDrop);
