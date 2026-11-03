#!/usr/bin/env bash
# PreToolUse hook that refuses Prettier in a repository that formats with oxfmt.
#
# borso.fr replaced Prettier with oxfmt (ADR 0045), and the two disagree on
# enough lines that `prettier --write` over a folder reformats files nobody
# meant to touch. Agents reach for Prettier by habit: PR #251 and PR #252 each
# ran it on the same day and each committed a cleanup of the unrelated files it
# had rewritten. A stray `.prettierrc.json` at the root made the habit look
# right, and is gone with this hook.
#
# The hook refuses rather than rewrites, because Prettier's flags (`--cache`,
# `--ignore-unknown`, `--log-level`) have no oxfmt spelling to translate to.
#
# A repository with no oxfmt binary is left alone: this hook ships in a plugin
# that a Prettier repository can install.
#
# See docs/dantotsus/prettier-ran-in-an-oxfmt-repository.md.
#
# Output contract (Claude Code PreToolUse hook): exit 2 with a message on
# stderr blocks the call and shows the message to the agent.

set -euo pipefail

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -x node_modules/.bin/oxfmt ] || exit 0

COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
  python3 "$(dirname "$0")/strip-heredocs.py" |
  python3 "$(dirname "$0")/strip-quoted-strings.py")"

# Prettier as the command word, bare, by path, or behind a package runner. A
# mention as an argument, such as `grep -rn prettier docs`, runs nothing.
RUNNER='(npx|bunx|exec|dlx|pnpm|yarn)[[:space:]]+(-[^[:space:]]+[[:space:]]+)*'
if grep -qE "(^[[:space:]]*|[;&|(][[:space:]]*|$RUNNER)([^[:space:]]*/)?prettier([[:space:]]|\$)" <<<"$COMMAND_TO_RUN"; then
  echo "[no-prettier] This repository formats with oxfmt, and Prettier rewrites lines oxfmt leaves alone." >&2
  echo "[no-prettier] Format only the files you changed, with oxfmt:" >&2
  echo "[no-prettier]   pnpm exec oxfmt <files>          (writes)" >&2
  echo "[no-prettier]   pnpm exec oxfmt --check <files>  (checks)" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-prettier "ran Prettier in a repository that formats with oxfmt"
  exit 2
fi

exit 0
