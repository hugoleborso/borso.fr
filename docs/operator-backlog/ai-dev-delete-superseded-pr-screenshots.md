---
status: open
found-in: '#362'
right: 's3:DeleteObject on borso-previews/screenshots/* for AI-Dev-ReadOnly'
---

# Let sessions delete superseded pull request screenshots

When a pull request's screen changes after its visual pass, the operator asks
for the screenshots to be replaced. A session can upload the new folder under
`screenshots/pr-<n>/` but cannot remove the old one: `AI-Dev-ReadOnly` has an
explicit deny on `s3:DeleteObject` there (measured on #362). The Screenshots
comment lists every folder, so the stale screens stay under the new ones until
the 60-day expiry.

Narrow the write deny to allow `s3:DeleteObject` on
`arn:aws:s3:::borso-previews/screenshots/*` only. While it is open, delete
`screenshots/pr-362/2026-11-15-2310/` by hand.

## Done when

`aws s3 rm s3://borso-previews/screenshots/pr-362/2026-11-15-2310/ --recursive`
run as `AI-Dev-ReadOnly` succeeds, and `aws s3 ls s3://borso-previews/screenshots/pr-362/`
lists only `2026-11-16-0030/`.
