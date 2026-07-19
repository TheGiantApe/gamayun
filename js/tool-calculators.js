/* CALC_DECK — Percentage, Tip, Age, Discount, Date Difference. Small
   calculators, one file. (BMI calc was retired - see tool-iifym.js for
   its replacement.) */

function executePercentage() {
  const a = parseFloat(document.getElementById("pct-x").value);
  const b = parseFloat(document.getElementById("pct-y").value);
  const out = document.getElementById("pct-result");
  if (isNaN(a) || isNaN(b) || b === 0) { GAMA.say("idle"); out.textContent = ""; return; }
  const result = (a / b) * 100;
  out.textContent = `${a} is ${Math.round(result * 100) / 100}% of ${b}`;
  GAMA.say("success");
}

function executeTip() {
  const bill = parseFloat(document.getElementById("tip-bill").value);
  const pct = parseFloat(document.getElementById("tip-pct").value);
  const people = parseInt(document.getElementById("tip-people").value) || 1;
  const out = document.getElementById("tip-result");
  if (!bill || !pct) { GAMA.say("idle"); out.textContent = ""; return; }
  const tipAmt = bill * (pct / 100);
  const total = bill + tipAmt;
  out.innerHTML = `Tip: $${tipAmt.toFixed(2)} &nbsp; Total: $${total.toFixed(2)} &nbsp; Per person (${people}): $${(total / people).toFixed(2)}`;
  GAMA.say("success");
}

function calcAge(birthDateStr) {
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months -= 1; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  const totalDays = Math.floor((now - birth) / 86400000);
  return { years, months, days, totalDays };
}
function executeAge() {
  const raw = document.getElementById("age-birthdate").value;
  const out = document.getElementById("age-result");
  if (!raw) { GAMA.say("idle"); out.textContent = ""; return; }
  const result = calcAge(raw);
  if (!result) { GAMA.say("error"); out.textContent = "// unreadable date"; return; }
  out.innerHTML = `${result.years} years, ${result.months} months, ${result.days} days &nbsp; (${result.totalDays.toLocaleString()} days total)`;
  GAMA.say("success");
}

// Stacked percentage discounts aren't additive - 20% then 10% off is
// 1 - (0.8 * 0.9) = 28% off total, not 30% - because the second discount
// applies to the already-reduced price, not the original.
function executeDiscount() {
  const price = parseFloat(document.getElementById("disc-price").value);
  const pct1 = parseFloat(document.getElementById("disc-pct1").value);
  const pct2 = parseFloat(document.getElementById("disc-pct2").value);
  const out = document.getElementById("disc-result");
  if (isNaN(price) || isNaN(pct1)) { GAMA.say("idle"); out.textContent = ""; return; }

  const afterFirst = price * (1 - pct1 / 100);
  const afterSecond = isNaN(pct2) ? afterFirst : afterFirst * (1 - pct2 / 100);
  const totalOffPct = (1 - afterSecond / price) * 100;

  const steps = isNaN(pct2)
    ? `$${price.toFixed(2)} &times; (1 - ${pct1}%) = $${afterFirst.toFixed(2)}`
    : `$${price.toFixed(2)} &times; (1 - ${pct1}%) = $${afterFirst.toFixed(2)} &nbsp;&rarr;&nbsp; $${afterFirst.toFixed(2)} &times; (1 - ${pct2}%) = $${afterSecond.toFixed(2)}`;
  out.innerHTML = `${steps}<br>Final price: <strong>$${afterSecond.toFixed(2)}</strong> (${totalOffPct.toFixed(1)}% off total, not ${(pct1 + (pct2 || 0)).toFixed(0)}%)`;
  GAMA.say("success");
}

function executeDateDiff() {
  const startRaw = document.getElementById("datediff-start").value;
  const endRaw = document.getElementById("datediff-end").value;
  const out = document.getElementById("datediff-result");
  if (!startRaw || !endRaw) { GAMA.say("idle"); out.textContent = ""; return; }

  const start = new Date(startRaw);
  const end = new Date(endRaw);
  const totalDays = Math.round((end - start) / 86400000);
  // Same year/month/day breakdown math as calcAge, just anchored between
  // two arbitrary dates instead of "birthdate to now."
  const later = startRaw < endRaw ? new Date(endRaw) : new Date(startRaw);
  const earlier = startRaw < endRaw ? new Date(startRaw) : new Date(endRaw);
  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  let days = later.getDate() - earlier.getDate();
  if (days < 0) { months -= 1; days += new Date(later.getFullYear(), later.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }

  out.innerHTML = `${Math.abs(totalDays).toLocaleString()} days &nbsp; (${(Math.abs(totalDays) / 7).toFixed(1)} weeks &nbsp;|&nbsp; ${years}y ${months}m ${days}d)`;
  GAMA.say("success");
}
