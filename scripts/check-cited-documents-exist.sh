#!/usr/bin/env bash
# A script that cites a document has to cite one that is there.
#
# `check-doc-links.ts` reads markdown, and a shell script is not markdown. So
# the citations that matter most — the line at the top of a gate saying which
# dantotsu it eradicates, which is the only thread from the mechanism back to
# the reasoning — were the ones nothing checked.
#
# Two had rotted. `check-dated-records-are-append-only.sh` pointed at
# `a-rename-rewrote-the-record-of-a-past-review.md` and
# `preflight-preview-recovery.sh` at `preview-deploy-orphans-block-recreate.md`.
# Neither was ever written. A reader following either one looks for a file, does
# not find it, and has to decide whether the gate is wrong or the corpus is —
# with nothing to go on either way.
#
# Test files are skipped: a fixture path is made up on purpose, and four of the
# six matches on the tree this was written against were exactly that.
#
# See docs/dantotsus/the-link-checker-skipped-the-folder-it-was-trusted-for.md.
set -euo pipefail

cd "$(dirname "$0")/.."

CITING_SURFACES=('scripts/*' '.husky/*' '.github/*')

citations="$(
  git ls-files "${CITING_SURFACES[@]}" |
    grep -vE '\.test\.(ts|tsx|js)$' |
    xargs grep -onE 'docs/[A-Za-z0-9/._-]+\.md' 2>/dev/null |
    sort -u
)"

failed=0

while IFS= read -r citation; do
  [ -n "$citation" ] || continue
  document="${citation##*:}"
  location="${citation%:*}"
  if [ ! -f "$document" ]; then
    failed=1
    echo "[check-cited-documents-exist] ${location}: cites ${document}, which is not there" >&2
  fi
done <<<"$citations"

if [ "$failed" -ne 0 ]; then
  echo "[check-cited-documents-exist] The line at the top of a gate naming its dantotsu is the" >&2
  echo "  only thread from the mechanism back to the reasoning. Point it at the entry that" >&2
  echo "  exists, or state the reason in the header and cite nothing — a citation to a file" >&2
  echo "  that was never written is worse than no citation, because it sends a reader looking." >&2
  exit 1
fi

echo "[check-cited-documents-exist] every document a script, hook or workflow cites is there"
