#!/usr/bin/env bash
# Two gates for one subject, caught by the names their authors picked.
#
# This repository shipped `check-migration-numbering.sh` and
# `check-migration-numbers.sh` a day apart. Same `find | sed | sort | uniq -d`
# over the same folders, both wired into pre-commit, each written by a kaizen
# sweep that could not see the other's dantotsu. The enforcement ledger held
# both, because each existed and each ran; it asks whether a mechanism is real,
# never whether two mechanisms are the same one.
#
# Nothing can decide that two shell scripts compute the same answer. What can
# be decided is that two authors, naming the same subject, converged on the
# same words — which is what happened, and what usually happens, because a name
# is written from the subject and there are only so many ways to say it.
#
# So: stem every token of a gate's name to its first few characters and compare
# the sets. `migration-numbering` and `migration-numbers` both fold to
# `migra numbe` and the pair is refused. The 22 gates that existed when this
# was written fold to 22 distinct keys.
#
# It catches a duplicate that names itself as one, and it misses a duplicate
# whose two authors chose unrelated words. That is the trade; the alternative
# is comparing behaviour, which is not decidable, and the miss is the case
# where nothing was going to help.
#
# See docs/dantotsus/the-loop-shipped-the-same-gate-twice.md.
set -euo pipefail

cd "$(dirname "$0")/.."

STEM_LENGTH=5

collisions="$(
  ls scripts/check-*.sh |
    sed 's|scripts/check-||; s|\.sh$||' |
    awk -v stem_length="$STEM_LENGTH" '
      {
        count = split($0, words, "-")
        delete stems
        unique = 0
        for (index_ = 1; index_ <= count; index_++) {
          stem = substr(words[index_], 1, stem_length)
          if (!(stem in stems)) { stems[stem] = 1; sorted[++unique] = stem }
        }
        for (outer = 2; outer <= unique; outer++) {
          for (inner = outer; inner > 1 && sorted[inner - 1] > sorted[inner]; inner--) {
            swap = sorted[inner]; sorted[inner] = sorted[inner - 1]; sorted[inner - 1] = swap
          }
        }
        key = ""
        for (index_ = 1; index_ <= unique; index_++) key = key sorted[index_] " "
        claimants[key] = claimants[key] " check-" $0 ".sh"
      }
      END {
        for (key in claimants) {
          if (split(claimants[key], parts, " ") > 1) print key "|" claimants[key]
        }
      }
    '
)"

if [ -n "$collisions" ]; then
  while IFS='|' read -r key claimants; do
    echo "[check-gate-names-are-distinct] these gates read as the same subject:${claimants}" >&2
    echo "  (every word stems to: ${key})" >&2
  done <<<"$collisions"
  echo "[check-gate-names-are-distinct] Two gates whose names fold together are almost always" >&2
  echo "  one gate written twice, by two people who could not see each other. Read both. If" >&2
  echo "  they check the same thing, keep one and widen it. If they genuinely differ, the" >&2
  echo "  name is what misled you — rename the one whose subject the name states worst." >&2
  exit 1
fi

echo "[check-gate-names-are-distinct] $(ls scripts/check-*.sh | wc -l | tr -d ' ') gates, no two naming one subject"
