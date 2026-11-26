# Technical validation — Concert sign-up page (remove a registration)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/concert-remove-registration
- Base: 5b18439cf0d9d499a8729fb8b75aa842673b6989
- Run at: 2026-11-26T20:13:39Z
- Round: 1
- Reviewed: e0ac3a35de0f317f09e3e35330e8bd6102867b5c
- Touched workspaces: @borso-app/pragma (api, site)

Scope. HEAD is a merge of `origin/main` whose second parent is the base itself. So `git diff <base>...HEAD` holds only this branch's change: 21 files from commit `9d5cf1ea0`, "let members remove a concert registration". The four earlier first-parent commits reached `main` through PR #412 and leave no diff against the base. The spec has only *Use cases* and *Rules*. It has no Q.O.D., *Changes* or *Test strategy*. Categories A and D are built from the two amended use cases (the last bullet of 12, and 13) and the *Rules* they touch, bullet by bullet. One claim is routed to `/visual-validation`: the "Retirer" row and its confirmation must hold together at 375 px (*Rules*). 1 use case routed to /visual-validation; out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff. The spec amendment (use case 12's last bullet, use case 13) has no plan section either | — | `ls docs/features/pragma/concert-sign-up/` lists `kaizen.md spec validation` | UNVERIFIABLE |
| A01 | UC12 | "removes a registration with "Retirer" after confirming it" | apps/pragma/site/src/components/organisms/ConcertRegistrationsCard.tsx:39, :149-157 | `onClick={() => onRemove(registration)}` only sets `registrationToRemove`. Only `<ConfirmDialog … onConfirm={() => confirmRemoval(registrationToRemove)}` calls `remove.mutate({ sessionId, registrationId: registration.id })`. Label `"registrationRemove": "Retirer"` (fr.json:630) | PASS |
| A02 | UC12 | "The registration leaves the list and the draw at once" | apps/pragma/site/src/lib/queries/concert-registrations.queries.ts:223-235; ConcertRegistrationsCard.tsx:85, :93 | `onMutate` runs `registrations: old.registrations.filter((registration) => registration.id !== variables.registrationId)`. The draw reads the same cache: `setWinners(pickDrawWinners(registeredPeople, Math.random))` | PASS |
| A03 | UC12 | "Its wished song stays in the catalogue" | apps/pragma/api/src/concert-registrations/concert-registrations.repository.ts:152-166 | `.delete(concertRegistrationTable).where(and(eq(…id, registrationId), eq(…sessionId, sessionId)))`. No other table is written. `wishedSongId: uuid('wished_song_id')` (schema.ts:23) carries no cascade | PASS |
| A04 | UC12 | A member, not the public, removes a registration of that concert | concert-registrations.controller.ts:176-186 | `.delete('/concerts/:sessionId/registrations/:registrationId', requireMemberSession, zValidator('param', concertRegistrationParamSchema), …)`; refusal `'unknown-registration': 404` (:39) | PASS |
| A05 | UC13 | "can sign up again with the same email" | repository.ts:152-166 | The row holding the canonical email is deleted outright, so the mailbox check in `registerWithin` finds nothing | PASS |
| A06 | UC13 | "sees "Je serai là !" again on their next visit … The browser checks the registration it remembers once per visit" | concert-registrations.queries.ts:41, :135; site/src/lib/query-client.setup.ts:31, :52; site/src/lib/queries/persisted-query.core.ts:7-9 | `const CHECKED_ONCE_PER_VISIT = Infinity;` … `staleTime: CHECKED_ONCE_PER_VISIT,`. Every successful query except song previews is persisted to `localStorage` for 7 days (`shouldDehydrateQuery: isQueryPersisted`, `gcTime: PERSISTED_CACHE_MAX_AGE_MS`). Failing case: (1) a fan signs up; (2) the fan visits `/` again, the check answers 200, and `{ isStanding: true }` is persisted; (3) a member removes the registration; (4) the fan visits `/` within 7 days on the same build. The persisted check is restored and never goes stale, so no `GET /registrations/:id` is sent and the page shows "Inscrit·e" instead of "Je serai là !". Reproduced with `@tanstack/query-core` 5.106.0, the same `hydrate` path `persistQueryClientRestore` uses. A query fetched with `staleTime: Infinity` was dehydrated, aged one day, hydrated into a new client and observed with the same options. Output: `fetches after visit 2 mount: 1 data: {"isStanding":true}`, so it did not refetch | FAIL (blocking) |
| A07 | UC13 | The check runs "with its edit token" and "forgets it when the server no longer has it" | concert-registrations.queries.ts:122-133; concert-registration-removal.service.ts:17-27 | `{ headers: { [PRAGMA_REQUEST_HEADERS.registrationToken]: registration.editToken } }`, then `if (isGone) { forgetRegistration(sessionId); return { isStanding: false }; }`. Server: `findRegistrationHoldingToken(params.registrationId, hashEditToken(params.editToken))`, then `refuse(registration === null ? 'unknown-registration' : 'invalid-registration-token')` | PASS |
| A08 | Rules | "Every public write is rate limited". The new public route is a read and spends the read budget | controller.ts:80-82 | `.get('/registrations/:registrationId', limitReads, zValidator('param', registrationParamSchema), …)` | PASS |
| A09 | Rules | "The public API exposes only a member's id, first name and colour". The check exposes no personal data | controller.ts:93 | `return context.json({ registrationId });` | PASS |
| A10 | Rules | "Every visible string goes through en.json and fr.json" | site/src/i18n/en.json:630-633, fr.json:630-633 | `registrationRemove`, `registrationRemoveLabel`, `registrationRemoveConfirm` and `registrationRemoveFailed` are in both catalogues. ConcertRegistrationsCard.tsx holds no literal text | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <16 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B02 | No unused exports or files | `pnpm exec knip --workspace apps/pragma` | exit 0 (one configuration hint about `.css`) | PASS |
| B03 | No `any` | `grep -nP '\bany\b' <changed files>` | none found | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z{]'` | only `import { Button as PressableButton … }`, an import alias | PASS |
| B05 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | none found | PASS |
| B06 | Names carry intent, no abbreviations | read in full | `registrationToRemove`, `confirmRemoval`, `didDeleteRegistrationOfConcert`, `isRegistrationGone`, `NOTHING_REMEMBERED`; none abbreviated | PASS |
| B07 | Magic numbers and strings named | read in full | `NO_CONTENT = 204` (controller.ts:47), `REGISTRATION_GONE_STATUS = 404` (concert-sign-up.core.ts:97), `CHECKED_ONCE_PER_VISIT = Infinity` (queries.ts:41) | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read in full | `return rows[0] ?? null;` (repository.ts:149) | PASS |
| B09 | Standards checklist: "a comment documents something the code cannot say" (01-naming) | read in full | the only comment is `/** @Feature concert-registrations */` (ConcertRegistrationsCard.tsx:1), a machine-read tag its sibling organisms also carry | PASS |
| B10 | Standards checklist: "a file name says what the file holds" (01-naming) | read in full | `export async function checkRegistration(` at apps/pragma/api/src/concert-registrations/concert-registration-removal.service.ts:17. The file is named for removal, but it also holds the public check of a remembered registration, which removes nothing. Introduced: this branch; Fix size: one file (rename, two imports) | FAIL (non-blocking) |
| B11 | Standards checklist: "a `find…` returns `null` rather than a sentinel" (01-naming) | read in full | `findRegistrationById(…): Promise<ConcertRegistrationRow \| null>` returns `rows[0] ?? null` (repository.ts:141-150) | PASS |
| B12 | Standards checklist: "a rule in an `INVARIANTS.md` [is] still true" (01-naming) | read in full | `- Each visit checks the remembered registration once, with its edit token` at apps/pragma/site/src/routes/concerts/INVARIANTS.md:31 is untrue, for the reason A06 gives: a check persisted on an earlier visit is restored and never repeated. Introduced: this branch; Fix size: closes with the A06 fix. The API INVARIANTS additions (removal 204/404, check 200/403/404 and the read budget) match controller.ts:39, :82, :185 | FAIL (non-blocking) |
| B13 | Standards checklist: "an invariant promising behaviour carries a `Held by:` line" (01-naming) | read in full | each new promise in both INVARIANTS files has `Held by:` lines naming tests that exist (controller.test.ts:504, :529, :554; ConcertPublicPagePanel.test.tsx:87, :110; ConcertsLandingPage.test.tsx:242, :255) | PASS |
| B14 | Standards checklist: "a repository returns rows, arrays and counts" (04) | read in full | `return deleted.length > 0;` (repository.ts:165) has the same boolean shape as the existing `didClaimConcertWithin` | PASS |
| B15 | Standards checklist: "a multi-table write is wrapped in one transaction" (04, 11) | read in full | the removal writes one table, `concert_registration`, and no table references it | PASS |
| B16 | Standards checklist: "untrusted input is parsed with Zod" (03) | read in full | params go through `zValidator('param', concertRegistrationParamSchema)` / `registrationParamSchema`. The token header is only hashed, as in the existing amendment route | PASS |
| B17 | Standards checklist: "a derived type is derived" (03) | read in full | `RegistrationsResponse` comes from the Hono client. `RememberedRegistrationCheck` is a shape only the client has, not a copy of a server type | PASS |
| B18 | Blueprint `query-optimistic-mutation`, and 06-data-fetching "a mutation … reconciles from the response" | read in full | `useRemoveConcertRegistration` (queries.ts:212-246) has `onMutate` and `onError` and no `onSuccess`. The blueprint says its `onMutate` "still runs at once" under the scope, and that `onSuccess` then writes the server's result. Failing case, with registrations Léa and Max: (1) the member removes Léa; (2) the member removes Max before Léa's `DELETE` answers; (3) Léa's `DELETE` answers 500, and `onError` writes back Léa's snapshot, taken before Max was filtered out, so Max is listed again; (4) Max's `DELETE` answers 204 and nothing filters him out again. Max stays in the list, and "Tirer au sort 3 gagnants" can draw him until the query refetches. `useDeleteBar` (bars.queries.ts:154-180) has the same shape. Introduced: this branch; Fix size: one line (`onSuccess` filters the removed id again) | FAIL (non-blocking) |
| B19 | Standards checklist: "a key's dotted path names the screen and the element" (09) | read in full | `sessions.registrationRemove` and `sessions.registrationRemoveConfirm` sit beside the existing `sessions.registrationsTitle` | PASS |
| B20 | Standards checklist: "a test name states the behaviour and the condition, and a service test asserts on what the database holds" (10) | read in full | `removes a registration of its concert only, keeps its wished song, and lets the mailbox sign up again` asserts `expect(await storedRegistrationsOf(sessionId)).toEqual([]);` (controller.test.ts:519) | PASS |
| B21 | Standards checklist: "no new … button label explains the interface" (05) | read in full | the button reads "Retirer". The one sentence is the confirmation, and it says what the screen cannot show: the person leaves the draw and the song stays | PASS |
| B22 | Standards checklist: "a limit or a rule written in a site does not restate one the API enforces" (02) | read in full | `REGISTRATION_GONE_STATUS = 404` reads the API's answer code and restates no limit | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 5b18439cf0d9d499a8729fb8b75aa842673b6989 --coverage --reporter=verbose` | 0. 86 files and 554 tests passed, among them ConcertPublicPagePanel.test.tsx, ConcertsLandingPage.test.tsx, concert-sign-up.core.test.ts and registration-token.adapter.test.ts. Coverage is 100% for statements, branches, functions and lines on concert-registrations.schema.ts, registration-token.adapter.ts and concert-sign-up.core.ts | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 5b18439cf0d9d499a8729fb8b75aa842673b6989 --reporter=verbose` | 0. 55 files and 546 tests passed, among them the four new or extended cases in concert-registrations.controller.test.ts (:200, :504, :529, :554) | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 5b18439cf0d9d499a8729fb8b75aa842673b6989 apps/pragma/site/src/routes/concerts/concert-sign-up.core.ts apps/pragma/site/src/lib/registration-token.adapter.ts` | 0. 164 mutants instrumented, mutation score 100.00, "every changed gated file passed mutation" | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling `*.utils.test.ts` | 63 files, none missing | PASS |
| C05 | @borso-app/pragma | a lockfile or catalog change would need a full core run | `pnpm-lock.yaml` and `pnpm-workspace.yaml` are unchanged in the diff | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC12: removal asks for confirmation first, and Cancel removes nothing | `it('removes a registration once confirmed, so it leaves the list and the draw')` at apps/pragma/site/src/components/organisms/ConcertPublicPagePanel.test.tsx:87; `expect(fetchStub.calls.some((call) => call.method === 'DELETE')).toBe(false);` after Cancel | PASS |
| D02 | UC12: the registration leaves the list | same test; `expect(screen.queryByText('lea@example.com')).toBeNull();` and the `DELETE` URL `…/concerts/${A_CONCERT}/registrations/${LEA.id}` | PASS |
| D03 | UC12: the registration leaves the draw | same test; `expect(screen.getByRole('status').textContent).not.toContain('Léa');` with Max as the only other registration | PASS |
| D04 | UC12: a failed removal puts the row back (the INVARIANTS promise behind "at once") | `it('puts a registration back and says so when the removal fails')` at ConcertPublicPagePanel.test.tsx:110; `expect(screen.getByText('lea@example.com')).toBeTruthy();` after a 500 | PASS |
| D05 | UC12: only a member removes, and only on that concert | `it('removes a registration of its concert only, …')` at apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts:504: `expect(elsewhere.status).toBe(404);` (:513), then `expect(await storedRegistrationsOf(sessionId)).toHaveLength(1);` (:515). Gate: `it('answers every public route without a session cookie and gates every member route')` at :200, with the anonymous `DELETE` in `gatedResponses` | PASS |
| D06 | UC12: its wished song stays in the catalogue | controller.test.ts:504; `expect(await testDatabase().select({ title: songTable.title }).from(songTable)).toEqual([{ title: 'Voodoo Child' }]);` (:520-522) after the 204. The wish was set first by `amend(… { wishedTrackId: … })` | PASS |
| D07 | UC13: the fan sees "Je serai là !" again on their next visit | `it('offers the sign-up again when the band removed the registration this browser remembers')` at apps/pragma/site/src/routes/concerts/ConcertsLandingPage.test.tsx:242 covers only a browser whose query cache is empty. No test covers the next visit of a browser whose earlier visit already checked the registration and persisted `{ isStanding: true }`. That is the case A06 shows failing | FAIL (blocking) |
| D08 | UC13: the fan can sign up again with the same email | controller.test.ts:504; `expect((await registerFor(app, sessionId, 'Lou', 'l@e.fr')).status).toBe(201);` (:526) after the removal | PASS |
| D09 | UC13: the browser checks with its edit token | ConcertsLandingPage.test.tsx:242: `expect(check?.headers.get('x-registration-token')).toBe('token-1');`. Server side, `it('tells a browser whether its remembered registration still stands, and only with its token')` at controller.test.ts:529: `expect(wrong.status).toBe(403);` (:540) | PASS |
| D10 | UC13: the check runs at most once within a visit | **structural:** `staleTime: CHECKED_ONCE_PER_VISIT,` with `CHECKED_ONCE_PER_VISIT = Infinity` and `retry: false` (concert-registrations.queries.ts:41, :135-136) | PASS |
| D11 | UC13: the browser forgets the registration when the server no longer has it | ConcertsLandingPage.test.tsx:242: `expect(localStorage.getItem(\`pragma.registration.${A_CONCERT}\`)).toBeNull();` on a 404. Server 404 at controller.test.ts:550: `expect(gone.status).toBe(404);` | PASS |
| D12 | UC13: any other answer keeps it | `it('keeps a remembered registration signed up when its check is refused for another reason')` at ConcertsLandingPage.test.tsx:255: `expect(localStorage.getItem(…)).not.toBeNull();` on a 403. Also `isRegistrationGone(403)` is false at concert-sign-up.core.test.ts:49 | PASS |
| D13 | Rules: the public check is rate limited | `it('bars an address that hammers the check of a registration')` at controller.test.ts:554: `expect((await fromOneAddress()).status).toBe(429);` after `CONCERT_REGISTRATION_READ_BUDGET.maxAttempts` checks | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `removeRegistration` → `didDeleteRegistrationOfConcert` (repository.ts:152-166) | Check-then-write | No read comes before the write. One conditional `DELETE … WHERE id = $1 AND session_id = $2 RETURNING id` decides, and `return isDeleted ? { kind: 'ok' } : refuse('unknown-registration');` (removal.service.ts:40) reads its `RETURNING`. When two members remove the same row, one gets 204 and the other matches 0 rows and gets 404. A DSQL `OC000` is retried by `drizzle(retryingConflictAbortsOf(client, waitFor), { schema })` (database/client.ts:80), and the retry then deletes nothing. No key holds this rule, so step 4's concurrent test does not apply | PASS |
| E02 | `amendRegistration` (service.ts:222-250) racing the new removal | Check-then-write | The amendment reads `holder` (service.ts:225), then `updateRegistrationAnswersWithin` (repository.ts:190-195) runs `UPDATE … WHERE id = $1`. Failing case: the fan sends `PATCH /api/concert-registrations/registrations/:id` with a valid token and `comingForMemberId: M`, and a member's `DELETE` of that registration commits between the read and the update. The update touches 0 rows, `const registration = updated ?? holder;` (:241) answers 200 with the old answers, and no row exists. Before this branch only a concert deletion could remove the row under it. Nothing wrong persists: the spec keeps the imported song anyway, and the next visit's check forgets the registration | FAIL (non-blocking) |
| E03 | `checkRegistration` (removal.service.ts:17-27) | Check-then-write | Reads only (`findRegistrationHoldingToken`, `findRegistrationById`) and writes nothing | PASS |
| E04 | Signing up again after a removal | Check-then-write | Uses the existing `register` path, unchanged. Its concurrent proof is `it('answers one 201 and one 409 when one mailbox signs up twice at the same moment, and keeps one row')` at controller.test.ts:316 | PASS |
| E05 | Module-level state in changed api files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` finds nothing in the changed api files. The new route reuses `buildAudienceRateLimiter(CONCERT_REGISTRATION_READ_BUDGET)` (controller.ts:51). That budget is per Lambda instance, as the blueprint designs it ("makes the budget per instance rather than global, which is acceptable here"). The spec sets no number the check must hold across the whole application | PASS |

## Blocking findings

- A06 — A fan whose registration is removed after an earlier visit keeps seeing "Inscrit·e" for up to 7 days. The remembered check has `staleTime: Infinity` and is persisted to `localStorage`, so later visits never repeat it.
- D07 — No test covers the next visit of a browser that already checked its registration once. The only test starts from an empty cache.

## Non-blocking findings

- B10 — `concert-registration-removal.service.ts` also holds `checkRegistration`, which removes nothing.
- B12 — The site INVARIANTS line "Each visit checks the remembered registration once" stays untrue until A06 is fixed.
- B18 — `useRemoveConcertRegistration` has no `onSuccess`. When a failed removal is followed by a successful one, the second registration shows again, and can be drawn, until a refetch.
- E02 — An answer amendment racing a removal answers 200 with the old answers for a registration that no longer exists.

## Notes

- A00 — The plan is absent, and the spec amendment has no plan section. Rows were built from the spec and the diff. Running `/technical-conception` would close it.
- An anonymous caller with a registration id and no token gets 403 while the registration exists and 404 once it is removed (removal.service.ts:26). Ids are `uuid('id').primaryKey().defaultRandom()`, so guessing one is not practical. Is that existence signal acceptable?
- `listDistinctWishedSongIds` (repository.ts:208-214) reads wished songs from the registrations. So a removed registration's song leaves the "Proposées par les fans" filter while staying in the catalogue. Use case 10 says that filter lists "every wished song". Is dropping the song from the filter what use case 12's "Its wished song stays in the catalogue" intends?
- A winners panel already on screen keeps showing a removed winner until the next draw (`winners` state, ConcertRegistrationsCard.tsx:84). Does "leaves the draw at once" cover a result already drawn, or only the next draw?
- While the check is in flight, `rememberedCheck.data?.isStanding !== false` (ConcertSignUpCard.tsx:60) shows "Inscrit·e" first, then switches to "Je serai là !" once a 404 lands. `/visual-validation` should judge that flash.

## Verdict: FAIL
