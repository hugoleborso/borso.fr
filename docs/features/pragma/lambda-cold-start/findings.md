# pragma's cold start: what is measured, what is dead, what is left

The goal is unchanged: fewer than 5% of invocations over the 2000 ms ceiling.
Replayed on the 1253 production invocations of 2026-11-04 to 2026-11-11,
cutting 500 ms from every cold start leaves 7.4% over, 700 ms leaves 4.6% and
900 ms leaves 3.4%.

Two pull requests have worked on it. PR 293 took the source map out of the
init. PR 298 took out Sentry's loader thread, the second copy of the AWS SDK
core and postgres.js's array-type query. Everything below is either a
measurement or a labelled guess.

Do not re-run the dead ends. Each is recorded with the numbers that killed it.

## Where a cold start stands

| | before | after PR 293 | how |
| --- | --- | --- | --- |
| init, median | 1260 ms | 891 ms | prod `REPORT` lines, 226 then 6 cold starts |
| first request, median | 1072 ms | 1012 ms | same |
| total, median | 2404 ms | 2105 ms | same |

PR 298 is measured on its preview, which runs without Sentry, by bursts of 12
parallel unauthenticated `GET /api/me`. Each burst starts 8 to 10 containers.
The column for PR 293's code is the fifth of 8 sorted values, because its log
group went with its stack before the median could be recomputed.

| | PR 293's code, 8 cold starts | PR 298's code, 13 cold starts |
| --- | --- | --- |
| init, median | 1028 ms | 747 ms |
| first request, median | 757 ms | 538 ms |
| total, median | 1785 ms | 1303 ms |
| slowest total | 1930 ms | 1592 ms |

The init column is not a clean comparison. Module loading is bimodal across
Lambda hosts, about 700 ms or about 990 ms in the same burst, which drowns a
gain of a hundred milliseconds. The first-request column is clean.

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
local-to-prod factor was taken as 2.99. It undershot: PR 293 was inferred at
270 ms and measured at 369 ms on the init.

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

## What a first database connection is made of

A probe on PR 298's preview timestamped each phase of the first connection,
over 10 cold starts at 512 MB:

| phase | median |
| --- | --- |
| TCP and TLS | 137 ms |
| authentication, from the token to the first statement | 206 ms |
| postgres.js fetching array types from `pg_catalog` | 313 ms |
| the first real statement | 36 ms |
| signing the token | 4 ms |

postgres.js sends the array-type query on every new connection, not once per
process, so a warm container that reconnects pays it again. PR 298 turns it
off with `fetch_types: false`. The price is that an array comes back as its
text form, which `apps/pragma/api/src/database/client.test.ts` pins.

## What a CPU profile of the init says

`node --cpu-prof` on the unminified twin of the bundle, 302 ms in total:

| where | self time |
| --- | --- |
| compiling the module source | 89 ms |
| waiting for Sentry's loader worker thread | 32 ms |
| compiling Node's own built-in modules | 18 ms |
| zod | 20 ms |
| Sentry and OpenTelemetry code | 9 ms |
| AWS SDK code | 2.5 ms |

The table in *Bytes are not milliseconds* loaded each package alone, so it
charged each one the compile of its bytes and the built-ins it pulls. It also
left `Sentry.init` out, which is where the worker thread hides: 356 ms with a
DSN against 294 ms without, medians of 15.

## Dead ends, with the numbers that killed them

**Dynamic `import()` of the four route-specific SDKs.** It does not remove
bytes. esbuild without code splitting keeps the module in the same file and
loses tree shaking across the lazy boundary. On the real bundle, putting
`@aws-sdk/client-ssm` behind `import()` took it from 2 789 482 to 2 951 222
bytes and the import from 331.8 ms to 334.5 ms.

**Warming the DSQL connection before the heavy imports.** A top-level `await`
placed before the imports forces every other import to become dynamic, which
costs 111 ms of extra evaluation locally, to buy a 22 ms overlap window.

**Opening the DSQL connection at the end of the init.** A top-level `await`
after the imports costs nothing by itself: 315 ms against 318 ms locally. But
the connection took 716 ms in the init, median of 10 cold starts on PR 298's
preview, where the whole first request took 757 ms on PR 293's preview with
the connection inside it. Its phases are waits on the network and on DSQL, not
CPU, so the init phase has nothing to give it.

**A V8 compile cache shipped in the asset.** Locally it is the biggest single
gain, 298 ms to 205 ms. It cannot ship. Node names the cache directory after
its exact version, the architecture and the uid, observed here as
`v22.23.4-x64-9de703df-0`, so a cache built on an x64 runner is rejected by an
arm64 Lambda, and one built for today's runtime patch is rejected by the next.
It would take a container-image Lambda that pins its own Node.

**Stripping zod's locales.** They are 267 KB of the bundle, and removing all
of them changes the import by 0 ms: 300.5 ms against 301.8 ms. Code that is
parsed lazily and never called costs almost nothing.

**Marking the unused credential providers external.** The SSO, ini, process,
web-identity and IMDS providers and their nested clients are reached only by
dynamic import after `fromEnv`, which always answers in a Lambda. Leaving them
out removes 104 KB and 0 ms: 279.3 ms against 277.6 ms.

**Deleting a dependency.** Nothing is deletable. Each SDK serves a real route
and zod serves every schema.

## What raising the memory buys

Measured on the preview, same code, 10 cold starts at 1024 MB against 13 at
512 MB:

| | 512 MB | 1024 MB |
| --- | --- | --- |
| init, median | 747 ms | 736 ms |
| first request, median | 538 ms | 418 ms |

The init does not move, so it already runs unthrottled, and the claim that
more memory would halve it is wrong. An invocation does scale: about 120 ms of
a cold start for twice the memory. The preview has no Sentry, and production's
cold flush costs 180 ms after the handler, part of it CPU, so production may
gain more (guess).

The operator refused it on 2026-11-11: pragma has five users, the members of
one band, and 120 ms is not worth a higher bill. Do not propose it again
without a new fact.

## Untested leads, most promising first

**1. The flush after a cold first request.** Production spends 165 to 280 ms
after the handler on a cold start, against 43 ms at warm median, measured on
the 6 cold starts that followed PR 293. A preview cannot measure it, because
it runs without Sentry. The SDK's own Lambda extension answers the request
before it sends, and has not been tried.

**2. The second request of a container.** In production it has a p75 of
515 ms, against about 130 ms from the fourth on. On the preview, the second
`GET /api/me` of two containers took 165 ms and 349 ms in the handler with no
new connection, and one of them sent its statement twice, 142 ms apart. A
retry by `retryingConflictAbortsOf` or a prepare round trip would both explain
it. Not a ceiling problem, a warm p75 one.

**3. Priming one request during the init.** The first request runs about
200 ms of code for the first time, at a throttled CPU. Run through `app.request`
during the init it would run unthrottled. Expected gain under 100 ms (inferred
from the 60 ms the connection's own code gained there), and it has to keep the
first real invocation reported as cold.

**4. Route-level splitting.** `apps/pragma/api/src/app.ts` imports all 27
slice routers eagerly. Real splitting needs esbuild `--splitting` and several
output files, which the CDK construct does not emit. The upper bound for the
AWS SDK part is measured: stubbing every client takes the import from 298 ms
to 227 ms locally.

**5. Cache `getAppConfig()`.** `apps/pragma/api/src/auth/auth.service.ts` reads
it from the database on every gated request. It returns a singleton row that
changes only on a password rotation. A warm-path win.

**6. The agent reader's own client.** `infra/cdk/src/internal/agent-reader/index.ts`
builds its own postgres.js client with the default, so it pays the array-type
query on each connection. It answers agents, not band members, and turning the
query off would hand them arrays as text.

**7. What kills an idle connection.** In production a request arriving after
more than 8 idle minutes pays a full reconnection. On the preview no
connection died within 4 idle minutes. After PR 298 a reconnection costs about
360 ms instead of 670 ms.

## Who pays the cold starts

Of the 226 cold starts of the week, 92 were a `POST /mcp`, 50 a
`POST /oauth/token` and 8 a discovery document: 150 came from assistant
connectors, 68 from the site. The site alone still fails the ceiling, with a
p95 of 2676 ms. 162 of the 226 were alone in their 10 second window, so
batching the site's first requests would not have avoided them.

## How to measure anything here

A preview's API answers at `pragma-pr-<n>-api.preview.borso.fr`, not on the
site's host. An unauthenticated `GET /api/me` reads the app config, so it
opens a database connection and answers 401. Twelve of them in parallel start
8 to 10 containers, and their `REPORT` lines carry `Init Duration` and
`Duration`. Some containers were still warm 17 minutes after a burst, so a
second burst needs a new deploy or a long wait.

The preview runs without Sentry, so anything about `Sentry.init` or the flush
is measured in production only.

Read-only AWS covers CloudWatch, Logs Insights and X-Ray. It does not cover
adding instrumentation, and `lambda:GetFunctionConfiguration`'s `Environment`
block is refused by the session policy on prod functions.
