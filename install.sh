#!/usr/bin/env bash
# dialogue installer (macOS / Linux)
# Usage:  curl -fsSL https://raw.githubusercontent.com/RZX00/socratic-skills/main/install.sh | bash
# Downloads the repository and runs install/sync.py, which installs the always-on rule, the three skills,
# the Codex AGENTS.md block and the Cursor copy, and moves the replaced socratic-* skills to ~/.claude/skills-retired/.
set -euo pipefail

command -v python3 >/dev/null || { echo "python3 is required: https://www.python.org/downloads/"; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL https://codeload.github.com/RZX00/socratic-skills/tar.gz/main | tar -xz -C "$tmp"
python3 "$tmp/socratic-skills-main/install/sync.py" "$@"
echo "Done. Start a new Claude Code / Codex session to load the rule and skills."
