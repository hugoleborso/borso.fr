# pragma's API cold start

## Why

pragma's production p95 is 2806 ms against a 2000 ms ceiling, while its p50 is
114 ms against 150 ms. 17.6% of invocations exceed the ceiling and 97% of those
are cold starts. Warm p95 is 697 ms, so the code is not slow; building a
container is.

A cold start spends about 1259 ms loading modules. Two sibling functions on the
same runtime, architecture and memory initialise in 202 ms and 352 ms, so about
1060 ms belongs to pragma's own bundle: 2.79 MB of minified ESM beside a
13.7 MB source map that Node reads and parses under `--enable-source-maps`.

To pass the ceiling, fewer than 5% of invocations may exceed 2000 ms, which
means cutting about 700 ms from every cold start.

## What this change does

1. The handler's source map is uploaded to Sentry at bundling time and deleted
   from the asset once the upload succeeded. `--enable-source-maps` stays, so a
   failed upload leaves exactly today's behaviour. Keeping the flag costs 60 ms
   of the 333 once scaled, so the saving is roughly 270 ms, inferred from a
   local ratio: 91 ms for the map and 20 ms for the flag, both times 2.99.
2. `Sentry.flush` moves from the request middleware to the invocation. It cost
   38 ms at warm p50 and 246 ms at warm p95, and a read-batch of 11 reads
   performed 12 sequential flushes in one invocation.

## What it deliberately does not do

- It does not defer the four route-specific SDKs behind a dynamic import. That
  was the plan and the measurement killed it: on the real bundle, deferring
  `@aws-sdk/client-ssm` grew the output from 2789482 to 2951222 bytes and the
  import time from 331.8 ms to 334.5 ms, because esbuild keeps the code without
  code splitting and loses tree shaking across the lazy boundary.
- It does not raise the function's memory or buy provisioned concurrency. Both
  are the operator's call under CLAUDE.md's *lower the water, do not raise the
  boat*, and both are recorded as the next levers.
- It does not touch `banana-rush` or `talos`, which ship a map they never read,
  nor the WebSocket and talos job Lambdas, which hardcode `sourceMap: true`.

## Assertions

- An app that configures no upload builds and ships its map exactly as before.
  `last-loop-lepin` reads its own map, so losing it would have cost readable
  frames for nothing.
- The map is deleted only when the upload succeeded, and `--enable-source-maps`
  stays set. A bad token or a network blip therefore leaves the map in the
  bundle and the flag reading it, which is exactly today's behaviour. Dropping
  the flag as well would have shipped minified frames silently.
- Neither `sentry-cli` call may fail a deploy.
- Every interpolated value is shell-quoted, since a checkout path may hold a
  space.
- No test performs a real upload. The commands and the bundling options are
  asserted exactly, by a pure test.
- One invocation performs one flush. `traceIncomingRequest` performs none.

## How it will be judged

Not the preview. `.github/workflows/preview.yml` says in place that
`SENTRY_ORG` and `SENTRY_PROJECT` are variables of the prod environment, which
the preview job does not name, so `readSourceMapUpload()` returns undefined
there: a preview installs no hook and ships its map as before. The measurement
lands on the prod deploy, by comparing a cold start's `InitDuration` against the
1259 ms recorded on 2026-11-11, unless the operator exposes those two variables
to the preview job first.
