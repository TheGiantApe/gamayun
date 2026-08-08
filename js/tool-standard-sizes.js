/* STANDARD_SIZES — searchable dimension reference over SIZE_DATA
   (js/data-sizes.js). Same filter/render/copy shape as the Acronym Index
   (js/tool-acronym-index.js) - matches by name, dims, or note. */

function filterSizes(query, data = SIZE_DATA) {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const out = [];
  for (const [category, items] of data) {
    const matched = items.filter(([name, dims, note]) =>
      name.toLowerCase().includes(q) ||
      dims.toLowerCase().includes(q) ||
      note.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
    if (matched.length) out.push([category, matched]);
  }
  return out;
}

function renderSizeIndex(query) {
  const container = document.getElementById("size-index-results");
  if (!container) return;
  const filtered = filterSizes(query);
  const count = filtered.reduce((sum, [, items]) => sum + items.length, 0);

  const countEl = document.getElementById("size-index-count");
  if (countEl) countEl.textContent = query.trim()
    ? `${count} match${count === 1 ? "" : "es"} for "${query.trim()}"`
    : `${count} sizes, ${filtered.length} categories`;

  if (!filtered.length) {
    container.innerHTML = `<p style="color:var(--phosphor-dim-text);">// nothing matched that.</p>`;
    return;
  }

  container.innerHTML = filtered.map(([category, items]) => `
    <h3 class="symbol-cat-label">${category}</h3>
    <div class="acronym-list">
      ${items.map(([name, dims, note]) => `
        <div class="acronym-entry">
          <button type="button" class="acronym-term" data-dims="${dims.replace(/"/g, "&quot;")}" title="click to copy">${dims}</button>
          <div class="acronym-body">
            <div class="acronym-expansion">${name}</div>
            ${note ? `<div class="acronym-note">${note}</div>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function copySize(dims) {
  navigator.clipboard.writeText(dims);
  GAMA.say("success");
  GAMA.log(`Copied ${dims}`);
}

function initSizeIndex() {
  const input = document.getElementById("size-index-search");
  const container = document.getElementById("size-index-results");
  if (!input || !container) return;

  input.addEventListener("input", () => renderSizeIndex(input.value));
  container.addEventListener("click", (e) => {
    const term = e.target.closest(".acronym-term");
    if (!term) return;
    copySize(term.dataset.dims);
  });
  renderSizeIndex("");
}
document.addEventListener("DOMContentLoaded", initSizeIndex);
