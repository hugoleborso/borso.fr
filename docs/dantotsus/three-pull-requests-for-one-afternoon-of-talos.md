---
date: 2026-11-11
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#286'
fix-pr: none (the kaizen pull request of PR #292, not numbered when this was written)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-one-pull-request-per-session.sh, .claude/settings.json]
time-to-detect: hours
tags: [hooks, harness, process, github, skill, git]
zone: .claude/skills/route
weak-point: prose-stands-in-for-a-check
recurs: none (PR #216's seven stacked pull requests are the same class and have no entry; the rule they produced is the sentence this entry replaces with a hook)
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
    - Each request of the afternoon arrived as its own task, and CLAUDE.md says to open a pull request as soon as a change is done.
      - Nothing at the call compared the new pull request with the ones the session already had open.
        - "One branch, one pull request, never stacked" lived in `.claude/skills/route/SKILL.md`, a file read when `/route` runs, not when a pull request opens.
  - The later work depended on the earlier (#292 merged both other branches into itself at 17:32, before its first own commit).

## Root cause of occurrence

*Thought a new request from the operator is a new feature, so a new branch
and a new pull request, actually the unit is what the operator reviews and
merges together, and work that needs an open pull request's code belongs in
it.*

`.claude/skills/route/SKILL.md:60`:

> A feature is one branch and one pull request at every tier. Slices are
> commits on that branch, never pull requests stacked on each other. The
> operator reviews a feature on one preview and merges it at once, and PR
> #216's seven stacked pull requests were rejected for that reason.

The sentence was true and was not where the decision was made. It is the
second time: PR #216 produced it.

## Detection failure causes

- **Hooks:** two hooks ran on `mcp__github__create_pull_request`, the body budget and "an API change needs a validation report". Neither read the other open pull requests.
- **Skill:** `/open-pr` checks the body, not whether a pull request should exist.
- **Review:** the operator caught it, after all three were open.

## Countermeasure

`.claude/hooks/pretool-one-pull-request-per-session.sh` runs before
`mcp__github__create_pull_request` and refuses two shapes.

1. A base that is not `main`.
2. A pull request from a session that already has one open. Every body ends with the session's address, so the hook lists the open pull requests through `gh api` and matches `session_<id>` in their bodies.

Independent work passes by saying so in the new body, as
`Independent of #<number>: <reason>`, which is where the operator reads it.
The hook fails open when it has no session id or GitHub does not answer.

## Eradication

**Type:** DevX check (level 2).

**Reference:** the commit that adds this file.

```diff
+if [[ -n "$BASE" && "$BASE" != "main" ]]; then
+  ...
+  refuse "opened a pull request stacked on a branch other than main"
+fi
+OPEN="$(cd "$REPO_ROOT" && gh api "repos/$OWNER/$REPO/pulls?state=open&per_page=100" \
+  --jq ".[] | select((.body // \"\") | contains(\"session_$SESSION_ID\")) | \"\(.number)\t\(.head.ref)\"" 2>/dev/null || true)"
```

**Proof it can fail:** fed by hand with `KAIZEN_LOG_REFUSALS=0`, on 2026-11-11, against the live repository where #300 is open from session `01K69KnCghwMgEmR1Dgo4H2u`.

```
1 stacked:
[one-pull-request] the base is `feat/x`, not `main`: this is a stacked pull request.
exit=2
2 same session as open #300:
[one-pull-request] this session already has a pull request open:
  #300 on `feat/talos-computed-pages-and-freshness`
exit=2
3 declared independent:
exit=0
4 this session:
exit=0
```

**Library search:** none applies. The role is a guard on one MCP call, and the repository's other guards on that call are the same kind of shell hook.

**What it does not cover:** `gh pr create` from Bash, which a hosted session cannot use because it needs GraphQL (`docs/knowledge/what-a-hosted-session-cannot-do-on-github.md`). A pull request whose body was written without the session footer is invisible to the match.

**Similar instances:** `grep -rn "stacked" .claude/skills docs/dantotsus` finds the route sentence and no other rule held the same way.
