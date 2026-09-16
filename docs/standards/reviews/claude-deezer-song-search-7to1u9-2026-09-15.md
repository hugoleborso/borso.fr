# Standards review — claude/deezer-song-search-7to1u9 against origin/main

Verdict: FINDINGS
Ledger: c43dff041051
Reviewed: 37 file(s). Sealed: 32. Findings: 5.

## Findings

### apps/pragma/VOCABULARY.md:229

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, which is prose against code and therefore nothing a rule can do."

```markdown
- There is no Spotify equivalent: no column holds a Spotify identifier, so
  the Spotify entry in the listen dialog is always a search.
```

The bullet sits under **Deezer track** and is contradicted by the **Spotify track**
section the same commit adds thirteen lines below it, and by
`apps/pragma/api/src/songs/songs.schema.ts:24` (`spotifyTrackId: text('spotify_track_id')`).
The listen dialog does open an exact Spotify track when the column is filled
(`listen-links.utils.ts:54-68`). The two bullets that follow the sentence are correct;
this one is the leftover of the pre-branch state. Deleting it satisfies the bullet.

Introduced: by this branch
Fix size: one line

### apps/pragma/site/src/components/organisms/SongSearch.tsx:14

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
export interface ExternalSongHit {
  readonly deezerTrackId: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  readonly deezerAlbumId: string | null;
  readonly durationSeconds: number | null;
  readonly durationLabel: string | null;
  readonly titleVersion: string | null;
  readonly isrcs: readonly string[];
}
```

This is the `/api/songs/search` response element written out by hand; the authority is
`apps/pragma/api/src/songs/deezer.core.ts:3`. The branch rewrote every field of it,
which is exactly the drift the bullet guards against — the two lists were kept in step
by an author, not by the compiler. The idiom is already in the tree:
`apps/pragma/site/src/lib/queries/songs.queries.ts:17` and
`song-cache.core.ts:5-6` derive with `InferResponseType`. Replacing the interface with
`type ExternalSongHit = InferResponseType<typeof api.api.songs.search.$get>['hits'][number]`
satisfies the bullet.

Introduced: by this branch, which rewrote all nine members of the interface
Fix size: one file, no callers (the consumers take the exported alias)

### apps/pragma/api/src/songs/songs.service.ts:82

Bullet: "`reviewer` checks that a mutation whose full result the client already holds reconciles from the response rather than refetching, because an immediate read after a write can be served a pre-commit snapshot."

```ts
  const song = await updateSong(id, await withResolvedSpotifyTrack(input, options));
```

The branch makes the update path derive a value the client cannot predict: the client
sends `spotifyTrackId: null` (`song-draft.core.ts:222`), and the service replaces it with
an id resolved from the ISRC. `useUpdateSong`
(`apps/pragma/site/src/lib/queries/songs.queries.ts:118-160`) has `onMutate` and `onError`
and no `onSuccess`, so the cache keeps the `null` the optimistic `mergeSongUpdate` wrote
and the listen dialog offers a Spotify *search* until an unrelated refetch happens. The
bullet's remedy applies directly: settle from the mutation response, not from a refetch —
one `onSuccess` writing `data.song` into `songKeys.byId` and into the list, mirroring what
`useCreateSong` already does at line 96. `songs.queries.ts` itself is not in this branch's
diff, so it carries no seal of its own here; the file that introduced the unpredictable
value is this one.

Introduced: by this branch
Fix size: one file, no callers (an `onSuccess` block in `songs.queries.ts`)

### apps/pragma/site/src/components/molecules/SongExternalMetadataPanel.tsx:16

Bullet: not a ledger bullet — this is the blueprint-claim check ("A file carrying `// @FollowsBlueprint <id>` is claiming to copy that blueprint; check that it does").

```tsx
// @FollowsBlueprint organism-presentational
export function SongExternalMetadataPanel({
```

The file is a new molecule under `components/molecules/`, and it claims
`organism-presentational`, whose usage line reads "Use for a screen region that composes
molecules and atoms but owns no state and fetches nothing." This component composes one
atom and occupies a panel inside a form. `molecule-presentational` is the id its two
siblings in this branch carry (`ListenLinksDialog.tsx:30`, `SongDeezerTrackIdField.tsx:17`)
and is the one it copies. It also lost the `export` on its props interface that the two
siblings keep, which is cosmetic. The marker is inherited from the renamed
`SongMusicBrainzPanel`, so no count moved and the index check could not see it.

Introduced: by this branch (the file is new; the marker came across in the rename)
Fix size: one line

### apps/pragma/site/src/routes/catalog/SongDetailPage.tsx:129

Bullet: "`reviewer` checks that a route composes organisms and owns no layout primitive, because the atomic rules read the bucket out of the path and a route is in no bucket."

```tsx
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0 select-none" {...longPress}>
```

The route owns its header layout outright, and further down at lines 188, 234 and 245 it
owns a `<Card>` shell, a `<ul>` of link rows and the flex/grid scaffolding around them —
about 150 lines of markup that belong in a `SongDetailHeader` organism and a
`SongLinksCard` organism. Compare `CatalogPage.tsx:31-35`, whose blueprint text states the
same rule and whose body is three molecules and one organism. This is the file's
long-standing shape, not the branch's doing; the branch added the long-press spread and
the `deezerAlbumId` rename inside the header it found. I am reporting it because the file
is in front of a reviewer, not because this change caused it, and extracting the two
organisms is its own change.

Introduced: pre-existing, the branch's diff on this file is one import, a six-line
`useSongLongPress` call, and two attributes on an existing `<div>`
Fix size: one file, no callers — two organism extractions, roughly 150 lines moved

## Sealed

- `apps/pragma/api/src/songs/deezer.adapter.ts`, `deezer.core.ts`, `spotify.adapter.ts`, `spotify.core.ts` — untrusted payloads go through `safeParse` and answer an empty result or `null` rather than throwing; the clock, the fetcher and the parameter reader are options, so no `.core.ts` calls `new Date()` and no test needs a network. `readCredentials`, `selectResolvableIsrc` and `buildIsrcSearchUrl` each return what their verb promises.
- `apps/pragma/api/src/songs/songs.repository.ts` — returns rows and decodes the text-encoded JSON columns through the `repository-json-column` blueprint it declares; it derives nothing a service should own. `SongRow` is hand-written but is the *decoded* shape, which `$inferSelect` cannot express while DSQL has no `jsonb`.
- `apps/pragma/api/src/songs/songs.schema.ts` — table and Zod input in one file, every bound a named const.
- `apps/pragma/api/src/helpers/secrets/parameter-store.client.ts` — one SSM read, client cached at module scope, carries its `@DependsOnExternal`.
- `apps/pragma/cdk/lib/stack.ts` — the SSM grant is scoped to the one parameter by `formatArn`, not to `parameter/*`.
- `apps/pragma/site/src/lib/long-press.hook.ts` — checked against the pointerdown bullet: `onPointerDown` starts a timer and writes nothing; the call happens 500 ms later and is cancelled by `onPointerMove` past 10 px, by `onPointerLeave` and by `onPointerCancel`. The capture-phase click handler is what lets it sit on a `<Link>`.
- `apps/pragma/site/src/components/molecules/ListenLinksDialog.tsx` — mobile-first: `w-[calc(100vw-2rem)]` with `sm:w-[26rem]` above it. See *Unclear* on how that was checked.
- `apps/pragma/site/src/components/atoms/AlbumCover.tsx` — three sizes go through the `album-cover.variants.ts` cva table, not a conditional.
- `apps/pragma/site/src/components/organisms/VoteCatalogRow.tsx`, `SongCard.tsx`, `SetlistEntryRow.tsx` — one boolean prop each at most, no boolean family standing in for a variant; the long-press spread never lands on a drag handle (dnd-kit's listeners stay on the handle button at `SetlistEntryRow.tsx:135`).
- `apps/pragma/site/src/components/organisms/SongEditForm.tsx` — every field goes through `useForm`/`form.Field`; no `useState` chain.
- `apps/pragma/site/src/lib/queries/song-cache.core.ts`, `apps/pragma/site/src/routes/catalog/song-draft.core.ts` — response and request types derived from the Hono client and from `z.infer`, which is what the third finding above says `SongSearch.tsx` should do.
- `apps/pragma/site/src/App.tsx`, `Icon.tsx`, `VoteCatalog.tsx`, `VoteDeck.tsx`, `SetlistEntriesList.tsx`, `CatalogPage.tsx`, `setlist-editor.utils.ts`, `listen-links.store.ts`, `listen-links.utils.ts`, `song-long-press.hook.ts`, `cover-art.utils.ts`, `SongDeezerTrackIdField.tsx`, `ListenLinksProvider.tsx`, `test-seed.service.ts` — read in full, nothing the checklist names.

## Unclear

- Every file touching a screen — the 375 px bullet asks for `agent-browser` and `scripts/argent.sh`, and no preview of this branch was reachable from here (`gh` is not installed and the PR has no deployed stack I could find). I judged the new surfaces by reading their classes: the listen dialog, the metadata panel (`grid-cols-1 sm:grid-cols-2`) and the Deezer id field are all mobile-first with `sm:` opt-ins, and the long-press gesture is the one thing on this branch that a class list genuinely cannot answer for. **Somebody has to hold a phone against `scripts/argent.sh` before this ships**: a 500 ms press with a 10 px tolerance, sitting on a `<Link>` in `SongCard` and on a row inside a dnd-kit sortable list, is exactly the case the bullet says a synthetic click will not find. I sealed those files on the bullets I could check and am naming this one as unmeasured rather than passed.

## Outside the checklist

- `apps/pragma/api/src/songs/songs.service.ts:53` — `getSongById` returns `SongRow | null`. The naming standard's verb table (`docs/standards/01-naming.md:62`) says `get…` throws when the thing is absent and `find…` returns `null`; the repository below it gets this right with `findSongById`. The service is the one that renames the promise on the way out. Pre-existing and unchanged by this branch; a rename to `findSongById` touches the songs controller only. I am listing it here rather than as a finding because the file is already unsealed for the mutation-reconciliation finding, and fixing one without the other would be odd.
- `apps/pragma/site/src/components/organisms/VoteDeck.tsx:151` — `onPointerCancel={endDrag}` commits the score the last `pointermove` implied. `touch-none` on the card should stop the browser claiming the gesture, so this is theoretical, but a cancel is the browser saying *the user was not doing this*; `onPointerCancel` resetting the offset without calling `applyRelease` would be the safer shape. Pre-existing, untouched by this branch, and no bullet covers the cancel path — the bullet is about `pointerdown`.
- `apps/pragma/site/src/components/molecules/SongExternalMetadataPanel.tsx:8` — `SongExternalMetadataPanelProps` is not exported, where the two sibling molecules this branch adds export theirs. Cosmetic.
