# Standards review — claude/deezer-song-search-7to1u9 against origin/main

Verdict: FINDINGS
Ledger: c43dff041051
Reviewed: 6 file(s). Sealed: 4. Findings: 2.

## Findings

### apps/pragma/site/src/routes/catalog/SongDetailPage.tsx:189

Bullet: "`reviewer` checks that a route composes organisms and owns no layout primitive, because the atomic rules read the bucket out of the path and a route is in no bucket."

```tsx
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
```

The route builds its own two-column shell and then hand-writes the chart card (lines 191-209), the uploaded-chart card (211-234) and the links card (238-262) out of `Card`, `Icon` and raw `div`/`ul` layout, plus a local `SongNotesCard` at 292. A route should compose organisms; these three regions are organisms waiting to be named (`SongChartPreviewCard`, `SongUploadedChartCard`, `SongLinksList`).

Introduced: pre-existing — the branch's diff on this file changes the Deezer/Spotify identifiers it reads and the long-press subject, not the layout.
Fix size: one file plus three new organisms, roughly 150 lines moved, no callers outside this route. Left for its own change by the operator after round 1.

### apps/pragma/api/src/songs/songs.service.ts:53

Bullet: "`reviewer` checks the half of the verb table the rule above cannot reach: that a `find…` actually returns `null` rather than throwing, that a `get…` throws, and that a `build…`, `project…` or `select…` returns what its verb says."

```ts
export async function getSongById(id: string): Promise<SongRow | null> {
  return await findSongById(id);
}
```

`docs/standards/01-naming.md:62` gives `get…` as "the thing, and throws when it is absent"; this returns `null`, so it is a `find…`. `getSongs` at line 49 returns an array, which the table gives to `list…`. The repository underneath already uses the right verbs (`findSongById`, `listSongsNewestFirst`), so the service is renaming them away from the contract.

Introduced: pre-existing — the branch's diff on this file touches the Deezer imports, `valuesFromCreate`'s identifier fields and the new `withResolvedSpotifyTrack`; both `getSongs` and `getSongById` are untouched lines.
Fix size: repo-wide convention rather than a local slip. `getSongById`/`getSongs` have 4 call sites across `songs.controller.ts` and `sessions.service.ts`, but the same shape appears in every pragma service (`getBarById`, `getSessionById`, `getAppConfig`, `getMemberInstruments`, `getAllSetlists`, …) — about 16 exported functions. Renaming only the songs pair makes the tree less consistent, so this belongs in one sweep of its own.

## Sealed

- apps/pragma/site/src/components/molecules/SongExternalMetadataPanel.tsx — presentational molecule, props are data not a boolean family, `grid-cols-1 sm:grid-cols-2` is mobile-first, no effects, all labels through `t()`.
- apps/pragma/site/src/components/organisms/SongSearch.tsx — owns its query through `useSongSearch`, debounce via `useMemo` rather than an effect, no form (two controls, not a `useState` chain standing in for `useForm`).
- apps/pragma/site/src/lib/queries/songs.queries.ts — every request/response type derived (`InferResponseType`, `Parameters<…>`); `useUpdateSong`'s new `onSuccess` reconciles from the mutation response and adds no invalidate, which is exactly what bullet 06 asks for given the server-enriched `spotifyTrackId`; the blueprint description was updated to match.
- apps/pragma/VOCABULARY.md — the Deezer track / Spotify track / Deezer album sections check out against `songs.schema.ts` (`deezer_track_id`, `deezer_album_id`, `spotify_track_id`, all nullable), `deezer.core.ts` (one ISRC per track, no tags written), `migrations/0006_deezer_identifiers.sql` (`mbid` and `release_id` left in place, unread), `song-draft.core.ts:222` (picking a result clears `spotifyTrackId`) and ADR-0017, which exists.

## Unclear

- None.

## Outside the checklist

- `SongSearch.tsx:40` renders `'search-failed'` as the error text for a non-`ApiError` failure — a bare slug rather than a translation key. No reviewer bullet covers it; `t('common.loadFailed')` is the obvious replacement.
- The 375 px bullet was judged from the Tailwind classes, not from a browser or `scripts/argent.sh` pass. The two new components are mobile-first (`flex-col`, `grid-cols-1 sm:grid-cols-2`); a real device pass belongs to `/visual-validation`.
