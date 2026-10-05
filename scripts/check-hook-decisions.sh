#!/usr/bin/env bash
# The refusing hooks ship with the borso-harness plugin, and so does the table
# that holds them to their contract. Pre-commit and the standards call it here.
exec "$(dirname "$0")/../plugins/borso-harness/scripts/check-hook-decisions.sh" "$@"
