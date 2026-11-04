---
name: quality-dashboard
description: Refresh the private borso.fr 3S board, the claude.ai page showing Security, Stability and Speed for every app plus the defect map. Use when the operator says "/quality-dashboard", "refresh the dashboard", "update the 3S board", or asks how the apps are doing on errors, latency or vulnerabilities.
---

# Refresh the 3S board

The board is a private claude.ai artifact at https://claude.ai/artifact/1kJhriURt4bM8bZLsoFmBe. Nothing generated is committed. The repository holds the renderer (`scripts/quality/quality-dashboard.ts`) and this procedure. A session refreshes the page because it holds the access CI does not have, which is AWS read, the Sentry MCP, the Pragma MCP and `gh`. [ADR 202611041200](../../../docs/adr/202611041200-the-quality-dashboard-is-a-private-artifact-a-session-refreshes.md) records why.

Refresh only when the operator asks. Never schedule it.

## 1. Collect the snapshot

Write `<scratchpad>/quality-dashboard/snapshot.json`. Each of the four keys holds its data, or `{ "unavailable": "<why, one sentence>" }` when the source cannot be read. The renderer refuses a malformed file, so fix the file rather than the renderer.

- **`sentry`**. Organization `borsofr`, region `https://de.sentry.io`, one project. Applications are told apart by the `app` tag, which only pragma sets today. Call `search_errors` with `fields: ["app", "environment", "count()"]`.
  - `rolling` is the rows for `period: "7d"`.
  - `weekly` maps each Monday (ISO date) of the last eight weeks to the rows of that week, with `query: "timestamp:>=<monday>T00:00:00 timestamp:<<next monday>T00:00:00"`. Leave out a week from before the `app` tag existed (before 2026-10-26) rather than writing zero, so the bar shows no data.
  - Each row is `{ "app", "environment", "count" }`.
- **`improvements`**. Call the Pragma MCP `list_improvements`. Pass every item as `{ "id", "title", "status", "kind", "createdAt" }`. The renderer keeps those with `kind: "bug"`. If the tool returns no `kind`, the source is unavailable.
- **`dependabot`**. Run `gh api repos/hugoleborso/borso.fr/dependabot/alerts?state=open --paginate` and count by `security_advisory.severity` into `{ "criticalOrHigh", "other" }`. A 403 saying alerts are disabled is the reason to record.
- **`secretScanning`**. Run `gh api repos/hugoleborso/borso.fr/secret-scanning/alerts?state=open` and record the count. The hosted-session proxy refused this path on 2026-11-04.

CloudWatch latency and 5xx and `pnpm audit` are read by the renderer itself, with the session's AWS credentials.

## 2. Render

```bash
pnpm exec tsx scripts/quality/quality-dashboard.ts \
  --snapshot <scratchpad>/quality-dashboard/snapshot.json \
  --output <scratchpad>/quality-dashboard/borso-3s-board.html
```

It prints each unavailable source. It exits 1 only when every source failed or the snapshot is malformed.

## 3. Publish

Publish the output with the Artifact tool, passing `url: https://claude.ai/artifact/1kJhriURt4bM8bZLsoFmBe` so the link stays the same. Before the first publish of the session, read the artifact with `action: "read"`, as the tool requires. Then give the operator the link and the two or three values that moved since the last refresh.
