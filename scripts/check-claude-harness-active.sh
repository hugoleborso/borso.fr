#!/usr/bin/env bash
# Refuses a commit made by a Claude Code session in which this repository's
# .claude hooks never ran.
#
# Claude Code loads .claude/settings.json from the session's project folder
# only. A hosted session that holds several clones side by side starts in their
# parent folder, so it reads every CLAUDE.md and runs none of these hooks: no
# SessionStart install, no pre-write blueprint context, no knowledge triggers,
# no guards. Nothing says so, and on PR #194 a session walked into two traps
# whose knowledge entries the hook would have printed.
#
# SessionStart records its session id in the shared git directory. A commit
# from a Claude Code session whose id is not recorded there stops here, once,
# until the session runs this script with --acknowledge, which does what
# SessionStart would have done and records the id. Commits made outside Claude
# Code are never concerned.
set -euo pipefail

MARKER_NAME=claude-harness-session
ENTRY=docs/knowledge/borso-fr-attached-to-another-repositorys-session.md

repo_root=$(git rev-parse --show-toplevel)
marker="$(git rev-parse --path-format=absolute --git-common-dir)/$MARKER_NAME"
session="${CLAUDE_CODE_SESSION_ID:-}"

record_session() {
  [ -n "$session" ] && printf '%s\n' "$session" >"$marker"
  return 0
}

if [ "${1:-}" = "--record" ]; then
  record_session
  exit 0
fi

if [ "${1:-}" = "--acknowledge" ]; then
  bash "$repo_root/scripts/install-repo-deps.sh"
  record_session
  echo "[check-claude-harness-active] recorded; now read $ENTRY"
  exit 0
fi

if [ -z "${CLAUDECODE:-}" ] || [ -z "$session" ]; then
  echo "[check-claude-harness-active] not a Claude Code session"
  exit 0
fi

if [ -f "$marker" ] && [ "$(cat "$marker")" = "$session" ]; then
  echo "[check-claude-harness-active] this session runs the repository's hooks"
  exit 0
fi

cat >&2 <<MESSAGE
[check-claude-harness-active] this Claude Code session never ran borso.fr's .claude hooks.

Its project folder is not this clone, so SessionStart, the knowledge triggers,
the blueprint context and the guard hooks were all silent, and any trap they
would have named went unannounced. Run, once for this session:

  scripts/check-claude-harness-active.sh --acknowledge

then read $ENTRY,
reread the knowledge entries for the commands you ran (docs/knowledge/README.md),
and commit again.
MESSAGE
exit 1
