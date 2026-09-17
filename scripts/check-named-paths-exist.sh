#!/usr/bin/env bash
# A path this repository names in prose has to be a path this repository has.
#
# `check-doc-links.ts` verifies markdown *links*. It does not read shell, and it
# does not read a path written as prose in backticks. Those are the two places a
# path rots unseen, and both had rotted:
#
#   * The line at the top of a gate saying which dantotsu it eradicates — the
#     only thread from a mechanism back to its reasoning.
#     `check-dated-records-are-append-only.sh` pointed at
#     `a-rename-rewrote-the-record-of-a-past-review.md` and
#     `preflight-preview-recovery.sh` at
#     `preview-deploy-orphans-block-recreate.md`. Neither was ever written.
#   * CLAUDE.md's claim that the feature pipeline's Dynamic Workflow lives at
#     `.claude/workflows/feature-pipeline.js`. That directory does not exist:
#     the runbook's own step 6 says to commit the file after the first run and
#     nobody ever did, so every `/feature-pipeline` was a first-run generation
#     while the guide described a committed script.
#
# A reader following either one looks for a file, does not find it, and has to
# decide whether the artefact is wrong or the corpus is, with nothing to go on.
#
# Two surfaces, one question, one gate — deliberately. This repository shipped
# the migration-number check twice because two authors each wrote a gate for the
# folder in front of them; see
# docs/dantotsus/the-loop-shipped-the-same-gate-twice.md. Adding a surface here
# is one line.
#
# Test files are skipped: a fixture path is made up on purpose, and four of the
# six matches in `scripts/` on the tree this was written against were exactly
# that. Paths carrying a glob or a placeholder are skipped for the same reason.
#
# See docs/dantotsus/the-link-checker-skipped-the-folder-it-was-trusted-for.md.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0

report() {
  failed=1
  echo "[check-named-paths-exist] $1" >&2
}

# 1. `docs/….md` written anywhere in a script, hook or workflow.
documents="$(
  git ls-files 'scripts/*' '.husky/*' '.github/*' |
    grep -vE '\.test\.(ts|tsx|js)$' |
    xargs grep -onE 'docs/[A-Za-z0-9/._-]+\.md' 2>/dev/null |
    sort -u
)"

while IFS= read -r citation; do
  [ -n "$citation" ] || continue
  document="${citation##*:}"
  location="${citation%:*}"
  [ -f "$document" ] || report "${location}: cites ${document}, which is not there"
done <<<"$documents"

# 2. A backticked repository path in an instruction surface — CLAUDE.md, a
#    skill, an agent brief, a command. These are read by a model that will open
#    what it is told to open.
paths="$(
  git ls-files 'CLAUDE.md' '.claude/*' |
    grep -E '\.md$' |
    xargs grep -onE '`(\.claude|scripts|apps|infra|docs|eslint-rules)/[A-Za-z0-9/._*<>-]+`' 2>/dev/null |
    sort -u
)"

while IFS= read -r mention; do
  [ -n "$mention" ] || continue
  named="$(printf '%s' "${mention##*:\`}" | tr -d '`')"
  location="${mention%:\`*}"
  case "$named" in
    *'*'* | *'<'* | *'>'*) continue ;;
  esac
  [ -e "$named" ] || report "${location}: names ${named}, which is not there"
done <<<"$paths"

if [ "$failed" -ne 0 ]; then
  echo "[check-named-paths-exist] A path named in a gate's header, in CLAUDE.md or in a skill is" >&2
  echo "  read by somebody who will go and open it. Point it at what exists, or state the reason" >&2
  echo "  in prose and name nothing — a path that was never written is worse than no path at all," >&2
  echo "  because it sends a reader looking. A glob or a <placeholder> is skipped." >&2
  exit 1
fi

echo "[check-named-paths-exist] every document a script cites and every path an instruction names is there"
