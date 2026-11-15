---
date: 2026-11-15
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#356'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/quality/dantotsu-schema.core.ts, docs/dantotsus/_template.md]
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
  - The session filled the template's `fix-pr: '#<n>'` slot before `create_pull_request` had answered.
    - The template and `dantotsu-schema.core.ts` required a field whose value does not exist until after the commit that carries it, in the usual `fix-commits: [self]` case.

## Root cause of occurrence

*Thought the fixing pull request's number is a fact to record in the entry,
actually it is derivable and, for `[self]`, unknowable when the entry is written.*

The template said `fix-pr: '#<n>' # the PR that landed the eradication`, and
`REQUIRED_FIELDS` in `scripts/quality/dantotsu-schema.core.ts` listed
`'fix-pr'`. The squash merge subject of the commit named in `fix-commits` ends
in `(#<n>)` on `main`, so `git log` already holds the number. Every one of the
321 entries had a `fix-commits` value from which the pull request follows
(measured: no entry had `fix-commits: none` with a numeric `fix-pr`). Sessions
worked around the slot 99 times, in 40 different `none (...)` phrasings (measured on `main`), such as
`none (opened by this kaizen sweep, number not known when written)`.

## Detection failure causes

- **Front-matter check:** `checkPullRequestField` tests the shape `#<digits>`. A wrong number has the right shape.
- **The writer:** CLAUDE.md's "No invented numbers" covers prices and limits in prose. A template slot asking for a number reads as a fact to fill in, not a guess.

## Countermeasure

Remove the field. `fix-pr` is gone from `REQUIRED_FIELDS`, from the schema's
pull-request check, from the template and from all 321 entries. The template's
*Reference* line names the commit instead of the pull request. The two schema
and record tests now exercise `related-pr`, the field that still exists.
`vitest` on both test files passes (53 tests) and
`check-dantotsu-front-matter.ts` accepts all entries (measured).

The property dropped: an entry no longer states its fixing pull request in its
front matter. `git log -1 --format=%s <fix-commit>` on `main` names it, and for
`[self]` the commit that added the file names it.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file

```diff
 const REQUIRED_FIELDS: readonly string[] = [
   'related-pr',
-  'fix-pr',
   'fix-commits',
...
       ...checkPullRequestField(document, 'related-pr'),
-      ...checkPullRequestField(document, 'fix-pr'),
```

```diff
-fix-pr: '#<n>'                      # the PR that landed the eradication, or none (<reason>)
-**Reference:** [PR #<n>](url) · commit [`<sha>`](url)
+**Reference:** commit [`<sha>`](url), or "the commit adding this file" for `fix-commits: [self]`. ...
```

**Proof it can fail:** no new check ships, so there is nothing to make fail.
The slot that took the guess no longer exists: `grep -c '^fix-pr:'
docs/dantotsus/*.md` counts 0 in every file, and the template has no line that
asks for the number.

**Similar instances:** `grep -rn "'#<n>'" docs .claude` finds `related-pr` in
the template. That field names the pull request where the defect lived, which
is merged and numbered when the entry is written, so it cannot be guessed the
same way.
