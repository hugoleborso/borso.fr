---
summary: 'Neither the preview nor the prod `BucketDeployment` prunes, so a file a commit deleted stays served at its old URL, in prod forever and on a preview for 60 days.'
triggers:
  paths:
    - 'infra/cdk/src/constructs/static-site.ts'
  commands:
    - 's3\s+ls\s+s3://borso-previews'
    - 'git\s+rm\s+.*\.(png|jpe?g|webp|gif|svg)'
---

# A deploy keeps serving files your commit deleted

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

**Production keeps them too.** Commit `0b560c3` set `prune: false` on both
prod deployments in September 2026, so a browser holding an older page still
finds its bundle. A file removed from the build therefore stays served in prod
until someone deletes it from the bucket by hand.

PR #385 deleted the photo of the operator's mother, because he asked for it
off the site. After the merge, `https://borso.fr/assets/mom-BzeqhxL2.png` still
answered 200, and 57 preview prefixes of `borso-previews` held the same file
(measured 2026-11-21). The `expire-previews` rule deletes a preview copy 60 days
after its upload. Nothing deletes the prod copy.

When a request is to take something off the site, deleting the source is half
of it. List the bucket for the built name, then delete the object and
invalidate its path, which needs AWS write (`docs/operator-backlog/`).

## Two ways to close it, for the operator

| Option | What the operator sees | Cost |
| --- | --- | --- |
| A. The prod deploy deletes a built file no page has referenced for 30 days | A file taken off the site goes offline by itself within 30 days of the merge. An urgent removal still needs a hand deletion | A cleanup step in the prod deploy and its tests |
| B. Keep today's deploy | Each removal needs a "Borso Admin" session to delete the file | Nothing to build, one backlog task per removal |

Only `apps/borso-fr/site/family/mom.png` left a build as an image since
`0b560c3` (measured with `git log --since=2026-09-18 --diff-filter=D`).
