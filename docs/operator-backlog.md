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
| hugoleborso/borso.fr#321 | Create a Lichess personal API token and store it as `LICHESS_TOKEN` where a session can read it. The move statistics and counters of the borsouvertures trainer are not built without it. | The operator's Lichess account, a secret | `pnpm --filter @borso-app/borsouvertures run build:move-statistics` writes a file with at least one FEN |
| hugoleborso/borso.fr#321 | Run `scripts/seed-operator-credential.sh` once after the merge that ships borsouvertures sync, and again to change the password. No route enrols anyone (ADR-2026-11-13T0002), so until it runs sign-in answers `auth-not-bootstrapped` and the app stays a local trainer. | The `borso-admin` AWS profile, with `psql` and `node` | A sign-in with a wrong password on `borsouvertures.borso.fr` answers 401 and no longer `auth-not-bootstrapped` |
| hugoleborso/borso.fr#321 | Grant `AI-Dev-ReadOnly` invoke on the borsouvertures agent-reader Lambda, which the first prod deploy of the app's `PreviewableApp` creates | IAM | `APP=borsouvertures scripts/db-read.sh "SELECT 1 AS ok"` returns `{"ok":1}` |
| hugoleborso/borso.fr#321 | Create the Sentry alert rules for `DeckContentInvalidError`, `SyncRejectedError` and `StockfishIllegalMoveError` (first occurrence in prod), and for `ReviewEventStoreUnavailableError` and `StockfishLoadFailedError` (5 in a day), each filtered on the tag `app:borsouvertures` | The Sentry project | The project lists five rules whose names hold the error names |
| #314 | Replace the derived Talos icons with the Drive originals. The session had no `gws` and no access to the personal Drive folder "Talos/livrables/Perso/Logo Talos", so every size in `apps/talos/site/public/icons/` is resized from the 360 px copies in the prototype artifact. The 512 px icons are upscaled from 360 (measured). | The operator's own Google Drive | `python3 -c "from PIL import Image; print(Image.open('apps/talos/site/public/icons/icon-512.png').size)"` prints `(512, 512)` from a file whose history names the Drive original `icon-512.png` |
| #310 | Dispatch `shared-deploy` once #310 is merged. It changed the previews function, which now answers 404 to a path under `/api/` on the site host of a single-page app. | A dispatch only the operator makes | `curl -s -o /dev/null -w '%{http_code}' https://<app>-pr-<n>.preview.borso.fr/api/me` prints 404 on a live preview of pragma, last-loop-lepin or banana-rush. It printed 200 on 2026-11-12 (measured) |
| #298 | Make `SENTRY_DSN` a repository variable, or give the preview job its own, so a pragma preview runs Sentry. Until then the flush after a cold first request, 165 to 280 ms in production (measured), can only be worked on by merging to find out. | GitHub repository or environment variables | A cold start of `pragma-pr-<n>-api` logs a wide event whose `trace.id` is set |
| #303 | Confirm that a preview teardown leaves no log group. The two groups the teardown of #295 left are deleted: on 2026-11-12 the account listed `-pr-` groups only for the open #298 and #302 (measured). Lambda had created each one again about 3 seconds after CloudFormation deleted it, from a log event delivered late, and the sweep that follows `cdk destroy` only looked under `/aws/lambda/` (measured in the stack events and the teardown log). `scripts/preflight-preview-recovery.sh` now sweeps `<app>-pr-<N>-*` too. Not measured yet on a real teardown. | AWS read, after a pull request that deployed `pragma`, `last-loop-lepin` or `banana-rush` closes with this fix on `main` | `aws logs describe-log-groups --region eu-west-3 --log-group-name-pattern pr-<N>` lists nothing once the teardown of that pull request has ended. #298 and #302 are the first candidates. |

## Done

| Found in | Task | Done | Evidence |
| --- | --- | --- | --- |
| #318 | Turn the wiki on and create its first page, so `.github/workflows/wiki.yml` can push to it | 2026-11-12 | Run 43281381168, attempt 2, of `wiki` pushed 564 pages to `hugoleborso/borso.fr.wiki.git` (`2b207f5..43c2700`, measured in its log). The first attempt had failed with `repository ... not found` before the first page was saved |
| #294 | Delete the orphan preview log groups whose stack is gone | 2026-11-11 | The operator deleted 1,577 groups with the `borso-admin` profile and none failed (their count): 924 `/aws/lambda/<app>-pr-<N>-*`, and 653 `<app>-pr-<N>-AppDbMigrationRunnerLogs*` or `<app>-pr-<N>-AppDbProviderLogs*`, a family the row did not name. On 2026-11-12, `aws logs describe-log-groups --region eu-west-3` listed 25 `-pr-` groups (measured): 23 for the live stacks of #298 and #302, and the 2 in the open row. |
| #292, which holds the closed #286 and #289 | Create the SecureStrings `/talos/fire-url`, `/talos/fire-token` and `/talos/secret-phrase`, and make the talos agent routine read the `message:` line | 2026-11-11 | `aws ssm get-parameters --region eu-west-3 --names /talos/fire-url /talos/fire-token /talos/secret-phrase` returned the three as `SecureString` and an empty `InvalidParameters` (measured on 2026-11-12). `/talos/fire-url` matches `https://api.anthropic.com/…/fire` (measured). It is the API trigger of the routine "Talos : message", created the same day on the talos repository in the "Talos build" environment (operator's account, not read here). The routine reads the `message:` line since commit `dc66bcb` of `hugoleborso/talos`. Not verified: a real fire from the PWA to the routine. |
| #283 | Dispatch `shared-deploy` for the SPF, DMARC and null MX records | by 2026-11-11 | Route 53 holds `borso.fr TXT "v=spf1 -all"`, `MX 0 .` and `_dmarc` |
| #236 | Store a fine-grained token with Administration write as the `ENVIRONMENTS_ADMIN_TOKEN` secret | by 2026-11-11 | The teardown of run 43088554711 sent its `DELETE` to `environments/preview-talos-pr-294` |
| #199, #218, #221 | Narrow `Explicit-write-deny` on `AI-Dev-ReadOnly` and grant invoke on the agent-reader Lambdas | by 2026-11-11 | `APP=pragma scripts/db-read.sh "SELECT 1 AS ok"` returned `{"ok":1}` |
| #235, #263 | Set the Sentry variables and the `SENTRY_AUTH_TOKEN` secret in the `prod` environment | by 2026-11-11 | `deploy.yml` refuses an empty DSN, and deploy runs 219 to 221 ended `success` (inferred) |
