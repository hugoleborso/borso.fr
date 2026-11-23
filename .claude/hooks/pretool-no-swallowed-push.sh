#!/usr/bin/env bash
# PreToolUse hook for a git push or commit whose exit status is thrown away,
# and for a mutation run cut short by `head`.
#
# `pipefail` is off in this shell, so a pipeline reports the last stage's
# status. `git push | tail -5` therefore exits 0 whether the push succeeded or
# the pre-push hook rejected it, and the hook's own output goes to stderr, which
# is not piped and scrolls past above whatever `tail` printed. The failure looks
# exactly like the success.
#
# The same shape swallows a commit: `git commit | tail` hides a hook rejection
# and leaves the tree looking committed when nothing was.
#
# See docs/dantotsus/a-push-that-failed-and-reported-success.md.
#
# A commit or push that skips its hooks with `--no-verify` or `HUSKY=0` throws
# the gates' status away before it exists, so it is refused here too.
#
# Output contract: exit 2 with a message on stderr blocks the call; exit 1 does not.

set -euo pipefail

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

# Match an invocation, not a mention. A commit message or a documentation entry
# quoting the shape is text being written rather than a push being made, and the
# commit that armed this hook was refused by it for saying so in prose. Heredoc
# bodies go first and quoted arguments second, because both carry prose and only
# the first had a stripper: `echo "never write git push | tail"` reached the
# grep intact until the second one existed.
COMMAND_TO_RUN="$(printf '%s' "$COMMAND" \
  | python3 "$(dirname "$0")/strip-heredocs.py" \
  | python3 "$(dirname "$0")/strip-quoted-strings.py")"

# One pipeline per line before matching. A `;` or `&&` ends the pipeline the
# git command belongs to, so a pipe in the next command has nothing to do with
# its status; without the split, `git commit -F msg > log 2>&1; grep x log | head`
# was refused three times in one session for a pipe the commit was never in.
PIPELINES="$(sed -E 's/&&|;/\n/g' <<<"$COMMAND_TO_RUN")"

# A mutation run piped into `head` is not shortened, it is killed: `head` exits
# after its lines and the next write ends Stryker on a broken pipe, before the
# score, with nothing printed about it. `pipefail` keeps the status of a killed
# run, not the run, so this is refused with or without it.
if grep -qE '(stryker[[:space:]]+run|test:mutation)([[:space:]][^|]*)?\|[[:space:]]*head([[:space:]]|$)' <<<"$PIPELINES"; then
  echo "[no-swallowed-push] a mutation run piped into head is killed once head has its lines," >&2
  echo "[no-swallowed-push] with no error and no score, so it reads as a run that finished." >&2
  echo "[no-swallowed-push] Write the log to a file and read its end instead:" >&2
  echo "[no-swallowed-push]   pnpm exec stryker run --mutate <files> > stryker.log 2>&1; tail -40 stryker.log" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-swallowed-push "piped a mutation run into head, which kills it before the score"
  exit 2
fi

if grep -qE '(^|[[:space:]])(HUSKY=0[[:space:]]+)?git[[:space:]]+(commit|push)([[:space:]][^|]*)?[[:space:]]--no-verify\b|HUSKY=0[[:space:]]+git[[:space:]]+(commit|push)\b' <<<"$PIPELINES"; then
  echo "[no-swallowed-push] --no-verify and HUSKY=0 skip the git hooks, so their gates never report." >&2
  echo "[no-swallowed-push] Run the commit or push bare and fix what the hook reports." >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-swallowed-push "skipped the git hooks with --no-verify or HUSKY=0"
  exit 2
fi

# A pipeline already made safe by an explicit `pipefail` keeps the real status.
if grep -qE '(^|[|[:space:]])git[[:space:]]+(push|commit)([[:space:]][^|]*)?>[[:space:]]*/dev/null' <<<"$PIPELINES"; then
  echo "[no-swallowed-push] git's errors and every pre-commit or pre-push refusal go to stderr, and" >&2
  echo "[no-swallowed-push] /dev/null throws them away; a command after ; then sets the exit status too." >&2
  echo "[no-swallowed-push] Keep the output where you can read it:" >&2
  echo "[no-swallowed-push]   git push -u origin <branch> > push.log 2>&1; echo \"push=\$?\"; tail -20 push.log" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-swallowed-push "sent git push or git commit errors to /dev/null"
  exit 2
fi

if grep -qE 'set -[a-zA-Z]*o[[:space:]]+pipefail|set -o pipefail' <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

# A git push or commit piped into another command is repaired, not refused.
# Refusing it cost a round trip every time: 113 refusals across 32 tasks by
# PR #250's sweep. Turning `pipefail` on for this one command keeps git's status
# through the pipe, which is everything the refusal was protecting, so the hook
# hands the harness the same command with `set -o pipefail;` in front of it.
# See docs/dantotsus/a-guard-that-refused-what-it-could-repair.md.
# Under pipefail the status is the last non-zero stage's, not git's: on PR
# #346 a `| grep` matching nothing exited 1 after a push that had landed, and
# the old hint, "the exit status is git's", read it as a failed push.
if grep -qE '(^|[|[:space:]])git[[:space:]]+(push|commit)([[:space:]][^|]*)?\|' <<<"$PIPELINES"; then
  jq -c '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: (.tool_input + {command: ("set -o pipefail; " + .tool_input.command)}),
      additionalContext: "[no-swallowed-push] The command ran with set -o pipefail in front, so a failed git exits non-zero. A later stage can too on its own: grep exits 1 when nothing matches, after a push that succeeded. Before calling a push failed, read git ls-remote origin <branch>."
    }
  }' <<<"$INPUT"
  exit 0
fi

exit 0
