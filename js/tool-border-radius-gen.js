/* BORDER_RADIUS_PREVIEWER — four independent corner sliders (most
   simple tools only offer one uniform radius), with a "link all
   corners" toggle for the common case of wanting them to match. */

function renderBorderRadius() {
  const ids = ["br-tl", "br-tr", "br-br", "br-bl"];
  const linked = document.getElementById("br-link").checked;
  if (linked) {
    const value = document.getElementById(ids[0]).value;
    ids.slice(1).forEach((id) => (document.getElementById(id).value = value));
  }
  const [tl, tr, br, bl] = ids.map((id) => document.getElementById(id).value);
  const cssValue = `${tl}px ${tr}px ${br}px ${bl}px`;
  document.getElementById("borderradius-preview").style.borderRadius = cssValue;
  document.getElementById("borderradius-css").textContent = `border-radius: ${cssValue};`;
}

document.addEventListener("DOMContentLoaded", renderBorderRadius);
