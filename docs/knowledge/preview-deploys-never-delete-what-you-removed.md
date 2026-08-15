# A preview keeps serving files your commit deleted

`infra/cdk/src/constructs/static-site.ts` sets `prune: false` on the preview
`BucketDeployment`. So a preview deploy uploads what the build produced and
removes nothing: a file deleted in a commit stays reachable at its URL for as
long as the PR's prefix exists.

Seen on PR 50, which deleted a hand-drawn `favicon.svg` and replaced it with
PNGs. After the deploy that shipped the deletion:

```
$ aws s3 ls s3://borso-previews/pragma/pr-50/
                           PRE assets/
                           PRE icons/
2026-08-14 13:26:28       1145 favicon.svg      <- previous deploy, deleted in git
2026-08-14 13:36:54       1168 index.html
2026-08-14 13:36:54       1211 manifest.webmanifest
2026-08-14 13:36:54       6511 sw.js
```

`https://pragma-pr-50.preview.borso.fr/favicon.svg` answered 200 with the
deleted artwork, which reads exactly like a build that did not pick up the
change. It is not: the new files are all there with the new timestamp.

Last verified: 2026-08-15 — the listing above, taken minutes after the deploy
that removed the file.

**Production is not affected.** Its `BucketDeployment` leaves `prune` at the
CDK default, which is `true`, so a prod deploy does delete what the build no
longer produces.

## When this will mislead you

- Checking a preview to confirm a file is gone. Check S3, or check that the
  *new* file is right, rather than that the old URL 404s.
- A renamed asset: both names serve, and a stale page referencing the old one
  keeps working on the preview and breaks in production.
- Reading a preview's file listing as the build output. It is the union of every
  build that PR has ever deployed.

## Why it is still `false`

Nobody has decided otherwise yet. The flag arrived inside a large refactor with
no stated reason, and since the destination is already scoped per PR
(`pragma/pr-50`), turning it on would only ever delete that PR's own files.
Flipping it is a one-line change plus a construct snapshot update, and it is a
delete verb on a bucket shared by all four apps' previews, so it is the
operator's call rather than a drive-by.
