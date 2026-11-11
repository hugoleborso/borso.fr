# Technical validation — Launch the routine from the PWA and open its conversation

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent)
- Branch: feat/talos-routine-launch
- Base: origin/main
- Run at: 2026-11-11T13:22:00Z
- Round: 1
- Reviewed: db90028793e37708b603f936230953ce95fd416d
- Touched workspaces: `@borso-app/talos` (`api/`, `domain/`, `site/`, `test/`), `docs/`

The verdict is FAIL on two blocking findings, A03 and E03. Both were reproduced against the back-e2e Postgres with a scratch test kept outside the repository (measured, output quoted in the rows).

The spec is in the short form (goal, data shape, behaviour R1 to R5, out of scope). Categories A and D are built from its behaviour and data-shape bullets, the files are taken from the diff, and nothing is routed to `/visual-validation`: 0 use cases routed to /visual-validation; out of scope for this report.

All paths below are relative to `apps/talos/` unless they start with `docs/`.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Plan | A plan exists for this feature | `docs/features/talos/routine-launch/plan/plan.md` | plan absent; `ls docs/features/talos/routine-launch/` lists `kaizen.md` and `spec` only | UNVERIFIABLE |
| A02 | Data shape | Table `routine_run` with `id uuid primary key`, `fired_at timestamptz not null`, `trigger text not null`, `subject text not null`, `session_url text` | api/src/routine/routine.schema.ts:9-15, api/src/database/migrations/0002_routine_run.sql:1-7 | `"id" uuid PRIMARY KEY NOT NULL, "fired_at" timestamp with time zone NOT NULL, "trigger" text NOT NULL, "subject" text NOT NULL, "session_url" text` | PASS |
| A03 | R1.1, R1.2 | A text of 1 to 4000 characters fires the routine, and on success the run is stored and answered 201 | api/src/routine/routine.service.ts:36-44, domain/routine-run.core.ts:6 | Failing case, measured: `POST /api/routine/runs` with `{ "text": "a\u0000b" }` (3 characters, accepted by `z.string().trim().min(1).max(MESSAGE_TEXT_LIMIT)`) fires the routine once, then `insertRoutineRun` throws because Postgres refuses a NUL in `text`, and the route answers `500 {"error":"Erreur inattendue."}` with 0 rows in `routine_run`. Probe output: `NUL status 500 {"error":"Erreur inattendue."} fires 1 rows 0`. The conversation is started and lost, and the screen reports a launch that failed. The same 500 follows a fire answer whose `claude_code_session_url` holds a NUL, the input `proposals.controller.test.ts:185` already uses to make the insert fail. Introduced: this branch. Fix size: one line to one file | FAIL (blocking) |
| A04 | R1.1 | Session required | api/src/routine/routine.controller.ts:11 | `.use('*', requireSession)` | PASS |
| A05 | R1.1, Data shape | Fire text is `<secret-phrase>\nmessage: <the whole text>` | api/src/helpers/routine/routine-fire.core.ts:37, api/src/routine/routine.service.ts:36 | `` return JSON.stringify({ text: `${secretPhrase ?? ''}\n${trigger}: ${subject}` }); `` and `const outcome = await fireRoutine('message', message);` | PASS |
| A06 | R1.2, Data shape | The stored subject is the message cut to 200 characters | api/src/routine/routine.core.ts:1-6, routine.service.ts:41 | `return Array.from(message).slice(0, SUBJECT_LENGTH_LIMIT).join('');` and `subject: cutMessageSubject(message),` | PASS |
| A07 | R1.3 | Without `fire-url`, 503 with the existing `not-configured` error, nothing stored | api/src/helpers/routine/routine-fire.adapter.ts:32, routine.service.ts:37 | `if (fireUrl === undefined) return { kind: 'skipped' };` and `if (outcome.kind === 'skipped') throw new TalosError('not-configured');` | PASS |
| A08 | R1.4 | A failed fire (network, status outside 2xx) answers 502 and stores nothing | routine.service.ts:38, api/src/helpers/errors/talos-error.types.ts:41 | `if (outcome.kind === 'failed') throw new TalosError('routine-fire-failed');` and `'routine-fire-failed': { status: 502, message: "Talos n'a pas pu être lancé." },` | PASS |
| A09 | R1.5 | The main button sends the text; on success the field empties, a toast confirms, the run shows first | site/src/components/organisms/MessageComposer.tsx:69-71, site/src/lib/queries/routine.queries.ts:42-47 | `launch.mutate({ text: value.text }, { onSuccess: () => formApi.reset() });` and `items: placeNewestRunFirst(old?.items ?? [], run),` then `toasts.confirm(ROUTINE_LAUNCHED_TOAST);` | PASS |
| A10 | R1.6 | On a 503 the screen falls back to the Claude Code link with the text prefilled; « Construire » unchanged | MessageComposer.tsx:66, 107, 122-124; message-composer.core.ts:11-16 | `const isUnconfigured = isRoutineUnconfigured(launch.error);` and `return environment === ALWAYS_LINKED_ENVIRONMENT \|\| isRoutineUnconfigured;`. The link appears and the owner taps it; nothing is opened by script. See Notes | PASS |
| A11 | R2.1 | A decision fires as before and a successful fire stores a run with trigger `proposition` and the memory slug | api/src/proposals/proposals.service.ts:94, routine.service.ts:24-31 | `await launchProposalRun(stripMarkdownExtension(buildProposalPath(params.slug)), params.now);` and `trigger: 'proposition', subject: memorySlug,` | PASS |
| A12 | R2.2 | The decision's answer and status never depend on the fire or on storing the run | routine.service.ts:25, 47-49 | `if (outcome.kind !== 'fired') return;` and `await fireAndStoreProposalRun(memorySlug, now).catch(reportUnhandledError);` | PASS |
| A13 | R2.3 | Cancelling fires nothing and stores nothing | proposals.service.ts:98-110 | `cancelProposalDecision` calls `editProposal` and `readReopenedProposal` only; no call to `launchProposalRun` | PASS |
| A14 | R3.1 | `GET /api/routine/runs` answers `{ items }`, the 20 most recent, newest first, session required | routine.controller.ts:11-12, routine.repository.ts:16-17, domain/routine-run.core.ts:4 | `.get('/runs', async (context) => context.json({ items: await listRoutineRuns() }))`, `.orderBy(desc(routineRunTable.firedAt)).limit(limit)`, `export const RECENT_ROUTINE_RUN_LIMIT = 20;` | PASS |
| A15 | R3.2 | The list shows trigger label, subject, age and « Ouvrir »; no link without an address | site/src/components/organisms/RoutineRunList.tsx:34-52, site/src/i18n/fr.json:121-123 | `{t(selectTriggerLabelKey(run.trigger))} ·{' '}`, `{run.subject}`, `{run.sessionUrl === null ? null : (` | PASS |
| A16 | R3.3 | The link is a plain anchor, not opened by script | RoutineRunList.tsx:44-51 | `<a href={run.sessionUrl} target={linkTarget} rel="noopener"`; no `window.open` and no `onClick` in the file | PASS |
| A17 | R3.4 | The list is hidden while empty | RoutineRunList.tsx:19 | `if (recentRuns.length === 0) return null;` | PASS |
| A18 | R3.5 | After a decision the list is refreshed the next time it is shown | site/src/lib/queries/proposals.queries.ts:114 | `void queryClient.invalidateQueries({ queryKey: routineKeys.runs() });` | PASS |
| A19 | R4.1 | `sessionUrl` is kept only when it starts with `https://claude.ai/code/` | routine-fire.core.ts:16-20, 41-44 | `claude_code_session_url: z.string().startsWith(CLAUDE_CODE_ADDRESS_PREFIX),` and `return addressedAnswer.success ? addressedAnswer.data.claude_code_session_url : null;` | PASS |
| A20 | R5.1 | `CONTRAT.md` documents both routes, the `message:` line, the stored run and the Message screen | CONTRAT.md:163-165, 230-231, 251, 287-293, 314 | `\| POST \| /routine/runs \| { text } (1 to 4000 characters after trimming) \| RoutineRun, status 201 …` and `The line is proposition: etat/propositions/<slug> for a decision and message: <the whole text> for a message.` | PASS |
| A21 | R5.2 | `VOCABULARY.md` gains « Routine run » | VOCABULARY.md:149-160 | `## Routine run` then `One successful fire of the Claude Code routine, started by a message or by a decision on a proposal, one row of routine_run.` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of every changed source file; names sampled | `addressedAnswer`, `firedRun`, `recentRuns`, `newestRun`, `isUnconfigured`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <34 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | Knip | `pnpm knip` | exit 0, configuration hints only, none on this branch's files | PASS |
| B05 | No `any` | `grep -nP '\bany\b' <changed files>` | only `expect.any(…)` and the word in two test titles | PASS |
| B06 | Type assertions limited to `as const` / `as unknown` | grep ` as ` on changed files | `as const` only (routine-fire.core.ts:3, routine-run.core.ts:8, routine.queries.ts:9-10) | PASS |
| B07 | No prose comments, no disable comments | grep `eslint-disable\|oxlint-disable\|@ts-` and full read | only `// @FollowsBlueprint …` markers | PASS |
| B08 | Magic numbers extracted | full read | `SUBJECT_LENGTH_LIMIT`, `MESSAGE_TEXT_LIMIT`, `RECENT_ROUTINE_RUN_LIMIT`, `CREATED_STATUS`, `ROUTINE_UNCONFIGURED_STATUS`, `CLAUDE_CODE_ADDRESS_PREFIX` | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\(' <changed files>` | none found | PASS |
| B10 | `noUncheckedIndexedAccess` honoured | typecheck (B03) and full read | no unguarded index access in changed source | PASS |
| B11 | Standards checklist: "a definition in a `VOCABULARY.md` is still true" | read in full | `Not to be confused with: a run, which Talos starts on a schedule or after a proposal decision.` at VOCABULARY.md:147, under « Message », two lines below the new sentence saying the Message screen fires the routine. A message now starts a run too. Introduced: this branch (the sentence became false here). Fix size: one line | FAIL (non-blocking) |
| B12 | Standards checklist: "an invariant promising behaviour carries a `Held by:` line" | read in full | `- A fire that fails, or that is skipped because no fire-url is set, leaves no run.` at VOCABULARY.md:158 has no `Held by:` line; the tests exist (`api/src/routine/routine.controller.test.ts` › answers 503 and stores nothing while no fire url is configured). Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B13 | Standards checklist: "a derived type is derived" | read in full | `interface FiredRun { readonly trigger: RoutineTrigger; readonly subject: string; readonly sessionUrl: string \| null; readonly firedAt: Date; }` at api/src/routine/routine.service.ts:10-15 writes out by hand the four columns of `RoutineRunRow` (`$inferSelect`) minus `id`. Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B14 | Standards checklist: "a boolean name is not negated" | read in full | `export function isRoutineUnconfigured(failure: unknown): boolean` at site/src/lib/routine-run.core.ts:13, carried into `isUnconfigured ? null : (` at MessageComposer.tsx:107 and the parameter at message-composer.core.ts:13. No call site wraps it in `!` today. Introduced: this branch. Fix size: 5 call sites | FAIL (non-blocking) |
| B15 | Standards checklist: site limit does not restate an API rule under another name | read in full | The site reads `canSendMessage` and `RECENT_ROUTINE_RUN_LIMIT` from `@domain/routine-run.core`, the module the API schema reads | PASS |
| B16 | Standards checklist: untrusted input parsed with Zod | read in full | fire answer through `fireAnswerSchema.safeParse(answer)` (routine-fire.core.ts:42); request body through `routineMessageValidator` | PASS |
| B17 | Standards checklist: repository returns rows; multi-table write in one transaction | read in full | `insertRoutineRun` and `listNewestRoutineRuns` return nothing and rows. The decision write and the run insert are two tables outside one transaction on purpose: R2.2 forbids the run from failing the decision | PASS |
| B18 | Standards checklist: mutation reconciles from its response; form goes through `useForm` | read in full | `queryClient.setQueryData<RoutineRunsResponse>(routineKeys.runs(), …)` at routine.queries.ts:43, no invalidation in `useLaunchMessageRun`; `useForm` at MessageComposer.tsx:67 | PASS |
| B19 | Standards checklist: route composes organisms; no label explains the interface; i18n keys name screen and element; cva for more than two variants | read in full | MessagePage.tsx renders `<MessageComposer />` and `<RoutineRunList />` only; labels `Lancements`, `Ouvrir`, `Message`, `Décision`; keys `message.runs.title`, `message.runs.trigger.message`, `toast.routine-launched`; no variant set added | PASS |
| B20 | Standards checklist: test names state behaviour and condition; service tests assert on what the database holds | read of the changed tests | `answers 503 and stores nothing while no fire url is configured` asserts `expect(await getDatabase().select().from(routineRunTable)).toEqual([]);` (routine.controller.test.ts:104) | PASS |
| B21 | Standards checklist: "every screen holds together at 375 pixels" | not measured in a browser | The row is `flex items-center gap-2` with a `min-w-0 flex-1` text column, `line-clamp-2 break-words` on the subject and a `shrink-0` link (RoutineRunList.tsx:28-48), which reads as sound (inferred from the classes). No measurement was taken: the local app has no seeded sign-in and a passkey cannot be driven by `agent-browser`, as this task's `kaizen.md` already records | UNVERIFIABLE |
| B22 | `scripts/check-vocabulary-paths.sh` | run | `every term names a folder that exists, every Held by names a test that exists, and none cites a comment` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed origin/main --coverage --reporter=verbose` | 0. 32 files, 176 tests. Coverage 100% statements (77/77), branches (36/36), functions (20/20), lines (71/71). Feature files run: `api/src/helpers/routine/routine-fire.{core,adapter}.test.ts`, `api/src/routine/routine.{core,schema}.test.ts`, `domain/routine-run.core.test.ts`, `site/src/lib/routine-run.core.test.ts`, `site/src/lib/queries/mutation-toasts.core.test.ts`, `site/src/components/organisms/{MessageComposer.test.tsx,message-composer.core.test.ts}`, `site/src/routes/MessagePage.test.tsx` | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed origin/main --reporter=verbose` | 0. 20 files, 124 tests, including `api/src/routine/routine.controller.test.ts` (11) and `api/src/proposals/proposals.controller.test.ts` (11) | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh origin/main` | 0. 7 gated files, 272 mutants killed, 0 survived, 0 without coverage, score 100.00 | PASS |
| C04 | @borso-app/talos | `*.utils.ts` enumeration | The branch adds or changes no `*.utils.ts`; its pure modules are `.core.ts` files, each with a sibling test listed in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Data shape: the table holds the five columns, the address alone optional | `it('holds the five columns of a routine run, the address alone optional')` at api/src/routine/routine.schema.test.ts:6; `['session_url', 'text', false, false],` | PASS |
| D02 | R1.1: text of 1 to 4000 characters after trimming | `canSendMessage` › `accepts %s` / `refuses %s` at domain/routine-run.core.test.ts:12-26 (`'a'`, 4000, 4000 between spaces, empty, spaces alone, 4001); route level `refuses %s without firing` at api/src/routine/routine.controller.test.ts:139, `expect(response.status).toBe(400);` | PASS |
| D03 | R1.1: session required | `refuses a caller without a session` at routine.controller.test.ts:155; `expect(response.status).toBe(401);` and `expect(fetcher).not.toHaveBeenCalled();` | PASS |
| D04 | R1.1: fires with `message: <text>`, the whole text | `fires the routine with the whole message, stores the run and answers it` at routine.controller.test.ts:46; ``expect.objectContaining({ body: JSON.stringify({ text: `phrase\nmessage: ${message}` }) })`` with a 315-character message | PASS |
| D05 | R1.2: stores the run and answers 201 with it | same test; `expect(response.status).toBe(201);` and `expect(await getDatabase().select().from(routineRunTable)).toEqual([{ id: run.id, firedAt: new Date('2026-11-11T09:00:00Z'), trigger: 'message', subject: message.slice(0, 200), sessionUrl: SESSION_URL }]);` | PASS |
| D06 | Data shape: subject is the message cut to 200 characters | `cuts a longer message to its first 200 characters` at api/src/routine/routine.core.test.ts:11; ``expect(cutMessageSubject(`${'a'.repeat(200)}b`)).toBe('a'.repeat(200));`` | PASS |
| D07 | R1.3: 503 with `not-configured`, nothing stored | `answers 503 and stores nothing while no fire url is configured` at routine.controller.test.ts:93; `expect(await response.json()).toEqual({ error: "Talos n'est pas encore configuré." });` and `.toEqual([])` on the table | PASS |
| D08 | R1.4: status outside 2xx answers 502, nothing stored | `answers 502 and stores nothing when the routine refuses the fire` at routine.controller.test.ts:107; `expect(response.status).toBe(502);` | PASS |
| D09 | R1.4: network failure answers 502, nothing stored | `answers 502 and stores nothing when the network fails` at routine.controller.test.ts:121; `expect(await getDatabase().select().from(routineRunTable)).toEqual([]);` | PASS |
| D10 | R1.5: the button sends the text, the field empties, a toast confirms, the run shows first with its link | `sends the message, empties the field, confirms, and shows the new run first with its link` at site/src/routes/MessagePage.test.tsx:123; `expect(screen.getByLabelText('Ton message')).toHaveProperty('value', '');`, `.textContent).toBe('Talos est lancé')`, `expect(newest?.textContent).toContain('Message · 0 min');` | PASS |
| D11 | R1.6: on a 503 the Claude Code link with the text prefilled | `falls back to the Claude Code link, with the text kept, while the routine is not configured` at site/src/components/organisms/MessageComposer.test.tsx:87; ``expect(talos.getAttribute('href')).toBe(`https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_lecture&q=${PREAMBLE}%0A%0ARappelle%20Julie`);`` | PASS |
| D12 | R1.6: « Construire » unchanged | `sends nothing while the message is empty, and links the build environment alone` at MessageComposer.test.tsx:53; the `href` assertion on `environment=env_construction` | PASS |
| D13 | R2.1: a successful decision fire stores a run with `proposition` and the slug | `records the decision in the memory and fires the routine with the slug` at api/src/proposals/proposals.controller.test.ts:77; ``subject: `etat/propositions/${STORED_PROPOSAL}`, sessionUrl: SESSION_URL`` | PASS |
| D14 | R2.2: answer and status unchanged whatever the fire does | `answers the decision unchanged and stores no run when %s` (the routine refuses the fire, the network fails) at proposals.controller.test.ts:174; `expect(await response.json()).toMatchObject(DECIDED_PROPOSAL);` | PASS |
| D15 | R2.2: a failure to store the run never fails the decision | same `it.each`, case `the run cannot be stored` (address `https://claude.ai/code/session_\u0000`); `expect(response.status).toBe(200);` | PASS |
| D16 | R2.3: cancelling fires nothing and stores nothing | `cancels a decision in the memory without firing anything` at proposals.controller.test.ts:118; `expect(fetcher).not.toHaveBeenCalled();` and `.toEqual([])` at :137 | PASS |
| D17 | R3.1: `{ items }`, the 20 most recent, newest first | `answers the 20 most recent runs, newest first` at routine.controller.test.ts:169; ``Array.from({ length: 20 }, (_unused, rank) => `message ${String(21 - rank)}`)`` after 22 fires | PASS |
| D18 | R3.1: session required | `refuses a caller without a session` at routine.controller.test.ts:202; `expect(response.status).toBe(401);` | PASS |
| D19 | R3.2: trigger label, subject, age and link | `lists the runs with what started each, its subject, its age and a plain link` at MessagePage.test.tsx:84; `expect(newest?.textContent).toContain('Message · 5 min');`, `expect(oldest?.textContent).toContain('Décision · 3 h');` | PASS |
| D20 | R3.2: a run without an address shows no link | same test; `expect(within(oldest ?? document.body).queryByRole('link')).toBeNull();` | PASS |
| D21 | R3.3: a plain anchor, not opened by script | same test; `expect(link.getAttribute('href')).toBe(SESSION_URL);` on an element found by `getByRole('link', …)` | PASS |
| D22 | R3.4: hidden while empty | `hides the list while no run was fired` at MessagePage.test.tsx:114; `expect(screen.queryByText('Lancements')).toBeNull();` | PASS |
| D23 | R3.5: refreshed the next time it is shown after a decision | `reads the list again after a decision, the next time the screen is shown` at MessagePage.test.tsx:166, with a 30 s stale time so only the invalidation can cause the read; `expect((await screen.findByRole('listitem')).textContent).toContain('Décision · 1 min');` | PASS |
| D24 | R4.1: only an address starting with `https://claude.ai/code/` is kept | `readSessionUrl` › `stores nothing for %s` at api/src/helpers/routine/routine-fire.core.test.ts:57 (another site, look-alike host, plain http, prefix further in, another page, not text, absent, not an object); `expect(readSessionUrl(answer)).toBeNull();`; route level `stores no address when the answer names another site` at routine.controller.test.ts:80 | PASS |
| D25 | R5: documents | no behavioural assertion; checked in A20 and A21 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `launchMessageRun` → `insertRoutineRun` (api/src/routine/routine.service.ts:39, routine.repository.ts:9) | Check-then-write | No decision is computed from rows read earlier: `const run = { id: randomUUID(), ...firedRun }; await insertRoutineRun(run);`. The spec states no uniqueness rule for messages, so two requests at once fire twice and store two runs, which is what R1.1 asks of each | PASS |
| E02 | Module-level state in changed API files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let ' <changed api files>` found nothing; the only module constants are literals and one Zod schema | PASS |
| E03 | `decideProposal` → `editProposal` → `launchProposalRun` → `insertRoutineRun` (api/src/proposals/proposals.service.ts:86-94, routine.service.ts:24-31) | Check-then-write | The rule "a decided proposal is refused" is decided from a read made before the write: `if (proposal.status !== PENDING_PROPOSAL_STATUS) { return { content: null, outcome: { kind: 'already-decided' } };` (proposals.core.ts:59) over `renderMemoryProposal(memorySlug)` (proposals.service.ts:52), then written by an unconditional `.onConflictDoUpdate({ target: memoryProposalTable.slug, set: changes })` (memory/memory-write.repository.ts:183). Failing case, measured: two `POST /api/proposals/2026-10-04-atelier/decision` with `{ "decision": "acceptee" }` sent together through `Promise.all` both answer 200, the routine is fired twice and `routine_run` holds two rows for one decision, where the second should answer `proposal-already-decided` and fire nothing. Probe output: `RACE statuses [ 200, 200 ] fires 2 rows 2`. The check predates this branch; this branch adds the second stored run and the second listed conversation. Introduced: pre-existing, extended by this branch. Fix size: one file plus one test | FAIL (blocking) |
| E04 | Concurrent proof for the decision rule | A back-e2e test firing the competing requests at once | `grep -rn "Promise.all\|allSettled" api/src/proposals/*.test.ts api/src/routine/*.test.ts` finds none. No test sends two decisions together and asserts one refusal, one fire and one run. Same root cause as E03 | FAIL (blocking) |

## Blocking findings

- A03 — `POST /api/routine/runs` with a text holding a NUL character fires the routine, then answers 500 and stores nothing (measured).
- E03 — two decisions on one proposal sent together both pass, fire the routine twice and store two routine runs (measured).
- E04 — no concurrent back-e2e test holds the one-decision rule that E03 breaks.

## Non-blocking findings

- B11 — VOCABULARY.md:147 still says a run starts only on a schedule or after a decision.
- B12 — VOCABULARY.md:158 promises that a failed or skipped fire leaves no run, with no `Held by:` line.
- B13 — `FiredRun` at routine.service.ts:10-15 is written by hand beside `RoutineRunRow`.
- B14 — `isRoutineUnconfigured` and `isUnconfigured` are negated boolean names.

## Notes

- A01 (UNVERIFIABLE): no plan was written. No row above depended on it, because the short-form spec gives the behaviour and the diff gives the files. `/technical-conception` was skipped for this feature.
- B21 (UNVERIFIABLE): the Message screen was not measured at 375 px. `/visual-validation` runs once at the end and is the place where it gets measured.
- A03, scope of the case: a NUL character is unlikely from a phone keyboard, and the triage may weigh that. The row is typed blocking because the input is inside the range R1.1 accepts and the result is a started conversation the owner cannot find, reported as a failure. Does the spec want any failure to store after a successful fire on the message route to answer the run without storing it, as R2.2 does for a decision, or to stay a 500?
- A10: R1.6 says the screen "opens Claude Code with the text prefilled". The implementation shows the link and waits for a second tap, which matches R3.3's reason that a phone hands the address to the app only on a tap. Is one more tap the intended reading of R1.6?
- A message of 4001 to 6000 characters disables the « Talos » button with no notice, because the notice appears only above `LONG_MESSAGE_THRESHOLD = 6000` (message-composer.core.ts:3), while the fallback link still accepts it. `CONTRAT.md:314` documents the button being off above 4000. Should the screen say why the button is off in that range?
- `fireRoutine` awaits `fetcher(fireUrl, …)` with no timeout (routine-fire.adapter.ts:38), as it did before this branch for decisions. The message route now waits on the same call. What does the owner see when the research-preview endpoint hangs longer than the API's timeout, and can the routine have fired by then?
- `listNewestRoutineRuns` orders by `fired_at` alone (routine.repository.ts:16). Two runs stored with the same instant have no stated order. Does that matter for the list?
- E03 was measured on the local Postgres under read committed. On Aurora DSQL the write goes through `applyChunkWithRetry` (memory/memory-changes.service.ts:211), and the status check stays outside that transaction, so a retried loser would write the second decision as well (inferred from reading, not measured on DSQL).
- The probe that produced the two measured cases lives outside the repository at `/tmp/claude-0/-home-user-borso-fr/2ad21149-51d3-5fff-98e8-0e9474b187e4/scratchpad/technical-validator-routine/probe/race.probe.ts`, with its output in `/tmp/claude-0/-home-user-borso-fr/2ad21149-51d3-5fff-98e8-0e9474b187e4/scratchpad/technical-validator-routine/probe.log`.

## Verdict: FAIL
