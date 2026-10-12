#!/usr/bin/env bash
# Print where the consuming repository keeps each thing the harness reads.
#
#   harness-path.sh             every key, one "key<TAB>path" per line
#   harness-path.sh standards   one path, relative to the repository root
#   harness-path.sh --root      the repository root itself
#
# The skills, agents and hooks of this plugin were written inside borso.fr, and
# the paths they name are borso.fr's. Another repository keeps its standards,
# its dantotsus or its friction log somewhere else, or vendors borso.fr and
# reads its standards from the submodule. `.claude/borso-harness.json` at the
# consumer's root maps each key to that repository's path; a key it does not
# set keeps borso.fr's default, so borso.fr itself needs no file at all.
#
# The root is `CLAUDE_PROJECT_DIR` when a hook runs this, and otherwise the git
# top level of the current directory. Claude Code does not export
# `CLAUDE_PROJECT_DIR` to the Bash tool, and the plugin itself may sit inside a
# submodule, so the plugin's own location says nothing about which repository
# is being worked on.

set -euo pipefail

repository_root() {
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    printf '%s\n' "$CLAUDE_PROJECT_DIR"
  else
    git rev-parse --show-toplevel 2>/dev/null || pwd
  fi
}

ROOT="$(repository_root)"
CONFIG="$ROOT/.claude/borso-harness.json"

DEFAULTS='standards	docs/standards
dantotsus	docs/dantotsus
knowledge	docs/knowledge
adr	docs/adr
features	docs/features
kaizenFile	KAIZEN.md
blueprintIndex	.claude/skills/blueprint/blueprint-index.md
reports	scripts/reports.sh
seal	scripts/standards/seal.ts
prBodyCheck	scripts/pr/check-pr-body.ts
browser	scripts/browser.sh
argent	scripts/argent.sh'

resolve() {
  local key="$1" fallback="$2"
  if [ -f "$CONFIG" ]; then
    python3 - "$CONFIG" "$key" "$fallback" <<'PY'
import json, sys
config_path, key, fallback = sys.argv[1:4]
with open(config_path, encoding="utf-8") as handle:
    paths = json.load(handle).get("paths", {})
value = paths.get(key, fallback)
print(fallback if value is None else value)
PY
  else
    printf '%s\n' "$fallback"
  fi
}

case "${1:-}" in
  --root)
    printf '%s\n' "$ROOT"
    ;;
  '')
    while IFS=$'\t' read -r key fallback; do
      printf '%s\t%s\n' "$key" "$(resolve "$key" "$fallback")"
    done <<<"$DEFAULTS"
    ;;
  *)
    fallback="$(awk -F'\t' -v key="$1" '$1 == key { print $2 }' <<<"$DEFAULTS")"
    if [ -z "$fallback" ]; then
      echo "[harness-path] unknown key '$1'. Known keys:" >&2
      cut -f1 <<<"$DEFAULTS" | sed 's/^/  /' >&2
      exit 1
    fi
    resolve "$1" "$fallback"
    ;;
esac
