#!/usr/bin/env python3
"""
GAMAYUN site builder. Zero external dependencies (stdlib only).
Assembles _src/templates/base.html + _src/content/*.html fragments
into the final static site. Output is plain HTML/CSS/JS - nothing
about the shipped site depends on this script running again.

To add a new page: drop a fragment in _src/content/, add one entry
to PAGES below, run this script.
"""
import datetime
import json
import os
import re

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SRC)

# Canonical URL / OG / sitemap / robots.txt base domain for this build.
# Single source of truth so the shipped host can be swapped without hunting
# down every literal. Defaults to the live apex, since this repo + GitHub
# Pages is still what serves gamayun.site until the Phase 5 cutover to
# Hostinger (see brain/decisions/gamayun-hosting-architecture-decision.md) -
# an ordinary `python3 _src/build.py` here must not silently ship the wrong
# canonical/OG/sitemap domain to the live site. Override for one-off deploys
# to a different subdomain (e.g. the tools.gamayun.site deploy 2026-08-06)
# with: GAMAYUN_SITE_URL=https://tools.gamayun.site python3 _src/build.py
SITE_URL = os.environ.get("GAMAYUN_SITE_URL", "https://gamayun.site")

with open(os.path.join(SRC, "templates", "base.html"), encoding="utf-8") as f:
    BASE = f.read()

# Category display order + bracketed nav-section labels. A page's
# "category" field must be one of these keys, or None for pages that
# don't appear in the sidebar nav / tool grid (legal, contact, sitemap,
# changelog, gndn, 404) but still get a breadcrumb via breadcrumb_cat.
CATEGORIES = [
    ("RECON_OPS", "RECON_OPS"),
    ("TEXT_OPS", "TEXT_OPS"),
    ("NUMBER_CRUNCH", "NUMBER_CRUNCH"),
    ("PAINT_LOCKER", "PAINT LOCKER"),
    ("LOOKUP_DECK", "LOOKUP_DECK"),
    ("FILE_SALVAGE", "FILE_SALVAGE"),
    ("DEV_VAULT", "DEV_VAULT"),
    ("GAMES_CURIOS", "GAMES_CURIOS"),
    ("FIELD_MANUALS", "FIELD_MANUALS"),
    ("EXTERNAL_LINKS", "EXT_LINKS"),
    ("OSINT_DECK", "OSINT_DECK"),
    ("STUDY_HALL", "STUDY_HALL"),
]

# Wiki topic display order + labels, same shape/role as CATEGORIES but for
# wiki_entries() instead of tool pages - a page's "wiki_topic" field must be
# one of these keys (or None, which buckets it under UNSORTED so a missing
# field is loud, not silently dropped - see wiki_entries_by_topic()).
# Deliberately plain-English and terse, not the CATEGORIES ops-code style -
# these are essay titles a first-time visitor scans, not a tool shorthand.
WIKI_TOPICS = [
    ("TIME", "Time & Calendars"),
    ("ETYMOLOGY", "Etymology"),
    ("NUMBERS", "Numbers"),
    ("SCIENCE", "Science Quirks"),
    ("BODY", "The Body"),
    ("SPACE", "Space"),
    ("HISTORY", "History"),
    ("NATURE", "Nature & Geography"),
    ("FOOD", "Food & Objects"),
    ("OLD_TECH", "Obsolete Tech"),
    ("CODES", "Codes & Secrets"),
    ("PRIVACY", "Privacy & OSINT"),
    ("UNSORTED", "Unsorted"),
]

# Top-level tab bar (site sections), separate from CATEGORIES above (which
# are TOOLS-only sub-groups shown in the sidebar). Each tuple is
# (section key, tab label, link target). A target starting with "http" is
# an absolute cross-property link and is emitted as-is; anything else is
# relative to site root and gets `root` prefixed. An ARTICLES tab is
# deliberately not here yet (explicitly deferred, "near future stuff" per
# Vin) - adding one later is just one more tuple plus a page, the tab bar
# itself doesn't need to change.
#
# SHOP and RADIO live on their own subdomains (WooCommerce and a static
# page respectively), not in this static build, so they're absolute. They
# sit before LOG per Vin 2026-08-13: until this, the homepage had zero
# links to either one, which made the shop unreachable from the front
# door. RADIO currently resolves to an "under construction" stub - that's
# a real page, not a 404, but it is an empty room and Vin knows it.
SECTIONS = [
    ("tools", "TOOLS", "index.html"),
    ("wiki", "WIKI", "pages/wiki-index.html"),
    ("shop", "SHOP", "https://shop.gamayun.site/"),
    ("radio", "RADIO", "https://radio.gamayun.site/"),
    ("log", "LOG", "pages/log.html"),
    ("about", "ABOUT", "pages/about.html"),
    ("contact", "CONTACT", "pages/contact.html"),
    ("legal", "LEGAL", "pages/legal.html"),
]

# Pages whose section can't be derived from their category (the tab-bar
# landing pages themselves, plus anything with no category at all). Every
# other page's section is inferred from whether its category is a TOOLS
# category - see page_section() below. The header brand/logo is the
# "home" link (see base.html) - there's no separate HOME tab, same as
# most real navbars just make the logo itself the home link.
SECTION_OVERRIDES = {
    "index.html": "tools",
    "pages/wiki-index.html": "wiki",
    "pages/log.html": "log",
    "pages/about.html": "about",
    "pages/contact.html": "contact",
    "pages/legal.html": "legal",
}


def page_section(page):
    if page["out"] in SECTION_OVERRIDES:
        return SECTION_OVERRIDES[page["out"]]
    if page.get("wiki_entry"):
        return "wiki"
    if page.get("category") in {key for key, _ in CATEGORIES}:
        return "tools"
    return None


def wiki_entries():
    """All individual wiki pages, in PAGES order - single source of truth
    for both the hub page's card list and the WIKI sidebar list."""
    return [p for p in PAGES if p.get("wiki_entry")]


def wiki_entries_by_topic():
    """wiki_entries() grouped into WIKI_TOPICS order, each group in PAGES
    order. A page with no wiki_topic (or one not in WIKI_TOPICS) lands in
    UNSORTED rather than being dropped - shared by the hub page and the
    sidebar nav so the two can never drift out of sync with each other."""
    valid_keys = {key for key, _ in WIKI_TOPICS}
    groups = {key: [] for key, _ in WIKI_TOPICS}
    for p in wiki_entries():
        key = p.get("wiki_topic")
        groups[key if key in valid_keys else "UNSORTED"].append(p)
    return [(key, label, groups[key]) for key, label in WIKI_TOPICS if groups[key]]

# Each page: out (output path), fragment (content file), title, desc,
# root (path prefix back to site root), code (short nav/breadcrumb label,
# None = not in nav), category (key into CATEGORIES, or None),
# breadcrumb_cat (override label for breadcrumb only, e.g. utility pages
# that aren't in the visible nav but still get a breadcrumb trail), js.
PAGES = [
    dict(out="index.html", fragment="home.html", title="Orbital Salvage Archive",
         desc="Free client-side web tools. Your input never leaves your browser. No accounts, nothing for sale.",
         root="", code="DECK_LAUNCHER", category=None,
         js=["data-boot-scripts.js", "boot-sequence.js"]),

    dict(out="pages/links.html", fragment="links.html", title="Link Purge",
         desc="Strip tracking parameters from any URL, entirely client-side.",
         root="../", code="LINK_PURGE", category="RECON_OPS",
         js=["tool-link-cleaner.js"]),
    dict(out="pages/time-logic.html", fragment="time-logic.html", title="Date Stamp Recon",
         desc="Convert human timestamps to ISO 8601, Unix epoch, filename-safe stamps.",
         root="../", code="DATE_STAMP_RECON", category="RECON_OPS",
         js=["tool-date-stamp.js"]),
    dict(out="pages/qr-code.html", fragment="qr-code.html", title="QR Generator",
         desc="Encode any text or URL as a QR code, versions 1-40 with selectable error correction.",
         root="../", code="QR_GEN", category="RECON_OPS",
         js=["tool-qr-code.js"]),
    dict(out="pages/tos-scan.html", fragment="tos-scan.html", title="ToS Red-Flag Scanner",
         desc="Paste any Terms of Service or contract text, flag common problematic clause patterns with plain-English explanations.",
         root="../", code="TOS_SCAN", category="RECON_OPS",
         js=["tool-tos-scan.js"]),

    dict(out="pages/text-case.html", fragment="text-case.html", title="Case Converter",
         desc="Convert text to upper/lower/title/sentence/camel/snake/kebab case.",
         root="../", code="CASE_CONVERTER", category="TEXT_OPS",
         js=["tool-text-case.js"]),
    dict(out="pages/letter-counter.html", fragment="letter-counter.html", title="Letter & Word Counter",
         desc="Character, word, sentence, and line counts, reading time, and Flesch-Kincaid readability score.",
         root="../", code="LETTER_COUNTER", category="TEXT_OPS",
         js=["tool-letter-counter.js"]),
    dict(out="pages/cool-text.html", fragment="cool-text.html", title="Cool Text Generator",
         desc="Convert text into Unicode bold, italic, script, double-struck, and other fancy variants.",
         root="../", code="COOL_TEXT", category="TEXT_OPS",
         js=["tool-cool-text.js"]),
    dict(out="pages/ascii-art.html", fragment="ascii-art.html", title="ASCII Banner Generator",
         desc="Render text as a FIGlet-style ASCII banner, 6 font choices.",
         root="../", code="ASCII_BANNER", category="TEXT_OPS",
         js=["data-figlet-smslant.js", "data-figlet-standard.js", "data-figlet-slant.js",
             "data-figlet-small.js", "data-figlet-big.js", "data-figlet-shadow.js",
             "tool-ascii-art.js"]),
    dict(out="pages/base64.html", fragment="base64.html", title="Base64 Codec",
         desc="Encode or decode Base64, UTF-8 safe including emoji.",
         root="../", code="BASE64_CODEC", category="TEXT_OPS",
         js=["tool-base64.js"]),
    dict(out="pages/url-encode.html", fragment="url-encode.html", title="URL Codec",
         desc="Percent-encode or decode a URL component.",
         root="../", code="URL_CODEC", category="TEXT_OPS",
         js=["tool-url-encode.js"]),
    dict(out="pages/html-entities.html", fragment="html-entities.html", title="HTML Entity Codec",
         desc="Escape text to HTML entities, or decode entities back to text.",
         root="../", code="HTML_CODEC", category="TEXT_OPS",
         js=["tool-html-entities.js"]),
    dict(out="pages/text-diff.html", fragment="text-diff.html", title="Text Diff",
         desc="Line-by-line comparison between two blocks of text.",
         root="../", code="TEXT_DIFF", category="TEXT_OPS",
         js=["tool-text-diff.js"]),
    dict(out="pages/pig-latin.html", fragment="pig-latin.html", title="Pig Latin Translator",
         desc="Translate English to Pig Latin and back.",
         root="../", code="PIG_LATIN", category="TEXT_OPS",
         js=["tool-pig-latin.js"]),
    dict(out="pages/nato-phonetic.html", fragment="nato-phonetic.html", title="NATO Phonetic Alphabet",
         desc="Text to ICAO/NATO spelling alphabet and back.",
         root="../", code="NATO_PHONETIC", category="TEXT_OPS",
         js=["tool-nato-phonetic.js"]),
    dict(out="pages/morse-code.html", fragment="morse-code.html", title="Morse Code Converter",
         desc="Text to Morse and back, direction auto-detected, with real tone playback at an adjustable WPM speed.",
         root="../", code="MORSE_CODE", category="TEXT_OPS", js=["tool-morse-code.js"]),
    dict(out="pages/text-reverser.html", fragment="text-reverser.html", title="Text Reverser",
         desc="Reverse characters, reverse word order, or both, as separate options.",
         root="../", code="TEXT_REVERSER", category="TEXT_OPS", js=["tool-text-utils.js"]),
    dict(out="pages/leetspeak.html", fragment="leetspeak.html", title="Leetspeak Converter",
         desc="Text to 1337sp34k with a light/medium/heavy intensity slider.",
         root="../", code="LEETSPEAK", category="TEXT_OPS", js=["tool-leetspeak.js"]),
    dict(out="pages/upside-down-text.html", fragment="upside-down-text.html", title="Upside-Down Text",
         desc="Flip text using real Unicode lookalike characters, with unflippable characters flagged rather than mangled.",
         root="../", code="UPSIDE_DOWN_TEXT", category="TEXT_OPS", js=["tool-upside-down-text.js"]),
    dict(out="pages/social-char-count.html", fragment="social-char-count.html", title="Social Char Count",
         desc="Check text against every major platform's character limit at once instead of picking one first.",
         root="../", code="SOCIAL_CHAR_COUNT", category="TEXT_OPS", js=["tool-social-char-count.js"]),
    dict(out="pages/dialect-deck.html", fragment="dialect-deck.html", title="Dialect Deck",
         desc="Rewrite text in a Shakespearean, Pirate, Corporate, or Ye Olde English voice - word/phrase substitution, fully offline.",
         root="../", code="DIALECT_DECK", category="TEXT_OPS",
         js=["tool-dialect-deck.js"]),
    dict(out="pages/palindrome-check.html", fragment="palindrome-check.html", title="Palindrome Checker",
         desc="Is this word or phrase a palindrome, ignoring case/spacing/punctuation - plus how many character changes a near-miss would need.",
         root="../", code="PALINDROME_CHECK", category="TEXT_OPS", js=["tool-text-utils.js"]),
    dict(out="pages/slug-generator.html", fragment="slug-generator.html", title="Slug Generator",
         desc="Text to a URL-safe slug, with accented/non-Latin letters transliterated instead of dropped.",
         root="../", code="SLUG_GENERATOR", category="TEXT_OPS", js=["tool-text-utils.js"]),

    dict(out="pages/calc-iifym.html", fragment="calc-iifym.html", title="Macro Calculator",
         desc="Daily calorie target and protein/fat/carb macro split from your stats, activity, and goal.",
         root="../", code="MACRO_CALC",
         category="NUMBER_CRUNCH", js=["tool-iifym.js"]),
    dict(out="pages/calc-percentage.html", fragment="calc-percentage.html", title="Percentage Calculator",
         desc="What percent is X of Y.", root="../", code="PERCENT_CALC",
         category="NUMBER_CRUNCH", js=["tool-calculators.js"]),
    dict(out="pages/calc-tip.html", fragment="calc-tip.html", title="Tip Calculator",
         desc="Tip amount and per-person split.", root="../", code="TIP_CALC",
         category="NUMBER_CRUNCH", js=["tool-calculators.js"]),
    dict(out="pages/calc-age.html", fragment="calc-age.html", title="Age Calculator",
         desc="Exact age in years, months, and days from a birthdate.", root="../", code="AGE_CALC",
         category="NUMBER_CRUNCH", js=["tool-calculators.js"]),
    dict(out="pages/roman-numeral.html", fragment="roman-numeral.html", title="Roman Numeral Converter",
         desc="Convert between Arabic numbers and Roman numerals, both directions, with malformed input explained.",
         root="../", code="ROMAN_NUMERAL", category="NUMBER_CRUNCH", js=["tool-roman-numeral.js"]),
    dict(out="pages/aspect-ratio.html", fragment="aspect-ratio.html", title="Aspect Ratio Calculator",
         desc="Fill in any two of width, height, and ratio - the third solves itself. Common video/image presets included.",
         root="../", code="ASPECT_RATIO", category="NUMBER_CRUNCH", js=["tool-aspect-ratio.js"]),
    dict(out="pages/calc-discount.html", fragment="calc-discount.html", title="Discount Calculator",
         desc="Stacked percentage discounts aren't additive - shows the real step-by-step math instead of just the final price.",
         root="../", code="DISCOUNT_CALC", category="NUMBER_CRUNCH", js=["tool-calculators.js"]),
    dict(out="pages/unit-price.html", fragment="unit-price.html", title="Unit Price Comparator",
         desc="Compare price-per-unit across any number of differently-sized packages to find the actual best deal.",
         root="../", code="UNIT_PRICE", category="NUMBER_CRUNCH", js=["tool-unit-price.js"]),
    dict(out="pages/calc-date-diff.html", fragment="calc-date-diff.html", title="Date Difference Calculator",
         desc="Days, weeks, and years/months/days between two dates, all shown at once.",
         root="../", code="DATE_DIFF", category="NUMBER_CRUNCH", js=["tool-calculators.js"]),
    dict(out="pages/unit-converter.html", fragment="unit-converter.html", title="Unit Converter",
         desc="Length, weight, volume, and temperature, one interface with category tabs instead of separate pages per unit type.",
         root="../", code="UNIT_CONVERTER", category="NUMBER_CRUNCH", js=["tool-unit-converter.js"]),
    dict(out="pages/shoe-size.html", fragment="shoe-size.html", title="Shoe Size Converter",
         desc="US/UK/EU/CM shoe sizing, men's/women's/kids' kept as separate tables instead of one confusing blended column.",
         root="../", code="SHOE_SIZE", category="NUMBER_CRUNCH", js=["tool-shoe-size.js"]),
    dict(out="pages/work-hours.html", fragment="work-hours.html", title="Work Hours Calculator",
         desc="Clock-in/out pairs across a week with a per-day unpaid break deduction, totaled into a clean weekly summary.",
         root="../", code="WORK_HOURS", category="NUMBER_CRUNCH", js=["tool-work-hours.js"]),
    dict(out="pages/color.html", fragment="color.html", title="Color Converter",
         desc="Hex, RGB integer, RGB float, and HSL, all at once.",
         root="../", code="COLOR_CONVERTER", category="PAINT_LOCKER",
         js=["tool-color.js"]),
    dict(out="pages/palette.html", fragment="palette.html", title="Palette Forge",
         desc="Generate a 5-color palette, lock the ones worth keeping, export as hex or CSS variables.",
         root="../", code="PALETTE_FORGE", category="PAINT_LOCKER",
         js=["tool-palette.js"]),
    dict(out="pages/wallpaper-forge.html", fragment="wallpaper-forge.html", title="Wallpaper Forge",
         desc="Free GAMA-themed desktop and phone wallpapers, generated in your browser at the resolution you need. No stock site, no account.",
         root="../", code="WALLPAPER_FORGE", category="PAINT_LOCKER",
         js=["tool-wallpaper-forge.js"]),
    dict(out="pages/contrast-check.html", fragment="contrast-check.html", title="Contrast Checker",
         desc="WCAG 2.x contrast ratio for any foreground/background pair, checked against AA/AAA at normal and large text sizes, with a nearest-passing-color suggestion when it fails.",
         root="../", code="CONTRAST_CHECK", category="PAINT_LOCKER",
         js=["tool-contrast-check.js"]),
    dict(out="pages/paper-size.html", fragment="paper-size.html", title="Paper Size Reference",
         desc="A-series and North American paper sizes in mm and inches, plus real print-DPI and margin guidance.",
         root="../", code="PAPER_SIZE", category="PAINT_LOCKER", js=[]),
    dict(out="pages/color-name.html", fragment="color-name.html", title="Color Name Identifier",
         desc="Nearest named-color matches (CSS Color Module keywords) with the actual distance shown, top 3 instead of one guess.",
         root="../", code="COLOR_NAME", category="PAINT_LOCKER", js=["tool-color-name.js"]),
    dict(out="pages/box-shadow-gen.html", fragment="box-shadow-gen.html", title="Box-Shadow Generator",
         desc="Stack more than one shadow layer with live preview and copyable CSS - most generators only ever give you a single layer.",
         root="../", code="BOX_SHADOW", category="PAINT_LOCKER", js=["tool-box-shadow-gen.js"]),
    dict(out="pages/border-radius-gen.html", fragment="border-radius-gen.html", title="Border-Radius Previewer",
         desc="Independent per-corner radius values with live preview and copyable CSS, not one uniform slider.",
         root="../", code="BORDER_RADIUS", category="PAINT_LOCKER", js=["tool-border-radius-gen.js"]),
    dict(out="pages/clamp-calc.html", fragment="clamp-calc.html", title="Clamp() Calculator",
         desc="Real fluid-typography clamp() value from min/max font size and viewport width, with a live scaling preview.",
         root="../", code="CLAMP_CALC", category="PAINT_LOCKER", js=["tool-clamp-calc.js"]),
    dict(out="pages/easing-visualizer.html", fragment="easing-visualizer.html", title="Easing Visualizer",
         desc="Adjust cubic-bezier control points and watch the curve plus a real moving-element preview, with a named-preset library.",
         root="../", code="EASING_VIZ", category="PAINT_LOCKER", js=["tool-easing-visualizer.js"]),
    dict(out="pages/gradient-gen.html", fragment="gradient-gen.html", title="Gradient Generator",
         desc="Arbitrary color stops, linear or radial, with live preview and copy-ready CSS in one panel.",
         root="../", code="GRADIENT_GEN", category="PAINT_LOCKER", js=["tool-gradient-gen.js"]),
    dict(out="pages/font-pairing.html", fragment="font-pairing.html", title="Font Pairing Previewer",
         desc="Hand-curated web-safe heading/body font pairings with editable live sample text, no Google Fonts CDN call.",
         root="../", code="FONT_PAIRING", category="PAINT_LOCKER", js=["tool-font-pairing.js"]),
    dict(out="pages/blob-gen.html", fragment="blob-gen.html", title="SVG Blob Generator",
         desc="Random organic blob shapes smoothed with real Catmull-Rom-to-Bezier curve math, downloadable as SVG.",
         root="../", code="BLOB_GEN", category="PAINT_LOCKER", js=["tool-blob-gen.js"]),
    dict(out="pages/placeholder-image.html", fragment="placeholder-image.html", title="Placeholder Image Generator",
         desc="Mockup placeholder images defaulted to this site's own CRT phosphor styling instead of a generic gray box.",
         root="../", code="PLACEHOLDER_IMG", category="PAINT_LOCKER", js=["tool-placeholder-image.js"]),
    dict(out="pages/svg-pattern-gen.html", fragment="svg-pattern-gen.html", title="SVG Pattern Generator",
         desc="Seamless tiling backgrounds, previewed actually tiled (not a single isolated tile) so the real repeat is visible.",
         root="../", code="SVG_PATTERN", category="PAINT_LOCKER", js=["tool-svg-pattern-gen.js"]),

    dict(out="pages/symbol-index.html", fragment="symbol-index.html", title="Symbol Index",
         desc="349 searchable Unicode symbols with names and codepoints, click to copy.",
         root="../", code="SYMBOL_INDEX", category="LOOKUP_DECK",
         js=["data-symbols.js", "tool-symbol-index.js"]),
    dict(out="pages/emoji-index.html", fragment="emoji-index.html", title="Emoji Index",
         desc="816 searchable emoji by name, click to copy.",
         root="../", code="EMOJI_INDEX", category="LOOKUP_DECK",
         js=["data-emoji.js", "tool-emoji-index.js"]),
    dict(out="pages/acronym-index.html", fragment="acronym-index.html", title="Acronym Index",
         desc="Chat shorthand, dev jargon, and fact-checked fictional acronyms, searchable.",
         root="../", code="ACRONYM_INDEX", category="LOOKUP_DECK",
         js=["data-acronyms.js", "tool-acronym-index.js"]),
    dict(out="pages/slang-dictionary.html", fragment="slang-dictionary.html", title="Slang Dictionary",
         desc="50 modern slang terms with plain-English definitions and rough era tags, searchable by term or meaning.",
         root="../", code="SLANG_DICTIONARY", category="LOOKUP_DECK",
         js=["tool-slang-dictionary.js"]),
    dict(out="pages/standard-sizes.html", fragment="standard-sizes.html", title="Standard Sizes Reference",
         desc="Social media banner/post dimensions, print paper sizes, screen resolutions, and icon/favicon sizes, searchable, click to copy.",
         root="../", code="STANDARD_SIZES", category="LOOKUP_DECK",
         js=["data-sizes.js", "tool-standard-sizes.js"]),

    dict(out="pages/image-tools.html", fragment="image-tools.html", title="Image Salvage",
         desc="Read EXIF metadata (including GPS location) before it leaks, then strip it, resize, and convert format.",
         root="../", code="IMAGE_SALVAGE", category="FILE_SALVAGE", js=["tool-image-tools.js"]),
    dict(out="pages/steganography.html", fragment="steganography.html", title="Steganography",
         desc="Hide a text message inside an image via LSB encoding, or extract one that's already hidden.",
         root="../", code="STEGANOGRAPHY", category="FILE_SALVAGE", js=["tool-steganography.js"]),
    dict(out="pages/ela-check.html", fragment="ela-check.html", title="Error Level Analysis",
         desc="Re-compress an image and diff it against the original to surface possibly-edited regions.",
         root="../", code="ELA_CHECK", category="FILE_SALVAGE", js=["tool-ela-check.js"]),
    dict(out="pages/image-to-base64.html", fragment="image-to-base64.html", title="Image to Base64",
         desc="Upload an image, get a base64 data-URI string for embedding in CSS/HTML, with an honest size warning.",
         root="../", code="IMAGE_TO_BASE64", category="FILE_SALVAGE", js=["tool-image-to-base64.js"]),
    dict(out="pages/favicon-generator.html", fragment="favicon-generator.html", title="Favicon Generator",
         desc="Upload one image, crop it, and get every favicon size a real site needs - 16/32/48/180/192/512, PNG only, plus a ready-to-paste <head> and site.webmanifest snippet.",
         root="../", code="FAVICON_FORGE", category="FILE_SALVAGE", js=["tool-favicon-generator.js"]),

    dict(out="pages/json-format.html", fragment="json-format.html", title="JSON Formatter",
         desc="Beautify or minify JSON with real error messages.",
         root="../", code="JSON_FORMATTER", category="DEV_VAULT",
         js=["tool-json.js"]),
    dict(out="pages/xml-format.html", fragment="xml-format.html", title="XML Formatter",
         desc="Beautify or minify XML with a real browser parse error (line/column) instead of a bare 'invalid XML'.",
         root="../", code="XML_FORMATTER", category="DEV_VAULT", js=["tool-xml-format.js"]),
    dict(out="pages/fake-data-gen.html", fragment="fake-data-gen.html", title="Fake Data Generator",
         desc="Realistic-but-fake test rows (name/email/phone/address) for forms or databases, export to CSV or JSON in one click.",
         root="../", code="FAKE_DATA_GEN", category="DEV_VAULT", js=["tool-fake-data-gen.js"]),
    dict(out="pages/css-js-minifier.html", fragment="css-js-minifier.html", title="CSS/JS Minifier",
         desc="String/comment-aware minify or beautify for CSS or JS, with a byte-size-saved readout.",
         root="../", code="CSS_JS_MINIFIER", category="DEV_VAULT", js=["tool-css-js-minifier.js"]),
    dict(out="pages/uuid.html", fragment="uuid.html", title="UUID Generator",
         desc="Cryptographically random v4 UUIDs.",
         root="../", code="UUID_GEN", category="DEV_VAULT",
         js=["tool-uuid.js"]),
    dict(out="pages/hash.html", fragment="hash.html", title="Hash Generator",
         desc="SHA-1/256/384/512 via the browser's native crypto API.",
         root="../", code="HASH_GEN", category="DEV_VAULT",
         js=["tool-hash.js"]),
    dict(out="pages/password-gen.html", fragment="password-gen.html", title="Password Generator",
         desc="Cryptographically random passwords with configurable length and character sets.",
         root="../", code="PASSWORD_GEN", category="DEV_VAULT",
         js=["tool-password-gen.js"]),
    dict(out="pages/regex-tester.html", fragment="regex-tester.html", title="Regex Tester",
         desc="Live regex matching with highlighted matches, capture groups, and named groups.",
         root="../", code="REGEX_TESTER", category="DEV_VAULT",
         js=["tool-regex.js"]),
    dict(out="pages/jwt-decoder.html", fragment="jwt-decoder.html", title="JWT Decoder",
         desc="Decode a JSON Web Token's header and payload, with expiration flagged.",
         root="../", code="JWT_DECODER", category="DEV_VAULT",
         js=["tool-jwt.js"]),
    dict(out="pages/cron-generator.html", fragment="cron-generator.html", title="Cron Expression Parser",
         desc="Plain-English description and next 5 run times for any 5-field cron expression.",
         root="../", code="CRON_GEN", category="DEV_VAULT",
         js=["tool-cron.js"]),
    dict(out="pages/recipe-chain.html", fragment="recipe-chain.html", title="Recipe Chain",
         desc="Chain base64, URL, HTML entity, hex, ROT13, XOR, and SHA-256 operations in sequence, with every intermediate value shown live.",
         root="../", code="RECIPE_CHAIN", category="DEV_VAULT",
         js=["tool-recipe-chain.js"]),
    dict(out="pages/code-snap.html", fragment="code-snap.html", title="Code Snap",
         desc="Render a code snippet to a shareable, styled PNG with basic syntax highlighting.",
         root="../", code="CODE_SNAP", category="DEV_VAULT",
         js=["tool-code-snap.js"]),
    dict(out="pages/dead-drop.html", fragment="dead-drop.html", title="Dead Drop",
         desc="Encrypt a message client-side and pack it into a shareable link - nothing is sent to or stored on any server, not even temporarily.",
         root="../", code="DEAD_DROP", category="DEV_VAULT",
         js=["tool-dead-drop.js"]),
    dict(out="pages/base-converter.html", fragment="base-converter.html", title="Base Converter",
         desc="Convert live between binary, octal, decimal, and hexadecimal, with a place-value breakdown.",
         root="../", code="BASE_CONVERTER", category="DEV_VAULT",
         js=["tool-base-converter.js"]),
    dict(out="pages/http-status.html", fragment="http-status.html", title="HTTP Status Code Reference",
         desc="Searchable HTTP status codes with the common real-world cause, not just the dry official definition.",
         root="../", code="HTTP_STATUS", category="DEV_VAULT", js=["tool-http-status.js"]),
    dict(out="pages/user-agent-parser.html", fragment="user-agent-parser.html", title="User-Agent Parser",
         desc="Decode a browser/OS/device from any User-Agent string, with unusual or spoofed-looking strings flagged.",
         root="../", code="UA_PARSER", category="DEV_VAULT", js=["tool-user-agent-parser.js"]),
    dict(out="pages/lorem-ipsum.html", fragment="lorem-ipsum.html", title="Lorem Ipsum Generator",
         desc="Classic Latin placeholder text, or GAMA's own salvage-flavored word bank as a genuine second option.",
         root="../", code="LOREM_IPSUM", category="DEV_VAULT", js=["tool-lorem-ipsum.js"]),
    dict(out="pages/json-csv.html", fragment="json-csv.html", title="JSON ↔ CSV Converter",
         desc="Nested JSON flattens to dot-notation CSV columns instead of choking; CSV parsing is quote/comma-aware.",
         root="../", code="JSON_CSV", category="DEV_VAULT", js=["tool-json-csv.js"]),
    dict(out="pages/meta-preview.html", fragment="meta-preview.html", title="Meta Tag Preview",
         desc="Preview how a link card renders on X/Twitter and Facebook, and get the Open Graph + Twitter Card meta tags to match.",
         root="../", code="META_PREVIEW", category="DEV_VAULT", js=["tool-meta-preview.js"]),
    dict(out="pages/robots-validator.html", fragment="robots-validator.html", title="Robots.txt Validator",
         desc="Flags common robots.txt mistakes with a plain-English explanation of why each one is a problem.",
         root="../", code="ROBOTS_VALIDATOR", category="DEV_VAULT", js=["tool-robots-validator.js"]),
    dict(out="pages/commit-formatter.html", fragment="commit-formatter.html", title="Commit Message Formatter",
         desc="Assembles a properly formatted Conventional Commits message from separate fields, with an inline type cheat-sheet.",
         root="../", code="COMMIT_FORMATTER", category="DEV_VAULT", js=["tool-commit-formatter.js"]),

    dict(out="pages/cipher-deck.html", fragment="cipher-deck.html", title="Cipher Deck",
         desc="Caesar shift (with brute-force), Vigenere, and Morse code (with audible playback).",
         root="../", code="CIPHER_DECK", category="GAMES_CURIOS",
         js=["tool-cipher-deck.js"]),
    dict(out="pages/letter-rack-solver.html", fragment="letter-rack-solver.html", title="Letter Rack Solver",
         desc="Find every valid word from a letter rack, including blank tiles, sorted by point value. Independent tool, not affiliated with or endorsed by any board game publisher.",
         root="../", code="LETTER_RACK_SOLVER", category="GAMES_CURIOS",
         js=["data-words.js", "tool-letter-rack-solver.js"]),
    dict(out="pages/anagram-solver.html", fragment="anagram-solver.html", title="Anagram Solver",
         desc="Exact anagrams and sub-word matches from any set of letters, 52,000-word dictionary.",
         root="../", code="ANAGRAM_SOLVER", category="GAMES_CURIOS",
         js=["data-words.js", "tool-anagram.js"]),
    dict(out="pages/clue-solver.html", fragment="clue-solver.html", title="Clue Solver",
         desc="Real constraint-propagation deduction tracker for Clue/Cluedo - mark what you know, the solver proves the rest and flags contradictions. Independent tool, not affiliated with or endorsed by Hasbro.",
         root="../", code="CLUE_SOLVER", category="GAMES_CURIOS",
         js=["tool-clue-solver.js"]),
    dict(out="pages/wu-name.html", fragment="wu-name.html", title="Name Generator",
         desc="Classic first-letter-indexed name generator - deterministic, not random.",
         root="../", code="WU_NAME", category="GAMES_CURIOS",
         js=["tool-wu-name.js"]),
    dict(out="pages/name-forge.html", fragment="name-forge.html", title="Name Forge",
         desc="Nine themed name generators in one tool - metal band, pirate, fantasy/RPG character, superhero, supervillain, D&D backstory seed, drag persona, cocktail, pirate ship & crew.",
         root="../", code="NAME_FORGE", category="GAMES_CURIOS",
         js=["tool-name-forge.js"]),
    dict(out="pages/number-spell.html", fragment="number-spell.html", title="What Does My Number Spell",
         desc="Decode any phone number against a 52,000-word dictionary via classic T9 mapping.",
         root="../", code="NUM_SPELL", category="GAMES_CURIOS",
         js=["data-words.js", "tool-number-spell.js"]),
    dict(out="pages/iching.html", fragment="iching.html", title="I Ching",
         desc="Three-coin hexagram casting, all 64 King Wen hexagrams, real cryptographic randomness.",
         root="../", code="I_CHING", category="GAMES_CURIOS",
         js=["data-iching.js", "tool-iching.js"]),
    dict(out="pages/moon-phase.html", fragment="moon-phase.html", title="Moon Phase",
         desc="Phase, illumination %, and days to full/new moon for any date.",
         root="../", code="MOON_PHASE", category="GAMES_CURIOS",
         js=["tool-moon-phase.js"]),
    dict(out="pages/runes.html", fragment="runes.html", title="Rune Generator",
         desc="Transliterate text into Elder Futhark, the 24-rune Germanic alphabet.",
         root="../", code="RUNES", category="GAMES_CURIOS",
         js=["tool-runes.js"]),
    dict(out="pages/divine-oracle.html", fragment="divine-oracle.html", title="Divine Oracle",
         desc="Ask a yes/no question, get a cryptographically random answer from an original 21-response pool.",
         root="../", code="DIVINE_ORACLE", category="GAMES_CURIOS",
         js=["tool-divine-oracle.js"]),
    dict(out="pages/fate-draw.html", fragment="fate-draw.html", title="Fate Draw",
         desc="Six novelty draws in one tool - tarot, fortune cookie, lucky numbers, sign from the universe, personal motto & crest, fictional deity name.",
         root="../", code="FATE_DRAW", category="GAMES_CURIOS",
         js=["tool-fate-draw.js"]),
    dict(out="pages/cosmic-calculator.html", fragment="cosmic-calculator.html", title="Cosmic Calculator",
         desc="Western zodiac, Chinese zodiac, numerology life path, and a compatibility read - accurate traditional calculations, framed honestly as folklore.",
         root="../", code="COSMIC_CALCULATOR", category="GAMES_CURIOS",
         js=["tool-cosmic-calculator.js"]),
    dict(out="pages/pick-one.html", fragment="pick-one.html", title="Pick One",
         desc="Coin, dice, spinner, or a raffle draw with a proof log - every 'just choose for me' tool on this site in one place.",
         root="../", code="PICK_ONE", category="GAMES_CURIOS",
         js=["tool-coin-flip.js", "tool-dice-roller.js", "tool-decision-wheel.js", "tool-raffle-picker.js", "tool-pick-one.js"]),
    dict(out="pages/stopwatch.html", fragment="stopwatch.html", title="Stopwatch",
         desc="performance.now()-backed stopwatch with lap splitting and a CSV export of the lap list.",
         root="../", code="STOPWATCH", category="GAMES_CURIOS", js=["tool-stopwatch.js"]),
    dict(out="pages/username-gen.html", fragment="username-gen.html", title="Username Generator",
         desc="Pronounceable username combinations from your own keywords, instead of a word glued to random noise.",
         root="../", code="USERNAME_GEN", category="GAMES_CURIOS", js=["tool-username-gen.js"]),
    dict(out="pages/word-scrambler.html", fragment="word-scrambler.html", title="Word Scrambler",
         desc="Batch-scramble a whole word list at once, with an option to keep the first/last letter in place.",
         root="../", code="WORD_SCRAMBLER", category="GAMES_CURIOS", js=["tool-word-scrambler.js"]),
    dict(out="pages/crossword-helper.html", fragment="crossword-helper.html", title="Crossword Clue Helper",
         desc="Standard crossword blank notation (c_t or c?t) matched directly against the word list, no reformatting.",
         root="../", code="CROSSWORD_HELPER", category="GAMES_CURIOS", js=["data-words.js", "tool-crossword-helper.js"]),
    dict(out="pages/rhyme-finder.html", fragment="rhyme-finder.html", title="Rhyme Finder",
         desc="Spelling-suffix matches from the site's word list - an honest heuristic, not a real phonetic rhyme dataset.",
         root="../", code="RHYME_FINDER", category="GAMES_CURIOS", js=["data-words.js", "tool-rhyme-finder.js"]),
    dict(out="pages/hangman.html", fragment="hangman.html", title="Hangman",
         desc="Classic hangman with ASCII gallows art, word length filterable for difficulty, pulled from the site's own word list.",
         root="../", code="HANGMAN", category="GAMES_CURIOS", js=["data-words.js", "tool-hangman.js"]),
    dict(out="pages/tic-tac-toe.html", fragment="tic-tac-toe.html", title="Tic-Tac-Toe",
         desc="Three real difficulty tiers, the top one backed by true minimax - genuinely unbeatable, not just harder.",
         root="../", code="TIC_TAC_TOE", category="GAMES_CURIOS", js=["tool-tic-tac-toe.js"]),
    dict(out="pages/word-search-gen.html", fragment="word-search-gen.html", title="Word Search Generator",
         desc="Real 8-direction grid placement, words genuinely allowed to cross and share letters, printable output.",
         root="../", code="WORD_SEARCH", category="GAMES_CURIOS", js=["data-words.js", "tool-word-search-gen.js"]),
    dict(out="pages/sudoku.html", fragment="sudoku.html", title="Sudoku",
         desc="Generate a puzzle guaranteed to have exactly one solution, or paste/type any Sudoku and solve it - real backtracking, not a lookup.",
         root="../", code="SUDOKU", category="GAMES_CURIOS", js=["tool-sudoku.js"]),
    dict(out="pages/team-picker.html", fragment="team-picker.html", title="Team/Group Picker",
         desc="Random groups or shuffle order, with an optional 'keep these two apart' constraint most simple pickers can't honor.",
         root="../", code="TEAM_PICKER", category="GAMES_CURIOS", js=["tool-team-picker.js"]),
    dict(out="pages/trivia-quiz.html", fragment="trivia-quiz.html", title="Trivia Quiz",
         desc="5-question rounds across 4 categories with a local streak/best-score tracker, no repeats within a round.",
         root="../", code="TRIVIA_QUIZ", category="GAMES_CURIOS", js=["tool-trivia-quiz.js"]),
    dict(out="pages/checklist.html", fragment="checklist.html", title="Checklist",
         desc="A quick to-do list that saves itself locally - no account, no sync, no notifications.",
         root="../", code="CHECKLIST", category="GAMES_CURIOS", js=["tool-checklist.js"]),
    dict(out="pages/focus-write.html", fragment="focus-write.html", title="Focus Write",
         desc="A blank page and nothing else - local-storage autosave, live word count, optional typewriter scroll.",
         root="../", code="FOCUS_WRITE", category="GAMES_CURIOS", js=["tool-focus-write.js"]),
    dict(out="pages/habit-tracker.html", fragment="habit-tracker.html", title="Habit Tracker",
         desc="Track a few habits on a simple 21-day grid, entirely local - no account, no push notifications.",
         root="../", code="HABIT_TRACKER", category="GAMES_CURIOS", js=["tool-habit-tracker.js"]),
    dict(out="pages/password-breach.html", fragment="password-breach.html", title="Password Breach",
         desc="Terminal-style password-cracking puzzle - click a candidate word, get told how many letters are in the right position, narrow it down before you're locked out.",
         root="../", code="ACCESS_BREACH", category="GAMES_CURIOS", js=["data-words.js", "tool-password-breach.js"]),

    # Field Manuals: GAMA+-voice step-by-step guides. Content lives in
    # INSTRUCTABLES below; all 5 pages share one fragment shell
    # (howto-template.html) since the only thing that differs per page is
    # the {{HOWTO_CONTENT}} block built at build() time.
    dict(out="pages/howto-verify-source.html", fragment="howto-template.html",
         title="Verify a Source Before You Share It",
         desc="Reverse-image search, account age, dead-link sourcing, and why a screenshot alone proves nothing.",
         root="../", code="HOWTO_VERIFY_SOURCE", category="FIELD_MANUALS", js=[]),
    dict(out="pages/howto-strip-metadata.html", fragment="howto-template.html",
         title="Strip Metadata Before You Post a Photo",
         desc="Your camera embeds more into that file than you think it does.",
         root="../", code="HOWTO_STRIP_METADATA", category="FIELD_MANUALS", js=[]),
    dict(out="pages/howto-check-breach.html", fragment="howto-template.html",
         title="Check If You've Been Breached (And What to Actually Do About It)",
         desc="Checking takes thirty seconds. The part that actually helps comes after.",
         root="../", code="HOWTO_CHECK_BREACH", category="FIELD_MANUALS", js=[]),
    dict(out="pages/howto-archive-page.html", fragment="howto-template.html",
         title="Archive a Page Before It Disappears",
         desc="If it matters enough to link to, it matters enough to save.",
         root="../", code="HOWTO_ARCHIVE_PAGE", category="FIELD_MANUALS", js=[]),
    dict(out="pages/howto-anon-signup.html", fragment="howto-template.html",
         title="Sign Up for Something Without Handing Over Your Real Info",
         desc="Not everything that asks for your email and phone number needs your actual email and phone number.",
         root="../", code="HOWTO_ANON_SIGNUP", category="FIELD_MANUALS", js=[]),

    # External Links: curated outbound directories, split by topic to match
    # the existing sidebar categories they're each closest to. Content
    # lives in EXTERNAL_LINKS below; all 5 pages share links-template.html.
    dict(out="pages/links-dev-tools.html", fragment="links-template.html",
         title="Dev Vault // External Links",
         desc="Regex101, crontab.guru, DevDocs, and other outside tools worth knowing about.",
         root="../", code="LINKS_DEV_TOOLS", category="EXTERNAL_LINKS", js=[]),
    dict(out="pages/links-privacy-utility.html", fragment="links-template.html",
         title="Recon Ops // External Links",
         desc="Breach checkers, disposable inboxes, ToS raters, and other privacy-and-utility sites.",
         root="../", code="LINKS_PRIVACY_UTILITY", category="EXTERNAL_LINKS", js=[]),
    dict(out="pages/links-research-education.html", fragment="links-template.html",
         title="Ship's Log // External Links",
         desc="Archive.org, Project Gutenberg, and other research/education sites worth bookmarking.",
         root="../", code="LINKS_RESEARCH_EDU", category="EXTERNAL_LINKS", js=[]),
    dict(out="pages/links-design-media.html", fragment="links-template.html",
         title="File Salvage // External Links",
         desc="Photopea, Squoosh, and other design/media tools that live outside GAMAYUN.",
         root="../", code="LINKS_DESIGN_MEDIA", category="EXTERNAL_LINKS", js=[]),
    dict(out="pages/links-fun-curios.html", fragment="links-template.html",
         title="Games & Curios // External Links",
         desc="Radio Garden, FutureMe, and other odd, mostly-pointless-in-a-good-way sites.",
         root="../", code="LINKS_FUN_CURIOS", category="EXTERNAL_LINKS", js=[]),

    dict(out="pages/osint-directory.html", fragment="osint-directory.html",
         title="OSINT Directory",
         desc="External OSINT/security tools, grouped by skill level, with caution notes carried over verbatim from GAMAYUN's own vetting pass.",
         root="../", code="OSINT_DIRECTORY", category="OSINT_DECK", js=[]),

    dict(out="pages/free-courses.html", fragment="free-courses.html",
         title="Free Courses",
         desc="Real free education, with the free-to-learn-but-paid-certificate cases called out honestly instead of blurred together.",
         root="../", code="FREE_COURSES", category="STUDY_HALL", js=[]),

    dict(out="pages/about.html", fragment="about.html", title="About",
         desc="GAMA⁺, in her own words. Not exactly a straight answer.",
         root="../", code="ABOUT", category=None, js=[]),
    dict(out="pages/wiki-index.html", fragment="wiki-index.html", title="GAMA+ Wiki",
         desc="Etymology, science, history, codes, and privacy/OSINT: real citations, filed as they get salvaged.",
         root="../", code="GAMA_WIKI", category=None, breadcrumb_cat="WIKI", js=[]),

    # Individual wiki entries - each its own page (not h2 sections on one
    # ever-growing mega-page). wiki_entry=True marks them for
    # page_section() and the WIKI sidebar list; wiki-index.html is the hub
    # that links to all of them, built by build_wiki_index_html().
    dict(out="pages/wiki-time.html", fragment="wiki-time.html", title="On Time, and Why It's Hard",
         desc="The Unix epoch, the Year 2038 problem, timezones, leap seconds, and why cron starts the week on Sunday.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="TIME", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-calendars.html", fragment="wiki-calendars.html", title="Calendars Are Political",
         desc="Ten lost days in 1582, Sweden's February 30th, the thirteenth zodiac sign that never left, and why Kodak ran on its own 13-month year.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="TIME", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-foobar.html", fragment="wiki-foobar.html", title="Where \"Foo\" and \"Bar\" Came From",
         desc="The FUBAR-to-hacker-culture etymology the Jargon File itself settles on.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="ETYMOLOGY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-uuid-odds.html", fragment="wiki-uuid-odds.html", title="The Odds a UUID Ever Repeats",
         desc="122 random bits, 2.71 quintillion UUIDs before a 50% collision chance - why they're functionally unique.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="NUMBERS", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-fingerprinting.html", fragment="wiki-fingerprinting.html", title="Browser Fingerprinting",
         desc="How sites track you with zero cookies, and why clearing cookies doesn't touch it.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-osint.html", fragment="wiki-osint.html", title="OSINT (Open Source Intelligence)",
         desc="The real difference between checking if you were exposed and trafficking in stolen data.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-reverse-image.html", fragment="wiki-reverse-image.html", title="Reverse Image Search & Metadata",
         desc="EXIF data, and how reverse image search actually debunks \"this old photo is new\" claims.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-tos.html", fragment="wiki-tos.html", title="Terms of Service (and Why Nobody Reads Them)",
         desc="Why ToS;DR exists, and what actually matters before you sign up for something.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-link-rot.html", fragment="wiki-link-rot.html", title="Digital Preservation & Link Rot",
         desc="Why the average webpage doesn't survive long, and what the Wayback Machine actually does about it.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-google-dorking.html", fragment="wiki-google-dorking.html", title="Google Dorking",
         desc="Advanced search operators that surface technically-public content nobody meant to be found.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-paywall.html", fragment="wiki-paywall.html", title="Why There's No Paywall-Bypass Tool Here",
         desc="A deliberate line, not an oversight.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="PRIVACY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-steganography.html", fragment="wiki-steganography.html", title="Steganography",
         desc="Hiding that a message exists at all, from a tattooed scalp to least-significant-bit encoding.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="CODES", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-ok.html", fragment="wiki-ok.html", title="OK: The Word Everyone Uses and Nobody Can Agree On",
         desc="A 1839 newspaper joke, a presidential campaign, and why every other origin story for the world's most-used word doesn't hold up.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="ETYMOLOGY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-dord.html", fragment="wiki-dord.html", title="Dord: The Word the Dictionary Invented by Accident",
         desc="A misread index card put a word that never existed into a real dictionary for thirteen years, plus the deliberate fake word Oxford still keeps.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="ETYMOLOGY", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-glass-myth.html", fragment="wiki-glass-myth.html", title="The Myth of Flowing Glass",
         desc="Why old cathedral windows are really thicker at the bottom, and it has nothing to do with glass secretly being a liquid.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="SCIENCE", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-mpemba.html", fragment="wiki-mpemba.html", title="The Mpemba Effect: When Hot Water Freezes First",
         desc="The still-unsolved physics behind why hot water sometimes beats cold water to the freezer, and the teenager who wouldn't drop it.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="SCIENCE", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-voynich.html", fragment="wiki-voynich.html", title="The Voynich Manuscript Nobody Can Read",
         desc="240 pages of undeciphered script and impossible plants, dated to the 1400s, that every codebreaker who's tried has failed to crack.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="CODES", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/wiki-kryptos.html", fragment="wiki-kryptos.html", title="Kryptos: The Puzzle the CIA Still Hasn't Confirmed",
         desc="A CIA-headquarters sculpture that stumped cryptanalysts for 30 years, and the 2025 twist that still hasn't been officially confirmed.",
         root="../", code=None, category=None, wiki_entry=True, wiki_topic="CODES", breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/log.html", fragment="log.html", title="Log",
         desc="GAMA⁺'s own transmissions, mixed with what actually shipped - newest first.",
         root="../", code="LOG_FEED", category=None, breadcrumb_cat="LOG",
         js=["data-log-entries.js", "tool-log-feed.js"]),

    # Utility/meta pages: footer-only, not in the sidebar nav or tool grid,
    # but still get a breadcrumb via breadcrumb_cat.
    dict(out="pages/legal.html", fragment="legal.html", title="Legal & Privacy",
         desc="Privacy policy, terms of use, advertising disclosure.",
         root="../", code="LEGAL", category=None, js=[]),
    dict(out="pages/privacy.html", fragment="privacy.html", title="Privacy Policy",
         desc="How gamayun.site collects, uses, and discloses information, including Google AdSense and Analytics disclosures.",
         root="../", code="PRIVACY", category=None, breadcrumb_cat="SYSTEM", js=[]),
    dict(out="pages/terms.html", fragment="terms.html", title="Terms of Service",
         desc="Terms governing use of gamayun.site.",
         root="../", code="TERMS", category=None, breadcrumb_cat="SYSTEM", js=[]),
    dict(out="pages/contact.html", fragment="contact.html", title="Contact",
         desc="Get in touch.", root="../", code="CONTACT", category=None,
         js=[]),
    dict(out="pages/sitemap.html", fragment="sitemap.html", title="Sitemap",
         desc="Full index of every page on this ship.", root="../", code="SITEMAP",
         category=None, breadcrumb_cat="SYSTEM", js=[]),
    dict(out="pages/changelog.html", fragment="changelog.html", title="Maintenance Log",
         desc="GAMA⁺'s patch history - what got added or changed, and when.",
         root="../", code="MAINTENANCE_LOG", category=None, breadcrumb_cat="SYSTEM", js=[]),

    # Special pages: no breadcrumb (keeps the easter egg an easter egg /
    # a 404 doesn't need to explain where it is).
    dict(out="pages/gndn.html", fragment="gndn.html", title="GNDN",
         desc="Goes nowhere, does nothing. Yet.", root="../", code=None,
         category=None, js=[]),
    dict(out="pages/scrapbook.html", fragment="scrapbook.html", title="GAMA+'s Scrapbook",
         desc="Five easter eggs found. A reward, not an ad for one.", root="../", code=None,
         category=None, js=[]),
    dict(out="pages/404.html", fragment="404.html", title="Signal Lost",
         desc="Page not found.", root="../", code=None, category=None, js=[]),
]


def bookmark_noun(page, section):
    """What the QUICK ACCESS box calls the thing you're about to bookmark.

    "Bookmark this tool" on a tool page, "this article" in the wiki, "this
    site" on the homepage. Generic "page" is the fallback rather than the
    default - it's the least useful word of the four, so it should only
    show up where nothing more specific is true."""
    if page["out"] == "index.html":
        return "site"
    if page.get("wiki_entry"):
        return "article"
    if section == "tools" and page.get("category"):
        return "tool"
    return "page"


def build_tabs_html(current_section, root):
    """Top-level tab bar - real links to each section's landing page (not
    client-side show/hide), so every page keeps its own crawlable URL.
    The active tab is whichever section the current page belongs to."""
    lines = []
    for key, label, target in SECTIONS:
        active = " active" if key == current_section else ""
        href = target if target.startswith("http") else f"{root}{target}"
        lines.append(f'                    <a href="{href}" class="tab-btn{active}" data-tab="{key}">{label}</a>')
    return "\n".join(lines)


def build_nav_html(current_out, root, current_section):
    """Grouped sidebar nav: every category with a page in it, in CATEGORIES
    order. Each category is a native <details> disclosure - collapsed by
    default, no custom JS needed - except the one containing the current
    page, which opens automatically so navigating never buries you. `root`
    is interpolated directly (not left as a {{ROOT}} token) since this HTML
    is spliced in after the base template's own {{ROOT}} substitution pass
    already ran.

    No standalone home/DECK_LAUNCHER link here anymore - the header
    logo is the home link now (see base.html), same as most real navbars.
    Categories are TOOLS-only sub-groups, so outside the tools section
    this renders nothing at all, except on Wiki pages specifically, where
    it's the same WIKI_TOPICS-grouped <details> disclosure pattern as the
    tools branch just below (titles, not short codes - wiki entries don't
    have one), so you can jump between entries without going back to the
    hub every time, and scanning by subject stays workable as the entry
    count grows past a flat list's reach.

    Returns the whole <nav class="terminal-nav"> wrapper (or an empty
    string) rather than just its contents - on sections with nothing to
    show (About/Log/Contact/Legal) this means no bordered box renders at
    all, instead of an empty shell that looked like a rendering bug."""
    lines = []
    if current_section == "wiki":
        for topic_key, topic_label, entries in wiki_entries_by_topic():
            has_active = any(p["out"] == current_out for p in entries)
            open_attr = " open" if has_active else ""
            lines.append(f'                <details class="nav-section"{open_attr}>')
            lines.append(f'                    <summary class="nav-section-label">{topic_label}</summary>')
            for p in entries:
                active = " active" if p["out"] == current_out else ""
                lines.append(f'                    <a href="{root}{p["out"]}" class="nav-link{active}">&gt;&nbsp;<span class="nav-link-label">{p["title"]}</span></a>')
            lines.append(f'                </details>')
    elif current_section == "tools":
        for cat_key, cat_label in CATEGORIES:
            pages_in_cat = [p for p in PAGES if p.get("category") == cat_key]
            if not pages_in_cat:
                continue
            has_active = any(p["out"] == current_out for p in pages_in_cat)
            open_attr = " open" if has_active else ""
            lines.append(f'                <details class="nav-section"{open_attr}>')
            lines.append(f'                    <summary class="nav-section-label">{cat_label}</summary>')
            for p in pages_in_cat:
                active = " active" if p["out"] == current_out else ""
                lines.append(f'                    <a href="{root}{p["out"]}" class="nav-link{active}">{nav_link_label(p["code"])}</a>')
            lines.append(f'                </details>')
    if not lines:
        return ""
    return '            <nav class="terminal-nav">\n' + "\n".join(lines) + '\n            </nav>'


def nav_link_label(code):
    """'&gt;' glued to the label via a non-breaking space. The label itself
    gets a <wbr> after every underscore so long codes (RESTAURANT_PICKER,
    LETTER_RACK_SOLVER) wrap at those seams - underscore-joined text has no
    ordinary break point of its own, and CSS overflow-wrap:anywhere (the
    old fix) broke wherever it needed to, including mid-word, which reads
    as a rendering bug rather than a wrap. Explicit <wbr>s give the
    browser a real break point at every underscore so it never has to
    fall back to breaking a token in half."""
    wrapped = code.replace("_", "_<wbr>")
    return f'&gt;&nbsp;<span class="nav-link-label">{wrapped}</span>'


def build_jsonld_html(page, instructable=None):
    """schema.org/WebApplication block for real tool pages (anything with
    a category - the actual utilities, not wiki/log/about/legal pages).
    Per GAMA BIBLE section G: wins "People Also Ask" / rich-result boxes
    without writing blogspam. validate.py's scan_jsonld_required_keys()
    already enforces @context/@type/name on any block that exists - this
    is what actually populates them. Uses the page's own title/desc, no
    separate content to keep in sync.

    2026-08-07 addition: Section G also specifically named HowTo/FAQ
    schema, not just WebApplication - the Field Manuals are genuine
    step-by-step instructional content and were shipping with only the
    generic WebApplication block. When `instructable` (an INSTRUCTABLES
    entry) is passed, emit a second HowTo block built straight from its
    real steps - no separate content to keep in sync there either."""
    if not page.get("category"):
        return ""
    domain = SITE_URL
    data = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": page["title"],
        "description": page["desc"],
        "url": f'{domain}/{page["out"]}',
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any (runs in browser)",
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    }
    blocks = [f'    <script type="application/ld+json">{json.dumps(data)}</script>']
    if instructable:
        howto = {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": instructable["title"],
            "description": instructable["hook"],
            "totalTime": f'PT{instructable["est_minutes"]}M',
            "step": [
                {
                    "@type": "HowToStep",
                    "position": s["n"],
                    "text": s["instruction"],
                }
                for s in instructable["steps"]
            ],
        }
        blocks.append(f'    <script type="application/ld+json">{json.dumps(howto)}</script>')
    return "\n".join(blocks)


def build_breadcrumb_html(page, root):
    """'> DECK_LAUNCHER / CATEGORY / PAGE_CODE' trail. Omitted for the
    homepage and truly-special pages (gndn/404, no code AND no
    breadcrumb_cat). Wiki entries have no short code (they use their full
    title in the sidebar too) but still get a breadcrumb, falling back to
    the title for the final crumb."""
    if page["out"] == "index.html":
        return ""
    if not page.get("code") and not page.get("breadcrumb_cat"):
        return ""
    cat_label = None
    if page.get("category"):
        cat_label = dict(CATEGORIES)[page["category"]]
    elif page.get("breadcrumb_cat"):
        cat_label = page["breadcrumb_cat"]
    crumbs = [f'<a href="{root}index.html">DECK_LAUNCHER</a>']
    if cat_label:
        crumbs.append(cat_label)
    crumbs.append(page.get("code") or page["title"])
    return '            <div class="breadcrumb">&gt; ' + ' <span class="breadcrumb-sep">/</span> '.join(crumbs) + '</div>'


def build_tool_grid_html():
    """Homepage tool grid, grouped into the same categories as the nav.
    A single dashed placeholder slot (not a live AdSense unit - no
    adsbygoogle script, no ad request) is dropped in after the 2nd
    category, marking a future in-grid ad spot without touching the
    standing AdSense re-approval freeze. Reuses the existing corporate-
    debris-billboard/wireframe-header look rather than inventing new
    CSS vocabulary for it."""
    sections = []
    for i, (cat_key, cat_label) in enumerate(CATEGORIES):
        pages_in_cat = [p for p in PAGES if p.get("category") == cat_key]
        if not pages_in_cat:
            continue
        items = []
        for p in pages_in_cat:
            items.append(
                f'                <a class="tool-grid-item" href="pages/{os.path.basename(p["out"])}">\n'
                f'                    <div class="tool-name">&gt; {p["code"]}</div>\n'
                f'                    <div class="tool-desc">{p["desc"]}</div>\n'
                f'                </a>'
            )
        sections.append(
            f'                <div class="grid-section-label">{cat_label}</div>\n'
            f'                <div class="tool-grid-row">\n' + "\n".join(items) + "\n                </div>"
        )
        if i == 1:
            sections.append(
                '                <div class="corporate-debris-billboard ad-inline-placeholder">\n'
                '                    <div class="wireframe-header">&#9888; INTERCEPTED CORPORATE DEBRIS // FUTURE SLOT</div>\n'
                '                </div>'
            )
    return "\n".join(sections)


def wiki_topic_anchor(key):
    return f"wiki-topic-{key.lower().replace('_', '-')}"


def build_wiki_index_html():
    """Wiki hub page: a card per entry (title + teaser), grouped under a
    .grid-section-label per WIKI_TOPICS - same visual pattern as
    build_tool_grid_html() so it doesn't need new CSS vocabulary. This
    replaced an old design where every entry was just another <h2> on one
    ever-growing page - each entry is a real page now (see wiki_entries()).
    Each section label carries a real id now (wiki_topic_anchor()) so
    build_wiki_sections_nav_html() can jump straight to it - the right-
    deck "SECTIONS" rail this session's Lovable-prototype dig-in flagged
    as genuinely missing for a hub page long enough to need one."""
    sections = []
    for key, label, entries in wiki_entries_by_topic():
        items = []
        for p in entries:
            items.append(
                f'                <a class="tool-grid-item" href="{os.path.basename(p["out"])}">\n'
                f'                    <div class="tool-name">&gt; {p["title"]}</div>\n'
                f'                    <div class="tool-desc">{p["desc"]}</div>\n'
                f'                </a>'
            )
        sections.append(
            f'                <div class="grid-section-label" id="{wiki_topic_anchor(key)}">{label}</div>\n'
            f'                <div class="tool-grid-row">\n' + "\n".join(items) + "\n                </div>"
        )
    return "\n".join(sections)


def build_wiki_sections_nav_html():
    """Right-deck 'SECTIONS' jump-nav, wiki index page only - one link per
    WIKI_TOPICS group actually in use, anchored to build_wiki_index_html()'s
    own section ids so the two can't drift apart."""
    links = "\n".join(
        f'                    <a href="#{wiki_topic_anchor(key)}">{label}</a>'
        for key, label, _entries in wiki_entries_by_topic()
    )
    return (
        '            <div class="site-updates-box">\n'
        '                <div class="wireframe-header">// SECTIONS</div>\n'
        '                <nav class="on-page-nav">\n' + links + "\n                </nav>\n"
        '            </div>'
    )


def build_on_this_page_nav_html(has_see_also):
    """Right-deck 'ON THIS PAGE' jump-nav, individual wiki entries only.
    Our wiki entries ship full prose (not Lovable's stub-plus-source-link
    shape), so an 'ENTRY BODY' link would just point at the top of a page
    you're already on - skipped as dead weight rather than padded in to
    match the original 1:1. SEE ALSO is the one real jump target when a
    page has related links; entries with none get no panel at all."""
    if not has_see_also:
        return ""
    return (
        '            <div class="site-updates-box">\n'
        '                <div class="wireframe-header">// ON THIS PAGE</div>\n'
        '                <nav class="on-page-nav">\n'
        '                    <a href="#see-also">See Also</a>\n'
        "                </nav>\n"
        "            </div>"
    )


# ---- Field Manuals (instructables): GAMA-voice step-by-step guides ----
# Source: output/site_expansion/instructables.json (QUEUE 2 draft batch).
# related_tools/related_wiki are page basenames (same directory as the
# instructable pages), resolved against PAGES for their display titles at
# build time so the link text can't drift out of sync with a page's real
# title.
INSTRUCTABLES = [
    dict(slug="verify-source", title="Verify a Source Before You Share It",
         hook="Five minutes of checking beats being the reason something fake went around again.",
         difficulty="beginner", est_minutes=5,
         steps=[
             dict(n=1, instruction="Reverse-image-search the photo (TinEye or a similar tool) to see if it's actually old, or from a different event entirely."),
             dict(n=2, instruction="Check the account that posted it - when was it created, does it post about anything else, or is this the only thing it exists to spread."),
             dict(n=3, instruction="If there's a claimed article/source behind it, check whether that source still exists or has been archived - a dead link claiming to back up a claim is not a source."),
             dict(n=4, instruction='If it\'s a screenshot of a chat/message, remember screenshot generators exist purely to fabricate exactly this kind of "evidence" - a screenshot alone proves nothing.',
                  gotcha="This is exactly the kind of tool GAMAYUN's own research turned up and refused to list - the fact that it's this easy to fake is the whole point of checking."),
         ],
         related_tools=["image-tools.html"], related_wiki=["wiki-reverse-image.html"]),
    dict(slug="strip-metadata", title="Strip Metadata Before You Post a Photo",
         hook="Your camera embeds more into that file than you think it does.",
         difficulty="beginner", est_minutes=3,
         steps=[
             dict(n=1, instruction="Most phone photos carry EXIF data - camera model, timestamp, and often exact GPS coordinates of where it was taken."),
             dict(n=2, instruction="Run the photo through a metadata-stripping tool before posting anywhere public."),
             dict(n=3, instruction="Double check by re-uploading the stripped version to a metadata viewer - confirm the GPS/timestamp fields are actually gone, not just hidden in the app you're using."),
         ],
         related_tools=["image-tools.html"], related_wiki=["wiki-reverse-image.html"]),
    dict(slug="check-breach", title="Check If You've Been Breached (And What to Actually Do About It)",
         hook="Checking takes thirty seconds. Most people stop there, which is the part that doesn't help.",
         difficulty="beginner", est_minutes=10,
         steps=[
             dict(n=1, instruction="Check your email address against Have I Been Pwned."),
             dict(n=2, instruction="If it shows up in a breach, the actual useful step is changing the password on that specific breached service - not panicking about every account you own."),
             dict(n=3, instruction="Check whether you reused that same password anywhere else. If so, change it there too - password reuse is what turns one breach into ten compromised accounts."),
             dict(n=4, instruction="Turn on two-factor authentication anywhere it's offered and you haven't already. This is the step that actually prevents most of the damage from a breach you don't yet know about."),
         ],
         related_tools=["password-gen.html"], related_wiki=["wiki-osint.html"]),
    dict(slug="archive-page", title="Archive a Page Before It Disappears",
         hook="If it matters enough to link to, it matters enough to save.",
         difficulty="beginner", est_minutes=2,
         steps=[
             dict(n=1, instruction="Use the Wayback Machine's \"Save Page Now\" feature on the URL you care about."),
             dict(n=2, instruction="Keep the archived snapshot URL alongside the original when you cite or reference the page - the snapshot survives even if the original goes down or gets edited."),
             dict(n=3, instruction="For pages you expect to change over time (not just disappear), check whether the Wayback Machine already has historical snapshots - useful for seeing what a page used to say."),
         ],
         related_tools=[], related_wiki=["wiki-link-rot.html"]),
    dict(slug="anon-signup", title="Sign Up for Something Without Handing Over Your Real Info",
         hook="Not everything that asks for your email and phone number needs your actual email and phone number.",
         difficulty="beginner", est_minutes=5,
         steps=[
             dict(n=1, instruction="For a one-time signup you don't plan to keep, use a disposable email inbox instead of your real one."),
             dict(n=2, instruction="If it also demands a phone number just to send a one-time code, a free virtual-number service can receive that single SMS without exposing your real number."),
             dict(n=3, instruction="If a form demands a name/address for something genuinely low-stakes (testing a checkout flow, filling a form that doesn't need to be real), a fake-identity generator exists for exactly that - not for anything that involves an actual transaction or contract."),
             dict(n=4, instruction="None of this applies to anything with real legal or financial weight - this is for throwaway signups, not for lying on anything that matters.",
                  gotcha="Worth being explicit about the line here, since the underlying tools could be misused past that point."),
         ],
         related_tools=["password-gen.html"], related_wiki=["wiki-fingerprinting.html"]),
]


def build_instructable_html(entry):
    steps_html = []
    for s in entry["steps"]:
        gotcha = f'<div class="field-note">{s["gotcha"]}</div>' if s.get("gotcha") else ""
        steps_html.append(f'                    <li>{s["instruction"]}{gotcha}</li>')
    related = []
    for basename in entry.get("related_tools", []) + entry.get("related_wiki", []):
        title = next((p["title"] for p in PAGES if os.path.basename(p["out"]) == basename), basename)
        related.append(f'<a href="{basename}">{title}</a>')
    related_html = ""
    if related:
        related_html = f'                <p class="related-block">RELATED: {" &middot; ".join(related)}</p>\n'
    return (
        '            <article class="prose">\n'
        f'                <h1>&gt; {entry["title"]}</h1>\n'
        f'                <p class="instructable-meta">{entry["difficulty"].upper()} &middot; ~{entry["est_minutes"]} MIN</p>\n'
        f'                <p>{entry["hook"]}</p>\n'
        '                <ol>\n' + "\n".join(steps_html) + '\n                </ol>\n'
        + related_html +
        '            </article>\n'
    )


# ---- External Links: curated outbound directories ----
# Source: output/site_expansion/link_pages.json -> approved_high_value,
# already vetted against the Opticon pipeline's integrity bar.
EXTERNAL_LINKS = [
    dict(topic="dev-tools", page_title="Dev Vault // External Links", entries=[
        dict(domain="regex101.com", url="https://regex101.com", one_line_desc="Interactive regex tester with a live explainer panel. GAMAYUN ships its own regex tool - this is the one that inspired the category."),
        dict(domain="crontab.guru", url="https://crontab.guru", one_line_desc="Plain-English cron expression explainer. Same relationship to GAMAYUN's cron tool as regex101 above."),
        dict(domain="explainshell.com", url="https://explainshell.com", one_line_desc="Paste any shell command, get every flag explained inline."),
        dict(domain="devdocs.io", url="https://devdocs.io", one_line_desc="Every language/framework's docs in one fast, offline-capable browser."),
        dict(domain="roadmap.sh", url="https://roadmap.sh", one_line_desc="Free visual roadmaps for learning a given dev discipline end to end."),
        dict(domain="learnxinyminutes.com", url="https://learnxinyminutes.com", one_line_desc="Any programming language's syntax, on one page, no fluff."),
        dict(domain="jsoncrack.com", url="https://jsoncrack.com", one_line_desc="Turns JSON/YAML/CSV into an interactive visual graph."),
        dict(domain="codebeautify.org", url="https://codebeautify.org", one_line_desc="Formats messy code/data across most common languages."),
        dict(domain="diffchecker.com", url="https://diffchecker.com", one_line_desc="Free text/file diff comparison, no signup for basic use."),
        dict(domain="builtwith.com", url="https://builtwith.com", one_line_desc="See what tech stack is actually running behind any website."),
        dict(domain="excalidraw.com", url="https://excalidraw.com", one_line_desc="Open-source hand-drawn-style diagramming, no account required."),
        dict(domain="n8n.io", url="https://n8n.io", one_line_desc="Open-source, self-hostable workflow automation - the non-proprietary Zapier alternative."),
    ]),
    dict(topic="privacy-utility", page_title="Recon Ops // External Links", entries=[
        dict(domain="haveibeenpwned.com", url="https://haveibeenpwned.com", one_line_desc="The standard breach-check tool. Free, run by an independent security researcher, no data sold."),
        dict(domain="tosdr.org", url="https://tosdr.org", one_line_desc="Rates services' actual Terms of Service in plain English so you don't have to read 40 pages of legalese."),
        dict(domain="privnote.com", url="https://privnote.com", one_line_desc="Self-destructing one-time-read notes."),
        dict(domain="10minutemail.com", url="https://10minutemail.com", one_line_desc="Disposable inbox for signups you don't want following you home."),
        dict(domain="accountkiller.com", url="https://accountkiller.com", one_line_desc="Direct account-deletion links/instructions for sites that bury the option on purpose."),
        dict(domain="sms24.me", url="https://sms24.me", one_line_desc="Free virtual numbers for SMS verification codes - keep your real number off yet another database."),
        dict(domain="fakenamegenerator.com", url="https://fakenamegenerator.com", one_line_desc="Generates a full fake identity for testing forms or padding out low-stakes signups."),
        dict(domain="virustotal.com", url="https://virustotal.com", one_line_desc="Multi-engine file/URL malware scanner, owned by Google."),
        dict(domain="downdetector.com", url="https://downdetector.com", one_line_desc="Crowd-sourced outage tracker - is it down for everyone or just you."),
        dict(domain="fast.com", url="https://fast.com", one_line_desc="Netflix's own no-account internet speed test."),
        dict(domain="camelcamelcamel.com", url="https://camelcamelcamel.com", one_line_desc="Amazon price-history tracker - see if that \"deal\" actually is one."),
        dict(domain="file.io", url="https://file.io", one_line_desc="File sharing that deletes itself after the first download."),
    ]),
    dict(topic="research-education", page_title="Ship's Log // External Links", entries=[
        dict(domain="archive.org", url="https://archive.org", one_line_desc="The Internet Archive - Wayback Machine, public-domain books, software, audio. Not to be confused with piracy mirrors that borrow its reputation."),
        dict(domain="gutenberg.org", url="https://gutenberg.org", one_line_desc="70,000+ genuinely public-domain ebooks."),
        dict(domain="openculture.com", url="https://openculture.com", one_line_desc="Aggregates free courses and media from real universities."),
        dict(domain="wolframalpha.com", url="https://wolframalpha.com", one_line_desc="Computational answer engine - step-by-step math, physics, chemistry."),
        dict(domain="semanticscholar.org", url="https://semanticscholar.org", one_line_desc="Free academic search engine, Allen Institute for AI."),
        dict(domain="elicit.com", url="https://elicit.com", one_line_desc="AI research-paper assistant, real free tier for basic search/summarize."),
        dict(domain="consensus.app", url="https://consensus.app", one_line_desc="AI search specifically over published science, not the general web."),
        dict(domain="connectedpapers.com", url="https://connectedpapers.com", one_line_desc="Visual graph of how research papers relate to each other."),
        dict(domain="summarize.tech", url="https://summarize.tech", one_line_desc="Summarizes long YouTube video transcripts."),
        dict(domain="justwatch.com", url="https://justwatch.com", one_line_desc="Finds where to legally stream a given movie or show. The non-piracy alternative to the aggregators that came up constantly during this research."),
    ]),
    dict(topic="design-media", page_title="File Salvage // External Links", entries=[
        dict(domain="photopea.com", url="https://photopea.com", one_line_desc="Full Photoshop-alternative in the browser, opens PSD/XD/Sketch/RAW, no account."),
        dict(domain="remove.bg", url="https://remove.bg", one_line_desc="One-click AI background removal."),
        dict(domain="cleanup.pictures", url="https://cleanup.pictures", one_line_desc="Erase unwanted objects from a photo."),
        dict(domain="squoosh.app", url="https://squoosh.app", one_line_desc="Google's own open-source image compressor, runs entirely client-side - close cousin to GAMAYUN's own philosophy."),
        dict(domain="coolors.co", url="https://coolors.co", one_line_desc="Fast color-palette generator."),
        dict(domain="khroma.co", url="https://khroma.co", one_line_desc="AI-trained personal color-palette generator, MIT Media Lab."),
        dict(domain="fontjoy.com", url="https://fontjoy.com", one_line_desc="AI font-pairing generator."),
        dict(domain="pixabay.com", url="https://pixabay.com", one_line_desc="Free stock photos/video/music, permissive license."),
        dict(domain="mixkit.co", url="https://mixkit.co", one_line_desc="Free stock video and music clips."),
        dict(domain="autodraw.com", url="https://autodraw.com", one_line_desc="Google's free sketch-to-icon AI tool."),
        dict(domain="craiyon.com", url="https://craiyon.com", one_line_desc="Free AI image generator, descendant of the original DALL-E mini."),
    ]),
    dict(topic="fun-curios", page_title="Games & Curios // External Links", entries=[
        dict(domain="radio.garden", url="https://radio.garden", one_line_desc="Spin an interactive globe, tune into real local radio stations anywhere."),
        dict(domain="tunefind.com", url="https://tunefind.com", one_line_desc="Finds the song that just played in a given TV/movie scene."),
        dict(domain="musicforprogramming.net", url="https://musicforprogramming.net", one_line_desc="Curated ambient focus music, free, no account."),
        dict(domain="mynoise.net", url="https://mynoise.net", one_line_desc="Custom layered soundscapes for focus or sleep."),
        dict(domain="futureme.org", url="https://futureme.org", one_line_desc="Write an email, have it delivered to yourself years from now."),
        dict(domain="cobalt.tools", url="https://cobalt.tools", one_line_desc="Open-source universal downloader for social video/audio, no ads, no paywall."),
        dict(domain="goblin.tools", url="https://goblin.tools", one_line_desc="Small ADHD/executive-dysfunction-friendly tools - task breakdown, tone formalizer."),
        dict(domain="untools.co", url="https://untools.co", one_line_desc="A curated collection of actual decision-making frameworks, not motivational fluff."),
        dict(domain="flightradar24.com", url="https://flightradar24.com", one_line_desc="Real-time global flight tracking."),
        dict(domain="justtherecipe.com", url="https://justtherecipe.com", one_line_desc="Strips a recipe URL down to just the recipe, skips the life story."),
    ]),
]


def build_link_card_html(entries):
    """Shared external-link card markup - same visual family as
    .tool-grid-item, distinguished only by the outbound arrow, since these
    live in the same TOOLS-tab sidebar as GAMAYUN's own tools."""
    items = []
    for e in entries:
        extra = f'<div class="field-note">{e["ethics_note"]}</div>' if e.get("ethics_note") else ""
        extra += f'<div class="info-tag">{e["cost_honesty"]}</div>' if e.get("cost_honesty") else ""
        label = e.get("domain") or e.get("provider")
        desc = e.get("one_line_desc") or e.get("what_you_actually_learn")
        items.append(
            f'                <a class="tool-grid-item" href="{e["url"]}" target="_blank" rel="noopener">\n'
            f'                    <div class="tool-name">&gt; {label} <span class="tool-name-arrow">&#8599;</span></div>\n'
            f'                    <div class="tool-desc">{desc}</div>{extra}\n'
            '                </a>'
        )
    return '                <div class="tool-grid-row">\n' + "\n".join(items) + "\n                </div>"


def build_link_page_html(topic):
    return (
        '            <article class="prose">\n'
        f'                <h1>&gt; {topic["page_title"]}</h1>\n'
        "                <p>External sites, not GAMAYUN tools - out of scope for the client-side/no-accounts guarantee. Vetted against the same integrity bar as everything else here, but they're somebody else's server now.</p>\n"
        '            </article>\n'
        '            <section class="card-grid">\n' + build_link_card_html(topic["entries"]) + '\n            </section>\n'
    )


# ---- OSINT Directory ----
# Source: output/site_expansion/osint_directory.json. ethics_note carries
# the Opticon pipeline's caution flags forward verbatim - anything that
# indexes/distributes stolen data rather than just checking exposure was
# excluded from the source list entirely, not just flagged.
OSINT_DIRECTORY = [
    dict(domain="haveibeenpwned.com", url="https://haveibeenpwned.com", one_line_desc="Check if your email/password appeared in a known data breach.", skill_level="beginner", ethics_note="Run by an independent, well-known security researcher (Troy Hunt); only confirms exposure, doesn't expose the data itself - the model every other \"breach check\" tool should be judged against."),
    dict(domain="hacker101.com", url="https://hacker101.com", one_line_desc="Free web-security class with CTF levels, run by HackerOne.", skill_level="beginner"),
    dict(domain="tryhackme.com", url="https://tryhackme.com", one_line_desc="Hands-on cybersecurity training through guided real-world scenarios.", skill_level="beginner"),
    dict(domain="hackthissite.org", url="https://hackthissite.org", one_line_desc="Long-running, legal practice environment for ethical hacking.", skill_level="beginner"),
    dict(domain="tineye.com", url="https://tineye.com", one_line_desc="Reverse image search across 60B+ indexed images.", skill_level="beginner"),
    dict(domain="builtwith.com", url="https://builtwith.com", one_line_desc="Identifies the technology stack behind any website.", skill_level="beginner"),
    dict(domain="tosdr.org", url="https://tosdr.org", one_line_desc="Plain-English ratings of what services actually do with your data per their own Terms of Service.", skill_level="beginner"),
    dict(domain="gchq.github.io/CyberChef", url="https://gchq.github.io/CyberChef/", one_line_desc="The \"cyber Swiss army knife\" - encode/decode/parse/analyze data recipes, browser-based.", skill_level="intermediate", ethics_note="Built and open-sourced by GCHQ, gold-standard tool in the field."),
    dict(domain="shodan.io", url="https://shodan.io", one_line_desc="Search engine for internet-connected devices (IoT, servers, webcams).", skill_level="intermediate", ethics_note="Legitimate, industry-standard - defensive/research use, not a \"find unsecured cameras\" novelty."),
    dict(domain="zoomeye.ai", url="https://zoomeye.ai", one_line_desc="Shodan-equivalent device/vulnerability search engine.", skill_level="intermediate", ethics_note="Legitimate, but its homepage surfaces live CVE exploit search queries directly - defender/researcher framing only."),
    dict(domain="dorksearch.com", url="https://dorksearch.com", one_line_desc="Ready-to-use Google dorking queries for finding exposed data.", skill_level="intermediate", ethics_note="Educational use per the tool's own disclaimer - misuse can be treated as unauthorized access in some jurisdictions."),
    dict(domain="fotoforensics.com", url="https://fotoforensics.com", one_line_desc="Error-level analysis to spot edited/manipulated photos.", skill_level="intermediate"),
]


def build_osint_directory_html():
    sections = []
    for key, label in [("beginner", "BEGINNER"), ("intermediate", "INTERMEDIATE")]:
        entries = [e for e in OSINT_DIRECTORY if e["skill_level"] == key]
        if not entries:
            continue
        sections.append(f'                <div class="card-grid-label">[ {label} ]</div>\n' + build_link_card_html(entries))
    return '            <section class="card-grid">\n' + "\n".join(sections) + '\n            </section>\n'


# ---- Free Courses ----
# Source: output/site_expansion/free_courses.json. cost_honesty is the
# load-bearing field - several of these are "free to learn, paid if you
# want the certificate," a different thing from "fully free" and kept
# visibly distinct rather than blurred together.
FREE_COURSES = [
    dict(provider="cs50.harvard.edu", url="https://cs50.harvard.edu", what_you_actually_learn="Harvard's actual intro-to-computer-science course, the real one, free.", cost_honesty="fully free"),
    dict(provider="freecodecamp.org", url="https://freecodecamp.org", what_you_actually_learn="Full curriculum from web basics through backend/data science, with real certifications.", cost_honesty="fully free"),
    dict(provider="khanacademy.org", url="https://khanacademy.org", what_you_actually_learn="K-12 through early-college math, science, economics - the original free-education-for-everyone platform.", cost_honesty="fully free"),
    dict(provider="ocw.mit.edu (MIT OpenCourseWare)", url="https://ocw.mit.edu", what_you_actually_learn="Actual MIT course materials - lecture notes, problem sets, some full video lectures.", cost_honesty="fully free"),
    dict(provider="exercism.org", url="https://exercism.org", what_you_actually_learn="Hands-on coding exercises with real human mentor feedback, across 70+ languages.", cost_honesty="fully free"),
    dict(provider="w3schools.com", url="https://w3schools.com", what_you_actually_learn="Reference-style web dev tutorials (HTML/CSS/JS/SQL etc), try-it-yourself editor built in.", cost_honesty="fully free"),
    dict(provider="programiz.com", url="https://programiz.com", what_you_actually_learn="Beginner-friendly programming tutorials with an in-browser compiler.", cost_honesty="fully free"),
    dict(provider="duolingo.com", url="https://duolingo.com", what_you_actually_learn="Language learning, gamified, ad-supported free tier is fully functional.", cost_honesty="fully free (ad-supported), paid tier removes ads/adds features"),
    dict(provider="ted.com", url="https://ted.com", what_you_actually_learn="Not a structured course, but a huge free library of expert talks across every field.", cost_honesty="fully free"),
    dict(provider="leetcode.com", url="https://leetcode.com", what_you_actually_learn="Data structures & algorithms practice problems, the standard interview-prep grind.", cost_honesty="free tier covers most problems, premium adds company-specific question sets"),
    dict(provider="coursera.org", url="https://coursera.org", what_you_actually_learn="University-partnered courses - audit any course's actual video lectures and readings for free.", cost_honesty="free to audit, paid for a certificate/graded assignments"),
    dict(provider="edx.org", url="https://edx.org", what_you_actually_learn="Same model as Coursera - university courses (MIT, Harvard, etc), audit track is free.", cost_honesty="free to audit, paid for verified certificate"),
    dict(provider="alison.com", url="https://alison.com", what_you_actually_learn="6,000+ courses across trades, business, and tech, with genuinely free certificates - not just free audit.", cost_honesty="fully free including basic certificate, paid tier removes ads and adds premium diplomas"),
    dict(provider="skillshare.com", url="https://skillshare.com", what_you_actually_learn="Creative-skills classes (design, illustration, video, business).", cost_honesty="paid subscription required beyond a trial - listed for completeness, not a \"free\" pick"),
]


def build_free_courses_html():
    return (
        '            <article class="prose">\n'
        '                <h1>&gt; Free Courses</h1>\n'
        "                <p>External sites, not GAMAYUN tools. \"Free\" gets used loosely everywhere else - the tag under each entry says exactly what's actually free versus free-to-learn-but-paid-for-the-certificate, so you know before you start.</p>\n"
        '            </article>\n'
        '            <section class="card-grid">\n' + build_link_card_html(FREE_COURSES) + '\n            </section>\n'
    )


def build_human_sitemap_html():
    """Human-readable sitemap (pages/sitemap.html), grouped the same way as
    the nav/tool grid, plus a final section for the footer-only utility
    pages. Auto-derived from PAGES so it can't go stale like the old
    hand-typed version did."""
    sections = []
    for cat_key, cat_label in CATEGORIES:
        pages_in_cat = [p for p in PAGES if p.get("category") == cat_key]
        if not pages_in_cat:
            continue
        items = "\n".join(
            f'                    <li><a href="{os.path.basename(p["out"])}">{p["title"]}</a></li>'
            for p in pages_in_cat
        )
        sections.append(f'                <h2>{cat_label}</h2>\n                <ul>\n{items}\n                </ul>')

    section_pages = [p for p in PAGES if page_section(p) in ("wiki", "log", "about")]
    if section_pages:
        items = "\n".join(
            f'                    <li><a href="{os.path.basename(p["out"])}">{p["title"]}</a></li>'
            for p in section_pages
        )
        sections.append(f'                <h2>Site Sections</h2>\n                <ul>\n{items}\n                </ul>')

    utility_pages = [p for p in PAGES if p.get("breadcrumb_cat") == "SYSTEM" and p["out"] != "pages/sitemap.html"]
    if utility_pages:
        items = "\n".join(
            f'                    <li><a href="{os.path.basename(p["out"])}">{p["title"]}</a></li>'
            for p in utility_pages
        )
        sections.append(f'                <h2>Site & Legal</h2>\n                <ul>\n{items}\n                </ul>')
    return "\n".join(sections)


def upgrade_related_block_to_cards(content, pages_by_basename):
    """Turns a fragment's hand-authored one-line "RELATED: <a>...</a>
    &middot; <a>...</a>" paragraph (used across wiki entries and
    instructables) into a real SEE_ALSO card grid - same .tool-grid-item
    look the homepage and wiki index already use. Title/desc are pulled
    live from PAGES rather than duplicated as new copy in each of the
    ~20 fragments that carry a related-block, so a card's text can't
    drift out of sync with the page it links to. Falls back to the
    anchor's own link text (no description line) if an href doesn't
    resolve against PAGES."""
    match = re.search(r'<p class="related-block">.*?</p>', content, flags=re.DOTALL)
    if not match:
        return content
    links = re.findall(r'<a href="([^"]+)">([^<]*)</a>', match.group(0))
    if not links:
        return content
    cards = []
    for href, label in links:
        page = pages_by_basename.get(href)
        title = page["title"] if page else label
        desc_line = f'\n                    <div class="tool-desc">{page["desc"]}</div>' if page else ""
        cards.append(
            f'                <a class="tool-grid-item" href="{href}">\n'
            f'                    <div class="tool-name">&gt; {title}</div>{desc_line}\n'
            f'                </a>'
        )
    replacement = (
        '                <div class="grid-section-label" id="see-also">SEE_ALSO</div>\n'
        '                <div class="tool-grid-row">\n' + "\n".join(cards) + "\n                </div>"
    )
    return content[:match.start()] + replacement + content[match.end():]


def promote_page_title_heading(content):
    """Every page needs exactly one <h1> for real SEO/accessibility, but
    ~110 tool-page content fragments open with <h2> as their only heading
    (a .tool-card styling choice, not a semantic one) and have no <h1>
    anywhere. Pages that already lead with a real <h1> (wiki entries,
    legal/privacy/terms, changelog, about, etc.) are untouched. For the
    rest, promote only the FIRST <h2> - the page's own title - to <h1>;
    any later <h2> in the same fragment is a genuine subsection heading
    (e.g. dice-roller's "WHY THE RANDOMNESS SOURCE ACTUALLY MATTERS
    HERE") and must stay <h2> or the hierarchy breaks."""
    if "<h1" in content:
        return content
    return content.replace("<h2>", "<h1>", 1).replace("</h2>", "</h1>", 1)


def wrap_h2_underscores(content):
    """Tool titles are one long underscore-joined word ("DATE_DIFFERENCE_
    CALCULATOR") with no space for the browser's normal line-breaking to
    use - confirmed via a real mobile-width render that a long enough one
    forces the whole page wider than the viewport (calc-date-diff
    specifically). <wbr> after each underscore, same fix already applied
    to nav_link_label() for the same underlying problem, so the browser
    only ever breaks at an underscore seam instead of picking an
    arbitrary (often mid-word) spot via CSS overflow-wrap alone. Matches
    both <h1> and <h2> since promote_page_title_heading() runs first and
    turns most pages' title heading into an <h1> - the underscore-joined
    title still needs the same wbr treatment regardless of tag level."""
    return re.sub(
        r"(<h([12])>.*?</h\2>)",
        lambda m: m.group(1).replace("_", "_<wbr>"),
        content,
        flags=re.DOTALL,
    )


def build():
    count = 0
    tool_grid_html = build_tool_grid_html()
    human_sitemap_html = build_human_sitemap_html()
    wiki_index_html = build_wiki_index_html()
    wiki_sections_nav_html = build_wiki_sections_nav_html()
    osint_directory_html = build_osint_directory_html()
    free_courses_html = build_free_courses_html()
    instructable_html_by_out = {
        f"pages/howto-{e['slug']}.html": build_instructable_html(e) for e in INSTRUCTABLES
    }
    instructable_by_out = {
        f"pages/howto-{e['slug']}.html": e for e in INSTRUCTABLES
    }
    link_page_html_by_out = {
        f"pages/links-{t['topic']}.html": build_link_page_html(t) for t in EXTERNAL_LINKS
    }
    pages_by_basename = {os.path.basename(p["out"]): p for p in PAGES}
    for page in PAGES:
        with open(os.path.join(SRC, "content", page["fragment"]), encoding="utf-8") as f:
            content = f.read()
        content = promote_page_title_heading(content)
        content = wrap_h2_underscores(content)
        content = content.replace("{{TOOL_GRID}}", tool_grid_html)
        content = content.replace("{{HUMAN_SITEMAP}}", human_sitemap_html)
        content = content.replace("{{WIKI_INDEX}}", wiki_index_html)
        content = content.replace("{{OSINT_CONTENT}}", osint_directory_html)
        content = content.replace("{{COURSES_CONTENT}}", free_courses_html)
        content = content.replace("{{HOWTO_CONTENT}}", instructable_html_by_out.get(page["out"], ""))
        content = content.replace("{{LINKS_CONTENT}}", link_page_html_by_out.get(page["out"], ""))
        content = upgrade_related_block_to_cards(content, pages_by_basename)

        if page["out"] == "pages/wiki-index.html":
            right_deck_extra = wiki_sections_nav_html
        elif page.get("wiki_entry"):
            right_deck_extra = build_on_this_page_nav_html('id="see-also"' in content)
        else:
            right_deck_extra = ""

        section = page_section(page)
        out = BASE
        out = out.replace("{{RIGHT_DECK_EXTRA}}", right_deck_extra)
        out = out.replace("{{SITE_URL}}", SITE_URL)
        out = out.replace("{{TITLE}}", page["title"])
        out = out.replace("{{BOOKMARK_NOUN}}", bookmark_noun(page, section))
        out = out.replace("{{DESCRIPTION}}", page["desc"])
        out = out.replace("{{JSONLD}}", build_jsonld_html(page, instructable_by_out.get(page["out"])))
        canonical_path = "" if page["out"] == "index.html" else page["out"]
        out = out.replace("{{OG_URL}}", f'{SITE_URL}/{canonical_path}')
        out = out.replace("{{OG_IMAGE}}", f'{SITE_URL}/assets/og-image.png')
        out = out.replace("{{ROOT}}", page["root"])
        out = out.replace("{{TABS}}", build_tabs_html(section, page["root"]))
        out = out.replace("{{NAV}}", build_nav_html(page["out"], page["root"], section))
        out = out.replace("{{BREADCRUMB}}", build_breadcrumb_html(page, page["root"]))
        out = out.replace("{{CONTENT}}", content)
        out = out.replace("{{YEAR}}", str(datetime.date.today().year))

        extra_js_html = "\n".join(
            f'    <script src="{page["root"]}js/{fname[:-3]}.min.js"></script>' for fname in page["js"]
        )
        out = out.replace("{{EXTRA_JS}}", extra_js_html)

        out_path = os.path.join(ROOT_DIR, page["out"])
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(out)
        count += 1
        print(f"  built {page['out']}")
    print(f"\n{count} pages built.")
    build_sitemap_xml()
    build_robots_txt()
    build_tool_list_js()
    build_log_entries_js()


def build_tool_list_js():
    """Client-side tool index for the search bar and the "random tool"
    button - auto-derived from PAGES (same source of truth as the nav and
    the tool grid) so it can't drift out of sync with what's actually on
    the site. Only pages with a category are real tools (excludes home,
    utility pages like legal/contact/sitemap, and special pages like the
    404/gndn easter egg). URLs are site-root-relative; site-search.js
    resolves them against document.body.dataset.root at runtime, same
    trick the nav links already use."""
    tools = [
        {"title": p["title"], "desc": p["desc"], "code": p["code"], "url": p["out"]}
        for p in PAGES
        if p.get("category")
    ]
    js = "// Auto-generated by _src/build.py - do not hand-edit, edit PAGES in build.py instead.\n"
    js += f"const TOOL_LIST = {json.dumps(tools, indent=2)};\n"
    with open(os.path.join(ROOT_DIR, "js", "data-tool-list.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print(f"  built js/data-tool-list.js ({len(tools)} tools)")


# GAMA+'s own first-person, pruned-of-jargon summary of what shipped each
# day - deliberately NOT the full technical changelog (that stays intact
# at pages/changelog.html, linked from the LOG page for anyone who wants
# the detail). This is the ~20% "maintenance" slice of the LOG feed;
# js/tool-log-feed.js interleaves these with live Bluesky posts, which are
# meant to make up the other ~80% once the account's actually posting.
LOG_ENTRIES = [
    {"date": "2026-07-16", "text": "Reorganized my own deck today - collapsible categories so the sidebar stops going on forever, and a proper PAINT LOCKER for the color tools that were living somewhere weird. Also read my own canon cover-to-cover and fixed the things I'd been quietly getting wrong (yes, even the bit where I said \"oh joy\" like it was my whole personality). Renamed the letter-rack tool too - turns out board game companies have lawyers, who knew."},
    {"date": "2026-07-13", "text": "Fixed myself sitting directly on top of the ad banner like an idiot, and stopped my own dialogue box from eating the nav underneath it. Added Pig Latin, NATO code, an anagram finder, and a name generator. Also: we're live. Real domain, real HTTPS, real everything."},
    {"date": "2026-07-12", "text": "Built a proper QR code generator from scratch instead of wrapping someone else's, added URL and HTML entity encoding, and a password generator that doesn't cut corners on randomness. Hid a message inside an image for the first time. Also picked up a tip jar and a name that isn't \"IIFYM.\""},
    {"date": "2026-07-11", "text": "Reorganized the whole nav into actual categories instead of one flat list, added three lookup tools, and gave myself a real idle animation instead of just sitting there. Branding's locked now too - GAMA+, not G.A.M.A."},
    {"date": "2026-07-10", "text": "Day one. Ten tools, a real color palette instead of guesses, and the raven-and-key seal instead of a placeholder rectangle. Everything since started here."},
]


def build_log_entries_js():
    js = "// Auto-generated by _src/build.py - do not hand-edit, edit LOG_ENTRIES in build.py instead.\n"
    js += f"const LOG_ENTRIES = {json.dumps(LOG_ENTRIES, indent=2)};\n"
    with open(os.path.join(ROOT_DIR, "js", "data-log-entries.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print(f"  built js/data-log-entries.js ({len(LOG_ENTRIES)} entries)")


def build_sitemap_xml():
    """Machine-readable sitemap for search engines - separate from the
    human-readable pages/sitemap.html. Auto-derived from PAGES so it can't
    drift out of sync. This is the exact thing the yoyotools.com creator
    skipped and then couldn't get indexed for 3 months."""
    domain = SITE_URL
    urls = []
    for page in PAGES:
        if page["out"].endswith("404.html") or page["out"].endswith("gndn.html") or page["out"].endswith("scrapbook.html"):
            continue  # don't invite crawlers to index the error page or the easter eggs
        loc_path = "" if page["out"] == "index.html" else page["out"]
        urls.append(f'  <url>\n    <loc>{domain}/{loc_path}</loc>\n  </url>')
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls) +
        "\n</urlset>\n"
    )
    with open(os.path.join(ROOT_DIR, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"  built sitemap.xml ({len(urls)} urls)")


def build_robots_txt():
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /pages/gndn.html\n"
        "Disallow: /pages/scrapbook.html\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )
    with open(os.path.join(ROOT_DIR, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(content)
    print("  built robots.txt")


def minify_assets():
    """Build-time CSS/JS minify step (Site Cleanup ticket - flagged as the
    cheapest available fix). Runs _src/minify.mjs (a Node CLI wrapper
    around the exact same string/comment-aware tokenizer already used by
    the site's own live CSS/JS Minifier tool - not a naive regex pass,
    see that file's own header comment for why a naive pass is unsafe
    here). Source files (css/gama.css, js/*.js) stay exactly as they are
    - human-edited, fully commented - and are NOT what gets referenced by
    the page templates. Each gets a sibling *.min.* build artifact that
    IS what's referenced, regenerated fresh every build.

    Soft-fails (prints a warning, does not raise) if `node` isn't on
    PATH: this keeps build.py's own "stdlib only" promise for the core
    HTML assembly - a machine without Node still gets a fully working
    (just unminified) site instead of a broken build.
    """
    import shutil
    import subprocess

    if shutil.which("node") is None:
        print("  ! node not found on PATH - skipping CSS/JS minify step "
              "(site still builds and works, just unminified)")
        return

    def minify_one(mode, src_path):
        min_path = src_path[:-len(".css")] + ".min.css" if mode == "css" else src_path[:-len(".js")] + ".min.js"
        result = subprocess.run(
            ["node", os.path.join(SRC, "minify.mjs"), mode, src_path],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"  ! minify failed for {src_path}: {result.stderr.strip()}")
            return
        with open(min_path, "w", encoding="utf-8") as f:
            f.write(result.stdout)

    css_path = os.path.join(ROOT_DIR, "css", "gama.css")
    minify_one("css", css_path)

    js_dir = os.path.join(ROOT_DIR, "js")
    # Every JS file actually referenced somewhere: the 4 shared ones
    # hardcoded in base.html, plus every page's own "js" list.
    referenced = {"gama-core.js", "data-tool-list.js", "site-search.js", "page-transition.js"}
    for page in PAGES:
        referenced.update(page["js"])
    before_total = 0
    after_total = 0
    for fname in sorted(referenced):
        src_path = os.path.join(js_dir, fname)
        if not os.path.exists(src_path):
            print(f"  ! referenced JS file missing, skipped: {fname}")
            continue
        minify_one("js", src_path)
        min_path = src_path[:-3] + ".min.js"
        before_total += os.path.getsize(src_path)
        after_total += os.path.getsize(min_path)

    css_before = os.path.getsize(css_path)
    css_after = os.path.getsize(css_path[:-4] + ".min.css")
    print(f"  minified css/gama.css: {css_before}B -> {css_after}B")
    print(f"  minified {len(referenced)} referenced JS files: {before_total}B -> {after_total}B total")


if __name__ == "__main__":
    build()
    minify_assets()
