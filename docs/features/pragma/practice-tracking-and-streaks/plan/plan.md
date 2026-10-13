# Plan: each member logs the songs they studied, keeps a streak, and sees whether the band is ready for the next concert

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, did not name the risk at all (a planning gap), or named it correctly and the defect comes from elsewhere.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q.O.D. *What is a study?* | One row per member, song, instrument and Paris day | `api/src/studies/studies.schema.ts`: `studyTable` with a four-column primary key; `studyLogSchema` is `.strict()` and carries `songId` and `instrumentId` only, so a date cannot be sent | back-e2e: a body with `studiedOn` gets a 400 |
| Edge *idempotent second tap* | Insert `on conflict do nothing`, then read the row back | `studies.repository.ts` `insertStudyIfAbsent` | back-e2e: two posts, one row |
| Edge *Paris day boundary* | The server derives the day from `now` | `api/src/studies/paris-day.core.ts` `parisCalendarDay(now)` through `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })`; the service takes `now` the way `service-clock-injected` does | unit: 22:30 UTC in July is the next day, 22:30 UTC in January is the same day, both DST switch days |
| Q.O.D. *streak and joker* | A day counts with at least one study; one missed day per rolling 7 days is forgiven; today is pending until it ends | `api/src/studies/streak.core.ts` `computeStreak(studiedDays, today)` returns `{ days, includesToday, jokerAvailable }` | unit at 100% plus Stryker: empty log, unbroken run, one gap, two gaps in 7 days, two gaps 8 days apart, a gap on today |
| Q.O.D. *undo, own and today only* | Delete keyed on the signed-in member and today's Paris day | `studies.repository.ts` `deleteOwnStudyOfDay` returns the deleted count; the service maps 0 to `study-not-found` | back-e2e: another member's study and yesterday's both get a 404 |
| Q.O.D. *undo keeps the score* | No link between a study and a score change | nothing written; the two endpoints stay separate | technical-validation reads the diff for a coupling |
| Error *study-not-in-lineup* | The pair must be in the song's default lineup or in a lineup override of an entry in any setlist | `studies.service.ts` reads the song and the entries, and `api/src/studies/study-eligibility.core.ts` decides | unit plus back-e2e 422 |
| Q.O.D. *mastery history from every write* | The override upsert and the history insert happen in one transaction | `mastery.repository.ts` `upsertMasteryOverride` wraps both in `database.transaction`; a new `masteryScoreChangeTable` in `mastery.schema.ts`; `listScoreChangesForSong` | back-e2e: one upsert, one history row; a forced history failure leaves the override unchanged |
| Edge *default changes write no history* | Only overrides are history | `upsertMasteryDefault` untouched | back-e2e asserts zero rows after a default write |
| Q.O.D. *readiness threshold 7 on the lineup mean* | `READINESS_THRESHOLD = 7` | `api/src/studies/concert-readiness.core.ts` reuses `meanForSong` from `mastery/mastery.core.ts` | unit: a mean of exactly 7 is ready, a null mean is not |
| Edge *song in two setlists* | Counted once; ready only if every lineup it is played with reaches 7 | same core, grouping entries by `songId` with the entry's `lineupOverride`, falling back to the song's default lineup | unit: the same song with two lineups, one ready and one not, is not ready |
| Edge *next concert* | The earliest concert strictly after now | `site/src/lib/upcoming-concerts.core.ts` **moves** to `domain/upcoming-concerts.core.ts`, so the API service and the site read one rule; its three site callers update their import to `@domain/upcoming-concerts.core` | its existing test moves with it; knip and typecheck catch a missed caller |
| Result *Studies tab* | One `GET /api/studies/overview` returns my streak, my queue, the band's streaks and readiness | `studies.controller.ts` (`controller-dispatch`), `studies.service.ts` `readStudiesOverview(memberId, now)` | the controller holds no `.map`; ESLint plus technical-validation |
| Result *to-study ordering* | Not-ready first, then my lowest effective score, then the song title | `api/src/studies/study-queue.core.ts` `orderStudyQueue` (`core-canonical-ordering`) | unit |
| Result *no concert* | The queue spans the whole catalogue where I hold a lineup slot; readiness is `null` | the service branches on `selectUpcomingConcerts(...)[0]` | unit on the service projection plus visual validation |
| Result *band line* | Streak and studies this week, per member | the service reads all studies of the last `STREAK_LOOKBACK_DAYS = 400` days in one query and groups them in `api/src/studies/band-streaks.core.ts` | unit |
| Result *front end* | One route, three organisms, two molecules | `site/src/routes/studies/StudiesPage.tsx` (`route-list-page`); `organisms/StudyQueue.tsx` (`organism-query-owning`), `organisms/BandStreaks.tsx` and `organisms/ConcertReadinessBar.tsx` (`organism-presentational`); `molecules/StreakBadge.tsx` and `molecules/StudyRow.tsx` (`molecule-presentational`); the score stepper reuses the existing mastery write hook | visual validation at 375 px and 1280 px |
| Result *Studied and Undo* | Optimistic, settled from the response with no refetch | `site/src/lib/queries/studies.queries.ts` (`query-optimistic-mutation`); the POST answers with the study and the recomputed streak, and `onSuccess` writes both into the overview cache | `borso/no-refetch-of-optimistically-written-query` |
| Result *score change moves readiness* | The mastery mutation also invalidates the overview, because readiness is server-derived | the existing mastery override mutation adds the `['studies', 'overview']` key to what it invalidates | check whether that mutation carries `onMutate`; if it does, the overview is patched from the response instead (see the open questions) |
| Result *progress chart* | One line per member and instrument from the history | `GET /api/mastery/songs/:songId/history`; `organisms/MasteryProgressChart.tsx` built from the polyline geometry of `molecules/EnergySparkline.tsx`; the point geometry goes in `site/src/components/organisms/mastery-progress.core.ts` | unit on the geometry; visual validation on the song detail page |
| Result *nav* | A Studies tab | `AppShell.tsx` gains one item in the first section, `{ to: '/studies', labelKey: 'nav.studies', icon: … }`, using an existing icon from the registry | visual validation |
| Edge *cascades* | Deleting a song or a member removes its studies and history | `songs.repository.ts` `deleteSongWithCascade` and `members.repository.ts` member delete, in their existing transactions; `api/src/__test/test-seed.repository.ts` clears both tables | back-e2e |
| Changes *migration* | `0015_studies.sql`: two `CREATE TABLE IF NOT EXISTS` and one `CREATE INDEX ASYNC` | `api/src/database/migrations/` and the drizzle journal | `migrations.audit.test.ts` plus the pre-commit DSQL migration check |
| Production *events* | `study_logged`, `study_undone`, `mastery_score_changed` | read from the request lines the Hono `logger()` already writes for `POST /api/studies`, `DELETE /api/studies/…` and `PUT /api/mastery/overrides`, with their status. No `console.info`: the root ESLint config allows only `warn` and `error`, and no application in this repository emits named events yet | the request lines appear in the Lambda log group after the preview deploy |
| Changes *vocabulary* | Study, Streak, Mastery score change | `apps/pragma/VOCABULARY.md` | `scripts/check-vocabulary-paths.sh` |
| i18n | Every label | `site/src/i18n/{en,fr}.json` under `studies.*` and `nav.studies` | `i18n-parity.core.test.ts` |

**Pattern coherence pass.** There is no chart library and none is added: `EnergySparkline` already draws an SVG polyline, and a new dependency would trigger an ADR. The overview is one server-derived read, as `navigation-badges` does, rather than four client-side joins. Time arrives as a parameter everywhere, as in `uploads.service.ts`.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| The streak shifts by one day at the DST switch or near midnight | High: the streak is the competition | The day is computed in `Europe/Paris` by `Intl`, never with UTC offsets; the cores take `today` as a string | unit cases on both 2026 DST dates; Stryker on `paris-day.core.ts` and `streak.core.ts` |
| A stale optimistic write reverts a logged study through a DSQL read-after-write miss | Medium | No `onSettled` refetch; settle from the POST response | the lint rule; visual-validation step 2 |
| The history row and the override drift apart | Medium | One transaction | back-e2e with the history insert forced to fail |
| A study POST names a pair from a setlist override that the eligibility check does not read | Medium | Eligibility reads both the default lineup and the entry overrides | unit plus back-e2e with an override-only pair |
| The overview query grows with history | Low: 5 members, at most 400 days | One query bounded by `studied_on >= today - 400` | p90 of `GET /api/studies/overview` in the Lambda logs |
| Moving `upcoming-concerts.core.ts` breaks the `@Feature sessions` tag or the architecture map | Low | Move it with its test; regenerate the maps with `scripts/reports.sh maps` | the architecture `--check` in pre-commit |
| The undo button is hit by mistake | Low | A 44 px target, separate from **Studied** | the `study_undone` share above 10% in the logs |

## Code-quality self-check

- [ ] Repo lint rules pass (`pnpm exec eslint --no-warn-ignored --max-warnings 0`).
- [ ] Type-assertion plugin satisfied (only `as const`, `as unknown` allowed in this repo).
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals outside trivial loop indices.
- [ ] Magic numbers and strings extracted to named constants: `READINESS_THRESHOLD`, `JOKER_WINDOW_DAYS = 7`, `STREAK_LOOKBACK_DAYS`, `PARIS_TIME_ZONE`.
- [ ] No comments in code (`borso/no-comments`); every new file carries its `@FollowsBlueprint`.
- [ ] No `new Date()` in any `.core.ts`.
- [ ] Function names describe the result.

## Pre-flight gates

Run, in order, before push:
1. `pnpm install`.
2. `pnpm --filter pragma typecheck`.
3. `pnpm exec eslint --no-warn-ignored --max-warnings 0 apps/pragma`.
4. `pnpm --filter pragma build`.
5. `pnpm --filter pragma run test` (core, coverage at 100% on `*.core.ts`, and back-e2e on the local Postgres).
6. Stryker scoped to the new `*.core.ts` files.
7. `scripts/reports.sh all`, then the blueprint, architecture and vocabulary `--check` gates.
8. `pnpm exec knip`.
9. `/visual-validation` against the spec, at 375 px and 1280 px, with `scripts/argent.sh` for the taps.
10. `/technical-validation`.

## Open questions / unknowns

- Whether the existing mastery override mutation carries `onMutate`. If it does, invalidating the overview there is still allowed, because the overview is a different query whose readiness only the server can compute; the lint rule will say whether it agrees, and the exception goes on the line with its reason. Decided at implementation.
- The lineup used for readiness: the spec says "lineup mean" without naming which lineup. The plan uses the entry's `lineupOverride`, falling back to the song's default lineup, and a song is ready only if every lineup it is played with reaches 7. Decided here as a developer choice and recorded in the spec's decision table at implementation.

## Missing technical skills

- None. `/implementation` covers the layers through the blueprints listed above.
