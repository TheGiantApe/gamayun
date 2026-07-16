#!/usr/bin/env python3
"""
GAMAYUN site builder. Zero external dependencies (stdlib only).
Assembles _src/templates/base.html + _src/content/*.html fragments
into the final static site. Output is plain HTML/CSS/JS - nothing
about the shipped site depends on this script running again.

To add a new page: drop a fragment in _src/content/, add one entry
to PAGES below, run this script.
"""
import json
import os

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SRC)

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
    ("GAMES_CURIOS", "GAMES & CURIOS"),
]

# Top-level tab bar (site sections), separate from CATEGORIES above (which
# are TOOLS-only sub-groups shown in the sidebar). Each tuple is
# (section key, tab label, link target - relative to site root). A 5th
# ARTICLES tab is deliberately not here yet (explicitly deferred, "near
# future stuff" per Vin) - adding one later is just one more tuple plus a
# page, the tab bar itself doesn't need to change.
SECTIONS = [
    ("tools", "TOOLS", "index.html"),
    ("wiki", "WIKI", "pages/wiki-index.html"),
    ("log", "LOG", "pages/log.html"),
    ("about", "ABOUT", "pages/about.html"),
]

# Pages whose section can't be derived from their category (the tab-bar
# landing pages themselves, plus anything with no category at all). Every
# other page's section is inferred from whether its category is a TOOLS
# category - see page_section() below.
SECTION_OVERRIDES = {
    "index.html": "tools",
    "pages/wiki-index.html": "wiki",
    "pages/log.html": "log",
    "pages/about.html": "about",
}


def page_section(page):
    if page["out"] in SECTION_OVERRIDES:
        return SECTION_OVERRIDES[page["out"]]
    if page.get("category") in {key for key, _ in CATEGORIES}:
        return "tools"
    return None

# Each page: out (output path), fragment (content file), title, desc,
# root (path prefix back to site root), code (short nav/breadcrumb label,
# None = not in nav), category (key into CATEGORIES, or None),
# breadcrumb_cat (override label for breadcrumb only, e.g. utility pages
# that aren't in the visible nav but still get a breadcrumb trail), js.
PAGES = [
    dict(out="index.html", fragment="home.html", title="Orbital Salvage Archive",
         desc="Free client-side web tools. Your input never leaves your browser. No accounts, nothing for sale.",
         root="", code="DECK_LAUNCHER", category=None, js=[]),

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
    dict(out="pages/color.html", fragment="color.html", title="Color Converter",
         desc="Hex, RGB integer, RGB float, and HSL, all at once.",
         root="../", code="COLOR_CONVERTER", category="PAINT_LOCKER",
         js=["tool-color.js"]),
    dict(out="pages/palette.html", fragment="palette.html", title="Palette Forge",
         desc="Generate a 5-color palette, lock the ones worth keeping, export as hex or CSS variables.",
         root="../", code="PALETTE_FORGE", category="PAINT_LOCKER",
         js=["tool-palette.js"]),

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

    dict(out="pages/image-tools.html", fragment="image-tools.html", title="Image Salvage",
         desc="Read EXIF metadata (including GPS location) before it leaks, then strip it, resize, and convert format.",
         root="../", code="IMAGE_SALVAGE", category="FILE_SALVAGE", js=["tool-image-tools.js"]),
    dict(out="pages/steganography.html", fragment="steganography.html", title="Steganography",
         desc="Hide a text message inside an image via LSB encoding, or extract one that's already hidden.",
         root="../", code="STEGANOGRAPHY", category="FILE_SALVAGE", js=["tool-steganography.js"]),
    dict(out="pages/ela-check.html", fragment="ela-check.html", title="Error Level Analysis",
         desc="Re-compress an image and diff it against the original to surface possibly-edited regions.",
         root="../", code="ELA_CHECK", category="FILE_SALVAGE", js=["tool-ela-check.js"]),

    dict(out="pages/json-format.html", fragment="json-format.html", title="JSON Formatter",
         desc="Beautify or minify JSON with real error messages.",
         root="../", code="JSON_FORMATTER", category="DEV_VAULT",
         js=["tool-json.js"]),
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

    dict(out="pages/cipher-deck.html", fragment="cipher-deck.html", title="Cipher Deck",
         desc="Caesar shift (with brute-force), Vigenere, and Morse code (with audible playback).",
         root="../", code="CIPHER_DECK", category="GAMES_CURIOS",
         js=["tool-cipher-deck.js"]),
    dict(out="pages/letter-rack-solver.html", fragment="letter-rack-solver.html", title="Letter Rack Solver",
         desc="Find every valid word from a letter rack, including blank tiles, sorted by point value. Independent tool, not affiliated with or endorsed by any board game publisher.",
         root="../", code="LETTER_RACK_SOLVER", category="GAMES_CURIOS",
         js=["data-words.js", "tool-scrabble.js"]),
    dict(out="pages/anagram-solver.html", fragment="anagram-solver.html", title="Anagram Solver",
         desc="Exact anagrams and sub-word matches from any set of letters, 52,000-word dictionary.",
         root="../", code="ANAGRAM_SOLVER", category="GAMES_CURIOS",
         js=["data-words.js", "tool-anagram.js"]),
    dict(out="pages/wu-name.html", fragment="wu-name.html", title="Name Generator",
         desc="Classic first-letter-indexed name generator - deterministic, not random.",
         root="../", code="WU_NAME", category="GAMES_CURIOS",
         js=["tool-wu-name.js"]),
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

    dict(out="pages/about.html", fragment="about.html", title="Origin Log",
         desc="GAMA⁺, in her own words. Not exactly a straight answer.",
         root="../", code="ORIGIN_LOG", category=None, breadcrumb_cat="ABOUT", js=[]),
    dict(out="pages/wiki-index.html", fragment="wiki-index.html", title="GAMA+ Wiki",
         desc="Technical trivia, privacy/OSINT reference entries, and dumb conversation-enders, filed as they get salvaged.",
         root="../", code="GAMA_WIKI", category=None, breadcrumb_cat="WIKI", js=[]),
    dict(out="pages/log.html", fragment="log.html", title="Log",
         desc="GAMA⁺'s own transmissions, mixed with what actually shipped - newest first.",
         root="../", code="LOG_FEED", category=None, breadcrumb_cat="LOG",
         js=["data-log-entries.js", "tool-log-feed.js"]),

    # Utility/meta pages: footer-only, not in the sidebar nav or tool grid,
    # but still get a breadcrumb via breadcrumb_cat.
    dict(out="pages/legal.html", fragment="legal.html", title="Legal & Privacy",
         desc="Privacy policy, terms of use, advertising disclosure.",
         root="../", code="LEGAL", category=None, breadcrumb_cat="SYSTEM", js=[]),
    dict(out="pages/privacy.html", fragment="privacy.html", title="Privacy Policy",
         desc="How gamayun.site collects, uses, and discloses information, including Google AdSense and Analytics disclosures.",
         root="../", code="PRIVACY", category=None, breadcrumb_cat="SYSTEM", js=[]),
    dict(out="pages/terms.html", fragment="terms.html", title="Terms of Service",
         desc="Terms governing use of gamayun.site.",
         root="../", code="TERMS", category=None, breadcrumb_cat="SYSTEM", js=[]),
    dict(out="pages/contact.html", fragment="contact.html", title="Contact",
         desc="Get in touch.", root="../", code="CONTACT", category=None,
         breadcrumb_cat="SYSTEM", js=[]),
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


def build_tabs_html(current_section, root):
    """Top-level tab bar - real links to each section's landing page (not
    client-side show/hide), so every page keeps its own crawlable URL.
    The active tab is whichever section the current page belongs to."""
    lines = []
    for key, label, target in SECTIONS:
        active = " active" if key == current_section else ""
        lines.append(f'                    <a href="{root}{target}" class="tab-btn{active}" data-tab="{key}">{label}</a>')
    return "\n".join(lines)


def build_nav_html(current_out, root, current_section):
    """Grouped sidebar nav: DECK_LAUNCHER standalone up top, then every
    category with a page in it, in CATEGORIES order. Each category is a
    native <details> disclosure - collapsed by default, no custom JS needed
    - except the one containing the current page, which opens automatically
    so navigating never buries you. `root` is interpolated directly (not
    left as a {{ROOT}} token) since this HTML is spliced in after the base
    template's own {{ROOT}} substitution pass already ran.

    Categories are TOOLS-only sub-groups, so outside the tools section
    (Wiki/Log/About pages) this only renders the DECK_LAUNCHER link back
    to Tools - a category list of e.g. RECON_OPS would be meaningless on
    the Wiki page."""
    home = PAGES[0]
    lines = []
    active = " active" if current_out == home["out"] else ""
    lines.append(f'                <a href="{root}index.html" class="nav-link{active}">{nav_link_label(home["code"])}</a>')
    if current_section != "tools":
        return "\n".join(lines)
    for cat_key, cat_label in CATEGORIES:
        pages_in_cat = [p for p in PAGES if p.get("category") == cat_key]
        if not pages_in_cat:
            continue
        has_active = any(p["out"] == current_out for p in pages_in_cat)
        open_attr = " open" if has_active else ""
        lines.append(f'                <details class="nav-section"{open_attr}>')
        lines.append(f'                    <summary class="nav-section-label">[ {cat_label} ]</summary>')
        for p in pages_in_cat:
            active = " active" if p["out"] == current_out else ""
            lines.append(f'                    <a href="{root}{p["out"]}" class="nav-link{active}">{nav_link_label(p["code"])}</a>')
        lines.append(f'                </details>')
    return "\n".join(lines)


def nav_link_label(code):
    """'&gt;' glued to the label via a non-breaking space, and the label
    itself allowed to break internally (overflow-wrap:anywhere in CSS) -
    without this, a long underscore-joined code like HTML_ENTITY_CODEC has
    no ordinary break point except the space after '&gt;', so the arrow
    stranded itself alone on its own line with the label overflowing below
    it instead of wrapping."""
    return f'&gt;&nbsp;<span class="nav-link-label">{code}</span>'


def build_jsonld_html(page):
    """schema.org/WebApplication block for real tool pages (anything with
    a category - the actual utilities, not wiki/log/about/legal pages).
    Per GAMA BIBLE section G: wins "People Also Ask" / rich-result boxes
    without writing blogspam. validate.py's scan_jsonld_required_keys()
    already enforces @context/@type/name on any block that exists - this
    is what actually populates them. Uses the page's own title/desc, no
    separate content to keep in sync."""
    if not page.get("category"):
        return ""
    domain = "https://gamayun.site"
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
    return f'    <script type="application/ld+json">{json.dumps(data)}</script>'


def build_breadcrumb_html(page, root):
    """'> DECK_LAUNCHER / CATEGORY / PAGE_CODE' trail. Omitted for the
    homepage and pages with no code/category at all (special pages)."""
    if page["out"] == "index.html" or not page.get("code"):
        return ""
    cat_label = None
    if page.get("category"):
        cat_label = dict(CATEGORIES)[page["category"]]
    elif page.get("breadcrumb_cat"):
        cat_label = page["breadcrumb_cat"]
    crumbs = [f'<a href="{root}index.html">DECK_LAUNCHER</a>']
    if cat_label:
        crumbs.append(cat_label)
    crumbs.append(page["code"])
    return '            <div class="breadcrumb">&gt; ' + ' <span class="breadcrumb-sep">/</span> '.join(crumbs) + '</div>'


def build_tool_grid_html():
    """Homepage tool grid, grouped into the same categories as the nav."""
    sections = []
    for cat_key, cat_label in CATEGORIES:
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
            f'                <div class="grid-section-label">[ {cat_label} ]</div>\n'
            f'                <div class="tool-grid-row">\n' + "\n".join(items) + "\n                </div>"
        )
    return "\n".join(sections)


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


def build():
    count = 0
    tool_grid_html = build_tool_grid_html()
    human_sitemap_html = build_human_sitemap_html()
    for page in PAGES:
        with open(os.path.join(SRC, "content", page["fragment"]), encoding="utf-8") as f:
            content = f.read()
        content = content.replace("{{TOOL_GRID}}", tool_grid_html)
        content = content.replace("{{HUMAN_SITEMAP}}", human_sitemap_html)

        section = page_section(page)
        out = BASE
        out = out.replace("{{TITLE}}", page["title"])
        out = out.replace("{{DESCRIPTION}}", page["desc"])
        out = out.replace("{{JSONLD}}", build_jsonld_html(page))
        out = out.replace("{{ROOT}}", page["root"])
        out = out.replace("{{TABS}}", build_tabs_html(section, page["root"]))
        out = out.replace("{{NAV}}", build_nav_html(page["out"], page["root"], section))
        out = out.replace("{{BREADCRUMB}}", build_breadcrumb_html(page, page["root"]))
        out = out.replace("{{CONTENT}}", content)

        extra_js_html = "\n".join(
            f'    <script src="{page["root"]}js/{fname}"></script>' for fname in page["js"]
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


# GAMA's own first-person, pruned-of-jargon summary of what shipped each
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
    domain = "https://gamayun.site"
    urls = []
    for page in PAGES:
        if page["out"].endswith("404.html") or page["out"].endswith("gndn.html") or page["out"].endswith("scrapbook.html"):
            continue  # don't invite crawlers to index the error page or the easter eggs
        urls.append(f'  <url>\n    <loc>{domain}/{page["out"]}</loc>\n  </url>')
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
        "Sitemap: https://gamayun.site/sitemap.xml\n"
    )
    with open(os.path.join(ROOT_DIR, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(content)
    print("  built robots.txt")


if __name__ == "__main__":
    build()
