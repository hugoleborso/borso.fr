---
date: 2026-09-18
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#108'
fix-commits: [2d5502de8f]
eradication-level: 5
eradication-paths: [apps/pragma/site/src/sw/service-worker.test.ts, apps/pragma/site/src/sw/service-worker.test-utils.ts, scripts/check-pure-modules-have-callers.sh]
time-to-detect: months
tags: [gates, testing, coverage, mutation, pragma, dead-code, process]
zone: scripts/check-pure-modules-have-callers.sh
recurs: [three-green-gates-on-code-that-ran-nowhere]
---

# The allowance that parked a duplicate, and then let it grow

## User impact

Every pragma visitor runs `apps/pragma/site/public/sw.js`. PR #108 fixed a defect in it by adding one predicate, `isHtmlContentType`, in two places. The file that ships had no test. The file that ships nowhere had full marks.

| | Seen | Expected |
| --- | --- | --- |
| `public/sw.js`, runs in every browser | no test, no coverage, not linted until PR #108 | the tests, on this file |
| `src/sw/sw-cache.utils.ts`, runs nowhere | 100% coverage, a perfect mutation score | no such file |

```bash
$ grep -rn "sw-cache" --include=*.ts apps/
apps/pragma/site/src/sw/sw-cache.utils.test.ts:2:import { … } from './sw-cache.utils';
```

One importer, and it is the module's own test (measured at the time of PR #108).

## Causal chain

- PR #108 passed every gate with the tested copy of its fix running nowhere.
  - The predicate was written twice, once in `sw.js` and once in `sw-cache.utils.ts`.
    - `coverage.include` selects files by suffix under `site/src`, which nothing under `public/` matches. A `*.utils.ts` copy was the only way to get a number.
  - `scripts/check-pure-modules-have-callers.sh` passed `sw-cache.utils.ts` although its only importer was its test.
    - The module was listed in the gate's `ALLOWED_TEST_ONLY` map:

      ```bash
      [apps/pragma/site/src/sw/sw-cache.utils.ts]="live counterpart: site/public/sw.js reimplements this in plain JS; consolidating needs a SW bundling decision"  # ← the faulty line
      ```

      - `647e2148f` wrote that map with the gate. Five of its nine entries were not test-only by design: three live counterparts of shipped code, one dormant rule, one module never wired. Its message: "writing the reason down is what separates a decision from an oversight."
        - The entry format held a reason and no condition: no expiry, no owner, no rule that the two copies agree (Method).

## Root cause of occurrence

*Thought an allow-list entry with a written reason parks a known duplication safely until someone takes the decision. Actually an unconditional allowance licenses the duplication to grow, because the gates keep scoring the dead copy and nothing makes the decision come due.* (Method)

The agent that wrote `647e2148f` had the duplication in view and recorded it on purpose. The belief was about what the allowance would do afterwards. Source: the commit message and the map, quoted above.

## Detection failure causes

- **Typing:** the copies share no type. One is TypeScript, one is plain JavaScript in `public/`.
- **Linter:** `sw.js` was not linted until PR #108. Linting it still says nothing about a second file saying the same thing.
- **Local validation:** both copies agreed at the time, so the app worked.
- **CI:** coverage and mutation both reported the dead copy at full marks. The strongest signal the repository owns pointed at the wrong file.
- **Review:** the allow-list entry reads as a considered decision, because it was one. Nothing in its shape says "do not add to this".

## Countermeasure

`2d5502d` deleted `sw-cache.utils.ts` and `manifest.utils.ts`, their tests and their two allowance entries. `manifest.utils.ts` was a third copy of a rule whose live version is `apps/pragma/api/src/sessions/offline-manifest.core.ts`, with `listManifestUrls` in `sw.js` a fourth.

The new `service-worker.test.ts` loads `public/sw.js` with a `?raw` import and runs it in a `node:vm` context with a fake `self`, `caches` and `fetch`. The assertions run against the bytes the browser receives. Verified by reverting each half of PR #108's fix in turn. Removing the content-type guard fails *"never stores an asset URL the origin answered with HTML"*. Moving `CACHE_VERSION` back to `pragma-v3` fails the activate case.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`2d5502d`](https://github.com/hugoleborso/borso.fr/commit/2d5502de8f7e3f47272dbea3d02a0f23c3165f7a).

```diff
  declare -A ALLOWED_TEST_ONLY=(
-   [apps/pragma/site/src/sw/manifest.utils.ts]="live counterpart: …"
-   [apps/pragma/site/src/sw/sw-cache.utils.ts]="live counterpart: …"
  )
```

The service worker instance is closed by subtraction. Its second copy is gone, and its tests run the shipping file.

The class is open. `ALLOWED_TEST_ONLY` in `scripts/check-pure-modules-have-callers.sh:41-45` is still unconditional. It still parks two modules imported only by their tests (measured, `grep -rln "runner.core'\|request-position.utils'" apps` finds only the two test files):

- `apps/last-loop-lepin/api/src/runner/runner.core.ts`, "deliberately dormant ... see PR #46", parked since 2026-08-14.
- `apps/last-loop-lepin/site/src/lib/request-position.utils.ts`, "never wired".

The script's header still describes "a live counterpart elsewhere" as an accepted kind of entry. A new duplicate can be parked the same way today. That is why the level is 5, not the 1 this entry first claimed.

**Proposed:** subtract the allowance. Delete the two dormant modules, so the map holds only `tool-coverage.core.ts`, which is test-only by design, and delete the "live counterpart" kind from the header. Or, if the operator keeps a parked kind, make each such entry carry a date the gate refuses once passed, so a parked decision comes due. Either way, "a live counterpart parked without a deadline" becomes impossible to write.

**Proof it can fail:** not tried, because the proposal is not built.

**Similar instances:** the mastery pair the first version listed is closed. `apps/pragma/api/src/mastery/mastery.core.ts` is no longer in the map, so it has a caller outside its test (measured, the map today). [`three-green-gates-on-code-that-ran-nowhere.md`](./three-green-gates-on-code-that-ran-nowhere.md) produced the gate. [`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md) is the same shape elsewhere.
