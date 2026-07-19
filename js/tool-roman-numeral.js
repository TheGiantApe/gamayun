/* ROMAN_NUMERAL_CONVERTER — both directions. The roman->number direction
   validates the subtractive-notation rules (only I/X/C may precede a
   larger numeral, only specific pairs, max 3 repeats) instead of just
   summing symbol values, so malformed input gets a real explanation. */

const ROMAN_VALUES = [
  ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
  ["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
  ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
];

function numberToRoman(num) {
  let n = num;
  let out = "";
  for (const [sym, val] of ROMAN_VALUES) {
    while (n >= val) { out += sym; n -= val; }
  }
  return out;
}

/* Returns { value } on success or { error } on a validation failure. */
function romanToNumber(str) {
  const s = str.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) return { error: "contains a character that isn't a Roman numeral symbol (I V X L C D M)" };

  // Repeat-count rule: I/X/C/M can repeat up to 3x, V/L/D never repeat.
  const repeatMatch = s.match(/I{4,}|X{4,}|C{4,}|M{4,}|V{2,}|L{2,}|D{2,}/);
  if (repeatMatch) return { error: `"${repeatMatch[0]}" repeats a symbol more times than Roman numerals allow` };

  // Subtractive-pair rule: only these six pairs may have a smaller symbol before a larger one.
  const validSubtractivePairs = new Set(["IV", "IX", "XL", "XC", "CD", "CM"]);
  let value = 0;
  let i = 0;
  while (i < s.length) {
    const singleVal = ROMAN_VALUES.find(([sym]) => sym === s[i])[1];
    const pair = s.slice(i, i + 2);
    const pairEntry = ROMAN_VALUES.find(([sym]) => sym === pair);
    if (pairEntry && pairEntry[0].length === 2) {
      if (!validSubtractivePairs.has(pair)) return { error: `"${pair}" is not a valid subtractive pair - only IV, IX, XL, XC, CD, CM may place a smaller numeral before a larger one` };
      value += pairEntry[1];
      i += 2;
    } else {
      value += singleVal;
      i += 1;
    }
  }

  // Round-trip check catches ordering errors the pair/repeat rules alone miss (e.g. "VX").
  if (numberToRoman(value) !== s) return { error: `symbols are out of the required descending order for a valid Roman numeral` };
  return { value };
}

function executeNumberToRoman() {
  const raw = document.getElementById("roman-num-input").value;
  const out = document.getElementById("roman-num-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1 || n > 3999) {
    out.textContent = "// out of range - Roman numerals here cover 1 to 3999 (no standard symbol for 0 or anything larger)";
    GAMA.say("error");
    return;
  }
  out.textContent = numberToRoman(n);
  GAMA.say("success");
}

function executeRomanToNumber() {
  const raw = document.getElementById("roman-text-input").value.trim();
  const out = document.getElementById("roman-text-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  const result = romanToNumber(raw);
  if (result.error) {
    out.textContent = `// invalid: ${result.error}`;
    GAMA.say("error");
    return;
  }
  out.textContent = result.value.toLocaleString();
  GAMA.say("success");
}
