#!/usr/bin/env python3
"""
GAMAYUN validation gate. Zero external dependencies (stdlib only).
Run before build.py - see GAMA BIBLE Section F for the spec this
implements. Exits 1 on any failure so it can be wired into CI or a
pre-commit hook.

Checks:
  1. Identity leaks - forbidden real names/entities, in text files and
     raw image bytes (catches EXIF text fields without needing PIL).
  2. Known typos - ISO-8600 (should be ISO-8601), game-core.js (should
     be gama-core.js).
  3. JSON-LD required-key validation, for whenever schema blocks get
     added to tool pages (no-op today, no tool page carries JSON-LD yet).

To add a new forbidden term: add it to FORBIDDEN_TERMS below and to
the identity-protection memory doc (not tracked in this repo) so the
reasoning behind it doesn't get lost.
"""
import os
import re
import sys

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SRC)

# Real names/entities that must never appear anywhere public-facing.
# Lowercase - matching is case-insensitive. Keep this list in sync with
# the gamayun-identity-protection-list memory doc (private, not in this
# repo) if it ever gets expanded again.
FORBIDDEN_TERMS = [
    "calaci",
    "deville",
    "harbinger document services",
    "omwtfyb",
    "ifym",
]

TEXT_EXTENSIONS = {
    ".html", ".htm", ".js", ".css", ".json", ".xml", ".txt", ".md", ".py",
}
IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico",
}
SKIP_DIRS = {".git", "node_modules", "__pycache__"}

# This file necessarily contains the literal forbidden terms/typos as
# string data (it can't check for them otherwise) - exclude it from its
# own scan rather than special-case every string literal below.
SELF_PATH = os.path.abspath(__file__)

TYPO_PAIRS = [
    ("ISO-8600", "ISO-8601"),
    ("game-core.js", "gama-core.js"),
]

JSONLD_REQUIRED_KEYS = ["@context", "@type", "name"]


def iter_files():
    for dirpath, dirnames, filenames in os.walk(ROOT_DIR):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for filename in filenames:
            yield os.path.join(dirpath, filename)


def build_term_pattern(term):
    """Word-boundary regex so e.g. 'ifym' doesn't match inside 'iifym'
    (the IIFYM macro calculator is a real, unrelated existing tool) the
    same way 'deville' shouldn't match inside 'vaudeville'. A forbidden
    multi-word term like 'harbinger document services' just needs its
    literal sequence to appear; single words need real word boundaries."""
    return re.compile(r"\b" + re.escape(term) + r"\b")


FORBIDDEN_PATTERNS = {term: build_term_pattern(term) for term in FORBIDDEN_TERMS}


def scan_identity_leaks():
    errors = []
    for path in iter_files():
        if os.path.abspath(path) == SELF_PATH:
            continue
        ext = os.path.splitext(path)[1].lower()
        rel = os.path.relpath(path, ROOT_DIR)

        if ext in TEXT_EXTENSIONS:
            try:
                with open(path, encoding="utf-8", errors="ignore") as f:
                    text = f.read().lower()
            except (OSError, UnicodeDecodeError):
                continue
            for term, pattern in FORBIDDEN_PATTERNS.items():
                if pattern.search(text):
                    errors.append(f"{rel}: contains forbidden term '{term}'")

        elif ext in IMAGE_EXTENSIONS:
            # No PIL (stdlib-only rule) - scan raw bytes instead. EXIF
            # and other embedded text metadata is stored as readable
            # ASCII/UTF-8/UTF-16 within the binary, so a byte-level
            # search still catches it without a real EXIF parser. No
            # word-boundary regex here (binary data, not text) - a raw
            # substring hit on a short fragment like 'ifym' is rare
            # enough in binary image data to accept the small risk.
            try:
                with open(path, "rb") as f:
                    raw = f.read().lower()
            except OSError:
                continue
            for term in FORBIDDEN_TERMS:
                term_bytes = term.encode("utf-8")
                if term_bytes in raw:
                    errors.append(f"{rel}: image bytes contain forbidden term '{term}' (check EXIF/metadata)")
    return errors


def scan_typos():
    errors = []
    for path in iter_files():
        if os.path.abspath(path) == SELF_PATH:
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext not in TEXT_EXTENSIONS:
            continue
        rel = os.path.relpath(path, ROOT_DIR)
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except (OSError, UnicodeDecodeError):
            continue
        for wrong, right in TYPO_PAIRS:
            if wrong in text:
                errors.append(f"{rel}: contains '{wrong}', should be '{right}'")
    return errors


def scan_jsonld_required_keys():
    errors = []
    for path in iter_files():
        if not path.endswith(".html"):
            continue
        rel = os.path.relpath(path, ROOT_DIR)
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except (OSError, UnicodeDecodeError):
            continue
        for match in re.finditer(
            r'<script type="application/ld\+json">(.*?)</script>', text, re.DOTALL
        ):
            block = match.group(1)
            for key in JSONLD_REQUIRED_KEYS:
                if f'"{key}"' not in block:
                    errors.append(f"{rel}: JSON-LD block missing required key '{key}'")
    return errors


def main():
    all_errors = []
    all_errors += scan_identity_leaks()
    all_errors += scan_typos()
    all_errors += scan_jsonld_required_keys()

    if all_errors:
        print("VALIDATION FAILED:")
        for e in all_errors:
            print(f"  - {e}")
        return 1

    print("validate.py: all checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
