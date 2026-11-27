---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#55'
fix-commits: [a9c72cedd1, 731066132d]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/subagent-no-staging.core.ts, .claude/settings.json]
time-to-detect: minutes
tags: [agents, git, generators, meta]
zone: CLAUDE.md
---

# Six agents, one index, and four generators that read the whole tree

## User impact

Six subagents worked in one checkout on one task. The operator's session hit
three failures that no agent could see coming.

| | Seen | Expected |
| --- | --- | --- |
| Main session commits its own files | `git add` staged 224 renames an agent had left in the index, and the commit tried to ship them | only the main session's files are committed |
| An agent commits its finished work | four pre-commit gates fail, each on a file another agent owned | the agent's own work passes or fails on its own |
| An agent runs a generator to check its change | the blueprint count moves by two and a pragma digest changes, from edits it never made | the output describes the agent's change only |

## Causal chain

- The main session's commit carried 224 renames it did not make.
  - Its `git add` wrote to the one git index every agent in the checkout shares.
    - An agent had already staged its renames there, because its brief told it to commit its own work.
- An agent's commit failed on files it never opened.
  - Pre-commit ran `blueprint-indexing --check`, `blueprint-heatmap --check`,
    `architecture-graph --check`, `check-pure-modules-have-callers.sh` and
    `check-single-stylesheet.sh`, which read the whole tree, not the staged paths.
    - The tree held other agents' half-finished edits.
      - Each agent was briefed to commit, so six agents tried to commit into one tree.
- A generator's output described work the running agent never did.
  - The generator read the whole tree mid fan-out.
- All three branches meet at one event. The dispatcher sent six writing agents
  into one checkout with the single-agent instruction "commit with conventional
  commits", carried by every skill and brief in the repository at the time.

## Root cause of occurrence

*Thought each agent's `git add` and `git commit` touch only that agent's work,
actually the git index and every whole-tree `--check` gate are shared state that
six concurrent writers all read and write.* (Method)

The process handed every agent the commit step written for a lone agent. The
brief template said to commit, and nothing in it changed when the dispatcher ran
six agents at once.

## Detection failure causes

- **Brief and skill templates:** "Commit with conventional commits" was the same
  for one agent and for six, so no step marked the fan-out as different.
- **Pre-commit:** the gates are whole-tree by design, which is right for one
  author. A failure on another agent's file read as a broken repository rather
  than as a concurrency rule being broken.
- **Harness:** no hook looked at whether a `git add` came from a subagent on the
  shared index, until `subagent-no-staging` existed.

## Countermeasure

Agents in a fan-out do not stage or commit. The dispatching session collects
the work, regenerates every whole-tree artefact once, and commits. Agents that
must not see each other run with `isolation: "worktree"`. The dispatcher stages
explicit paths while any agent still writes, never `git add -A`. The session
that wrote this entry swept a running agent's half-finished transaction fix into
an unrelated commit three commits later, which is the same failure from the
dispatcher's side.

## Eradication

**Type:** DevX check (level 2), for the subagent half. The dispatcher half is
knowledge.

**Reference:** commit [`731066132d`](https://github.com/hugoleborso/borso.fr/commit/731066132d)
(PR #334) added the hook as `pretool-subagent-no-staging.sh`. It lives today in
`scripts/hooks/checks/subagent-no-staging.core.ts`, routed by the `Bash` matcher
in `.claude/settings.json`. Commit [`a9c72cedd1`](https://github.com/hugoleborso/borso.fr/commit/a9c72cedd1)
wrote the first instruction, now CLAUDE.md's *Parallel agents*.

```ts
if (!input.agent_id) return PASS;
...
if (ownGitDirectory === '' || ownGitDirectory !== sharedIndexDirectory) return PASS;
return refuse(RULE, 'a subagent ran a git command that writes the shared index', [...]);
```

The hook refuses `git add`, `git mv`, `git rm` and `git commit` from any subagent
whose git directory is the shared checkout's. A subagent in its own worktree
passes. The entry's first draft rejected a hook because it assumed a lock was
needed. `agent_id` on the hook input made a lock unnecessary.

**Proof it can fail:** `scripts/hooks/checks/subagent-no-staging.core.test.ts`
covers the refusal on the shared index and the pass in a worktree.

**Gap that holds only as knowledge:** the main session's `git add -A` while an
agent writes, and a generator run mid fan-out. CLAUDE.md's *Parallel agents*
says "stage explicit paths, never `git add -A`" and "Run `scripts/reports.sh`
once, after every agent has finished". No check refuses either
(`grep -rln 'add -A' scripts/hooks/checks/` finds nothing, measured).

**Proposed:** add a branch to `subagent-no-staging.core.ts` that refuses
`git add -A`, `git add .`, `git add --all`, `git add -u` and `git commit -a` from
any session, main included. Explicit paths always work, so the refusal costs one
retyped command. A broad stage of a tree another agent is writing would then be
impossible.

**Proposed:** a PreToolUse check on the `Agent` tool in `scripts/hooks/checks/`,
in the shape of `agent-after-route.core.ts`. It refuses a dispatch without
`isolation: "worktree"` while another agent dispatched without it is still
running in the same session. A second writer in the shared checkout would then
be impossible, which removes the shared index and the shared tree together. No
hook here reads `isolation` or tracks running agents today
(`grep -rn isolation scripts/hooks/` finds nothing, measured), so the check needs
a record of open dispatches that a `SubagentStop` hook clears (feasibility
inferred, not tried). The staging refusal above stays, for the agents that run
alone in the checkout.

**Similar instances:** `grep -rl 'recurs:.*parallel-agents-share-one-index' docs/dantotsus/`
finds four later entries besides this one, each a repeat of the same shared
index or shared tree.
