/* STANDARD_SIZES data - real, currently-accurate platform/format dimensions,
   not guessed. Format: [category, [[name, dims, note], ...]]. `dims` is
   what gets copied on click, so it's kept as a clean plain value
   ("1080 x 1080 px") rather than mixing units into the label. */
const SIZE_DATA = [
  ["Social Media - Images & Banners", [
    ["Instagram Square Post", "1080 x 1080 px", "1:1 ratio"],
    ["Instagram Portrait Post", "1080 x 1350 px", "4:5 ratio, max before Instagram crops it"],
    ["Instagram Story / Reel", "1080 x 1920 px", "9:16 ratio"],
    ["Instagram Profile Picture", "320 x 320 px", "displays as a circle, keep the subject centered"],
    ["Facebook Shared Image", "1200 x 630 px", "also the standard og:image size sitewide"],
    ["Facebook Cover Photo", "820 x 312 px", "displays smaller on mobile - keep key content centered"],
    ["Facebook Profile Picture", "170 x 170 px", "displays as a circle on most surfaces"],
    ["X (Twitter) In-Stream Image", "1600 x 900 px", "16:9 ratio"],
    ["X (Twitter) Header", "1500 x 500 px", ""],
    ["X (Twitter) Profile Picture", "400 x 400 px", "displays as a circle"],
    ["LinkedIn Cover Banner", "1584 x 396 px", "personal profile banner"],
    ["LinkedIn Company Page Cover", "1128 x 191 px", ""],
    ["Pinterest Pin", "1000 x 1500 px", "2:3 ratio, Pinterest's own recommended optimum"],
    ["TikTok Video", "1080 x 1920 px", "9:16 ratio, full-screen vertical"],
    ["YouTube Thumbnail", "1280 x 720 px", "16:9 ratio, min width 640px"],
    ["YouTube Channel Banner", "2560 x 1440 px", "safe area for all devices: 1546 x 423 centered"],
  ]],
  ["Print - Paper Sizes", [
    ["US Letter", "8.5 x 11 in", "216 x 279 mm"],
    ["US Legal", "8.5 x 14 in", "216 x 356 mm"],
    ["US Tabloid / Ledger", "11 x 17 in", "279 x 432 mm"],
    ["A3", "297 x 420 mm", "11.7 x 16.5 in"],
    ["A4", "210 x 297 mm", "8.27 x 11.7 in - the international Letter equivalent"],
    ["A5", "148 x 210 mm", "5.8 x 8.3 in"],
    ["A6", "105 x 148 mm", "4.1 x 5.8 in - postcard-ish"],
  ]],
  ["Screen & Video Resolutions", [
    ["HD (720p)", "1280 x 720 px", "16:9"],
    ["Full HD (1080p)", "1920 x 1080 px", "16:9 - most common desktop/video standard"],
    ["QHD (1440p)", "2560 x 1440 px", "16:9"],
    ["4K UHD", "3840 x 2160 px", "16:9 - note: DCI 4K (cinema) is 4096 x 2160, a different standard"],
    ["8K UHD", "7680 x 4320 px", "16:9"],
    ["Standard Webcam", "640 x 480 px", "4:3, the old VGA baseline"],
  ]],
  ["Icons & Favicons", [
    ["Favicon (small)", "16 x 16 px", "browser tab, minimum useful size"],
    ["Favicon (standard)", "32 x 32 px", "most common favicon size"],
    ["Favicon (large)", "48 x 48 px", "Windows site icons"],
    ["Apple Touch Icon", "180 x 180 px", "iOS home-screen icon"],
    ["Android Chrome Icon", "192 x 192 px", "manifest.json icon"],
    ["PWA / Maskable Icon", "512 x 512 px", "manifest.json, splash screens"],
  ]],
];
