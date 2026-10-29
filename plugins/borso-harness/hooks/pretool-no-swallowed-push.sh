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
# That is not hypothetical: a push rejected by the pre-push gate read as a
# successful one for two hours on the branch that added this file, because the
# command was written `git push … | tail -3` to keep the output short.
#
# The same shape swallows a commit: `git commit | tail` hides a hook rejection
# and leaves the tree looking committed when nothing was.
#
# See docs/dantotsus/a-push-that-failed-and-reported-success.md.
#
# A commit or push that skips its hooks with `--no-verify` or `HUSKY=0` throws
# the gates' status away before it exists, so it is refused here too. CLAUDE.md
# carried "Never --no-verify" as prose for months with nothing that refused it.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 2 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct. Exit 1 does NOT block: the harness
#     treats any non-zero-but-not-2 code as a non-blocking error, prints it,
#     and runs the command anyway.

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
if grep -qE 'set -[a-zA-Z]*o[[:space:]]+pipefail|set -o pipefail' <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

block() {
  echo "[no-swallowed-push] $1" >&2
  echo "[no-swallowed-push] pipefail is off here, so the pipeline reports the last stage's status," >&2
  echo "[no-swallowed-push] and the gate's own message goes to stderr, which is not piped." >&2
  echo "[no-swallowed-push] Nothing in this command ran, including any step before the $2," >&2
  echo "[no-swallowed-push] so a \`git add\` chained in front of it staged nothing, and a heredoc" >&2
  echo "[no-swallowed-push] that was to write the message file wrote nothing: write it again first." >&2
  echo "[no-swallowed-push] Run it bare and read the tail afterwards:" >&2
  echo "[no-swallowed-push]   $3" >&2
  echo "[no-swallowed-push] or keep the status if the output is genuinely too long:" >&2
  echo "[no-swallowed-push]   set -o pipefail; $3 2>&1 | tail -20" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-swallowed-push "piped git push or git commit into another command, throwing away its exit status"
  exit 2
}

if grep -qE '(^|[|[:space:]])git[[:space:]]+push([[:space:]][^|]*)?\|' <<<"$PIPELINES"; then
  block "git push piped into another command throws away the push's exit status." \
    "git push" "git push -u origin <branch>"
fi

if grep -qE '(^|[|[:space:]])git[[:space:]]+commit([[:space:]][^|]*)?\|' <<<"$PIPELINES"; then
  block "git commit piped into another command throws away the commit hook's exit status." \
    "git commit" "git commit -F <message-file>"
fi

exit 0
