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
#   * A script one shell script calls by path. PR #224 deleted the argent wrapper
#     under scripts/ while pragma's task-metrics runner still started it, and nothing said so
#     until an agent tried a run days later. A call is resolved from the
#     repository root, from the app or plugin that holds the caller, or from the
#     caller's own folder, because a script often runs from one of those.
#
# Three surfaces, one question, one gate — deliberately. This repository shipped
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

# `--staged` narrows both reads to what a commit can break: the staged files
# themselves, and every file of the surfaces below naming a path the commit
# removes — a deletion, or the old side of a rename — or a directory that removal
# leaves empty. Only those surfaces are ever read, so the search for a removed
# name stays inside them: across the whole tree, a commit deleting seventeen
# files cost 490 ms of CPU against a 300 ms budget. Without
# it, every file is read, which is how CI calls it; that is about two seconds.
SUBJECTS=()
SURFACES=('scripts/*' '.husky/*' '.github/*' 'plugins/*' 'CLAUDE.md' '.claude/*' 'apps/*/scripts/*')
if [ "${1:-}" = '--staged' ]; then
  STAGED=1
  while IFS= read -r staged; do
    [ -n "$staged" ] && SUBJECTS+=("$staged")
  done < <(git diff --cached --name-only --diff-filter=ACMR)
  removed_names=()
  while IFS= read -r removed; do
    [ -n "$removed" ] || continue
    removed_names+=(-e "${removed##*/}")
    directory=$(dirname "$removed")
    while [ "$directory" != '.' ] && [ -z "$(git ls-files -- "$directory")" ]; do
      removed_names+=(-e "${directory##*/}")
      directory=$(dirname "$directory")
    done
  done < <(git diff --cached --name-only --no-renames --diff-filter=D)
  if [ "${#removed_names[@]}" -gt 0 ]; then
    # Only the surfaces this gate reads below can produce a finding, and
    # `list_subject_files` discards everything else a moment later. Searching
    # the whole tree therefore buys candidates that are thrown away: on a merge
    # removing a toolchain it cost 837 ms of CPU against a 300 ms budget, with
    # the same verdict either way.
    while IFS= read -r naming; do
      [ -n "$naming" ] && SUBJECTS+=("$naming")
    done < <(git grep --threads=1 -l -F "${removed_names[@]}" -- "${SURFACES[@]}" || true)
  fi
  if [ "${#SUBJECTS[@]}" -eq 0 ]; then
    echo "[check-named-paths-exist] nothing staged names a path"
    exit 0
  fi
else
  STAGED=0
fi

list_subject_files() {
  if [ "$STAGED" -eq 0 ]; then
    git ls-files "$@"
    return
  fi
  git ls-files "$@" | { grep -Fx -f <(printf '%s\n' "${SUBJECTS[@]}") || true; }
}

failed=0

report() {
  failed=1
  echo "[check-named-paths-exist] $1" >&2
}

# 1. `docs/….md` written anywhere in a script, hook or workflow.
documents="$(
  list_subject_files 'scripts/*' '.husky/*' '.github/*' 'plugins/*.sh' 'plugins/*.py' |
    { grep -vE '\.test\.(ts|tsx|js)$' || true; } |
    { xargs --no-run-if-empty grep -HonE 'docs/[A-Za-z0-9/._-]+\.md' 2>/dev/null || true; } |
    sort -u
)"

present_or_generated() {
  [ -e "$1" ] || git check-ignore -q "$1"
}

while IFS= read -r citation; do
  [ -n "$citation" ] || continue
  document="${citation##*:}"
  location="${citation%:*}"
  present_or_generated "$document" || report "${location}: cites ${document}, which is not there"
done <<<"$documents"

# 2. A backticked repository path in an instruction surface — CLAUDE.md, a
#    skill, an agent brief, a command. These are read by a model that will open
#    what it is told to open. The plugin's own files name each other through
#    `${CLAUDE_PLUGIN_ROOT}`, which Claude Code substitutes with the plugin's
#    directory, so that prefix is read as `plugins/borso-harness/`.
PLUGIN_DIRECTORY=plugins/borso-harness
# The vendored impeccable references and agents are upstream's text, kept
# verbatim (ADR-0032); they name paths of a project that installs its hook.
paths="$(
  list_subject_files 'CLAUDE.md' '.claude/*' 'plugins/*' ':!.claude/skills/impeccable/reference/*' ':!.claude/agents/impeccable-*' |
    { grep -E '\.md$' || true; } |
    { xargs --no-run-if-empty grep -HonE '`(\.claude|scripts|apps|infra|docs|eslint-rules|\$\{CLAUDE_PLUGIN_ROOT\})/[A-Za-z0-9/._*<>-]+`' 2>/dev/null || true; } |
    sed -E "s|\\$\\{CLAUDE_PLUGIN_ROOT\\}/|${PLUGIN_DIRECTORY}/|" |
    sort -u
)"

while IFS= read -r mention; do
  [ -n "$mention" ] || continue
  named="${mention##*:\`}"
  named="${named%\`}"
  location="${mention%:\`*}"
  case "$named" in
    *'*'* | *'<'* | *'>'*) continue ;;
  esac
  present_or_generated "$named" || report "${location}: names ${named}, which is not there"
done <<<"$paths"

# 3. A script that a shell script or a workflow calls by its path.
calls="$(
  list_subject_files 'scripts/*.sh' '.husky/*' '.github/*' 'plugins/*.sh' 'apps/*/scripts/*.sh' |
    { grep -vE '\.test\.(ts|tsx|js)$' || true; } |
    { xargs --no-run-if-empty grep -HonE '(^|[^A-Za-z0-9_./${}-]|\./)scripts/[A-Za-z0-9/._-]+\.(sh|ts|mjs|js|py)' 2>/dev/null || true; } |
    sed -E 's|^([^:]+:[0-9]+:)[^s]*|\1|' |
    sort -u
)"

# The folders a call may be relative to: the repository root, the app or plugin
# holding the caller, and the caller's own folder.
call_resolves() {
  local caller="$1" called="$2"
  [ -e "$called" ] && return 0
  [ -e "$(dirname "$caller")/$called" ] && return 0
  case "$caller" in
    apps/*/* | plugins/*/*)
      local owner
      owner="$(cut -d/ -f1-2 <<<"$caller")"
      [ -e "$owner/$called" ] && return 0
      ;;
  esac
  return 1
}

while IFS= read -r call; do
  [ -n "$call" ] || continue
  called="${call#*:*:}"
  location="${call%:*}"
  caller="${call%%:*}"
  call_resolves "$caller" "$called" || report "${location}: calls ${called}, which is not there"
done <<<"$calls"

if [ "$failed" -ne 0 ]; then
  echo "[check-named-paths-exist] A path named in a gate's header, a script call, CLAUDE.md or a skill is" >&2
  echo "  read by somebody who will go and open it. Point it at what exists, or state the reason" >&2
  echo "  in prose and name nothing — a path that was never written is worse than no path at all," >&2
  echo "  because it sends a reader looking. A glob or a <placeholder> is skipped." >&2
  exit 1
fi

echo "[check-named-paths-exist] every document a script cites, every script a script calls and every path an instruction names is there"
