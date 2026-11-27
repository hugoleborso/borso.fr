---
date: 2026-08-10
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#26'
fix-commits: [2c7e27affa]
eradication-level: 5
eradication-paths: [infra/cdk/src/internal/oidc.ts, infra/shared/lib/deploy-roles.ts, docs/knowledge/github-oidc-sub-claim-per-trigger.md]
time-to-detect: days
tags: [github-actions, oidc, iam, cdk, ci, cleanup]
zone: infra/shared/lib/deploy-roles.ts
---

# The nightly sweeper never had permission to run

## User impact

`cleanup-orphans` had failed on its schedule every night for at least five
consecutive nights, 2026-08-06 through 2026-08-10, always the same way:

```
Assuming role with OIDC
  … twelve attempts, backing off …
##[error]Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

| | Seen | Expected |
| --- | --- | --- |
| Nightly `schedule` run | red, every night | green: lists preview stacks and destroys those whose pull request closed |
| `workflow_dispatch`, the manual sweep | never succeeded | the same sweep on demand |
| `pull_request` close run | green throughout | green |

The workflow's header says what the nightly run is for: "catches stacks
orphaned by edge cases that skipped both preview.yml teardown and the close
trigger." That safety net had never fired.

## Causal chain

- The scheduled run could not assume `PreviewDeployRole`.
  - Its OIDC token's `sub` claim did not match the role's trust policy.
    - The policy trusted exactly one claim,
      `repo:hugoleborso/borso.fr:pull_request`:

      ```ts
      subject: { kind: 'pull_request' },
      ```

      - GitHub derives the `sub` claim from the event. A `pull_request` run
        presents `repo:<repo>:pull_request`. A `schedule` or `workflow_dispatch`
        run on `main` presents `repo:<repo>:ref:refs/heads/main`.
        - Commit `56258c2b0` (2026-05-02) created `cleanup-orphans.yml` with
          three triggers, `schedule`, `pull_request: closed` and
          `workflow_dispatch`, on `vars.PREVIEW_DEPLOY_ROLE_ARN`. The same
          session had written the role's single subject the day before
          (`68af89935`, then `c3206a532`), under the comment
          "PreviewDeployRole — trusts repo:…:pull_request".

## Root cause of occurrence

*Thought the OIDC `sub` claim identifies the repository and the workflow,
actually it identifies the repository and the event, so adding a trigger to a
workflow changes the credential it presents.*

**M: Man.** The writer was an agent. The answer was in the codebase it had just
ported the day before: `githubSubClaim` in `infra/cdk/src/internal/oidc.ts`
already mapped a `branch` kind to `repo:${repo}:ref:refs/heads/${branch}`, apart
from `pull_request`, and the role's comment named the one claim it trusted. Whether those files were loaded when the
workflow was written is not recoverable (inferred). The prior that a workflow
has one identity won. Per the agentic 4M, the fix is a gate, not a document.
The claim table now lives in
[`github-oidc-sub-claim-per-trigger.md`](../knowledge/github-oidc-sub-claim-per-trigger.md).

## Detection failure causes

- **Typing:** the trust policy's shape carried no relationship to the
  workflows that assume it. `SubjectKind` could express the right answer and
  nothing asked for it.
- **actionlint:** it validates workflow syntax. The mismatch is between a
  workflow's `on:` block and an IAM policy in another workspace.
- **CI:** no CI job assumes `PreviewDeployRole` on a `main` ref, so no pull
  request could have surfaced it.
- **Local:** OIDC federation cannot be exercised off a runner.
- **Review:** the reviewer would have had to hold three files at once, the
  workflow's triggers, the role's subject and GitHub's claim rules.
- **Monitoring:** five scheduled failures produced no signal anyone acted on.
  A scheduled workflow is the one kind whose failure nobody waits for. It
  surfaced only because a post-merge sweep listed workflow runs for another
  reason.

## Countermeasure

Commit `2c7e27a`: `githubActionsPrincipal` takes a list of subjects, and
`PreviewDeployRole` names both the pull-request claim and the default-branch
claim. `shared-deploy`
[run 8](https://github.com/hugoleborso/borso.fr/actions/runs/31406952157)
deployed it on 2026-08-10 at 16:05 UTC.

The next scheduled run,
[31459042008](https://github.com/hugoleborso/borso.fr/actions/runs/31459042008)
on 2026-08-11 at 04:37 UTC, is the first green `schedule` run in this
workflow's history. It enumerated every stack and kept all 16, each belonging
to an open pull request. It destroyed nothing, which is correct: the close
handler had already torn down the stacks of the pull requests closed the day
before.

Property this widens: `PreviewDeployRole` is now assumable from any workflow
running on a `main` ref, not only from pull requests. It is the narrowest
widening that lets a scheduled sweep authenticate, and the role's
PowerUserAccess is unchanged, still scoped to `*-pr-*` roles.

## Eradication

**Type:** knowledge (level 5) for the class. The `subjects` list is structural
(level 1) for the plurality only. What holds against a mismatched trigger is
[`github-oidc-sub-claim-per-trigger.md`](../knowledge/github-oidc-sub-claim-per-trigger.md),
whose `triggers:` fire on a write under `.github/workflows/*.yml` or
`infra/shared/lib/**` and on the `Not authorized to perform
sts:AssumeRoleWithWebIdentity` output.

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commit [`2c7e27a`](https://github.com/hugoleborso/borso.fr/commit/2c7e27a)

```diff
 export interface GithubSubject {
   readonly repo: string;
-  readonly subject: SubjectKind;
+  /** Every sub claim this role accepts — one per trigger that assumes it. */
+  readonly subjects: readonly SubjectKind[];
 }
```

`infra/shared/lib/deploy-roles.ts` names both claims for the preview role:

```ts
subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: DEFAULT_BRANCH }],
```

**Proof it can fail:** a synth-time throw refuses an empty list, which used to
produce a role no workflow could assume.

The type asks the next author which triggers a role trusts. It does not make
the mismatch impossible: a `schedule:` trigger added to a workflow whose role
lists only `pull_request` still fails only at its first nightly run. This is
not eradicated.

**Proposed:** add a test in `infra/shared` that reads each workflow under
`.github/workflows/`, takes its `on:` triggers, its `environment:` and its
`role-to-assume`, derives the `sub` claim each trigger presents, and fails when
the matching role's `subjects` do not cover it. The mapping it needs already
exists in the variable names: the workflows use only
`PREVIEW_DEPLOY_ROLE_ARN`, `PROD_DEPLOY_ROLE_ARN` and `SHARED_DEPLOY_ROLE_ARN`,
one per role in `deploy-roles.ts` (measured, `grep -rhoE "vars\.[A-Z_]*ROLE_ARN" .github/workflows | sort -u`).
A trigger on the wrong role would then fail before deploy (level 2). Whether a
YAML parser is installed for `infra/shared` is unknown; a new one is an ADR.

**Similar instances:** `grep -n "role-to-assume" .github/workflows/*.yml` lists
nine uses. `ProdDeployRole` and `SharedInfraDeployRole` are assumed through
GitHub environments, so their claim does not depend on the trigger. The other
preview-role workflows run on `pull_request` or a dispatch from `main`, both
covered today.
