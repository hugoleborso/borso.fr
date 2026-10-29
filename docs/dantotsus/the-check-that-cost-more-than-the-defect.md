---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#219'
fix-pr: '#220'
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

## Symptom

Aurora DSQL refused a connection parameter in production
([the connection parameter no mock could refuse](./the-connection-parameter-no-mock-could-refuse.md)).
The eradication shipped with the fix was a pre-commit script that read every
`connection: { … }` under `apps/` and `infra/` and refused a key outside an
allow-list. It worked, it was proven both ways, it cost 39 ms of CPU — well
inside the 300 ms per-check budget — and it passed review because nothing asked
the question the operator then asked:

> Est-ce qu'on va un jour avoir besoin de ce check ?

Measured rather than guessed:

| | |
| --- | --- |
| Commits it would run on | 100 of the last 100 touch a `.ts` under `apps/` or `infra/` |
| Lines it guards | 5, all identical, all `search_path` |
| Commits that ever touched those files | 15, across the repository's history |
| Commits that touched the guarded line | effectively none |

A permanent toll on every commit, with a hand-rolled parser that would have
misread a multi-line `connection` block, against an accident that had happened
once. It was removed before merge and replaced by a smoke invocation after the
production deploy, which answers the whole class rather than one key.

## Root-cause chain

1. **Why was the check written?**
   The dantotsu ladder ranks a DevX check above a knowledge entry, and the
   instinct is to climb it.
2. **Why did that produce the wrong artefact?**
   The ladder ranks *strength*, not *worth*. It says a check beats a document;
   it does not ask what the check costs or how often its subject moves.
3. **Why was the cost not weighed?**
   The runtime budget is the only thing in this repository that prices a check,
   and it prices one run. 39 ms passes. Nothing multiplies it by how often the
   check runs, or divides it by how often the thing it guards changes.
4. **Why did no gate object?**
   Every gate the check faced asks whether it works. None asks whether it earns
   its place.
5. **Why did it take the operator to see it?**
   Writing the check and judging it were the same act, minutes apart. The
   measurements above took two commands and were not run until someone outside
   the work asked.

**Root cause:** thought the eradication ladder ranked what to build, actually
it ranks how strongly a thing is prevented, and strength bought at a recurring
cost against a surface that never moves is a bad trade the ladder cannot see.

## Detection failure causes

- **The runtime budget:** 39 ms passes, correctly. It prices one run.
- **`gate-canaries`:** would have asked for a canary, which the check could
  have passed. Proving it works is not the question.
- **Code review:** the check was correct, tested and documented. Everything
  visible about it was good.
- **The dantotsu standard:** demands an eradication and ranks the levels. It
  has nothing to say about a level-2 that is not worth having.

## Countermeasure

- **Code:** the standard that prices checks now asks the second question, and
  the commit hook's own documentation points at it.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** instruction change (level 5 — the floor, and it cannot honestly be higher)

There is no mechanical form of *"is this check worth its runs"*. The numerator
is computable and the denominator is a judgement about what a surface is for.
Grading this a 2 because it ships a rule in a standard would be exactly the
`prose-stands-in-for-a-check` weak point this entry is tagged with, so the
standard carries a `reviewer` bullet and the ledger counts it as residue.

**Reference:** PR #220 · commit `self`

**The actual fix:** `docs/standards/14-tool-runtime-budgets.md` gains the
*Earning the run* rule, which a new pre-commit check has to answer in writing
before it lands, with the two commands that produce the numbers:

```sh
# how often it would run
git log --oneline -100 --name-only --pretty=format:%h -- '<its scope>' | grep -c '^[0-9a-f]\{7,\}$'
# how often its subject actually changed
git log --oneline -- '<the files it guards>' | wc -l
```

A check whose scope is broader than its subject by two orders of magnitude goes
to pre-push, to CI, or to the moment the subject is actually exercised — which
is where this one ended up.

That rule is what the ladder was missing, and it is the only artefact that
would have stopped the original check: everything else about it was sound.

**Sibling defects swept:** the pre-commit hook's existing checks were read
against the new rule. The narrow ones (`dsql` migrations, `adr` numbers, PWA
assets) all scope to paths that change on a small fraction of commits. None is
in the shape this entry describes.

## See also

- [`the-connection-parameter-no-mock-could-refuse.md`](./the-connection-parameter-no-mock-could-refuse.md) — the defect this was the wrong answer to.
- [`the-gate-whose-own-gate-only-ran-in-ci.md`](./the-gate-whose-own-gate-only-ran-in-ci.md) — the same rule applied to a ten-second check, which is why its scope is four paths.
- [`a-written-runtime-budget-nobody-enforced.md`](./a-written-runtime-budget-nobody-enforced.md) — the budget this extends.
- [`docs/quality/weak-points.md`](../quality/weak-points.md) — `prose-stands-in-for-a-check`.
