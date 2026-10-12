---
date: 2026-10-06
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: 128
fix-pr: 138
fix-commits: [bdca2bf859a50487316d1f2b20c49c3cae61c5a0]
eradication-level: 1
time-to-detect: hours
tags: [cdk, s3, talos]
---

# A bucket name someone else already owned

## Symptom

The first deploy of `talos.borso.fr` created `talos-cluster`, then stopped on the first resource of `talos-prod`:

```
CREATE_FAILED | AWS::S3::Bucket | App/Site/Bucket
The requested bucket name is not available. The bucket namespace is shared by all users of the system.
(Service: S3, Status Code: 409, HandlerErrorCode: AlreadyExists)
```

The stack rolled back and the site did not ship.

## Root-cause chain

1. **Why did the bucket fail?** S3 refused the name `talos-prod`.
2. **Where does that name come from?** `StaticSite` names the prod bucket with `bucketName()` in `infra/cdk/src/internal/naming.utils.ts`, which returns `<app>-<stage>`. No caller could change it.
3. **Why did a short name work for every earlier app?** `borso-fr-prod`, `pragma-prod` and the others happened to be free when they were created. Nothing checked that; it was luck of the slug.
4. **Why could nobody have checked before deploying?** S3 bucket names live in one namespace shared by every AWS account, and asking S3 does not settle it: an anonymous request for `talos-prod` answers `NoSuchBucket`, and creation still fails. A recently deleted or reserved name looks absent and is not available.

**Root cause:** thought a bucket named after the app and stage is ours to take, actually S3 names are global across all accounts and their availability cannot be read before creating one.

If the constructs had known that, `StaticSite` would have offered a name only this account can hold.

## Detection failure causes

- **Typing:** `StaticSiteProps` had no field for the bucket name, so the question could not be asked.
- **CI (tests / build):** synth tests check the template the construct builds. Availability of a name is a fact about other AWS accounts, which no synth can see.
- **Functional validation locally:** #128 synthesized a scratch talos workspace; the bucket name looked right because it was the name the convention produces.
- **Code review:** five apps already used `<app>-prod` without trouble, so the convention read as proven.

## Countermeasure

- **Code:** `StaticSite` takes `bucketNameSuffix: 'account'`, and `PreviewableApp` forwards `frontend.bucketNameSuffix`. The prod bucket is then `<app>-prod-<account id>`, built by `accountScopedBucketName()`, which checks the account id is 12 digits and the name fits S3's 63 characters. The stack must set `env.account`; synth fails otherwise. Without the option, every existing app synthesizes the same bytes as before.
- **Operator action:** none here. talos uses the option when it moves into this repository.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #138](https://github.com/hugoleborso/borso.fr/pull/138) · commit [`bdca2bf8`](https://github.com/hugoleborso/borso.fr/commit/bdca2bf859a50487316d1f2b20c49c3cae61c5a0)

**The actual fix:** a name that contains the account id cannot be held by another account.

```diff
+export function accountScopedBucketName(context: NameContext, accountId: string): string {
+  if (!AWS_ACCOUNT_ID_PATTERN.test(accountId)) { throw … }
+  const name = `${bucketName(context)}-${accountId}`;
+  if (name.length > S3_BUCKET_NAME_MAX_LENGTH) { throw … }
+  return name;
+}
```

**Type:** DevX check (level 2)

**The actual fix:** the option alone is opt-in, so the next app could forget it. `scripts/check-app-registration.sh`, run in pre-commit and CI, fails an app whose `bin/` or `cdk/` builds a `StaticSite` or `PreviewableApp` without `bucketNameSuffix: 'account'`. The five apps that already own their short name are listed by slug, because renaming their bucket would replace it.

```diff
+  case "$slug" in
+    borso-fr | borsouvertures | last-loop-lepin | pragma | banana-rush) ;;
+    *)
+      if grep -rlqE '\b(StaticSite|PreviewableApp)\b' … &&
+        ! grep -rqE "bucketNameSuffix: 'account'" …; then
+        echo "[check-app-registration] $slug deploys a prod bucket named $slug-prod, …" >&2
```

**Sibling defects swept:** `PhotosCdn` and the pragma uploads bucket also pin names (`last-loop-lepin-prod-photos`, `pragma-prod-uploads`). Both exist, so they are not at risk; a new app adding such a bucket hits the same namespace, and the check above does not see it.

## See also

- [`consuming-borso-infra-from-another-repo.md`](../consuming-borso-infra-from-another-repo.md#bucket-names-are-global)
- [`adding-an-app.md`](../adding-an-app.md#pick-a-slug)
- [`cdk-retain-buckets-orphan-on-failed-create.md`](../knowledge/cdk-retain-buckets-orphan-on-failed-create.md)
