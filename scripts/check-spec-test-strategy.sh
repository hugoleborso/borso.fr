#!/usr/bin/env bash
# A feature spec that never said who checks what.
#
# `/technical-validation` and `/visual-validation` split a spec's assertions
# between them: one reads the code, the other opens a browser. The split is
# supposed to be read off the spec's Test strategy section. Three technical
# validators in one task, running independently against the same spec, each
# logged that the section was missing and each invented the split — which
# means the routing was three different guesses, and a row nobody claimed
# would have been validated by nobody at all.
#
# The section is in the spec template. A spec written by hand, outside
# `/specification`, is the one that loses it, and nothing said so.
#
# See docs/dantotsus/a-spec-that-never-said-who-checks-what.md.
#
# Three specs predate the rule. They are listed below rather than back-filled,
# because inventing a routing for a feature one did not spec is exactly the
# guessing this check exists to stop. The list only shrinks: delete a line when
# that spec gains its section, and never add one.
set -euo pipefail

cd "$(dirname "$0")/.."

PREDATES_THE_RULE="
docs/features/borsouvertures/learn-by-tree/spec/spec.md
docs/features/pragma/album-artwork/spec/spec.md
docs/features/pragma/improvement-backlog/spec/spec.md
"

failed=0

for spec in docs/features/*/*/spec/spec.md; do
  [ -f "$spec" ] || continue
  if printf '%s' "$PREDATES_THE_RULE" | grep -qxF "$spec"; then
    continue
  fi
  if ! grep -qi '^#\+ .*test strategy' "$spec"; then
    echo "[check-spec-test-strategy] $spec has no Test strategy section, so nothing says which assertions are a code reviewer's and which are a browser's." >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "[check-spec-test-strategy] add the section the spec template carries, naming the split per assertion group." >&2
  exit 1
fi

echo "[check-spec-test-strategy] every feature spec names who checks what"
