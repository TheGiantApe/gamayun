/* FONT_PAIRING_PREVIEWER — hand-curated web-safe pairings only, no
   Google Fonts / CDN call. The curation itself is the value: dumping
   every possible font-A + font-B combination into a picker isn't useful,
   most pairs look bad together - these are ones that actually work. */

const FONT_PAIRINGS = [
  { heading: "Georgia, serif", body: "Verdana, sans-serif", note: "Classic editorial pairing - a warm serif headline over a wide, highly legible sans body." },
  { heading: "'Trebuchet MS', sans-serif", body: "Georgia, serif", note: "Friendly rounded sans headline, traditional serif body - a common blog/publication combo." },
  { heading: "Impact, sans-serif", body: "Arial, sans-serif", note: "Bold poster-style headline over a neutral, unobtrusive body - good for high-contrast landing sections." },
  { heading: "Palatino, 'Palatino Linotype', serif", body: "Verdana, sans-serif", note: "Elegant old-style serif headline, clean geometric sans body - reads as more formal/editorial." },
  { heading: "'Segoe UI', Tahoma, sans-serif", body: "Georgia, serif", note: "Modern OS-native sans headline paired with a classic serif body for warmth." },
  { heading: "'Courier New', monospace", body: "Arial, sans-serif", note: "Monospace technical headline over a clean sans body - fits code-adjacent or terminal-style content." },
  { heading: "'Century Gothic', sans-serif", body: "Georgia, serif", note: "Geometric, very modern-feeling headline over a traditional serif body - a deliberate old/new contrast." },
  { heading: "Cambria, Georgia, serif", body: "Calibri, Verdana, sans-serif", note: "Both fonts read as \"quietly professional\" - a safe, corporate-appropriate pairing." },
];

function renderFontPairings() {
  const container = document.getElementById("fontpairing-list");
  container.innerHTML = FONT_PAIRINGS.map((p, i) => `
    <div style="border:1px solid var(--phosphor-dim); padding:1rem; margin-bottom:1rem;">
      <div style="font-family:${p.heading}; font-size:1.6rem; color:var(--phosphor);" contenteditable="true">The Salvage Report</div>
      <div style="font-family:${p.body}; font-size:0.95rem; margin-top:0.5rem;" contenteditable="true">Field notes from the archive: what survived the collapse, and what to do with it now.</div>
      <div style="font-size:0.75rem; color:var(--phosphor-dim-text); margin-top:0.5rem;">${p.note}<br>heading: ${p.heading} &middot; body: ${p.body}</div>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", renderFontPairings);
