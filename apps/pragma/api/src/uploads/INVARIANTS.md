# Invariants of pragma, in `api/src/uploads`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Upload

- The content type must be one of `application/pdf`, `image/png`,
  `image/jpeg`, `image/webp`, `image/heic`.
- The declared length is capped at 10 MiB, and a signed URL is valid for
  5 minutes.
- The object key is `chart/<songId>/<randomId>.<extension>`
  (`buildChartObjectKey`). The slice stores no row of its own: a chart's
  key is kept in a chart in `song.charts`.
- The same slice signs a take's audio upload (`mintObjectUpload`, called
  by the takes slice with the take's own limits) and deletes stored
  objects (`deleteStoredObjects`); a take's key is kept in
  `take.object_key`.

Held by: `api/src/uploads/uploads.controller.test.ts` › rejects an unsupported content type
Held by: `api/src/uploads/uploads.controller.test.ts` › rejects content-length over the 10 MiB ceiling
Held by: `api/src/uploads/uploads.adapter.test.ts` › signs the declared length, so S3 refuses a body of any other size
