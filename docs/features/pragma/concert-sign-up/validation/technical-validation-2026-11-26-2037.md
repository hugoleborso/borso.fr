# Technical validation — Concert sign-up page (remove a registration), round 2

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/concert-remove-registration
- Base: 5b18439cf0d9d499a8729fb8b75aa842673b6989
- Run at: 2026-11-26T20:46:43Z
- Round: 2
- Reviewed: fdd94612eb99df62cb7b40a620a21e946cf359ba
- Touched workspaces: @borso-app/pragma (api, site)

Scope. This round reads `git diff e0ac3a35de0f317f09e3e35330e8bd6102867b5c..HEAD`. It holds three commits: the round-1 technical report, the visual report, and one fix commit `fdd94612e`. No merge sits in that range (`git rev-list --merges` prints nothing). No commit message in the range dismisses a round-1 finding. The fix commit also carries new scope: an amendment to use case 12 of the spec (the winners already drawn, and the "Proposées par les fans" filter), a 400 on an empty `PATCH`, a 404 on an amendment racing a removal, an `onSuccess` on `useDeleteBar`, and a smaller ticket hour under 375 px. Categories A and D are walked for that new scope, and for `bars.queries.ts`, `persisted-query.core.ts` and `ConcertTicket.tsx`, which round 1 never read in full. One claim is routed to `/visual-validation`: the ticket hour fitting at 320 px. 1 use case routed to /visual-validation; out of scope for this report. HEAD still printed the reviewed SHA after every test run.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff. The use-case-12 amendment of this round has no plan section either | — | `ls docs/features/pragma/concert-sign-up/` lists no `plan/` | UNVERIFIABLE |
| A01 | UC12 (amended) | "The registration leaves … the winners already drawn at once" | apps/pragma/site/src/components/organisms/ConcertRegistrationsCard.tsx:86-87, :123 | `const listedIds = new Set(registeredPeople.map((registration) => registration.id));` `const listedWinners = winners.filter((winner) => listedIds.has(winner.id));` and `{listedWinners.length === 0 ? null : (`. The list cache drops the id in `onMutate`, so the winners panel drops it on the same render | PASS |
| A02 | UC12 (amended) | The wished song "leaves the "Proposées par les fans" filter unless another registration still wishes it" | apps/pragma/api/src/concert-registrations/concert-registrations.repository.ts:208-213 | `.selectDistinct({ wishedSongId: concertRegistrationTable.wishedSongId }).from(concertRegistrationTable).where(isNotNull(…))`. The filter is read from the registration rows still stored, and the removal deletes one row by id | PASS |
| A03 | UC13 | The browser checks the remembered registration on every visit (round-1 A06) | apps/pragma/site/src/lib/queries/persisted-query.core.ts:6-13 | `const REMEMBERED_REGISTRATION_ROOT = concertRegistrationKeys.remembered('').slice(0, -1);` `const ROOTS_KEPT_IN_MEMORY: readonly QueryKey[] = [SONG_PREVIEW_ROOT, REMEMBERED_REGISTRATION_ROOT];`. `isQueryPersisted` is the `shouldDehydrateQuery` of `queryCachePersistOptions` (site/src/lib/query-client.setup.ts:52), so the check is never written to `localStorage`. A cache persisted by an earlier build is dropped by `buster: __BUILD_VERSION__` (:48) | PASS |
| A04 | INVARIANTS (api) | "An amendment names at least one answer. An empty body answers 400" | apps/pragma/api/src/concert-registrations/concert-registrations.schema.ts:57-61 | `.strict().refine((answers) => answers.comingForMemberId !== undefined \|\| answers.wishedTrackId !== undefined, { message: 'nothing to update' })`. The site never sends an empty body: `comingForMemberId: variables.comingForMemberId,` is always present (site/src/lib/queries/concert-registrations.queries.ts:154) | PASS |
| A05 | INVARIANTS (api) | An amendment whose registration was removed after the token check answers 404 `unknown-registration` (round-1 E02) | apps/pragma/api/src/concert-registrations/concert-registrations.service.ts:236-241 | `const registration = await saveAnswersAfterLostImportRace(…);` `if (registration === null) return refuse('unknown-registration');`, mapped by `'unknown-registration': 404` (controller.ts:40) | PASS |
| A06 | INVARIANTS (site) / 06-data-fetching | A removal that succeeds after an earlier failed one stays out of the list (round-1 B18) | apps/pragma/site/src/lib/queries/concert-registrations.queries.ts:211-217, :238-240 | `onSuccess: (_removed, variables) => { dropRegistrationFromList(queryClient, variables); },` | PASS |
| A07 | Commit scope | `useDeleteBar` keeps a deleted bar out after an earlier deletion failed | apps/pragma/site/src/lib/queries/bars.queries.ts:153-158, :178-180 | `onSuccess: (_deleted, variables) => { dropBarFromList(queryClient, variables.id); },` | PASS |
| A08 | Commit scope / Rules ("Every page works at 375 px") | The ticket hour fits at 320 px | apps/pragma/site/src/components/organisms/ConcertTicket.tsx:69 | `max-[374px]:text-ticket-prize`; `--text-ticket-prize: 21px` exists in site/src/styles/tokens.css:140 | routed to /visual-validation |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A06 (blocking): a removed fan keeps seeing "Inscrit·e" because the persisted check never goes stale | `fdd94612e` apps/pragma/site/src/lib/queries/persisted-query.core.ts:6-13 keeps `concertRegistrationKeys.remembered(…)` out of the persisted cache. `persisted-query.core.test.ts:14` asserts `expect(isQueryKeyPersisted(concertRegistrationKeys.remembered('registration-1'))).toBe(false);`. Mutation run on the file: 15 killed, 0 survived | PASS |
| R02 | D07 (blocking): no test covers the next visit of a browser that already checked its registration | `fdd94612e` apps/pragma/site/src/routes/concerts/ConcertsLandingPage.test.tsx:257 `it('checks the remembered registration again on the next visit, after an earlier visit found it standing')`. It dehydrates the first visit with the production `isQueryPersisted`, hydrates a new client, answers the check 404, and asserts `expect(await screen.findByRole('button', { name: "I'll be there!" })).toBeTruthy();` and `expect(fetchStub.calls.some(isRegistrationCheck)).toBe(true);` (:282-283). Had the check been persisted, it would hydrate as `{ isStanding: true }` with `staleTime: Infinity` and neither assertion would hold | PASS |
| R03 | B10 (non-blocking): the removal service file held the check | `fdd94612e` `checkRegistration` moved to apps/pragma/api/src/concert-registrations/concert-registration-check.service.ts:16; the removal file now holds only `removeRegistration` | PASS |
| R04 | B12 (non-blocking): the site INVARIANTS line on the per-visit check was untrue | `fdd94612e` apps/pragma/site/src/routes/concerts/INVARIANTS.md:31-34 now reads "The answer stays in memory and is never saved with the cached reads (`isQueryKeyPersisted`), so the next visit asks again", which A03 shows true | PASS |
| R05 | B18 (non-blocking): `useRemoveConcertRegistration` and `useDeleteBar` had no `onSuccess` | `fdd94612e`, see A06 and A07 | PASS |
| R06 | E02 (non-blocking): an amendment racing a removal answered 200 for a row that no longer exists | `fdd94612e`, see A05 and D06 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <16 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B02 | No unused exports or files | `pnpm exec knip --workspace apps/pragma` (from the repo root) | exit 0, one configuration hint about `.css` | PASS |
| B03 | Tailwind arbitrary variants compile | `scripts/check-tailwind-arbitrary-variants.sh` | exit 0. `max-[374px]:` opens on no bare word | PASS |
| B04 | No `any` | `grep -nP '\bany\b' <changed files>` | only the English word "any" inside three test names in ConcertsLandingPage.test.tsx | PASS |
| B05 | Type assertions only `as const` / `as unknown`; `useEffect` is a smell | `grep -nE '\buseEffect\(\| as [A-Za-z{]'` | none found outside imports and `as const` | PASS |
| B06 | Names carry intent | read in full | `listedWinners`, `dropRegistrationFromList`, `dropBarFromList`, `ROOTS_KEPT_IN_MEMORY`, `REMEMBERED_REGISTRATION_ROOT`, `answerRemovalWith`, `confirmRemovalOf`; none abbreviated | PASS |
| B07 | Standards checklist: "a file name says what the file holds" (01-naming) | read in full | `concert-registration-check.service.ts` holds only `checkRegistration`; `concert-registration-removal.service.ts` holds only `removeRegistration` | PASS |
| B08 | Standards checklist: "a rule in an `INVARIANTS.md` [is] still true" and "carries a `Held by:` line" (01-naming) | read in full | api INVARIANTS.md:91-94 (empty body 400, race 404) matches schema.ts:57-61 and service.ts:241, held by schema.test.ts:76, controller.test.ts:577, :588. site INVARIANTS.md:31-34 and :51-52 match A03 and A01, held by ConcertsLandingPage.test.tsx:257, persisted-query.core.test.ts:13, ConcertPublicPagePanel.test.tsx:133, :152. Every named test exists and ran | PASS |
| B09 | Standards checklist: "a comment documents something the code cannot say" (01-naming) | read in full | the diff adds no comment; `// @FollowsBlueprint service-orchestration` is machine-read | PASS |
| B10 | Standards checklist: "untrusted input is parsed with Zod" (03) | read in full | the empty-body rule is a `.refine` on `registrationPatchSchema`, read by `zValidator('json', registrationPatchSchema)` (controller.ts:101) | PASS |
| B11 | Standards checklist: "a mutation whose full result the client already holds reconciles from the response" (06-data-fetching), on `bars.queries.ts`, read in full for the first time this round | read in full | `useUpdateBar` (apps/pragma/site/src/lib/queries/bars.queries.ts:117-150) has `onMutate` and `onError` and no `onSuccess`, the shape the fix commit repaired in `useDeleteBar`. Failing case, under `BARS_WRITE_SCOPE`: (1) a member renames bar X to "A"; (2) renames it to "B" before the first `PUT` answers; (3) the first `PUT` answers 500, and `onError` writes back the snapshot taken before "A", so the card shows the original name; (4) the second `PUT` answers 200 and nothing writes "B". The card shows the original name, while the server holds "B", until the list refetches. Introduced: pre-existing; Fix size: one file (an `onSuccess` writing `data.bar` with `replaceEntityById`) | FAIL (non-blocking) |
| B12 | Standards checklist: "a multi-table write is wrapped in one transaction owned by the service" (04, 11) | read in full | the amendment's song import and answer update still run in `runInOneRegistrationTransaction` (service.ts:198). The new `null` branch only reads its result | PASS |
| B13 | Standards checklist: "a test name states the behaviour and the condition; a service test asserts on what the database holds" (10) | read in full | `answers 404 to an answer whose registration a member removed while it was being saved` asserts `expect(await storedRegistrationsOf(sessionId)).toEqual([]);` (controller.test.ts:606) | PASS |
| B14 | Standards checklist: "a set of more than two visual variants goes through `cva` or a lookup record" (08) | read in full | the ticket hour class lives in the existing `LOOK_BY_LAYOUT` record (ConcertTicket.tsx:66-69) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed e0ac3a35de0f317f09e3e35330e8bd6102867b5c --coverage --reporter=verbose` | 0. 21 files and 167 tests passed, among them ConcertsLandingPage.test.tsx (the next-visit test), ConcertPublicPagePanel.test.tsx (the two new tests), bars.queries.test.tsx, persisted-query.core.test.ts and concert-registrations.schema.test.ts. Coverage summary 100% statements, branches, functions and lines | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed e0ac3a35de0f317f09e3e35330e8bd6102867b5c --reporter=verbose` | 0. 55 files and 548 tests passed, among them the renamed removal test and the two new amendment tests of concert-registrations.controller.test.ts | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh e0ac3a35de0f317f09e3e35330e8bd6102867b5c apps/pragma/site/src/lib/queries/persisted-query.core.ts` | 0. 15 mutants, 15 killed, mutation score 100.00, "every changed gated file passed mutation". No other changed file is a `.core`, `.utils` or `.adapter` module | PASS |
| C04 | @borso-app/pragma | a lockfile or catalog change would need a full core run | `pnpm-lock.yaml` and `pnpm-workspace.yaml` are unchanged in the range | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC12 (amended): a removed registration leaves the winners already drawn | `it('takes a removed registration off the winners already drawn, and hides them once none is left')` at apps/pragma/site/src/components/organisms/ConcertPublicPagePanel.test.tsx:152; draws first, then `expect(screen.getByRole('status').textContent).not.toContain('Léa');` (:159), then `expect(screen.queryByRole('status')).toBeNull();` once Max is removed too (:164) | PASS |
| D02 | UC12 (amended): the wished song leaves the "Proposées par les fans" filter | `it('removes a registration of its concert only, keeps its wished song out of the fan wishes but in the catalogue, …')` at apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts:504; `expect(wishes.songIds).toEqual([]);` (:527) after the 204 | PASS |
| D03 | UC12 (amended): "unless another registration still wishes it" | **structural:** the filter is `selectDistinct` over the stored registration rows (repository.ts:210-212) and the removal deletes one row by `id` and `session_id` (repository.ts:152-166). A song another row still wishes is still returned. `it('lists each wished song once, however many registrations wish it')` (controller.test.ts:706) pins the distinct read with two wishing rows | PASS |
| D04 | UC13: the fan sees "Je serai là !" again on the next visit, after an earlier visit found the registration standing | ConcertsLandingPage.test.tsx:257, assertions at :282-283 (see R02); `persisted-query.core.test.ts:14` | PASS |
| D05 | INVARIANTS (api): an empty amendment answers 400 and changes nothing | `it('refuses an answer that names nothing to change with 400, and changes nothing')` at controller.test.ts:577; `expect(empty.status).toBe(400);` (:584). Schema: `expect(registrationPatchSchema.safeParse({}).success).toBe(false);` (schema.test.ts:77) | PASS |
| D06 | INVARIANTS (api): an amendment racing a removal answers 404 `unknown-registration` | `it('answers 404 to an answer whose registration a member removed while it was being saved')` at controller.test.ts:588. The Deezer `fetch` stub deletes the row between the token check and the update, then `expect((await readJson(amended, errorEnvelope)).error).toBe('unknown-registration');` (:605) | PASS |
| D07 | INVARIANTS (site): a removal that succeeds after an earlier one failed stays out of the list | `it('keeps a registration out of the list when its removal succeeds after an earlier one failed')` at ConcertPublicPagePanel.test.tsx:133; Léa's `DELETE` answers 500 first, then Max's 204, then `expect(screen.queryByText('max@example.com')).toBeNull();` (:147) | PASS |
| D08 | Commit scope: `useDeleteBar` keeps a deleted bar out after an earlier deletion failed | `it('useDeleteBar keeps a deleted bar out when an earlier deletion failed and put its snapshot back')` at apps/pragma/site/src/lib/queries/bars.queries.test.tsx:145; `expect(ids).toEqual(['bar-a']);` (:170) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `amendRegistration` → `saveAnswers` → `updateRegistrationAnswersWithin` (service.ts:194-206, :236-241) racing `removeRegistration` | Check-then-write | The token check still reads `holder` first, but the write no longer trusts it. `UPDATE … WHERE id = $1 RETURNING` decides, and `if (registration === null) return refuse('unknown-registration');` reads its result. A removal that commits between the read and the update yields 404 and no row, as D06 shows. The song import committed in the same transaction stays in the catalogue, which use case 12 allows | PASS |
| E02 | `removeRegistration` (removal.service.ts) | Check-then-write | Unchanged since round 1 apart from the moved `checkRegistration`. One conditional `DELETE … RETURNING` decides | PASS |
| E03 | `checkRegistration` (concert-registration-check.service.ts:16-26) | Check-then-write | Moved verbatim. It reads only and writes nothing | PASS |
| E04 | Module-level state in changed api files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let ' apps/pragma/api/src/concert-registrations/*.ts` finds nothing outside tests. The site's new module constants (`REMEMBERED_REGISTRATION_ROOT`, `ROOTS_KEPT_IN_MEMORY`) are frozen query-key prefixes, not server state | PASS |

## Blocking findings

- None.

## Non-blocking findings

- B11 — `useUpdateBar` has no `onSuccess`. A failed rename followed by a successful one shows the original name until a refetch. Pre-existing, the same shape the fix repaired in `useDeleteBar`.

## Notes

- A00 — The plan is absent, and neither amendment of use case 12 has a plan section. Rows were built from the spec, the INVARIANTS and the diff. Running `/technical-conception` would close it.
- The fix commit amended use case 12 to say the wished song "leaves the "Proposées par les fans" filter unless another registration still wishes it". That records what the code already did, and answers a round-1 question. Removing a song from a filter members see is a product call under CLAUDE.md. Did the operator approve this wording, or was it written by the implementer?
- The round-1 question on the existence signal is still open: an anonymous caller with a registration id and no token gets 403 while the registration exists and 404 once it is removed (concert-registration-check.service.ts:25). Is that acceptable given ids are random UUIDs?
- `persisted-query.core.ts`, a `.core` module, imports `concertRegistrationKeys` from `concert-registrations.queries.ts`, which imports the API client. It follows the existing `songKeys` import from `songs.queries`, and oxlint accepts it. Should the key factories live in a module that imports no client?
- A08 is routed to `/visual-validation`: the ticket hour at 320 px is a layout claim only a browser shows.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
