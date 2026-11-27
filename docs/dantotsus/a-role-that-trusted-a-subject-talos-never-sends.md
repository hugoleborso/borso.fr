---
date: 2026-10-05
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#128'
fix-commits: [99b73ba1e4]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/oidc-subject.utils.ts, infra/shared/oidc-subject-prefixes.json]
time-to-detect: hours
tags: [github-actions, oidc, iam, cdk, talos]
zone: infra/shared/lib/deploy-roles.ts
recurs: [the-nightly-sweeper-never-had-permission-to-run]
---

# A role that trusted a subject talos never sends

## User impact

The first deploy of `talos.borso.fr` from `hugoleborso/talos` stopped at the credentials step:

```
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

The job declared `environment: prod`, `TalosDeployRole` existed, and its ARN was right. The site could not ship.

| | Seen | Expected |
| --- | --- | --- |
| First talos deploy | `Not authorized to perform sts:AssumeRoleWithWebIdentity` | the role assumed and the site deployed |

## Causal chain

- The talos deploy could not assume `TalosDeployRole`.
  - STS refused the token, because its `sub` claim matched none of the claims the role trusts.
    - The role trusted `repo:hugoleborso/talos:environment:prod`. talos sent
      `repo:hugoleborso@44852104/talos@1401805496:environment:prod`.
      `gh api repos/hugoleborso/talos/actions/oidc/customization/sub` answers
      `use_immutable_subject: true`.
      - `githubActionsPrincipal` built the name form, because `subClaimFor`
        always wrote `repo:<owner>/<name>` and `GithubSubject` took only a
        `repo` string.
        - PR #128 reused that construct for a second repository. It had served
          only borso.fr, which is on the name form.

## Root cause of occurrence

*Thought the `sub` prefix is fixed by the repository's name, actually it is a
per-repository GitHub setting, and a repository on immutable subjects writes
`owner@id/name@id`.* **Machine.** `GithubSubject` had no field for the format,
so the construct could not ask the question. The knowledge entry
[`github-oidc-sub-claim-per-trigger.md`](../knowledge/github-oidc-sub-claim-per-trigger.md)
described the claim as `repo:OWNER/REPO:…` with no mention of the setting.

Had #128 known that, it would have read talos's setting and written the
immutable form on the first try.

## Detection failure causes

- **Typing:** `GithubSubject` had no field for the format, so the question could not be asked.
- **CI (tests / build):** the shared-stack test asserted the claim the code built, `repo:hugoleborso/talos:environment:prod`. It checked the construct against itself, never against what GitHub emits.
- **Functional validation locally:** #128 synthesized a scratch talos workspace. Synth builds the trust policy; only a real token exercises it, and the role did not exist before `shared-deploy` ran.
- **Code review:** the claim looked identical to the three borso.fr claims beside it, which were correct for borso.fr.
- **Docs:** the knowledge entry on the claim did not mention the setting.

## Countermeasure

- **Code:** `TalosDeployRole` trusts only `repo:hugoleborso@44852104/talos@1401805496:environment:prod`. The name form is dropped: talos never sends it, and the ids stop a renamed or recreated `hugoleborso/talos` from obtaining the role.
- **Operator action:** dispatch `shared-deploy` after merge, then rerun the talos deploy.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** [PR #137](https://github.com/hugoleborso/borso.fr/pull/137) · commit [`99b73ba1`](https://github.com/hugoleborso/borso.fr/commit/99b73ba1e40b5e2e537165a44490ff6c28f997f5)

`GithubSubject.subjectFormat` is required and has no default, so a role cannot be written without choosing the format.

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

Choosing is not enough if the choice is a guess. `scripts/print-oidc-subject.sh <owner/repo> --record` reads the setting from GitHub, prints the `subjectFormat` to paste, and records the prefix in `infra/shared/oidc-subject-prefixes.json`. A shared-stack test fails on any trusted claim whose prefix is not recorded, with a message naming the script. Reverting talos to `{ kind: 'name' }` fails that test.

```diff
+    it('trusts only sub claims whose repository prefix was read from GitHub with scripts/print-oidc-subject.sh', () => {
+      const unrecorded = claims.filter(
+        (claim) => !prefixes.some((prefix) => claim.startsWith(`${prefix}:`)),
+      );
+      expect(unrecorded, 'Run scripts/print-oidc-subject.sh <owner/repo> --record …').toStrictEqual([]);
+    });
```

**Similar instances:** `ProdDeployRole`, `PreviewDeployRole` and `SharedInfraDeployRole` trust `hugoleborso/borso.fr`, which the script confirms is on the name format (`use_immutable_subject: false`). They are unchanged.

The same error from the trigger half of the claim is
[`the-nightly-sweeper-never-had-permission-to-run`](./the-nightly-sweeper-never-had-permission-to-run.md).
A consumer repository reads its format as
[`consuming-borso-infra-from-another-repo.md`](../consuming-borso-infra-from-another-repo.md#the-subject-format-of-the-consumers-tokens)
says.
