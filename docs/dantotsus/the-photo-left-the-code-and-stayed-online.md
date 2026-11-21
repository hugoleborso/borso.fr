---
date: 2026-11-21
introduced-at: conception
detected-at: production
severity: high
related-pr: '#385'
fix-commits: none (analysis mode, the operator picks the eradication)
eradication-level: 5
eradication-paths: [docs/knowledge/preview-deploys-never-delete-what-you-removed.md]
time-to-detect: hours (merge at 10:17 UTC, measured 200 during the sweep)
tags: [s3, bucketdeployment, cloudfront, privacy]
zone: infra/cdk/src/constructs/static-site.ts
recurs: [bucketdeployment-prune-default]
---

# The photo left the code and stayed online

## User impact

The operator asked for his mother's photo off borso.fr. PR #385 deleted the
file and replaced the page's image with a drawing. The page changed, and the
photo stayed public at its built URL.

| | Seen | Expected |
| --- | --- | --- |
| `https://borso.fr/assets/mom-BzeqhxL2.png` after the merge | 200, the photo (measured 2026-11-21) | 404 |
| Preview prefixes holding the same file | 57 (measured, `aws s3 ls s3://borso-previews/ --recursive`) | none |

Anyone who saved the link, or a search engine that indexed it, still reaches
the photo.

## Causal chain

- The photo is still public after the merge
  - The prod deploy uploaded the new build and deleted nothing
    - `prune: false` on both prod `BucketDeployment`s, set by `0b560c3` so a
      phone holding an older page still finds its bundle
  - The session that deleted the file never looked at the bucket
    - The knowledge entry on this subject said "Production is not affected",
      which `0b560c3` had made false two months earlier

## Root cause of occurrence

*Thought deleting a file from the build takes it off the site, actually the
site keeps every file any past deploy uploaded.*

`0b560c3`'s message names the trade: "a file removed from the build stays
served until someone empties the bucket by hand." No step, check or document
a session reads when removing a file carried that sentence forward.

## Detection failure causes

- **Visual validation:** it checked the page, which no longer shows the photo.
  No assertion asked whether the file still answered.
- **Knowledge:** the entry a session could have read was stale, and its only
  triggers fired on the CDK file and on listing the previews bucket, not on
  deleting an image.

## Countermeasure

The photo's copies are listed in
[`delete-mom-photo-from-the-buckets.md`](../operator-backlog/delete-mom-photo-from-the-buckets.md),
because deleting them needs AWS write. The knowledge entry now says prod keeps
files too, and fires on `git rm` of an image.

Two ways to stop the next removal from staying online, for the operator:

| Option | What the operator sees | Cost |
| --- | --- | --- |
| A. The deploy deletes a built file no page has referenced for 30 days | A file taken off the site goes offline by itself within 30 days of the merge. An urgent removal still needs a hand deletion | A cleanup step in the prod deploy and its tests |
| B. Keep today's deploy | Each removal needs a "Borso Admin" session to delete the file | Nothing to build, one backlog task per removal |

## Eradication

**Type:** knowledge (level 5), until the operator picks A or B.

**Reference:** the commit adding this file.

```diff
-**Production is not affected.** Its `BucketDeployment` leaves `prune` at the
-CDK default, which is `true`, so a prod deploy does delete what the build no
-longer produces.
+**Production keeps them too.** Commit `0b560c3` set `prune: false` on both
+prod deployments in September 2026, so a browser holding an older page still
+finds its bundle.
```

**Proof it can fail:** not applicable to a knowledge entry.

**Similar instances:** `git log --since=2026-09-18 --diff-filter=D --name-only --format= -- 'apps/*/site/*'`
filtered to images lists only `apps/borso-fr/site/family/mom.png` (measured).
No other image left a build since the prune changed.
