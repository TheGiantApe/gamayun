/* CRON_GEN — parses a standard 5-field cron expression (minute hour
   day-of-month month day-of-week), describes it in plain English, and
   lists the next several actual run times by simulating forward minute by
   minute rather than trying to solve the schedule algebraically - simpler
   to get right, and cron schedules don't run often enough for brute force
   to matter. All times UTC, since "local time" is meaningless for a
   static site with no server clock to anchor it to. */

function parseCronField(fieldStr, min, max) {
  const values = new Set();
  for (const part of fieldStr.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr !== undefined ? Number(stepStr) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`bad step in "${part}"`);
    let start = min, end = max;
    if (range !== "*") {
      if (range.includes("-")) {
        const bounds = range.split("-").map(Number);
        if (bounds.some((n) => !Number.isInteger(n))) throw new Error(`bad range "${range}"`);
        [start, end] = bounds;
      } else {
        const n = Number(range);
        if (!Number.isInteger(n)) throw new Error(`bad value "${range}"`);
        start = end = n;
      }
    }
    if (start < min || end > max || start > end) throw new Error(`"${part}" out of bounds ${min}-${max}`);
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return values;
}

function parseCron(expr) {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return { error: "expected 5 fields: minute hour day-of-month month day-of-week" };
  const [minF, hourF, domF, monF, dowF] = fields;
  try {
    return {
      minute: parseCronField(minF, 0, 59),
      hour: parseCronField(hourF, 0, 23),
      dayOfMonth: parseCronField(domF, 1, 31),
      month: parseCronField(monF, 1, 12),
      dayOfWeek: parseCronField(dowF, 0, 6),
      raw: { minF, hourF, domF, monF, dowF },
    };
  } catch (e) {
    return { error: e.message };
  }
}

function cronMatches(date, cron) {
  if (!cron.minute.has(date.getUTCMinutes())) return false;
  if (!cron.hour.has(date.getUTCHours())) return false;
  if (!cron.month.has(date.getUTCMonth() + 1)) return false;
  const domWild = cron.raw.domF === "*", dowWild = cron.raw.dowF === "*";
  if (domWild && dowWild) return true;
  if (domWild) return cron.dayOfWeek.has(date.getUTCDay());
  if (dowWild) return cron.dayOfMonth.has(date.getUTCDate());
  // Standard cron semantics: when BOTH day-of-month and day-of-week are
  // restricted, a match is either one, not both (an OR, not an AND -
  // easy to get backwards).
  return cron.dayOfMonth.has(date.getUTCDate()) || cron.dayOfWeek.has(date.getUTCDay());
}

function nextCronRuns(cron, count, fromDate) {
  const runs = [];
  const d = new Date(fromDate.getTime());
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1);
  const limit = 4 * 365 * 24 * 60; // ~4 years of minutes - safety cap, not a real limit
  for (let steps = 0; runs.length < count && steps < limit; steps++) {
    if (cronMatches(d, cron)) runs.push(new Date(d.getTime()));
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return runs;
}

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function describeSet(set, kind) {
  const sorted = [...set].sort((a, b) => a - b);
  const name = (v) => (kind === "dow" ? DOW_NAMES[v] : kind === "month" ? MONTH_NAMES[v] : v);
  return sorted.map(name).join(", ");
}

function describeCron(cron) {
  const { minute, hour, dayOfMonth, month, dayOfWeek, raw } = cron;
  const domWild = raw.domF === "*", dowWild = raw.dowF === "*", monWild = raw.monF === "*";
  if (minute.size === 60 && hour.size === 24) return "Runs every minute.";
  if (minute.size === 1 && hour.size === 1) {
    const when = `at ${String([...hour][0]).padStart(2, "0")}:${String([...minute][0]).padStart(2, "0")} UTC`;
    if (domWild && dowWild && monWild) return `Runs every day ${when}.`;
    if (!dowWild && domWild && monWild) return `Runs every ${describeSet(dayOfWeek, "dow")} ${when}.`;
    if (!domWild && dowWild && monWild) return `Runs on day ${describeSet(dayOfMonth, "num")} of every month ${when}.`;
  }
  const parts = [];
  if (minute.size !== 60) parts.push(`minute ${describeSet(minute, "num")}`);
  if (hour.size !== 24) parts.push(`hour ${describeSet(hour, "num")}`);
  if (!domWild) parts.push(`day-of-month ${describeSet(dayOfMonth, "num")}`);
  if (!monWild) parts.push(`month ${describeSet(month, "month")}`);
  if (!dowWild) parts.push(`day-of-week ${describeSet(dayOfWeek, "dow")}`);
  return parts.length ? `Runs when ${parts.join(", and ")} match.` : "Runs every minute.";
}

function executeCronParse() {
  const expr = document.getElementById("cron-input").value;
  const out = document.getElementById("cron-result");
  if (!expr.trim()) { out.innerHTML = ""; GAMA.say("idle"); return; }
  const cron = parseCron(expr);
  if (cron.error) {
    GAMA.say("error");
    out.textContent = `// ${cron.error}`;
    GAMA.log(`Cron parse failed: ${cron.error}`);
    return;
  }
  const description = describeCron(cron);
  const runs = nextCronRuns(cron, 5, new Date());
  let html = `<div style="margin-bottom:1rem;">${description}</div>`;
  html += `<div style="color:var(--phosphor-dim); margin-bottom:0.3rem;">next 5 runs (UTC):</div>`;
  html += runs.map((d) => `<div>${d.toISOString().replace("T", " ").slice(0, 19)}</div>`).join("");
  out.innerHTML = html;
  GAMA.say("success");
  GAMA.log(`Cron "${expr}" parsed - ${description}`);
}
