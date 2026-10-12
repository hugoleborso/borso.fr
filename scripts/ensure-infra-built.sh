#!/usr/bin/env bash
# Build @borso/infra when this checkout has no current dist/ for it.
#
# Every app's cdk/ folder and infra/shared import @borso/infra by its package
# entry, and that entry is dist/index.d.ts. dist/ is gitignored, and the only
# thing that built it was the SessionStart hook, which runs in the session's
# own checkout and never in a worktree made for a subagent. So a subagent's
# first typecheck or type-aware lint failed with TS2307 or "unresolved type"
# errors across every cdk file, and nothing in the message named the missing
# build. Three agents of one weekend lost time to it, and test:core never
# showed it because that script builds infra first.
#
# The typecheck and lint entry points call this first. It costs one `find`
# when dist/ is current, and the lock keeps the parallel typecheck gates of
# pre-push from building the same files at once.
#
# See docs/dantotsus/the-worktree-that-could-not-see-its-own-infra.md.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
package="$root/infra/cdk"
entry="$package/dist/index.d.ts"

is_current() {
  [ -f "$entry" ] &&
    [ -z "$(find "$package/src" \( -name '*.ts' -o -name '*.js' \) -newer "$entry" -print -quit)" ]
}

build() {
  if is_current; then
    return 0
  fi
  echo "[ensure-infra-built] @borso/infra has no current dist/ in $root;" >&2
  echo "[ensure-infra-built] building it, because every cdk typecheck resolves the package through dist/index.d.ts" >&2
  pnpm --dir "$root" --filter @borso/infra run build >&2
}

if is_current; then
  exit 0
fi

if command -v flock >/dev/null 2>&1; then
  checkout_key="$(printf '%s' "$root" | cksum | cut -d' ' -f1)"
  (
    flock 9
    build
  ) 9>"${TMPDIR:-/tmp}/borso-infra-build-${checkout_key}.lock"
else
  build
fi
