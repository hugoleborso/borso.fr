# BucketDeployment prunes the bucket by default

## Symptom

Manually `aws s3 cp`'d objects (e.g. a `lucie/` folder we wanted to
serve from prod but not version in git) disappeared from the bucket
after the next CI deploy.

## Root-cause chain

1. **Why** are out-of-band uploads getting deleted?
   `BucketDeployment` syncs a source directory to a destination
   bucket; on each deploy it diffs the bucket against the source and
   removes anything it doesn't recognise.
2. **Why** is "remove orphans" the default?
   `BucketDeployment.prune` defaults to `true`. CDK's stated intent
   is "the deployed assets should be the bucket's exact content";
   pruning enforces that.
3. **Why** isn't this an issue for the previews bucket?
   The previews bucket is multi-tenant — each app's preview deploy
   uploads at its own key prefix and must not delete other tenants'
   prefixes. The `StaticSite.buildPreview` `BucketDeployment` sets
   `prune: false` to enforce that.
4. **Why** didn't the prod path do the same?
   Prod's bucket is per-app and single-tenant. Pruning is the
   correct behaviour 99 % of the time — stale assets shouldn't
   linger after a refactor renames or removes them. The collision
   only shows up if you deliberately want to put content in the
   bucket that the source-of-truth `dist/` folder doesn't know
   about.

**Root cause:** `BucketDeployment.prune` defaults to `true`, which is
the right default for single-tenant per-app prod buckets, but was
surprising the first time we tried to ship out-of-band content.

## Fix

- **Code:** commit `2a4aef4` (preview path) — the previews
  `BucketDeployment` explicitly sets `prune: false`. Prod path
  keeps the default.
- **Operator decision:** prod's prune-on stays. If you want
  non-versioned content (e.g. personal images) on a prod URL, host
  them somewhere else — don't drop them into the prod bucket
  expecting them to survive. Or version them in `apps/<slug>/site/`
  and they'll be deployed normally.
- **For future apps**, follow the same split: per-app prod
  bucket → prune on; multi-tenant shared bucket → prune off.
