# Technical validation — Add the next concert to my calendar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (no `plan/plan.md`; see A00)
- Branch: claude/hopeful-gates-16xq74
- Base: 458e886c43f39c5561b65185c897060f2df4c3bf
- Run at: 2026-11-27T09:37:52Z
- Round: 1
- Reviewed: 3a5ec7d24e96422f9e99a94e48abf8214e4ea151
- Touched workspaces: @borso-app/pragma (api, site)

The spec was uncommitted when the review started. While tests ran, HEAD moved to `2c17d325` (`docs(pragma): spec the concert calendar file`), which adds only `spec/spec.md`. `git diff --quiet 3a5ec7d2 -- apps` was checked before each test run, so the tests ran on code identical to the reviewed SHA. Code was read through the reviewed SHA.

The spec is in a short form (two behaviour sections, eight numbered bullets, no *Test strategy*). Categories A and D are built from those bullets, in order. 4 use cases routed to /visual-validation; out of scope for this report: the link sits beside "Je serai là !" (bullet 1), it shows the icon only below 640 px (bullet 3), the bar fits at 375 px (bullet 3), and a phone offers to add the file to its calendar app (bullet 4). No deferrals or future work in the spec.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | — | UNVERIFIABLE (non-blocking) |
| A01 | 1 | The ticket offers "Ajouter à mon calendrier" / "Add to my calendar" through i18n | apps/pragma/site/src/components/organisms/ConcertSignUpCard.tsx:116; apps/pragma/site/src/i18n/fr.json:1162; en.json:1162 | `{t('concerts.addToCalendar')}`; `"addToCalendar": "Ajouter à mon calendrier",`; `"addToCalendar": "Add to my calendar",` | PASS |
| A02 | 2 | Shows before the sign-up and after it, beside "Inscrit·e" and "Un·e ami·e" | ConcertSignUpCard.tsx:136, :149 | registered branch ends `{t('concerts.signUpFriend')}</Button>` then `{calendarLink}` (136); unregistered branch `{t('concerts.signUp')}</Button>` then `{calendarLink}` (149) | PASS |
| A03 | 3 | Icon only below 640 px, label kept as accessible name | apps/pragma/site/src/components/atoms/ButtonAnchor.tsx:40-41; button.variants.ts:32, :41; ConcertSignUpCard.tsx:112 | `labelDisplay="wide-only"`; `<span className={PHONE_HIDDEN_LABEL_CLASS}>{children}</span>`; `PHONE_HIDDEN_LABEL_CLASS = 'max-sm:sr-only'` | PASS |
| A04 | 4 | A tap opens the calendar file in the same tab | ButtonAnchor.tsx:18, :35; ConcertSignUpCard.tsx:108-109; concert-ticket.core.ts:59-61 | `{...(opensInPlace ? {} : NEW_TAB_ATTRIBUTES)}`; `href={buildConcertCalendarUrl(API_BASE, concert.sessionId)}` `opensInPlace`; `` `${apiBase}/api/concert-registrations/concerts/${encodeURIComponent(sessionId)}/calendar` `` | PASS |
| A05 | 5 | `GET …/concerts/:sessionId/calendar` is public and rate limited like the other public reads | apps/pragma/api/src/concert-registrations/concert-registrations.controller.ts:57, :66-68 | route sits on `publicRouter` beside `.get('/upcoming', limitReads, …)`; `'/concerts/:sessionId/calendar',` `limitReads,` `zValidator('param', concertParamSchema),` | PASS |
| A06 | 5 | Answers `text/calendar; charset=utf-8` as an attachment named `pragma-concert.ics` | controller.ts:49, :76-78; concert-calendar.core.ts:4 | `CALENDAR_CONTENT_TYPE = 'text/calendar; charset=utf-8'`; `` context.header('content-disposition', `attachment; filename="${outcome.fileName}"`) ``; `CONCERT_CALENDAR_FILE_NAME = 'pragma-concert.ics'` | PASS |
| A07 | 6 | One event, stable UID from the session id | apps/pragma/api/src/concert-registrations/concert-calendar.core.ts:31-32 | `const event = new ICAL.Event();` `` event.uid = `${input.sessionId}@${UID_DOMAIN}`; `` | PASS |
| A08 | 6 | Start at the concert, end two hours later | concert-calendar.core.ts:34-38 | `event.startDate = ICAL.Time.fromJSDate(input.date, IS_UTC);` `new Date(input.date.getTime() + CONCERT_CALENDAR_EVENT_HOURS * MILLISECONDS_PER_HOUR)` | PASS |
| A09 | 6 | Summary `pragma · <venue>`, or `pragma` without a venue | concert-calendar.core.ts:21-23, :39 | `return venue === null ? BAND_NAME : \`${BAND_NAME} · ${venue}\`;` | PASS |
| A10 | 6 | Venue as location, public message as description, each left out when absent | concert-calendar.core.ts:40-41; concert-calendar.service.ts:27-28 | `if (input.venue !== null) event.location = input.venue;` `if (input.message !== null) event.description = input.message;`; `message: concert.publicMessage,` | PASS |
| A11 | 7 | Practice, past concert or unknown id answers 422 `not-an-upcoming-concert` | concert-calendar.service.ts:17-19; controller.ts:37, :74 | `if (concert === null \|\| !isUpcomingConcert(concert, params.now)) {` `return refuse('not-an-upcoming-concert');`; `'not-an-upcoming-concert': 422,` | PASS |
| A12 | 8 | Reveals nothing the `upcoming` list does not show | concert-calendar.service.ts:17-29; concert-registrations.service.ts:71-79; concert-registrations.core.ts:44-47 | Same window (`listConcertsFrom(startOfParisDay(now))` filtered on `CONCERT_KIND`, vs `isUpcomingConcert` → `kind === CONCERT_KIND` and `date >= startOfParisDay(now)`). Fields used (`id`, `date`, `venue`, `publicMessage`) all appear in the list as `sessionId`, `date`, `venue`, `message` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <13 changed .ts/.tsx files>` | exit 0, no diagnostics | PASS |
| B02 | knip clean | `pnpm exec knip --workspace apps/pragma` | exit 0; one configuration hint about `.css`, no unused file, export or dependency | PASS |
| B03 | No abbreviations / 1-letter locals; names state the result | read changed sources in full | `buildConcertCalendar`, `describeSummary`, `readConcertCalendar`, `buildConcertCalendarUrl`, `isLabelHiddenOnPhone`; none found | PASS |
| B04 | Magic numbers and strings are named constants | read concert-calendar.core.ts, controller.ts, ButtonAnchor.tsx, ConcertSignUpCard.tsx | `MILLISECONDS_PER_HOUR = 3_600_000`, `UID_DOMAIN`, `PRODUCT_ID`, `CALENDAR_CONTENT_TYPE`, `CALENDAR_CLASS`, `NEW_TAB_ATTRIBUTES`; none found | PASS |
| B05 | Type assertions only `as const`/`as unknown`; no `any` | `grep -nP '\bany\b'` and `grep -nE '\bas [A-Z]'` on changed files | no matches; only `as const` at ButtonAnchor.tsx:18 | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read changed code | no array index access in changed code; `STATUS_BY_REFUSAL[outcome.reason]` is a typed record over a closed union (controller.ts:74) | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B08 | Standards checklist: blueprints (`// @FollowsBlueprint`) copied | read against `.claude/skills/blueprint/blueprint-index.md` rows `core-serializer`, `service-orchestration`, `controller-file-response`, `atom-variant` | concert-calendar.core.ts:26 takes `now` as an argument and returns the whole string; controller.ts:65 sets content type and `content-disposition` then `context.body(...)`; ButtonAnchor.tsx composes through `composeClassName` and exports only the component | PASS |
| B09 | Standards checklist: "a `find…` returns `null` …, a `build…` … returns what its verb says" (01-naming) | read in full | `buildConcertCalendar(...): string` assembles a new value (concert-calendar.core.ts:27); `buildConcertCalendarUrl(...): string` (concert-ticket.core.ts:59) | PASS |
| B10 | Standards checklist: "a definition in a `VOCABULARY.md` and a rule in an `INVARIANTS.md` are still true" and "an invariant promising behaviour carries a `Held by:` line" (01-naming) | read apps/pragma/site/src/routes/concerts/INVARIANTS.md in full | new bullet (lines 19-24) is true against the code; `Held by:` lines added at 63-65 name tests that exist and pass | PASS |
| B11 | Standards checklist: "a boolean name is not negated" (01-naming) | read in full | `opensInPlace`, `isLabelHiddenOnPhone`, `IS_UTC` | PASS |
| B12 | Standards checklist: "a comment documents something the code cannot say" (01-naming) | read in full | no new comment besides `@FollowsBlueprint` markers | PASS |
| B13 | Standards checklist: "the choice between `.core.ts` and `.utils.ts`" (02-purity) | read in full | `concert-calendar.core.ts` builds a band concert event, a domain term; the URL builder sits in `concert-ticket.core.ts` beside `buildVenueMapUrl` | PASS |
| B14 | Standards checklist: "a limit or a rule written in a site does not restate one the API enforces" (02-purity) | read site changes | the site holds only the route path (concert-ticket.core.ts:60), no limit or rule; the two-hour length lives only in the API | PASS |
| B15 | Standards checklist: "untrusted input is parsed with Zod" (03-typing) | read controller | `zValidator('param', concertParamSchema)` at controller.ts:69; `concertParamSchema = z.object({ sessionId: z.guid() })` | PASS |
| B16 | Standards checklist: "a repository returns rows … rather than a shape it derived" (04-backend) | read service and repository use | no repository change; the service reuses `findConcertAnnouncement`, which returns the projected row or `null` | PASS |
| B17 | Standards checklist: "a prop set has not grown a family of booleans where one variant string belongs" (05-frontend) | read ButtonAnchor.tsx in full | one boolean added (`opensInPlace`, line 14) next to the existing `labelDisplay` variant; not a family | PASS |
| B18 | Standards checklist: "no new … button label explains the interface" (05-frontend) | read ConcertSignUpCard.tsx | label is the short action "Ajouter à mon calendrier" beside its icon, the wording the operator asked for | PASS |
| B19 | Standards checklist: "a set of more than two visual variants goes through `cva`" (08-styling) | read ButtonAnchor.tsx | phone-only label goes through the existing `labelDisplay` cva axis (`buttonVariants({ variant, size, labelDisplay })`, line 37) | PASS |
| B20 | Standards checklist: "a key's dotted path names the screen and the element" (09-i18n) | read en.json/fr.json | `concerts.addToCalendar`, beside `concerts.signUpFriend` | PASS |
| B21 | Standards checklist: "a test name states the behaviour and the condition" (10-testing) | read new tests | "hands anyone the next concert as a calendar file, and refuses a practice, a past concert and an unknown one"; "names the event after the band alone and leaves out the place and the note a concert lacks" | PASS |
| B22 | Standards checklist: 375 px screens, tabs past the fold, pointer handling (05-frontend) | routed | layout at a width is `/visual-validation`'s; no drag control added | PASS (routed to /visual-validation) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse 458e886c…) --coverage --reporter=verbose` | 0. 85 files, 523 tests. Feature tests named in the run: `api/src/concert-registrations/concert-calendar.core.test.ts`, `site/src/routes/concerts/ConcertsLandingPage.test.tsx` (incl. "offers the concert as a calendar file, opened in place"), `site/src/routes/concerts/concert-ticket.core.test.ts` | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse 458e886c…) --reporter=verbose` | 0. 53 files, 544 tests, incl. `api/src/concert-registrations/concert-registrations.controller.test.ts` › "hands anyone the next concert as a calendar file, …" and › "answers every public route without a session cookie …" | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh $(git rev-parse 458e886c…) apps/pragma` (concert-calendar.core.ts, concert-ticket.core.ts) | 0. 71 mutants, 0 survived, score 100.00 | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling `*.utils.test.ts` | loop over `git ls-files '*.utils.ts'` printed no missing test | PASS |

No merge commit above the base (`git rev-list --merges` empty). No lockfile or catalog change.

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | 1. The ticket offers "Add to my calendar" through i18n | `it('offers the concert as a calendar file, opened in place')` at apps/pragma/site/src/routes/concerts/ConcertsLandingPage.test.tsx:123; assertion `await screen.findByRole('link', { name: 'Add to my calendar' })` (:125) | PASS |
| D02 | 2a. Shows before the sign-up | same test, rendered with no remembered registration; `findByRole('link', { name: 'Add to my calendar' })` at ConcertsLandingPage.test.tsx:125; also `expect(screen.getAllByRole('link')).toHaveLength(2)` at :120 | PASS |
| D03 | 2b. Shows after the sign-up, beside "Inscrit·e" and "Un·e ami·e" | (none found). The registered-state tests (`'shows a concert already signed up for in this browser as done'`, ConcertsLandingPage.test.tsx:244) assert "Signed up" and no sign-up button, never the calendar link. Failing case: delete `{calendarLink}` at ConcertSignUpCard.tsx:136, and a fan who signed up sees no "Add to my calendar" while every test still passes | FAIL (blocking) |
| D04 | 3. The label stays the accessible name when the icon shows alone | **structural:** the label is never removed, only visually hidden, `<span className={PHONE_HIDDEN_LABEL_CLASS}>{children}</span>` at ButtonAnchor.tsx:41 with `PHONE_HIDDEN_LABEL_CLASS = 'max-sm:sr-only'` (button.variants.ts:41); the name is asserted at ConcertsLandingPage.test.tsx:125 | PASS |
| D05 | 4. A tap opens the file in the same tab | ConcertsLandingPage.test.tsx:126-129; `expect(calendar.getAttribute('href')).toBe(\`/api/concert-registrations/concerts/${NEXT_CONCERT.sessionId}/calendar\`)` and `expect(calendar.getAttribute('target')).toBeNull()`; URL on a preview origin at concert-ticket.core.test.ts:63-65 `toBe('https://api.example.test/api/concert-registrations/concerts/a%2Fb/calendar')` | PASS |
| D06 | 5a. The route is public | `it('hands anyone the next concert as a calendar file, …')` at apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts:470, request without cookie, `expect(calendar.status).toBe(200)` (:487); and `expect(response.status).not.toBe(UNAUTHORISED)` at :213 over the list including the calendar route (:207) | PASS |
| D07 | 5b. Rate limited like the other public reads | (none found). The only 429 test on the read budget hammers `/registrations/:id` (controller.test.ts:595-611). Failing case: remove `limitReads,` at controller.ts:68, and the 121st calendar request from one address within a minute answers 200 where the spec wants 429, with every test still passing | FAIL (blocking) |
| D08 | 5c. `text/calendar; charset=utf-8` | controller.test.ts:488 `expect(calendar.headers.get('content-type')).toBe('text/calendar; charset=utf-8')` | PASS |
| D09 | 5d. Attachment named `pragma-concert.ics` | controller.test.ts:489-491 `expect(calendar.headers.get('content-disposition')).toBe('attachment; filename="pragma-concert.ics"')` | PASS |
| D10 | 6a. One event with a stable UID from the session id | `it('writes one event that starts at the concert, lasts two hours, …')` at apps/pragma/api/src/concert-registrations/concert-calendar.core.test.ts:9, whole-document `toBe` with `` `UID:${SESSION_ID}@pragma.borso.fr` `` (:25); e2e `expect(body).toContain(\`UID:${concert}@pragma.borso.fr\`)` controller.test.ts:493 | PASS |
| D11 | 6b. Starts at the concert | concert-calendar.core.test.ts:27 `'DTSTART:20261212T203000Z'` inside the exact `toBe` | PASS |
| D12 | 6c. Ends two hours later | concert-calendar.core.test.ts:28 `'DTEND:20261212T223000Z'` | PASS |
| D13 | 6d. Summary `pragma · <venue>` | concert-calendar.core.test.ts:29 `'SUMMARY:pragma · La Cave\\, Paris'` | PASS |
| D14 | 6e. Summary `pragma` without a venue | `it('names the event after the band alone …')` at concert-calendar.core.test.ts:37, venue `null`; `expect(calendar).toContain('\r\nSUMMARY:pragma\r\n')` (:46) | PASS |
| D15 | 6f. Venue as location, left out when absent | :30 `'LOCATION:La Cave\\, Paris'`; :47 `expect(calendar).not.toContain('LOCATION')` with `venue: null` | PASS |
| D16 | 6g. Public message as description, left out when absent | :31 `'DESCRIPTION:Doors at 8.\\nFree entry.'`; :48 `expect(calendar).not.toContain('DESCRIPTION')` with `message: null` | PASS |
| D17 | 7a. A practice answers 422 `not-an-upcoming-concert` | controller.test.ts:473-476 creates `kind: 'practice'`; loop at :496-503 `expect(refused.status).toBe(422)` and `.toBe('not-an-upcoming-concert')` | PASS |
| D18 | 7b. A past concert answers 422 | controller.test.ts:477-481 concert two days ago; same assertions :501-502 | PASS |
| D19 | 7c. An unknown id answers 422 | `UNKNOWN_ID = '00000000-0000-0000-0000-000000000000'` (:24) in the loop; same assertions :501-502 | PASS |
| D20 | 8. Reveals nothing the `upcoming` list does not show | **structural:** the service refuses anything `isUpcomingConcert` rejects (concert-calendar.service.ts:18), the same window `listUpcomingConcerts` reads (`listConcertsFrom(startOfParisDay(now))`, concert-registrations.service.ts:71), and it passes only `id`, `date`, `venue`, `publicMessage` (service.ts:24-29), all four in `UpcomingConcertView` (service.ts:76-79). The refusals in D17-D19 test the window | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths in the diff | List every write path | `git diff <base>...<reviewed> -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| grep -nE '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` prints nothing. The new route only reads (`findConcertAnnouncement`, concert-calendar.service.ts:17) | PASS |
| E02 | Module-level state in changed API files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on concert-calendar.core.ts, concert-calendar.service.ts, concert-registrations.controller.ts prints nothing | PASS |
| E03 | `limitReads` on the new route (controller.ts:68) | Per-process state | The bucket store is an in-memory `Map` per Lambda instance (`createBucketStore`, api/src/auth/rate-limit.utils.ts:90), pre-existing. The spec asks for a limit "like the other public reads", which share this same per-instance limiter, so it states no application-wide rule | PASS |

## Blocking findings

- D03 — No test asserts the calendar link in the signed-up state. Removing it from ConcertSignUpCard.tsx:136 passes every test.
- D07 — No test asserts the calendar route's rate limit. Removing `limitReads` from controller.ts:68 passes every test.

## Non-blocking findings

- A00 — No plan. Files were taken from the diff.

## Notes

- A00: the brief says the change is small and has no plan. The diff matches the eight spec bullets with nothing left over, so the missing plan hid nothing here.
- A malformed id such as `GET /api/concert-registrations/concerts/abc/calendar` answers 400 from `zValidator`, not 422. The sign-up route answers the same way through `concertParamSchema`. Is "an unknown id" in bullet 7 meant to cover only a well-formed id that names no session?
- `calendar.toString()` from ical.js ends at `END:VCALENDAR` with no final CRLF (the core test asserts exactly that at concert-calendar.core.test.ts:33-34). RFC 5545 ends every content line with CRLF. Is any target calendar app known to reject a file without it? iOS and Google Calendar import behaviour is unverified here. `/visual-validation` on a phone would show it.
- The route's rules (two hours, 422 refusal, public) are written in `site/src/routes/concerts/INVARIANTS.md`. `api/src/concert-registrations/INVARIANTS.md`, where the route lives and where the other public routes' rules sit, gains no bullet. Should the API rules move there? No reviewer bullet covers where an invariant lives.

## Verdict: FAIL
