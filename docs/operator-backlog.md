# Operator backlog

Tasks that need a right no session holds. Only the operator can do them.

A row belongs here only when the session that found it could not do it,
because it needed one of these:

- AWS write or IAM. Sessions run as `AI-Dev-ReadOnly`, and `iam:*` is denied.
- GitHub repository settings, environments, variables, secrets, tokens or app
  installs.
- A dispatch only the operator makes, such as `shared-deploy`.
- A third-party console or the operator's own account or devices.

A code change, a product decision, a review or a merge is not a row.

The session that finds such a task adds its row in the pull request that found
it. The operator moves a row to *Done* with the date and the evidence, or a
session does once it has measured the result.

## Open

| Found in | Task | Right it needs | How to check it is done |
| --- | --- | --- | --- |
| #303 | Delete `banana-rush-pr-295-AppDbProviderLogsD76CF8C5-1R9yfz2OLeSS` and `last-loop-lepin-pr-295-AppDbProviderLogsD76CF8C5-gAGOqy0o9Kqy`. The teardown of #295 left them after the cleanup below, and both stacks are `DELETE_COMPLETE` (measured on 2026-11-12). Each group was created after its stack finished deleting: `banana-rush-pr-295` reached `DELETE_COMPLETE` at 22:59:28 UTC and its group was created at 22:59:51, from one log event stamped 22:59:42 (measured). So the provider Lambda's last write creates the group again, and every teardown of an app with a database can leave one until `infra/cdk/src/constructs/dsql-schema.ts` stops it. | AWS `logs:DeleteLogGroup` | `aws logs describe-log-groups --region eu-west-3 --log-group-name-pattern pr-295` lists nothing |

## Done

| Found in | Task | Done | Evidence |
| --- | --- | --- | --- |
| #294 | Delete the orphan preview log groups whose stack is gone | 2026-11-11 | The operator deleted 1,577 groups with the `borso-admin` profile and none failed (their count): 924 `/aws/lambda/<app>-pr-<N>-*`, and 653 `<app>-pr-<N>-AppDbMigrationRunnerLogs*` or `<app>-pr-<N>-AppDbProviderLogs*`, a family the row did not name. On 2026-11-12, `aws logs describe-log-groups --region eu-west-3` listed 25 `-pr-` groups (measured): 23 for the live stacks of #298 and #302, and the 2 in the open row. |
| #292, which holds the closed #286 and #289 | Create the SecureStrings `/talos/fire-url`, `/talos/fire-token` and `/talos/secret-phrase`, and make the talos agent routine read the `message:` line | 2026-11-11 | `aws ssm get-parameters --region eu-west-3 --names /talos/fire-url /talos/fire-token /talos/secret-phrase` returned the three as `SecureString` and an empty `InvalidParameters` (measured on 2026-11-12). `/talos/fire-url` matches `https://api.anthropic.com/…/fire` (measured). It is the API trigger of the routine "Talos : message", created the same day on the talos repository in the "Talos build" environment (operator's account, not read here). The routine reads the `message:` line since commit `dc66bcb` of `hugoleborso/talos`. Not verified: a real fire from the PWA to the routine. |
| #283 | Dispatch `shared-deploy` for the SPF, DMARC and null MX records | by 2026-11-11 | Route 53 holds `borso.fr TXT "v=spf1 -all"`, `MX 0 .` and `_dmarc` |
| #236 | Store a fine-grained token with Administration write as the `ENVIRONMENTS_ADMIN_TOKEN` secret | by 2026-11-11 | The teardown of run 43088554711 sent its `DELETE` to `environments/preview-talos-pr-294` |
| #199, #218, #221 | Narrow `Explicit-write-deny` on `AI-Dev-ReadOnly` and grant invoke on the agent-reader Lambdas | by 2026-11-11 | `APP=pragma scripts/db-read.sh "SELECT 1 AS ok"` returned `{"ok":1}` |
| #235, #263 | Set the Sentry variables and the `SENTRY_AUTH_TOKEN` secret in the `prod` environment | by 2026-11-11 | `deploy.yml` refuses an empty DSN, and deploy runs 219 to 221 ended `success` (inferred) |
