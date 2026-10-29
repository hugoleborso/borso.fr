#!/usr/bin/env bash
# Run one read-only SELECT against a production schema. The statement is
# assessed and executed inside that application's reader Lambda (ADR-0049),
# which is the only thing holding the SELECT-only database role; this wrapper
# only gives the command a fixed path, so the project's permission allow rule
# can name it without naming a package-manager run, which auto mode may drop.
#
# Usage:
#   scripts/db-read.sh "SELECT count(*) FROM member"
#   APP=last-loop-lepin scripts/db-read.sh "WITH … SELECT …"
#
# APP is pragma (default), last-loop-lepin or banana-rush; STAGE is prod.
# talos is refused: its data is private and agents read it through its own
# API (ADR-0039).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${REPO_ROOT}/node_modules/.bin/tsx" "${REPO_ROOT}/scripts/database/db-read.ts" "$@"
