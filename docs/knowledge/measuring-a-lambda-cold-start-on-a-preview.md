---
summary: 'A cold start read from Lambda logs lies in five ways: init is bimodal across hosts, a preview log group dies with its stack, Hono logs a slow request in seconds, `sorted[n//2]` is not the median, and a preview runs no Sentry.'
triggers:
  commands:
    - 'logs\s+(start-query|filter-log-events|tail)\b.*/aws/lambda/[a-z-]+-(prod|pr-\d+)-api'
  output:
    - 'Init Duration: \d'
    - '@initDuration'
---

# Measuring a Lambda cold start on a preview

Two pull requests measured pragma's cold start, PR #293 and PR #298. Every
trap below cost one wrong number or one lever that could not be judged. The
measurements, the dead ends and the open leads are in
[`../features/pragma/lambda-cold-start/findings.md`](../features/pragma/lambda-cold-start/findings.md).
Read its *Dead ends* before proposing a lever.

## How to get cold starts

- The API of a preview answers at `<app>-pr-<n>-api.preview.borso.fr`. The site
  host answers an API path with the single-page app. See
  [`preview-api-cross-origin.md`](./preview-api-cross-origin.md).
- Twelve parallel unauthenticated `GET /api/me` start 8 to 10 containers on
  pragma (measured on PR #298). Each one opens a database connection and
  answers 401.
- Some containers were still warm 17 minutes after a burst (measured on
  PR #298). A second burst needs a new deploy or a longer wait.
- Read `@initDuration` and `@duration` from the `REPORT` lines with Logs
  Insights, filtered on `@type = "REPORT"` and `ispresent(@initDuration)`.

## What goes wrong

**Init is bimodal.** In one burst on PR #298 the module loading took about
700 ms on some containers and about 990 ms on others, same code, same memory.
A gain under 150 ms on the init cannot be read from one burst. The duration of
the first request did not show two modes, so judge a lever there when it acts
there. Judge a lever on module loading by a local import, repeated, or by
several bursts. This is the case of
[`one-sample-could-not-tell-the-hook-from-the-runner.md`](../dantotsus/one-sample-could-not-tell-the-hook-from-the-runner.md)
with a Lambda host in place of a CI runner.

**The log group goes with the stack.** A preview's log groups are destroyed at
teardown since PR #290, so a merged pull request leaves no line to recompute
from. PR #293's baseline is "the fifth of 8 sorted values" in the findings for
that reason. Paste the sorted raw values where the figure is written, the day
they are read.

**The middle of an even count is two values.** `sorted(values)[len(values) // 2]`
returns the upper one. On six production totals it gave 2229 ms where the
median is 2105 ms. Use `statistics.median`:

```sh
python3 -c 'import statistics, sys; print(statistics.median(map(float, sys.stdin)))'
```

**Hono logs a slow request in seconds.** Its `logger()` prints `delta + "ms"`
under one second and `Math.round(delta / 1e3) + "s"` above
(`hono/dist/middleware/logger/index.js`, version 4.13.7). A Logs Insights
pattern that parses `ms` drops every slow request and reports a p95 capped at
1000 ms. Read `@duration` from the `REPORT` line.

**A preview runs no Sentry.** The preview job gets no DSN, so `Sentry.init` and
the flush after the handler are measured in production only.

**A stub is an upper bound, not a plan.** Aliasing a package to an empty module
measures what removing it would save. A dynamic `import()` does not remove it:
esbuild without code splitting keeps the module in the same file. On pragma it
grew the bundle by 161 KB and gained nothing.
