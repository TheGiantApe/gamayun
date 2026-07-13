/* TEXT_DIFF — line-based diff via classic LCS dynamic programming.
   O(n*m) time/space, fine for the pasted-text sizes this tool is for;
   not meant for whole-file diffing of huge documents. */

function diffLines(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "equal", text: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) { out.push({ type: "remove", text: a[i] }); i++; }
  while (j < m) { out.push({ type: "add", text: b[j] }); j++; }
  return out;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderDiff(rows) {
  return rows.map((r) => {
    const prefix = r.type === "add" ? "+" : r.type === "remove" ? "-" : " ";
    const color = r.type === "add" ? "var(--phosphor)" : r.type === "remove" ? "var(--amber)" : "var(--phosphor-dim-text)";
    return `<div style="color:${color};white-space:pre-wrap;">${prefix} ${escapeHtml(r.text)}</div>`;
  }).join("");
}

function executeTextDiff() {
  const a = document.getElementById("diff-input-a").value.split("\n");
  const b = document.getElementById("diff-input-b").value.split("\n");
  const out = document.getElementById("diff-result");
  const stats = document.getElementById("diff-stats");
  const rows = diffLines(a, b);
  out.innerHTML = renderDiff(rows);
  const added = rows.filter((r) => r.type === "add").length;
  const removed = rows.filter((r) => r.type === "remove").length;
  stats.textContent = `+${added} / -${removed} lines`;
  GAMA.say(added || removed ? "success" : "idle");
  GAMA.log(`Diffed: +${added} / -${removed} lines`);
}
