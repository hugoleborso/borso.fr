# Standards review, round 2 — claude/pragma-takes-and-push against origin/main

Verdict: FINDINGS
Ledger: 3843abb31417
Reviewed: 71 file(s). Sealed: 65. Findings: 8, on 6 unsealed file(s) (2 introduced by this branch, 6 pre-existing).

Merge-base `abdee6af`, head `230ef0e3`. The review set is every file `seal.ts verify` listed as `never-reviewed` or `edited-since-it-was-reviewed` after the round-1 seals at `c3b7c352`: 70 source files plus `apps/pragma/VOCABULARY.md`, which `seal.core.ts` also treats as reviewable. Each file was read in full. Seals are recorded under `standards-reviewer-2`.

Round 1's findings are all fixed: the comment count now comes from SQL, `beginRecording` moved into the adapter, display-mode and device detection have files of their own, one extension table sits in `domain/`, the site no longer sorts the comment thread, the take queue's types are derived, take creation uses icon buttons, the two explaining sentences are gone, the new vocabulary terms have `Held by:` lines, the account, song and session routes compose organisms only, `get…`-returns-null is renamed to `find…`, the session, member and song row types come from `$inferSelect`, the setlist append, delete and reorder each claim the setlist row in one retried transaction, and the Deezer track is held by a unique index.

## Findings introduced by this branch

### apps/pragma/site/src/components/organisms/TakeUploadForm.tsx:196

Bullet: "`reviewer` checks that a boolean name is not negated, because `isNotReady` reads as a double negative inside a `!`."

```tsx
[state.canSubmit, state.isSubmitting, state.values.file === null] as const
...
{([canSubmit, isSubmitting, hasNoFile]) => (
```

`hasNoFile` is a negated boolean name. Select `state.values.file !== null` as `hasFile` and write `disabled={!canSubmit || isSubmitting || !hasFile}`.

Introduced: by this branch (new file). Round 1 sealed the file with this line in it.
Fix size: one line, two expressions.

### apps/pragma/VOCABULARY.md:491

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, which is prose against code and therefore nothing a rule can do." Also: "`reviewer` checks that an invariant promising behaviour carries a `Held by:` line, …"

```markdown
## Deezer track

The Deezer recording a catalogue song is linked to. ...
- Nullable. A song typed in by hand names no track until someone links it,
```

`4a96f53f` and `1358a417` made the Deezer track belong to at most one catalogue song (`song_deezer_track_id_unique` at `api/src/songs/songs.schema.ts:44`). A create or an update that names a track another song holds is refused with 409 `deezer-track-taken` and names that song (`songs.controller.ts:49-54,70-78`). Neither the *Deezer track* nor the *Song* entry says so. Add the rule to *Deezer track*, with `Held by:` lines naming `api/src/songs/songs.controller.test.ts` › "refuses a second song naming a Deezer track another song holds, and names the holder" and › "refuses moving a song onto a Deezer track another song holds, and lets a song keep its own". Both tests exist, at lines 263 and 288.

Introduced: by this branch.
Fix size: one file, about four lines.

## Findings that predate this branch

### apps/pragma/VOCABULARY.md:22

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, …"

```markdown
- Only a picked search result is accepted: `suggestionCreateSchema` is
  `.strict()` and takes an `mbid` and nothing else, so no free text the
  band has not seen can ever be displayed.
- An `mbid` already in the catalogue resolves to that song; an unknown one
```

`suggestionCreateSchema` takes `trackId` (`api/src/audience/audience.schema.ts:54-56`), and `acceptSuggestion` resolves it through `resolveCatalogueSongForTrack`, a Deezer lookup. Replace `mbid` with the Deezer track id in both lines.

Introduced: pre-existing. The schema already took `trackId` at `abdee6af`. The branch's edits to this file are elsewhere.
Fix size: two lines.

### apps/pragma/VOCABULARY.md:600

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, …"

```markdown
- The row holds `id` and `name` only. `name` is `NOT NULL` and defaults
```

`setlistTable` also holds `kind`, `status` and `targetSongCount` (`SETLIST_PROJECTION`, `api/src/setlists/setlists.repository.ts:18-24`), and later lines of the same entry describe `kind`. Drop "only", or list the columns.

Introduced: pre-existing. This branch added a bullet to the same entry.
Fix size: one line.

### apps/pragma/api/src/setlists/setlists.repository.ts:116

Bullet: "`reviewer` checks that a rule about rows another request can write, or state another process holds, is held by a primary key or a single conditional write rather than by a check over rows read earlier."

```ts
async function attachAtEnd(
  executor: DatabaseExecutor,
  sessionId: string,
  setlistId: string,
): Promise<void> {
  const [row] = await executor
    .select({ highest: max(sessionSetlistTable.position) })
    ...
      position: selectNextLinkPosition(row?.highest ?? null),
```

The rule "a setlist joining a session lands one past the highest position already taken" (VOCABULARY *Session setlist link*, line 634) is decided from a `max` read earlier. Nothing claims the session, so two setlists attached to one session at the same moment get the same position. On Aurora DSQL two inserts of different keys do not conflict. This is the shape round 1 reported on `appendEntry`, which the branch fixed with `claimSetlistWithin`. The branch's new `insertAudienceChoiceSetlist` (line 236) is one more caller, so a first voting round and a setlist created for the same concert at the same moment collide. To fix it, write a row the session owns before reading `max`, as `claimSetlistWithin` does for entries, and add a `Held by:` line under *Session setlist link*.

Introduced: pre-existing (`attachAtEnd` and its two callers `insertSetlist` and `insertSessionLink`). This branch added the third caller, `insertAudienceChoiceSetlist`.
Fix size: one file plus a concurrency test. The claim needs a row keyed on the session, which the setlists slice reaches through the sessions service.

### apps/pragma/api/src/audience/audience.repository.ts:10

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
export interface VotingRoundRow {
  id: string;
  sessionId: string;
  openedAt: Date;
  closesAt: Date;
  settledAt: Date | null;
  winningSongId: string | null;
}
```

`VotingRoundRow` is exactly `typeof votingRoundTable.$inferSelect` (`audience.schema.ts:5-12`). `AudienceVoteRow`, `RoundInsertShape`, `VoteInsertShape` and `SuggestionInsertShape` (lines 19-43) are hand-written `Pick`s and `$inferInsert` shapes of the same three tables. Derive them the way round 1's fix did for `MemberRow` and `SessionRow`.

Introduced: pre-existing. The branch's diff on this file adds `insertRoundWithin` and `findOpenRoundOfConcertWithin` and leaves the types alone.
Fix size: one file, types only, no callers change.

### apps/pragma/api/src/setlists/setlist-entry.repository.ts:13

Bullet: same as above.

```ts
export interface SetlistEntryRow {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  lineupOverride: LineupOverride | null;
```

`SetlistEntryRow` is `typeof setlistEntryTable.$inferSelect` (already named `SetlistEntryRawRow` at line 36) with `lineupOverride` decoded. `EntryInsertShape` (line 25) is the matching insert shape. Use `Omit<SetlistEntryRawRow, 'lineupOverride'> & { lineupOverride: LineupOverride | null }`, as `songs.repository.ts:45` now does for `SongRow`.

Introduced: pre-existing. The branch's diff on this file turns four functions into `…Within(executor, …)` and leaves the types alone.
Fix size: one file, types only.

### apps/pragma/site/src/lib/queries/members.queries.ts:65

Bullet: same as above.

```ts
mutationFn: async (variables: {
  firstName: string;
  color: string;
  avatarS3Key?: string | null;
}) => {
```

These are the `POST /api/members` body, written out by hand. The same holds for the `PUT /:id` body at line 113. `songs.queries.ts:29-32` and `sessions.queries.ts:54,95` derive theirs with `Parameters<typeof api.api.members.$post>[0]['json']`.

Introduced: pre-existing. The branch's diff on this file exports `ListedMember` (line 25) only.
Fix size: one file, two type annotations.

## Sealed

- apps/pragma/api/src/__test/test-seed.service.ts — `SongCreateInput` is derived from `createSong`.
- apps/pragma/api/src/audience/audience.service.ts — `openRound` claims the audience-choice setlist row, then re-checks for an open round, in one retried transaction. The check-then-insert is serialised by that write.
- apps/pragma/api/src/helpers/persistence/conflict-abort.core.ts — `.core.ts` matches the `helper-module` blueprint and its pragma siblings. See *Outside the checklist*.
- apps/pragma/api/src/members/members.repository.ts — `MemberRow` and `MemberPersistedShape` are now derived.
- apps/pragma/api/src/notifications/notifications.core.ts
- apps/pragma/api/src/notifications/notifications.service.ts
- apps/pragma/api/src/sessions/sessions.controller.ts
- apps/pragma/api/src/sessions/sessions.repository.ts — the repository opens the cascade transaction, which `11-database.md` *Transactions* names as the accepted shape.
- apps/pragma/api/src/sessions/sessions.service.ts
- apps/pragma/api/src/setlists/setlists.core.ts
- apps/pragma/api/src/setlists/setlists.service.ts — append, delete-and-compact and reorder each claim the setlist row first, inside `runInOneSetlistTransaction`. `findOrCreateAudienceChoiceSetlist` is now held by the primary key through the deterministic id.
- apps/pragma/api/src/songs/songs.controller.ts
- apps/pragma/api/src/songs/songs.repository.ts — `SongRow` is derived from `$inferSelect`.
- apps/pragma/api/src/songs/songs.schema.ts — the unique index on `deezer_track_id` holds "one song per track". NULLs stay distinct, so songs without a track are unaffected.
- apps/pragma/api/src/songs/songs.service.ts — `refuseTakenDeezerTrack` reads the holder only after the unique violation, and `importSuggestedSong` falls back to the winner on a lost insert race.
- apps/pragma/api/src/studies/studies.service.ts
- apps/pragma/api/src/takes/takes.core.ts — see *Outside the checklist* for its blueprint marker.
- apps/pragma/api/src/takes/takes.repository.ts — `commentCount` comes from `count()` with `groupBy`.
- apps/pragma/api/src/takes/takes.service.ts
- apps/pragma/api/src/tasks/tasks.service.ts
- apps/pragma/api/src/transitions/transitions.controller.ts
- apps/pragma/api/src/transitions/transitions.service.ts
- apps/pragma/domain/take-upload.core.ts — one extension table, read by both sides.
- apps/pragma/site/src/components/molecules/DeezerTrackTakenNotice.tsx
- apps/pragma/site/src/components/organisms/AccountSettings.tsx
- apps/pragma/site/src/components/organisms/CalendarFeedCard.tsx — `calendarFeedHint` says where the address is found, which the screen cannot show.
- apps/pragma/site/src/components/organisms/ContactDetailsCard.tsx
- apps/pragma/site/src/components/organisms/InstallWalkthroughSheet.tsx
- apps/pragma/site/src/components/organisms/NotificationSettings.tsx
- apps/pragma/site/src/components/organisms/PasskeysCard.tsx
- apps/pragma/site/src/components/organisms/PasswordChangeCard.tsx
- apps/pragma/site/src/components/organisms/RecordingSheet.tsx
- apps/pragma/site/src/components/organisms/SessionDetail.tsx
- apps/pragma/site/src/components/organisms/SignedInMemberCard.tsx
- apps/pragma/site/src/components/organisms/SongChartPreviews.tsx
- apps/pragma/site/src/components/organisms/SongDetail.tsx
- apps/pragma/site/src/components/organisms/SongDetailHeader.tsx
- apps/pragma/site/src/components/organisms/SongEditForm.tsx — uses `useForm`.
- apps/pragma/site/src/components/organisms/SongLinksCard.tsx
- apps/pragma/site/src/components/organisms/SongNotesCard.tsx
- apps/pragma/site/src/components/organisms/SongTakes.tsx — upload is an icon button with `aria-label` and `title`.
- apps/pragma/site/src/components/organisms/TakePlayer.tsx — renders the API's comment order.
- apps/pragma/site/src/components/organisms/notifications-offer.core.ts
- apps/pragma/site/src/components/organisms/recording-sheet.core.ts
- apps/pragma/site/src/components/organisms/take-player.core.ts
- apps/pragma/site/src/components/organisms/take-upload-form.core.ts
- apps/pragma/site/src/lib/api.client.ts
- apps/pragma/site/src/lib/device.utils.ts
- apps/pragma/site/src/lib/display-mode.adapter.ts
- apps/pragma/site/src/lib/install-offer.utils.ts
- apps/pragma/site/src/lib/install-prompt.adapter.ts
- apps/pragma/site/src/lib/push-subscription.adapter.ts
- apps/pragma/site/src/lib/queries/sessions.queries.ts
- apps/pragma/site/src/lib/queries/song-save-refusal.core.ts — the 409 body arrives as `unknown` on `ApiError` and is parsed with Zod.
- apps/pragma/site/src/lib/queries/song-write-failure.core.ts
- apps/pragma/site/src/lib/queries/songs.queries.ts — the update reconciles from its response and does not refetch.
- apps/pragma/site/src/lib/recorder.adapter.ts
- apps/pragma/site/src/lib/recorder.core.ts — pure now.
- apps/pragma/site/src/lib/take-queue.core.ts — `SignedTakeUpload` and `TakeCreateBody` come from the Hono client.
- apps/pragma/site/src/lib/take-queue.setup.ts
- apps/pragma/site/src/observability/error-reporting.adapter.ts
- apps/pragma/site/src/routes/account/AccountPage.tsx — composes one organism.
- apps/pragma/site/src/routes/catalog/SongDetailPage.tsx
- apps/pragma/site/src/routes/catalog/SongEditPage.tsx
- apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx

## Unclear

- None.

## Outside the checklist

- `conflict-abort.core.ts` holds SQLSTATE classification, which no member of the band would recognise. Standard 02 *Choosing between core and utils* gives `api/src/helpers/calendar/paris-clock.utils.ts` as the shape for a cross-cutting helper. The `helper-module` blueprint (`last-loop-lepin/api/src/helpers/sun/sun.core.ts`) and every file under `pragma/api/src/helpers/` use `.core.ts`. The file follows the blueprint, so it is sealed. The standard and the blueprint disagree, and that is logged as kaizen.
- `takes.core.ts:27` marks `orderCommentsByTime` as `@FollowsBlueprint core-canonical-ordering`. That blueprint (`bars/bar-support.core.ts:13`) rebuilds a stored set by filtering a declared order. This function sorts comments by time and id. `core-decision` or no marker fits better. The marker predates round 1, which sealed it.
- `tasks.service.ts:54` relies on `getMemberById` in `members.service.ts:17` returning `null`. That is the `get…`-returns-null shape round 1 fixed for songs, sessions and transitions. `members.service.ts` is not in this branch's diff, so it is not reviewed here.
- `TakeUploadForm.tsx:42-46` `QUEUE_FAILURE_KEY` and `recording-sheet.core.ts:59-63` `NOT_SAVED_MESSAGE` are the same reason-to-message table, written twice on the site.
- In the denied state, `RecordingSheet.tsx:178-183` offers "upload instead" as an icon plus label inside the dialog. It is a fallback inside a sheet rather than a toolbar create action, so it was not reported.
- `members.repository.ts:57-65` types `rowToMemberInstrument`'s argument inline, and that type mirrors `INSTRUMENT_PROJECTION`. It is a join projection with no `$inferSelect`, so it was not reported.
- `push-subscription.adapter.ts:4` imports `NotificationPermissionState` from `components/organisms/notifications-offer.core`. A `lib/` adapter depends on an organism's core file.
