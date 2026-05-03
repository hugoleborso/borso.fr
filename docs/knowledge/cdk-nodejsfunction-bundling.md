# CDK NodejsFunction `nodeModules` is per-synth and slow

## Symptom

`@borso/infra` unit tests intermittently failed with vitest's
`Timeout calling "onTaskUpdate"` (worker→main RPC), and the suite ran
for 100 s+ even though the actual test bodies finished in seconds.
Cold-cache CI runs sometimes timed out individual tests at 30 s.

## Root-cause chain

1. **Why** did vitest report an IPC timeout?
   The synth-heavy tests (DsqlSchema, LambdaApi, PreviewableApp) each
   take long enough to starve vitest's per-worker RPC heartbeat.
2. **Why** are those tests slow?
   Each one calls `Template.fromStack(stack)`, which forces CDK to
   bundle every `NodejsFunction` in the stack at synth time.
3. **Why** does the bundle take ~10–25 s per invocation?
   CDK's `bundling.nodeModules: ['postgres', '@aws-sdk/dsql-signer']`
   instructs esbuild to install those packages into a fresh tmp
   directory before each bundle.
4. **Why** does that need a fresh install every time?
   `nodeModules` is the `BundlingOptions` field whose contract is
   "install these into the bundle's `node_modules/`". CDK has no
   cross-synth cache; it runs `pnpm install` (or npm/yarn) per call.
5. **Why** were `postgres` + `@aws-sdk/dsql-signer` listed there?
   Inertia from the upstream borso-platform code we ported. Both
   packages are pure JS with no native bindings, so esbuild can
   bundle them inline from the workspace's existing `node_modules/`.

**Root cause:** opaque per-synth `pnpm install` from CDK's
`NodejsFunction.bundling.nodeModules` for packages that didn't need
it, multiplied by every test that synthesises the stack.

## Fix

- **Code:** commit `1758f91` — removed `nodeModules` from
  `infra/cdk/src/constructs/dsql-schema.ts`. Set
  `externalModules: ['@aws-sdk/client-*']` so only Lambda-runtime-
  provided clients stay external; everything else (including
  `postgres` and `@aws-sdk/dsql-signer`) gets bundled inline.
  Suite went from ~100 s + flaky to ~48 s + clean.
- **Convention:** any new `NodejsFunction` in this repo should
  follow the same pattern. Use `nodeModules` only if the package has
  native bindings that esbuild can't bundle.
