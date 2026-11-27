---
date: 2026-05-12
introduced-at: conception
detected-at: ci
severity: high
related-pr: '#11'
fix-commits: [c2eea65058, 374c8c9fe1]
eradication-level: 5
eradication-paths: []
time-to-detect: hours
tags: [cdk, s3, bucket-deployment, lambda, preview, deploy]
zone: infra/cdk/src/constructs/static-site.ts
---

# A preview deploy hung 15 minutes and died on an SSL error after 10 MiB of photos

## User impact

The operator could not see PR #11's preview. PR #11 added about 10 MiB of photos under `apps/borso-fr/site/public/media/12-travaux/`.

| | Seen | Expected |
| --- | --- | --- |
| Preview deploy of PR #11 | Stack stuck in `UPDATE_IN_PROGRESS` for about 15 minutes, then rolled back. No preview URL. | The preview deploys in a few minutes and serves the new page. |
| Next CI deploy | Failed in 42 seconds, because CloudFormation refuses changes during `UPDATE_ROLLBACK_IN_PROGRESS`. It looked like a code regression. | The retry deploys. |

The Lambda log of the `BucketDeployment` custom resource, measured by CloudWatch:

<details>
<summary>CloudWatch log</summary>

```
upload failed: ../../tmp/.../media/12-travaux/septembre-2025-triathlon-groupe.jpg
  to s3://borso-previews/borso-fr/pr-11/media/...
  SSL validation failed for https://borso-previews.s3.eu-west-3.amazonaws.com/...
  [SSL: UNEXPECTED_EOF_WHILE_READING]
  EOF occurred in violation of protocol (_ssl.c:1032)

[ERROR] cfn_error: b"Command '['/opt/awscli/aws', 's3', 'sync',
  '/tmp/.../contents', 's3://borso-previews/borso-fr/pr-11']'
  returned non-zero exit status 1."
REPORT Duration: 879565.21 ms Billed Duration: 879566 ms
  Memory Size: 128 MB Max Memory Used: 126 MB
```

</details>

## Causal chain

- The PR #11 preview stack rolled back after about 15 minutes.
  - The `BucketDeployment` Lambda's `aws s3 sync` exited non-zero after repeated `SSL: UNEXPECTED_EOF_WHILE_READING` uploads (measured, log above).
    - The Lambda ran at 126 MB of its 128 MB (measured, the `REPORT` line). That memory pressure broke the TLS uploads is inferred. It was never reproduced.
      - Branch 1, the payload. PR #11 put about 10 MiB of photos in `site/public/`, and every deploy copies that folder through this one Lambda.
      - Branch 2, the memory. The construct's deployment set no `memoryLimit`, so it took the default of the installed `aws-cdk-lib@2.252.0`, 128 MiB.

        ```ts
        new BucketDeployment(this, 'Deploy', {
          sources: [Source.asset(path.resolve(props.assetsPath))],
          destinationBucket: bucket,
          distribution,
          distributionPaths: ['/*'],
        }); // ← no memoryLimit: 128 MiB in 2.252.0
        ```

        - Commit `1aa979e74` (2026-05-01, an agent) wrote these lines. Its message says the constructs were ported "verbatim from upstream", from `hugoleborso/borso-platform`.
          - The upstream construct was the input of that commit. It carried no `memoryLimit`, and the sites it served then held no media (inferred).

## Root cause of occurrence

*Thought the `BucketDeployment` defaults fit any static site, actually its Lambda ran in 128 MiB in `aws-cdk-lib@2.252.0` and the prop's own doc asks for more as soon as the files are large.* (Material)

The porting agent copied the construct verbatim. The docstring that held the answer sat in `node_modules`, outside the brief and the upstream code it worked from (inferred, the transcript is gone). The installed `aws-cdk-lib@2.276.0` still says, in `aws-s3-deployment/lib/bucket-deployment.d.ts`:

> If you are deploying large files, you will need to increase this number accordingly.

## Detection failure causes

- **Typing:** the construct takes any asset folder. Its size is invisible at synth.
- **Linter:** no rule reads CDK construct props.
- **Local validation:** `pnpm dev` serves `site/public/` directly. The Lambda only runs in a cloud deploy.
- **CI build:** `pnpm build` succeeds whatever the bundle size. Nothing compares the bundle to the Lambda's memory.
- **Review:** a missing prop leaves no line to read in the diff.
- **Monitoring:** the failure log names TLS, not memory. Only the `REPORT` line shows 126 of 128 MB.

## Countermeasure

- Commit [`c2eea65`](https://github.com/hugoleborso/borso.fr/commit/c2eea65058a85f108302f4df505de017a85c2a6b) set `memoryLimit: 512` on the prod and preview deployments of `infra/cdk/src/constructs/static-site.ts`. The PR #11 preview then deployed.
- Commit [`374c8c9`](https://github.com/hugoleborso/borso.fr/commit/374c8c965df168d3e08c10b1a3a06fefa9b4a2bf) recompressed the photos to 1600 px at quality 80, from 13 MiB to 9.3 MiB.

The value now lives in `BUCKET_DEPLOYMENT_MEMORY_MIB = 512`, at `infra/cdk/src/constructs/static-site.ts:44`, used by all three deployments.

## Eradication

**Type:** knowledge (level 5). Nothing above it holds today.

**Reference:** commit [`c2eea65`](https://github.com/hugoleborso/borso.fr/commit/c2eea65058a85f108302f4df505de017a85c2a6b), the countermeasure.

```diff
     new BucketDeployment(this, 'Deploy', {
       sources: [Source.asset(path.resolve(props.assetsPath))],
       destinationBucket: bucket,
       distribution,
       distributionPaths: ['/*'],
+      memoryLimit: 512,
     });
```

The pinned 512 is not a mechanism. It is a copy of a vendor number, and it has drifted. The installed `aws-cdk-lib@2.276.0` defaults to 1024 MiB (`memoryLimit??1024` in `bucket-deployment.js`, and its README: "The default memory limit for the deployment resource is 1024MiB"). So the pin now gives the Lambda half of what it would get without it. Nothing refuses a lower value, and nothing bounds the payload.

**Proposed:** subtract the pin. Delete `memoryLimit` and `BUCKET_DEPLOYMENT_MEMORY_MIB` from `static-site.ts`, so the construct follows the library default. Add a synth assertion in `infra/cdk/test/unit/` that the deployment handler's `MemorySize` is not below that default. Then remove the payload: move media out of `site/public/` to the `PhotosCdn` construct (`infra/cdk/src/constructs/photos-cdn.ts`), so no photo goes through a Lambda `aws s3 sync`. `apps/borso-fr/site/public` measures 10 MB with `du` today. That would make a media-sized deploy payload impossible, not just survivable.

**Proof it can fail:** none. No check exists to plant against.

**Similar instances:** `grep -n "new BucketDeployment" infra/cdk/src/constructs/*.ts` finds three deployments, all in `static-site.ts`, all pinned to 512.
