---
date: 2026-05-02
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#2'
fix-commits: none (the prune false that hid the symptom came with the port in 1aa979e74, and no mechanism holds the class)
eradication-level: 5
eradication-paths: []
time-to-detect: minutes (next CI deploy after manual upload)
tags: [cdk, s3, bucketdeployment]
zone: infra/cdk/src/constructs/static-site.ts
---

# Images uploaded by hand to a preview vanished at the next deploy

## User impact

The operator copied a `lucie/` folder of personal images with `aws s3 cp` into the previews bucket, so a preview would serve them.

| | Seen | Expected |
| --- | --- | --- |
| Right after the upload | The images load. | The images load. |
| After the next CI deploy | The image URLs answer 404. A second upload vanished the same way. | The images still load. |

Nobody measured how many files were lost. The report is the operator's.

## Causal chain

- The image URLs answered 404 after the next deploy.
  - The `BucketDeployment` custom resource deleted the objects.
    - Its handler runs `aws s3 sync <source> s3://<bucket>/<prefix>` and appends `--delete` when `prune` is true (`bucket-deployment-handler/index.py`, lines 110 and 229 of the installed `aws-cdk-lib@2.276.0`). The `--delete` removes every object under the prefix that the source does not hold.
      - The deployment did not set `prune`, so it took the default, `true`.
      - The `lucie/` objects sat under that destination prefix (inferred). The sync never reaches outside `destinationKeyPrefix`, so objects outside it would have survived.
        - The operator uploaded files that no commit holds into a prefix that a deploy owns.

## Root cause of occurrence

*Thought `BucketDeployment` adds its source to the bucket, actually it makes its destination prefix equal to its source and deletes the rest.* (Man)

The person who uploaded held the model "this bucket holds whatever I put in it". The construct's model is "this prefix mirrors `dist/`". The installed `aws-s3-deployment/lib/bucket-deployment.d.ts` says of `prune`:

> By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.

## Detection failure causes

- **Typing:** `prune?: boolean` defaults to `true` with no trace in the call.
- **Linter:** no rule reads CDK construct props.
- **Local validation:** a local run never touches S3, so it never meets content uploaded out of band.
- **CI:** the unit tests synthesize from `dist/` alone. Out-of-band content exists only in the real bucket.
- **Review:** the upload was a shell command. It left nothing in any diff to review.

## Countermeasure

The preview deployment in `infra/cdk/src/constructs/static-site.ts` carries `prune: false`. It did not come from a fix. It was already in the first commit of the file here, `1aa979e74`, ported verbatim from `hugoleborso/borso-platform`. So the incident most likely happened upstream, before the port (inferred). Commit `2a4aef4`, which this entry cited before, only added the CloudFront invalidation next to that line.

This countermeasure wraps the failing path instead of removing the cause. It also caused a worse defect. `docs/knowledge/preview-deploys-never-delete-what-you-removed.md` measured a deleted photo still served in prod and in 57 preview prefixes on 2026-11-21. Prod has run `prune: false` too since commit `0b560c3`, so a browser holding an older page still finds its bundle.

## Eradication

**Type:** knowledge (level 5). No mechanism holds the class.

**Reference:** none. Nothing keeps files that no commit holds out of a deploy-owned prefix. The preview `prune: false` is not even asserted by a test. `grep -n "Prune" infra/cdk/test/unit/static-site.test.ts` finds only the two prod deployments.

The old claim that pruning would "wipe other apps' previews" is false. The sync is scoped to `s3://<bucket>/<prefix>`, so pruning never reaches another app's prefix.

**Proposed:** subtract the exception. Restore `prune: true` on the preview deployment in `static-site.ts`, and assert `Prune: true` on it in `infra/cdk/test/unit/static-site.test.ts`. It is safe, because pruning stays inside the PR's own prefix. For prod, keep old fingerprinted assets with an S3 lifecycle rule that expires them after a delay, instead of `prune: false`, so a browser holding an older page still finds its bundle and a deleted file then disappears. Files that no commit holds then have one home, outside every deploy-owned prefix. A file deleted in git could no longer stay served, and a hand upload into a deploy prefix would vanish at once, at the next deploy, instead of hiding a stale copy.

**Proof it can fail:** none. No check exists to plant against.

**Similar instances:** `grep -n "prune" infra/cdk/src/constructs/*.ts` finds three deployments, all in `static-site.ts`, all `prune: false`.
