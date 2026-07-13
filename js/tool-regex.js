/* REGEX_TESTER — live matching against the browser's native RegExp engine
   (no reimplementation to get subtly wrong). Uses matchAll() rather than a
   manual exec()-in-a-while-loop, which sidesteps the classic infinite-loop-
   on-a-zero-length-match footgun for free. */

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function testRegex(pattern, flagsRaw, testStr) {
  let flags = flagsRaw.replace(/[^gimsuy]/g, "");
  if (!flags.includes("g")) flags += "g"; // matchAll requires it
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { error: e.message };
  }
  const matches = [];
  try {
    for (const m of testStr.matchAll(re)) {
      matches.push({ match: m[0], index: m.index, groups: m.slice(1), named: m.groups || null });
    }
  } catch (e) {
    return { error: e.message };
  }
  return { matches };
}

function highlightMatches(testStr, matches) {
  if (!matches.length) return escapeHtml(testStr);
  let out = "";
  let last = 0;
  for (const m of matches) {
    out += escapeHtml(testStr.slice(last, m.index));
    out += `<mark>${escapeHtml(m.match) || "&nbsp;"}</mark>`;
    last = m.index + m.match.length;
  }
  out += escapeHtml(testStr.slice(last));
  return out;
}

function executeRegexTest() {
  const pattern = document.getElementById("regex-pattern").value;
  const flags = document.getElementById("regex-flags").value;
  const testStr = document.getElementById("regex-test-string").value;
  const out = document.getElementById("regex-result");
  const highlightEl = document.getElementById("regex-highlight");
  if (!pattern) {
    out.textContent = "";
    highlightEl.innerHTML = escapeHtml(testStr);
    GAMA.say("idle");
    return;
  }
  const result = testRegex(pattern, flags, testStr);
  if (result.error) {
    GAMA.say("error");
    out.textContent = `// invalid pattern: ${result.error}`;
    highlightEl.innerHTML = escapeHtml(testStr);
    GAMA.log(`Regex /${pattern}/ rejected: ${result.error}`);
    return;
  }
  highlightEl.innerHTML = highlightMatches(testStr, result.matches);
  if (!result.matches.length) {
    out.textContent = "// no matches";
  } else {
    out.innerHTML = result.matches.map((m, i) => {
      let line = `match ${i + 1}: "${m.match}" at index ${m.index}`;
      if (m.groups.length) line += ` | groups: ${JSON.stringify(m.groups)}`;
      if (m.named) line += ` | named: ${JSON.stringify(m.named)}`;
      return `<div>${escapeHtml(line)}</div>`;
    }).join("");
  }
  GAMA.say("success");
  GAMA.log(`Regex /${pattern}/${flags} — ${result.matches.length} match(es)`);
}
