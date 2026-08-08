---
date: 2026-05-03
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: #6
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [<to-be-filled>]
eradication-level: 2
time-to-detect: minutes
tags: [cdk, cloudfront, route53, deploy]
---

# A CloudFront CNAME is single-distribution; cutover deploys must release it first

## Symptom

`pnpm --filter @borso-app/borso-fr run deploy` for the new prod stack failed at `SiteDistribution390DED28` with:

```
AWS::CloudFront::Distribution: One or more of the CNAMEs you provided are already
associated with a different resource.
(Service: CloudFront, Status Code: 409, Request ID: …)
```

The new CDK stack tried to claim `borso.fr` as an alias on its CloudFront distribution. The pre-existing distribution `E80907R476ZAJ` (the legacy S3-website-origin setup, last deployed 2025-12-07) still listed `borso.fr` in its Aliases and CloudFront refused the request.

## Root-cause chain

1. **Why** did the deploy fail with `CNAME already associated`?
   CloudFront enforces a global, account-wide uniqueness on Aliases (CNAMEs): exactly one distribution can claim a given hostname at any time. The new distribution requested `borso.fr` while the old one still owned it; the API returned 409.

2. **Why** was the old distribution still claiming the alias?
   Nothing had explicitly released it. The migration plan implicitly assumed the new deploy would "take over" the alias — there is no take-over operation. The new distribution can only acquire the alias *after* the old distribution releases it.

3. **Why** wasn't this caught in conception?
   The CDK `StaticSite` construct creates a distribution + alias as a single unit and the spec walked happy-path "create new prod" only. The migration case (alias currently held by a *different* CloudFront resource) wasn't named in the spec or plan.

4. **Why** didn't the local `cdk diff` warn?
   `cdk diff` compares the proposed template against the current stack; it can't see resources owned by *other* CloudFormation stacks (or, in this case, a CloudFront distribution that was created manually outside CDK). The 409 only surfaces at AWS API call time.

5. **Why** is this the operator's first encounter with the constraint?
   This is the first feature where a CDK-managed apex distribution replaces a hand-managed one. Every prior deploy either created a fresh alias (no conflict) or updated an alias the same stack already owned.

**Root cause:** *thought* the new distribution would adopt the alias on `cdk deploy`; *actually* CloudFront's alias-uniqueness invariant means the alias must be released from the old distribution as a separate, prior operation, with a propagation wait between them.

## Detection failure causes

- **Typing:** N/A — runtime AWS API error.
- **Linter / static analysis:** N/A.
- **Functional validation locally:** `cdk synth` produces a valid template; `cdk diff` against the empty `borso-fr-prod` stack shows a clean creation. Neither inspects the live CloudFront state.
- **CI (tests / build):** `pnpm typecheck` / `pnpm exec biome lint` / `pnpm exec knip` all green; the constraint is at deploy time, not build time.
- **Code review:** Reviewer would have to remember the CNAME constraint and trace whether the apex was already claimed elsewhere — not in the diff.
- **PO / QA validation:** N/A.
- **Staging monitoring:** N/A — the new stack never reached `CREATE_COMPLETE`.
- **Operator-deploy:** the failure landed here. CFN rolled the stack back; the operator now had to manually release the alias before retrying.

## Countermeasure

Run the alias-release on the old distribution, wait for it to deploy, retry `pnpm deploy`. Concretely:

```bash
ETAG=$(aws cloudfront get-distribution-config --id E80907R476ZAJ --query 'ETag' --output text)
aws cloudfront get-distribution-config --id E80907R476ZAJ \
  --query 'DistributionConfig' > /tmp/old-config.json
jq '.Aliases = {Quantity: 0}' /tmp/old-config.json > /tmp/old-config-no-alias.json
aws cloudfront update-distribution \
  --id E80907R476ZAJ \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/old-config-no-alias.json
# Wait for Status=Deployed, then re-run pnpm deploy.
```

- **Code:** none for the recovery itself — it's an operator action against the AWS API.
- **Operator action:** above commands; takes 5–15 min for CloudFront to propagate.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-deploy preflight script)

**Reference:** PR (this kaizen) · commit `<kaizen-commit>`

**The actual fix:** add a preflight script run by `pnpm --filter @borso-app/<app> run deploy` *before* `cdk deploy`. The script:

1. Reads the desired aliases from the stack synth (`cdk synth --json` and grep `AWS::CloudFront::Distribution.Properties.DistributionConfig.Aliases.Items`).
2. Calls `aws cloudfront list-distributions` and finds any *other* distribution currently claiming any of those aliases.
3. If a conflict exists, prints the conflict + the exact `aws cloudfront update-distribution` commands to release the alias, and exits non-zero. The deploy never reaches CFN with the latent 409.

The check is also a knowledge entry under [`docs/knowledge/cloudfront-cname-uniqueness.md`](../knowledge/cloudfront-cname-uniqueness.md) for context the script can't fit in error output.

```bash
# scripts/preflight-cloudfront-aliases.sh (added in this kaizen PR)
# Reads cdk.out/<stack>.template.json after `cdk synth`, extracts every Aliases.Items
# entry, queries `aws cloudfront list-distributions`, and refuses to proceed if any
# alias is held by a distribution other than the one the stack will manage.
```

The pre-existing `apps/<app>/package.json` deploy script chains this preflight before `cdk deploy --all --require-approval never`.

**Sibling defects swept:** all four `StaticSite` consumers (`borso-fr`, `borsouvertures` migration if/when it happens, the previewable-app construct's preview distribution, the shared previews CDN) inherit the same preflight via the package-script chain.

## See also

- [`docs/knowledge/cloudfront-cname-uniqueness.md`](../knowledge/cloudfront-cname-uniqueness.md) — vendor rule + recovery runbook.
- [`docs/knowledge/cloudfront-resources-in-us-east-1.md`](../knowledge/cloudfront-resources-in-us-east-1.md) — sister CloudFront constraint that bites the same migration class.
- [`docs/dantotsus/dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — same defect shape (vendor ordering rule that surfaces only at deploy time).
