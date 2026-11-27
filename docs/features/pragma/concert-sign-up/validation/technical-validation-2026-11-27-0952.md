# Technical validation — Concert sign-up page (public list carries no registration count)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/hide-registration-count
- Base: 458e886c43f39c5561b65185c897060f2df4c3bf
- Run at: 2026-11-27T10:00:25Z
- Round: 1
- Reviewed: 23f9021db3394baddd9df76ad4e47c7b070c87a5
- Touched workspaces: @borso-app/pragma (api, site tests), docs

Scope: one commit, `23f9021db fix(pragma): stop exposing the registration count on the public API`, 7 files, +10 / -39. No merge commit sits above the base (`git rev-list --merges` printed nothing). The change under review is the new *Rules* bullet of the spec: "The public list of upcoming concerts carries no registration count. Only signed-in members see how many people signed up." The spec has no *Q.O.D.*, *Changes* or *Test strategy* section, so categories A and D are built from that bullet (split into its two claims) and from the matching `INVARIANTS.md` addition, with files taken from the diff.

0 use cases routed to /visual-validation; out of scope for this report. The removed field was drawn by no screen (typecheck passes with it gone from the inferred Hono response type), so nothing visible changes.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/pragma/concert-sign-up/plan/` does not exist | UNVERIFIABLE |
| A01 | Rules, new bullet | spec amended after the plan; files taken from the diff | spec.md:40 | `- The public list of upcoming concerts carries no registration count. Only signed-in members see how many people signed up.` No plan section or *Files to change* entry covers it | UNVERIFIABLE |
| A02 | Rules, claim 1 | The public upcoming list carries no registration count | apps/pragma/api/src/concert-registrations/concert-registrations.service.ts:67-78 | `export async function listUpcomingConcerts(now: Date)` maps each concert to `sessionId`, `date`, `venue`, `message`, `posterUrl: await mintPosterUrl(...)`, `prize: projectConcertPrize(...)`; the `countRegistrationsOfConcerts` call and `registrationCount: countBySessionId.get(concert.id) ?? NO_REGISTRATION` are deleted | PASS |
| A03 | Rules, claim 1 | The response type no longer declares the count | apps/pragma/api/src/concert-registrations/concert-registrations.types.ts:59-66 | `export interface UpcomingConcertView { readonly sessionId … readonly prize: ConcertPrize \| null; }` with `readonly registrationCount: number;` removed | PASS |
| A04 | Rules, claim 1 | The count query that fed the public route is gone, not left dead | apps/pragma/api/src/concert-registrations/concert-registrations.repository.ts:1 | `import { and, asc, eq, gte, isNotNull } from 'drizzle-orm';` (`count`, `inArray` dropped); `countRegistrationsOfConcerts` and `RegistrationCount` deleted; `grep -rn "registrationCount\|countRegistrations" apps/pragma` returns nothing | PASS |
| A05 | Rules, claim 1 | The public route serves exactly that list | apps/pragma/api/src/concert-registrations/concert-registrations.controller.ts:55-58 | `.get('/upcoming', limitReads, async (context) => { const concerts = await listUpcomingConcerts(new Date()); return context.json({ concerts }); })` | PASS |
| A06 | Rules, claim 2 | Only signed-in members see how many signed up | apps/pragma/api/src/concert-registrations/concert-registrations.controller.ts:166-174 | `.get('/concerts/:sessionId/registrations', requireMemberSession, …, async (context) => { … const registrations = await listRegistrations(sessionId); return context.json({ registrations }); })`; the site derives the total from it at site/src/routes/sessions/friends-count.core.ts:91 `registeredTotal: input.registrations.length`. No other public route reads `concertRegistrationTable` (grep of api/src) | PASS |
| A07 | INVARIANTS.md | The folder's invariants record the rule with a `Held by:` line | apps/pragma/api/src/concert-registrations/INVARIANTS.md:37-38, 54 | `- The public list of upcoming concerts carries no registration count, and no field beyond the ones the ticket draws.` / `Held by: … › lists the upcoming concerts only, soonest first, with their message and no sign-up count` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the hunks and the changed files | none found; the diff only deletes names | PASS |
| B02 | Magic numbers / strings extracted | read | `NO_REGISTRATION = 0` deleted with its only use; nothing added | PASS |
| B03 | No prose comments (`borso/no-comments`) | read | only `// @FollowsBlueprint` markers, unchanged | PASS |
| B04 | Function names describe the result | sample | `listUpcomingConcerts`, `listConcertsFrom`, `listRegistrationsOfConcert` unchanged and accurate | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none found | PASS |
| B06 | No `any` | `grep -nP '\bany\b' <changed-files>` | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | no index access added | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <5 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B09 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0; the site's `UpcomingConcert` is `InferResponseType<typeof concertRegistrationsApi.upcoming.$get>` (site/src/lib/queries/concert-registrations.queries.ts:44-45), so a site reader of the removed field would have failed here | PASS |
| B10 | Dead exports | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B12 | Standards checklist: "`reviewer` checks that … a rule in an `INVARIANTS.md` [is] still true" (01-naming.md:317) | read INVARIANTS.md in full against the service | `and\n  no field beyond the ones the ticket draws.` at api/src/concert-registrations/INVARIANTS.md:37-38. `sessionId` is returned (service.ts:71) and the ticket does not draw it; the site uses it as a React key and for the sign-up URL (site/src/routes/concerts/ConcertsLandingPage.tsx:38 `key={nextConcert.sessionId}`). A reader takes the sentence to forbid a field the API must send. Introduced: this branch; Fix size: one line ("no field beyond the ones the sign-up page reads") | FAIL (non-blocking) |
| B13 | Standards checklist: invariant promising behaviour carries `Held by:` (01-naming.md:320) | read | new rule cites the renamed test at INVARIANTS.md:54 | PASS |
| B14 | Standards checklist: verb table (`find…` null, `get…` throws, `project…` returns its shape) (01-naming.md:322) | read service.ts, repository.ts, types.ts in full | `find…` repository functions return `rows[0] ?? null` (repository.ts:77, 120, 131, 165); nothing in the diff changes a verb | PASS |
| B15 | Standards checklist: derived types are derived (03-typing.md:131) | read | row types from `$inferSelect` (repository.ts:7, 15-18); site response type from the Hono client | PASS |
| B16 | Standards checklist: repository returns rows, arrays and counts (04-backend-architecture.md:232) | read repository.ts in full | the only change removes a count query; remaining functions return rows | PASS |
| B17 | Standards checklist: test name states behaviour and condition (10-testing.md:221) | read | `it('lists the upcoming concerts only, soonest first, with their message and no sign-up count', …)` at controller.test.ts:428 | PASS |
| B18 | Standards checklist: remaining bullets (front-end layout, styling, i18n, effects, forms, pre-commit budgets, temporal coupling, hotspots, rate-limit bucket, multi-table transaction, disable-comment reasons) | read | the diff touches no screen, style, i18n key, effect, form, hook, disable comment, rate limiter or write path | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 458e886c43f39c5561b65185c897060f2df4c3bf --coverage --reporter=verbose` | 0. 6 files, 58 tests, including site/src/routes/concerts/ConcertsLandingPage.test.tsx and api/src/concert-registrations/concert-registrations.core.test.ts. Coverage 0/0, as expected, because no changed file is a gated `.core`, `.utils` or `.adapter` module | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed 458e886c43f39c5561b65185c897060f2df4c3bf --reporter=verbose` | 0. 55 files, 548 tests, including all 30 of api/src/concert-registrations/concert-registrations.controller.test.ts | PASS |
| C03 | Mutation | `scripts/mutate-changed.sh` | not run. The diff changes no gated file (service, repository, types and tests only) | PASS |
| C04 | `*.utils.ts` coverage | enumerate | the diff touches no `*.utils.ts` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Rules claim 1: the public upcoming list carries no registration count | `it('lists the upcoming concerts only, soonest first, with their message and no sign-up count', …)` at api/src/concert-registrations/concert-registrations.controller.test.ts:428. It registers two people on `tonight` (`registerOk(app, tonight, 'Lou', …)`, `registerOk(app, tonight, 'Max', …)`), so a count would be 2. The failing assertion is `readJson(await jsonRequest(app, '/api/concert-registrations/upcoming'), upcomingEnvelope)` at :446-449, which runs `schema.parse` (test/auth-utils.ts:186) against `z.strictObject({ sessionId, date, venue, message, posterUrl, prize })` at :47. A `registrationCount` key on a concert makes the parse throw | PASS |
| D02 | Rules claim 1, regression gap: the strict shape holds each concert only | `upcomingEnvelope = z.object({ concerts: z.array(z.strictObject({ … prize: z.object({ label: z.string(), icon: z.string() }).nullable() })) })` at controller.test.ts:45-55. If the handler returned `context.json({ concerts, registrationCount: 2 })`, or `projectConcertPrize` added a count to `prize`, the test still passes, because the envelope and `prize` are non-strict `z.object`. Nothing ships wrong today | FAIL (non-blocking) |
| D03 | Rules claim 2: only signed-in members read the registrations, whose length is the count | `it('answers every public route without a session cookie and gates every member route', …)` at controller.test.ts:199. It sends `jsonRequest(app, \`${base}/registrations\`)` without a cookie at :222, and `expect(response.status).toBe(UNAUTHORISED)` at :227 fails if the route opens. The signed-in read is pinned at :241-248, `jsonRequest(app, …/registrations, { cookieHeader })` then `expect(listed.registrations.map(…)).toEqual([{ firstName: 'Lou', email: 'lou@example.com' }])`. The count shown to members, `registeredTotal`, is pinned at site/src/routes/sessions/friends-count.core.test.ts:85 `expect(tally.registeredTotal).toBe(10)` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole diff | Does the diff write to a database or keep state? | `git diff <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| grep -E '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` prints nothing. The diff only removes a read (`countRegistrationsOfConcerts`) and a per-request `Map` (`const countBySessionId = new Map(…)`, deleted from service.ts). It adds no module-level variable. No write path and no state to check | PASS |

## Blocking findings

- none

## Non-blocking findings

- B12 — INVARIANTS.md:37-38 says the public list has "no field beyond the ones the ticket draws", but the list must send `sessionId`, which the ticket does not draw.
- D02 — the strict test shape covers each concert only. A count added to the envelope or to `prize` would pass the `Held by` test.

## Notes

- A00 — no plan exists for `concert-sign-up`. The rule was added straight to the spec, so the files come from the diff. Recommend `/technical-conception` only if the feature grows past this bullet.
- A01 — the spec's new *Rules* bullet has no *Files to change* entry and no plan section. Rows A02-A07 were built from the bullet itself and from the diff.
- Browsers that persisted the upcoming query before this change may still hold a cached `registrationCount` (`isQueryPersisted` is imported by the landing page test). Does the persisted cache expire or get replaced on the next fetch, so the stale field never reaches a reader? Nothing reads the field today, so no failing case exists.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
