#!/usr/bin/env bash
# PostToolUse (Bash) — a type-aware ESLint error is the one error the cache can
# report after you have already fixed it, so say so where the wrong conclusion
# is formed.
#
# `--cache-strategy content` keys each entry on the linted file's own content.
# That is correct for a syntactic rule and wrong for a type-aware one, whose
# result depends on every file in the type graph. Fix a return type in `a.ts`
# and `b.ts` — unchanged, so a cache hit — still reports the error the fix
# removed. Re-running does not help, because the cache hits again.
#
# docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md has
# said this since before PR #95, in full, correctly. PR #95 hit it anyway: a
# dependency bump changed another package's types, 24 no-unsafe-* errors named
# pragma's query modules, the fix landed, and the same 24 errors came back. The
# entry is only reachable by someone who already suspects the cache, and the
# symptom argues the other way — it reads as "my fix did not work".
#
# Best-effort by contract: it ALWAYS exits 0, and it never asserts staleness —
# these errors are usually real. It names the one command that tells them apart.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)

COMMAND=$(jq -r '.tool_input.command // empty' <<<"$INPUT")
case "$COMMAND" in
  *eslint* | *' lint'* | *'run lint'*) ;;
  *) exit 0 ;;
esac

# A command that already clears the cache has nothing to be warned about.
case "$COMMAND" in
  *.eslintcache*) exit 0 ;;
esac

[ -f .eslintcache ] || exit 0

RESPONSE=$(jq -r '
  if type == "string" then .
  else (.stdout // "") + "\n" + (.stderr // "") + "\n" + (.output // "")
  end' <<<"$(jq -r '.tool_response // empty' <<<"$INPUT")" 2>/dev/null)
[ -z "$RESPONSE" ] && exit 0

# The rules whose verdict depends on the whole type graph rather than on the
# linted file. An error from any of these is the class the content cache
# cannot invalidate correctly.
TYPE_AWARE='no-unsafe-argument|no-unsafe-assignment|no-unsafe-call|no-unsafe-member-access|no-unsafe-return|no-deprecated|no-floating-promises|no-misused-promises|restrict-template-expressions|no-unnecessary-condition'

COUNT=$(printf '%s' "$RESPONSE" | grep -cE "@typescript-eslint/($TYPE_AWARE)" || true)
[ "${COUNT:-0}" -gt 0 ] || exit 0

cat <<NOTE
[eslint-cache] that run reported $COUNT type-aware error(s) and .eslintcache exists.

Type-aware rules read the whole type graph; --cache-strategy content keys on
each file's own bytes. So when the types a file DEPENDS ON change — another
workspace, a bumped dependency, a fixed signature elsewhere — the file itself
is unchanged, the cache hits, and the error that is already fixed is replayed.
Re-running reproduces it exactly, which is what makes it read as a real error.

Before treating these as real, settle it in one command:

  rm -f .eslintcache && pnpm run lint

If they survive that, they are real. See
docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md.
NOTE

exit 0
