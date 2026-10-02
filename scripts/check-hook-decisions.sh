#!/usr/bin/env bash
# The PreToolUse hooks decide, and until now nothing checked what they decided.
#
# Every one of them answers the same question — is this an invocation or a
# mention? — and every one of them has answered it wrongly at least once. The
# pull-request-body hook refused the commit that armed it, for quoting the
# markup it forbids. The broad-kill hook refused three calls on 2026-08-20 for
# naming the command in an `echo` label, in a log line, and in the path of the
# entry that explains the rule. Both were fixed by dropping the text that is
# being written before matching, and the second bug shipped anyway because
# nothing carried the first one's lesson from one file to the next.
#
# So the decisions are a table now. Each row is a command and the verdict the
# hook owes it, and the two halves of every hook's contract are exercised: a
# command it must refuse, and the mention of that command it must let through.
#
# See docs/dantotsus/the-hook-that-refused-the-page-explaining-it.md.
set -euo pipefail

cd "$(dirname "$0")/.."

HOOK_DIR=.claude/hooks

failed=0
checked=0

# One case per line: <hook script>|<allow|block>|<tool input JSON field>|<value>
#
# `command` cases go to the Bash hooks, `body` cases to the pull-request-body
# hook, because the two read different fields of the tool input.
run_case() {
  hook="$1"
  expected="$2"
  field="$3"
  value="$4"

  payload="$(jq -n --arg field "$field" --arg value "$value" \
    '{tool_input: {($field): $value}}')"

  # The hooks log the friction they refuse, and every refusal below is this
  # check doing its job rather than anyone hitting a wall. Silence the logger
  # so the friction file holds only what a real call ran into.
  set +e
  message="$(printf '%s' "$payload" | KAIZEN_LOG_REFUSALS=0 "$HOOK_DIR/$hook" 2>&1 >/dev/null)"
  status=$?
  set -e

  case "$expected" in
    block) [ "$status" -eq 2 ] && verdict=ok || verdict=wrong ;;
    allow) [ "$status" -eq 0 ] && verdict=ok || verdict=wrong ;;
    *)
      echo "[check-hook-decisions] unknown expectation '$expected'" >&2
      exit 1
      ;;
  esac

  checked=$((checked + 1))
  if [ "$verdict" = wrong ]; then
    echo "[check-hook-decisions] $hook should $expected, exited $status:" >&2
    echo "    $value" >&2
    [ -n "$message" ] && printf '    %s\n' "$message" | head -3 >&2
    failed=1
  fi
}

# --- pretool-no-broad-kill.sh ---------------------------------------------
#
# Refuses a pattern-based kill. Must not refuse a command that merely names one.

run_case pretool-no-broad-kill.sh block command \
  'pkill -f "stryker run"'
run_case pretool-no-broad-kill.sh block command \
  'killall node'
run_case pretool-no-broad-kill.sh block command \
  'pnpm dev & sleep 2; pkill -f vite'
run_case pretool-no-broad-kill.sh block command \
  'pgrep -f vitest | xargs kill -9'

run_case pretool-no-broad-kill.sh allow command \
  'cat docs/dantotsus/broad-pkill-killed-another-agents-measurement.md'
run_case pretool-no-broad-kill.sh allow command \
  'scripts/kaizen.sh "the no-broad-kill hook refused a call for quoting pkill"'
run_case pretool-no-broad-kill.sh allow command \
  'echo "=== pkill fixtures ==="; ls scripts/'
run_case pretool-no-broad-kill.sh allow command \
  'for p in $(pgrep -f stryker); do kill "$p"; done'
run_case pretool-no-broad-kill.sh allow command \
  'git commit -F - <<MSG
docs: explain why pkill is refused

killall has the same blast radius.
MSG'

# --- pretool-no-swallowed-push.sh -----------------------------------------
#
# Refuses a git push or commit whose own pipeline ends in another command, which
# reports that command's status instead. Must not refuse a pipe that belongs to a
# later command on the same line: this table had no row for this hook, and it
# refused `git commit … > log 2>&1; grep … | head` three times in one session.

run_case pretool-no-swallowed-push.sh block command \
  'git push -u origin main | tail -5'
run_case pretool-no-swallowed-push.sh block command \
  'git commit -q -F msg.txt 2>&1 | grep -E "error"'
run_case pretool-no-swallowed-push.sh block command \
  'cd repo && git commit -m x | tail -3'

run_case pretool-no-swallowed-push.sh allow command \
  'git commit -q -F msg.txt > commit.log 2>&1; grep -B3 "failed" commit.log | head'
run_case pretool-no-swallowed-push.sh allow command \
  'git commit -q -F msg.txt && git log --oneline -3 | cat'
run_case pretool-no-swallowed-push.sh allow command \
  'set -o pipefail; git push -u origin main 2>&1 | tail -20'
run_case pretool-no-swallowed-push.sh allow command \
  'scripts/kaizen.sh "piped git push | tail and lost the status"'

# --- pretool-github-pr-body.sh --------------------------------------------
#
# Refuses body markup the GitHub MCP server strips on the way in. Must not
# refuse a body that quotes that markup in a code span while explaining it.

run_case pretool-github-pr-body.sh block body \
  'Before and after:

![screenshot](https://example.com/shot.png)'
run_case pretool-github-pr-body.sh block body \
  '<details><summary>Evidence</summary>

the numbers
</details>'

run_case pretool-github-pr-body.sh allow body \
  'The server wraps `![alt](….png)` in backticks, and removes a collapsible section.'

# An angle-bracket placeholder has no mention half. Backticks do not protect it
# — the sanitizer strips markup before markdown fencing is considered — so a
# body quoting one loses it exactly like a body using one, and the hook reads
# the raw text for this rule alone. The safe form names the thing in words.

run_case pretool-github-pr-body.sh block body \
  'Run npx vitest run <file> to reproduce.'
run_case pretool-github-pr-body.sh block body \
  'The generator writes `@generated by <path>` into the header.'
run_case pretool-github-pr-body.sh block body \
  'Full rationale: <https://example.com/entry>'

run_case pretool-github-pr-body.sh allow body \
  'Run npx vitest run apps/pragma/site/src/x.test.ts to reproduce.'
run_case pretool-github-pr-body.sh allow body \
  'A placeholder in angle brackets is deleted, so the header names PATH/TO/file.ts.'
run_case pretool-github-pr-body.sh allow body \
  '### Evidence

See the PR'"'"'s Files changed tab, which renders committed screenshots inline.'

# A markdown link's target comes back backtick-wrapped past about 150
# characters, whatever the extension, so the branch-name form of a link into
# the tree is refused and the /blob/main/ form of the same file is not.

run_case pretool-github-pr-body.sh block body \
  'Full walk: [the resolution note](https://github.com/hugoleborso/borso.fr/blob/claude/a-branch-name-long-enough-to-matter/docs/features/pragma/tasks-and-compos/validation/visual-validation-20260915-1954-resolution.md)'
run_case pretool-github-pr-body.sh allow body \
  'Full walk: [the resolution note](https://github.com/hugoleborso/borso.fr/blob/main/docs/dantotsus/README.md)'

run_case pretool-github-pr-body.sh allow body \
  'A link target past about 150 characters comes back wrapped in backticks, so link through /blob/main/.'

# --- pretool-gh-pr-create.sh ----------------------------------------------
#
# Refuses a pull request opened with no body, or with one check-pr-body.ts
# refuses. Must not refuse a command that names `gh pr create` without running it.

run_case pretool-gh-pr-create.sh block command \
  'gh pr create --title "feat: x"'

run_case pretool-gh-pr-create.sh allow command \
  'echo "never run gh pr create with a one-word body"'
run_case pretool-gh-pr-create.sh allow command \
  'gh pr create --title "feat: x" --body-file -'

# --- pretool-no-discarding-reset.sh ---------------------------------------
#
# Refuses a reset, checkout or restore that would discard uncommitted tracked
# changes. The refusal depends on whether the tree is dirty, which this table
# cannot set up, so only the half that has gone wrong in every other hook —
# letting a mention through — is exercised here.
#
# state-dependent: pretool-no-discarding-reset.sh

run_case pretool-no-discarding-reset.sh allow command \
  'scripts/kaizen.sh "a git reset --hard would have lost the work"'
run_case pretool-no-discarding-reset.sh allow command \
  'git commit -F - <<MSG
docs: why git restore is refused on a dirty tree
MSG'

# Every hook that can refuse has to appear above, with both halves unless it
# is declared state-dependent. pretool-no-swallowed-push.sh refused for weeks
# with no row in this table, so its over-broad match was found by an agent
# rewriting the same command three times rather than by this check; two other
# refusing hooks had no row either. A hook that is missing here is a contract
# nobody wrote.

for hook_path in "$HOOK_DIR"/pretool-*.sh; do
  hook_name="$(basename "$hook_path")"
  grep -q 'exit 2' "$hook_path" || continue
  if ! grep -q "^run_case $hook_name allow " "$0"; then
    echo "[check-hook-decisions] $hook_name can refuse a call but has no allow row here." >&2
    failed=1
  fi
  if ! grep -q "^run_case $hook_name block " "$0" && ! grep -q "^# state-dependent: $hook_name\$" "$0"; then
    echo "[check-hook-decisions] $hook_name can refuse a call but has no block row here, and is not declared state-dependent." >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "[check-hook-decisions] a hook decided against its own contract, or has none. A hook that refuses a mention is a hook the next agent works around." >&2
  exit 1
fi

echo "[check-hook-decisions] $checked hook decision(s) match the contract"
