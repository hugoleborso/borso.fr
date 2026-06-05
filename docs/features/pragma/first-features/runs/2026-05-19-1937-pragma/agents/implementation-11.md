---
status: done
summary: |
  Round-11 two-feature follow-up shipped. The uploads bounded context
  now mints real presigned S3 PUT + GET URLs (the v1 stubs are gone):
  POST /api/uploads/sign returns `{ uploadUrl, objectKey, expiresAt }`
  with the upload URL pinned to one of five allowed content types
  (PDF, PNG, JPEG, WebP, HEIC), a 10 MiB ceiling, and 5 min expiry;
  POST /api/uploads/sign-get returns `{ getUrl, expiresAt }` for an
  opaque object key the FE received earlier. Object keys carry the
  shape `chart/<song-uuid>/<random-uuid>.<ext>`. The triad is intact:
  the repository is the only file importing `@aws-sdk/client-s3` and
  `@aws-sdk/s3-request-presigner`; a pure `uploads.core.ts` covers
  the extension + key composition at 100% coverage.

  The songs bounded context gains GET /api/songs/search?q=… that
  proxies MusicBrainz' /ws/2/recording endpoint with the required
  User-Agent header (`Pragma/1.0 (https://pragma.borso.fr)`), a 60s
  in-memory response cache keyed by lowercased query, and a 1 req/sec
  floor between outbound calls (both reset on Lambda cold start —
  MusicBrainz' limit is per-IP). The response mapping lives in a
  pure `musicbrainz.core.ts`, gated at 100% coverage against the
  committed fixture `__fixtures__/musicbrainz-sample.json`.

  Front-end: FileDrop molecule + `file-drop.utils.ts` (drop-zone +
  file-picker, validates client-side, asks for a signed URL, PUTs
  the file, emits `{ kind, objectKey }`), wired into SongChartFields;
  SongSearch molecule (1000 ms debounced) wired above the new-song
  form; UploadedChartPreview molecule renders the uploaded chart on
  the detail page via the signed-get endpoint; debounce primitive
  added under `site/src/lib/` with 100% coverage.

  i18n: en + fr parity preserved with 10 new keys.

  Tests: back-e2e count went from 51 to 60 (+9: 6 uploads, 3 songs
  search); core count went from 281 to 305 (+24 across debounce,
  file-drop, musicbrainz, uploads core, etc.). All tests pass.
  typecheck + biome lint + build all green.

  Final SHA: ea8cd9a6ad170ebbe6be4f02780bf9ae985ad588 (4 commits).
  Pushed to origin/claude/pragma-erp-specification-k41Mg.

  Files touched:
  - apps/pragma/api/src/uploads/{controller,service,repository,
    schema,types,core,core.test,controller.test}.ts
  - apps/pragma/api/src/songs/{controller,controller.test,
    service,musicbrainz.core,musicbrainz.core.test}.ts +
    __fixtures__/musicbrainz-sample.json
  - apps/pragma/api/src/app.ts (route comment refreshed)
  - apps/pragma/site/src/components/molecules/{FileDrop,SongSearch,
    UploadedChartPreview}.tsx + file-drop.utils{,.test}.ts
  - apps/pragma/site/src/components/atoms/Icon.tsx (+ upload glyph)
  - apps/pragma/site/src/lib/debounce.utils{,.test}.ts
  - apps/pragma/site/src/routes/catalog/{SongChartFields,
    SongDetailPage,SongEditPage}.tsx
  - apps/pragma/site/src/i18n/{en,fr}.json
  - apps/pragma/package.json + pnpm-lock.yaml (+s3-request-presigner)

  No deviation from the round-11 prompt. spec.md / plan.md / ADR-0004
  / design-bundle untouched. No new ADR (MusicBrainz vs Discogs is a
  judgment call inside the implementer's scope, as the prompt
  permits).
artifacts:
  - apps/pragma/api/src/uploads/
  - apps/pragma/api/src/songs/musicbrainz.core.ts
  - apps/pragma/api/src/songs/__fixtures__/musicbrainz-sample.json
  - apps/pragma/site/src/components/molecules/FileDrop.tsx
  - apps/pragma/site/src/components/molecules/SongSearch.tsx
  - apps/pragma/site/src/components/molecules/UploadedChartPreview.tsx
  - apps/pragma/site/src/lib/debounce.utils.ts
partialDeferrals: []
next:
  kind: validate
---
