#!/usr/bin/env bash
# Every `VITE_*` variable a site reads is set by a workflow, or written down
# here as deliberately unset.
#
# Vite inlines `import.meta.env.VITE_X` at build time and substitutes
# `undefined` when the variable is absent. Nothing fails: not the build, not
# the type checker, not a test. The feature behind the variable simply never
# runs, in every stage, for as long as nobody looks. `VITE_SENTRY_DSN` was in
# that state while a blueprint advertised the module reading it as this
# repository's canonical observability adapter.
#
# So the pairing is the check: the set of variables read has to equal the set
# of variables set, and a variable in the first set only is either a wiring
# bug or a decision. A decision goes in ALLOWED_UNSET below with the reason,
# which is what makes it reviewable.
set -euo pipefail

cd "$(dirname "$0")/.."

# Read but deliberately not set, with the reason. Removing a line from here
# without setting the variable is what the check is for.
declare -A ALLOWED_UNSET=(
  [VITE_SENTRY_DSN]="reporting is off until a Sentry project and secret exist; see docs/adr/ and the sentry.ts header"
)

readonly VARIABLE_PATTERN='VITE_[A-Z0-9_]*'

list_read_variables() {
  # The git index rather than a filesystem walk, for the same reason
  # check-single-stylesheet.sh reads it: `coverage/` and `.stryker-tmp/` are
  # gitignored and full of copies that would each match. Listing the files
  # first also keeps this correct across both site layouts — `site/src/` in
  # pragma and last-loop-lepin, `site/` directly in borso-fr and
  # borsouvertures — which a `site/src` glob silently misses.
  git ls-files -- ':(glob)apps/*/site/**' |
    { grep -E '\.tsx?$' || true; } |
    tr '\n' '\0' |
    xargs -0 --no-run-if-empty grep -ho "$VARIABLE_PATTERN" |
    grep -E "^VITE_[A-Z0-9_]+$" |
    sort -u
}

list_set_variables() {
  # `VITE_` on its own appears in prose inside workflow comments, so the
  # trailing-character class keeps the bare prefix out of the comparison.
  grep -rho "$VARIABLE_PATTERN" .github/workflows/ 2>/dev/null |
    grep -E "^VITE_[A-Z0-9_]+$" |
    sort -u
}

unset_variables=$(comm -23 <(list_read_variables) <(list_set_variables))

failed=0
while read -r variable; do
  [ -z "$variable" ] && continue
  if [ -n "${ALLOWED_UNSET[$variable]+set}" ]; then
    echo "  $variable is read and deliberately unset: ${ALLOWED_UNSET[$variable]}"
    continue
  fi
  echo "  $variable is read by a site and set by no workflow, so the code behind it never runs." >&2
  echo "    Set it in .github/workflows/{deploy,preview}.yml, or add it to ALLOWED_UNSET in $0 with a reason." >&2
  failed=1
done <<<"$unset_variables"

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "[check-frontend-env-vars] every VITE_ variable a site reads is set or accounted for"
