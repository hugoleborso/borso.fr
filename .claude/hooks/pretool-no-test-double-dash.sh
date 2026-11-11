#!/usr/bin/env bash
# PreToolUse hook for `pnpm … run test… -- <files>`.
#
# pnpm hands the `--` on to the script, and Vitest files every argument after
# it away as passthrough, so the file filter is dropped without a word and the
# whole project runs. PR #193 lost about nine minutes to it, and the knowledge
# entry written then printed on the call. PR #290 ran the whole e2e suite the
# same way anyway, so the call is refused rather than annotated.
#
# See docs/knowledge/pnpm-run-test-double-dash-drops-the-filter.md.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 2 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct.

set -euo pipefail

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
  python3 "$(dirname "$0")/strip-heredocs.py" |
  python3 "$(dirname "$0")/strip-quoted-strings.py")"

if ! grep -qE 'pnpm\b[^|;&]*\brun[[:space:]]+test(:[a-z0-9-]+)?[[:space:]]+--([[:space:]]|$)' <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

echo "[no-test-double-dash] pnpm passes the -- on to Vitest, which then drops your file filter and runs every file." >&2
echo "[no-test-double-dash] Drop the --:" >&2
echo "[no-test-double-dash]   pnpm --filter <pkg> run test:e2e <files>" >&2
echo "[no-test-double-dash] Or call Vitest with its project:" >&2
echo "[no-test-double-dash]   pnpm exec vitest run --project <name> <files>" >&2
"$(dirname "$0")/kaizen-refusal.sh" no-test-double-dash "passed -- to a pnpm test script, which makes Vitest run every file"
exit 2
