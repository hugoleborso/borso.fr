---
name: quality-dashboard
description: Refresh the private borso.fr 3S board, the claude.ai page showing Speed, Stability and Security for every app over a week, 12 hours or 60 minutes, plus the engaged weak points and the defect map. Use when the operator says "/quality-dashboard", "refresh the dashboard", "update the 3S board", or asks how the apps are doing on latency, errors or vulnerabilities.
---

# Refresh the 3S board

The board is a private claude.ai artifact at https://claude.ai/artifact/1kJhriURt4bM8bZLsoFmBe. Nothing generated is committed. The repository holds the renderer (`scripts/quality/quality-dashboard.ts`) and this procedure. A session refreshes the page because it holds the access CI does not have, which is AWS read, the Sentry MCP, the Pragma MCP and `gh`. [ADR 202611041200](../../../docs/adr/202611041200-the-quality-dashboard-is-a-private-artifact-a-session-refreshes.md) records why.

Refresh only when the operator asks. Never schedule it.

## What the page is

One page, five sections, each a `details` toggle whose closed state carries a score.

- **Speed** and **Stability** sit under a range switch offering `week by week`, `last 12 hours` and `last 60 minutes`. Switching the range re-reads the same indicators over that window. The sections are rendered once with a variant per range, so a section or row you opened stays open when you switch.
- **Security**, **Engaged weak points** and **Defect map** sit below the switch. They are repository state and a defect record, not a rate, so no range applies to them.
- A row is one indicator holding every application. Closed it shows one pastille per application and the row score; open it shows a chip per application with the value, its ceiling and a sparkline. Clicking a chip opens that application's chart full screen, with a y axis, gridlines, direct labels on the peak and the latest bucket, a dashed ceiling line and a legend.
- An indicator is `ok` or `ko` against its ceiling in [docs/quality/targets.md](../../../docs/quality/targets.md), measured on the rolling window of the selected range. An indicator with no ceiling is neither, and does not count in a score.

## Hard constraints the page is built under

- **The published page runs no JavaScript.** An inline `script` and an `a href="#id"` were both tried and neither fires in the artifact runtime, though both work in a plain browser. Every interaction is `details`/`summary` or a radio group with labels. Do not reintroduce script; it will look fine locally and be dead once published.
- **No prose.** Only headings and values are visible text. Every caption is a `title` attribute.
- **No invented number.** A source that cannot be read shows an em dash and a reason in its tooltip, and its section carries a small warning glyph. It never shows zero.

## 1. Collect the snapshot

Write `<scratchpad>/quality-dashboard/snapshot.json`. Each key holds its data, or `{ "unavailable": "<why, one sentence>" }` when the source cannot be read. The renderer refuses a malformed file, so fix the file rather than the renderer.

- **`sentry`**. Organization `borsofr`, region `https://de.sentry.io`, one project. Applications are told apart by the `app` tag, which every app sets. Previews run with Sentry off, because the DSN is a prod-environment variable, so preview errors show only in the CloudWatch 5xx row. Call `search_errors` with `fields: ["app", "environment", "count()"]` four times.
  - `rolling` is the rows for `period: "7d"`, `hour` the rows for `period: "12h"`, `minute` the rows for `period: "1h"`. Each is a list of `{ "app", "environment", "count" }`.
  - `weekly` maps each Monday (ISO date) of the last eight weeks to the rows of that week, with `query: "timestamp:>=<monday>T00:00:00 timestamp:<<next monday>T00:00:00"`. Leave out a week from before the `app` tag existed (before 2026-10-26) rather than writing zero, so the bar shows no data.
  - Sentry has no cheap per-hour or per-minute bucket here, so the two short ranges carry the count with no graph. That is expected, not a gap to fill with zeros.
- **`improvements`**. Call the Pragma MCP `list_improvements`. Pass every item as `{ "id", "title", "status", "kind", "createdAt" }`. The renderer keeps those with `kind: "bug"`. If the tool returns no `kind`, the source is unavailable.
- **`dependabot`**. Run `gh api repos/hugoleborso/borso.fr/dependabot/alerts?state=open --paginate` and count by `security_advisory.severity` into `{ "criticalOrHigh", "other" }`. A 403 saying the token lacks the permission is the reason to record.
- **`secretScanning`**. Run `gh api repos/hugoleborso/borso.fr/secret-scanning/alerts?state=open` and record the count. The hosted-session proxy has refused this path since 2026-11-04.

CloudWatch latency, 5xx and throttling, and `pnpm audit`, are read by the renderer itself with the session's AWS credentials. The renderer asks CloudWatch twice per range, once for the rolling value and once for the buckets, so a run makes six `get-metric-data` calls.

## 2. Render

```bash
pnpm exec tsx scripts/quality/quality-dashboard.ts \
  --snapshot <scratchpad>/quality-dashboard/snapshot.json \
  --output <scratchpad>/quality-dashboard/borso-3s-board.html
```

It prints each unavailable source. It exits 1 only when every source failed or the snapshot is malformed.

## 3. Check it in a browser before publishing

The output is a fragment, so wrap it in a minimal document, then drive it with Playwright, which is preinstalled. Check at 1280 px and at 375 px, in dark and light:

- a range tab switches the panel and leaves open sections open,
- a chip opens its chart and a click outside closes it,
- the console is clean.

A screenshot is worth more than an assertion here, because the failures this page has had were all layout and all invisible to the tests.

## 4. Publish

Publish the output with the Artifact tool, passing `url: https://claude.ai/artifact/1kJhriURt4bM8bZLsoFmBe` so the link stays the same. Before the first publish of the session, read the artifact with `action: "read"`, as the tool requires. Then give the operator the link and the two or three values that moved since the last refresh.

## Changing the renderer

`scripts/quality/quality-dashboard.core.ts` holds the data, `quality-dashboard-page.core.ts` the markup, `quality-page.core.ts` the one stylesheet, `quality-sources.adapter.ts` the AWS and `pnpm audit` reads. All four `.core.ts` files are gated at 100% statements, branches, functions and lines, so a new branch needs a test in the same commit. Charts follow `/dataviz`: run its palette validator rather than picking a colour by eye.
