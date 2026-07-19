/* ROBOTS_TXT_VALIDATOR — rule-based parsing against the documented
   robots.txt spec (no formal grammar to validate against server-side,
   it's a plain-text convention every major crawler agrees on loosely).
   Each flag explains WHY a line is a problem, not just that it failed a
   pattern match. */

const ROBOTS_KNOWN_DIRECTIVES = ["user-agent", "disallow", "allow", "sitemap", "crawl-delay", "host"];

function validateRobotsTxt(text) {
  const lines = text.split("\n");
  const issues = [];
  let seenUserAgent = false;

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const lineNo = i + 1;
    if (!line || line.startsWith("#")) return;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      issues.push({ line: lineNo, text: `"${line}" has no colon - every directive needs the form "Name: value"` });
      return;
    }

    const directiveRaw = line.slice(0, colonIndex).trim();
    const directive = directiveRaw.toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (!ROBOTS_KNOWN_DIRECTIVES.includes(directive)) {
      issues.push({ line: lineNo, text: `"${directiveRaw}" isn't a recognized directive - check for a typo (the real spelling is one of: User-agent, Disallow, Allow, Sitemap, Crawl-delay, Host)` });
      return;
    }

    if (directive === "user-agent") {
      seenUserAgent = true;
      return;
    }

    if ((directive === "disallow" || directive === "allow") && !seenUserAgent) {
      issues.push({ line: lineNo, text: `"${directive}" appears before any "User-agent:" line - crawlers won't know which agent this rule applies to` });
    }
    if ((directive === "disallow" || directive === "allow") && value && !value.startsWith("/")) {
      issues.push({ line: lineNo, text: `"${value}" should start with "/" - it's a URL path relative to the site root, not a bare word` });
    }
    if (directive === "sitemap" && value && !/^https?:\/\//i.test(value)) {
      issues.push({ line: lineNo, text: `"${value}" should be a full absolute URL (https://...) - a relative path won't resolve correctly for crawlers reading this from a different context` });
    }
  });

  if (!seenUserAgent) issues.push({ line: 0, text: 'No "User-agent:" line found anywhere - every ruleset needs at least one to declare who it applies to (use "User-agent: *" for all crawlers)' });
  return issues;
}

function executeRobotsValidate() {
  const raw = document.getElementById("robots-input").value;
  const out = document.getElementById("robots-result");
  if (!raw.trim()) { GAMA.say("idle"); out.innerHTML = ""; return; }
  const issues = validateRobotsTxt(raw);
  if (!issues.length) {
    out.innerHTML = `<p style="color:var(--phosphor);">&gt; no issues found</p>`;
    GAMA.say("success");
    return;
  }
  out.innerHTML = issues
    .map((i) => `<div class="exif-gps-warning">${i.line ? `line ${i.line}: ` : ""}${i.text}</div>`)
    .join("");
  GAMA.say("idle");
}
