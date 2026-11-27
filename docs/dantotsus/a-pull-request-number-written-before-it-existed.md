---
date: 2026-11-15
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#356'
fix-commits: [self]
eradication-level: 5
eradication-paths: [docs/dantotsus/_template.md, scripts/quality/dantotsu-schema.core.ts]
time-to-detect: minutes
tags: [self-improvement-loop, documentation, meta]
zone: docs/dantotsus/_template.md
recurs: none (the first entry about a guessed number in a dantotsu's own front matter)
---

# A pull request number written before it existed

## User impact

The sweep that shipped PR #356 wrote `fix-pr: '#353'` into its dantotsu. PR #353
was another pull request, the vocabulary split. The session opened #356, saw
its real number, and pushed a second commit ten seconds later (`ad987af`). The
first `ci` run was cancelled half-way and a second one ran (runs 43688818381
and 43688842997, measured).

| | Seen | Expected |
| --- | --- | --- |
| The committed entry before the pull request opened | `fix-pr: '#353'`, the number of an unrelated pull request | No number, or the right one |
| CI | One cancelled run and one more full run | One run |

No reader was misled, because the fix landed before the merge. A reader of an
entry merged with the guess would have followed it to the wrong pull request.

## Causal chain

- The entry named the wrong pull request, and fixing it cost a commit and a CI run.
  - The session filled `fix-pr: '#<n>'` before `create_pull_request` had answered.
    - The template carried the slot, `fix-pr: '#<n>' # the PR that landed the
      eradication`, and the entry used `fix-commits: [self]`, so the pull request
      did not exist yet.
      - PR #162 (`702c1b2`) added `'fix-pr'` to `REQUIRED_FIELDS` in
        `scripts/quality/dantotsu-schema.core.ts`, so every entry had to fill it.
        - The template slot dates from `9adfe24` (2026-05-03), when an entry was
          written after its fix had merged and the number existed (inferred).

## Root cause of occurrence

*Thought the template's `fix-pr` slot asks for a known fact, actually for
`fix-commits: [self]` the number does not exist until after the commit that
carries it, and `git log` derives it anyway.* **Machine.** The template and
`REQUIRED_FIELDS` demanded the field.

The squash merge subject of the commit named in `fix-commits` ends in `(#<n>)`
on `main`. Every one of the 321 entries had a `fix-commits` value from which
the pull request follows (measured). Sessions had worked around the slot 99
times, in 40 different `none (...)` phrasings (measured on `main`), such as
`none (opened by this kaizen sweep, number not known when written)`.

## Detection failure causes

- **Front-matter check:** `checkPullRequestField` tests the shape `#<digits>`. A wrong number has the right shape.
- **The writer's rules:** CLAUDE.md's "No invented numbers" names prices, latencies and limits. A template slot that asks for a number reads as a fact to fill in.

## Countermeasure

Remove the field. `fix-pr` left `REQUIRED_FIELDS`, the schema's pull-request
check, the template and all 321 entries. The template's *Reference* line names
the commit instead. `vitest` on both schema test files passes (53 tests) and
`check-dantotsu-front-matter.ts` accepts all entries (measured).

The property dropped: an entry no longer states its fixing pull request.
`git log -1 --format=%s <fix-commit>` on `main` names it.

## Eradication

**Type:** knowledge (level 5). The slot is gone from the template, and nothing
refuses the field when it comes back.

**Reference:** the commit adding this file.

```diff
 const REQUIRED_FIELDS: readonly string[] = [
   'related-pr',
-  'fix-pr',
   'fix-commits',
```

```diff
-fix-pr: '#<n>'                      # the PR that landed the eradication, or none (<reason>)
+**Reference:** commit [`<sha>`](url), or "the commit adding this file" for `fix-commits: [self]`. ...
```

**Proof it can fail:** nothing refuses the field, as this entry shows.
`docs/dantotsus/the-union-merge-only-this-checkout-could-see.md`, added the same
day by PR #359, carries `fix-pr: '#352'`, and `check-dantotsu-front-matter.ts`
accepts it (measured this session: "345 dantotsus carry a complete, resolvable
front matter"). The schema reads only the fields it knows.

**Similar instances:** `grep -rn '^fix-pr' docs/dantotsus/` prints that one
entry. `grep -rn "'#<n>'" docs .claude` finds `related-pr` in the template, which
names the pull request where the defect lived. That one is merged and numbered
when the entry is written, so it cannot be guessed the same way.

**Proposed:** make `scripts/quality/dantotsu-schema.core.ts` refuse any front
matter field outside the template's set, with a message naming the field. A
front matter copied from an older branch or entry could then not bring `fix-pr`
back, and the entry above would fail the check until its line is deleted. That
would be a DevX check (level 2).
