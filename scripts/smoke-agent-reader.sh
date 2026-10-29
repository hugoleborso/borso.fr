#!/usr/bin/env bash
# Invoke an application's reader Lambda once, right after its production
# deploy, and fail when it does not answer with a row.
#
# This is the only thing in this repository that talks to Aurora DSQL from
# outside a migration. Everything else mocks the driver, and a mock accepts
# every connection parameter, every transaction syntax and every role name — so
# the whole class of "only a real cluster can refuse this" lands at the first
# invocation of a deployed function and nowhere earlier. One SELECT exercises
# the connection parameters, the read-only transaction, the role mapping and
# every environment variable the construct set.
#
# An application with no reader exits 0: its stack publishes no function name,
# which is the normal state for the three ADR-0049 does not cover.
#
#   scripts/smoke-agent-reader.sh pragma
#   scripts/smoke-agent-reader.sh --payload recorded-response.json
#
# The second form judges a response captured earlier, with no AWS call. It is
# how a failed invocation is replayed, and how the gate canary proves this
# refuses.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${REPO_ROOT}/node_modules/.bin/tsx" \
  "${REPO_ROOT}/scripts/database/smoke-agent-reader.ts" "$@"
