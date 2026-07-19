/* UNIT_PRICE_COMPARATOR — arbitrary number of rows (not just a fixed
   pair), each price/quantity/label; recomputes and highlights the
   cheapest per-unit price on any input change. */

function addUnitPriceRow() {
  const row = document.createElement("div");
  row.className = "tool-workspace";
  row.style.marginBottom = "0.5rem";
  row.innerHTML = `
    <input type="number" placeholder="price" class="unitprice-price" oninput="renderUnitPrice()" style="width:90px;">
    <input type="number" placeholder="quantity" class="unitprice-qty" oninput="renderUnitPrice()" style="width:90px;">
    <input type="text" placeholder="unit (oz, ct...)" class="unitprice-label" oninput="renderUnitPrice()" style="width:100px;">
  `;
  document.getElementById("unitprice-rows").appendChild(row);
}

function renderUnitPrice() {
  const rows = [...document.querySelectorAll("#unitprice-rows .tool-workspace")];
  const items = rows.map((row) => {
    const price = parseFloat(row.querySelector(".unitprice-price").value);
    const qty = parseFloat(row.querySelector(".unitprice-qty").value);
    const label = row.querySelector(".unitprice-label").value.trim() || "unit";
    return { price, qty, label, perUnit: !isNaN(price) && !isNaN(qty) && qty > 0 ? price / qty : null };
  });
  const valid = items.filter((i) => i.perUnit !== null);
  const out = document.getElementById("unitprice-result");
  if (valid.length < 2) { GAMA.say("idle"); out.textContent = ""; return; }

  const cheapest = Math.min(...valid.map((i) => i.perUnit));
  out.innerHTML = valid
    .map((i) => `${i.perUnit === cheapest ? "&gt; " : "&nbsp;&nbsp;"}$${i.perUnit.toFixed(4)} / ${i.label}${i.perUnit === cheapest ? " (cheapest)" : ""}`)
    .join("<br>");
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", () => {
  addUnitPriceRow();
  addUnitPriceRow();
});
