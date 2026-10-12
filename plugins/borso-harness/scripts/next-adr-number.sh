#!/usr/bin/env bash
# Print the next ADR number that no branch on origin has taken.
#
# An ADR number is the highest one in docs/adr plus one, and the tree an
# author reads is only their own branch and main. Every other open branch is
# invisible, so parallel branches each took the same "next" number, and
# check-numbered-sequences.sh refused the second one only once both reached
# one tree. A coordinator then tried reserving numbers by message: 0028 to
# 0030 were promised to three agents while a kaizen pull request, which never
# saw the message, merged its own 0028. The agent holding the reservation
# renumbered to 0031, and the next branch to 0032.
#
# A pushed branch is already a reservation everyone can read. This reads all
# of them, so the number it prints is free on main and on every branch on
# origin, and nobody needs to hand numbers out. It takes the highest number
# anywhere, stale branches included: a skipped number costs nothing, and the
# sequence already has gaps.
#
# The folder comes from harness-path.sh, so a repository that keeps its records
# elsewhere gets the same answer. See borso.fr's
# docs/dantotsus/the-reservation-nobody-else-could-read.md.
set -euo pipefail

HARNESS_SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
cd "$("$HARNESS_SCRIPTS/harness-path.sh" --root)"

ADR_DIRECTORY="$("$HARNESS_SCRIPTS/harness-path.sh" adr)"
ADR_DIRECTORY="${ADR_DIRECTORY%/}"
ADR_NUMBER_WIDTH=4

git fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*' 2>/dev/null ||
  echo "[next-adr-number] could not fetch origin; reading the branches already fetched" >&2

highest=0
holder='this checkout'

consider() {
  local reference="$1"
  local listing="$2"
  local number
  number=$(printf '%s\n' "$listing" |
    sed -n "s|^${ADR_DIRECTORY}/\([0-9][0-9]*\)-.*\.md$|\1|p" |
    sort -n | tail -1)
  [ -n "$number" ] || return 0
  number=$((10#$number))
  if [ "$number" -gt "$highest" ]; then
    highest=$number
    holder=$reference
  fi
}

consider 'this checkout' "$(find "$ADR_DIRECTORY" -maxdepth 1 -name '*.md' | sed 's|^\./||')"

while read -r reference; do
  consider "$reference" "$(git ls-tree --name-only "$reference" "$ADR_DIRECTORY/" 2>/dev/null || true)"
done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin)

printf '%0*d\n' "$ADR_NUMBER_WIDTH" $((highest + 1))
echo "[next-adr-number] the highest number taken is $(printf '%0*d' "$ADR_NUMBER_WIDTH" "$highest"), on $holder" >&2
