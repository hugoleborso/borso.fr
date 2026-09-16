---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#100'
fix-pr: '#102'
fix-commits: []
eradication-level: 2
time-to-detect: days
tags: [meta, hooks, self-improvement-loop, harness, process]
---

# The hooks refused five calls and the friction log heard about none of them

## Symptom

PR #100 ran for a day: two features, a subagent validation round, a
merge with `main`, and an opened pull request. `KAIZEN.md` held one
line at the end of it, written by the visual validator because its
dispatch prompt told it to.

The main session logged nothing — while being refused five times by
its own PreToolUse hooks:

```
[no-swallowed-push] git push piped into another command throws away the push's exit status.
[no-broad-kill] pkill / killall matches every process whose command line contains the pattern
[pr-body] the body carries a <details> toggle; the tag is removed and its contents are flattened
[pr-body] the body carries <https://…>, which the server reads as an HTML tag and deletes.
[no-swallowed-push] …again
```

Every one of those is exactly what the file is for: a tool that
failed, a correction received twice, a vendor behaviour nobody
expected. The sweep that reads the file saw none of them, and had to
rebuild the inventory from the transcript — which works only while the
transcript is still in the window.

## Root-cause chain

1. **Why did the session not log these?**
   Because at the moment a hook fires, the agent is mid-task and the
   refusal reads as an instruction, not as an event. It fixes the call
   and moves on.
2. **Why does the refusal not read as friction?**
   Because it was *resolved*. The hook told the agent exactly what to
   do instead, the second attempt worked, and a problem that took
   thirty seconds to fix does not feel like a problem worth recording.
3. **Why is that the wrong instinct?**
   The cost of the friction is not what it cost *this* session. It is
   the number of sessions that will hit the same wall. A hook firing
   five times in one day is the strongest evidence the repository has
   that something is worth changing, and it was the evidence being
   thrown away.
4. **Why was logging left to the agent at all?**
   Because `scripts/kaizen.sh` was designed for the friction only a
   human or an agent can notice — a misleading error, an instruction
   misread. Hook refusals are not in that category: they are machine
   observable, and the machine that observes them is already running.
5. **Why did CLAUDE.md's instruction not carry it?**
   It says to log friction as you hit it, and the session that wrote
   that sentence believed it was following it. An instruction that
   depends on noticing cannot cover the case where not noticing *is*
   the failure.

**Root cause:** thought the friction log was something an agent writes
when it notices friction, actually the most reliable observer of
friction is the hook that just refused a call, and it was silent.

## Detection failure causes

- **Linter / static analysis:** nothing reads `KAIZEN.md`; it is
  gitignored scratch.
- **CI:** the file never reaches CI by design.
- **Code review:** an empty friction log looks identical to a smooth
  task. There is no artefact that says "five refusals happened here".
- **The sweep itself:** `/after-task-dantotsus` treats a thin
  `KAIZEN.md` as a finding, which is the right instinct and the wrong
  moment — it fires after the context that would have filled the file
  is gone.

## Countermeasure

The five hooks that block a call now record what they refused, in the
same run that refuses it.

- **Code:** `.claude/hooks/kaizen-refusal.sh`, called from each
  blocking branch of the five `pretool-*` hooks.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** PR #102 · commits on this branch adding
`.claude/hooks/kaizen-refusal.sh` and wiring the five hooks

**The actual fix:**

```diff
   echo "[no-broad-kill]   ss -lptn 'sport = :5173'" >&2
+  "$(dirname "$0")/kaizen-refusal.sh" no-broad-kill "reached for pkill or killall on a machine other agents share"
   exit 2
```

The helper never fails its caller — a log that cannot be written is
not a reason to let a refused call through, and `exit 2` has to stay
the last word. It writes only when `KAIZEN.md` already exists, so a
checkout that never started a task does not grow one.

`scripts/check-hook-decisions.sh` feeds every hook the commands it must
refuse, and those refusals are the check working rather than friction
anyone hit, so it sets `KAIZEN_LOG_REFUSALS=0` while probing. Without
that, running the commit gate would have filled the file with rows for
calls nobody made.

**Sibling defects swept:** the sweep's own skill was the second casualty
of the same blindness. `/after-task-dantotsus` requires its friction
inventory at the top of the kaizen PR body, and PR #101 landed
`scripts/pr/check-pr-body.ts`, whose budget refuses a body that size.
Two documents contradicted each other from that moment and nothing
noticed, because the only thing that reads them both is the sweep, which
runs once per PR. The skill now sends the inventory to a committed file
under `docs/features/meta/` and has the body link it, which is the
better shape regardless: the body is an index and the inventory is
evidence.

All five blocking hooks were wired in the same pass — `pretool-gh-pr-create`, `pretool-github-pr-body` (both of
its exit paths), `pretool-no-broad-kill`, `pretool-no-discarding-reset`
and `pretool-no-swallowed-push` — rather than the two that fired during
this PR, because the next PR will hit a different subset.

## See also

- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md)
  — the same shape one rung down: writing the lesson somewhere is not
  the same as the lesson arriving when it is needed.
- [`the-hook-that-refused-the-page-explaining-it.md`](./the-hook-that-refused-the-page-explaining-it.md)
  — the hooks' other contract, and why `check-hook-decisions.sh` runs
  them with sample input in the first place.
