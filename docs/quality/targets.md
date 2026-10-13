# Quality targets

This file holds the ceiling the operator sets for each value on the quality
dashboard, which `pages.yml` publishes as `reports/dashboard.html` beside the
architecture maps.
A person writes it; no generator rewrites it. `scripts/quality/quality-dashboard.ts`
reads one row per target and colours the value green when it is at or under its
ceiling and red when it is over. A value with no row stays uncoloured.

The table starts empty on purpose. The first week of the dashboard is a
baseline, and a target written before anyone has seen the real numbers is a
guess.

| Indicator | App | Ceiling |
| --- | --- | --- |

## Rules for this file

- The indicator is one of the ids the dashboard uses: `dependabot-critical-high`,
  `dependabot-other`, `audit-critical-high`, `audit-other`, `secret-scanning-open`,
  `errors-preview`, `errors-prod`, `sentry-errors-preview`, `sentry-errors-prod`,
  `user-bug-reports-open`, `latency-p50`, `latency-p95`. Write it in backticks.
- The app is an application slug, or `repository` for the security rows.
- The ceiling is a number: a count, or milliseconds for latency. Lower is
  always better.
