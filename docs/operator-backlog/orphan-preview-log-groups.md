---
status: done
found-in: '#294'
closed: 2026-11-11
---

# Orphan preview log groups

Delete the orphan preview log groups whose stack is gone

Closed: 2026-11-11.

## Evidence

The operator deleted 1,577 groups with the `borso-admin` profile and none failed (their count): 924 `/aws/lambda/<app>-pr-<N>-*`, and 653 `<app>-pr-<N>-AppDbMigrationRunnerLogs*` or `<app>-pr-<N>-AppDbProviderLogs*`, a family the row did not name. On 2026-11-12, `aws logs describe-log-groups --region eu-west-3` listed 25 `-pr-` groups (measured): 23 for the live stacks of #298 and #302, and the 2 in the open row.
