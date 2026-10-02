---
date: 2026-09-18
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/108
fix-pr: https://github.com/hugoleborso/borso.fr/pull/109
fix-commits: [2d5502d]
eradication-level: 1
time-to-detect: months
tags: [gates, testing, coverage, mutation, pragma, dead-code, process]
---

# The allowance that parked a duplicate, and then let it grow

## Symptom

PR #108 fixed a service worker defect by adding one predicate,
`isHtmlContentType`, in two places: `apps/pragma/site/public/sw.js`, which
runs in every visitor's browser, and `apps/pragma/site/src/sw/sw-cache.utils.ts`,
which runs nowhere. Every gate passed. The copy that ships had no test at
all; the copy that does not ship was held at 100% coverage and a perfect
mutation score.

```bash
$ grep -rn "sw-cache" --include=*.ts apps/
apps/pragma/site/src/sw/sw-cache.utils.test.ts:2:import { … } from './sw-cache.utils';
```

One importer, and it is the module's own test.

## Root-cause chain

1. **Why did a pure module with no runtime caller pass the gate written to
   catch exactly that?** Because `scripts/check-pure-modules-have-callers.sh`
   carries an `ALLOWED_TEST_ONLY` map, and both service worker modules were
   listed in it.

2. **Why were they listed?** The reason recorded on the entry says it:
   *"live counterpart: site/public/sw.js reimplements this in plain JS;
   consolidating needs a SW bundling decision"*. The duplication was known,
   understood and deliberately parked.

3. **Why did parking it make it worse rather than neutral?** Because the
   allowance was unconditional. It said this module may have no caller. It
   never said the two copies had to keep saying the same thing, and nothing
   else did either, so the pair could drift or grow without any gate noticing.

4. **Why did the logic land in the untested copy at all?** Because
   `coverage.include` selects files by suffix under `site/src`, and nothing
   under `public/` can match it. Writing the predicate as `sw-cache.utils.ts`
   is how you get a number; writing it in `sw.js` is how you get it to run.
   The gate rewarded the copy that does nothing.

5. **Why did nobody take the bundling decision?** Because each new predicate
   made deferring cheaper and doing it dearer, and no gate ever put the choice
   in front of anyone. An allowance with no expiry is a decision that never
   comes due.

**Root cause:** thought *an allow-list entry with a written reason parks a
known duplication safely until someone takes the decision*, actually *an
unconditional allowance is a licence to extend the duplication, because the
gates keep scoring the dead copy and nothing ever forces the decision*.

## Detection failure causes

- **Typing:** the two copies share no type. One is TypeScript, one is plain
  JavaScript in `public/`, and no signature relates them.
- **Linter / static analysis:** `sw.js` was not linted at all until PR #108,
  and linting it still says nothing about a second file saying the same thing.
- **Functional validation locally:** the app works. Both copies agreed at the
  time; the defect is structural, not behavioural.
- **CI:** coverage and mutation both reported the dead copy at full marks,
  which is the strongest possible signal pointing at the wrong file.
- **Code review:** the allow-list entry reads as a considered decision,
  because it was one. Nothing in it says *and do not add to this*.

## Countermeasure

Delete both dead modules and test the file that ships.
`apps/pragma/site/src/sw/manifest.utils.ts` was the same shape one step
worse: the live implementation is `apps/pragma/api/src/sessions/offline-manifest.core.ts`,
which builds the payload the endpoint returns, so the site copy was a third
implementation of one rule and `listManifestUrls` in `sw.js` a fourth.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #109](https://github.com/hugoleborso/borso.fr/pull/109) · commit [`2d5502d`](https://github.com/hugoleborso/borso.fr/commit/2d5502de8f7e3f47272dbea3d02a0f23c3165f7a)

**The actual fix:**

```diff
- apps/pragma/site/src/sw/sw-cache.utils.ts       (33 lines, no runtime caller)
- apps/pragma/site/src/sw/sw-cache.utils.test.ts
- apps/pragma/site/src/sw/manifest.utils.ts       (53 lines, no runtime caller)
- apps/pragma/site/src/sw/manifest.utils.test.ts
+ apps/pragma/site/src/sw/service-worker.test.ts
+ apps/pragma/site/src/sw/service-worker.test-utils.ts
```

```diff
  declare -A ALLOWED_TEST_ONLY=(
-   [apps/pragma/site/src/sw/manifest.utils.ts]="live counterpart: …"
-   [apps/pragma/site/src/sw/sw-cache.utils.ts]="live counterpart: …"
  )
```

The new test loads `public/sw.js` through a `?raw` import and runs it in a
`node:vm` context holding a fake `self`, `caches` and `fetch`, so the
assertions run against the exact bytes the browser is served. There is now
one copy of each predicate and it is the one that executes. Extending the
duplication is no longer expressible, because the second file is gone.

The tests were verified to bite by reverting each half of PR #108's fix in
turn: removing the content-type guard fails *"never stores an asset URL the
origin answered with HTML"*, and moving `CACHE_VERSION` back to `pragma-v3`
fails the activate case.

**Property traded:** `sw.js` now has behavioural tests and no per-file
coverage gate, where the deleted copies had a coverage gate and no
relationship to the running program. Chasing that number is what put the
logic in two places to begin with.

**Sibling defects swept:** `manifest.utils.ts`, deleted in the same commit.
One `ALLOWED_TEST_ONLY` entry of this shape remains,
`apps/pragma/api/src/mastery/mastery.core.ts`, whose live counterpart is
`site/src/lib/mastery-aggregate.core.ts`. Consolidating that pair means
moving the rule into `apps/pragma/domain/`, which is a cross-boundary
decision under [ADR-0010](../adr/0010-pragma-domain-folder-for-cross-boundary-rules.md)
and belongs to the operator, not to a sweep.

## See also

- [Three green gates on fifty-eight lines that ran nowhere](./three-green-gates-on-code-that-ran-nowhere.md), which produced the gate this defect walked through.
- [The test that no project collected](./the-test-that-no-project-collected.md), the reason the shipping file could not have been tested even by someone who tried.
- [Two copies that had to agree and nothing made them](./two-copies-that-had-to-agree-and-nothing-made-them.md).
