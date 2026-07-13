/* BLUESKY_FEED — fetches and renders the public author feed via Bluesky's
   AT Protocol public API. Verified live before building this: public read
   endpoints send access-control-allow-origin: * and need zero auth/token,
   so this stays true to the site's client-side-only rule - no proxy, no
   server, nothing GAMAYUN controls sees the request. Post-rendering logic
   is built against the documented AT Protocol feed-item schema, not a
   live example - the account has no posts yet as of writing, so the
   empty-feed and error paths are the only ones actually exercised against
   the real API; the render path itself is schema-verified, not
   example-verified. Worth a real look once there's an actual post to
   render. */

const BSKY_HANDLE = "project-gamayun.bsky.social";
const BSKY_FEED_API = "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed";

function escapeFeedHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatFeedDate(iso) {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function renderBlueskyPost(item) {
  const post = item.post || {};
  const text = post.record && post.record.text ? post.record.text : "";
  const createdAt = post.record && post.record.createdAt ? post.record.createdAt : null;
  const author = post.author || {};
  const rkey = (post.uri || "").split("/").pop();
  const permalink = author.handle && rkey ? `https://bsky.app/profile/${author.handle}/post/${rkey}` : `https://bsky.app/profile/${BSKY_HANDLE}`;

  let embedHtml = "";
  if (post.embed && Array.isArray(post.embed.images)) {
    embedHtml = post.embed.images.map((img) =>
      `<img src="${escapeFeedHtml(img.thumb || "")}" alt="${escapeFeedHtml(img.alt || "")}" style="max-width:100%; margin-top:0.5rem; border:1px solid var(--phosphor-dim);">`
    ).join("");
  }

  return `
    <div class="bluesky-post">
      <p class="bluesky-post-text">${escapeFeedHtml(text)}</p>
      ${embedHtml}
      <div class="bluesky-post-meta">
        ${createdAt ? `<span>${formatFeedDate(createdAt)}</span>` : ""}
        <span>&#128257; ${post.repostCount || 0}</span>
        <span>&#9829; ${post.likeCount || 0}</span>
        <a href="${permalink}" target="_blank" rel="noopener">&gt; view on bluesky</a>
      </div>
    </div>`;
}

async function loadBlueskyFeed() {
  const container = document.getElementById("bluesky-feed-container");
  if (!container) return;
  try {
    const res = await fetch(`${BSKY_FEED_API}?actor=${encodeURIComponent(BSKY_HANDLE)}&limit=20`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    const feed = Array.isArray(data.feed) ? data.feed : [];
    if (!feed.length) {
      container.innerHTML = '<p style="color:var(--phosphor-dim-text);">&gt; no transmissions logged yet. check back once something\'s actually been posted.</p>';
      return;
    }
    container.innerHTML = feed.map(renderBlueskyPost).join("");
    GAMA.log(`Bluesky feed loaded: ${feed.length} post(s)`);
  } catch (e) {
    container.innerHTML = `<p style="color:var(--amber);">&gt; uplink failed: ${escapeFeedHtml(e.message)}. Bluesky's API might be down or rate-limited — try the <a href="https://bsky.app/profile/${BSKY_HANDLE}" target="_blank" rel="noopener">profile directly</a>.</p>`;
    GAMA.say("error");
    GAMA.log(`Bluesky feed fetch failed: ${e.message}`);
  }
}

document.addEventListener("DOMContentLoaded", loadBlueskyFeed);
