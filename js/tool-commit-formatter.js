/* COMMIT_MESSAGE_FORMATTER — assembles the real Conventional Commits
   structure (type(scope)!: summary, blank line, body, blank line,
   BREAKING CHANGE footer) from separate fields instead of one free-text
   box, so the punctuation/spacing is never the part someone gets wrong. */

function executeCommitFormat() {
  const type = document.getElementById("commit-type").value;
  const scope = document.getElementById("commit-scope").value.trim();
  const summary = document.getElementById("commit-summary").value.trim();
  const body = document.getElementById("commit-body").value.trim();
  const breaking = document.getElementById("commit-breaking").checked;
  const out = document.getElementById("commit-result");

  if (!summary) { GAMA.say("idle"); out.textContent = ""; return; }

  const scopePart = scope ? `(${scope})` : "";
  const breakingMark = breaking ? "!" : "";
  const header = `${type}${scopePart}${breakingMark}: ${summary}`;

  const parts = [header];
  if (body) parts.push(body);
  if (breaking) parts.push(`BREAKING CHANGE: ${body || "describe the breaking change here"}`);

  out.textContent = parts.join("\n\n");
  GAMA.say("success");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("commit-copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("commit-result").textContent);
    GAMA.log("Copied commit message");
    GAMA.say("success");
  });
});
