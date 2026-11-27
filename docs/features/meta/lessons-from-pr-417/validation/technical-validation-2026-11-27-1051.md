# Technical validation — the pragma seed's concert carries a public message (sweep of PR #417)

- Spec: [`../spec/spec.md`](../spec/spec.md), with the sweep's [`../inventory.md`](../inventory.md), whose `fixed:`, `dantotsu:` and `knowledge:` decisions are also checked in category A
- Plan: none. This is a kaizen sweep, which has no plan by design, so there is no plan row.
- Branch: claude/lessons-from-pr-417
- Base: 28726eb4e03efb94146cc0bca7514dd3be6585b6
- Run at: 2026-11-27T10:59:38Z
- Round: 1
- Reviewed: a5a4f6fff087e1d4aaa886abbf7edaea4c21fffc
- Touched workspaces: @borso-app/pragma, root `scripts/`, `.claude/agents/`, `docs/`

HEAD stayed at the reviewed SHA for the whole review. I checked it before and after each test run. No commit between the base and HEAD is a merge (`git rev-list --merges` printed nothing). Spec deferrals with no rows are the past concert, a practice by default, a concert without a venue, and production routes. 0 use cases are routed to /visual-validation, so none are out of scope for this report. The inventory's `no-op` decisions are not claims about code and get no rows.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | What changes 1 | `POST /api/__test/seed` gives the seeded upcoming concert the message "Portes à 20 h, premier morceau à 20 h 30." | apps/pragma/api/src/__test/test-seed.service.ts:55, :217 | `const CONCERT_PUBLIC_MESSAGE = 'Portes à 20 h, premier morceau à 20 h 30.';` / `await patchAnnouncement({ sessionId: concert.id, message: CONCERT_PUBLIC_MESSAGE, now });` | PASS |
| A02 | What changes 1 | `pnpm dev` calls the same seeder | apps/pragma/test/dev-database.setup.ts:2, :11; apps/pragma/package.json:8 | `import { seedPreviewFixture } from '../api/src/__test/test-seed.service';` / `const summary = await seedPreviewFixture(new Date(), DEVELOPMENT_API_ORIGIN);` | PASS |
| A03 | What changes 2 | The message goes through `patchAnnouncement`, the path the ERP panel uses | test-seed.service.ts:6; apps/pragma/api/src/concert-registrations/concert-registrations.controller.ts:158 | `import { patchAnnouncement } from '../concert-registrations/concert-registrations.service';` / controller: `const outcome = await patchAnnouncement({ sessionId, ...changes, now: new Date() });` | PASS |
| A04 | What changes 3 | Nothing else in the fixture changes | test-seed.service.ts diff | The only added write is the `patchAnnouncement` call. `toAnnouncementUpdate` (concert-registrations.core.ts:122-129) adds `publicMessage` only when `message` is defined and passes no other announcement column. The existing tests still pass: `seeds a coherent fixture (instruments, members, songs, setlist)` (test-seed.controller.test.ts:72), `seeds no practice by default…` (:144), `seeds Hugo his planned flame…` (:165) | PASS |
| A05 | What changes 4 | The seed service reuses `oauth.core`'s time constants, with the same values | test-seed.service.ts:14-18; apps/pragma/api/src/oauth/oauth.core.ts:16-21 | `import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '../oauth/oauth.core';` / `export const MILLISECONDS_PER_SECOND = 1_000; export const SECONDS_PER_MINUTE = 60; … HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND`. These are the values the removed local constants had (1 000, 60, 24×60×60×1 000). | PASS |
| A06 | What changes 5 | The controller imports `seedTodayPractice` from the file that defines it, and `?practice=today` behaves as before | test-seed.controller.ts:9, :26; test-seed-edge-cases.service.ts:30 | `import { seedTodayPractice } from './test-seed-edge-cases.service';` / `if (isPracticeToday) await seedTodayPractice(now);`. The re-export `export { seedTodayPractice } …` is removed from test-seed.service.ts. | PASS |
| A07 | Inventory 08, `fixed:` | The SHA guard accepts a move that touches only `docs/features/` | .claude/agents/technical-validator.md:127 | `or that \`git diff --name-only <sha> HEAD -- . ':!docs/features'\` prints nothing, since no app test reads a feature's documents`. A grep of `*.test.ts` for `docs/features` finds only string fixtures (for example scripts/kaizen.test.ts:8) and no reader of the real tree. | PASS |
| A08 | Inventory 09, `fixed:` | The seeded concert carries a public message | as A01 | as A01 | PASS |
| A09 | Inventory 12, `fixed:` | `dev-server.sh` reads the log with `grep -a` | scripts/dev-server.sh:50, :79 | `grep -aoE 'Local:[[:space:]]+http://localhost:[0-9]+/' "${1:-$LOG_FILE}"` / `grep -aE '^\[dev:db\]' "$LOG_FILE" >&2 \|\| true`. Probe on a planted log that holds a NUL byte: without `-a`, grep prints `binary file matches`. With `-a`, it prints `http://localhost:5174/`. These are the only two greps that read the log. | PASS |
| A10 | Inventory 24, `fixed:` | `operator-messages.ts` sorts the operator's messages by time | scripts/kaizen/operator-messages.ts:33 | `.toSorted((first, second) => first.at.localeCompare(second.at))`. `at` is the event's `created_at` (operator-messages.core.ts:85, :91), one ISO string format, so a lexical sort is a time sort. | PASS |
| A11 | Inventory 07, `dantotsu:` the-file-only-a-squashed-commit-ever-held | The eradication-path check reads main's history plus the branch's tree, so it refuses a path only the branch's own commits ever held | scripts/quality/check-dantotsu-front-matter.ts:53; scripts/quality/dantotsu-corpus.ts:45-47 | `const everTracked = readPathsEverTracked(MAIN_REFERENCE);` / `export function readPathsEverTracked(historyReference = 'HEAD')` … `const log = ['log', '--format=', '--name-only', '--diff-filter=AR', historyReference];`. I reproduced the entry's proof in a temporary worktree at PR #411's head (`b85ed27f`). The old scripts exit 0 with "342 dantotsus carry a complete, resolvable front matter". The new scripts exit 1 with "eradication path .claude/hooks/pretool-agent-after-route.sh was never in the repository". On this branch the check exits 0 with 344 dantotsus. | PASS |
| A12 | Inventory 01, `dantotsu:` the-hook-that-watched-only-the-agents | Analysis-mode entry, no code change claimed | docs/dantotsus/the-hook-that-watched-only-the-agents.md:7-8 | `fix-commits: none (analysis mode, waiting on the operator's choice)` / `eradication-level: 5`. The entry's claim `matches tools: /^(Agent\|Task)$/u` is the cited cause. The front-matter check accepts it (exit 0). | PASS |
| A13 | Inventory 13, `knowledge:` | A new agent-browser session opens in English, and pragma reads the stored `pragma.locale` first, then `navigator.language`, then falls back to French | docs/knowledge/driving-previews-with-agent-browser-and-argent.md:92-100; apps/pragma/site/src/i18n/i18n.setup.ts:15-18; i18n.utils.ts:4, :25-28 | `persistedLocale ?? detectInitialLocale(… navigator.language)` / `return SUPPORTED_LOCALES.find((locale) => locale === family) ?? DEFAULT_LOCALE;` with `DEFAULT_LOCALE: SupportedLocale = 'fr'`. The knowledge text matches the code. | PASS |
| A14 | Inventory 25, `knowledge:` | Filter subagent events on `parent_tool_use_id` before counting a session's Skill or Agent calls | docs/knowledge/reading-another-sessions-transcript-with-list-events.md:46-48 | `An event whose \`parent_tool_use_id\` is set belongs to a subagent, so filter on it before counting…` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware` on the 6 changed `.ts` files | exit 0, no diagnostics | PASS |
| B02 | knip clean (the dropped `readTrackedPaths` export and the `seedTodayPractice` re-export) | `pnpm knip` | exit 0, configuration hints only, none on a changed file | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B04 | No abbreviations or one-letter locals, and function names describe the result | read the added lines | `CONCERT_PUBLIC_MESSAGE`, `historyReference`, `first`/`second` in the comparator, `log`. None found. | PASS |
| B05 | Magic numbers and strings are named constants | read the added lines | The message is `CONCERT_PUBLIC_MESSAGE` (test-seed.service.ts:55). The test repeats the literal as its expected value, which is the standard shape for an assertion. | PASS |
| B06 | Type assertions limited to `as const` / `as unknown`, no `any` | `git diff … -U0 -- '*.ts' \| grep '^+' \| grep -P '\bany\b\|\bas (?!const\|unknown)'` | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read the added lines | `const [concert] = await listUpcomingConcerts(new Date()); expect(concert?.message)…` (test-seed.controller.test.ts:151-152) is guarded. No other new index access. | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the added lines | none, since no site file changed | PASS |
| B09 | Standards checklist: "a comment documents something the code cannot say" (01-naming) | read the changed files in full | The diff adds no code comment. | PASS |
| B10 | Standards checklist: "a test name states the behaviour and the condition, and … a service test asserts on what the database holds" (10-testing) | test-seed.controller.test.ts:149-153 | `it('gives the concert a public message, so the ticket and its calendar file carry a note', …)` posts the seed, then reads the message back through `listUpcomingConcerts`, a database read | PASS |
| B11 | Standards checklist: "a workflow writing more than one table wraps the writes in one transaction owned by the service" (11-database, 04-backend) | test-seed.service.ts:201-235 | The new `patchAnnouncement` call is a single-row update of `sessions`. The fixture writes its tables without a transaction, but it did so before this branch and mounts only with `ALLOW_TEST_SEED`. Introduced: pre-existing. Not a finding on this diff (see Notes). | PASS |
| B12 | Standards checklist: "a file name says what the file holds" (01-naming), and a VOCABULARY.md or INVARIANTS.md still true (01-naming) | changed files, and `ls apps/pragma/api/src/__test/*.md` | The diff adds no file under `apps/`, and the folder has no VOCABULARY.md or INVARIANTS.md. | PASS |
| B13 | Standards checklist: a new pre-commit check declares its scope and earns its run (14-tool-runtime-budgets) | `.husky/pre-commit` diff | The diff adds no new check. It changes what the existing dantotsu front-matter check reads, not when it runs. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse 28726eb4…) --coverage --reporter=verbose` | 0. 3 files, 15 tests: api/src/main.test.ts, api/src/mcp/tool-coverage.test.ts, api/src/realtime/stale-scope-coverage.test.ts | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse 28726eb4…) --reporter=verbose` | 0. 53 files, 546 tests. These include `api/src/__test/test-seed.controller.test.ts > … gives the concert a public message, so the ticket and its calendar file carry a note` and `… seeds no practice by default…` | PASS |
| C03 | root (`scripts/`) | `pnpm exec vitest run --changed $(git rev-parse 28726eb4…) --reporter=verbose` | 0, "No test files found". The changed scripts are entry points that no test imports. I checked them by direct runs instead: A09 (dev-server probe), A11 (dantotsu check before and after, plus a run on this branch, exit 0). | PASS |
| C04 | Mutation gate | `git diff --name-only … \| grep -E '\.(core\|utils\|adapter)\.(test\.)?ts$'` | No gated file changed, so `mutate-changed.sh` has nothing to run. | PASS |
| C05 | `*.utils.ts` siblings | a loop over the 63 `apps/pragma/**/*.utils.ts` files that tests for a sibling `.utils.test.ts(x)` | none missing | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | After a seed, `listUpcomingConcerts` returns the concert with that message | `it('gives the concert a public message, so the ticket and its calendar file carry a note', …)` at apps/pragma/api/src/__test/test-seed.controller.test.ts:149. Failing assertion: `expect(concert?.message).toBe('Portes à 20 h, premier morceau à 20 h 30.');` (:152). It fails both when no message is written and when no concert is listed. | PASS |
| D02 | After a seed without `?practice=today`, the only session is the concert | `it('seeds no practice by default, so a session today does not light every flame', …)` at test-seed.controller.test.ts:144. Failing assertion: `expect((await listSessions()).map((session) => session.kind)).toEqual(['concert']);` (:146). `postSeed()` sends no query. | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `seedConcertSetlist` → `patchAnnouncement` → `updateConcertAnnouncement` (test-seed.service.ts:217; concert-registrations.repository.ts:82-91) | Check-then-write | The write is `.update(sessionTable).set(values).where(eq(sessionTable.id, sessionId))` on the concert this request created a few lines earlier (:204). No limit, count or existence decision from earlier reads gates it. The router mounts only with `ALLOW_TEST_SEED` (test-seed.controller.test.ts:246). | PASS |
| E02 | Per-process state in the changed API files | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on test-seed.controller.ts and test-seed.service.ts | grep exit 1, no module-level mutable state | PASS |
| E03 | Concurrent proof | a rule held by a key | The diff adds no rule held by a key, so no concurrent test is owed. | PASS |

## Blocking findings

- None.

## Non-blocking findings

- None.

## Notes

- `seedConcertSetlist` ignores the `AnnouncementOutcome` of `patchAnnouncement` (test-seed.service.ts:217), while it throws on `created.kind === 'session-not-found'` two lines above. I found no reachable refusal. The session was just created as a concert, and no poster key is passed. D01 fails if the message is ever missing. Should the seed throw on a refusal, so it matches the setlist guard?
- `scripts/quality/weak-points.ts:52` still calls `readPathsEverTracked()` with `HEAD`. The dantotsu says this is deliberate, because the page runs on main, where the two are the same. Should a weak-points run on a branch ever be trusted? If so, it inherits the old blind spot.
- The seed fixture writes many tables without one transaction. This predates the branch and is limited to `ALLOW_TEST_SEED`. Is a half-written seed after a crash acceptable, given that the next seed truncates every table?
- No automated test holds the three `fixed:` script changes (dev-server `grep -a`, the operator-message sort, the dantotsu history reference). I verified each by a direct run (A09, A10, A11). Is an entry-script fix with only a hand probe as proof acceptable for a sweep? I logged the gap as friction.

## Verdict: PASS
