---
date: 2026-05-03
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: '#6'
fix-commits: [88b1178cf6]
eradication-level: 5
eradication-paths: [docs/knowledge/cloudfront-cname-uniqueness.md]
time-to-detect: minutes
tags: [cdk, cloudfront, route53, deploy]
zone: .github/workflows/deploy.yml
---

# The new borso.fr stack could not take its own domain from the old distribution

## User impact

The first CDK prod deploy of borso.fr failed, and the stack rolled back.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm --filter @borso-app/borso-fr run deploy` | `AWS::CloudFront::Distribution: One or more of the CNAMEs you provided are already associated with a different resource. (Service: CloudFront, Status Code: 409)` at `SiteDistribution390DED28` | The new stack serves `borso.fr`. |

The hand-made distribution `E80907R476ZAJ`, last deployed 2025-12-07, kept serving the site.

## Causal chain

- The deploy failed with a 409 on the new distribution, and CloudFormation rolled the stack back.
  - The new distribution asked for the alias `borso.fr`:

    ```ts
    domainNames: [props.domainName], // ← claims borso.fr
    ```

    - CloudFront lets one distribution hold an alias at a time, and `E80907R476ZAJ` still listed `borso.fr` in its aliases.
      - The deploy ran without releasing the alias from the old distribution first.
        - The migration was run as a plain "create new prod" deploy. Its input, the plan, covered only creating a new prod, not taking a domain over from a hand-made distribution (inferred from this entry's first version). That migration happens once per hand-made site.

## Root cause of occurrence

*Thought the new distribution would adopt the alias at `cdk deploy`, actually CloudFront has no take-over: the old distribution must release the alias first, and the change must finish deploying before the new one can claim it.* (Man)

`docs/knowledge/cloudfront-cname-uniqueness.md` records the rule: "A CloudFront alias belongs to one distribution at a time; release it from the old one before the new one can claim it."

## Detection failure causes

- **Typing and linter:** the alias is a valid string. The constraint lives in the live account.
- **Local synth and diff:** they compare with the target stack, which did not exist yet. They cannot see a distribution created by hand outside CloudFormation.
- **CI:** typecheck, lint and knip read the code, not the account.
- **Review:** the diff shows a new distribution with an alias. Who holds that alias today is not in it.

## Countermeasure

The operator removed the alias from `E80907R476ZAJ` with `aws cloudfront update-distribution` and an empty `Aliases`, waited for `Status=Deployed`, and re-ran the deploy. A later one-shot script (commit `9109730`, since deleted as its message asked) automated the same takeover for the remaining hand-made sites.

## Eradication

**Type:** knowledge (level 5)

**Reference:** `docs/knowledge/cloudfront-cname-uniqueness.md`, triggered on the output `One or more of the CNAMEs you provided are already associated with a different resource` and `CNAMEAlreadyExists`.

Commit `88b1178` also added `scripts/preflight-cloudfront-aliases.sh`, chained before `cdk deploy` in seven `apps/*/package.json` deploy scripts. It checks nothing. It reads `.Properties.DistributionConfig.Aliases.Items`, the shape of the CloudFront API. A CloudFormation template carries `Aliases` as a plain list, as `infra/cdk/test/unit/static-site.test.ts` asserts (`Aliases: ['borso.fr']`). jq fails on `.Items` of a list, `2>/dev/null || true` swallows the error, and the script exits 0. Measured this session: given a template with `"Aliases":["borso.fr"]` and a fake `aws` that reports another distribution holding `borso.fr`, it printed `no Aliases declared in synth — nothing to check.` and exited 0. Had it read the right shape, it would have refused every redeploy, because it counts the stack's own distribution as a conflict. The migration script's commit message already noted that it "can't tell self-ownership from cross-distribution conflict".

**Proposed:** subtract the preflight. Remove `../../scripts/preflight-cloudfront-aliases.sh cdk.out &&` from the seven deploy scripts and delete the script. It never ran a check, and the case it targets, a takeover from a hand-made distribution, is done for every site. That removes a call that runs on every deploy for a migration that will not recur, and its seven copies. The triggered knowledge entry stays, so the next 409 brings the runbook to whoever sees it.

**Proof it can fail:** the preflight's failure to fail is measured above. The knowledge entry fires on the 409 text, by its `triggers.output`.

**Similar instances:** `grep -l "preflight-cloudfront-aliases" apps/*/package.json` lists the seven deploy scripts that call it.
