---
summary: 'pragma under `scripts/dev-server.sh` has no uploads bucket, so a concert with a poster key answers 500 on `/upcoming` and a poster upload answers `UPLOADS_BUCKET not set`; check poster and upload rows on the preview.'
triggers:
  commands:
    - 'poster_s3_key'
  output:
    - 'UPLOADS_BUCKET not set'
---

# pragma's local dev server has no uploads bucket

Three agents of PR #410 logged this one wall: `build-agent`,
`visual-validator` and `perforation-agent`.

- `dev:api` in `apps/pragma/package.json` sets no `UPLOADS_BUCKET`.
- `presignGetObject` and `presignPutObject` in
  `apps/pragma/api/src/uploads/uploads.adapter.ts` throw `UploadsConfigError`
  when it is unset.
- So `GET /api/concert-registrations/upcoming` answers 500 once any concert
  row has a `poster_s3_key`. The whole landing fails, not only the poster.
  A poster upload answers 500 with `UPLOADS_BUCKET not set`.

Setting a dummy bucket name does not help. A presigned URL needs AWS
credentials to sign. Without them `getSignedUrl` throws
`CredentialsProviderError`. With a session's read-only credentials it signs a
URL for a bucket that does not exist, so the image never loads (measured on
2026-11-26).

What works:

- Check every poster or upload row on the PR preview, which has a bucket.
- Check a layout without a poster locally. Leave `poster_s3_key` empty.
- Mocking the read takes an init script that rewrites `fetch`, because pragma
  sends reads through `POST /api/read-batch`. See
  [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md#a-routed-read-inside-pragmas-read-batch-cannot-be-mocked-alone).
