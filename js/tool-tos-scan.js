/* TOS_SCAN — paste-your-own Terms of Service / contract text, get back
   a plain-English list of clause patterns worth a second look. This is
   NOT the same thing as ToS;DR (a curated database of specific named
   companies) - nothing in the Opticon research corpus offers a
   general-purpose "analyze whatever text you paste" tool, so this is
   an original concept, not a replication of something that already
   exists elsewhere. Rule-based keyword/phrase matching, not an LLM call
   - stays inside the site's zero-backend/zero-API-key architecture,
   and the tradeoff (heuristic, not deeply "smart") is stated plainly
   on the page rather than oversold. */

const TOS_SCAN_RULES = [
  { id: "data_sale", label: "Data sale/sharing", explain: "This text may allow selling or sharing your personal data with third parties, not just using it internally.", patterns: [/\bsell(s|ing)?\s+your\b/i, /\bshare\s+your\s+(information|data)\s+with\s+third\s*part/i, /\bthird-party\s+advertising\s+partners\b/i] },
  { id: "arbitration", label: "Forced arbitration / class-action waiver", explain: "You may be giving up the right to sue in court or join a class action - disputes get resolved through private arbitration instead.", patterns: [/\bbinding\s+arbitration\b/i, /\bwaive\b.{0,20}\bjury\s+trial\b/i, /\bclass\s*action\s+waiver\b/i, /\bindividual\s+basis\s+only\b/i] },
  { id: "auto_renew", label: "Auto-renewal", explain: "The subscription/agreement may renew automatically unless you actively cancel - check the cancellation window.", patterns: [/\bautomatically\s+renew/i, /\bauto-renew/i] },
  { id: "unilateral_changes", label: "Unilateral changes without notice", explain: "The other party may be able to change the terms at any time, sometimes without directly notifying you.", patterns: [/\bat\s+any\s+time\s+without\s+notice\b/i, /\breserve[s]?\s+the\s+right\s+to\s+(change|modify)\s+these\s+terms\b/i] },
  { id: "broad_license", label: "Broad license to your content", explain: "You may be granting a very wide-reaching license to anything you upload or post - check the scope (worldwide, perpetual, sublicensable).", patterns: [/\bperpetual,?\s+worldwide,?\s+royalty-free\s+license\b/i, /\birrevocable\s+license\b/i, /\bsublicensable\b/i] },
  { id: "liability_limit", label: "Broad liability limitation", explain: "Responsibility is disclaimed for a very wide range of harms - fairly standard boilerplate, but worth knowing the scope.", patterns: [/\bto\s+the\s+maximum\s+extent\s+permitted\s+by\s+law\b/i, /\bprovided\s+["']?as\s+is["']?\b/i, /\bwithout\s+warrant(y|ies)\s+of\s+any\s+kind\b/i] },
  { id: "indefinite_retention", label: "Indefinite / post-deletion data retention", explain: "Data may be kept even after account deletion, sometimes indefinitely.", patterns: [/\bretain\s+your\s+data\s+indefinitely\b/i, /\beven\s+after\s+(you\s+)?(delete|deletion\s+of)\s+your\s+account\b/i] },
  { id: "tracking", label: "Behavioral tracking / cross-site data combination", explain: "May combine data about you across services or use it for targeted/behavioral advertising.", patterns: [/\bbehavioral\s+advertising\b/i, /\bcombine\s+information\s+(we\s+collect\s+)?(about\s+you\s+)?(from|across)\b/i, /\bcross-device\s+tracking\b/i] },
];

function scanTosText(text) {
  const findings = [];
  for (const rule of TOS_SCAN_RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        findings.push({ id: rule.id, label: rule.label, explain: rule.explain, matchedText: match[0] });
        break;
      }
    }
  }
  return findings;
}

function executeTosScan() {
  const raw = document.getElementById("tos-input").value;
  const out = document.getElementById("tos-result");
  if (!raw) {
    out.innerHTML = "";
    GAMA.say("idle");
    return;
  }
  const findings = scanTosText(raw);
  if (findings.length === 0) {
    out.innerHTML = '<p style="color:var(--phosphor-dim-text);">// no flagged patterns found in this pass - that doesn\'t mean it\'s clean, just that nothing here matched the current rule set</p>';
    GAMA.say("success");
    return;
  }
  out.innerHTML = findings.map((f) =>
    `<div style="margin-bottom:0.75rem; padding-bottom:0.75rem; border-bottom:1px dashed var(--phosphor-dim);">
      <div style="color:var(--phosphor); font-weight:bold;">&#9888; ${f.label}</div>
      <div style="font-size:0.85rem; color:var(--phosphor-dim-text); margin:0.25rem 0;">${f.explain}</div>
      <div style="font-size:0.8rem; font-style:italic;">matched: "${f.matchedText}"</div>
    </div>`
  ).join("");
  GAMA.say("success");
}
