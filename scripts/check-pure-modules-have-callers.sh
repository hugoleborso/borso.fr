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
declare -A ALLOWED_TEST_ONLY=(
  [apps/borso-fr/site/src/i18n/i18n-parity.core.ts]="test-only by design: asserts en/fr catalogue parity"
  [apps/borsouvertures/site/src/i18n/i18n-parity.core.ts]="test-only by design: asserts en/fr catalogue parity"
  [apps/last-loop-lepin/site/src/i18n/i18n-parity.core.ts]="test-only by design: asserts en/fr catalogue parity"
  [apps/pragma/site/src/i18n/i18n-parity.core.ts]="test-only by design: asserts en/fr catalogue parity"
  [apps/last-loop-lepin/api/src/runner/runner.core.ts]="deliberately dormant: validateRunnerDraft waits on the relay-format decision, see PR #46"
  [apps/pragma/site/src/sw/manifest.utils.ts]="live counterpart: site/public/sw.js reimplements this in plain JS; consolidating needs a SW bundling decision"
  [apps/pragma/site/src/sw/sw-cache.utils.ts]="live counterpart: site/public/sw.js reimplements this in plain JS; consolidating needs a SW bundling decision"
  [apps/pragma/api/src/mastery/mastery.core.ts]="live counterpart: site/src/lib/mastery-aggregate.utils.ts carries meanForSong on the front end"
  [apps/last-loop-lepin/site/src/lib/request-position.utils.ts]="never wired: the self-punch flow reads geolocation without it"
)

failed=0

while read -r module; do
  [ -z "$module" ] && continue
  # Import specifiers end with the module's basename whatever prefix the caller
  # uses, so matching the basename is alias-agnostic: `../songs/tonality.core`,
  # `@domain/tonality.core` and `./tonality.core` all end the same way. The
  # optional `.js` is not optional in `infra/`, whose ESM imports carry the
  # emitted extension — leaving it out reported every construct helper as dead.
  basename_without_extension=$(basename "$module" .ts)
  callers=$(
    git ls-files -- ':(glob)apps/**/*.ts' ':(glob)apps/**/*.tsx' ':(glob)infra/**/*.ts' |
      { grep -v -E '\.test\.tsx?$' || true; } |
      { grep -v -F "$module" || true; } |
      tr '\n' '\0' |
      xargs -0 --no-run-if-empty grep -l -E "/${basename_without_extension//./\\.}(\\.js)?'" 2>/dev/null || true
  )
  if [ -z "$callers" ]; then
    if [ -n "${ALLOWED_TEST_ONLY[$module]+set}" ]; then
      continue
    fi
    echo "  $module has no caller outside its own test." >&2
    echo "    A pure module reached only from its test scores 100% on coverage and mutation while running nowhere. Delete it, or call it." >&2
    failed=1
  fi
done < <(
  git ls-files -- ':(glob)apps/**/*.core.ts' ':(glob)apps/**/*.utils.ts' ':(glob)infra/**/*.utils.ts' |
    { grep -v -E '\.test\.ts$' || true; }
)

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "[check-pure-modules-have-callers] every pure module has a caller outside its test"
