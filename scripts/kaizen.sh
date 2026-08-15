#!/usr/bin/env bash
# Log one piece of friction to KAIZEN.md, the scratch file `/after-task-dantotsus`
# sweeps when the work merges.
#
#   scripts/kaizen.sh "blueprint generators fail from an app dir, error names a path that never existed"
#   scripts/kaizen.sh --from audit-stage-r2 "tapping +1 twice moves the counter and not the chart"
#   scripts/kaizen.sh show
#
# `--from` names the writer, because the sweep reads differently depending on
# who hit the friction: the same line from four different agents is a systemic
# problem, and from one is a local one. Nothing in the environment identifies a
# subagent, so an agent has to name itself — the prompt that spawns it should
# say which label to use. Defaults to $KAIZEN_AGENT, then to `main`.
#
# Why a script rather than "append to the file":
#
#   * Subagents can call it. A workflow round runs a dozen agents that each hit
#     friction and report it in a return value nobody keeps; one command per
#     agent turns that into the sweep's raw material. PR 50 ran 22 agents and
#     kept none of what they learned the hard way.
#   * Concurrent writers do not corrupt it. Every entry is a single short line
#     opened O_APPEND, which the kernel writes atomically under PIPE_BUF, so a
#     dozen agents appending at once interleave lines rather than characters.
#     Editing the file with a text tool from several agents does not survive
#     that.
#   * It fixes the format, so the sweep reads rows instead of prose.
#
# What belongs here: a defect, a vendor surprise, a correction you were given
# twice, a tool that failed in a way that named the wrong problem, an
# instruction you misread. **The problem only.** Do not write the fix — the
# sweep designs the eradication, and a solution written in the moment is the
# one you already thought of, which is usually the smallest one.
#
# The file is gitignored, so it never lands in a commit; the sweep removes it
# once the kaizen pull request is open.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KAIZEN_FILE="$REPO_ROOT/KAIZEN.md"

HEADER='# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.
'

ensure_file() {
  [ -f "$KAIZEN_FILE" ] || printf '%s\n' "$HEADER" > "$KAIZEN_FILE"
}

WRITER="${KAIZEN_AGENT:-main}"
if [ "${1:-}" = '--from' ]; then
  [ -n "${2:-}" ] || { printf 'usage: scripts/kaizen.sh --from <label> "<what went wrong>"\n' >&2; exit 1; }
  WRITER="$2"
  shift 2
fi

case "${1:-}" in
  '')
    printf 'usage: scripts/kaizen.sh [--from <label>] "<what went wrong, one sentence>" | show\n' >&2
    exit 1
    ;;
  show)
    [ -f "$KAIZEN_FILE" ] || { printf 'no KAIZEN.md yet\n'; exit 0; }
    cat "$KAIZEN_FILE"
    ;;
  init)
    ensure_file
    ;;
  *)
    ensure_file
    # One line, one write. Newlines in the argument would break that guarantee,
    # so they collapse to spaces.
    entry="$(printf '%s' "$*" | tr '\n' ' ')"
    writer="$(printf '%s' "$WRITER" | tr '\n ' '--')"
    printf -- '- [%s] `%s` %s\n' "$(date -u +%H:%M)" "$writer" "$entry" >> "$KAIZEN_FILE"
    printf '\033[36m[kaizen]\033[0m logged as %s: %s\n' "$writer" "$entry"
    ;;
esac
