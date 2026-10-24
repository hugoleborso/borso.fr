#!/usr/bin/env bash
# Every `*.core.ts` and `*.utils.ts` has a caller that is not its own test.
#
# The pure-module gates are the strongest ones this repository owns: 100% per
# file coverage, and a mutation run that fails on a single survivor. Both
# measure a module against its test, and a module whose *only* consumer is that
# test passes both at full marks while running nowhere.
#
# `apps/pragma/api/src/setlists/energy-curve.core.ts` sat in that state: 58
# lines, a full test suite, 100% coverage, and no importer anywhere in the
# repository. knip did not report it either, because every `*.test.ts` is a
# knip entry point, so a source file reached only from its test is reachable by
# construction.
#
# So the strong gates certify dead code, and the dead-code gate is blind to it.
# This check closes the pair by asking the one question neither asks: does
# anything that is not a test import this?
#
# See docs/dantotsus/three-green-gates-on-code-that-ran-nowhere.md.
set -euo pipefail

cd "$(dirname "$0")/.."

# Modules that are reached only from their test, with the reason. Two kinds
# live here and they are not the same thing:
#
#   - test-only by design: the module exists so a test can assert something
#     about the repository, and having no runtime caller is correct.
#   - a live counterpart elsewhere: the logic runs in production from a second,
#     untested copy. That is a consolidation decision, not a deletion, and it
#     is open with the operator rather than settled here.
#
# One shape rather than one line per application: `i18n-parity.core.ts` is
# byte-identical in every application and test-only by design in every one, so a
# roster of exact paths made adding an application mean editing a gate that had
# nothing to say about it. The list below is for the cases that are genuinely
# per-application.
ALLOWED_TEST_ONLY_PATTERN='^apps/[^/]+/site/src/i18n/i18n-parity\.core\.ts$'
ALLOWED_TEST_ONLY_PATTERN_REASON="test-only by design: asserts en/fr catalogue parity"

declare -A ALLOWED_TEST_ONLY=(
  [apps/last-loop-lepin/api/src/runner/runner.core.ts]="deliberately dormant: validateRunnerDraft waits on the relay-format decision, see PR #46"
  [apps/pragma/api/src/mastery/mastery.core.ts]="live counterpart: site/src/lib/mastery-aggregate.core.ts carries meanDefaultMasteryForSong on the front end"
  [apps/last-loop-lepin/site/src/lib/request-position.utils.ts]="never wired: the self-punch flow reads geolocation without it"
)

failed=0

# Every import specifier that ends in a pure module's basename, read in one pass
# over the source as `<importing file>:<specifier tail>`. It used to run one
# `xargs grep` over the whole tree per module, about four hundred of them, and
# took thirteen seconds; one pass is the same question asked once. Import
# specifiers end with the module's basename whatever prefix the caller uses, so
# matching the basename is alias-agnostic: `../songs/tonality.core`,
# `@domain/tonality.core` and `./tonality.core` all end the same way. The
# optional `.js` is not optional in `infra/`, whose ESM imports carry the
# emitted extension.
references=$(
  git ls-files -z -- ':(glob)apps/**/*.ts' ':(glob)apps/**/*.tsx' ':(glob)infra/**/*.ts' |
    xargs -0 --no-run-if-empty grep -oHE "/[A-Za-z0-9_.-]+\.(core|utils)(\.js)?'" 2>/dev/null |
    { grep -v -E '\.test\.tsx?:' || true; } |
    sed -E "s|:/(.*)(\.js)?'\$|\t\1|; s|\.js\$||" |
    sort -u || true
)

modules=$(
  git ls-files -- ':(glob)apps/**/*.core.ts' ':(glob)apps/**/*.utils.ts' ':(glob)infra/**/*.utils.ts' |
    { grep -v -E '\.test\.ts$' || true; }
)

uncalled=$(
  awk -F '\t' '
    NR == FNR { if ($0 != "") callers[$2] = callers[$2] SUBSEP $1; next }
    {
      name = $0
      sub(/^.*\//, "", name)
      sub(/\.ts$/, "", name)
      count = split(callers[name], files, SUBSEP)
      called = 0
      for (index_ = 1; index_ <= count; index_++) {
        if (files[index_] != "" && files[index_] != $0) called = 1
      }
      if (!called) print $0
    }
  ' <(printf '%s\n' "$references") <(printf '%s\n' "$modules")
)

while read -r module; do
  [ -z "$module" ] && continue
  if [ -n "${ALLOWED_TEST_ONLY[$module]+set}" ]; then
    continue
  fi
  if grep -qE "$ALLOWED_TEST_ONLY_PATTERN" <<<"$module"; then
    continue
  fi
  echo "  $module has no caller outside its own test." >&2
  echo "    A pure module reached only from its test scores 100% on coverage and mutation while running nowhere. Delete it, or call it." >&2
  failed=1
done <<<"$uncalled"

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "[check-pure-modules-have-callers] every pure module has a caller outside its test"
