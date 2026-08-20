---
date: 2026-08-20
introduced-at: scripts/architecture
detected-at: reading a published page
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (the meta charset in document-shell.core.ts is the fix)
time-to-detect: minutes, but only if someone opens the published copy
tags: [s3, cloudfront, encoding, architecture-maps, vendor-quirk]
---

# `aws s3 sync` serves HTML with no charset, so the same bytes render as mojibake

`aws s3 sync` sets each object's `Content-Type` from the **file extension**, and
for `.html` that is a bare `text/html` — **no `charset` parameter**. A browser
receiving `text/html` with no charset does not default to UTF-8, so any
non-ASCII character in the page renders as mojibake.

The trap is that the identical file reads correctly from GitHub Pages, which
sends `text/html; charset=utf-8`. So a page verified on a checkout, or through
the repository's rendered view, can still be broken at its published address.

## What holds it together here

`scripts/architecture/document-shell.core.ts` emits an explicit
`<meta charset="utf-8">` in every generated document. That is what makes the
published architecture maps readable, and it is the only thing doing so — the
transport says nothing.

## When this bites again

Any new generated page published to S3 the same way. Emit the meta tag, or set
the content type explicitly on upload:

    aws s3 sync … --content-type 'text/html; charset=utf-8'

Verifying only through a local checkout or GitHub will not reproduce it.
