---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#40'
fix-commits: [239b78b6d1, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-broad-kill.core.ts, scripts/hooks/checks/no-broad-kill.core.test.ts, scripts/hooks/shell-command.core.ts]
time-to-detect: 12 days
tags: [hooks, agent-harness, meta]
zone: scripts/hooks/checks/no-broad-kill.core.ts
---

# The hook that refused the page explaining it

## User impact

Two commands in one agent session were refused by `pretool-no-broad-kill.sh`,
and neither killed anything (measured, in that session).

```
scripts/kaizen.sh "… the pattern-matching process killers are blocked by a hook …"
echo "=== pkill dantotsu ==="; cat docs/dantotsus/broad-pkill-…md
```

| | Seen | Expected |
| --- | --- | --- |
| Appending a friction line | refused, with advice to kill a PID | the line appended |
| Opening the entry behind the hook | refused over the `echo` label | the entry printed |

Agents that run a kill are not affected. Agents that write or read about one
are.

## Causal chain

- Both commands were refused.
  - The hook matched the bare word anywhere in the command string, inside a
    quoted argument too. The pattern, from `cac22f1e9`:

    ```bash
    if grep -qE '(^|[;&|[:space:]])(pkill|killall|killall5)([[:space:]]|$)' <<<"$COMMAND"; then
    ```

    - Commit `cac22f1e9` (2026-08-08) wrote it over the raw text and kept
      the mentions it would refuse. Its message: "A command whose prose
      contains the word `pkill` is still blocked; at this frequency that
      false positive is worth the certainty."
      - The repository had no shell parser. `git log -S unbash -- package.json`
        finds the parser only in `458e886c4`, on 2026-11-27. Telling a use
        from a mention meant a hand-written stripper, and each hook grew its
        own: `strip-heredocs.py`, then `strip-markdown-code.py` (`0224b28`),
        then `strip-quoted-strings.py` (`50545c5bc`). (Machine)

## Root cause of occurrence

*Thought a command that mentions `pkill` without running it would be rare,
actually such commands cluster around the hook itself: the friction line about
a refusal, the entry that explains it, a commit message describing the rule.*
(Machine)

The commit priced the false positive against the cost of excluding mentions,
and with no parser in the codebase that cost was a new stripper. Commit
`cac22f1e9`, read this session, states the trade in its message. Had its
author known where mentions occur, the quoted-string stripper would have
shipped with the hook.

## Detection failure causes

- **Typing and lint:** a regex in a shell script. Nothing reads its matches.
- **Local:** the commit checked five benign commands, including
  `echo "the pkillers are coming"`. That case proves the word boundary, and
  none of the five quoted the bare word.
- **CI:** no hook had a test until `scripts/check-hook-decisions.sh` arrived
  with this entry's fix.
- **Review:** both halves of the pattern read correctly. The missing case is
  a command nobody wrote down.

## Countermeasure

Quoted bodies are dropped before matching, the way heredoc bodies already
were. `strip-quoted-strings.py`, written for `pretool-no-swallowed-push.sh`,
was piped in front of the grep in commit `239b78b6d`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `239b78b6d` added the quote stripper and a decision table
run by pre-commit. The table, `scripts/check-hook-decisions.sh`, was deleted
in `c54e32da7` (PR #224). Commit `458e886c4` (PR #411) replaced the shell
hooks with TypeScript checks. What holds today is
`scripts/hooks/checks/no-broad-kill.core.ts`, which matches the text left by
`stripStringBodies` from `scripts/hooks/shell-command.core.ts`:

```ts
const commandToRun = stripStringBodies(command);
if (NAME_KILL.test(commandToRun)) {
```

Its test file sits under the per-file 100% coverage of `vitest.config.ts`.

**Proof it can fail:** the check fed to `tsx` this session (measured).

```text
kill "echo \"=== pkill x ===\""        pass
kill "pkill node"                      refuse
kill "grep -rn pkill docs/dantotsus"   refuse
kill "ls docs | grep killall"          refuse
```

The quoted mention passes. An unquoted mention in argument position is still
refused, so the class stays open.

**Similar instances:** `git grep -ln listSimpleCommands -- 'scripts/hooks/checks/*.core.ts'`
lists the checks that already match the command name from the parser. `no-broad-kill` and
`no-swallowed-push` still match a regex over stripped text.

**Proposed:** match the `name` of each command from `listSimpleCommands`
instead of a regex over the text, and look through `sudo` and `xargs` to the
command they run, which the existing test *refuses a name kill behind sudo*
requires. A word in argument position then cannot match at all, quoted or
not.
