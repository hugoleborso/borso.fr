# Quality targets

This file holds the ceiling the operator sets for each value on the quality
dashboard, the private claude.ai page a session refreshes with
`.claude/skills/quality-dashboard/SKILL.md`.
A person writes it; no generator rewrites it. `scripts/quality/quality-dashboard.ts`
reads one row per target and marks the indicator ok when the rolling seven-day
value is at or under its ceiling and ko when it is over. An indicator with no
row is neither, and does not count in its section's score.

| Indicator | App | Ceiling |
| --- | --- | --- |
| `audit-critical-high` | repository | 0 |
| `audit-other` | repository | 30 |
| `dependabot-critical-high` | repository | 0 |
| `dependabot-other` | repository | 30 |
| `secret-scanning-open` | repository | 0 |
| `errors-preview` | pragma | 0 |
| `errors-preview` | last-loop-lepin | 0 |
| `errors-preview` | banana-rush | 0 |
| `errors-preview` | talos | 0 |
| `errors-prod` | pragma | 0 |
| `errors-prod` | last-loop-lepin | 0 |
| `errors-prod` | banana-rush | 0 |
| `errors-prod` | talos | 0 |
| `throttles-prod` | pragma | 0 |
| `throttles-prod` | last-loop-lepin | 0 |
| `throttles-prod` | banana-rush | 0 |
| `throttles-prod` | talos | 0 |
| `sentry-errors-preview` | pragma | 10 |
| `sentry-errors-preview` | last-loop-lepin | 10 |
| `sentry-errors-preview` | banana-rush | 10 |
| `sentry-errors-preview` | talos | 10 |
| `sentry-errors-preview` | borso-fr | 10 |
| `sentry-errors-preview` | borsouvertures | 10 |
| `sentry-errors-prod` | pragma | 0 |
| `sentry-errors-prod` | last-loop-lepin | 0 |
| `sentry-errors-prod` | banana-rush | 0 |
| `sentry-errors-prod` | talos | 0 |
| `sentry-errors-prod` | borso-fr | 0 |
| `sentry-errors-prod` | borsouvertures | 0 |
| `user-bug-reports-open` | pragma | 0 |
| `sentry-issues-open` | pragma | 0 |
| `sentry-issues-open` | last-loop-lepin | 0 |
| `sentry-issues-open` | banana-rush | 0 |
| `sentry-issues-open` | talos | 0 |
| `sentry-issues-open` | borso-fr | 0 |
| `sentry-issues-open` | borsouvertures | 0 |
| `latency-p50` | pragma | 150 |
| `latency-p50` | last-loop-lepin | 150 |
| `latency-p50` | banana-rush | 150 |
| `latency-p50` | talos | 150 |
| `latency-p95` | pragma | 2000 |
| `latency-p95` | last-loop-lepin | 2000 |
| `latency-p95` | banana-rush | 2000 |
| `latency-p95` | talos | 2000 |
| `test-time` | pragma | 30 |
| `test-time` | last-loop-lepin | 30 |
| `test-time` | banana-rush | 30 |
| `test-time` | skull-king | 30 |
| `test-time` | talos | 30 |
| `test-time` | borso-fr | 30 |
| `test-time` | borsouvertures | 30 |
| `ci-time` | repository | 600 |

## Rules for this file

- The indicator is one of the ids the dashboard uses: `dependabot-critical-high`,
  `dependabot-other`, `audit-critical-high`, `audit-other`, `secret-scanning-open`,
  `errors-preview`, `errors-prod`, `throttles-prod`, `sentry-errors-preview`,
  `sentry-errors-prod`, `sentry-issues-open`, `user-bug-reports-open`,
  `latency-p50`, `latency-p95`, `test-time`, `ci-time`. Write it in backticks.
- The app is an application slug, or `repository` for the security rows.
- The ceiling is a number: a count, milliseconds for latency, or seconds for
  `test-time` and `ci-time`. Lower is always better.
- `test-time` is the slowest pull-request run of an application's unit suite
  step in `ci.yml`, and `ci-time` the slowest job of a `ci.yml` run on a pull
  request. Their ceilings, 30 s and 10 min, are the budgets "One application's
  unit suite" and "CI on a pull request" in
  [standard 14](../standards/14-tool-runtime-budgets.md). The `repository` row
  of `test-time`, the root `scripts/` suite, has no ceiling because that
  standard budgets an application's suite only.
- `sentry-issues-open` counts the distinct unresolved Sentry issues seen in the
  last 7 days. Its ceiling is 0 since 2026-11-14, on the operator's call, so
  every open issue is a problem to fix or resolve.
- The ceilings above were set on 2026-11-06 against the figures measured that
  day. `sentry-errors-preview` is the one row that measures nothing: previews
  run with Sentry off, because the DSN is a production environment variable, so
  that indicator is always 0 and always ok.
