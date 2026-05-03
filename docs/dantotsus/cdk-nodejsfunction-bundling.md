---
date: 2026-05-02
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/4
fix-commits: [1758f91, d5714ae]
eradication-rung: 4
time-to-detect: hours (every CI run was slow + flaky)
tags: [cdk, nodejs-function, esbuild, vitest]
---

# `NodejsFunction.bundling.nodeModules` runs `pnpm install` per synth

## Symptom

`@borso/infra` unit tests intermittently failed with vitest's
`Timeout calling "onTaskUpdate"` (worker→main RPC), and the suite ran
for 100 s+ even though the actual test bodies finished in seconds.
Cold-cache CI runs sometimes timed out individual tests at 30 s.

The user-visible impact: every commit made the CI red-or-green
roulette — a low-grade nuisance more than an outage. But the cost
compounded: every PR, every push, every pre-commit hook.

## Root-cause chain

1. **Why?** Vitest reports an IPC timeout.
   Because long-running test bodies starve vitest's per-worker RPC
   heartbeat to the main process.
2. **Why are the test bodies long-running?**
   Each `Template.fromStack(stack)` call forces CDK to bundle every
   `NodejsFunction` in the stack at synth time. With multiple
   `NodejsFunction`-using tests, that's multiple bundles.
3. **Why does each bundle take ~10–25 s?**
   The construct's `bundling.nodeModules: ['postgres',
   '@aws-sdk/dsql-signer']` instructs esbuild to install those
   packages into a fresh tmp directory before bundling.
4. **Why does CDK install them fresh every time?**
   `nodeModules`'s contract is "install these into the bundle's
   `node_modules/`". No cross-synth cache; CDK runs `pnpm install`
   per call.
5. **Why were `postgres` + `@aws-sdk/dsql-signer` listed there at all?**
   Inertia — copied the bundling block from upstream borso-platform
   without questioning each field. Both packages are pure JS with no
   native bindings, so esbuild can bundle them inline directly from
   the workspace's `node_modules/`. `nodeModules` is for packages
   esbuild *can't* bundle (native deps); it was the wrong tool here.

**Root cause:** we thought `bundling.nodeModules` was the standard way
to declare "include these packages in my Lambda bundle". It's
actually a fallback for packages esbuild can't process inline; using
it for ordinary pure-JS packages forces a transient `pnpm install`
on every synth.

## Detection failure causes

- **Typing:** `nodeModules` is a `string[]`; types are happy.
- **Linter:** no rule against unnecessary `nodeModules` entries.
- **Functional validation locally:** the tests passed; they were
  just slow. "Slow but passing" doesn't trigger any review.
- **CI:** no SLA on test wall-clock time, so 100 s was fine until it
  drifted close to vitest's IPC timeout. Then it tipped into flake.
- **Code review:** the bundling block looked plausible at review;
  reviewer would need to know the upstream context AND the
  alternative. Tribal knowledge.

## Countermeasure

- **Code:** commit `1758f91` — removed `nodeModules` from
  `infra/cdk/src/constructs/dsql-schema.ts`. Set
  `externalModules: ['@aws-sdk/client-*']` so only Lambda-runtime-
  provided clients stay external; everything else (including
  `postgres` and `@aws-sdk/dsql-signer`) gets bundled inline by
  esbuild from the workspace's existing `node_modules/`. Suite went
  from ~100 s + flaky to ~48 s + clean.

## Eradication (rung 4 — source-level detection test)

- **Rung:** 4 (detection). A vitest in
  `infra/cdk/test/unit/eradication-checks.test.ts` reads every
  file under `src/constructs/`, strips comments, and asserts none
  contain `nodeModules:`. A regression that adds `nodeModules`
  back fails CI immediately and the pre-commit hook (which runs
  `test:coverage` for `infra/cdk/**` changes).
- **Why not rung 1 (structural):** would require a wrapper around
  `NodejsFunction` that omits the `bundling.nodeModules` field
  from its surface entirely. Plausible but adds a layer for one
  field. Rung 4's static-source check is roughly equivalent in
  practice (the field is unspeakable in the codebase) without
  the abstraction tax.
- **What changed:**
  - `infra/cdk/src/constructs/dsql-schema.ts` removed
    `nodeModules: ['postgres', '@aws-sdk/dsql-signer']` and set
    `externalModules: ['@aws-sdk/client-*']` (only the
    Lambda-runtime-provided AWS SDK clients stay external).
  - `infra/cdk/test/unit/eradication-checks.test.ts` (new) asserts
    no construct file contains `nodeModules:`.
- **PR:** [#4](https://github.com/hugoleborso/borso.fr/pull/4)
  (this PR landed both the bundling fix and the test).
- **Commits:**
  [`1758f91`](https://github.com/hugoleborso/borso.fr/commit/1758f91)
  (drop `nodeModules`),
  [`d5714ae`](https://github.com/hugoleborso/borso.fr/commit/d5714ae)
  (test backstop).
- **Diff snippet (essence of the fix):**
  ```diff
  - externalModules: ['@aws-sdk/*'],
  - nodeModules: ['postgres', '@aws-sdk/dsql-signer'],
  + externalModules: ['@aws-sdk/client-*'],
  ```
  ```ts
  // eradication-checks.test.ts
  it.each(files)('%s', (file) => {
    const stripped = readStripped(path.join(CONSTRUCTS_DIR, file));
    expect(stripped).not.toMatch(/\bnodeModules\s*:/);
  });
  ```
- **Sibling defects swept:** every `NodejsFunction` in the repo
  audited; `LambdaApi` was already clean, only `DsqlSchema` had
  the issue. Test now covers all current and future construct
  files.
