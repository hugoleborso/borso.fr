---
status: done
summary: |
  SetlistEditor.tsx:206 typo `transitionWarn` → `transitionWarning`
  fixed. i18n module augmentation lands at
  apps/pragma/site/src/i18n/react-i18next.d.ts and targets
  `i18next.CustomTypeOptions` (the canonical augmentation target;
  augmenting `react-i18next` would not type useTranslation's `t`).
  After the gate, the typecheck catches mistyped keys with a "Did
  you mean…" suggestion. No other typos surfaced in `t('…')` call
  sites, but five dynamic key constructions had to be re-shaped to
  hold against the gate: `BAR_STATUS_KEY` / `SONG_STATUS_LABEL_KEY`
  / `LOCALE_LABEL_KEY` switched to `as const satisfies Record<…>`
  literal maps; `NavItem.labelKey` switched to `ParseKeys` from
  `i18next`; the previous `t(\`catalog.status${…}\`)` template was
  replaced by `SONG_STATUS_LABEL_KEY[status]`. MusicBrainz enrichment
  wired end-to-end: mapper extended to capture album / releaseId /
  durationSeconds + durationLabel / disambiguation / top-5 tags /
  first-3 isrcs; `inc=tags+releases+isrcs` added to the recording
  URL. Songs schema migration `0001_song_metadata.sql` adds five
  nullable columns + a non-unique `song_mbid_idx`; ADD COLUMN carries
  no NOT NULL/DEFAULT per DSQL §10, repository defaults `isrcs` /
  `tags` to `[]` on insert. Front: SongSearch row layout now shows
  artist · title · year · album · duration with tags as chips and
  disambiguation as a small caption; picking a hit pre-fills the
  full payload via `applyExternalPickToDraft`. Read-only
  SongMusicBrainzPanel displays the MB fields above the form's
  editable title/artist. The SongEditPage form was split into
  SongEditForm + three small siblings (SongChordPreview,
  SongMusicBrainzPanel, SongLinkAdder) to keep every file under the
  300-line cap. Tests: 4 commits, 21 musicbrainz.core cases (100%
  coverage on the .core.ts file), 62 back-e2e (incl. 2 new
  round-trip tests), 324 core total, 6 new i18n keys with FR parity
  preserved. Typecheck, lint (biome), knip, build, all green. Final
  SHA fa23c5d.
artifacts:
  - apps/pragma/site/src/i18n/react-i18next.d.ts
  - apps/pragma/site/src/routes/setlists/SetlistEditor.tsx
  - apps/pragma/api/src/songs/musicbrainz.core.ts
  - apps/pragma/api/src/songs/musicbrainz.core.test.ts
  - apps/pragma/api/src/songs/__fixtures__/musicbrainz-sample.json
  - apps/pragma/api/src/songs/songs.schema.ts
  - apps/pragma/api/src/songs/songs.repository.ts
  - apps/pragma/api/src/songs/songs.service.ts
  - apps/pragma/api/src/songs/songs.controller.test.ts
  - apps/pragma/api/src/songs/songs.musicbrainz.controller.test.ts
  - apps/pragma/api/src/database/migrations/0001_song_metadata.sql
  - apps/pragma/site/src/components/molecules/SongSearch.tsx
  - apps/pragma/site/src/routes/catalog/SongMusicBrainzPanel.tsx
  - apps/pragma/site/src/routes/catalog/SongChordPreview.tsx
  - apps/pragma/site/src/routes/catalog/SongLinkAdder.tsx
  - apps/pragma/site/src/routes/catalog/SongEditForm.tsx
  - apps/pragma/site/src/routes/catalog/SongEditPage.tsx
  - apps/pragma/site/src/routes/catalog/song-draft.ts
  - apps/pragma/site/src/components/molecules/LanguageSwitcher.tsx
  - apps/pragma/site/src/components/organisms/AppShell.tsx
  - apps/pragma/site/src/routes/bars/BarForm.tsx
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
partialDeferrals:
  - id: getsongbpm-enrichment
    note: |
      Future enrichment source for tonality + BPM that MusicBrainz
      doesn't carry on recording entities. Free API tier, requires
      attribution + an API key in env. Would slot into
      `songs.service.ts` next to the MusicBrainz proxy and set
      `tonality` + `bpm` on song create/update only when MB doesn't
      already. Out of scope for this round.
  - id: spotify-audio-features-closed
    note: |
      Spotify Audio Features (would give key + tempo + danceability)
      is closed to new apps since 2024-11-27. Not a viable enrichment
      path; flagged so future rounds don't re-propose it.
next:
  kind: validate
---
