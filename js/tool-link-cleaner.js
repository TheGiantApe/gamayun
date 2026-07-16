/* LINK_PURGE — strips tracking parameters client-side. Nothing leaves the browser. */

const TRACKING_PARAMS = [
  /^utm_/i, /^si$/i, /^fbclid$/i, /^gclid$/i, /^igshid$/i, /^mc_(eid|cid)$/i,
  /^ref$/i, /^ref_src$/i, /^ref_url$/i, /^spm$/i, /^_ga$/i, /^vero_/i,
  /^mkt_tok$/i, /^trk$/i, /^cvid$/i
];

// Params worth explicitly keeping even though they look tracker-ish.
const KEEP_ALWAYS = [/^v$/i, /^id$/i, /^p$/i, /^q$/i];

function purgeLink(raw) {
  let url;
  try {
    url = new URL(raw.trim());
  } catch (e) {
    return { ok: false, error: "not a valid URL" };
  }
  const removed = [];
  const params = url.searchParams;
  [...params.keys()].forEach((key) => {
    if (KEEP_ALWAYS.some((rx) => rx.test(key))) return;
    if (TRACKING_PARAMS.some((rx) => rx.test(key))) {
      removed.push(key);
      params.delete(key);
    }
  });
  return { ok: true, url: url.toString(), removed };
}

function executeLinkClean() {
  const input = document.getElementById("url-input");
  const out = document.getElementById("link-result");
  const raw = input.value;
  if (!raw.trim()) {
    GAMA.say("idle");
    return;
  }
  GAMA.say("working");
  setTimeout(() => {
    const result = purgeLink(raw);
    if (!result.ok) {
      GAMA.say("error");
      out.textContent = "// " + result.error;
      GAMA.log("Link purge failed - invalid structure");
      return;
    }
    GAMA.say("success");
    out.textContent = result.url;
    GAMA.log(
      result.removed.length
        ? `Purged ${result.removed.length} tracker(s): ${result.removed.join(", ")}`
        : "Link was already clean"
    );
  }, 250);
}
const executeLinkCleanDebounced = GAMA.debounce(executeLinkClean, 300);
