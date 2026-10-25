# Standards review — claude/pragma-takes-and-push against origin/main

Verdict: FINDINGS
Ledger: 3843abb31417
Reviewed: 76 file(s). Sealed: 52. Findings: 18, on 24 unsealed file(s) (12 introduced by this branch, 6 pre-existing).

Merge-base `abdee6af`, head `92360fb6`. Every reviewable file was read in full, including the install banner commits `28f5433c` and `92360fb6`. Seals are recorded under `standards-reviewer`. The 375 px bullet was not re-run here: [`visual-validation-2026-10-24-0102.md`](./visual-validation-2026-10-24-0102.md) and the install-banner screenshots cover it.

## Findings introduced by this branch

### apps/pragma/api/src/takes/takes.repository.ts:74

Bullet: "`reviewer` checks that a repository returns rows, arrays and counts rather than a shape it derived, because a repository that projects is a service."

```ts
async function withCommentCounts(takes: readonly TakeRow[]): Promise<TakeView[]> {
  const commentCounts = await countCommentsOfTakes(takes.map((take) => take.id));
  return takes.map((take) => ({ ...take, commentCount: commentCounts.get(take.id) ?? 0 }));
}
```

The repository merges two query results in JavaScript and defaults a missing count to 0, so `findTake` and `listTakesOfSongNewestFirst` return a shape the database never produced. Either return the count from SQL (a `leftJoin` on `take_comment` with `count()` and `groupBy`), or return the rows and the count map separately and merge them in `takes.core.ts`.

Introduced: by this branch (new file).
Fix size: one file, no callers change.

### apps/pragma/site/src/lib/recorder.core.ts:56

Bullet: "`reviewer` checks that a file name says what the file holds, because the suffix table is a convention no rule reads."

```ts
// @FollowsBlueprint core-decision
export function beginRecording(
  environment: RecordingSurroundings,
  capture: MicrophoneCapture,
  onInterrupted: (outcome: RecordingOutcome) => void,
): ActiveRecording {
```

`beginRecording` starts the recorder, registers and removes a `visibilitychange` listener, collects chunks into a mutable array and settles promises. That is impure orchestration, not the pure decision a `.core.ts` promises (02, *What counts as pure*), and it is not a `core-decision`. Move it into `recorder.adapter.ts` beside `startRecording`, which is its only caller, and keep the types and `isPermissionRefusal` in the core.

Introduced: by this branch (new file).
Fix size: one function moves between two files, plus its test.

### apps/pragma/site/src/lib/push-subscription.adapter.ts:93

Bullet: "`reviewer` checks that a file name says what the file holds, because the suffix table is a convention no rule reads."

```ts
export function readInstallContext(
  environment: DisplayEnvironment = readBrowserDisplayEnvironment(),
): InstallContext {
```

Display-mode and install detection (`DisplayEnvironment`, `InstallContext`, `readBrowserDisplayEnvironment`, `readInstallContext`, lines 32–42, 71–100) live in the push-subscription adapter. `28f5433c` exported them so that `install-prompt.adapter.ts:9-13` could import install concerns from a file named after push. The same applies to `isIosDevice` at `apps/pragma/site/src/components/organisms/notifications-offer.core.ts:17`, which `lib/install-offer.utils.ts:3` imports from an organism's notification core. Move the display and device detection into `install-prompt.adapter.ts` (and `isIosDevice` into `install-offer.utils.ts`). `NotificationSettings.tsx` and `push-subscription.adapter.ts` then import from there.

Introduced: by this branch (`ebd87ddd` placed them, `28f5433c` made the install slice depend on them).
Fix size: two moves, 3 call sites across 3 files plus tests.

### apps/pragma/site/src/components/organisms/recording-sheet.core.ts:159

Bullet: "`reviewer` checks that a limit or a rule written in a site does not restate one the API enforces under another name, because the lint rule above only compares names."

```ts
const TAKE_FILE_EXTENSION: Record<TakeContentType, string> = {
  'audio/mp4': 'm4a',
```

This is the content-type-to-extension table the API holds as `EXTENSION_BY_CONTENT_TYPE` at `apps/pragma/api/src/takes/takes.core.ts:5`, under a different name, and the two already disagree: the API maps `audio/mp4` to `mp4`. Put one table in `apps/pragma/domain/take-upload.core.ts` and have both sides read it.

Introduced: by this branch.
Fix size: one table moves to `domain/`, 2 readers.

### apps/pragma/site/src/components/organisms/take-player.core.ts:55

Bullet: "`reviewer` checks that a limit or a rule written in a site does not restate one the API enforces under another name, because the lint rule above only compares names."

```ts
export function orderThread<TComment extends MomentComment>(
```

This is the same rule as `orderCommentsByTime` at `apps/pragma/api/src/takes/takes.core.ts:39` (oldest first, tie broken on id), written a second time under another name. Move `orderCommentsByTime` to `domain/`, where both sides can read it, or drop the site-side sort and keep the API's order: the list arrives sorted and `appendCommentOnce` appends the newest comment at the end.

Introduced: by this branch.
Fix size: one function, 2 files.

### apps/pragma/site/src/lib/take-queue.core.ts:114

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
export interface TakeCreateBody {
  readonly id: string;
  readonly objectKey: string;
```

`TakeCreateBody` is the `POST /api/takes` body (`takeCreateSchema`), written out by hand. `SignedTakeUpload` at line 9 does the same for the `/sign` response. Derive both from the Hono client, as `notifications.queries.ts:21` already does (`Parameters<typeof api.api.takes.$post>[0]['json']`, `InferResponseType<typeof api.api.takes.sign.$post, 200>`), with a type-only import.

Introduced: by this branch.
Fix size: one file, plus the type imports in `takes.queries.ts` and `take-queue.store.ts`.

### apps/pragma/site/src/observability/error-reporting.adapter.ts:54

Bullet: "`reviewer` checks that a derived type is derived, …"

```ts
export interface TakeUploadFailure {
  readonly stage: 'sign' | 'put' | 'create';
  readonly status: number | null;
}
```

This restates `TakeStepFailure` from `lib/take-queue.core.ts:34`. Use that type.

Introduced: by this branch.
Fix size: one line.

### apps/pragma/site/src/components/organisms/take-upload-form.core.ts:99

Bullet: "`reviewer` checks that a derived type is derived, …"

```ts
export type TakeQueueing = 'queued' | 'quota-exceeded' | 'failed' | 'unplayable';
```

This is a third hand-written copy of `QueueTakeOutcome` (`lib/take-queue.setup.ts:58`). The other copy is `QueueingResult = 'queued' | NotSavedReason` at `recording-sheet.core.ts:121`. Define the union once, in `take-queue.core.ts`, and derive the other two from it.

Introduced: by this branch.
Fix size: one type, 3 files.

### apps/pragma/site/src/components/organisms/SongTakes.tsx:59

Bullet: "`reviewer` checks that no new page subtitle, field hint or button label explains the interface: a create action is an icon button with an `aria-label`, and a sentence survives only for what the screen cannot show."

```tsx
<Button variant="default" onClick={() => setIsUploadOpen(true)}>
  <Icon name="upload" size={14} />
  {t('takes.upload')}
</Button>
```

Uploading a take is a create action, rendered here as icon plus label, which is the *Don't* shape in 05. The same applies to the non-compact Record button at `RecordingSheet.tsx:132-141` (`{isCompact ? null : t('takes.record')}`). Its compact form, icon only with `aria-label`, is already the right one. Make both icon buttons (`size="icon"`, with `aria-label` and `title`).

Introduced: by this branch.
Fix size: 2 call sites across 2 files.

### apps/pragma/site/src/components/organisms/NotificationSettings.tsx:35

Bullet: "`reviewer` checks that no new page subtitle, field hint or button label explains the interface: … a sentence survives only for what the screen cannot show."

```ts
offer: 'notifications.offer',
```

`notifications.offer` reads "Get a notification on this device when the band posts a take, comments on one, or changes a session or a setlist." The category toggles rendered directly below (`CategoryToggles`) already list those four things. The `install.intro` sentence at `InstallWalkthroughSheet.tsx:69` ("Do this once. pragma then opens from your home screen, full screen, and can send you notifications.") repeats the banner the member has just tapped (`install.banner`). Drop both sentences. The `denied`, `unsupported`, `installHint` and step captions stay, because they describe things the screen cannot show.

Introduced: by this branch.
Fix size: 2 lines across 2 files, plus 4 catalogue entries.

### apps/pragma/VOCABULARY.md:744

Bullet: "`reviewer` checks that an invariant promising behaviour carries a `Held by:` line, because telling a promise from a definition is reading prose."

```markdown
- The id is chosen by the device that recorded it, so a create retried
  after a lost answer lands on the same row (`hasInsertedTake`).
```

None of the four terms this branch adds (*Notification preference* 429, *Push subscription* 440, *Take* 738, *Take comment* 761) carries a `Held by:` line. Each one promises behaviour: a retried create lands on the same row, a create naming another key is refused, any member can delete any take, a missing preference reads as enabled, a re-subscribing device replaces its row, a gone endpoint is deleted. `takes.controller.test.ts` already holds an `object-key-mismatch` case that one line could name. The whole file has no `Held by:` line (logged as kaizen), but the new entries are this branch's.

Introduced: by this branch, for the four new terms.
Fix size: one file, about ten lines.

### apps/pragma/site/src/routes/account/AccountPage.tsx:106

Bullet: "`reviewer` checks that a route composes organisms and owns no layout primitive, because the atomic rules read the bucket out of the path and a route is in no bucket."

```tsx
<Card className="p-4 sm:p-6">
  <NotificationSettings />
</Card>
```

The branch adds another `Card` wrapper in a route. The rest of the page already does the same, with `Card`, `h1`, `h2` and `p` around every section (pre-existing). Let `NotificationSettings` own its card. The other cards are a separate, pre-existing refactor.

Introduced: by this branch for lines 106–108; pre-existing for the rest of the page.
Fix size: one line for this branch's part; the full page is one route plus 4 organisms.

## Findings that predate this branch

### apps/pragma/api/src/songs/songs.service.ts:60

Bullet: "`reviewer` checks the half of the verb table the rule above cannot reach: that a `find…` actually returns `null` rather than throwing, that a `get…` throws, …"

```ts
export async function getSongById(id: string): Promise<SongRow | null> {
```

A `get…` that returns `null`. The same holds for `getSessionById` at `apps/pragma/api/src/sessions/sessions.service.ts:47` and `getTransitionComment` at `apps/pragma/api/src/transitions/transitions.service.ts:17`. This branch adds new callers that depend on the `null` (`takes.service.ts:44,59,73,134`, `transitions.service.ts:29`). Rename them to `findSongById`, `findSessionById` and `findTransitionComment` at the service level.

Introduced: pre-existing. The branch's diff on these files adds notification calls and new reliance on the `null` return.
Fix size: about 25 call sites across 10 files.

### apps/pragma/api/src/sessions/sessions.repository.ts:9

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, …"

```ts
export interface SessionRow {
  id: string;
  kind: string;
```

These are hand-written row types beside a Drizzle table. The same holds for `MemberRow` and `MemberPersistedShape` at `apps/pragma/api/src/members/members.repository.ts:26,98`, and for `SongRow`, `SongInsertShape` and `SongRawRow` at `apps/pragma/api/src/songs/songs.repository.ts:30,55,80`. `SongRawRow` is exactly `typeof songTable.$inferSelect`.

Introduced: pre-existing. The branch's diff touched one import and one line in each `deleteXWithCascade`.
Fix size: 3 files, types only, no callers change.

### apps/pragma/api/src/setlists/setlists.service.ts:137

Bullet: "`reviewer` checks that a rule about rows another request can write … is held by a primary key or a single conditional write rather than by a check over rows read earlier."

```ts
export async function findOrCreateAudienceChoiceSetlist(sessionId: string): Promise<SetlistRow> {
  const existing = await findAudienceChoiceSetlistOfSession(sessionId);
  if (existing !== null) return existing;
```

The rule "one audience-choice setlist per concert" is decided from a read, so two first rounds opened together create two setlists. The same file has two more cases of the same kind. `appendEntry` (213) takes its position from `listEntries(...).length`, so two concurrent appends get the same position. `reorderEntries` (265) checks staleness and then writes positions one by one, outside any transaction.

Introduced: pre-existing. The branch's diff on this file adds `notifyBand` calls only.
Fix size: needs a claim row or a conditional write per rule, one file plus the schema.

### apps/pragma/api/src/songs/songs.service.ts:173

Bullet: same as above.

```ts
const known = findCatalogueMatch(await getSongs(), read.track);
if (known !== null) return { kind: 'ok', song: known };
return { kind: 'ok', song: await importSuggestedSong(read.track) };
```

"One catalogue song per Deezer track" is decided from a read, so two concurrent suggestions of the same unknown track import two songs.

Introduced: pre-existing.
Fix size: needs a key on the track identity, one slice plus a migration.

### apps/pragma/site/src/routes/catalog/SongDetailPage.tsx:198

Bullet: "`reviewer` checks that a route composes organisms and owns no layout primitive, …"

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
```

The route lays out the page itself: the header block, the grid, and the `Card`s at 201, 221 and 255. The same holds for `apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx:166` (`<h3 …>{t('sessions.setlists')}</h3>`) and its `section` container. This branch only adds organisms to both pages (`SongTakes`, `PracticeRecordingList`).

Introduced: pre-existing. The branch's diff on these files adds one organism each.
Fix size: one route plus several new organisms each.

### apps/pragma/VOCABULARY.md:216

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, which is prose against code and therefore nothing a rule can do."

```markdown
  (`selectUpcomingConcerts` in `site/src/lib/upcoming-concerts.core.ts`).
```

That file does not exist. The function lives in `domain/upcoming-concerts.core.ts`, which `SessionDetailPage.tsx:11` imports. The *Song* (691) and *Session* (574) cascade lines also predate takes and are now incomplete: deleting a song deletes its takes, and deleting a session detaches them.

Introduced: pre-existing (line 216); incomplete since this branch (691, 574).
Fix size: 3 lines, one file.

## Sealed

- apps/pragma/api/src/__test/test-seed.repository.ts — `deleteAllDomainRows` wipes many tables without a transaction. Judged outside the transaction bullet: it is a test-only reset, mounted only under `ALLOW_TEST_SEED`.
- apps/pragma/api/src/__test/test-seed.service.ts
- apps/pragma/api/src/app.ts
- apps/pragma/api/src/database/schema.ts
- apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts
- apps/pragma/api/src/helpers/observability/product-event.adapter.ts
- apps/pragma/api/src/notifications/notifications.controller.ts
- apps/pragma/api/src/notifications/notifications.core.ts
- apps/pragma/api/src/notifications/notifications.repository.ts — `hasClaimedDispatch` is a compare-and-set on `last_sent_at`, and the first send is a primary-key insert. The grouping window is held by single conditional writes.
- apps/pragma/api/src/notifications/notifications.schema.ts
- apps/pragma/api/src/notifications/notifications.service.ts
- apps/pragma/api/src/notifications/web-push.adapter.ts
- apps/pragma/api/src/sessions/sessions.controller.ts
- apps/pragma/api/src/setlists/setlists.controller.ts
- apps/pragma/api/src/songs/song-lineup.core.ts
- apps/pragma/api/src/songs/songs.controller.ts
- apps/pragma/api/src/takes/takes.controller.ts
- apps/pragma/api/src/takes/takes.core.ts
- apps/pragma/api/src/takes/takes.schema.ts
- apps/pragma/api/src/takes/takes.service.ts — its reliance on `getSongById` returning `null` is reported on the definition.
- apps/pragma/api/src/takes/takes.types.ts — row types derived from `$inferSelect`.
- apps/pragma/api/src/transitions/transitions.controller.ts
- apps/pragma/api/src/uploads/uploads.adapter.ts — the Stryker disable comment at line 21 gives a reason a reader can check.
- apps/pragma/api/src/uploads/uploads.service.ts
- apps/pragma/cdk/lib/stack.ts
- apps/pragma/domain/take-upload.core.ts
- apps/pragma/site/src/components/atoms/Icon.tsx
- apps/pragma/site/src/components/molecules/InstallBanner.tsx
- apps/pragma/site/src/components/molecules/InstallPhoneScreen.tsx
- apps/pragma/site/src/components/organisms/AppShell.tsx
- apps/pragma/site/src/components/organisms/InstallOffer.tsx
- apps/pragma/site/src/components/organisms/PracticeRecordingList.tsx
- apps/pragma/site/src/components/organisms/TakeList.tsx
- apps/pragma/site/src/components/organisms/TakePlayer.tsx — the `media-has-caption` disable gives a reason a reader can check.
- apps/pragma/site/src/components/organisms/TakeUploadForm.tsx — uses `useForm`.
- apps/pragma/site/src/components/organisms/install-prompt.hook.ts
- apps/pragma/site/src/components/organisms/take-list.core.ts
- apps/pragma/site/src/lib/install-offer.utils.ts
- apps/pragma/site/src/lib/install-prompt.adapter.ts — its import from the push adapter is reported on that file.
- apps/pragma/site/src/lib/object-upload.adapter.ts
- apps/pragma/site/src/lib/queries/notifications.queries.ts — the optimistic preference write settles from its response and does not refetch.
- apps/pragma/site/src/lib/queries/notifications.utils.ts
- apps/pragma/site/src/lib/queries/takes.queries.ts — the optimistic deletes do not refetch, and the comment create settles from its response.
- apps/pragma/site/src/lib/queries/takes.utils.ts
- apps/pragma/site/src/lib/recorder.adapter.ts
- apps/pragma/site/src/lib/second-clock.store.ts
- apps/pragma/site/src/lib/take-queue.adapter.ts
- apps/pragma/site/src/lib/take-queue.setup.ts
- apps/pragma/site/src/lib/take-queue.store.ts
- apps/pragma/site/src/lib/vapid-key.utils.ts
- apps/pragma/site/src/main.tsx
- apps/pragma/site/src/routes/catalog/take-selection.hook.ts

## Unclear

- None.

## Outside the checklist

- `takes.service.ts:73-86` checks that the song exists and then inserts the take. A song deleted between those two steps leaves an orphan take row and its audio. The *Task* entry in `VOCABULARY.md` documents the same check-then-write for referential existence, so this report treats it as the accepted pattern rather than a finding.
- `InstallOffer.tsx` claims `molecule-local-state` but sits in `organisms/` and holds two flags plus an external store. `TakePlayer.tsx:35` restates the API's `commentBodySchema` (trim, non-empty, max) as `commentFormSchema`. The limit itself comes from `domain/`.
- `takes.repository.ts`, `takes.service.ts`, `notifications.repository.ts` and `notifications.service.ts` have no sibling `*.test.ts`. Their behaviour is covered from the controller and fan-out suites.
- `docs/standards/11-database.md` says no application has a cross-slice cascade. In pragma, the songs, sessions and members repositories call other slices' services inside their own transactions. This branch adds two more cases of that shape (takes and push state), so the standard and the tree disagree.
