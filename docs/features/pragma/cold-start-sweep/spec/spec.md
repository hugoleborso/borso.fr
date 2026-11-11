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
3. **The database connection opens during init.** Today the first request
   pays it: about 640 ms on a preview at 512 MB. A top-level `await` at the end
   of the entry point moves it into the init phase. It gains only if init runs
   on more CPU than an invocation, which is the premise this lever tests.
4. **postgres.js stops fetching array types.** Its default issues one catalog
   query on every new connection. The schema holds no array column and no
   query passes an array parameter.
5. **A V8 compile cache ships in the asset.** Locally it takes the import from
   298 ms to 205 ms. Whether a Lambda accepts a cache built elsewhere is
   unknown.

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
- A warm-up that fails or runs out of time never fails the init. The first
  request then connects by itself, exactly as today.
- The warm-up is bounded well under Lambda's 10 second init limit.
- The first invocation of an instance is still reported as a cold start.
- The scheduled streak reminder and the HTTP path both keep one flush per
  invocation.
- A compile cache that the runtime rejects leaves today's behaviour and fails
  nothing.
- No temporary timing probe is left in the code once the sweep ends.

## How it will be judged

On this pull request's preview, by firing 12 parallel unauthenticated
`GET /api/me` at `pragma-pr-<n>-api.preview.borso.fr`. Each burst starts about
8 containers, and each one runs its init and then opens a database connection.
The `REPORT` lines give `Init Duration` and `Duration` per container.

The baseline, on PR 293's preview, is an init median of 1028 ms and a duration
median of 757 ms over 8 cold starts, 1785 ms in total.

Lever 1 cannot be judged there, because a preview runs without Sentry. It is
judged on production's `Init Duration` after the merge, against the 1260 ms
median of the week before.
