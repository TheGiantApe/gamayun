/* UNIT_CONVERTER — length/weight/volume via a base-unit conversion
   factor table (convert to the base unit, then to the target); Temperature
   is handled separately since C/F/K aren't a simple multiplicative
   relationship - it needs real offset formulas, not a factor table. */

const UNIT_CATEGORIES = {
  length: {
    units: {
      meter: 1, kilometer: 1000, centimeter: 0.01, millimeter: 0.001,
      mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254,
    },
  },
  weight: {
    units: { gram: 1, kilogram: 1000, milligram: 0.001, pound: 453.592, ounce: 28.3495 },
  },
  volume: {
    units: {
      liter: 1, milliliter: 0.001, "gallon (US)": 3.78541, "quart (US)": 0.946353,
      "cup (US)": 0.24, "fluid oz (US)": 0.0295735, tablespoon: 0.0147868, teaspoon: 0.00492892,
    },
  },
  temperature: { units: { celsius: null, fahrenheit: null, kelvin: null } },
};

let currentUnitCategory = "length";

function convertTemperature(value, from, to) {
  let celsius;
  if (from === "celsius") celsius = value;
  else if (from === "fahrenheit") celsius = (value - 32) * (5 / 9);
  else celsius = value - 273.15; // kelvin
  if (to === "celsius") return celsius;
  if (to === "fahrenheit") return celsius * (9 / 5) + 32;
  return celsius + 273.15; // kelvin
}

function setUnitCategory(category) {
  currentUnitCategory = category;
  Object.keys(UNIT_CATEGORIES).forEach((c) =>
    document.getElementById(`unitcat-${c}`).style.background = c === category ? "var(--phosphor)" : ""
  );
  Object.keys(UNIT_CATEGORIES).forEach((c) =>
    document.getElementById(`unitcat-${c}`).style.color = c === category ? "var(--void)" : ""
  );
  const unitNames = Object.keys(UNIT_CATEGORIES[category].units);
  const fromSel = document.getElementById("unitconv-from");
  const toSel = document.getElementById("unitconv-to");
  fromSel.innerHTML = unitNames.map((u) => `<option value="${u}">${u}</option>`).join("");
  toSel.innerHTML = unitNames.map((u) => `<option value="${u}">${u}</option>`).join("");
  toSel.selectedIndex = Math.min(1, unitNames.length - 1);
  executeUnitConvert();
}

function executeUnitConvert() {
  const value = parseFloat(document.getElementById("unitconv-value").value);
  const from = document.getElementById("unitconv-from").value;
  const to = document.getElementById("unitconv-to").value;
  const out = document.getElementById("unitconv-result");
  if (isNaN(value)) { GAMA.say("idle"); out.textContent = ""; return; }

  let result;
  if (currentUnitCategory === "temperature") {
    result = convertTemperature(value, from, to);
  } else {
    const { units } = UNIT_CATEGORIES[currentUnitCategory];
    result = (value * units[from]) / units[to];
  }
  out.textContent = `${value} ${from} = ${Math.round(result * 1e6) / 1e6} ${to}`;
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", () => setUnitCategory("length"));
