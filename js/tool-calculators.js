/* CALC_DECK — Percentage, Tip, Age. Three small calculators, one file.
   (BMI calc was retired - see tool-iifym.js for its replacement.) */

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
