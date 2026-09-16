# Technical validation — The band writes down what it wants changed in pragma, and votes on it

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none — no `plan/plan.md` exists for this feature (see Notes)
- Branch: `claude/pragma-borso-backlog-feature-mtnzid`
- Base: `origin/main`
- Run at: 2026-09-15T19:36:00Z
- Touched workspaces: `@borso-app/pragma` (api + site + test harness), plus `docs/`

The spec carries **no *Test strategy* section**, so no assertions are routed to `/visual-validation`. Category D below is built from the spec's *Use cases / edge cases* list in full; rows whose only honest proof is a rendered browser are called out in Notes rather than silently claimed.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Result | Page at `/improvements` | `apps/pragma/site/src/App.tsx:45` | `<Route path="/improvements" element={<ImprovementsPage />} />` | PASS |
| A02 | Result | Reachable from the administration section of the navigation | `apps/pragma/site/src/components/organisms/AppShell.tsx:40` | `const ADMIN_NAV … { to: '/improvements', labelKey: 'nav.improvements', icon: 'bolt' }` | PASS |
| A03 | Result | Row = vote button with count, title, status badge, details when present | `ImprovementsPage.tsx:153-189` | `aria-pressed={row.votedByViewer}` … `{row.voteCount}` … `<Badge …>` … `{row.details === '' ? null : (` | PASS |
| A04 | Result | Ranked: open statuses first, then most voted, then oldest first | `improvements.core.ts:58-64` | `const byStatus = STATUS_RANK[left.status] - STATUS_RANK[right.status]` / `const byVotes = right.voteCount - left.voteCount` / `return left.createdAt.getTime() - right.createdAt.getTime()` | PASS |
| A05 | Result | A filter pill per status with counts, plus one for all | `ImprovementsPage.tsx:114-121` | `{ value: ALL_STATUSES, label: t('common.all'), count: improvements.length }, ...IMPROVEMENT_STATUSES.map((status) => ({ …, count: filterByStatus(improvements, status).length }))` | PASS |
| A06 | Result | Panel to file or edit: title, details, status | `ImprovementsPage.tsx:60-82, 213-253` | `useForm({ defaultValues: { title…, details…, status… } })` with three `<form.Field>` | PASS |
| A07 | Result | Deleting asks for confirmation | `ImprovementsPage.tsx:266-275` | `{pendingDeletionId === null ? null : (<ConfirmDialog question={t('improvements.deleteConfirm')} …` | PASS |
| A08 | Q.O.D. "What does a vote weigh?" | Row keyed on (improvement, member); casting twice changes nothing | `improvements.schema.ts:23` + `improvements.repository.ts:145-148` | `primaryKey({ columns: [table.improvementId, table.memberId] })` ; `.onConflictDoUpdate({ target: […], set: { castAt } })` | PASS |
| A09 | Q.O.D. "Where does the ranking happen?" | On the server, in a pure function, not in SQL | `improvements.service.ts:36-38` | `const [rows, votes] = await Promise.all([listImprovements(), listVotes()]);` / `return rankImprovements(rows.map(…readTally(tallies, row.id)))` — no join, no `ORDER BY` in the repository | PASS |
| A10 | Q.O.D. "Who is the author?" | Author from the session, never from the body | `improvements.controller.ts:28` + `improvements.schema.ts:29-33` | `await createImprovement(input, readMemberId(context), new Date())` ; the create schema has no `authorMemberId` field | PASS |
| A11 | Changes / Types | `improvement` carries title, details, status, authorMemberId, createdAt | `improvements.schema.ts:7-14` | `title: text('title').notNull(), details: text('details').notNull().default(''), status: …, authorMemberId: uuid('author_member_id').notNull(), createdAt: …` | PASS |
| A12 | Changes / Types | `improvement_vote` keyed on the pair, carries `castAt` | `improvements.schema.ts:16-24` | `castAt: timestamp('cast_at', …).notNull()` under the composite primary key | PASS |
| A13 | Changes / Types | `ImprovementStatus` = 5 values in that rank order | `improvements.schema.ts:4` + `core.ts:23-29` | `['idea','planned','building','shipped','declined'] as const` ; `STATUS_RANK = { idea: 0, planned: 1, building: 2, shipped: 3, declined: 4 }` | PASS |
| A14 | Changes / API | `/api/improvements` mounted, gated by `requireMemberSession`; list, create, patch, delete, PUT/DELETE vote | `app.ts:39`, `improvements.controller.ts:20-61` | `.route('/api/improvements', buildImprovementsRouter())` ; `.use('*', requireMemberSession)` then `.get('/')`, `.post('/')`, `.put('/:id')`, `.delete('/:id')`, `.put('/:id/vote')`, `.delete('/:id/vote')` | PASS |
| A15 | Changes / FE | Query module's vote mutation is optimistic and settles from its own response, not a refetch | `improvements.queries.ts:136-151` | `onMutate: … writeList(queryClient, … applyVoteIntent(improvement, variables.intent))` and `onSuccess: (data) => writeList(…, () => data.improvement)` — no `invalidateQueries` anywhere in the file | PASS |
| A16 | Changes / FE | A route, a page, a page core, a query module | diff | `routes/improvements/ImprovementsPage.tsx`, `routes/improvements/improvements-page.core.ts`, `lib/queries/improvements.queries.ts` all added | PASS |
| A17 | Changes / migration | Tables created; vote deletion cascades on delete | `migrations/0006_improvement_backlog.sql:11-27`, `improvements.repository.ts:105-110` | `await database.delete(improvementVoteTable).where(eq(improvementVoteTable.improvementId, id));` before deleting the improvement | PASS |
| A18 | Out of scope | No author name/avatar on the row, no edit/delete restriction, no comments/notifications/links | `ImprovementsPage.tsx:148-200` | row renders vote button, title, badge, details, delete only; `removeImprovement` has no ownership check | PASS |
| A19 | Vocabulary rule (CLAUDE.md) | New domain nouns documented | `apps/pragma/VOCABULARY.md` | `## Improvement` and `## Improvement vote` sections added, plus the "not to be confused with" entry on **Setlist vote** and a `ticket / issue / feature request / bug` entry in the deliberately-unused list | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent, no one-letter locals | read of every changed source file | `summariseVotes`, `rankImprovements`, `selectVoteIntent`, `applyVoteIntent`, `selectImprovementDeletionEffect`, `valuesFromUpdate`, `withTally`; loop var is `vote`, comparator args are `left`/`right` | PASS |
| B02 | Magic numbers / strings get names | grep of literals in changed files | `TITLE_MAX = 200`, `DETAILS_MAX = 8_192`, `DEFAULT_STATUS`, `FALLBACK_STATUS`, `ALL_STATUSES`, `TITLE_MAX_LENGTH`, `VOTE_BUTTON_CLASS`, `EMPTY_TALLY`, `STATUS_RANK`, `STATUS_LABEL_KEY` | PASS |
| B03 | No comments in code | grep `//` and `/*` on changed TS/TSX | only machine-read annotations: `@Feature improvements`, `@FollowsBlueprint …`. The `.sql` migration's header comment follows the existing convention of `0005_*.sql` | PASS |
| B04 | No `any` | `grep -rnE '\bany\b'` on changed api/site files | none found | PASS |
| B05 | Type assertions restricted to `as const` / `as unknown` | `grep -rnE 'as [A-Z]'` minus `as const` | none found; the lookup tables use `as const satisfies Record<…>` | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read of every indexed access | `repository.ts:71` `rows[0] === undefined ? null : …`; `:86` `if (row === undefined) throw new Error('insert returned no row')`; `:100` `row === undefined ? null : …` | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed `.ts`/`.tsx` | **zero occurrences**. Selection state is set in the click handler (`selectImprovement`), filtering is computed during render (`filterByStatus`), form fields are pushed by `form.setFieldValue` from the same handler | PASS |
| B08 | Lint clean | `pnpm --filter @borso-app/pragma run lint` | exit 0 | PASS |
| B09 | Typecheck clean | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B10 | Knip clean (no unused exports/deps) | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B11 | Back-end vertical slice, layered triad | file list | `improvements/{controller,service,repository,core,schema}.ts` — no horizontal aggregator folder | PASS |
| B12 | Controllers are dispatchers | `improvements.controller.ts:22-61` | every handler is validate → call service → shape response; the only branching is status-code selection on the service's tagged result | PASS |
| B13 | `.core.ts` takes `now` as a parameter, never `new Date()` | `improvements.core.ts` | no `new Date()`; `createImprovement(input, memberId, new Date())` injects it from the controller | PASS |
| B14 | Pure utilities carry `.utils.ts` / `.core.ts` and are 100% covered | coverage run | `improvements.utils.ts`, `improvements.core.ts`, `improvements-page.core.ts` each have a sibling test; whole-workspace coverage 100% on all four axes | PASS |
| B15 | Server state via TanStack Query, no refetch of an optimistically-written query | `improvements.queries.ts` | every mutation carrying `onMutate` rolls back in `onError` and none calls `invalidateQueries`; create (no `onMutate`) settles from its own response | PASS |
| B16 | Forms via `@tanstack/react-form` | `ImprovementsPage.tsx:60` | `const form = useForm({ defaultValues, onSubmit })` — no `useState` chain per field | PASS |
| B17 | Tailwind inline, no new `.css` | diff | no `.css` file added or imported | PASS |
| B18 | 375 px layout | `ImprovementsPage.tsx:124,137` | `px-4 sm:px-9` and `grid-cols-1 lg:grid-cols-[1fr_360px]` — mobile-first stacked, desktop opt-in | PASS |
| B19 | i18n, no hard-coded user-facing strings | `ImprovementsPage.tsx`, `i18n/{en,fr}.json` | every label goes through `t(…)`; 19 keys added to each catalogue, `nav.improvements` = "Improvements" / "Améliorations" | PASS (see Notes) |
| B20 | `@FollowsBlueprint` markers name real blueprints | `scripts/reports.sh blueprints` then index lookup | all ten ids resolve in `blueprint-index.md` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core project, coverage-gated) | `pnpm --filter @borso-app/pragma run test:core` | 0 — 136 files / 1404 tests; coverage 100% stmts (2147/2147), 100% branches (1039/1039), 100% funcs (563/563), 100% lines (1835/1835) | PASS |
| C02 | @borso-app/pragma (back-e2e, sandbox Postgres) | `pnpm --filter @borso-app/pragma run test` | 0 — 17 files / 113 tests | PASS |
| C03 | repo-wide | `pnpm exec knip` | 0 | PASS |
| C04 | `*.utils.ts` / `*.core.ts` sibling-test rule | file enumeration on changed files | `improvements.utils.ts` → `improvements.utils.test.ts`; `improvements.core.ts` → `improvements.core.test.ts`; `improvements-page.core.ts` → `improvements-page.core.test.ts` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | 1. Title alone → stored as `idea`, empty details, authored by the member, appears in the list | `it('files a new improvement as an idea authored by the signed-in member')` at `improvements.controller.test.ts:41`; `it('accepts a title alone and files it as an idea with no details')` at `improvements.schema.test.ts:14` | PASS |
| D02 | 2. Vote: count +1 and button reads pressed before the server answers | `it('shows the vote before the server answers, then settles on the row it returned')` at `improvements.queries.test.tsx:56`; `it('adds the viewer to the count when casting')` at `improvements.utils.test.ts:12` | PASS |
| D03 | 3. Voting twice keeps the count at one | `it('counts one vote per member, however many times it is cast')` at `improvements.controller.test.ts:84`; `it('is keyed on the improvement and the member, so a member votes once')` at `improvements.schema.test.ts:65` | PASS |
| D04 | 4. Withdrawing a vote: count down, button no longer pressed | `it('withdraws a vote and leaves the improvement in place')` at `improvements.controller.test.ts:97`; `it('sends a DELETE when the viewer withdraws a vote')` at `improvements.queries.test.tsx:108`; `it('removes the viewer from the count when withdrawing')` at `improvements.utils.test.ts:19` | PASS |
| D05 | 5. A failed vote leaves the list exactly as it was | `it('rolls the list back when the write fails')` at `improvements.queries.test.tsx:86` | PASS |
| D06 | 6. Moving to `shipped` drops it below every open improvement and keeps it visible | `it('ranks the open statuses first and the most voted first inside a status')` at `improvements.controller.test.ts:124`; `it('puts the open statuses before the closed ones')` at `improvements.core.test.ts:75` | PASS |
| D07 | 7. Editing the title leaves the rest alone | `it('moves an improvement along its statuses and keeps the untouched fields')` at `improvements.controller.test.ts:49`; `it('accepts each field alone, since an update is a patch')` at `improvements.schema.test.ts:45` | PASS |
| D08 | 8. Empty update → 400; unknown status → 400 | `it('refuses an empty update and an unknown status')` at `improvements.controller.test.ts:67` | PASS |
| D09 | 9. Voting on a missing improvement → 404 | `it('answers 404 when voting on an improvement that is not there')` at `improvements.controller.test.ts:110` | PASS |
| D10 | 10. Deleting removes its votes; second delete → 404 | `it('deletes an improvement with its votes and answers 404 the second time')` at `improvements.controller.test.ts:151` | PASS |
| D11 | 11. Every route refuses a request with no session cookie | `it('rejects the list without a session cookie')` at `improvements.controller.test.ts:36`, against `.use('*', requireMemberSession)` at `improvements.controller.ts:21` | PASS (see Notes) |
| D12 | Result: ranked, filtered, pressed-state rendering on the page itself | `improvements-page.core.test.ts` covers `filterByStatus`, `readStatus`, `selectStatusLabelKey`, `selectImprovementDeletionEffect`; the rendered composition is not asserted | UNVERIFIABLE |

## Notes

- **No plan.** `docs/features/pragma/improvement-backlog/plan/plan.md` does not exist — only `spec/` and `validation/` are present. Nothing in category A depended on it (every row is anchored in the spec), so no row was downgraded, but the pipeline's `plan` stage produced no artefact for this feature. If the plan stage was skipped deliberately, say so in the PR; otherwise run `/technical-conception`.
- **The spec has no *Test strategy* section.** The specification standard asks for one, including the explicit split between this validator and `/visual-validation`. Its absence is why D12 exists at all: with no routing table, there is no authoritative statement that the page's rendering is someone else's to prove. This is a spec-conformance gap, not an implementation defect — it does not fail any row, but it should be fixed before the next feature on this template.
- **D11** — only the list route has an explicit no-cookie test. The guarantee is structural (`.use('*', requireMemberSession)` is applied before every route on the router, so no handler can be reached without it) and I verified that line, so the row is PASS rather than FAIL. A single parametrised test over the six routes would make the claim direct rather than inferred; worth adding, not blocking.
- **D12** — the ranked list, the filter pills' counts and the vote button's pressed state are asserted at the level of the pure functions that compute them and at the API level, but no test renders `ImprovementsPage`. Whether the composition wires those functions to the right props is not proven here. That is exactly the kind of assertion `/visual-validation` exists for; since the spec never routed it, I am recording it as UNVERIFIABLE from this report rather than claiming or denying it. **Disclose this row in the PR description**, or have `/visual-validation` cover the `/improvements` screen.
- **B19** — the error banner at `ImprovementsPage.tsx:109-112` renders `lastError.message`, which is a developer string built by the query module (`` `vote ${response.status}` ``), and falls back to the literal `'unknown-error'`. Neither goes through i18n. Every *label* does, so the row stands as PASS, but a user hitting a failed vote sees `vote 404`. Small follow-up, inside this PR's scope.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
