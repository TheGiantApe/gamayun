/* USER_AGENT_PARSER — pattern-matches the real UA string format rather
   than a magic library, since it's just token-order-dependent regex once
   you know the quirks (nearly every UA lies a little by including other
   browsers' tokens for compatibility - Chrome's UA contains "Safari",
   Edge's contains both "Chrome" and "Safari" - so order of checks matters
   more than the presence of any single token). */

function parseUserAgent(ua) {
  const flags = [];
  if (!ua.trim()) return { flags: ["empty string"] };

  let browser = "unknown";
  let version = "";
  if (/edg\//i.test(ua)) { browser = "Microsoft Edge"; version = ua.match(/edg\/([\d.]+)/i)?.[1] || ""; }
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) { browser = "Opera"; version = ua.match(/(?:opr|opera)\/([\d.]+)/i)?.[1] || ""; }
  else if (/firefox\//i.test(ua)) { browser = "Firefox"; version = ua.match(/firefox\/([\d.]+)/i)?.[1] || ""; }
  else if (/chrome\//i.test(ua)) { browser = "Chrome"; version = ua.match(/chrome\/([\d.]+)/i)?.[1] || ""; }
  else if (/safari\//i.test(ua) && /version\//i.test(ua)) { browser = "Safari"; version = ua.match(/version\/([\d.]+)/i)?.[1] || ""; }
  else if (/msie |trident\//i.test(ua)) { browser = "Internet Explorer"; version = ua.match(/(?:msie |rv:)([\d.]+)/i)?.[1] || ""; }
  else if (/bot|crawler|spider|curl|wget|python-requests|axios/i.test(ua)) {
    browser = "not a browser";
    flags.push("this looks like a bot/script/HTTP client, not a real browser");
  }

  let os = "unknown";
  if (/windows nt ([\d.]+)/i.test(ua)) os = `Windows (NT ${ua.match(/windows nt ([\d.]+)/i)[1]})`;
  else if (/mac os x ([\d_.]+)/i.test(ua)) os = `macOS ${ua.match(/mac os x ([\d_.]+)/i)[1].replace(/_/g, ".")}`;
  else if (/android ([\d.]+)/i.test(ua)) os = `Android ${ua.match(/android ([\d.]+)/i)[1]}`;
  else if (/iphone os ([\d_]+)/i.test(ua)) os = `iOS ${ua.match(/iphone os ([\d_]+)/i)[1].replace(/_/g, ".")}`;
  else if (/linux/i.test(ua)) os = "Linux";

  let deviceType = "desktop";
  if (/mobi/i.test(ua)) deviceType = "mobile";
  else if (/tablet|ipad/i.test(ua)) deviceType = "tablet";

  if (!/mozilla\/5\.0/i.test(ua) && browser !== "not a browser") {
    flags.push('missing the standard "Mozilla/5.0" prefix nearly every real browser UA carries for historical compatibility reasons');
  }
  if (browser === "unknown") flags.push("browser token not recognized - could be a real UA this parser doesn't cover yet, or a custom/spoofed string");

  return { browser, version, os, deviceType, flags };
}

function executeUaParse() {
  const raw = document.getElementById("ua-input").value;
  const out = document.getElementById("ua-result");
  if (!raw.trim()) { GAMA.say("idle"); out.textContent = ""; return; }
  const r = parseUserAgent(raw);
  const lines = [
    `Browser: ${r.browser}${r.version ? " " + r.version : ""}`,
    `OS: ${r.os || "unknown"}`,
    `Device type: ${r.deviceType || "unknown"}`,
  ];
  if (r.flags.length) lines.push("", ...r.flags.map((f) => `⚠ ${f}`));
  out.textContent = lines.join("\n");
  GAMA.say(r.flags.length ? "idle" : "success");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ua-input").value = navigator.userAgent;
  executeUaParse();
});
