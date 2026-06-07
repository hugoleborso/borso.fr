#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit) — runs Biome's writer on the file
# just edited, so formatting and safe-fix issues never reach the pre-commit
# `biome check` gate. Without it, a mis-formatted edit only surfaces at commit
# time, forcing a re-commit (the friction this hook eradicates).
#
# Best-effort by contract: this hook ALWAYS exits 0. A Biome failure here must
# never block the edit or feed an error back to the model — the commit-time
# gate is the real enforcement; this is purely an ergonomic pre-pass that keeps
# the working tree continuously formatted.
#
# Requires: jq, and the workspace Biome (resolved via `pnpm exec`).

if ! command -v jq &>/dev/null; then
  exit 0
fi

INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

# Only the file types Biome handles in this repo; everything else is a no-op,
# so we skip spawning Biome at all for Markdown, images, lockfiles, etc.
case "$FILE" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css) ;;
  *) exit 0 ;;
esac

# Run from the project root so Biome resolves the root biome.jsonc (and the
# per-app nested configs), mirroring exactly what the commit-time gate checks.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

pnpm exec biome check --write --no-errors-on-unmatched --files-ignore-unknown=true "$FILE" >/dev/null 2>&1 || true
exit 0
