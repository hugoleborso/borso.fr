# pragma's cold start, second sweep

## Why

After PR 293, a cold start still has to lose about 430 ms more for fewer than
5% of invocations to exceed the 2000 ms ceiling. Replayed on the 1253
production invocations of 2026-11-04 to 2026-11-11, cutting 500 ms from every
cold start leaves 7.4% over, 700 ms leaves 4.6% and 900 ms leaves 3.4%.

The operator asked for every remaining lever to be tried in one pull request,
without rewriting what a maintained library already does.

## The levers

Each one is measured, and one that does not win is removed and recorded in
`docs/features/pragma/lambda-cold-start/findings.md` with the number that
killed it.

1. **Sentry's runtime channel injection is turned off.** The SDK registers
   module hooks through `module.register()`, which starts a worker thread and
   waits for it. In a bundle the registration fails, and production logs
   `Failed to register diagnostics-channel injection hooks` at each cold start.
   Locally the import goes from 356 ms to 298 ms, medians of 15.
2. **The AWS SDK core is bundled once.** The four clients resolve two versions
   of `@smithy/core`, `@aws-sdk/core` and `@aws-sdk/nested-clients`, so the
   bundle holds each twice. Forcing one copy takes the local import from about
   312 ms to 279 ms. The SDK stays; nothing is rewritten.
3. **postgres.js stops fetching array types.** Its default issues one catalog
   query on every new connection. The schema holds no array column and no
   query passes an array parameter.

Two more levers were tried and are dead. Both are recorded in
`docs/features/pragma/lambda-cold-start/findings.md` with their numbers.

- **Opening the database connection during init.** It took 716 ms there
  against about 740 ms in the first request, medians of 10 cold starts on
  this preview. The init phase has no CPU to spare for it.
- **Shipping a V8 compile cache in the asset.** Node keys the cache
  directory on its exact version, the architecture and the uid, so a cache
  built on an x64 runner is rejected by an arm64 Lambda.

## What it deliberately does not do

- It does not replace the AWS SDK with a hand-written signer. The operator
  refused that.
- It does not strip zod's locales. Removing all 267 KB of them changes the
  import by 0 ms.
- It does not raise memory or buy provisioned concurrency. Both are the
  operator's call.

## Assertions

- `Sentry.init` receives `enableRuntimeChannelInjection: false` and every
  other option it received before.
- Both database clients turn `fetch_types` off, and a test fails when either
  turns it back on.
- The entry point is the one `main` had: no warm-up, no top-level `await`.
- No temporary timing probe is left in the code once the sweep ends.
- pragma's API bundle holds one version each of `@smithy/core`,
  `@aws-sdk/core` and `@aws-sdk/nested-clients`.

## How it will be judged

On this pull request's preview, by firing 12 parallel unauthenticated
`GET /api/me` at `pragma-pr-<n>-api.preview.borso.fr`. Each burst starts about
8 containers, and each one runs its init and then opens a database connection.
The `REPORT` lines give `Init Duration` and `Duration` per container.

The baseline, on PR 293's preview, is an init median of 1028 ms and a duration
median of 757 ms over 8 cold starts, 1785 ms in total.

Lever 1 cannot be judged there, because a preview runs without Sentry. It is
judged on production's `Init Duration` after the merge, against the 892 ms
median of the 6 cold starts that followed PR 293's deploy.
