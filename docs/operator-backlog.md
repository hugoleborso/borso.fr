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
| #294 | Delete the orphan `/aws/lambda/<app>-pr-<N>-*` log groups whose stack is gone. The script below skips every live `<app>-pr-<N>` stack. About 930 on 2026-11-11 (measured). | AWS `logs:DeleteLogGroup` | `aws logs describe-log-groups --region eu-west-3 --log-group-name-prefix /aws/lambda/` lists `-pr-` groups only for open pull requests |
| #286, #289 | Create the SecureStrings `/talos/fire-url`, `/talos/fire-token` and `/talos/secret-phrase`, and make the talos agent routine read the `message:` line. | AWS SSM write, and the operator's Claude account, where the routine and its fire token live | `aws ssm get-parameters --region eu-west-3 --names /talos/fire-url /talos/fire-token /talos/secret-phrase` returns no `InvalidParameters` |

### Deleting the orphan preview log groups

```bash
live=$(aws cloudformation list-stacks --region eu-west-3 \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE CREATE_IN_PROGRESS UPDATE_IN_PROGRESS ROLLBACK_COMPLETE \
  --query "StackSummaries[?contains(StackName,'-pr-')].StackName" --output text | tr '\t' '\n')
aws logs describe-log-groups --region eu-west-3 --log-group-name-prefix /aws/lambda/ \
  --query 'logGroups[].logGroupName' --output text | tr '\t' '\n' \
  | grep -E '^/aws/lambda/[a-z-]+-pr-[0-9]+-' \
  | while read -r g; do
      s=$(sed -E 's|^/aws/lambda/([a-z-]+-pr-[0-9]+)-.*|\1|' <<<"$g")
      grep -qx "$s" <<<"$live" || echo "$g"
    done > orphans.txt
wc -l orphans.txt
while read -r g; do aws logs delete-log-group --region eu-west-3 --log-group-name "$g"; done < orphans.txt
```

## Done

| Found in | Task | Done | Evidence |
| --- | --- | --- | --- |
| #283 | Dispatch `shared-deploy` for the SPF, DMARC and null MX records | by 2026-11-11 | Route 53 holds `borso.fr TXT "v=spf1 -all"`, `MX 0 .` and `_dmarc` |
| #236 | Store a fine-grained token with Administration write as the `ENVIRONMENTS_ADMIN_TOKEN` secret | by 2026-11-11 | The teardown of run 43088554711 sent its `DELETE` to `environments/preview-talos-pr-294` |
| #199, #218, #221 | Narrow `Explicit-write-deny` on `AI-Dev-ReadOnly` and grant invoke on the agent-reader Lambdas | by 2026-11-11 | `APP=pragma scripts/db-read.sh "SELECT 1 AS ok"` returned `{"ok":1}` |
| #235, #263 | Set the Sentry variables and the `SENTRY_AUTH_TOKEN` secret in the `prod` environment | by 2026-11-11 | `deploy.yml` refuses an empty DSN, and deploy runs 219 to 221 ended `success` (inferred) |
