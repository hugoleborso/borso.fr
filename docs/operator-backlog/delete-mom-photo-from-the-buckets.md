---
status: done
found-in: '#385, #386'
closed: 2026-11-21
right: 'AWS write on s3://borso-fr-prod and s3://borso-previews, and cloudfront:CreateInvalidation'
---

# Delete mom's photo from the buckets

PR #385 removed `apps/borso-fr/site/family/mom.png` because the operator asked
for the photo off the site. Neither deployment prunes, so the built copy is
still served.

Waits on the operator's answer to the deletion question asked in the session of PR #386. Each
deletion is its own confirmation.

1. `aws s3 rm s3://borso-fr-prod/assets/mom-BzeqhxL2.png`
2. `aws cloudfront create-invalidation --distribution-id E25779EK6PTEZ2 --paths /assets/mom-BzeqhxL2.png`
3. Every copy under `s3://borso-previews/borso-fr/pr-*/assets/mom-BzeqhxL2.png`,
   listed with `aws s3 ls s3://borso-previews/ --recursive | grep mom-BzeqhxL2.png`,
   57 prefixes on 2026-11-21. Then invalidate `/assets/mom-BzeqhxL2.png` on
   distribution `E3C7D6AHLYPGU1`.

## Done when

`curl -s -o /dev/null -w '%{http_code}' https://borso.fr/assets/mom-BzeqhxL2.png`
prints 403 or 404, and the `grep` in step 3 prints nothing.

## Evidence

Done on 2026-11-21 by the session of PR #385, running as `Borso-Admin`, after
the operator answered "oui". It deleted the prod object and the 57 preview
copies. Prod answered 404 after invalidation `I94OSWU7BV0YYGDBW21RFTR4J7`.

The previews still answered 200 from the CDN cache (`x-cache: Hit`) after
invalidating `/assets/mom-BzeqhxL2.png`. Invalidating the 57 rewritten paths,
`/borso-fr/pr-<n>/assets/mom-BzeqhxL2.png`, in `I6XZR7K92FDRAS8C4HY44EWR1H`
brought all 57 preview hosts to 404 (measured with `curl` on each).

