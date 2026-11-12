#!/usr/bin/env bash
# PreToolUse hook for the Agent tool: creates every scratchpad work folder the
# brief names, before the subagent starts.
#
# CLAUDE.md gives each agent `<scratchpad>/<its-label>/`, and nothing created
# it. A validator's first command redirected a test run into it, the redirect
# failed, and the run was repeated. technical-validator logged that in three
# tasks; once the redirect sat on a background command, which reported exit 0
# and lost the whole gate log.
# See docs/dantotsus/a-work-folder-every-brief-named-and-nobody-made.md.
#
# It never refuses. It only runs `mkdir -p` on paths of the form
# /tmp/claude-<n>/<project>/<session>/scratchpad/<label>, so a brief cannot
# make it create anything outside a session scratchpad.

set -uo pipefail

PROMPT="$(jq -r '.tool_input.prompt // ""')"

grep -oE '/tmp/claude-[0-9]+/[^/[:space:]]+/[^/[:space:]]+/scratchpad/[A-Za-z0-9_][A-Za-z0-9._-]*' <<<"$PROMPT" \
  | sort -u \
  | while read -r folder; do mkdir -p "$folder"; done

exit 0
