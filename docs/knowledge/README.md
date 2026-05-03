# Knowledge base

One file per defect or vendor-knowledge gap, written as a **Dantotsu**: Symptom → Root-cause chain → Detection failure causes → Countermeasure → Eradication. Template at [`_template.md`](./_template.md). Each entry has YAML frontmatter capturing the date, the **stage at which the defect was introduced** (conception, implementation, self-validation, code review, or vendor-knowledge), where it was eventually detected, severity, and the related PR / fix commit — useful for spotting patterns over time (e.g. "we keep introducing defects at conception" → invest in design rigour).

If a PR uncovers a new trap, run the [`/dantotsu`](../../.claude/skills/dantotsu/SKILL.md) Claude Code skill — it walks the seven steps and produces an entry that copies the template. Even if the fix turns out to be "the operator changes a console setting", capture it; the value is in the causal chain, not the conclusion.

## Index

### CDK / AWS infrastructure

- [`bucketdeployment-cloudfront-invalidation.md`](./bucketdeployment-cloudfront-invalidation.md) — preview HTML stayed stale ~24 h after redeploy.
- [`bucketdeployment-prune-default.md`](./bucketdeployment-prune-default.md) — manually-uploaded objects vanished on the next deploy.
- [`cdk-nodejsfunction-bundling.md`](./cdk-nodejsfunction-bundling.md) — synth-heavy unit tests hit a vitest worker IPC timeout.
- [`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md) — preview returned `503 FunctionExecutionError` on a function that worked locally.
- [`cloudfront-function-throttle-persistence.md`](./cloudfront-function-throttle-persistence.md) — `503 FunctionThrottledError` on a freshly-deployed, working function.
- [`cloudfront-resources-in-us-east-1.md`](./cloudfront-resources-in-us-east-1.md) — `aws cloudfront describe-function` "function does not exist" in eu-west-3.
- [`s3-oac-403-not-404.md`](./s3-oac-403-not-404.md) — broken links rendered "Access Denied", custom `errorResponses` rule never fired.
- [`aws-budgets-usd-only.md`](./aws-budgets-usd-only.md) — `cdk deploy` of the shared stack failed with `InvalidParameterValue` on the budget unit.
- [`dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — preview synth failed with SSM-parameter-not-found for a brand-new DB-using app.

### GitHub Actions / CI

- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md) — `detect` job aborted with `git exit 128` on push to main.
- [`workflow-dispatch-default-branch.md`](./workflow-dispatch-default-branch.md) — `workflow_dispatch` workflow didn't appear in the Actions UI for the PR that introduced it.

### pnpm / monorepo

- [`pnpm-reserved-script-names.md`](./pnpm-reserved-script-names.md) — CI's "deploy" step ran the wrong thing (pnpm built-in, not the package script).
- [`shared-deploy-stale-dist.md`](./shared-deploy-stale-dist.md) — `pnpm shared-infra deploy` shipped the previous version of the CloudFront Function source.

### Operator / shell quirks

- [`macos-bsd-vs-aws-cli-quirks.md`](./macos-bsd-vs-aws-cli-quirks.md) — diagnostic commands failed on macOS / under AWS CLI v2.
- [`cloudfront-get-function-binary-output.md`](./cloudfront-get-function-binary-output.md) — `aws cloudfront get-function` showed only metadata; the function source was hidden.

## Adding a new entry

The `/dantotsu` Claude Code skill ([`.claude/skills/dantotsu/SKILL.md`](../../.claude/skills/dantotsu/SKILL.md)) walks through the seven steps and produces a complete entry. Run it whenever a PR uncovers a non-trivial defect or vendor surprise.

If writing by hand, copy [`_template.md`](./_template.md) and fill the frontmatter + sections. Then add a one-line entry to the index above under the right heading.

## Reading the frontmatter

Each entry's YAML frontmatter is structured so it can be aggregated later if we want metrics:

| Field | Meaning |
| --- | --- |
| `introduced-at` | Stage where the defect was *born*. `conception` (the design itself was wrong), `implementation` (design was right, code didn't match), `self-validation` (developer's manual checks didn't reveal it), `code-review` (reviewer didn't catch it), `n/a-vendor-knowledge` (no defect on our side — a vendor / external system surprised us). |
| `detected-at` | Where the defect was *finally* caught. Walk the defence-in-depth ladder: typing → linter → local → ci → review → qa → staging → production → operator-deploy. The Detection failure causes section explains why every earlier layer missed it. |
| `severity` | User impact at the time of detection. `low`: nobody noticed. `medium`: degraded UX, recoverable. `high`: user-blocking or data integrity. |
| `time-to-detect` | Wall-clock time from "defect lives in main" to "we noticed". A long TTD on a high-severity defect is its own thing to investigate. |
| `tags` | Topics for grep / future skill matching: `cdk`, `cloudfront`, `s3`, `ci`, `pnpm`, `dsql`, `github-actions`, `aws-cli`, etc. |

Patterns to watch for as the corpus grows:

- Many `introduced-at: conception` → design isn't getting enough scrutiny; invest in pre-implementation review or spec writing.
- Many `detected-at: production` with high severity → defence-in-depth has gaps; invest in earlier layers.
- Recurring tags → consider a primer doc, a linter rule, or a construct-level guarantee that eliminates the class.
