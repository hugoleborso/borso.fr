---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#219'
fix-commits: [self]
eradication-level: 5
eradication-paths: [docs/standards/14-tool-runtime-budgets.md]
time-to-detect: same day
tags: [meta, gates, standards, harness]
zone: .husky
weak-point: prose-stands-in-for-a-check
recurs: none (the budget entries are about a check that was too slow; this one is about a check that was fast and still not worth running)
---

# The check that cost more than the defect

## User impact

The users are everyone who commits. Aurora DSQL had refused a connection
parameter in production
([the connection parameter no mock could refuse](./the-connection-parameter-no-mock-could-refuse.md)).
The eradication proposed with the fix was a pre-commit script that read every
`connection: { … }` under `apps/` and `infra/` and refused a key outside an
allow-list. It cost 39 ms of CPU, inside the 300 ms per-check budget. The
operator asked the question nothing else had asked:

> Est-ce qu'on va un jour avoir besoin de ce check ?

| | Seen | Expected |
| --- | --- | --- |
| Commits the check runs on | 100 of the last 100 touch a `.ts` under `apps/` or `infra/` | the commits that touch what it guards |
| What it guards | 5 lines, all identical, all `search_path` | |
| Commits that ever touched those files | 15 across the repository's history | |

Measured by the PR #219 session with `git log`. The check was removed before
merge, so no commit paid the toll.

## Causal chain

- A check that would run on every commit was proposed to guard five lines.
  - Its scope was every `.ts` under `apps/` and `infra/`, because it parsed
    each file for a `connection: { … }` block.
    - It was written as the eradication of the DSQL parameter defect, as a
      level 2 DevX check rather than a level 5 knowledge entry.
      - The eradication ladder in `docs/dantotsus/README.md` read "top is
        best", put knowledge "only as floor when 1–4 are genuinely
        impossible", and said an entry whose only eradication is knowledge "is
        almost always misclassified". It named no cost. (Method)

## Root cause of occurrence

*Thought the eradication ladder ranked what to build, actually it ranks how
strongly a mistake is prevented, and a strong check bought at a cost on every
commit against a surface that never moves is a bad trade the ladder cannot
see.* (Method)

The ladder was the process the writer followed, and it gave one axis, strength.
The scope followed from it: to refuse a parameter in any future `connection`
block, the check had to read every file one could appear in. Had the ladder
asked how often the check runs against how often its subject changes, the
answer would have pointed to the moment the subject is exercised, which is
where the eradication ended up.

## Detection failure causes

- **The runtime budget:** 39 ms passes, correctly. The budget prices one run
  and multiplies it by nothing.
- **`gate-canaries`:** asks whether a check can fail on a planted defect. This
  one could. Whether a check works is not whether it earns its runs.
- **Review:** the check was correct, tested and documented. Everything a
  reviewer is asked to read about it was good.

## Countermeasure

The check was removed before merge. The eradication of the DSQL defect became
a smoke invocation of the reader after the production deploy, which reaches a
real cluster and answers the whole class rather than one key.

## Eradication

**Type:** knowledge in a standard (level 5)

**Reference:** the commit adding this file, in PR #220.

`docs/standards/14-tool-runtime-budgets.md` gained *Earning the run*. A new
check on the commit answers two questions in writing before it lands, with the
commands that produce the numbers:

```sh
# how many of the last hundred commits it would run on
git log --pretty=format:%h HEAD~100..HEAD -- '<its scope>' | grep -c .
# how many commits ever touched what it guards
```

The reviewer agent checks that the answer is there.

What holds mechanically today, and was there before: every helper in
`.husky/pre-commit` (`run_check`, `run_with_files`, `queue_node_check`) takes a
scope, and runs the check only when the commit touches it. A check cannot land
without a scope. It can land with a scope as wide as this one's.

**Proposed:** compute the numerator mechanically. A pre-commit check scoped to
`.husky/pre-commit` would read each added helper call's scope regex, count how
many of the last hundred commits it matches, and refuse a new check above a
threshold unless the line carries the files it guards. The threshold is a
decision for the operator, not a number this entry can set. That would turn
the cost half of *Earning the run* from a written question into a refusal at
commit, and leave only the judgement of what a surface is for to review.

**Similar instances:** the pre-commit checks were read against the rule on
2026-10-29. The narrow ones, DSQL migrations, ADR names and PWA assets, scope
to paths that change on a small fraction of commits. None has this shape.
