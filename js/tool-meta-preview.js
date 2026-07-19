/* META_TAG_PREVIEW — mocks the link-card rendering both X/Twitter and
   Facebook actually use (image, then domain/title/description stacked
   below) and generates the real Open Graph + Twitter Card meta tags to
   produce it, since the two platforms overlap almost entirely but each
   has one or two tags the other ignores. */

function extractDomain(url) {
  try { return new URL(url).hostname; } catch { return url.replace(/^https?:\/\//, "").split("/")[0] || "example.com"; }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderMetaCardPreview(title, desc, image, url) {
  const domain = extractDomain(url || "");
  const preview = document.getElementById("meta-card-preview");
  if (!title && !desc && !image) { preview.innerHTML = ""; return; }
  preview.innerHTML = `
    ${image ? `<div style="width:100%; height:180px; background:#111 url('${escapeHtml(image)}') center/cover; border-bottom:1px solid var(--phosphor-dim);"></div>` : ""}
    <div style="padding:0.75rem;">
      <div style="font-size:0.7rem; color:var(--phosphor-dim-text); text-transform:uppercase;">${escapeHtml(domain)}</div>
      <div style="font-size:1rem; margin-top:0.25rem;">${escapeHtml(title || "(no title set)")}</div>
      <div style="font-size:0.8rem; color:var(--phosphor-dim-text); margin-top:0.25rem;">${escapeHtml((desc || "").slice(0, 160))}</div>
    </div>
  `;
}

function buildMetaTags(title, desc, image, url) {
  const esc = (s) => (s || "").replace(/"/g, "&quot;");
  return [
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ].join("\n");
}

function executeMetaPreview() {
  const title = document.getElementById("meta-title").value;
  const desc = document.getElementById("meta-desc").value;
  const image = document.getElementById("meta-image").value;
  const url = document.getElementById("meta-url").value;
  renderMetaCardPreview(title, desc, image, url);
  document.getElementById("meta-tags-output").textContent = buildMetaTags(title, desc, image, url);
  GAMA.say(title || desc ? "success" : "idle");
}

document.addEventListener("DOMContentLoaded", () => {
  executeMetaPreview();
  document.getElementById("meta-copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("meta-tags-output").textContent);
    GAMA.log("Copied meta tags");
    GAMA.say("success");
  });
});
