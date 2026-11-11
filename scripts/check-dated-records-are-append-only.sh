#!/usr/bin/env bash
# A dated record of something that happened is not editable.
#
# `docs/**/validation/` holds verdicts: what a validator saw on a given day and
# what it refused. Their value is that they were true when they were written.
# Editing one does not correct the record, it destroys it — and the reader has no way to
# tell, because the file still carries its original date in its own name.
#
# This is not hypothetical. A repository-wide `sed` rename, run to move a symbol
# across the tree, matched inside a validation report from months earlier and
# silently rewrote the finding it contained. Nothing failed; the diff was one
# line among four hundred.
#
# Adding a record is always fine. Deleting one is caught too, for the same
# reason: 545 of these files exist and none of them should ever change.
#
# The entry this line used to cite was never written, which is how a citation
# in a shell header rots: nothing reads it. The paragraph above is the record.
set -euo pipefail

cd "$(dirname "$0")/.."

DATED_RECORD_PATHS=(':(glob)docs/**/validation/**')

# With no argument the staged change is the subject, which is what pre-commit
# needs. With a base ref the subject is everything the branch did to it, which is
# what CI needs: a runner has nothing staged, so a `--cached` read there would be
# a gate that always passes — the shape this repository has a dantotsu about.
BASE_REF="${1:-}"
if [ -n "$BASE_REF" ]; then
  RANGE_START=$(git merge-base "$BASE_REF" HEAD)
  subject=(git diff --name-only --diff-filter=MD "$RANGE_START" HEAD --)
  before="$RANGE_START:"
  after="HEAD:"
else
  subject=(git diff --cached --name-only --diff-filter=MD --)
  before="HEAD:"
  after=":"
fi

# ADR ids moved to `2026-11-11T1318` on 2026-11-11, from `202611111318` and
# from the four-digit numbers `0001` to `0052`. A record whose only change is
# that rewrite still says what it said, now with a citation that resolves, so
# the rewrite is allowed and nothing else is. A four-digit number is rewritten
# only where it names its record, as `ADR 0031`, `ADR-0031`, `0031-<slug>` or a
# `[0031]` link to that record, because the same records cite migrations
# `0001` to `0022` too.
id_rewrite=()
for adr in docs/adr/*.md; do
  [[ "${adr##*/}" =~ ^(([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{4}))-(.*)\.md$ ]] || continue
  m=("${BASH_REMATCH[@]}")
  id_rewrite+=(-e "s/\\b${m[2]}${m[3]}${m[4]}${m[5]}\\b/${m[1]}/g")
done
while IFS= read -r legacy; do
  [[ "${legacy##*/}" =~ ^([0-9]{4})-([a-z][a-z0-9-]*)\.md$ ]] || continue
  number="${BASH_REMATCH[1]}"
  slug="${BASH_REMATCH[2]}"
  for adr in docs/adr/[0-9]*-"${slug}".md; do
    [[ "${adr##*/}" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{4})- ]] || continue
    id="${BASH_REMATCH[1]}"
    id_rewrite+=(
      -e "s/\\b${number}-${slug}\\b/${id}-${slug}/g"
      -e "s/\\b(ADRs?[ -])${number}\\b/\\1${id}/gI"
      -e "s/\\[${number}\\](\\([^)]*${id}-${slug})/[${id}]\\1/g"
    )
  done
done < <(git ls-tree --name-only "${before%:}" docs/adr/ 2>/dev/null || true)

only_rewrites_adr_ids() {
  [ "${#id_rewrite[@]}" -gt 0 ] || return 1
  git cat-file -e "${after}$1" 2>/dev/null || return 1
  [ "$(git show "${before}$1" | sed -E "${id_rewrite[@]}")" = "$(git show "${after}$1")" ]
}

# `M` is a modification and `D` a deletion; `A` and `R` are not listed, because a
# new report is the point and a moved folder keeps the bytes.
edited=""
while IFS= read -r record; do
  [ -n "$record" ] || continue
  only_rewrites_adr_ids "$record" && continue
  edited+="${record}"$'\n'
done < <("${subject[@]}" "${DATED_RECORD_PATHS[@]}" || true)
edited="${edited%$'\n'}"

if [ -n "$edited" ]; then
  echo "[check-dated-records-are-append-only] a dated record was edited or deleted:" >&2
  echo "$edited" | sed 's/^/    /' >&2
  echo "[check-dated-records-are-append-only] These files record what was true on the day they were written," >&2
  echo "[check-dated-records-are-append-only] and the date is in the file name, so a reader cannot tell they moved." >&2
  echo "[check-dated-records-are-append-only] Write a new report instead. If a repository-wide rename reached in here," >&2
  echo "[check-dated-records-are-append-only] restore them and scope the rename:  git checkout HEAD -- docs/…" >&2
  exit 1
fi

echo "[check-dated-records-are-append-only] no dated record was edited"
