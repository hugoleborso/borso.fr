# pragma's cold start: what is measured, what is dead, what is left

Hand-off for the next session. The goal is unchanged: cut 700 ms from a cold
start so fewer than 5% of invocations exceed the 2000 ms ceiling. PR 293
delivers roughly 270 ms of it. Everything below is either a measurement or a
labelled guess.

Do not re-run the dead ends. Each cost a session and each is recorded with the
numbers that killed it.

## The shape of the problem

| | value | how |
| --- | --- | --- |
| p95, all invocations | 2806 ms | CloudWatch `AWS/ApiGateway` `Latency`, ApiId `8a1hc5xjva` |
| p95, warm only | 697 ms | Logs Insights, `REPORT` lines without `@initDuration` |
| p95, cold only | 3184 ms | same, with `@initDuration` |
| invocations over 2000 ms | 221 of 1255, 17.6% | same |
| of those, cold | 214, 97% | same |
| cold invocations | 232, 18.5% | same |

Warm passes the ceiling with 1303 ms to spare. Only the cold start fails it.

A cold start, p50 2315 ms, splits into three phases, measured by joining each
`REPORT` line to its hono `logger()` line on `@requestId`:

| phase | cold p50 | warm p50 |
| --- | --- | --- |
| `InitDuration`, module loading | 1259 ms | 0 |
| inside the handler, first request | 847 ms | 44 ms |
| after the handler, `Sentry.flush` | 209 ms | 38 ms |

X-Ray agrees: all 25 traces over 2 s on 2026-11-11 carry an `Init` subsegment.

## Why 1259 ms of init is the bundle, not the platform

Two sibling functions on the same runtime, architecture and memory:
`pragma-prod-agent-reader` initialises in 202 ms, `pragma-prod-websocket` in
352 ms, `pragma-prod-api` in 1259 ms. So about 1060 ms belongs to this bundle.

It is 2 789 482 bytes of minified ESM over 2266 inputs. Rebuild it with the
construct's exact settings to reproduce any number here:

```sh
node_modules/.bin/esbuild apps/pragma/api/src/main.ts --bundle --minify \
  --format=esm --platform=node --target=node22 --main-fields=module,main \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --metafile=meta.json --outfile=out.js
```

Importing that file locally takes about 290 ms net of an empty bundle, so the
local-to-prod factor is about 2.99. Every prod figure inferred from a local one
in this document uses it, and says so.

## Bytes are not milliseconds

Each package loaded on its own, median of 9 imports, local:

| package | bytes | share | alone | ms per 100 KB |
| --- | --- | --- | --- | --- |
| `zod` | 515 596 | 18.5% | 23.5 ms | 4.6 |
| `@aws-sdk/client-s3` | 103 713 | 3.7% | 80.0 ms | 78.9 |
| `@aws-sdk/client-ssm` | 71 364 | 2.6% | 70.6 ms | 101.3 |
| `@aws-sdk/dsql-signer` | — | — | 54.8 ms | — |
| `@modelcontextprotocol/sdk` | 67 346 | 2.4% | 48.9 ms | 74.4 |
| `@sentry/aws-serverless` | 320 916 | 11.5% | 48.1 ms | 15.3 |
| `@simplewebauthn/server` | 61 560 | 2.2% | 27.4 ms | 44.5 |
| `ical.js` | 78 413 | 2.8% | 4.7 ms | 6.0 |
| `drizzle-orm` | 85 186 | 3.1% | 3.8 ms | 4.5 |
| `hono` | 18 247 | 0.7% | 2.6 ms | 14.2 |

They share code, so the column sums to 364 ms against 290 ms for the whole
bundle. It is an attribution, not a partition.

The AWS SDK clients cost ten to twenty times more per byte than zod. Any plan
that targets the biggest package rather than the most expensive one is aiming
at the wrong thing.

## Dead ends, with the numbers that killed them

**Dynamic `import()` of the four route-specific SDKs.** It does not remove
bytes. esbuild without code splitting keeps the module in the same file and
loses tree shaking across the lazy boundary. On the real bundle, putting
`@aws-sdk/client-ssm` behind `import()` took it from 2 789 482 to 2 951 222
bytes and the import from 331.8 ms to 334.5 ms. Removing it outright gives
2 697 754 bytes and 327.2 ms, 4.6 ms, because it shares almost everything with
the DSQL signer and S3, which stay.

The original 105 ms estimate came from aliasing the four to a stub, which
deletes the code. Stubbing and deferring are not the same measurement.

**Warming the DSQL connection before the heavy imports.** On an isolated bench
the mechanism is real: 576 ms of CPU and 300 ms of network take 884 ms when
serial and 568 ms when the loop is yielded once between the two. Module
evaluation is synchronous, so without that yield the `connect` is never issued
and reordering imports alone changes nothing: 884 ms against 873 ms.

On the real bundle it is a net loss. The top-level `await` forces every other
import to become dynamic, which costs 111 ms of extra evaluation locally
(339 ms to 450 ms, medians of 7), and postgres.js needs its own chain of ticks
before it opens the socket, which it did at 428 ms. A 22 ms overlap window for
a 111 ms penalty.

The two levers fight each other: making module evaluation faster shrinks the
overlap window. This is not worth retrying after the bundle is lighter.

**Deleting a dependency.** Nothing is deletable. Each of the four SDKs serves a
real route and zod serves every schema.

## Untested leads, most promising first

**1. V8 compile cache.** Node 22 has `module.enableCompileCache()` and
`--snapshot-blob`. Parsing and compiling 2.79 MB is a large part of 1060 ms and
a cache would pay it once per container image rather than once per container.
Nobody has tried it, and a Lambda's writable `/tmp` survives across invocations
in one container but not across containers, so the cache would need to ship in
the asset. Measure: build with a cache blob, compare `InitDuration` on a
preview.

**2. Route-level splitting so a request loads only its own routers.**
`apps/pragma/api/src/app.ts` imports all 27 slice routers eagerly, so every
cold start pays S3, SSM, WebAuthn, iCal and the MCP SDK to answer
`GET /api/health`. Real splitting needs esbuild `--splitting` and several
output files, which the CDK construct does not emit today. Unlike a bare
`import()`, splitting does remove the bytes from the entry chunk. Measure:
build with `--splitting --outdir`, import the entry, compare.

**3. The four SDKs as a Lambda layer, marked `external`.** The upper bound is
measured: stubbing all four takes the bundle from 2.79 MB to 2.06 MB and the
import from 295 ms to 218 ms, so about 230 ms in prod. A layer keeps them
available at runtime without bundling them.

**4. Split the 847 ms of the first request.** Between credential resolution,
SigV4 signing, the TLS handshake and the two auth queries. The only evidence
today is indirect: `pragma-prod-agent-reader`, which does little but connect and
run one SELECT, has a warm duration p50 of 610 ms, so a DSQL connection is
genuinely expensive. Needs a timing span around `getDatabase()` and the first
query. Read-only AWS cannot add it; it takes a deploy.

**5. Cache `getAppConfig()`.** `apps/pragma/api/src/auth/auth.service.ts` reads
it from the database on every gated request, alongside `findCredentialByMemberId`.
It returns a singleton row that changes only on a password rotation. This is a
warm-path win, not a cold one.

## Premises worth attacking before spending another session

**Does init get a CPU burst?** The operator was told that moving from 512 MB to
1024 MB would roughly halve the 1060 ms, because Lambda scales CPU with memory.
That is inferred, never measured, and it may be wrong: AWS gives the init phase
extra CPU regardless of the memory setting. If init already runs at full CPU,
the memory lever is much weaker than quoted. Settle it with two preview deploys
at two memory settings before quoting the number again.

**Is 1259 ms abnormal for this bundle?** The operator's instinct is that it is
too slow for a simple app. The app is not the bundle: 2266 inputs, two AWS SDK
clients, a WebAuthn stack, an iCal parser, an MCP server and Sentry's Node
instrumentation. The question to answer is not "why is a simple app slow" but
"why does a simple app ship 2.79 MB", and lead 2 is the direct attack on it.

## How to measure anything here

The preview deploy is the instrument for DSQL and for anything that needs a
real database, because a preview gets a DSQL schema cloned from prod. It is
**not** the instrument for the source map: `.github/workflows/preview.yml` says
in place that `SENTRY_ORG` and `SENTRY_PROJECT` belong to the prod environment,
which the preview job does not name, so a preview installs no upload hook.

Read-only AWS covers CloudWatch, Logs Insights and X-Ray. It does not cover
adding instrumentation, and `lambda:GetFunctionConfiguration`'s `Environment`
block is refused by the session policy on prod functions.
