#!/usr/bin/env bash
# Log one piece of friction to the branch's friction log, the file
# `/after-task-kaizen` reads after the merge.
#
#   scripts/kaizen.sh log --where "pnpm blueprints, run from apps/pragma" "the error names a path that never existed"
#   scripts/kaizen.sh log --from audit-stage-r2 --where "/sessions/<id>, the +1 button" "tapping +1 twice moves the counter and not the chart"
#   scripts/kaizen.sh show
#   scripts/kaizen.sh balance [<base-ref>]
#
# The log is `docs/kaizen/<branch>.md`, a tracked file the branch commits like
# any other. It used to be a gitignored `KAIZEN.md` per checkout, copied into
# the branch by an `archive` step, and every defect of that copy came from the
# log and the branch living in two places: a container reclaimed before the
# copy (the-friction-log-that-never-left-the-container), a second copy that
# overwrote the first (the-sweep-that-overwrote-the-log-it-exists-to-read), one
# session's two pull requests sharing a log (the-friction-log-that-arrived-twice),
# a local checkout handing one session's lines to the next
# (the-friction-log-that-adopted-another-sessions-lines), and a sweep handed a
# file instead of the lines its merge added
# (the-sweep-handed-a-log-it-had-already-read). A file named after its branch
# holds that branch's lines and no other, and goes wherever the branch goes.
#
# One checkout, one file. An agent in its own worktree is on its own branch and
# writes its own file, so the main session merging that worktree adds a file and
# never meets a conflict. No merge driver is needed, and none is used: GitHub's
# merge applies none (the-union-merge-only-this-checkout-could-see).
#
# A new log is registered with `git add -N`, so `git status`, `git commit -a`
# and the merge hook's uncommitted-work check see it from its first line.
#
# `--from` names the writer, because the sweep reads differently depending on
# who hit the friction: the same line from four different agents is a systemic
# problem, and from one is a local one. Nothing in the environment identifies a
# subagent, so the prompt that spawns it says which label to use. Defaults to
# $KAIZEN_AGENT, then to `main`.
#
# Every entry is a single short line opened O_APPEND, which the kernel writes
# atomically under PIPE_BUF, so a dozen agents appending at once interleave
# lines rather than characters.
#
# What belongs here: a defect, a vendor surprise, a correction you were given
# twice, a tool that failed in a way that named the wrong problem, an
# instruction you misread. **What you saw, and where you saw it.** Never the
# cause, never the fix. The sweep starts from the bare observation and asks why
# until it reaches the cause. A cause written in the moment is the guess you
# already had, and it steers the sweep toward the eradication that guess
# implies: on 2026-11-27 a line blamed the validators for a public API field,
# before anyone had looked at why the field existed. So `log` refuses a line
# without `--where`: the place is what lets the sweep go and look for itself.
#
# Logging is its own subcommand, and any other first word is refused. When the
# sentence was the fallback branch, a mistyped `list` was logged as friction
# (the-friction-log-that-recorded-a-typo).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.." && pwd)"
LOG_DIRECTORY="docs/kaizen"
DEFAULT_BRANCH="main"

USAGE='usage: scripts/kaizen.sh log [--from <label>] --where "<command, URL, screen or file:line>" "<what you saw>" | show | balance [<base-ref>]'

# The branch's log, relative to the checkout. A checkout on main or on no
# branch has no pull request to carry a log, so it gets none.
log_path() {
  local branch
  branch="$(git -C "$REPO_ROOT" symbolic-ref --short -q HEAD || true)"
  if [ -z "$branch" ] || [ "$branch" = "$DEFAULT_BRANCH" ]; then
    printf 'scripts/kaizen.sh: the log is committed with its branch, and this checkout is on %s. Branch first. Nothing logged.\n' \
      "${branch:-no branch}" >&2
    return 1
  fi
  printf '%s/%s.md' "$LOG_DIRECTORY" "$branch"
}

log_line() {
  local writer="${KAIZEN_AGENT:-main}" where='' path file branch entry
  while [ "${1:-}" = '--from' ] || [ "${1:-}" = '--where' ]; do
    [ -n "${2:-}" ] || { printf '%s\n' "$USAGE" >&2; exit 1; }
    if [ "$1" = '--from' ]; then writer="$2"; else where="$2"; fi
    shift 2
  done
  [ -n "$*" ] || { printf '%s\n' "$USAGE" >&2; exit 1; }
  if [ -z "$where" ]; then
    printf 'scripts/kaizen.sh: say where you saw it with --where "<command, URL, screen or file:line>". Write what you saw, not why it happened: the sweep finds the cause. Nothing logged.\n%s\n' "$USAGE" >&2
    exit 1
  fi
  path="$(log_path)" || exit 1
  file="$REPO_ROOT/$path"
  branch="${path#"$LOG_DIRECTORY"/}"
  mkdir -p "$(dirname "$file")"
  # noclobber creates the file only when it is absent, so two agents starting
  # the log at once cannot truncate each other's first line.
  if (set -C; printf '# Friction log of %s\n\nAppended by `scripts/kaizen.sh log`, read by `/after-task-kaizen` after the merge.\n\n' \
    "${branch%.md}" > "$file") 2>/dev/null; then
    git -C "$REPO_ROOT" add -N -- "$path" 2>/dev/null || true
  fi
  # One line, one write. Newlines in the argument would break that guarantee,
  # so they collapse to spaces.
  entry="$(printf '%s (where: %s)' "$*" "$where" | tr '\n' ' ')"
  writer="$(printf '%s' "$writer" | tr '\n ' '--')"
  printf -- '- [%s] `%s` %s\n' "$(date -u '+%Y-%m-%d %H:%M')" "$writer" "$entry" >> "$file"
  printf '\033[36m[kaizen]\033[0m logged as %s: %s\n' "$writer" "$entry"
}

case "${1:-}" in
  log)
    shift
    log_line "$@"
    ;;
  show)
    path="$(log_path)" || exit 1
    [ -f "$REPO_ROOT/$path" ] || { printf 'no %s yet\n' "$path"; exit 0; }
    cat "$REPO_ROOT/$path"
    ;;
  balance)
    # A sweep earns its additions by deleting or simplifying code, so only code
    # counts: no markdown, lockfile, test snapshot or test, and no line removed
    # from a skill or an agent definition. The operator's choices of
    # 2026-11-19, 2026-11-26 and 2026-11-27; the PR #421 sweep had cut a skill
    # to pass. A balance-waiver.md the sweep commits records the operator's
    # waiver in his words and lets the sweep through.
    not_counted='.*[.]md|pnpm-lock[.]yaml|.*/__snapshots__/.*|.*[.]test[.](ts|tsx|js)'
    base="${2:-origin/main}"
    numstat="$(git -C "$REPO_ROOT" diff --numstat --no-renames "$base...HEAD")" ||
      { printf 'scripts/kaizen.sh: cannot compare with %s; fetch origin first\n' "$base" >&2; exit 2; }
    read -r added removed < <(printf '%s\n' "$numstat" |
      grep -vE "	($not_counted)\$" |
      awk '{ added += $1; if ($3 !~ /^[.]claude[/](skills|agents)[/]/) removed += $2 }
        END { print added + 0, removed + 0 }')
    printf 'Balance: added %s, removed %s outside what a sweep does not count\n' "$added" "$removed"
    if grep -qE '	docs/features/meta/lessons-[^/]+/balance-waiver[.]md$' <<< "$numstat"; then
      printf 'Waived by the operator: see the sweep'"'"'s balance-waiver.md\n'
      exit 0
    fi
    [ "$added" -le "$removed" ] || {
      printf 'This sweep adds more code than it removes. Delete or simplify code to earn the additions.\n' >&2
      printf 'For each file you wrote, name its role and look for it in a package already installed (node_modules/.modules.yaml) before keeping it. Offer that option to the operator even when it costs something he sees.\n' >&2
      printf 'Then remove what each addition replaces, or clean up elsewhere, until this passes.\n' >&2
      exit 1
    }
    ;;
  *)
    printf 'scripts/kaizen.sh: "%s" is not a subcommand. Nothing logged.\n%s\n' "${1:-}" "$USAGE" >&2
    exit 1
    ;;
esac
