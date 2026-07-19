/* ASPECT_RATIO_CALC — fill in any two of width/height/ratio, the third
   solves itself. Whichever field the user just touched drives which of
   the other two gets recomputed, using whichever of the remaining two
   already has a usable value. */

function parseRatio(str) {
  const m = (str || "").trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const rw = parseFloat(m[1]), rh = parseFloat(m[2]);
  if (!rw || !rh) return null;
  return { rw, rh };
}

function gcd(a, b) { return b < 0.0001 ? a : gcd(b, a % b); }

function simplifyRatio(w, h) {
  const divisor = gcd(w, h) || 1;
  const rw = w / divisor, rh = h / divisor;
  // Round-off from float GCD can leave near-integers that aren't exact -
  // round to 2 decimals rather than show visual noise like "16.000001:9".
  return `${Math.round(rw * 100) / 100}:${Math.round(rh * 100) / 100}`;
}

function setAspectPreset(ratioStr) {
  document.getElementById("ar-ratio").value = ratioStr;
  executeAspectRatio("ratio");
}

function executeAspectRatio(changedField) {
  const widthEl = document.getElementById("ar-width");
  const heightEl = document.getElementById("ar-height");
  const ratioEl = document.getElementById("ar-ratio");
  const out = document.getElementById("ar-result");

  const width = parseFloat(widthEl.value);
  const height = parseFloat(heightEl.value);
  const ratio = parseRatio(ratioEl.value);

  if (changedField === "width" || changedField === "height") {
    if (ratio && !isNaN(width) && changedField === "width") {
      heightEl.value = Math.round((width * ratio.rh) / ratio.rw);
    } else if (ratio && !isNaN(height) && changedField === "height") {
      widthEl.value = Math.round((height * ratio.rw) / ratio.rh);
    } else if (!isNaN(width) && !isNaN(height)) {
      ratioEl.value = simplifyRatio(width, height);
    }
  } else if (changedField === "ratio" && ratio) {
    if (!isNaN(width)) heightEl.value = Math.round((width * ratio.rh) / ratio.rw);
    else if (!isNaN(height)) widthEl.value = Math.round((height * ratio.rw) / ratio.rh);
  }

  const finalWidth = parseFloat(widthEl.value);
  const finalHeight = parseFloat(heightEl.value);
  if (!isNaN(finalWidth) && !isNaN(finalHeight) && finalWidth > 0 && finalHeight > 0) {
    out.textContent = `${finalWidth} × ${finalHeight} px  (${simplifyRatio(finalWidth, finalHeight)})`;
    GAMA.say("success");
  } else {
    out.textContent = "";
    GAMA.say("idle");
  }
}
