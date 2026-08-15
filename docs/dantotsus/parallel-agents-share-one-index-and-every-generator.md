---
date: 2026-08-15
introduced-at: implementation
detected-at: implementation
severity: medium
related-pr: 55
fix-pr: 55
eradication-level: 2
time-to-detect: minutes
tags: [agents, git, generators, meta]
---

# Six agents, one index, and four generators that read the whole tree

## Symptom

Six subagents worked in one checkout on one task. Three separate failures, none
of which either the agents or the main session had a way to see coming:

1. A `git add` of the main session's own files staged 224 renames an agent had
   left in the index, and the commit that followed tried to ship all of them.
2. An agent that finished its work correctly could not commit it. Four
   pre-commit gates failed, each on a file another agent owned.
3. An agent that ran a generator to check its own change got output containing
   two other agents' uncommitted work: the blueprint file count moved by two
   and a pragma architecture digest changed, from edits it had never made.

## Root-cause chain

1. Subagents in this harness share the working tree **and the git index**. The
   index is one file with no per-agent view.
2. Every agent was told to commit its own work, which is the right instruction
   for a single agent and wrong for six. `git add` is a write to shared state.
3. `git commit --only <paths>` avoids staging another agent's work, and does
   not avoid the hooks. Pre-commit runs `blueprint-indexing --check`,
   `blueprint-heatmap --check`, `architecture-graph --check`,
   `check-pure-modules-have-callers.sh` and `check-single-stylesheet.sh`, and
   **all five read the whole tree** rather than the staged paths.
4. So a gate failed on a half-finished rename in an app the committing agent
   had never opened, and there was no correct action available to it: fixing
   the file meant editing another agent's work mid-flight, and regenerating the
   artefact meant baking that work into a generated file.
5. A whole-tree generator run at any moment during the fan-out produces output
   describing a state that was never committed and never will be.

## Detection failure causes

- **The instruction was written for one agent.** "Commit with conventional
  commits" is in every skill and every brief in this repository. Nothing in it
  changes when six agents run at once, and nothing said it should.
- **The gates are whole-tree by design, and that design is correct.** A stale
  generated page is a page that lies, so `--check` reading the whole tree is
  the right call for one author. It is the wrong call for six concurrent ones,
  and nothing distinguished the two situations.
- **The failure surfaced as somebody else's problem.** Each agent saw a gate
  failing on files outside its ownership, which reads as a broken repository
  rather than as a concurrency rule it was breaking.

## Countermeasure

Agents in a fan-out do not commit and do not stage. The dispatching session
collects the work, regenerates every whole-tree artefact **once**, and commits.
When agents genuinely must not see each other, they get
`isolation: "worktree"` instead of a shared checkout.

## Eradication

Rung 2, a DevX check in the instructions the agents actually read, because the
thing to prevent is an instruction being written rather than a line of code
being wrong.

- [`.claude/skills/route/SKILL.md`](../../.claude/skills/route/SKILL.md) gains a
  *Parallel agents* section naming both traps, and its Tier 3 requires a
  disjoint file ownership list and a no-commit instruction per agent.
- [`CLAUDE.md`](../../CLAUDE.md) carries the same two traps under *Sizing a task
  before starting it*, so a session that never opens the skill still meets them.

Rung 1 was considered and rejected. A pre-commit hook that refuses to run while
another agent holds the tree would need a lock nothing currently takes, and the
lock would have to be released by a crashed agent, which is a distributed
systems problem this repository does not have and should not acquire. The
instruction is the smaller fix, and the fan-out is always dispatched by
something that reads it.

## What to check next time

Before dispatching more than one agent into one checkout, ask which shared
files each will write. The git index counts as one of them, and so does every
file a `--check` gate regenerates.
