---
date: 2026-05-02
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#2'
fix-commits: [1758f91690, d5714aebf0]
eradication-level: 4
eradication-paths: [infra/cdk/src/constructs/dsql-schema.ts, infra/cdk/test/unit/eradication-checks.test.ts]
time-to-detect: hours (every CI run was slow + flaky)
tags: [cdk, nodejs-function, esbuild, vitest]
zone: infra/cdk/src/constructs/dsql-schema.ts
---

# Infra tests ran 100 seconds and flaked on a package install nobody asked for

## User impact

Every push to `@borso/infra` met a red-or-green roulette in CI and in the hooks.

| | Seen | Expected |
| --- | --- | --- |
| `@borso/infra` unit tests | Over 100 s, intermittent `Timeout calling "onTaskUpdate"` from vitest, single tests timing out at 30 s on a cold cache | Seconds of test bodies, green every time |

After the fix the suite ran in about 48 s with no flake (measured by the fix's author, commit `1758f91`).

## Causal chain

- Vitest reported `Timeout calling "onTaskUpdate"`, its worker to main process heartbeat.
  - Test bodies ran long enough to starve that heartbeat.
    - Each `Template.fromStack(stack)` bundled every `NodejsFunction` in the stack, at 10 to 25 s per bundle.
      - Branch 1, why each bundle was slow. `DsqlSchema` declared:

        ```ts
        bundling: {
          target: 'node22',
          format: 'esm' as never,
          externalModules: ['@aws-sdk/*'],
          nodeModules: ['postgres', '@aws-sdk/dsql-signer'], // ← an install per synth
        },
        ```

        `nodeModules` makes CDK install those packages into a fresh temporary `node_modules/` before every bundle, with no cache across synths.
        - Commit `1aa979e74` (2026-05-01, an agent) ported this block "verbatim from upstream", from `hugoleborso/borso-platform`.
      - Branch 2, why tests bundled at all. The test helper `synthTemplate` in `infra/cdk/test/unit/helpers/template.ts` creates a bare `new App()`, and so do the tests that build their own. A bare `App` bundles every asset at synth (Machine).

## Root cause of occurrence

*Thought `bundling.nodeModules` is how a Lambda declares the packages it needs, actually it is a fallback for packages esbuild cannot bundle, and it runs an install on every synth.* (Man)

`postgres` and `@aws-sdk/dsql-signer` are pure JavaScript with no native binding, so esbuild bundles them inline from the workspace's `node_modules/`. The README of the installed `aws-cdk-lib@2.276.0` (`aws-lambda-nodejs`, *Install modules*) says:

> By default, all node modules referenced in your Lambda code will be bundled by `esbuild`. Use the `nodeModules` prop under `bundling` to specify a list of modules that should not be bundled but instead included in the `node_modules` folder of the Lambda package. This is useful when working with native dependencies or when `esbuild` fails to bundle a module.

## Detection failure causes

- **Typing:** `nodeModules` is a `string[]`. Any list type-checks.
- **Linter:** no rule reads construct bundling options.
- **Local validation:** the tests passed, only slowly. Slow and green triggers nothing.
- **CI:** no budget on test wall-clock time. The suite drifted up to vitest's IPC timeout and tipped into flake.
- **Review:** the block was a verbatim port. Spotting it needed both the upstream context and the alternative.

## Countermeasure

Commit [`1758f91`](https://github.com/hugoleborso/borso.fr/commit/1758f91690) removed `nodeModules` from `dsql-schema.ts` and narrowed `externalModules` to `@aws-sdk/client-*`, the clients the Lambda runtime provides. esbuild now bundles `postgres` and `@aws-sdk/dsql-signer` inline. The suite went from over 100 s and flaky to about 48 s and clean.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`d5714ae`](https://github.com/hugoleborso/borso.fr/commit/d5714aebf0) added the guard in `infra/cdk/test/unit/eradication-checks.test.ts`:

```ts
describe('eradication: no `bundling.nodeModules` in CDK constructs', () => {
  const files = fs.readdirSync(CONSTRUCTS_DIR).filter((name) => name.endsWith('.ts'));
  it.each(files)('%s', (file) => {
    const stripped = readStripped(path.join(CONSTRUCTS_DIR, file));
    expect(stripped).not.toMatch(/\bnodeModules\s*:/);
  });
});
```

It runs in CI, and at pre-push when `infra/cdk/` changes. It reads only `infra/cdk/src/constructs/`. `grep -rln NodejsFunction infra/cdk/src apps/*/cdk` also finds `infra/cdk/src/internal/origin-verify.ts` and two talos constructs under `apps/talos/cdk/lib/constructs/`, which the guard does not read. None of them uses `nodeModules` today.

**Proposed:** remove the cost the class rides on. Create every test `App` in `infra/cdk/test/unit/` with the context `'aws:cdk:bundling-stacks': []`, starting with `synthTemplate`. The key exists in the installed `aws-cdk-lib@2.276.0` `cx-api`, and it makes synth skip bundling. No unit test would then pay for a bundle, so a slow bundling option could not slow or flake the suite again. Merge the two copies of `LAMBDA_RUNTIME_PROVIDED_MODULES` in `dsql-schema.ts` and `dsql-agent-reader.ts` into one export, so the external list exists once.

**Proof it can fail:** not planted this session. A `nodeModules:` line in any file of `infra/cdk/src/constructs/` would fail the `not.toMatch` for that file (inferred from the assertion).

**Similar instances:** `grep -rn "nodeModules" infra/cdk/src apps/*/cdk` finds none.
