---
date: 2026-05-02
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commits: [2a4aef4]
eradication-rung: 4
time-to-detect: minutes (next CI deploy after manual upload)
tags: [cdk, s3, bucketdeployment]
---

# `BucketDeployment.prune` defaults to true and wipes out-of-band uploads

## Symptom

We `aws s3 cp`'d a `lucie/` folder of personal images to the
previews bucket so they would be served alongside the deployed
preview. Worked fine — until the next CI deploy, after which they
were gone. Re-uploaded; same outcome on the next deploy.

User impact: silent data loss. The operator could spend ages
debugging "why does the URL 404 today when it worked yesterday".

## Root-cause chain

1. **Why?** Manually-uploaded objects vanished after the next deploy.
   Because `BucketDeployment` ran a sync that deleted them.
2. **Why does it delete files it didn't put there?**
   `BucketDeployment` syncs a source directory to a destination
   bucket; on each invocation it diffs and removes anything in the
   bucket that's not in the source.
3. **Why is "remove orphans" the default?**
   `BucketDeployment.prune` defaults to `true`. CDK's stated intent
   is "the deployed assets should be the bucket's exact content";
   pruning enforces that.
4. **Why didn't this hit the previews bucket the first time we
   deployed it?**
   It would have — but the first preview deploy populated an empty
   bucket. The collision only shows up when there's pre-existing
   content the source doesn't know about.
5. **Why did we expect manual uploads to survive?**
   Mental model: "this bucket holds whatever I put in it". CDK's
   model: "this bucket mirrors `dist/` exactly".

**Root cause:** we thought `BucketDeployment` was additive (it
uploads its source). It's actually a sync (it makes the bucket equal
its source), with `prune: true` as the default that enforces the
sync semantics.

## Detection failure causes

- **Typing:** `prune?: boolean` defaults to `true` silently.
- **Linter:** no rule against not setting `prune` explicitly.
- **Functional validation locally:** we never tested the "manual
  upload survives next deploy" scenario.
- **CI:** unit tests don't model out-of-band content.
- **Code review:** the prop's absence is invisible.
- **Operator-deploy:** this is where it surfaced — Hugo did the
  manual `s3 cp` on the previews bucket, the next CI run wiped it,
  and the loss became evident on the next URL hit.

## Countermeasure

- **Code:** commit `2a4aef4` — `StaticSite.buildPreview`'s
  `BucketDeployment` explicitly sets `prune: false`. Previews are
  multi-tenant (each app's PR uploads to its own key prefix) so
  pruning would be wrong anyway. Prod kept the default `prune: true`
  by design; per-app prod buckets are single-tenant and stale assets
  shouldn't linger.
- **Operator decision:** if you want non-versioned content on
  prod, host it elsewhere — don't drop it into the prod bucket
  expecting it to survive. Or version it in `apps/<slug>/site/` and
  let it ship through the normal pipeline.

## Eradication (rung 4 — explicit choice baked into the construct)

- **Rung:** 4 (detection by inspection). Every `BucketDeployment`
  in the repo's constructs sets `prune` explicitly with an inline
  comment naming the policy choice (multi-tenant → off,
  single-tenant → default true). The previews path's `prune: false`
  is asserted by a synth-time test in `static-site.test.ts`.
- **Why not rung 1 (structural):** `prune` is genuinely a
  per-context decision (multi-tenant vs single-tenant bucket).
  Forcing one default at the construct level would just move the
  problem. Rung 4 (explicit + tested) is the right ceiling.
- **What changed:** `infra/cdk/src/constructs/static-site.ts`'s
  preview path now sets `prune: false` with a comment explaining
  the multi-tenant rationale. Prod path keeps the default `true`
  (single-tenant per-app bucket). `static-site.test.ts` asserts
  the preview path's `Prune: false` in the synth output.
- **PR:** [#2](https://github.com/hugoleborso/borso.fr/pull/2).
- **Commit:** [`2a4aef4`](https://github.com/hugoleborso/borso.fr/commit/2a4aef4).
- **Diff snippet (essence of the fix):**
  ```diff
    new BucketDeployment(this, 'Deploy', {
      sources: [Source.asset(path.resolve(props.assetsPath))],
      destinationBucket: sharedBucket,
      destinationKeyPrefix: keyPrefix,
  +   prune: false,  // multi-tenant — don't wipe other apps' previews
      distribution: previewsDistribution,
      distributionPaths: [`/${keyPrefix}/*`],
    });
  ```
- **Sibling defects swept:** every `BucketDeployment` in the repo
  audited; both have intentional prune choices.
