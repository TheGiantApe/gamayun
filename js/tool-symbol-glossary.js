/* SYMBOL_GLOSSARY — common HTML entities / Unicode symbols, click to copy. */

const SYMBOLS = [
  ["Arrows", [
    ["→", "&rarr;", "U+2192"], ["←", "&larr;", "U+2190"], ["↑", "&uarr;", "U+2191"], ["↓", "&darr;", "U+2193"],
    ["↔", "&harr;", "U+2194"], ["⇒", "&rArr;", "U+21D2"], ["⇐", "&lArr;", "U+21D0"], ["↩", "&#8617;", "U+21A9"]
  ]],
  ["Math", [
    ["±", "&plusmn;", "U+00B1"], ["×", "&times;", "U+00D7"], ["÷", "&divide;", "U+00F7"], ["≈", "&asymp;", "U+2248"],
    ["≠", "&ne;", "U+2260"], ["≤", "&le;", "U+2264"], ["≥", "&ge;", "U+2265"], ["∞", "&infin;", "U+221E"],
    ["√", "&radic;", "U+221A"], ["∑", "&sum;", "U+2211"], ["∏", "&prod;", "U+220F"], ["∆", "&#8710;", "U+2206"],
    ["π", "&pi;", "U+03C0"], ["°", "&deg;", "U+00B0"]
  ]],
  ["Currency", [
    ["$", "&dollar;", "U+0024"], ["€", "&euro;", "U+20AC"], ["£", "&pound;", "U+00A3"], ["¥", "&yen;", "U+00A5"],
    ["¢", "&cent;", "U+00A2"], ["₿", "&#8383;", "U+20BF"]
  ]],
  ["Punctuation & Typography", [
    ["—", "&mdash;", "U+2014"], ["–", "&ndash;", "U+2013"], ["…", "&hellip;", "U+2026"], ["“", "&ldquo;", "U+201C"],
    ["”", "&rdquo;", "U+201D"], ["‘", "&lsquo;", "U+2018"], ["’", "&rsquo;", "U+2019"], ["•", "&bull;", "U+2022"],
    ["§", "&sect;", "U+00A7"], ["¶", "&para;", "U+00B6"], ["‹", "&lsaquo;", "U+2039"], ["›", "&rsaquo;", "U+203A"]
  ]],
  ["Legal & Reference", [
    ["©", "&copy;", "U+00A9"], ["®", "&reg;", "U+00AE"], ["™", "&trade;", "U+2122"], ["℗", "&#8471;", "U+2117"]
  ]],
  ["Card Suits & Misc", [
    ["♠", "&spades;", "U+2660"], ["♥", "&hearts;", "U+2665"], ["♦", "&diams;", "U+2666"], ["♣", "&clubs;", "U+2663"],
    ["★", "&#9733;", "U+2605"], ["☆", "&#9734;", "U+2606"], ["✓", "&#10003;", "U+2713"], ["✗", "&#10007;", "U+2717"],
    ["☠", "&#9760;", "U+2620"], ["⚠", "&#9888;", "U+26A0"], ["⌛", "&#8987;", "U+231B"], ["⚡", "&#9889;", "U+26A1"]
  ]]
];

function renderSymbolGlossary() {
  const container = document.getElementById("symbol-glossary");
  if (!container) return;
  container.innerHTML = SYMBOLS.map(([category, items]) => `
    <h3 style="font-family:var(--font-display); font-size:1rem; margin:1.2rem 0 0.5rem;">${category}</h3>
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.5rem;">
      ${items.map(([glyph, entity, codepoint]) => `
        <div class="tool-grid-item" style="cursor:pointer; padding:0.6rem;" onclick="navigator.clipboard.writeText('${glyph}'); GAMA.log('Copied ${glyph} (${codepoint})')" title="click to copy the glyph">
          <span style="font-size:1.4rem;">${glyph}</span>
          <div style="font-size:0.7rem; color:var(--phosphor-dim); margin-top:0.2rem;">${entity}<br>${codepoint}</div>
        </div>
      `).join("")}
    </div>
  `).join("");
}
document.addEventListener("DOMContentLoaded", renderSymbolGlossary);
