---
date: 2026-08-20
introduced-at: stryker.shared.js
detected-at: pre-push gate
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (two settings that must stay as they are)
time-to-detect: hours (both failures name something other than Stryker)
tags: [stryker, pnpm, mutation-testing, cdk, vendor-quirk]
---

# Stryker under pnpm: the sandbox must leave the workspace, and the plugin must be named

Two settings in `stryker.shared.js` look like preferences and are not. Both
were paid for.

## 1. `plugins` must name the runner explicitly

Stryker discovers plugins by globbing `node_modules/@stryker-mutator/*` from
its own install location. **pnpm's isolated store puts the runner behind a
symlink that the glob does not follow**, so the discovery finds nothing and
the run dies reporting no test runner.

Naming the plugin — `plugins: ['@stryker-mutator/vitest-runner']` — makes
Stryker `import()` it instead, which pnpm resolves normally. Removing the line
to "let it autodetect" reintroduces the failure.

## 2. `tempDirName` must point outside the workspace

Stryker copies the workspace into a sandbox per test runner. A sandbox that
appears and vanishes *inside* a workspace is visible to anything else walking
that directory, and it has bitten this repository twice:

- The architecture generator counted the sandbox's files as real ones. That
  symptom is recorded in
  [`the-architecture-page-counted-the-mutation-sandbox.md`](../dantotsus/the-architecture-page-counted-the-mutation-sandbox.md),
  whose countermeasure is a skip list in the generator.
- **`infra/cdk`'s CDK snapshot tests fail with an `ENOENT` inside
  `AssetStaging.calculateHash`** when a concurrent mutation run creates a
  sandbox mid-walk. The pre-push wave does exactly this every time a change
  touches both a pure module and anything else in the same workspace, so the
  failure reads as a flaky snapshot test and is not one.

The skip list fixes the first symptom only. Moving the sandbox out of the
workspace is what fixes the class, which is why `tempDirName` is computed
rather than left at its default.

## Recognising either one

- *"No test runner"* / plugin not found, on a machine where the package is
  plainly installed → §1.
- `ENOENT` from `AssetStaging.calculateHash` in `infra/cdk`, only under the
  parallel pre-push wave, passing when the suite runs alone → §2.
