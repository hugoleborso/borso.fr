---
status: done
summary: |
  GetSongBPM wired as secondary lookup after MusicBrainz. Pure
  mapper at `apps/pragma/api/src/songs/getsongbpm.core.ts` (100%
  coverage on .core.ts — 26 cases covering canonical short-form
  keys, long-form `"C major"` / `"F minor"` normalisation, `"Fmaj"`
  reduction, numeric vs string tempo / duration, mm:ss + seconds-only
  + malformed durations, missing-field + permissive payload
  fallback). `enrichFromGetSongBpm` in `songs.service.ts` reads
  `GETSONGBPM_API_KEY` from `process.env` (graceful no-op when
  empty), honors the 1 req/sec global floor with its own state, 60s
  per-(artist|title) cache, and never throws on network /
  non-2xx / malformed JSON. `searchExternal` enriches only the top
  hit (`GETSONGBPM_ENRICH_LIMIT=1`) to keep typeahead latency
  bounded. Schema migration `0002_song_audio_features.sql` adds
  nullable `bpm` integer (tonality from GetSongBPM lands in the
  existing `tonality_start` text column, matching the ChordPro
  derivation path). CDK stack injects `GETSONGBPM_API_KEY` into the
  Lambda env at synth time; `.github/workflows/preview.yml` +
  `deploy.yml` forward `${{ secrets.GETSONGBPM_API_KEY }}` (silent
  when the secret isn't set). UI: `SongSearch` rows render
  tonality + BPM chips below the hit; `SongMusicBrainzPanel` gets
  two new fields + a mandatory `https://getsongbpm.com` attribution
  link (rendered only when one of the audio-feature values is
  present, in EN + FR). `applyExternalPickToDraft` pre-fills
  `tonalityStart` only when the draft's field is empty (defer to
  user input); `bpm` always pre-fills since users don't enter it
  manually. Tests: 350 core (was 350 + 26 new getsongbpm cases —
  the previous round-15 MB tests had `tonality: null` / `bpm: null`
  added to their `toEqual` assertions), 64 back-e2e (was 62, +2
  new audio-features round-trip tests in
  `songs.audio-features.controller.test.ts` covering both the
  enriched + no-key-set graceful no-op paths). typecheck / biome /
  build green; knip clean. New i18n keys (`catalog.tonality`,
  `catalog.bpm`, `catalog.bpmValue`, `catalog.audioFeaturesAttribution`)
  land in en + fr with parity preserved. New
  `docs/knowledge/getsongbpm-integration.md` covers signup +
  attribution + verify recipe + symptom table. 7 commits ahead of
  round-15 (e85ceca → 9b177f5).
artifacts:
  - apps/pragma/api/src/songs/getsongbpm.core.ts
  - apps/pragma/api/src/songs/getsongbpm.core.test.ts
  - apps/pragma/api/src/songs/__fixtures__/getsongbpm-sample.json
  - apps/pragma/api/src/songs/musicbrainz.core.ts
  - apps/pragma/api/src/songs/musicbrainz.core.test.ts
  - apps/pragma/api/src/songs/songs.service.ts
  - apps/pragma/api/src/songs/songs.schema.ts
  - apps/pragma/api/src/songs/songs.repository.ts
  - apps/pragma/api/src/songs/songs.audio-features.controller.test.ts
  - apps/pragma/api/src/database/migrations/0002_song_audio_features.sql
  - apps/pragma/cdk/lib/stack.ts
  - apps/pragma/site/src/components/molecules/SongSearch.tsx
  - apps/pragma/site/src/routes/catalog/SongMusicBrainzPanel.tsx
  - apps/pragma/site/src/routes/catalog/SongEditForm.tsx
  - apps/pragma/site/src/routes/catalog/song-draft.ts
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - .github/workflows/preview.yml
  - .github/workflows/deploy.yml
  - docs/knowledge/getsongbpm-integration.md
  - docs/knowledge/README.md
partialDeferrals: []
next:
  kind: validate
---
