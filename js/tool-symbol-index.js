/* SYMBOL_INDEX — searchable Unicode symbol lookup. Pure functions over
   SYMBOL_DATA (js/data-symbols.js), filtered by glyph/name/codepoint,
   click-to-copy. Renders grouped by category when there's no query so
   browsing still makes sense, flat-filtered per category when there's
   a search match. */

function filterSymbols(query, data = SYMBOL_DATA) {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const qHex = q.replace(/^u\+/, "");
  const out = [];
  for (const [category, items] of data) {
    const matched = items.filter(([glyph, name, entity, cp]) => {
      if (glyph === query) return true;
      if (name.toLowerCase().includes(q)) return true;
      if (cp.toString(16).toLowerCase() === qHex) return true;
      if (String(cp) === q) return true;
      return false;
    });
    if (matched.length) out.push([category, matched]);
  }
  return out;
}

function renderSymbolIndex(query) {
  const container = document.getElementById("symbol-index-results");
  if (!container) return;
  const filtered = filterSymbols(query);
  const count = filtered.reduce((sum, [, items]) => sum + items.length, 0);

  const countEl = document.getElementById("symbol-index-count");
  if (countEl) countEl.textContent = query.trim()
    ? `${count} match${count === 1 ? "" : "es"} for "${query.trim()}"`
    : `${count} symbols, ${filtered.length} categories`;

  if (!filtered.length) {
    container.innerHTML = `<p style="color:var(--phosphor-dim-text);">// no symbols matched that. try a name ("arrow"), a codepoint ("2192" or "U+2192"), or paste the glyph itself.</p>`;
    return;
  }

  container.innerHTML = filtered.map(([category, items]) => `
    <h3 class="symbol-cat-label">${category}</h3>
    <div class="symbol-grid">
      ${items.map(([glyph, name, entity, cp]) => `
        <button type="button" class="symbol-tile" data-glyph="${glyph.replace(/"/g, "&quot;")}" data-name="${name.replace(/"/g, "&quot;")}" title="${name} — click to copy">
          <span class="symbol-glyph">${glyph}</span>
          <span class="symbol-meta">${name}<br>${entity} &middot; U+${cp.toString(16).toUpperCase().padStart(4, "0")}</span>
        </button>
      `).join("")}
    </div>
  `).join("");
}

function copySymbol(glyph, name) {
  navigator.clipboard.writeText(glyph);
  GAMA.say("success");
  GAMA.log(`Copied ${glyph} (${name})`);
}

function initSymbolIndex() {
  const input = document.getElementById("symbol-index-search");
  const container = document.getElementById("symbol-index-results");
  if (!input || !container) return;

  input.addEventListener("input", () => renderSymbolIndex(input.value));
  container.addEventListener("click", (e) => {
    const tile = e.target.closest(".symbol-tile");
    if (!tile) return;
    copySymbol(tile.dataset.glyph, tile.dataset.name);
  });
  renderSymbolIndex("");
}
document.addEventListener("DOMContentLoaded", initSymbolIndex);
