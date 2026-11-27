# Technical validation — Add the next concert to my calendar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (no `plan/plan.md`; carried from round 1 as A00, not repeated here)
- Branch: claude/hopeful-gates-16xq74
- Base: 458e886c43f39c5561b65185c897060f2df4c3bf
- Run at: 2026-11-27T09:46:38Z
- Round: 2
- Reviewed: b745a2a9f65b19c86a78c4a20b255624ccccb983
- Touched workspaces: @borso-app/pragma (api, site)

Round 2 reads only `git diff 3a5ec7d24e96422f9e99a94e48abf8214e4ea151..b745a2a9`. It holds two commits. `2c17d325` commits the spec that round 1 read uncommitted. `b745a2a9` fixes D03 and D07, dismisses A00, and answers two round-1 notes. HEAD stayed at `b745a2a9` for the whole review, and every test and probe ran in the working tree at that SHA. Both probes were reverted, and `git status --short apps/` printed nothing afterwards.

The fix commit carries new scope beyond the two tests. It changes `concert-calendar.core.ts`, so the file now ends with a CRLF. It moves the route's rules from `site/src/routes/concerts/INVARIANTS.md` to `api/src/concert-registrations/INVARIANTS.md`, and it adds a term to `apps/pragma/VOCABULARY.md`. Category A walks the source change, and category B reads the three documents in full. Round 1 had already read `concert-calendar.core.ts` in full, so the only line walked here is the changed return.

The spec is in the short form. 4 use cases routed to /visual-validation; out of scope for this report (unchanged from round 1).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | 6 | The changed return still writes one whole calendar. The trailing CRLF the commit adds is the only difference | apps/pragma/api/src/concert-registrations/concert-calendar.core.ts:12, :43 | `const LINE_END = '\r\n';` `` return `${calendar.toString()}${LINE_END}`; `` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D03, no test asserts the calendar link once signed up | `b745a2a9` apps/pragma/site/src/routes/concerts/ConcertsLandingPage.test.tsx:253 `expect(screen.getByRole('link', { name: 'Add to my calendar' })).toBeTruthy();`, inside `it('shows a concert already signed up for in this browser as done')` (:243), which seeds `pragma.registration.${A_CONCERT}` in localStorage (:244-247). Probe: deleting `{calendarLink}` at ConcertSignUpCard.tsx:136 makes that test fail (`× shows a concert already signed up for in this browser as done`). Reverted afterwards | PASS |
| R02 | D07, no test asserts the calendar route's rate limit | `b745a2a9` apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts:614-628 `it('bars an address that hammers the calendar file of a concert')`, which sends `CONCERT_REGISTRATION_READ_BUDGET.maxAttempts` requests from `203.0.113.24`. Then `expect(lastStatus).toBe(200)` and `expect((await fromOneAddress()).status).toBe(429)`. Probe: deleting `limitReads,` at controller.ts:68 makes that test fail with `AssertionError: expected 200 to be 429`. Reverted afterwards | PASS |
| R03 | A00 (non-blocking), dismissed in `b745a2a9` as "the change matches the spec's eight bullets; no plan" | Round 1 rows A01-A12 all PASS against the eight bullets. The only source line added since then is the CRLF return (A01 above), which adds no behaviour outside the spec. The dismissal holds | PASS |
| R04 | Round-1 note, the missing final CRLF. The commit claims "the file now ends with CRLF as RFC 5545 asks" | concert-calendar.core.ts:43 appends `LINE_END`. The exact-document assertion now ends `'END:VCALENDAR',` `'',` `].join('\r\n')` (concert-calendar.core.test.ts:32-34). Mutation on the file scored 100% (C03) | PASS |
| R05 | Round-1 note, the route's rules sit in the site's invariants. The commit claims they "moved to api/src/concert-registrations/INVARIANTS.md, under a new 'Concert calendar file' term" | api/src/concert-registrations/INVARIANTS.md:84-96 `## Concert calendar file` with three `Held by:` lines. VOCABULARY.md:215-226 `## Concert calendar file` with `Invariants: \`api/src/concert-registrations/INVARIANTS.md\``. The site bullet now points there (site INVARIANTS.md:22-23). `scripts/check-vocabulary-paths.sh` exits 0 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware` on concert-calendar.core.ts, concert-calendar.core.test.ts, concert-registrations.controller.test.ts, ConcertsLandingPage.test.tsx | exit 0, no diagnostics | PASS |
| B02 | Vocabulary paths gate | `bash scripts/check-vocabulary-paths.sh` | exit 0, "every term names a folder that exists and reaches its invariants, every Held by names a test that exists" | PASS |
| B03 | Names carry intent; magic values are named constants | read the changed lines | `LINE_END = '\r\n'` (concert-calendar.core.ts:12); test locals `fromOneAddress`, `lastStatus`, `attempt` | PASS |
| B04 | Type assertions only `as const`/`as unknown`; no `any` | `grep -nP '\bany\b\|\bas [A-Z]'` on concert-calendar.core.ts | none found | PASS |
| B05 | `noUncheckedIndexedAccess`; `useEffect` | read the changed lines; `grep -nE '\buseEffect\('` | no index access and no `useEffect` in the changed code | PASS |
| B06 | Standards checklist (01-naming): "a definition in a `VOCABULARY.md` … is still true" | read VOCABULARY.md:215-226 in full | "The `.ics` file of one upcoming concert … opens with 'Ajouter à mon calendrier'" matches the route and link. "Not to be confused with: a **calendar feed**" points at a term that exists (VOCABULARY.md:123) | PASS |
| B07 | Standards checklist (01-naming): "a rule in an `INVARIANTS.md` [is] still true" | read api/src/concert-registrations/INVARIANTS.md:84-96 in full | `the summary \`pragma · <venue>\`, the venue and the public message` at INVARIANTS.md:88-89. Failing case: a concert with `venue: null` gets `SUMMARY:pragma` (concert-calendar.core.ts:22-23, asserted at concert-calendar.core.test.ts:46), not `pragma · <venue>`, and it has no `LOCATION`. The bullet also omits that a missing venue or message is left out. The `Held by:` lines skip the test that holds that case (`names the event after the band alone and leaves out the place and the note a concert lacks`). Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B08 | Standards checklist (01-naming): "an invariant promising behaviour carries a `Held by:` line" | read both changed INVARIANTS.md files in full | api: three `Held by:` lines, including the new rate-limit test (INVARIANTS.md:96). Site: the "before and after the sign-up" bullet is held by `offers the concert as a calendar file, opened in place` (:62) and `shows a concert already signed up for in this browser as done` (:73) | PASS |
| B09 | Standards checklist (01-naming): "a comment documents something the code cannot say" | read the changed lines | no comment added | PASS |
| B10 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read the new test | "bars an address that hammers the calendar file of a concert" names the refusal and its condition, worded like its siblings at controller.test.ts:596 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse 3a5ec7d2…) --coverage --reporter=verbose` | 0. 5 files, 36 tests, including `concert-calendar.core.test.ts` › both tests and `ConcertsLandingPage.test.tsx` › "shows a concert already signed up for in this browser as done" | PASS |
| C02 | @borso-app/pragma | `DATABASE_URL=$(../../scripts/local-postgres.sh start pragma)`, then `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse 3a5ec7d2…) --reporter=verbose` | 0. 53 files, 545 tests, including `concert-registrations.controller.test.ts` › "bars an address that hammers the calendar file of a concert" and › "hands anyone the next concert as a calendar file, …" | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh $(git rev-parse 3a5ec7d2…) apps/pragma` (concert-calendar.core.ts) | 0. 20 killed, 0 survived, score 100.00 | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling test | no `*.utils.ts` added or changed since round 1, which found none missing | PASS |

No merge commit since the reviewed SHA (`git rev-list --merges` printed nothing). No lockfile or catalog change.

## D. Test coverage of spec

The two round-1 gaps are re-checked as R01 and R02. The rows below update round 1's D03 and D07. Every other D row is unchanged, because no test they cite was touched apart from the extra `''` at concert-calendar.core.test.ts:33.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | 2b. Shows after the sign-up, beside "Inscrit·e" and "Un·e ami·e" | `it('shows a concert already signed up for in this browser as done')` at apps/pragma/site/src/routes/concerts/ConcertsLandingPage.test.tsx:243. Assertion `expect(screen.getByRole('link', { name: 'Add to my calendar' })).toBeTruthy()` at :253. Probe in R01 shows it fails without the link | PASS |
| D02 | 5b. Rate limited like the other public reads | `it('bars an address that hammers the calendar file of a concert')` at apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts:614. Assertion `expect((await fromOneAddress()).status).toBe(429)` at :627. Probe in R02 shows it fails without `limitReads` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths in the round-2 diff | List every write path | `git diff 3a5ec7d2..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| grep -nE '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` prints nothing (grep exit 1). No service, repository or controller changed | PASS |
| E02 | Module-level state | Per-process state | The only module-level addition is `const LINE_END = '\r\n';` (concert-calendar.core.ts:12), an immutable string. The per-instance `limitReads` bucket was judged in round 1 (E03) and is unchanged | PASS |

## Blocking findings

- None.

## Non-blocking findings

- B07 — The new API invariant says the summary is `pragma · <venue>` and that the event carries the venue and the message. A concert with no venue gets `SUMMARY:pragma` and no `LOCATION`. The bullet should state that case, and a `Held by:` line should name the core test that holds it.

## Notes

- A round-1 question is still open, and `b745a2a9` does not answer it. A malformed id, such as `GET /api/concert-registrations/concerts/abc/calendar`, answers 400 from `zValidator`, not the 422 of spec bullet 7. Does "an unknown id" cover only a well-formed id that names no session? The sign-up route behaves the same way.
- Whether a phone's calendar app accepts the file is still `/visual-validation`'s to show. The trailing CRLF removes one known RFC 5545 deviation, but no import was tried here.

## Verdict: PASS
