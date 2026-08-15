#!/usr/bin/env bash
# Pre-commit gate: a knowledge entry that says a tool is broken has to say when
# that was checked.
#
# A negative claim about a tool is the most expensive kind of note this
# repository writes, because agents obey it without re-testing and it never
# expires on its own. `driving-previews-with-agent-browser-and-argent.md` said
# argent's `gesture-tap` did not work here. It did. Two phone UX audits, six
# rounds between them, read that line, drove everything through synthetic
# clicks, and reported no touch findings at all — because no touch event was
# ever sent. The note was almost certainly right about what those two runs
# observed and wrong about the tool.
#
# A positive claim fails loudly the first time it is wrong: you run the command
# and it errors. A negative claim fails silently forever, because nobody runs
# the command it warned them off. So it carries a date, and the date is what
# lets the next reader decide whether to believe it or spend two minutes
# re-testing.
#
# The rule: a file under docs/knowledge/ containing a phrase that reads as "this
# does not work" must also carry a line of the form
#
#     Last verified: 2026-08-14 — <how it was checked>
#
# The gate does not fail on age, because a stale date is still an honest one and
# a clock should not redden an unrelated pull request. It prints a warning past
# the horizon so the staleness is visible where somebody is already reading.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

NEGATIVE_CLAIM_PATTERN="does not work|doesn't work|is broken|cannot be used|not usable|never completed"
MARKER_PATTERN="Last verified: [0-9]{4}-[0-9]{2}-[0-9]{2}"
STALE_AFTER_DAYS=180

failed=0
now_epoch="$(date +%s)"

# A quoted "deploy is broken" is somebody being wrong in a story, and a
# withdrawn claim quoted back is the correction itself. Neither asserts
# anything, so quoted and code-spanned text is stripped before matching.
unquoted() {
  sed -E 's/`[^`]*`//g; s/"[^"]*"//g; s/“[^”]*”//g' "$1"
}

for doc in docs/knowledge/*.md; do
  [ -f "$doc" ] || continue
  unquoted "$doc" | grep -qiE "$NEGATIVE_CLAIM_PATTERN" || continue

  if ! grep -qE "$MARKER_PATTERN" "$doc"; then
    printf '\033[31m[negative-claims] FAIL\033[0m %s says something does not work, with no date\n' "$doc"
    printf '  the line that triggers this:\n'
    grep -inE "$NEGATIVE_CLAIM_PATTERN" "$doc" | head -2 | sed 's/^/    /'
    failed=1
    continue
  fi

  claimed_on="$(grep -oE "$MARKER_PATTERN" "$doc" | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')"
  claimed_epoch="$(date -d "$claimed_on" +%s 2>/dev/null || echo "$now_epoch")"
  age_days=$(( (now_epoch - claimed_epoch) / 86400 ))
  if [ "$age_days" -gt "$STALE_AFTER_DAYS" ]; then
    printf '\033[33m[negative-claims] stale\033[0m %s last verified %s (%s days ago) — re-test before believing it\n' \
      "$doc" "$claimed_on" "$age_days"
  fi
done

if [ "$failed" -ne 0 ]; then
  printf '\nAdd a line saying when the claim was last checked, and how:\n'
  printf '  Last verified: %s — <the command you ran and what it answered>\n' "$(date +%F)"
  printf 'An undated "X is broken" steers every future agent away from X forever.\n'
  printf 'See docs/dantotsus/two-audits-that-sent-no-touch-events.md.\n'
  exit 1
fi

printf '[check-negative-claims-are-dated] every "does not work" carries a date\n'
