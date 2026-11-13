# Technical validation — Members sketch a composition from passages of songs they love

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/brave-newton-1eeenf
- Base: origin/main. This round reads `git diff 946bb2729fac354d84d221aa05b029a9bc50883e..HEAD` only (`git rev-list --merges` over that range prints nothing)
- Run at: 2026-11-13T22:55:14Z
- Round: 2
- Reviewed: d98b2315eb82bb2635cc4920045fab048ea8253e
- Touched workspaces: @borso-app/pragma (api, domain, site)

The range holds two commits. `24d78ee73` adds the round-1 report and nothing else. `d98b2315e` fixes the two round-1 blocking findings, five non-blocking ones and the five Notes. Its message dismisses no finding, so no dismissal row is due. The fix commit carries one file round 1 never read, `site/src/components/organisms/InspirationList.tsx`, the extraction asked for by B13. It was read in full against categories A, B and D. The working tree was clean at the reviewed SHA, so tests ran on the commit itself.

No use case is newly routed to /visual-validation in this round. The 10 routed in round 1 stay out of scope.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Error case "lane of another song" (round-1 A15) | A refused lane deletion leaves every clip in place | apps/pragma/api/src/sketches/sketches.repository.ts:126-130 | `.where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.songId, songId)))` … `if (deleted.length === 0) return false;` `await transaction.delete(sketchClipTable).where(eq(sketchClipTable.laneId, laneId));` | PASS |
| A02 | Round-1 Note 3 (song-scoped read-back) | A placement retried with a clip id already used under another song is refused and touches nothing | apps/pragma/api/src/sketches/sketches.repository.ts:147-158; sketches.service.ts:92-93 | `.innerJoin(sketchLaneTable, eq(sketchLaneTable.id, sketchClipTable.laneId))` `.where(and(eq(sketchClipTable.id, clipId), eq(sketchLaneTable.songId, songId)))` … `if (clip === null) return refuse('clip-not-found');` | PASS |
| A03 | Q "Where does the sound come from?", owner-blocked fallback extended to a failed script (round-1 Note 4) | The player offers "Open on YouTube" when the iframe API script fails to load | apps/pragma/site/src/lib/youtube-player.adapter.ts:99-101, 163 | `script.addEventListener('error', () =>` `reject(new Error('the YouTube iframe API did not load')),` … `}, events.onBlocked);` | PASS |
| A04 | Round-1 Note 5 | A YouTube Music link embeds | apps/pragma/site/src/lib/embed.utils.ts:144-145 | `const youtube = youtubeEmbed(sourceUrl);` `if (youtube !== null) return youtube;` (the host list is gone; `parseYoutubeVideoId` holds the hosts) | PASS |
| A05 | Round-1 Note 2 | An edit or delete refused with `inspiration-not-found` reloads the list instead of restoring the snapshot; any other failure still restores | apps/pragma/site/src/lib/queries/inspirations.queries.ts:66-77 | `const isDeletedMeanwhile = isInspirationDeletedMeanwhile(error);` `if (!isDeletedMeanwhile) {` `restoreList(queryClient, snapshot);` … `void queryClient.invalidateQueries({ queryKey: inspirationKeys.list() });` | PASS |
| A06 | Library screen (round-1 B13) | The library list moves into an organism with no change of markup | apps/pragma/site/src/components/organisms/InspirationList.tsx:23-32; InspirationsPage.tsx:96-100 | `<ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t('inspirations.title')}>` … `<InspirationList` `inspirations={inspirations}` `onEdit={editInspiration}` `onDelete={setPendingDeletionId}` | PASS |
| A07 | Passage rules | `parseYoutubeVideoId` keeps the anchored id check after `isYoutubeVideoId` was folded in | apps/pragma/domain/inspiration.core.ts:3, 50 | `export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;` … `return readCandidateVideoId(address)?.match(YOUTUBE_VIDEO_ID_PATTERN)?.[0] ?? null;`. The pattern is anchored, so `match()[0]` is the whole candidate or nothing. `grep -rn isYoutubeVideoId apps/pragma` prints nothing, so no caller is left | PASS |
| A08 | Plan | Plan present | docs/features/pragma/composition-inspirations/plan/plan.md | read in round 1; the fix commit changes no planned file list | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A15 (blocking). `DELETE /api/sketches/<songA>/lanes/<lane of songB>` answered `lane-not-found` and deleted songB's clips | `d98b2315e` apps/pragma/api/src/sketches/sketches.repository.ts:128 `if (deleted.length === 0) return false;` runs before the clip delete. Pinned by `it('refuses to delete a lane of another song and leaves its clips'` (sketches.controller.test.ts:293), whose `expect(otherSketch.clips.map((clip) => clip.id)).toEqual([otherClipId]);` (:312) would fail on the round-1 code, which deleted that clip (inferred from the removed line). The test ran green in C02 | PASS |
| R02 | C03 (blocking). 14 surviving mutants | `d98b2315e`. `scripts/mutate-changed.sh 946bb2729fac354d84d221aa05b029a9bc50883e apps/pragma` exits 0, `Final mutation score of 100.00`, 0 survivors across 10 files, including `domain/inspiration.core.ts` (67 killed), `inspiration-form.core.ts`, `sketch-refusal.core.ts`, `embed.utils.ts`, `youtube-player.adapter.ts` and `sketch-timeline.core.ts`. The real gap round 1 named is closed by `expect(selectPassageRefusal({ startSeconds: 400, endSeconds: 700 })).toBeNull();` (inspiration.core.test.ts:44) | PASS |
| R03 | B02 (non-blocking) | `{DETAIL_SEPARATOR}` at InspirationCard.tsx:34, one constant exported from inspirations-page.core.ts and reused by sketch-timeline.core.ts:157; `rel: PLAYER_FLAG_OFF` at youtube-player.adapter.ts:125 | PASS |
| R04 | B04 (non-blocking) | `readSketch` (sketches.service.ts:41) and `listInspirationViewsNewestFirst` (inspirations.service.ts:49) | PASS |
| R05 | B11 (non-blocking) | `type InspirationsListResponse = InferResponseType<typeof api.api.inspirations.$get, 200>;` (inspiration-cache.core.ts:6) and `type SketchResponse = InferResponseType<(typeof api.api.sketches)[':songId']['$get'], 200>;` (sketch-cache.core.ts:6) | PASS |
| R06 | B13 (non-blocking) | `<InspirationList` at InspirationsPage.tsx:96 | PASS |
| R07 | B14 (non-blocking) | `"empty": "No lane yet.",` (en.json:710), `"Aucune piste pour l’instant."` in fr.json | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or single-letter locals | read the diff | none found; new names are `recoverListAfterRefusal`, `isDeletedMeanwhile`, `findClipOfSongWithin`, `NEVER_DRAGGED_AT_MS`, `PLAYER_FLAG_OFF` | PASS |
| B02 | Magic numbers and strings named | read the diff | `rel: 0` became `PLAYER_FLAG_OFF`; `' · '` became `DETAIL_SEPARATOR`; no new literal | PASS |
| B03 | No prose comments | read the diff | none added | PASS |
| B04 | Function names describe the result | read the diff | `isInspirationDeletedMeanwhile` returns a boolean; `findClipOfSongWithin` returns `SketchClipRow \| null` (verb table, `find…` returns `null`); `listInspirationViewsNewestFirst` returns `Promise<InspirationView[]>` | PASS |
| B05 | Type assertions only `as const` / `as unknown`; no `any` | `grep -nP '\bany\b\|\bas (?!const\|unknown)\w'` on changed source files | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read the diff | `?.match(YOUTUBE_VIDEO_ID_PATTERN)?.[0] ?? null` (inspiration.core.ts:50); `[number]` index types only in type positions | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <30 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the diff | none added | PASS |
| B10 | Standards checklist: "a derived type is derived … a response from the Hono client" | read inspiration-cache.core.ts and sketch-cache.core.ts in full | both now derive from `InferResponseType` and the `$patch` parameter | PASS |
| B11 | Standards checklist: "a route composes organisms and owns no layout primitive" | read InspirationsPage.tsx and InspirationList.tsx in full | the list's `<ul>` now lives in the organism; InspirationList carries `// @FollowsBlueprint organism-presentational`, holds no state and no query, and takes every value as a prop, as the blueprint `organism-presentational` asks | PASS |
| B12 | Standards checklist: "a `find…` returns `null` … a `get…` throws" | read sketches.repository.ts and sketches.service.ts hunks | `getWrittenClipWithin` (which threw) is removed; `findClipOfSongWithin` returns `clip ?? null`; `readSketch` replaces `getSketch`, which returned a refusal | PASS |
| B13 | Standards checklist: "a test name states the behaviour and the condition" | read the new tests | e.g. `'refuses a placement whose clip id is already a clip of another song, and leaves that clip'`, `'offers YouTube instead when the API script fails to load'` | PASS |
| B14 | Standards checklist: "no new … field hint … explains the interface" | read the i18n diff | `sketch.empty` lost its instruction sentence; no key added | PASS |
| B15 | Standards checklist: "a multi-table write is wrapped in one transaction owned by the service" | read sketches.repository.ts:120-131 | the lane delete and its clip delete stay in one `transaction`; the early `return false` leaves the transaction with nothing written | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 946bb2729fac354d84d221aa05b029a9bc50883e --reporter=verbose --coverage` | 0. 80 files, 467 tests. Coverage 100 % statements (275/275), branches (128/128), functions (91/91), lines (234/234). Ran `domain/inspiration.core.test.ts`, `inspiration-form.core.test.ts`, `inspiration-refusal.core.test.ts`, `sketch-refusal.core.test.ts`, `inspirations.queries.test.tsx`, `embed.utils.test.ts`, `youtube-player.adapter.test.ts`, `sketch-timeline.core.test.ts`, `inspirations-page.core.test.ts` | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed 946bb2729fac354d84d221aa05b029a9bc50883e --reporter=verbose` | 0. 50 files, 480 tests, including the three new `sketches.controller.test.ts` cases | PASS |
| C03 | @borso-app/pragma (mutation) | `scripts/mutate-changed.sh 946bb2729fac354d84d221aa05b029a9bc50883e apps/pragma` | 0. `Final mutation score of 100.00`, 10 files, 0 survived, 0 no coverage | PASS |
| C04 | @borso-app/pragma | every changed `*.utils.ts` has a sibling test | `site/src/lib/embed.utils.ts` → `embed.utils.test.ts`, ran in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Error case: a lane of another song is refused and its clips stay | `it('refuses to delete a lane of another song and leaves its clips'` at apps/pragma/api/src/sketches/sketches.controller.test.ts:293; fails when the clips go: `expect(otherSketch.clips.map((clip) => clip.id)).toEqual([otherClipId]);` (:312) | PASS |
| D02 | A placement reusing another song's clip id is refused and leaves that clip | `it('refuses a placement whose clip id is already a clip of another song, and leaves that clip'` at sketches.controller.test.ts:115; `expect(reused.status).toBe(404);` and `expect((await readSketch(band, otherSongId)).clips).toEqual([{ id: otherClipId, laneId: otherLaneId, inspirationId, offsetSeconds: 6 }]);` | PASS |
| D03 | A passage up to 10 minutes long is accepted wherever it starts | `selectPassageRefusal({ startSeconds: 400, endSeconds: 700 })).toBeNull()` at apps/pragma/domain/inspiration.core.test.ts:44 | PASS |
| D04 | A pasted link with surrounding spaces is read | `parseYoutubeVideoId(\` https://youtu.be/${VIDEO_ID} \`)).toBe(VIDEO_ID)` at inspiration.core.test.ts:21 (a no-break space `new URL` would refuse, so the `trim()` is pinned) | PASS |
| D05 | The YouTube search link reads trimmed words | `buildYoutubeSearchUrl('Phil Collins', ' In the Air Tonight ')` and `buildYoutubeSearchUrl('Phil Collins', '  ')` at inspiration.core.test.ts:64-69 | PASS |
| D06 | The player falls back to "Open on YouTube" when the API script fails | `it('offers YouTube instead when the API script fails to load'` at apps/pragma/site/src/lib/youtube-player.adapter.test.ts:147, `expect(onBlocked).toHaveBeenCalledTimes(1);`; and `it('fails when the API script does not load'`, `rejects.toThrow('the YouTube iframe API did not load')` at :236 | PASS |
| D07 | An inspiration another member deleted reloads the list on edit and on delete | `it('reloads the list instead of putting the old passage back when another member deleted it'` and `it('reloads the list instead of putting the card back when another member deleted it'` at apps/pragma/site/src/lib/queries/inspirations.queries.test.tsx; `expect(queryClient.getQueryState(inspirationKeys.list())?.isInvalidated).toBe(true);` (:153, :213). The restore path for any other failure keeps `pending.resolve(jsonResponse({ error: 'boom' }, 500));` … `expect(readList(queryClient)).toEqual([LISTED]);` | PASS |
| D08 | A YouTube Music song link embeds | `it('embeds a YouTube Music song link'` at apps/pragma/site/src/lib/embed.utils.test.ts:48, `iframeSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ'` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `removeLane` → `didDeleteLaneWithClips` (sketches.repository.ts:120-131) | Check-then-write | One conditional `DELETE … WHERE id AND song_id RETURNING` decides; the clip delete runs only when it returned a row (`if (deleted.length === 0) return false;`, :128) | PASS |
| E02 | `removeLane` against `moveClip` off that lane | Concurrent proof (round-1 Note 1) | `it('leaves no orphan clip when it is moved off its lane while that lane is deleted'` (sketches.controller.test.ts:315) holds `sketch_clip` writes with `runSecondWhileFirstWaitsOnHold`, then asserts `expect(deletion.status).toBe(200);`, one lane left, and `expect(clips.filter((clip) => clip.laneId !== keptLaneId)).toEqual([]);` (:339) | PASS |
| E03 | `placeClip` read-back → `findClipOfSongWithin` (sketches.service.ts:92-93) | Check-then-write | No decision before the write changes: the insert is still held by the clip primary key (`hasInsertedClipWithin`), and the song-scoped read only refuses a row the key already held for another song | PASS |
| E04 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed api and domain files prints nothing | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- `pendingNamespaces` (youtube-player.adapter.ts:74) caches the namespace promise per window, and `loadYoutubeNamespace` stores a rejected one too. After one failed script load, every player opened later in that tab shows "Open on YouTube" without retrying, until a reload. Is a retry on the next player wanted, or is the fallback for the life of the tab acceptable?
- The rejection handler `events.onBlocked` (youtube-player.adapter.ts:163) does not check `lifecycle.isDetached`, unlike the success path. A player detached before the script fails still calls `onBlocked`. React 18 ignores a state update on an unmounted component, so nothing visible follows (inferred). Should the two paths read the same?

## Verdict: PASS
