---
name: quality-dashboard
description: Refresh the private borso.fr 3S board, the claude.ai dashboard showing Speed, Stability and Security for every app over a week, 12 hours or 60 minutes, plus the engaged weak points and the defect map. Use when the operator says "/quality-dashboard", "refresh the dashboard", "update the 3S board", or asks how the apps are doing on latency, errors or vulnerabilities.
---

# Refresh the 3S board

The board is a private claude.ai dashboard at https://claude.ai/artifact/SPfft3WuWwZh2YHRu3Ztab, made from the shared Dashboard Artifact type. The repository holds the page and the dataset builder; nothing generated is committed. A session refreshes it because it holds the access CI does not have, which is AWS read, the Sentry MCP, the Pragma MCP and `gh`. [ADR 2026-11-04T1200](../../../docs/adr/2026-11-04T1200-the-quality-dashboard-is-a-private-artifact-a-session-refreshes.md) records why.

Refresh only when the operator asks. Never schedule it.

## How it is put together

The Dashboard type runs the page's own JavaScript and gives it d3, a Sources panel, filters and theme tokens. So the board is **data plus a page**, not generated HTML:

- `scripts/quality/dashboard/index.html` is the page. It is static: it reads every number from a dataset and draws the charts with d3. Change it by editing that file and writing it to `files/index.html` in the dashboard's store.
- `scripts/quality/quality-dashboard.ts` builds the datasets as JSON files. It reads CloudWatch and `pnpm audit` itself, and takes everything else from the snapshot you collect.
- Six datasets: `indicators`, `buckets`, `security`, `weak_points`, `weak_point_weeks`, `defects`. Each is an attached file, because none of their sources is a connector the reader's page could query. Sentry is the exception that could be live; it is attached so the whole board has one freshness story.

Read the type's own `SKILL.md` and `artifact-type/reference/design-defaults.md` on the dashboard before changing the page. The store refuses a document over 256 KB, so the page stays one file and the data stays in assets.

## What the board shows

- **Speed** and **Stability** sit under a range filter: `week by week`, `last 12 hours`, `last 60 minutes`. The filter is `dash/params.range`; every range is already in `indicators` and `buckets`, so switching redraws without re-reading anything.
- **Security**, **Engaged weak points** and the **Defect map** are repository state and a defect record, not a rate, so no range applies.
- A row is one indicator holding every application. Open it for a chip per application with the value, its ceiling and a sparkline; click a chip for the full chart with axes, gridlines, a ceiling line and hover.
- An indicator is ok or ko against its ceiling in [docs/quality/targets.md](../../../docs/quality/targets.md), measured on the rolling window of the selected range. No ceiling means neither, and it counts in no score.

## 1. Collect the snapshot

Write `<scratchpad>/quality-dashboard/snapshot.json`. Each key holds its data, or `{ "unavailable": "<why, one sentence>" }` when the source cannot be read. The builder refuses a malformed file, so fix the file rather than the builder.

- **`sentry`**. Organization `borsofr`, region `https://de.sentry.io`, one project. Applications are told apart by the `app` tag. Previews run with Sentry off, because the DSN is a prod-environment variable, so preview errors show only in the CloudWatch 5xx row. Call `search_errors` with `fields: ["app", "environment", "count()"]` four times.
  - `rolling` is the rows for `period: "7d"`, `hour` for `period: "12h"`, `minute` for `period: "1h"`. Each is a list of `{ "app", "environment", "count" }`.
  - `weekly` maps each Monday (ISO date) of the last eight weeks to that week's rows, with `query: "timestamp:>=<monday>T00:00:00 timestamp:<<next monday>T00:00:00"`. Leave out a week from before the `app` tag existed (before 2026-10-26) rather than writing zero.
  - Sentry has no cheap per-hour or per-minute bucket, so the two short ranges carry the count with no graph. That is expected, not a gap to fill with zeros.
- **`sentryIssues`**. Call `search_issues` once per app with `query: "is:unresolved app:<app>"`, `period: "7d"`, and record `{ "app", "count" }` with the number of issues returned. This is the count of distinct open problems; the event count above is the rate. It is deliberately unscored.
- **`improvements`**. Call the Pragma MCP `list_improvements`. Pass every item as `{ "id", "title", "status", "kind", "createdAt" }`. The builder keeps those with `kind: "bug"`. If the tool returns no `kind`, the source is unavailable.
- **`dependabot`**. Run `gh api repos/hugoleborso/borso.fr/dependabot/alerts?state=open --paginate` and count by `security_advisory.severity` into `{ "criticalOrHigh", "other" }`. A 403 saying the token lacks the permission is the reason to record.
- **`secretScanning`**. Run `gh api repos/hugoleborso/borso.fr/secret-scanning/alerts?state=open` and record the count. The hosted-session proxy has refused this path since 2026-11-04.

CloudWatch latency, 5xx and throttling, and `pnpm audit`, are read by the builder itself with the session's AWS credentials. It asks CloudWatch twice per range, so a run makes six `get-metric-data` calls.

## 2. Build the datasets

```bash
pnpm exec tsx scripts/quality/quality-dashboard.ts \
  --snapshot <scratchpad>/quality-dashboard/snapshot.json \
  --output <scratchpad>/quality-dashboard/datasets
```

It prints each unavailable source. It exits 1 only when every source failed or the snapshot is malformed.

## 3. Upload and write the store

Upload each `<name>.json` with the Artifact tool, `asset: true` and the board's url, one call per file because they are text. Keep each reply's `/_blob/<id>` url.

Then one `ArtifactData` `batch` on the board's url, pinning `if_version` for every document that already exists (read them first):

- `datasets/<name>` — `{title, description, source: {kind: "file", url: "/_blob/<id>", name, format: "json"}, updated: {at, by}, schedule, staleAfterHours, edit}`. Only `source.url`, `updated` and `edit` change on a refresh.
- `files/index.html` — `{text: <the page file>, edit}`, only when the page itself changed.
- `dash/meta` and `dash/params` — set once; they do not change on a refresh.

Then read `data/users/me` doc `check` on the board. `checking` means read again, up to five times. `failed` names what the page threw or showed wrong: fix what the code confirms, write, check again, at most twice. No document after two reads means nothing failed.

Do not render, screenshot or browse the published board: it keeps the operator waiting, and the check document is the check. That says nothing about the page file, which you render locally before you write it, with `pnpm exec tsx scripts/quality/check-dashboard-page.ts`. Reading this as "the page cannot be rendered" is what let a blank modal and a sideways-scrolling board reach the operator's phone in PR #281.

## 4. Tell the operator

Give the link and the two or three values that moved since the last refresh. Say that an attached file is readable by anyone who can open the board, and that the numbers are as fresh as the last refresh, not live.

## Changing the page

`scripts/quality/dashboard/index.html` is plain HTML, CSS and JavaScript with `d3` and `dash` as globals. Every figure must carry its `data-source`, and `data-field`/`data-where` where it is one cell, or the type reports it back as a mis-marked number. Charts follow `/dataviz`.

**The type runs each `<script>` in a scope of its own.** A `function` or `const` declared in one is invisible to the next, and the call throws only in the published page. Everything two scripts share goes on `window.s3`. The page must also fit 375 px with every row open, because a card that floors at its widest child scrolls the whole board sideways.

`pnpm exec tsx scripts/quality/check-dashboard-page.ts` is what holds both. It loads this page in Chromium with real d3, a `dash` stubbed from `scripts/quality/dashboard/fixture.json`, and each script body wrapped in its own scope, opens every row, and refuses on a page error, on a document wider than the viewport at 390, 768 or 1280 px, and on a sparkline or enlarged chart that drew no bar. The pre-commit hook runs it whenever the page moves. Run it before you write `files/index.html`.

`scripts/quality/*.core.ts` is gated at 100% statements, branches, functions and lines plus a 100% mutation score, so a new branch needs a test in the same commit. `scripts/quality/quality-datasets.core.ts` turns indicators into rows; `quality-dashboard.core.ts` reads the sources.
