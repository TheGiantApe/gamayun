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
    ("pages/gndn.html", "gndn.html", "GNDN",
     "Goes nowhere, does nothing. Yet.",
     "../", "", []),
    ("pages/404.html", "404.html", "Signal Lost",
     "Page not found.",
     "../", "", []),
]

NAV_KEYS = ["NAV_HOME", "NAV_LINKS", "NAV_TIME", "NAV_ABOUT", "NAV_WIKI"]

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

if __name__ == "__main__":
    build()
