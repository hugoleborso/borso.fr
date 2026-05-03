# Knowledge base

One file per recurring trap. Each entry follows a **Dantotsu** root-cause structure:

- **Symptom** — what we observed.
- **Root-cause chain** — successive *whys* down to the underlying cause.
- **Fix** — what was committed and/or what the operator must do (config, AWS console, registrar, etc.).

If a PR uncovers a new trap, drop a new file here. Even if the fix is "the operator changes a console setting", capture it — the value is in the chain, not just the conclusion.

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

1. Pick a slug `kebab-case`.
2. Use the template:
   ```md
   # <Title>

   ## Symptom
   <observable failure mode, with the exact error if useful>

   ## Root-cause chain
   1. **Why?** <step-1 question>
      <answer>
   2. **Why?** <step-2 question>
      <answer>
   …
   **Root cause:** <one sentence>

   ## Fix
   - **Code:** commit `<sha>` — <what changed>
   - **Config / operator action:** <what the human has to do, if anything>
   ```
3. Link from the index above under the right heading.
4. If the lesson also belongs in CLAUDE.md as a one-line rule (rare), add it; otherwise the knowledge entry alone is enough.
