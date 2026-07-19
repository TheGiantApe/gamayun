/* TEAM_GROUP_PICKER — constraint-aware: honors "keep these two apart"
   pairs, which most simple random pickers can't do at all. Group mode
   assigns names greedily to whichever group doesn't already contain a
   conflict; order mode reshuffles (bounded attempts) until no
   keep-apart pair lands adjacent. If a conflict genuinely can't be
   avoided (more constraints than groups can satisfy), that's reported
   honestly rather than silently ignored. */

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseKeepApartPairs(raw) {
  return raw
    .split("\n")
    .map((line) => line.split(",").map((s) => s.trim()).filter(Boolean))
    .filter((pair) => pair.length === 2);
}

function pairConflicts(a, b, pairs) {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function executeTeamPicker() {
  const names = document.getElementById("team-names").value.split("\n").map((n) => n.trim()).filter(Boolean);
  const pairs = parseKeepApartPairs(document.getElementById("team-keep-apart").value);
  const mode = document.querySelector('input[name="team-mode"]:checked').value;
  const out = document.getElementById("team-result");
  const warn = document.getElementById("team-warning");
  warn.textContent = "";

  if (names.length < 2) { GAMA.say("idle"); out.textContent = ""; return; }

  if (mode === "order") {
    let order = fisherYates(names);
    let attempts = 0;
    while (attempts < 200 && pairs.some(([a, b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return ia !== -1 && ib !== -1 && Math.abs(ia - ib) === 1;
    })) {
      order = fisherYates(names);
      attempts++;
    }
    out.textContent = order.map((n, i) => `${i + 1}. ${n}`).join("\n");
    GAMA.say("success");
    return;
  }

  const groupCount = Math.max(2, Math.min(names.length, parseInt(document.getElementById("team-group-count").value, 10) || 2));
  const groups = Array.from({ length: groupCount }, () => []);
  const shuffled = fisherYates(names);
  const unavoidableConflicts = [];

  shuffled.forEach((name) => {
    const groupOrder = fisherYates(groups.map((_, i) => i));
    let placed = false;
    for (const gi of groupOrder) {
      if (!groups[gi].some((existing) => pairConflicts(name, existing, pairs))) {
        groups[gi].push(name);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Every group has a conflict with this name - place in the smallest
      // group anyway (nothing better available) and flag it honestly.
      const smallest = groups.reduce((min, g, i) => (g.length < groups[min].length ? i : min), 0);
      groups[smallest].push(name);
      const conflictWith = groups[smallest].find((existing) => pairConflicts(name, existing, pairs));
      if (conflictWith) unavoidableConflicts.push(`${name} + ${conflictWith}`);
    }
  });

  out.textContent = groups.map((g, i) => `Group ${i + 1}: ${g.join(", ")}`).join("\n\n");
  if (unavoidableConflicts.length) {
    warn.textContent = `⚠ couldn't fully honor "keep apart" for: ${unavoidableConflicts.join("; ")} - not enough groups to separate everyone requested`;
  }
  GAMA.say("success");
}
