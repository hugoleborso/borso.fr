---
date: 2026-08-20
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#64'
fix-pr: '#64'
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [skill, standards, gates, harness, meta]
---

# The brief said four files, the gate said five

## Symptom

Two of the five standards-review passes on one branch were dispatched with a
brief naming the files to review, and both times the list was short by a file
that had changed since the brief was written. Both agents logged it themselves:

> the dispatching brief named four unsealed files and seal.ts verify named
> five, so an agent that trusts its brief over the gate silently skips a file

> the fifth standards-review pass on this branch was again briefed with fewer
> files than seal.ts verify reports, so the brief and the gate disagree by
> default and only the gate is right

Both agents ran the gate anyway and caught it. An agent that had followed its
brief would have left a file unsealed while the report said the branch was
reviewed — and on this repository the seal is what CI gates on, so the file
would have reached `main` with a review it never had.

## Root-cause chain

1. **Why did the brief name files?**
   Because the skill tells the dispatcher to run `seal.ts verify` first, to find
   out whether there is a review to run at all. Its output is a list of files,
   and pasting it into the brief looks like helping the agent aim.

2. **Why was the list wrong by the time the agent read it?**
   The dispatcher writes the brief once. The agent starts, reads a dozen files,
   runs the gate, and reports — six to nine minutes later. On an active branch a
   commit lands in that window, and it landed twice here.

3. **Why is that worse than no list?**
   Because the brief is the agent's instructions and the gate is a command it
   may or may not run. A list in the brief competes with the gate and looks
   authoritative — it came from the human-equivalent, it is specific, and it is
   at the top of the prompt. The gate is the only one that is right by
   construction, because it reads the tree at the moment it is asked.

4. **Why did the skill not forbid it?**
   It said the brief carries "exactly these fields" and listed three. It did not
   say what happens if you add a fourth, and "exactly" was read as a minimum.

**Root cause:** thought a file list helps the agent aim, actually it is a
snapshot competing with a live gate, and the agent has no way to know which one
is stale.

## Detection failure causes

- **Linter / static analysis:** the brief is prose in a tool call; nothing reads
  it.
- **CI:** `seal.ts verify` in CI would have caught the *consequence* — an
  unsealed file reaching `main` — but only after the fact, and only because
  both agents happened to ignore their brief.
- **Code review:** the reviewers here are the agents that were mis-briefed.
- **Knowledge:** the skill is the knowledge, and it was ambiguous.

## Countermeasure

- **Operator action:** none. Both passes self-corrected by running the gate.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the instruction that made the mistake
expressible is removed)

**Reference:** [PR #64](https://github.com/hugoleborso/borso.fr/pull/64) — the
kaizen branch commits below.

`.claude/skills/standards-review/SKILL.md` now says plainly that the brief
carries the three fields and no file list, names the failure, and says what to
put there instead: what changed, so the agent can aim, and nothing that claims
to be the set of files.

**The actual fix:**

```diff
+**Exactly those three fields, and no file list.** The temptation, having just
+run `seal.ts verify` to find out whether there is a review to run, is to paste
+its output into the brief. Do not: the brief is written once and the tree keeps
+moving … The agent runs `seal.ts verify` itself; naming files can only make its
+answer worse. Say what changed if it helps the agent aim, and let the gate say
+which files that means.
```

**Sibling defects swept:** none. Worth checking the other dispatching skills the
next time one is edited — the same "helpfully paste the current state into the
brief" instinct applies to any agent that reads a moving tree.

## See also

- [`orchestrator-dispatch-hygiene`](../knowledge/orchestrator-dispatch-hygiene.md)
  — what a dispatch brief is for, and what it must not carry.
- [`parallel-agents-share-one-index-and-every-generator.md`](./parallel-agents-share-one-index-and-every-generator.md)
  — the other way a moving tree invalidates what an agent was told.
