/* MACRO_CALC — flexible-dieting macro calculator (the method some corners
   of fitness call "IIFYM," which is likely someone's trade name - keeping
   this tool's own branding generic). BMR via Mifflin-St Jeor, TDEE via
   activity multiplier, calorie target via goal adjustment, then macros
   split protein/fat pinned to bodyweight, carbs fill the rest. Replaced
   the old BMI calculator - see calc-iifym.html for the disclaimer on why. */

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
const GOAL_ADJUSTMENTS = { cut: 0.8, maintain: 1.0, bulk: 1.1 };

function calcBMR(sex, weightLb, heightCm, age) {
  const weightKg = weightLb * 0.453592;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

function calcMacros({ sex, weightLb, heightCm, age, activity, goal }) {
  const bmr = calcBMR(sex, weightLb, heightCm, age);
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.2);
  const targetCalories = tdee * (GOAL_ADJUSTMENTS[goal] || 1.0);

  const proteinG = weightLb * 1.0;
  const fatG = weightLb * 0.35;
  const proteinCal = proteinG * 4;
  const fatCal = fatG * 9;
  const carbCal = targetCalories - proteinCal - fatCal;
  const carbG = Math.max(0, carbCal / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    proteinG: Math.round(proteinG),
    fatG: Math.round(fatG),
    carbG: Math.round(carbG),
    carbDeficitWarning: carbCal < 0,
  };
}

function executeIifym() {
  const sex = document.getElementById("iifym-sex").value;
  const weightLb = parseFloat(document.getElementById("iifym-weight").value);
  const heightCm = parseFloat(document.getElementById("iifym-height").value);
  const age = parseFloat(document.getElementById("iifym-age").value);
  const activity = document.getElementById("iifym-activity").value;
  const goal = document.getElementById("iifym-goal").value;
  const out = document.getElementById("iifym-result");

  if (!weightLb || !heightCm || !age) { GAMA.say("idle"); out.innerHTML = ""; return; }

  const m = calcMacros({ sex, weightLb, heightCm, age, activity, goal });
  out.innerHTML = `
    <div class="iifym-summary">
      <div class="iifym-stat"><span class="iifym-stat-label">BMR</span><span class="iifym-stat-val">${m.bmr} kcal</span></div>
      <div class="iifym-stat"><span class="iifym-stat-label">TDEE</span><span class="iifym-stat-val">${m.tdee} kcal</span></div>
      <div class="iifym-stat"><span class="iifym-stat-label">Target</span><span class="iifym-stat-val">${m.targetCalories} kcal</span></div>
    </div>
    <div class="iifym-macros">
      <div class="iifym-macro"><span class="iifym-macro-label">Protein</span><span class="iifym-macro-val">${m.proteinG} g</span></div>
      <div class="iifym-macro"><span class="iifym-macro-label">Fat</span><span class="iifym-macro-val">${m.fatG} g</span></div>
      <div class="iifym-macro"><span class="iifym-macro-label">Carbs</span><span class="iifym-macro-val">${m.carbG} g</span></div>
    </div>
    ${m.carbDeficitWarning ? `<p class="iifym-warning">// your protein + fat targets alone already exceed this calorie target. that math doesn't leave room for carbs - the deficit is too aggressive for this bodyweight. ease up on the cut or raise activity level.</p>` : ""}
  `;
  GAMA.say("success");
  GAMA.log(`Computed macros: ${m.targetCalories} kcal, ${m.proteinG}P/${m.fatG}F/${m.carbG}C`);
}
