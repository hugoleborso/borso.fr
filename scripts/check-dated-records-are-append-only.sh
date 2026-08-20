#!/usr/bin/env bash
# A dated record of something that happened is not editable.
#
# `docs/**/validation/` and `docs/standards/reviews/` hold verdicts: what a
# validator saw on a given day, what a standards reviewer cleared and what it
# refused. Their value is that they were true when they were written. Editing
# one does not correct the record, it destroys it — and the reader has no way to
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
# See docs/dantotsus/a-rename-rewrote-the-record-of-a-past-review.md.
set -euo pipefail

cd "$(dirname "$0")/.."

DATED_RECORD_PATHS=(':(glob)docs/**/validation/**' ':(glob)docs/standards/reviews/**')

# With no argument the staged change is the subject, which is what pre-commit
# needs. With a base ref the subject is everything the branch did to it, which is
# what CI needs: a runner has nothing staged, so a `--cached` read there would be
# a gate that always passes — the shape this repository has a dantotsu about.
BASE_REF="${1:-}"
if [ -n "$BASE_REF" ]; then
  RANGE_START=$(git merge-base "$BASE_REF" HEAD)
  subject=(git diff --name-only --diff-filter=MD "$RANGE_START" HEAD --)
else
  subject=(git diff --cached --name-only --diff-filter=MD --)
fi

# `M` is a modification and `D` a deletion; `A` and `R` are not listed, because a
# new report is the point and a moved folder keeps the bytes.
edited=$("${subject[@]}" "${DATED_RECORD_PATHS[@]}" || true)

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
