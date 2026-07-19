/* BASE_CONVERTER — bin/oct/dec/hex, any field live-updates the other
   three. Values are kept as a BigInt internally so large inputs don't
   silently lose precision to float rounding the way Number-based
   converters do. */

const BASE_FIELDS = { bin: { id: "base-bin", radix: 2 }, oct: { id: "base-oct", radix: 8 }, dec: { id: "base-dec", radix: 10 }, hex: { id: "base-hex", radix: 16 } };

function parseInBase(str, radix) {
  const cleaned = str.trim().replace(/^0[bxo]/i, "");
  if (!cleaned) return null;
  const validChars = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-fA-F]+$/ }[radix];
  if (!validChars.test(cleaned)) return null;
  try {
    return radix === 10 ? BigInt(cleaned) : parseIntBigBase(cleaned, radix);
  } catch { return null; }
}

/* BigInt has no built-in arbitrary-radix parse, so this hand-rolls it -
   digit by digit, same technique as long-hand base conversion on paper. */
function parseIntBigBase(str, radix) {
  let result = 0n;
  const big = BigInt(radix);
  for (const ch of str.toLowerCase()) {
    result = result * big + BigInt(parseInt(ch, 16));
  }
  return result;
}

function placeValueBreakdown(decValue) {
  const digits = decValue.toString().split("").reverse();
  return digits.map((d, i) => `${d}×10^${i}`).reverse().join(" + ");
}

function executeBaseConvert(sourceKey) {
  const source = BASE_FIELDS[sourceKey];
  const raw = document.getElementById(source.id).value;
  const out = document.getElementById("base-result");
  if (!raw.trim()) {
    Object.entries(BASE_FIELDS).forEach(([k, f]) => { if (k !== sourceKey) document.getElementById(f.id).value = ""; });
    out.textContent = "";
    GAMA.say("idle");
    return;
  }
  const value = parseInBase(raw, source.radix);
  if (value === null) {
    out.textContent = `// "${raw}" isn't a valid base-${source.radix} value`;
    GAMA.say("error");
    return;
  }
  Object.entries(BASE_FIELDS).forEach(([k, f]) => {
    if (k === sourceKey) return;
    document.getElementById(f.id).value = value.toString(f.radix);
  });
  out.textContent = value < 10n ** 15n
    ? `decimal ${value.toString()} = ${placeValueBreakdown(value.toString())}`
    : `decimal value: ${value.toString()}`;
  GAMA.say("success");
}
