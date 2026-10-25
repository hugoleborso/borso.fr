#!/usr/bin/env bash
# Run one read-only SELECT against a production schema, as the SELECT-only
# database role ADR-0044 provisions. The rules live in
# scripts/database/read-only-query.utils.ts; this wrapper only gives the
# command a fixed path, so the project's permission allow rule can name it
# without naming a package-manager run, which auto mode may drop.
#
# Usage:
#   scripts/db-read.sh "SELECT count(*) FROM member"
#   APP=pragma STAGE=prod scripts/db-read.sh "WITH … SELECT …"
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${REPO_ROOT}/node_modules/.bin/tsx" "${REPO_ROOT}/scripts/database/db-read.ts" "$@"
