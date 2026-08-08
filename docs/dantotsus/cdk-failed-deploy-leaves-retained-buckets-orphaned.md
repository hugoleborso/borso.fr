---
date: 2026-05-04
revised: 2026-05-11
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: 6
fix-pr: this PR (branch `claude/stale-previews-budget-forecast-j3sPS`)
fix-commits: [a1bcefe3856143b12eb0ae4ad494073fba0f3a59]
prior-fix-pr: 7
prior-fix-commits: [knowledge-floor only — see Revision history]
eradication-level: 1
prior-eradication-level: 5
time-to-detect: minutes
tags: [cdk, s3, cloudformation, deploy]
---

> ### Revised 2026-05-11 — eradication upgraded rung 5 → rung 1
>
> The original entry (2026-05-04) shipped a **rung-5 knowledge entry**
> ([`docs/knowledge/cdk-retain-buckets-orphan-on-failed-create.md`](../knowledge/cdk-retain-buckets-orphan-on-failed-create.md))
> after rolling back a heavier-handed preflight gate. The reasoning at
> the time: "rare failure mode, three-command manual recovery,
> preflight is overkill."
>
> Re-examined on 2026-05-11 during the stale-previews + budget-forecast
> investigation, the framing was wrong. Static-site buckets hold only
> rebuildable build output from `dist/` — there is no user data to
> protect, so the entire "RETAIN protects user data" reflex doesn't
> apply. The defect class is now **structurally impossible**
> (commit [`a1bcefe`](../../commit/a1bcefe3856143b12eb0ae4ad494073fba0f3a59)):
> `StaticSite` builds prod buckets with `RemovalPolicy.DESTROY` +
> `autoDeleteObjects: true`, and an eradication-check test refuses to
> let `RemovalPolicy.RETAIN` reappear in the construct file. Failed
> first deploys now roll back cleanly; intentional destroys actually
> destroy.
>
> The original Eradication section is preserved at the bottom under
> *Prior eradication* for the audit trail. The knowledge entry is
> kept as historical context with a banner pointing here.

# A failed first deploy leaves the retained S3 bucket as an orphan; retries 409 on bucket-name reuse

## Symptom

After fixing the CloudFront CNAME conflict from
[`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md)
and re-running the deploy from CI, the new failure was:

```
└─ borso-fr-prod
   └─ Site
       └─ Bucket
           └─ Resource (AWS::S3::Bucket SiteBucket978D4AEB)
               🛑 Resource of type 'AWS::S3::Bucket' with identifier
                  'borso-fr-prod' already exists.
                  (at /Resources/SiteBucket978D4AEB)
```

The bucket `borso-fr-prod` existed in S3, was empty, was not part of any
CloudFormation stack, and the new stack's `CREATE_IN_PROGRESS` couldn't claim
the name.

## Root-cause chain

1. **Why** did `borso-fr-prod` already exist when the second deploy ran?
   Because the first deploy attempt got far enough to create the bucket
   before failing at a later step (the CloudFront alias 409). When CFN rolled
   the stack back, it left the bucket behind.

2. **Why** did CFN leave the bucket behind?
   The CDK `StaticSite` construct created the bucket with
   `RemovalPolicy.RETAIN` (so a successful deploy followed by a stack delete
   doesn't drop user data) and CFN treats `RetainOnRollback` as the default
   for retained resources during a failed-create rollback. The bucket is
   considered "potentially still owned by something else" so CFN refuses to
   delete it on rollback.

3. **Why** doesn't the second deploy import / reuse the existing bucket?
   CDK doesn't try to. From CFN's view the new stack has no prior knowledge
   of the bucket — the first stack rolled back, the bucket isn't in any stack's
   resource set, and CFN's `CreateStack` issues a literal `CreateBucket` API
   call which fails with `BucketAlreadyOwnedByYou`.

4. **Why was `RETAIN` even on this bucket?**
   Reflex from the canonical CDK pattern: "data buckets should be RETAIN so
   accidental `cdk destroy` doesn't drop user data." But the static-site
   bucket has no user data — every byte is the output of `pnpm build`,
   committed elsewhere. The reflex was applied without checking whether the
   premise (irrecoverable data) held.

5. **Why** is this not a one-off?
   Any first deploy that crashes after `CreateBucket` succeeded but before
   the rest of the stack landed reproduces this. The alias-conflict was
   *one* such failure; the next will be something else (cert-issued-too-late,
   IAM-permission-eventual-consistency, BucketDeployment Lambda timeout, …).
   `borsouvertures-prod`'s first deploy (PR #8) is the next candidate.

**Root cause:** *thought* "buckets should always be RETAIN — that's the
safe default"; *actually* "RETAIN is only safe when the bucket holds
irrecoverable data. A static-site bucket holds only `dist/` output and
is fully rebuildable, so RETAIN buys no protection while introducing
the failed-create orphan and the destroy-doesn't-destroy surprise."

Validate: if the developer had known the data in the bucket is fully
rebuildable from a single `pnpm build`, they would have picked
`DESTROY` + `autoDeleteObjects: true` and the orphan path would never
have existed.

## Detection failure causes

- **Typing / linter / CI:** N/A — runtime AWS API error.
- **Local synth (`cdk diff`, `cdk synth`):** these compare the proposed
  template against the *target stack*'s existing template. They cannot see
  resources that exist in the account but are *not* part of the target stack.
- **CI:** the deploy job ran, `CreateStack` returned the 409 mid-flight, the
  stack rolled back. The CI doesn't have a step between `cdk synth` and
  `cdk deploy` that probes the account for orphans.
- **Code review:** the reviewer would have to question the RETAIN reflex
  itself — i.e. recognise that *this particular bucket* holds no
  irrecoverable data. Without that observation the RETAIN looks like
  textbook safety, not a footgun.

## Countermeasure

Delete the orphan bucket and re-run the deploy. (Same as before — this
recovers the prior failed state. The eradication below prevents the
state from ever existing again.)

```bash
aws s3 ls s3://borso-fr-prod/                       # expect empty
aws s3api list-object-versions --bucket borso-fr-prod  # expect no versions
aws s3 rb s3://borso-fr-prod                        # delete
# Re-run CI deploy.
```

## Eradication (mandatory — code-level)

**Type:** code diff + synth-time guard (level 1 — structural impossibility)

**Reference:** commit
[`a1bcefe`](../../commit/a1bcefe3856143b12eb0ae4ad494073fba0f3a59)

**The actual fix** — `infra/cdk/src/constructs/static-site.ts`:

```diff
     const bucket = new Bucket(this, 'Bucket', {
       bucketName: bucketName(props),
       encryption: BucketEncryption.S3_MANAGED,
       blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
       enforceSSL: true,
       versioned: false,
-      removalPolicy: RemovalPolicy.RETAIN,
+      // Static-site buckets hold only build artefacts from dist/ — no
+      // user-generated content, fully rebuildable from source. The usual
+      // "RETAIN buckets to protect user data" reflex buys no protection
+      // here, and the combination of pinned bucketName + RETAIN caused
+      // the failed-first-deploy orphan trap (see dantotsu
+      // cdk-failed-deploy-leaves-retained-buckets-orphaned). DESTROY +
+      // autoDeleteObjects: failed creates roll back cleanly, intentional
+      // destroys actually destroy.
+      removalPolicy: RemovalPolicy.DESTROY,
+      autoDeleteObjects: true,
     });
```

Backstopped by a guard in `infra/cdk/test/unit/eradication-checks.test.ts`:

```ts
describe('eradication: no RemovalPolicy.RETAIN on static-site buckets', () => {
  const sourcePath = path.join(CONSTRUCTS_DIR, 'static-site.ts');
  const stripped = readStripped(sourcePath);

  it('does not reference RemovalPolicy.RETAIN', () => {
    expect(stripped).not.toMatch(/RemovalPolicy\.RETAIN/);
  });
});
```

And two synth-time assertions in `infra/cdk/test/unit/static-site.test.ts`
(prod scope): the bucket's `DeletionPolicy` is `Delete` and a
`Custom::S3AutoDeleteObjects` resource is provisioned.

**Why level 1 (structural impossibility):**

| Outcome | Old (RETAIN) | New (DESTROY + autoDeleteObjects) |
| --- | --- | --- |
| Failed first deploy post-CreateBucket | orphan; next deploy 409s | bucket rolled back cleanly; next deploy proceeds |
| Operator runs `cdk destroy --all` on prod | bucket survives; operator surprised | bucket gone, contents gone (rebuildable) |
| Accidental `cdk destroy` on prod | bucket survives (safety net) | bucket gone — but contents are rebuildable from `pnpm build` |
| Bucket name re-creation collision | possible (orphan blocks) | impossible (rollback wipes the bucket) |

The trade is "lose the rebuildable bucket on accidental destroy" against
"never hit the orphan trap, and destroy means destroy." For static-site
buckets that holds only `dist/`, the trade is favourable.

**Sibling defects swept:** the only other `RemovalPolicy.RETAIN` on a
literal-named bucket in this repo was the one being fixed. The shared
previews bucket (`borso-previews`, in `infra/shared/`) and the DSQL
cluster (no bucket) are unaffected. A future construct re-introducing
RETAIN in `static-site.ts` is blocked by the eradication-check test;
re-introducing it elsewhere would be a different design call (e.g. a
user-data bucket where RETAIN is genuinely the right choice).

## See also

- [`docs/knowledge/cdk-retain-buckets-orphan-on-failed-create.md`](../knowledge/cdk-retain-buckets-orphan-on-failed-create.md) —
  the prior knowledge entry. Now carries a banner pointing back here;
  kept for the audit trail of the original level-5 stance.
- [`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md) —
  same migration-cutover defect family at the CloudFront layer.
- [`docs/dantotsus/cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md) —
  surfaced this dantotsu's revision while investigating why merged-PR
  stacks weren't being destroyed; the chat established that "destroy"
  ought to mean "destroy" everywhere static-site buckets are concerned.

---

## Prior eradication (rolled back 2026-05-11, kept for audit)

> **The text below was the original Eradication section as of 2026-05-04.
> It shipped a knowledge-only stance. The 2026-05-11 revision above
> supersedes it.**

**Type:** Knowledge entry (level 5 — floor)

**Reference:** PR #7 · [`docs/knowledge/cdk-retain-buckets-orphan-on-failed-create.md`](../knowledge/cdk-retain-buckets-orphan-on-failed-create.md)

**Decision (at the time):** an earlier draft shipped a
`scripts/preflight-orphan-buckets.sh` (level 2 DevX check) that scanned
`cdk.out` for pinned `BucketName`s and head-checked each one against S3
+ CFN before allowing `cdk deploy` to proceed. PR #7 review concluded
the gate was heavy-handed for a rare failure mode with a three-command
manual recovery, and rolled it back in favour of the knowledge entry.

**Why the rationale was wrong:** the decision treated the bucket as a
generic "data bucket" where RETAIN is the safe default. Static-site
buckets are not data buckets — they're caches of `dist/` — so the
"safe default" was actually buying nothing while shipping the failed-
create orphan. The right rung was 1, not 5. The 2026-05-11 fix swaps
the policy at source and adds an eradication-check guard, removing the
need for a preflight script *and* eliminating the failure mode itself.
