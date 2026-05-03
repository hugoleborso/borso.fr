# Knowledge base

One file per recurring trap. Each entry follows a **Dantotsu** root-cause structure:

- **Symptom** — what we observed (from the user's perspective when there is one).
- **Root-cause chain** — successive *whys* down to the developer's misconception.
- **Detection failure causes** — which layer should have caught it and why didn't (optional but encouraged).
- **Countermeasure + Eradication** — what was committed, what's left, what the operator must do (config, console, registrar).

If a PR uncovers a new trap, run the [`/dantotsu`](../../.claude/skills/dantotsu/SKILL.md) Claude Code skill — it walks the seven steps and produces a file in this folder. Even if the fix turns out to be "the operator changes a console setting", capture it; the value is in the causal chain, not just the conclusion.

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

The `/dantotsu` Claude Code skill ([`.claude/skills/dantotsu/SKILL.md`](../../.claude/skills/dantotsu/SKILL.md)) walks through the seven steps and produces a complete entry. Run it whenever a PR uncovers a non-trivial defect.

If you're writing one by hand, use this template:

```md
# <Title — sparks curiosity, hints at the lesson, NOT the user-story name>

## Symptom
<from the user's perspective, with screenshot/error if available>

## Root-cause chain
1. **Why?** <step-1 question>
   <answer>
2. **Why?** <step-2 question>
   <answer>
…
**Root cause:** <one-sentence misconception, in "thought X, actually Y" form>

## Detection failure causes
- **<layer>:** <why this layer didn't catch it>
- …

## Countermeasure
- **Code:** <commit sha / pseudo-diff + why this addresses the root cause specifically>
- **Operator action:** <if anything is required outside the codebase>

## Eradication
- <sibling latent defects swept (with paths/commits)>
- <tooling change applied>
- <knowledge sharing planned or done>
```

Then add a one-line entry to the index above under the right heading.

The 15 entries committed alongside this README are "Dantotsu-lite" — they predate the skill and have Symptom / Root-cause chain / Fix only. Future entries follow the full template above. If you're updating an old entry while debugging something related, take the chance to flesh out its Detection failure causes and Eradication sections.
