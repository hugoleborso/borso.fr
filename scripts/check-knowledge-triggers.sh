#!/usr/bin/env bash
# Every knowledge entry declares the moments it applies to, so a hook can put it
# in front of the agent at that moment. An entry with no trigger is read only by
# someone who already suspects its answer, which is how nine dantotsus came to
# record an entry that existed and was not read.
# See docs/adr/0030-knowledge-is-delivered-by-trigger.md.
set -euo pipefail

cd "$(dirname "$0")/.."

exec python3 plugins/borso-harness/scripts/knowledge-triggers.py check
