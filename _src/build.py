#!/usr/bin/env python3
"""
GAMAYUN site builder. Zero external dependencies (stdlib only).
Assembles _src/templates/base.html + _src/content/*.html fragments
into the final static site. Output is plain HTML/CSS/JS - nothing
about the shipped site depends on this script running again.

To add a new page: drop a fragment in _src/content/, add one line
to PAGES below, run this script.
"""
import os

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SRC)

with open(os.path.join(SRC, "templates", "base.html"), encoding="utf-8") as f:
    BASE = f.read()

# (output relative path, content fragment, title, description, root prefix, nav key, [extra js files])
PAGES = [
    ("index.html", "home.html", "Orbital Salvage Archive",
     "Free client-side web tools. No uploads, no tracking, no server.",
     "", "NAV_HOME", []),
    ("pages/links.html", "links.html", "Link Purge",
     "Strip tracking parameters from any URL, entirely client-side.",
     "../", "NAV_LINKS", ["tool-link-cleaner.js"]),
    ("pages/time-logic.html", "time-logic.html", "Date Stamp Recon",
     "Convert human timestamps to ISO 8601, Unix epoch, filename-safe stamps.",
     "../", "NAV_TIME", ["tool-date-stamp.js"]),
    ("pages/number-spell.html", "number-spell.html", "What Does My Number Spell",
     "Decode any phone number against a 52,000-word dictionary via classic T9 mapping.",
     "../", "NAV_SPELL", ["data-words.js", "tool-number-spell.js"]),
    ("pages/scrabble.html", "scrabble.html", "Scrabble Solver",
     "Find every valid word from a letter rack, including blank tiles, sorted by point value.",
     "../", "", ["data-words.js", "tool-scrabble.js"]),
    ("pages/text-case.html", "text-case.html", "Case Converter",
     "Convert text to upper/lower/title/sentence/camel/snake/kebab case.",
     "../", "", ["tool-text-case.js"]),
    ("pages/letter-counter.html", "letter-counter.html", "Letter & Word Counter",
     "Character, word, sentence, and line counts plus reading time estimate.",
     "../", "", ["tool-letter-counter.js"]),
    ("pages/cool-text.html", "cool-text.html", "Cool Text Generator",
     "Convert text into Unicode bold, italic, script, double-struck, and other fancy variants.",
     "../", "", ["tool-cool-text.js"]),
    ("pages/calc-bmi.html", "calc-bmi.html", "BMI Calculator", "Body mass index calculator.", "../", "", ["tool-calculators.js"]),
    ("pages/calc-percentage.html", "calc-percentage.html", "Percentage Calculator", "What percent is X of Y.", "../", "", ["tool-calculators.js"]),
    ("pages/calc-tip.html", "calc-tip.html", "Tip Calculator", "Tip amount and per-person split.", "../", "", ["tool-calculators.js"]),
    ("pages/calc-age.html", "calc-age.html", "Age Calculator", "Exact age in years, months, and days from a birthdate.", "../", "", ["tool-calculators.js"]),
    ("pages/base64.html", "base64.html", "Base64 Codec",
     "Encode or decode Base64, UTF-8 safe including emoji.",
     "../", "", ["tool-base64.js"]),
    ("pages/ascii-art.html", "ascii-art.html", "ASCII Banner Generator",
     "Render any text as ASCII density art via canvas sampling.",
     "../", "", ["tool-ascii-art.js"]),
    ("pages/symbol-glossary.html", "symbol-glossary.html", "Symbol Glossary",
     "Common HTML entities and Unicode symbols, click to copy.",
     "../", "", ["tool-symbol-glossary.js"]),
    ("pages/color.html", "color.html", "Color Converter",
     "Hex, RGB integer, RGB float, and HSL, all at once.",
     "../", "", ["tool-color.js"]),
    ("pages/json-format.html", "json-format.html", "JSON Formatter",
     "Beautify or minify JSON with real error messages.",
     "../", "", ["tool-json.js"]),
    ("pages/uuid.html", "uuid.html", "UUID Generator",
     "Cryptographically random v4 UUIDs.",
     "../", "", ["tool-uuid.js"]),
    ("pages/hash.html", "hash.html", "Hash Generator",
     "SHA-1/256/384/512 via the browser's native crypto API.",
     "../", "", ["tool-hash.js"]),
    ("pages/about.html", "about.html", "Origin Log",
     "Who is G.A.M.A., and what happened to G.A.R.R.Y.",
     "../", "NAV_ABOUT", []),
    ("pages/legal.html", "legal.html", "Legal & Privacy",
     "Privacy policy, terms of use, advertising disclosure.",
     "../", "", []),
    ("pages/contact.html", "contact.html", "Contact",
     "Get in touch.",
     "../", "", []),
    ("pages/wiki-index.html", "wiki-index.html", "Chrono-Wiki",
     "A technical archive on how machines keep time.",
     "../", "NAV_WIKI", []),
    ("pages/sitemap.html", "sitemap.html", "Sitemap",
     "Full index of every page on this ship.",
     "../", "", []),
    ("pages/changelog.html", "changelog.html", "Maintenance Log",
     "G.A.M.A.'s patch history - what got added or changed, and when.",
     "../", "", []),
    ("pages/gndn.html", "gndn.html", "GNDN",
     "Goes nowhere, does nothing. Yet.",
     "../", "", []),
    ("pages/404.html", "404.html", "Signal Lost",
     "Page not found.",
     "../", "", []),
]

NAV_KEYS = ["NAV_HOME", "NAV_LINKS", "NAV_TIME", "NAV_SPELL", "NAV_ABOUT", "NAV_WIKI"]

def build():
    count = 0
    for out_rel, fragment, title, desc, root, nav_active, extra_js in PAGES:
        with open(os.path.join(SRC, "content", fragment), encoding="utf-8") as f:
            content = f.read()

        page = BASE
        page = page.replace("{{TITLE}}", title)
        page = page.replace("{{DESCRIPTION}}", desc)
        page = page.replace("{{ROOT}}", root)
        page = page.replace("{{CONTENT}}", content)

        extra_js_html = "\n".join(
            f'    <script src="{root}js/{fname}"></script>' for fname in extra_js
        )
        page = page.replace("{{EXTRA_JS}}", extra_js_html)

        for key in NAV_KEYS:
            page = page.replace("{{" + key + "}}", "active" if key == nav_active else "")

        out_path = os.path.join(ROOT_DIR, out_rel)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)
        count += 1
        print(f"  built {out_rel}")
    print(f"\n{count} pages built.")
    build_sitemap_xml()
    build_robots_txt()

def build_sitemap_xml():
    """Machine-readable sitemap for search engines - separate from the
    human-readable pages/sitemap.html. Auto-derived from PAGES so it can't
    drift out of sync. This is the exact thing the yoyotools.com creator
    skipped and then couldn't get indexed for 3 months."""
    domain = "https://gamayun.site"
    urls = []
    for out_rel, fragment, title, desc, root, nav_active, extra_js in PAGES:
        if out_rel.endswith("404.html") or out_rel.endswith("gndn.html"):
            continue  # don't invite crawlers to index the error page or the easter egg
        loc = f"{domain}/{out_rel}"
        urls.append(f"  <url>\n    <loc>{loc}</loc>\n  </url>")
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
        "Sitemap: https://gamayun.site/sitemap.xml\n"
    )
    with open(os.path.join(ROOT_DIR, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(content)
    print("  built robots.txt")

if __name__ == "__main__":
    build()
