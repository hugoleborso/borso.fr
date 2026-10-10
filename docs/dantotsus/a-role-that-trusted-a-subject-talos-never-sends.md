---
date: 2026-10-05
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#128'
fix-pr: '#137'
fix-commits: [99b73ba1e4]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/oidc-subject.utils.ts, infra/shared/oidc-subject-prefixes.json]
time-to-detect: hours
tags: [github-actions, oidc, iam, cdk, talos]
zone: infra/shared/lib/deploy-roles.ts
recurs: [the-nightly-sweeper-never-had-permission-to-run]
---

# A role that trusted a subject talos never sends

## Symptom

The first deploy of `talos.borso.fr` from `hugoleborso/talos` stopped at the credentials step:

```
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

The job declared `environment: prod`, `TalosDeployRole` existed, and its ARN was right. The site could not ship.

## Root-cause chain

1. **Why was the token refused?** Its `sub` claim matched none of the claims `TalosDeployRole` trusts.
2. **What did the role trust?** `repo:hugoleborso/talos:environment:prod`, built by `githubActionsPrincipal` from `repo: 'hugoleborso/talos'`.
3. **What did talos send?** `repo:hugoleborso@44852104/talos@1401805496:environment:prod`. `gh api repos/hugoleborso/talos/actions/oidc/customization/sub` answers `use_immutable_subject: true`: talos uses GitHub's immutable subjects, which carry the owner and repository ids.
4. **Why did the role use the name form?** `GithubSubject` only took a `repo` string, and `subClaimFor` always wrote `repo:<owner>/<name>`. That was right for borso.fr, the only repository it had ever served, and PR #128 reused it for a second repository without asking what that repository's tokens look like.

**Root cause:** thought the `sub` prefix is fixed by the repository's name, actually it is a per-repository GitHub setting, and a repository on immutable subjects writes `owner@id/name@id`.

If #128 had known that, it would have read talos's setting and written the immutable form on the first try.

## Detection failure causes

- **Typing:** `GithubSubject` had no field for the format, so the question could not be asked.
- **CI (tests / build):** the shared-stack test asserted the claim the code built, `repo:hugoleborso/talos:environment:prod`. It checked the construct against itself, never against what GitHub emits.
- **Functional validation locally:** #128 synthesized a scratch talos workspace. Synth builds the trust policy; only a real token exercises it, and the role did not exist before `shared-deploy` ran.
- **Code review:** the claim looked identical to the three borso.fr claims beside it, which were correct for borso.fr.
- **Docs:** [`github-oidc-sub-claim-per-trigger.md`](../knowledge/github-oidc-sub-claim-per-trigger.md) described the claim as `repo:OWNER/REPO:…` with no mention of the setting.

## Countermeasure

- **Code:** `TalosDeployRole` trusts only `repo:hugoleborso@44852104/talos@1401805496:environment:prod`. The name form is dropped: talos never sends it, and the ids stop a renamed or recreated `hugoleborso/talos` from obtaining the role.
- **Operator action:** dispatch `shared-deploy` after merge, then rerun the talos deploy.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #137](https://github.com/hugoleborso/borso.fr/pull/137) · commit [`99b73ba1`](https://github.com/hugoleborso/borso.fr/commit/99b73ba1e40b5e2e537165a44490ff6c28f997f5)

**The actual fix:** `GithubSubject.subjectFormat` is required and has no default, so a role cannot be written without choosing the format.

```diff
 export interface GithubSubject {
   readonly repo: string;
+  readonly subjectFormat: SubjectFormat;
   readonly subjects: readonly SubjectKind[];
 }
+export type SubjectFormat =
+  | { readonly kind: 'name' }
+  | { readonly kind: 'immutable'; readonly ownerId: number; readonly repositoryId: number };
```

**Type:** DevX check (level 2)

**The actual fix:** choosing is not enough if the choice is a guess. `scripts/print-oidc-subject.sh <owner/repo> --record` reads the setting from GitHub, prints the `subjectFormat` to paste, and records the prefix in `infra/shared/oidc-subject-prefixes.json`. A shared-stack test fails on any trusted claim whose prefix is not recorded, with a message naming the script. Reverting talos to `{ kind: 'name' }` fails that test.

```diff
+    it('trusts only sub claims whose repository prefix was read from GitHub with scripts/print-oidc-subject.sh', () => {
+      const unrecorded = claims.filter(
+        (claim) => !prefixes.some((prefix) => claim.startsWith(`${prefix}:`)),
+      );
+      expect(unrecorded, 'Run scripts/print-oidc-subject.sh <owner/repo> --record …').toStrictEqual([]);
+    });
```

**Sibling defects swept:** `ProdDeployRole`, `PreviewDeployRole` and `SharedInfraDeployRole` trust `hugoleborso/borso.fr`, which the script confirms is on the name format (`use_immutable_subject: false`). They are unchanged.

## See also

- [`the-nightly-sweeper-never-had-permission-to-run.md`](./the-nightly-sweeper-never-had-permission-to-run.md): the same error, from the trigger half of the claim.
- [`consuming-borso-infra-from-another-repo.md`](../consuming-borso-infra-from-another-repo.md#the-subject-format-of-the-consumers-tokens)
