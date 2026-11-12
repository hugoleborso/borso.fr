# Technical validation — Launch the routine from the PWA and open its conversation

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent)
- Branch: feat/talos-routine-launch
- Base: origin/main
- Run at: 2026-11-11T13:40:32Z
- Round: 2
- Reviewed: 8716148f3ca9ad8e380a58159610528bafb7b409
- Touched workspaces: `@borso-app/talos` (`api/`, `domain/`, `site/`), `docs/`

The verdict is PASS_EXCEPT_UNVERIFIABLE. The three blocking findings of round 1 (A03, E03, E04) are fixed, each measured again on the back-e2e Postgres with a scratch probe kept outside the repository. No new blocking or non-blocking finding was raised on the round-2 diff. Two rows stay UNVERIFIABLE, both carried from round 1: the absent plan (A01) and the 375 px measurement (B11).

This round read only `git diff db90028793e37708b603f936230953ce95fd416d..8716148f3ca9ad8e380a58159610528bafb7b409`: one fix commit (`8716148f`) and the commit of the round-1 report (`c13daf40`). The fix also amends the spec in two places (R1.1 gains the NUL refusal, R4.1 narrows the address), and the rows below are graded against the amended text.

The spec is in the short form. Categories A and D are built from its behaviour and data-shape bullets, the files are taken from the diff, and nothing is routed to `/visual-validation`: 0 use cases routed to /visual-validation; out of scope for this report.

No pull request exists for this branch yet (`gh api repos/{owner}/{repo}/pulls?head=…:feat/talos-routine-launch` returned nothing), and the fix commit dismisses no round-1 finding, so there is no dismissal row.

All paths below are relative to `apps/talos/` unless they start with `docs/`.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Plan | A plan exists for this feature | `docs/features/talos/routine-launch/plan/plan.md` | plan absent; `ls docs/features/talos/routine-launch/` lists `kaizen.md`, `spec` and `validation` only | UNVERIFIABLE |
| A02 | R1.1 (amended) | A text holding a NUL character is refused with 400 and fires nothing | domain/routine-run.core.ts:5, 7-12; api/src/routine/routine.schema.ts:17 | `const NUL_CHARACTER = '\u0000';` and `.max(MESSAGE_TEXT_LIMIT).refine((text) => !text.includes(NUL_CHARACTER));`, read by `export const routineMessageSchema = z.object({ text: messageTextSchema });`. Measured by probe: `"a\u0000b" -> 400 fires 0 rows 0`, `"\u0000" -> 400 fires 0 rows 0`, `" ok \u0000 " -> 400 fires 0 rows 0`, `"ok" -> 201 fires 1 rows 1` | PASS |
| A03 | R4.1 (amended) | `sessionUrl` is kept only when it is `https://claude.ai/code/` followed by letters, digits, `_`, `-` or `/`, 300 characters at most | api/src/helpers/routine/routine-fire.core.ts:16-24 | `const CLAUDE_CODE_ADDRESS_PATTERN = /^https:\/\/claude\.ai\/code\/[\w/-]+$/;`, `const MAXIMUM_ADDRESS_LENGTH = 300;`, `.max(MAXIMUM_ADDRESS_LENGTH).regex(CLAUDE_CODE_ADDRESS_PATTERN)`. The pattern has no `u`, `i` or `m` flag, so `\w` is `[A-Za-z0-9_]` and `$` matches only at the end of the text | PASS |
| A04 | R2.2 | The decision's answer and status are unchanged whatever the fire does; a refused second decision fires nothing | api/src/proposals/proposals.service.ts:70-73, 102-103 | `if (isTalosError(error) && error.code === 'memory-conflict') return edit.overtaken;` then `const proposal = readDecidedProposal(outcome);` throws `proposal-already-decided` before `await launchProposalRun(…)` is reached | PASS |
| A05 | R2.3 | Cancelling fires nothing and stores nothing | proposals.service.ts:107-121 | `cancelProposalDecision` still calls `editProposal` and `readReopenedProposal` only; the new `overtaken: { kind: 'not-revocable' }` adds no fire | PASS |
| A06 | R3.1 | The 20 most recent, newest first | api/src/routine/routine.repository.ts:16 | `.orderBy(desc(routineRunTable.firedAt), desc(routineRunTable.id))`; the first key is unchanged, the second only orders runs of one instant | PASS |
| A07 | R1.5, R1.6 | The « Talos » button sends while the routine is configured; on a 503 the Claude Code link takes its place | site/src/components/organisms/MessageComposer.tsx:67, 116, 132; site/src/lib/routine-run.core.ts:13-16; message-composer.core.ts:17 | `const isConfigured = isRoutineConfigured(launch.error);`, `{isConfigured ? (<Button …` and `return environment === ALWAYS_LINKED_ENVIRONMENT \|\| !isRoutineConfigured;`. The rename inverts every reader consistently: `return failure.status !== ROUTINE_UNCONFIGURED_STATUS;` | PASS |
| A08 | R5.1 | `CONTRAT.md` documents the routes, the stored run and the Message screen | CONTRAT.md:230, 278, 291, 314; MEMORY-CONTRACT.md:121, 166 | `{ text } (1 to 4000 characters after trimming, no NUL character)`, `The address is kept only when it is https://claude.ai/code/ followed by letters, digits, _, - or /, 300 characters at most`, and `With expectedStatus, the status changes only if the stored one still equals it, in one UPDATE … WHERE status = <expectedStatus>; otherwise 409 and nothing is written.` Each sentence matches the code quoted in A02, A03 and E01 | PASS |
| A09 | R5.2 | `VOCABULARY.md` holds « Routine run » and its definition is true | VOCABULARY.md:157 | `sessionUrl is the address of the Claude Code conversation the fire created, kept only when it is https://claude.ai/code/ followed by a plain path (readSessionUrl), null otherwise.` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A03 — a message holding a NUL character fired the routine, then answered 500 and stored nothing | `8716148f` domain/routine-run.core.ts:12, `.refine((text) => !text.includes(NUL_CHARACTER))`, with the spec amended to refuse it (R1.1). The round-1 input, sent again by probe: `"a\u0000b" -> 400 fires 0 rows 0`. Pinned by `refuses a message holding a NUL character without firing` at api/src/routine/routine.controller.test.ts:142-154. The second input of that row, a fire answer whose address holds a NUL, is now stored as null: `['a NUL character', { claude_code_session_url: 'https://claude.ai/code/session_1\u0000' }]` at api/src/helpers/routine/routine-fire.core.test.ts:63 | PASS |
| R02 | E03 — two decisions sent together both passed, fired twice and stored two runs | `8716148f` api/src/memory/memory-write.repository.ts:186-198 and proposals.service.ts:65, 71. The round-1 input, sent again by probe ten times in the shape the repository test uses: every run answered one 200 and one 409, `conditional true,false fires 1 rows 1`, where `conditional` is the return of `didChangeProposalFromStatus` for each request. Both requests reached the conditional write in all ten runs, so the refusal comes from the write and not from the earlier read. See E01 | PASS |
| R03 | E04 — no concurrent back-e2e test held the one-decision rule | `8716148f` api/src/proposals/proposals.controller.test.ts:148-167, `lets one of two decisions sent together win, and refuses the other without firing`. See E03 | PASS |

The four non-blocking findings of round 1 were also taken, and need no row: the « Message » entry now reads `Not to be confused with: a routine run, which a message or a proposal decision starts` (VOCABULARY.md:147), the invariant carries `Held by:` (VOCABULARY.md:159), `FiredRun` is `Omit<RoutineRunRow, 'id'>` (api/src/routine/routine.service.ts:9), and `isRoutineUnconfigured` became `isRoutineConfigured` (site/src/lib/routine-run.core.ts:13).

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of every source file in the round-2 diff; names sampled | `didChangeProposalFromStatus`, `changedRows`, `writeProposalStatus`, `overtaken`, `isTooLongToSend`, `StoredMemoryProposal`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <22 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | Knip | `pnpm knip` | exit 0, configuration hints only, none on this branch's files; the newly exported `MESSAGE_TEXT_LIMIT` is read by MessageComposer.tsx:4 and message-composer.core.ts:1 | PASS |
| B05 | No `any`; assertions limited to `as const` / `as unknown`; no disable comment; no `useEffect` | `grep -nP '\bany\b'`, `grep -nP ' as (?!const\|unknown)'`, `grep -nE 'eslint-disable\|oxlint-disable\|@ts-\|\buseEffect\('` on the changed files | the word `any` in no source line (test titles containing "as" only); the other greps found nothing | PASS |
| B06 | Magic numbers extracted | read | `MAXIMUM_ADDRESS_LENGTH = 300`, `NUL_CHARACTER`, `CLAUDE_CODE_ADDRESS_PATTERN`, `MESSAGE_TEXT_LIMIT` | PASS |
| B07 | Standards checklist: `VOCABULARY.md` definitions true; an invariant carries `Held by:` | VOCABULARY.md read in full around the changed lines; `scripts/check-vocabulary-paths.sh` | `every term names a folder that exists, every Held by names a test that exists, and none cites a comment`; VOCABULARY.md:147, 157 and 159 match the code | PASS |
| B08 | Standards checklist: a boolean name is not negated; verbs return what they say; a derived type is derived | read | `isRoutineConfigured`, `isMessageTooLongToSend`, `didChangeProposalFromStatus(…): Promise<boolean>`; `readMemoryProposal` returns `StoredMemoryProposal \| null`; `type FiredRun = Omit<RoutineRunRow, 'id'>` and `after: Parameters<typeof upsertProposal>[1]` are derived | PASS |
| B09 | Standards checklist: a site limit does not restate an API rule under another name; untrusted input parsed with Zod | read | `return isRoutineConfigured && text.trim().length > MESSAGE_TEXT_LIMIT;` (message-composer.core.ts:21) reads the constant the API schema reads; `expectedStatus: shortTextSchema.min(1).optional()` (api/src/memory/memory-changes.schema.ts:185) | PASS |
| B10 | Standards checklist: a repository returns rows, arrays and counts; a multi-table write sits in one transaction; a rule about rows another request can write is held by a single conditional write | read | `didChangeProposalFromStatus` answers whether its `RETURNING` held a row, as the four other `Promise<boolean>` writes of memory-write.repository.ts do (lines 61, 121, 133); the status write and its `memory_event` row stay inside `runInMemoryTransaction` (api/src/memory/memory-changes.service.ts:212). The third bullet is E01 | PASS |
| B11 | Standards checklist: no new label explains the interface; i18n key names screen and element; every screen holds together at 375 pixels | read; not measured in a browser | `"message.too-long-to-send": "Message trop long pour être envoyé à Talos ({{limit}} caractères au plus)."` (site/src/i18n/fr.json:119) says what the screen cannot show, why the button is off, and its key names the screen and the element. The notice is a second `<Notice>` beside the existing one (MessageComposer.tsx:109-115), which wraps as the first does (inferred from the shared component). No measurement at 375 px was taken, for the reason round 1 recorded: the local app has no seeded sign-in an agent can use | UNVERIFIABLE |
| B12 | Standards checklist: test names state behaviour and condition; a service test asserts on what the database holds | read of the changed tests | `lets one of two decisions sent together win, and refuses the other without firing` asserts `expect(await getDatabase().select().from(routineRunTable)).toHaveLength(1);` and `expect(await countPwaStatusChanges()).toBe(1);` (proposals.controller.test.ts:164, 166) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed db900287 --coverage --reporter=verbose` | 0. 19 files, 126 tests. Coverage 100% statements (88/88), branches (31/31), functions (19/19), lines (84/84). Feature files run: `api/src/helpers/routine/routine-fire.{core,adapter}.test.ts`, `api/src/routine/routine.schema.test.ts`, `api/src/memory/memory-changes.schema.test.ts`, `domain/routine-run.core.test.ts`, `site/src/lib/routine-run.core.test.ts`, `site/src/lib/queries/mutation-toasts.core.test.ts`, `site/src/components/organisms/{MessageComposer.test.tsx,message-composer.core.test.ts}`, `site/src/routes/MessagePage.test.tsx` | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed db900287 --reporter=verbose` | 0. 20 files, 130 tests, including `api/src/proposals/proposals.controller.test.ts` (16) and `api/src/routine/routine.controller.test.ts` (12) | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh db90028793e37708b603f936230953ce95fd416d` | 0. 282 mutants killed, 0 survived, 0 without coverage, score 100.00, including `routine-fire.core.ts` (26), `domain/routine-run.core.ts` (2), `message-composer.core.ts` (20) and `site/src/lib/routine-run.core.ts` (21) | PASS |
| C04 | @borso-app/talos | `*.utils.ts` enumeration | The round-2 diff adds or changes no `*.utils.ts`; its pure modules are `.core.ts` files, each with a sibling test listed in C01 | PASS |

## D. Test coverage of spec

Only the rows the round-2 diff changes are walked. The other rows of round 1 (D01, D03 to D14, D16 to D23, D25) rest on tests this diff did not weaken: the only test removed is the `the run cannot be stored` case of the `it.each` at proposals.controller.test.ts:265, replaced by D05 below.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | R1.1 (amended): a text holding a NUL character is refused with 400 | `refuses a message holding a NUL character without firing` at api/src/routine/routine.controller.test.ts:142-143; `expect(response.status).toBe(400);` (:152). Schema level: `refuses a text holding a NUL character` at api/src/routine/routine.schema.test.ts:33 and `canSendMessage` › `refuses a NUL character` at domain/routine-run.core.test.ts:24 | PASS |
| D02 | R1.1 (amended): the refused text fires nothing | same test; `expect(fetcher).not.toHaveBeenCalled();` (:153) and `expect(await getDatabase().select().from(routineRunTable)).toEqual([]);` (:154) | PASS |
| D03 | R4.1 (amended): only letters, digits, `_`, `-` or `/` after the prefix, and at least one | `readSessionUrl` › `stores nothing for a NUL character`, `a line break`, `no session after the prefix` at api/src/helpers/routine/routine-fire.core.test.ts:63-65; `expect(readSessionUrl(answer)).toBeNull();` (:74). Every mutant of the pattern was killed (C03) | PASS |
| D04 | R4.1 (amended): 300 characters at most | `stores nothing for an address too long` (301 characters, :66-69) and `keeps an address exactly as long as allowed` (300 characters, :77); `expect(readSessionUrl({ claude_code_session_url: address })).toBe(address);` (:79) | PASS |
| D05 | R2.2: a failure to store the run never fails the decision | `answers the decision unchanged when the run cannot be stored` at api/src/proposals/proposals.controller.test.ts:288, which renames `routine_run` away for the request; `expect(response.status).toBe(200);`, `expect(await readStoredProposalPage()).toContain('statut: acceptee');`. The condition is set up: the fire answers a valid address, so the insert is attempted and fails | PASS |
| D06 | R2.1: one decision stores one run, also when sent twice at once | `lets one of two decisions sent together win, and refuses the other without firing` at proposals.controller.test.ts:148; `expect(statuses).toEqual([200, 409]);` and `expect(await getDatabase().select().from(routineRunTable)).toHaveLength(1);` | PASS |
| D07 | R2.3: cancelling fires nothing and stores nothing, also when sent twice at once | `lets one of two cancellations sent together win, and refuses the other` at proposals.controller.test.ts:169; `expect(page.match(/ : décision annulée/g)).toHaveLength(1);` and `expect(await countPwaStatusChanges()).toBe(2);` (one decision, one cancellation). The single cancellation case stays at :209 with `expect(fetcher).not.toHaveBeenCalled();` | PASS |
| D08 | R1.5, R1.6: the composer after the rename, and the notice above 4000 characters | `says why the button is off for a message too long to send but short enough for a link` at site/src/components/organisms/MessageComposer.test.tsx:87; `isMessageTooLongToSend` › `holds only beyond the 4000 characters the routine accepts, spaces around left out` and `never holds while the routine is not configured, since the link takes the message` at message-composer.core.test.ts; `isRoutineConfigured` › `reads the 503 the API answers while no fire url is set as a routine not configured`, `expect(isRoutineConfigured({ status: 503 })).toBe(false);` at site/src/lib/routine-run.core.test.ts:10-11 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `decideProposal` → `editProposal` → `changeProposalStatusOperation` → `didChangeProposalFromStatus` (proposals.service.ts:57-69, api/src/memory/memory-record-operations.service.ts:165-178, api/src/memory/memory-write.repository.ts:186-198) | Check-then-write | Held by a single conditional write whose `RETURNING` decides: `.update(memoryProposalTable).set(changes).where(and(eq(memoryProposalTable.slug, slug), eq(memoryProposalTable.status, expectedStatus))).returning({ slug: memoryProposalTable.slug });` then `return changedRows.length > 0;`. The service sends `expectedStatus: stored.status`, the status of the row the decision was computed from, and a write that changes no row throws `memory-conflict` inside the transaction, so the loser's `memory_event` row rolls back with it. Measured by probe: two same decisions, ten runs, each `statuses 200,409 conditional true,false fires 1 rows 1`; four mixed decisions (`acceptee`, `refusee`, `acceptee`, `refusee`) `statuses 200,409,409,409 conditional true,false,false,false fires 1 rows 1` | PASS |
| E02 | `cancelProposalDecision` → the same write (proposals.service.ts:112-119) | Check-then-write | Held by the same conditional write, with `overtaken: { kind: 'not-revocable' }`. Measured by probe: three cancellations at once `statuses 409,200,409 conditional true,false,false`, one cancellation line written | PASS |
| E03 | Concurrent proof for E01 and E02 | A back-e2e test firing the competing requests at once | `const answers = await Promise.all([send(), send()]);` (proposals.controller.test.ts:49) under `lets one of two decisions sent together win, and refuses the other without firing` (:148) and `lets one of two cancellations sent together win, and refuses the other` (:169), each asserting the refusal `expect(statuses).toEqual([200, 409]);` and the rows (`toHaveLength(1)` on `routine_run`, one decision line, `countPwaStatusChanges()`). The test warms no pool connection first; the probe sent the requests the same way and saw both reach the conditional write in ten runs of ten, so they overlap as sent | PASS |
| E04 | `POST /api/agent/changes` with `proposal.status` and no `expectedStatus` (memory-record-operations.service.ts:170-173) | Check-then-write | `if (operation.expectedStatus === undefined) { await upsertProposal(executor, after); return; }` keeps the agent's write unconditional, as before this branch and as MEMORY-CONTRACT.md:121 now states. No rule of this spec depends on it: the decision routes always send `expectedStatus`. Pinned by `changes the status when no expected status is given` and `refuses a status change whose expected status is stale, and writes nothing` (proposals.controller.test.ts:191-207) | PASS |
| E05 | `launchMessageRun` → `insertRoutineRun` | Check-then-write | Unchanged in this round but for the type of `FiredRun`; no decision is read before the insert: `const run = { id: randomUUID(), ...firedRun }; await insertRoutineRun(run);` (api/src/routine/routine.service.ts:12-13) | PASS |
| E06 | Module-level state in the changed API files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let ' <changed api files>` found nothing; the diff adds two literals, one pattern and one Zod refinement | PASS |

## Blocking findings

- None.

## Non-blocking findings

- None.

## Notes

- A01 (UNVERIFIABLE): no plan was written, and `/technical-conception` was skipped for this feature. No row depended on it, because the short-form spec gives the behaviour and the diff gives the files.
- B11 (UNVERIFIABLE): the Message screen, with its new notice, was not measured at 375 px. `/visual-validation` runs once at the end and is where it gets measured.
- E01 was measured on the local Postgres under read committed. On Aurora DSQL the loser is expected to fail at commit, be retried by `applyChunkWithRetry` (api/src/memory/memory-changes.service.ts:170-180), read the winner's status and change no row (inferred from reading, not measured on DSQL). The conditional write sits inside the retried transaction, which is what round 1 asked.
- `editProposal` reads any `memory-conflict` as "overtaken" (proposals.service.ts:71). The only operation in that batch is `proposal.status`, whose one conflict is the stale status, so no other conflict can reach it today (read of every `memory-conflict` thrower under `api/src/memory/`). Would a second operation added to that batch need its own error code?
- The second order key `desc(routineRunTable.id)` (api/src/routine/routine.repository.ts:16) is covered by no test: the list test fires its 22 runs one minute apart. The spec states no order for runs of one instant, so nothing is wrong against it. Is that order worth pinning?
- A text holding a NUL character turns the « Talos » button off with no notice, through `canSendMessage`. A phone keyboard cannot type one. Is silence acceptable there?
- The probe that produced the measured cases lives outside the repository at `/tmp/claude-0/-home-user-borso-fr/2ad21149-51d3-5fff-98e8-0e9474b187e4/scratchpad/technical-validator-routine/probe2/round2.probe.ts`, with its output in `/tmp/claude-0/-home-user-borso-fr/2ad21149-51d3-5fff-98e8-0e9474b187e4/scratchpad/technical-validator-routine/probe2.log`.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
