---
status: open
found-in: '#385, #386'
right: 'AWS write on s3://borso-fr-prod and s3://borso-previews, and cloudfront:CreateInvalidation'
---

# Delete mom's photo from the buckets

PR #385 removed `apps/borso-fr/site/family/mom.png` because the operator asked
for the photo off the site. Neither deployment prunes, so the built copy is
still served.

Waits on the operator's answer to the deletion question in PR #386. Each
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
