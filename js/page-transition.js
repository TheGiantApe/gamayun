/* PAGE_TRANSITION — intercepts internal navigation and, some of the time,
   plays a brief filtered/glitched video overlay ("system malfunction")
   before landing on the next page. Firing on every single click read as a
   predictable tic rather than a glitch, so it's gated to a random chance
   per navigation instead. Skips external links, new-tab links, anchors,
   and anything with a modifier key held (so ctrl/cmd-click to open in a
   new tab still works normally). Respects prefers-reduced-motion by
   skipping entirely. */

(function () {
  const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCE_MOTION) return;

  const TRANSITION_CHANCE = 0.35; // ~1 in 3 internal navigations
  const CLIPS = ["gama-transition.mp4", "gama-transition-2.mp4", "gama-transition-3.mp4", "gama-transition-4.mp4"];
  /* gama-transition-4.mp4 is already color-graded and scanlined at the
     source (hand-made, not raw footage - GAMA's drone eye playing a
     scanline-filtered Karate Champ (1984) sprite), so it skips the CSS
     filter chain below that the other three (unfiltered raw clips) rely
     on to get that look live. Stacking the live filter on top of an
     already-graded clip double-processes it (the hue-rotate especially
     fights its baked-in green). Only 3s long and video-only (no audio
     track) since the overlay is only ever visible for 550ms - trimmed
     from a 20s 1080p source instead of shipping the full file for a
     fraction of a second anyone actually sees. */
  const PREFILTERED_CLIPS = new Set(["gama-transition-4.mp4"]);

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "gama-transition-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: #000; display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; transition: opacity 0.15s linear;
    `;
    const video = document.createElement("video");
    const clip = CLIPS[Math.floor(Math.random() * CLIPS.length)];
    video.src = (document.body.dataset.root || "") + "assets/" + clip;
    video.muted = true;
    video.playsInline = true;
    const liveFilter = PREFILTERED_CLIPS.has(clip)
      ? ""
      : "filter: grayscale(0.6) brightness(0.9) contrast(1.3) sepia(0.3) hue-rotate(60deg) saturate(3);";
    video.style.cssText = `
      width: 100%; height: 100%; object-fit: cover;
      ${liveFilter}
      mix-blend-mode: screen;
    `;
    const scan = document.createElement("div");
    scan.style.cssText = `
      position: absolute; inset: 0;
      background: repeating-linear-gradient(rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,0.35) 3px, rgba(0,0,0,0) 4px);
      pointer-events: none;
    `;
    const label = document.createElement("div");
    label.textContent = "// SIGNAL INTERRUPTION - REROUTING //";
    label.style.cssText = `
      position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%);
      color: #00FF66; font-family: 'VT323', monospace; font-size: 1.5rem;
      text-shadow: 0 0 6px #00FF66; letter-spacing: 0.1em;
    `;
    overlay.appendChild(video);
    overlay.appendChild(scan);
    overlay.appendChild(label);
    document.body.appendChild(overlay);
    return { overlay, video };
  }

  function isInternalNavLink(link) {
    if (!link || !link.href) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    let url;
    try { url = new URL(link.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false; // in-page anchor
    if (!url.pathname.endsWith(".html") && url.pathname !== "/") return false;
    return true;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let modifier-clicks behave normally
    const link = e.target.closest("a");
    if (!isInternalNavLink(link)) return;
    if (Math.random() >= TRANSITION_CHANCE) return; // let navigation proceed normally

    e.preventDefault();
    const dest = link.href;
    const { overlay, video } = buildOverlay();
    requestAnimationFrame(() => { overlay.style.opacity = "1"; });
    video.play().catch(() => {}); // autoplay can be blocked; navigation proceeds regardless
    setTimeout(() => { window.location.href = dest; }, 550);
  });
})();
