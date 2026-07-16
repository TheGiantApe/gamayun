#!/bin/sh
# GAMAYUN pre-commit hook template. .git/hooks isn't version-controlled
# by git itself, so this lives here and gets installed with one command:
#
#   cp _src/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
#
# Blocks a commit if validate.py finds an identity leak, a known typo,
# or a malformed JSON-LD block. See _src/validate.py for what it checks.

REPO_ROOT="$(git rev-parse --show-toplevel)"

python3 "$REPO_ROOT/_src/validate.py"
STATUS=$?

if [ $STATUS -ne 0 ]; then
    echo ""
    echo "Commit blocked by _src/validate.py. Fix the issues above, or in a"
    echo "genuine emergency: git commit --no-verify (don't make this a habit)."
    exit 1
fi

exit 0
