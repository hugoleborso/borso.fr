#!/usr/bin/env bash
# A directory walk piped into a consumer that stops early is a race.
#
# `find … | head -1` under `set -o pipefail` has two outcomes and the timing
# picks one. `head` closes the pipe after the first line; if `find` has already
# finished walking, it exits 0 and the script carries on, and if it is still
# writing it gets a write error, exits non-zero, and `pipefail` fails the whole
# script on `find: 'standard output': Broken pipe`.
#
# The wider the tree, the more likely the failing side, which is why this passed
# five consecutive local runs of a two-workspace tree and failed on the first CI
# run of the same commit. Nothing about the failure names the pipe.
#
# `find … -print -quit` asks the same question with no pipe: find stops itself
# at the first match and exits 0. `grep -q` reading a walk has the same shape,
# and the same answer.
#
# Only a walking producer is flagged. `ls -d` over a two-entry glob and `grep`
# over one file finish before a consumer can close anything, so the race is not
# reachable there and rewriting them would be noise.
#
# Backslash continuations are joined before matching. The instance this was
# written for spread `find` over five lines and put `| head -1` on the last, so
# a line-by-line grep sees neither half of it.
#
# See docs/dantotsus/the-gate-that-failed-on-a-broken-pipe.md.
set -euo pipefail

cd "$(dirname "$0")/.."

# A walking producer, then a pipe, then a consumer that stops reading early.
# `find` and `git ls-files` both stream while they work; `head` and `grep -q`
# both stop before the producer is done.
RACY_PIPELINE='(find|git ls-files)[^|]*\|[[:space:]]*(head|grep -q)'

failed=0

while read -r script; do
  [ -z "$script" ] && continue
  grep -q 'set -o pipefail\|set -[a-z]*o pipefail' "$script" || continue

  # Join backslash continuations, drop comment lines, keep the line number of
  # the line each logical statement started on.
  joined=$(
    awk '
      { text = $0 }
      buffer != "" { text = buffer text; buffer = "" }
      text ~ /\\$/ { sub(/\\$/, "", text); buffer = text; next }
      { sub(/^[ \t]*/, "", text); if (text !~ /^#/) print start ":" text; start = "" }
      { if (start == "") start = NR + 1 }
      NR == 1 { start = 2 }
    ' "$script"
  )

  matches=$(printf '%s\n' "$joined" | { grep -E "$RACY_PIPELINE" || true; })
  [ -z "$matches" ] && continue

  echo "[check-no-racy-pipelines] $script pipes a directory walk into a consumer that stops early:" >&2
  printf '%s\n' "$matches" | sed 's/^/    /' >&2
  failed=1
done < <(git ls-files -- '*.sh' '.husky/*')

if [ "$failed" -ne 0 ]; then
  echo "[check-no-racy-pipelines] under \`set -o pipefail\` the producer's write error fails the script, and whether it happens is timing. Use \`find … -print -quit\`." >&2
  exit 1
fi

echo "[check-no-racy-pipelines] no script pipes a directory walk into an early-stopping consumer"
