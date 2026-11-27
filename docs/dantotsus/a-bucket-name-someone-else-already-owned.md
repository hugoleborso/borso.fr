---
date: 2026-10-06
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#128'
fix-commits: [bdca2bf859]
eradication-level: 2
eradication-paths: [infra/cdk/src/internal/naming.utils.ts, scripts/check-app-registration.sh]
time-to-detect: hours
tags: [cdk, s3, talos]
zone: infra/cdk/src/constructs/static-site.ts
---

# A bucket name someone else already owned

## User impact

The first deploy of `talos.borso.fr` created `talos-cluster`, then stopped on the first resource of `talos-prod`. The stack rolled back and the site did not ship. Other apps were not affected.

| | Seen | Expected |
| --- | --- | --- |
| First prod deploy of talos | `CREATE_FAILED` on the S3 bucket, stack rolled back, no site | The prod stack creates its bucket and the site is live |

<details><summary>The deploy log</summary>

```
CREATE_FAILED | AWS::S3::Bucket | App/Site/Bucket
The requested bucket name is not available. The bucket namespace is shared by all users of the system.
(Service: S3, Status Code: 409, HandlerErrorCode: AlreadyExists)
```

</details>

## Causal chain

- The talos prod stack rolled back on its first deploy.
  - S3 refused to create a bucket named `talos-prod`, because another AWS account already held it.
    - `StaticSite` named the prod bucket with `bucketName()`, which returned `<app>-<stage>` and took no option.

      ```ts
      // infra/cdk/src/internal/naming.utils.ts, before bdca2bf859
      export function bucketName(context: NameContext): string {
        const stagePart = context.stage === 'prod' ? 'prod' : previewSuffix(context.prNumber);
        const integPrefix = context.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
        return `${integPrefix}${context.app}-${stagePart}`; // ❌ a global name built from a slug anyone can pick
      }
      ```

      - Commit `1aa979e74` (2026-05-01, written by an agent) ported the constructs "verbatim from upstream" `hugoleborso/borso-platform`. `bucketName` came with them (measured with `git log -S'function bucketName'`).
        - Upstream had only ever deployed slugs whose `<app>-prod` name was free. The port's input carried the convention and no record that the names were global. (Material)

## Root cause of occurrence

*Thought a bucket named after the app and the stage is ours to take, actually S3 bucket names are global across all AWS accounts, and their availability cannot be read before creating one.*

Material. The agent that wrote `1aa979e74` was told to port the upstream constructs verbatim. The upstream code was its spec, and that code treated `<app>-<stage>` as proven because five slugs had worked. Nothing in the input said the namespace was shared.

The S3 error itself states the fact: "The bucket namespace is shared by all users of the system." Asking S3 first does not help. An anonymous request for `talos-prod` answered `NoSuchBucket`, and creation still failed (recorded by the first version of this entry on 2026-10-06, not replayed since).

## Detection failure causes

- **Typing:** `StaticSiteProps` had no field for the bucket name, so the choice was never visible to a caller.
- **CI (synth tests):** synth tests check the template the construct builds. Whether another account holds a name is a fact no synth can see.
- **Local validation:** PR #128 synthesized a scratch talos workspace. The name looked right because it was the name the convention produces.
- **Code review:** five apps already used `<app>-prod` without trouble, so the convention read as proven.

## Countermeasure

`StaticSite` takes `bucketNameSuffix: 'account'`, and `PreviewableApp` forwards `frontend.bucketNameSuffix`. The prod bucket is then `<app>-prod-<account id>`, built by `accountScopedBucketName()`. It checks the account id is 12 digits and the name fits S3's 63 characters. The stack must set `env.account`, or synth fails. Without the option, every existing app synthesizes the same bytes as before. talos passes the option in `apps/talos/cdk/lib/stack.ts`.

## Eradication

**Type:** DevX check (level 2), on top of an opt-in structural fix.

**Reference:** commit [`bdca2bf8`](https://github.com/hugoleborso/borso.fr/commit/bdca2bf859a50487316d1f2b20c49c3cae61c5a0).

A name that contains the account id cannot be held by another account.

```diff
+export function accountScopedBucketName(context: NameContext, accountId: string): string {
+  if (!AWS_ACCOUNT_ID_PATTERN.test(accountId)) { throw … }
+  const name = `${bucketName(context)}-${accountId}`;
+  if (name.length > S3_BUCKET_NAME_MAX_LENGTH) { throw … }
+  return name;
+}
```

The option is opt-in, so `scripts/check-app-registration.sh`, run in pre-commit and CI, fails an app whose `bin/` or `cdk/` builds a `StaticSite` or `PreviewableApp` without `bucketNameSuffix: 'account'`. The five apps that already own their short name are listed by slug, because renaming their bucket would replace it. `apps/skull-king/cdk/lib/stack.ts`, added after the check, passes the option (measured with `grep -rn bucketNameSuffix apps`).

The level is 2, not 1. The default still produces a global name, and the check holds it with a slug list kept by hand.

**Proposed:** make the account suffix the default. Give `BucketNameSuffix` in `infra/cdk/src/internal/naming.utils.ts` a `'none'` value, and have the five legacy stacks pass it explicitly. Then delete the slug list and the grep in `scripts/check-app-registration.sh`. A new app could no longer get a global name by leaving out an option.

**Proof it can fail:** inferred, not replayed this session. An app outside the slug list that builds a `StaticSite` without the option makes the check print `deploys a prod bucket named <slug>-prod` and exit non-zero.

**Similar instances:** `grep -rn "bucketName:" apps/*/cdk infra/cdk/src --include=*.ts` finds two other pinned names, `last-loop-lepin-<stage>-photos` and pragma's `nameUploadsBucket`. Both buckets exist, so they are not at risk. A new app adding such a bucket hits the same namespace, and neither the check nor the proposal covers it. See [`consuming-borso-infra-from-another-repo.md`](../consuming-borso-infra-from-another-repo.md#bucket-names-are-global) and [`adding-an-app.md`](../adding-an-app.md#pick-a-slug).
