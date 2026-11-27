---
date: 2026-11-11
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#286'
fix-commits: [self, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/one-pull-request-per-session.core.ts, scripts/hooks/hook-events.ts]
time-to-detect: hours
tags: [hooks, harness, process, github, skill, git]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: none (PR #216's seven stacked pull requests are the same class and have no entry; the rule they produced is the sentence this entry backs with a hook)
---

# Three pull requests for one afternoon of talos

## User impact

The operator reviews a feature on one preview and merges it once. On
2026-11-11 one session gave him three pull requests for talos work where each
needed the one before.

| | Seen | Expected |
| --- | --- | --- |
| Pull requests open at once | #286, #289 and #292, all based on `main` | one |
| Fate of the first two | closed without merging, their code shipped in #292 | never opened |
| Merges of branches into each other and of `main` | 9 merge commits among the 28 of #292 | the merges of `main` only |
| The operator backlog | a row naming #286 and #289 as the source of a task, fixed by commit `44cc168` | a row naming the pull request that ships |
| Operator turns spent on it | one to ask for stacking, one to forbid stacking | none |

The counts are read from #292's commit list. The two operator turns are
reported by the sweep prompt and were not read in a transcript.

## Causal chain

- The operator had to decide what to do with three pull requests.
  - The session opened a second and a third pull request while the first was open.
    - Each request of the afternoon arrived as its own task, and at the end
      of each the session followed `CLAUDE.md:90`, loaded in every session:

      > Once a change is done, front-end above all, open its pull request
      > without asking.

      - The rule that says otherwise, "A feature is one branch and one pull
        request at every tier" (`.claude/skills/route/SKILL.md:60`), sits in a
        skill read when `/route` runs, not when a pull request opens (inferred:
        the session did not quote it at either call).
  - The later work depended on the earlier: #292 merged both other branches
    into itself at 17:32, before its first own commit.

## Root cause of occurrence

*Thought each new request from the operator is a finished change that gets
its own pull request, actually the unit is what the operator reviews and
merges together, and work that needs an open pull request's code belongs in
it.* **Method:** two written rules disagree on the unit of work. The one that
says "a pull request per change" is in the file every session loads. The one
that says "a pull request per feature" is in a skill that was not loaded
(Material for that half, under the agentic rule).

`.claude/skills/route/SKILL.md:60`, read this session:

> A feature is one branch and one pull request at every tier. Slices are
> commits on that branch, never pull requests stacked on each other.

`CLAUDE.md:90` still carries the unqualified sentence (read this session).
This is the second occurrence: PR #216 produced the route sentence.

## Detection failure causes

- **Hooks:** two hooks ran on `mcp__github__create_pull_request`, the body
  budget and "an API change needs a validation report". Neither read the
  session's other open pull requests, so nothing at the call compared the new
  pull request with the open ones.
- **Skill:** `/open-pr` checks the body, not whether a pull request should
  exist.
- **Review:** the operator caught it, after all three were open.

## Countermeasure

A hook before `mcp__github__create_pull_request` refuses two shapes.

1. A base that is not `main`.
2. A pull request from a session that already has one open. Every body ends
   with the session's address, so the hook lists the open pull requests
   through `gh api` and matches `session_<id>` in their bodies.

Independent work passes by saying so in the new body, as
`Independent of #<number>: <reason>`, which is where the operator reads it.
The hook fails open when it has no session id or GitHub does not answer.

## Eradication

**Type:** DevX check (level 2).

**Reference:** the commit that adds this file shipped the hook as
`.claude/hooks/pretool-one-pull-request-per-session.sh`. Commit
[`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4)
(PR #411, 2026-11-27, which carried "run every hook through one TypeScript entry") replaced it with
`scripts/hooks/checks/one-pull-request-per-session.core.ts`, registered in
`scripts/hooks/hook-events.ts:31`. The shell file no longer exists.

```ts
if (base !== '' && base !== 'main') {
  return refuseAsOnePullRequest('opened a pull request stacked on a branch other than main', [
    `${TAG} the base is \`${base}\`, not \`main\`: this is a stacked pull request.`,
```

**Proof it can fail:** its 12 unit tests pass on today's `main` (run this
session), among them "refuses a stacked pull request" and "refuses a second
pull request from a session that has one open, naming each undeclared one".

**What it does not cover:** `gh pr create` from Bash, which a hosted session
cannot use because it needs GraphQL
(`docs/knowledge/what-a-hosted-session-cannot-do-on-github.md`). A pull
request whose body lacks the session footer is invisible to the match.

**Proposed:** subtract the contradiction. Change `CLAUDE.md:90` to "push to
this session's open pull request, or open one if it has none". The hook then
holds a rule that nothing the session loads contradicts, and the route
sentence stops being the only place the unit is stated.

**Similar instances:** `grep -rn "stacked" .claude/skills docs/dantotsus`
finds the route sentence and no other rule held the same way.
