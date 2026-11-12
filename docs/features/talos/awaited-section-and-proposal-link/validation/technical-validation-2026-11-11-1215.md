# Technical validation — Awaited commitments out of the todo, and a direct link to a proposal card

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent)
- Branch: feat/talos-awaited-section-and-proposal-link
- Base: origin/main
- Run at: 2026-11-11T12:19:01Z
- Round: 1
- Reviewed: 57a7d3d9d0e6e9d13c15b54da1dcb67fccc2e374
- Touched workspaces: @borso-app/talos (`site/`, `api/` tests only, `CONTRAT.md`)

The spec is in the short form (three behaviour sections and *Out of scope*). Categories A and D are built from its S1, S2 and S3 bullets, in order, and the files are taken from the diff. Nothing is routed to `/visual-validation`. The 375 px check of standard 05 is left to `/visual-validation` (see Notes).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | plan | Plan absent | `docs/features/talos/awaited-section-and-proposal-link/plan/` does not exist | The change was routed as a chained change without a plan; files taken from the diff. No row below depends on it. | PASS |
| A02 | S1.1 | An awaited commitment leaves the today agenda | apps/talos/site/src/components/organisms/TodayOverview.tsx:27,58 | `const commitments = splitAwaitedCommitments(today.data?.commitments ?? []);` then `<TodayAgenda todos={today.data.todos} commitments={commitments.scheduled} today={date} />` | PASS |
| A03 | S1.1 | The today agenda is the only place listing commitments with tasks | `grep -rln commitments site/src --include=*.tsx` (non-test) | Only `TodayAgenda.tsx` mixes them with todos. `TodayCounters.tsx` shows counts, `CommitmentBoard.tsx` lists commitments alone. | PASS |
| A04 | S1.2 | Awaited commitments of the today payload go to a section « En attente » | TodayOverview.tsx:59, apps/talos/site/src/i18n/fr.json:277 | `<TodayAwaited commitments={commitments.awaited} today={date} />`; `"today.awaited_one": "En attente · {{count}}"` | PASS |
| A05 | S1.3 | Folded by default, showing its label and a counter | apps/talos/site/src/components/organisms/TodayAwaited.tsx:16, molecules/FoldedSection.tsx:12 | `<FoldedSection label={t('today.awaited', { count: commitments.length })}>`; `<details className="group …">` carries no `open` | PASS |
| A06 | S1.4 | Section absent without an awaited commitment | TodayAwaited.tsx:14 | `if (commitments.length === 0) return null;` | PASS |
| A07 | S1.5 | `moi->eux` or no direction stays in the agenda | apps/talos/site/src/components/organisms/today-agenda.core.ts:95-98 | `const isAwaited = (commitment: Commitment): boolean => commitment.direction === AWAITED_DIRECTION;` `scheduled: commitments.filter((commitment) => !isAwaited(commitment)),` | PASS |
| A08 | S1.6 | Engagements screen unchanged in behaviour | CommitmentBoard.tsx:53-55, OpenCommitmentRow.tsx:26-63 | `<OpenCommitmentRow key={commitment.path} commitment={commitment} today={today} />`; the row body is the removed block moved as is (`buildCommitmentHref`, `selectCommitmentHeadline`, `selectDueStatus`, `describeDue`, same action sheet), with `addDaysToIsoDay(today, 1)` now computed per row instead of once | PASS |
| A09 | S2.1 | `/proposals/<slug>` shows that one card | apps/talos/site/src/App.tsx:70, routes/ProposalPage.tsx:7-8 | `<Route path="/proposals/:slug" element={<ProposalPage />} />`; `const { slug = '' } = useParams();` `return <ProposalView key={slug} slug={slug} />;` | PASS |
| A10 | S2.2 | Pending shows reason, draft, Accept, Refuse, Comment; one tap decides with the list's request | ProposalView.tsx:62-72 | `<PendingProposal proposal={proposal} … showsDraft onDecide={(payload) => { setWasTouchedHere(true); decideProposal.mutate({ slug, ...payload }); }} />`, the same `useDecideProposal` and `PendingProposal` as `ProposalBoard.tsx:44-53` | PASS |
| A11 | S2.3 | Decided or expired shows its status and decision lines | ProposalView.tsx:56,76-80, proposal-board.core.ts:62-67 | `const status = selectProposalStatus(proposal, today);` … `statusLabel={t(selectStatusLabelKey(status))}` `decisions={proposal.decisions}`; `return isProposalExpired(proposal, today) ? EXPIRED_STATUS : proposal.status;` | PASS |
| A12 | S2.3 | A decision that can still be taken back offers it | ProposalView.tsx:58,82-90 | `const isRevocable = isDecisionRevocable(status);` … `<RevokeDecisionButton … onRevoke={() => { setWasTouchedHere(true); cancelDecision.mutate({ slug }); }} />` | PASS |
| A13 | S2.4 | Unknown slug shows « Proposition introuvable » | ProposalView.tsx:48-55, fr.json:279 | `if (proposal === null) {` … `<EmptyState icon="proposals" label={t('proposals.not-found')} />`; `"proposals.not-found": "Proposition introuvable"` | PASS |
| A14 | S2.5 | `POST /api/notify` accepts the `url` without a schema change | apps/talos/api/src/notify/notify.schema.ts:8,15 (not in the diff) | `const SITE_PATH_PATTERN = /^\/(?!\/)/;` `url: z.string().max(MAXIMUM_URL_LENGTH).regex(SITE_PATH_PATTERN).optional(),` | PASS |
| A15 | S2.6 | `CONTRAT.md` documents the route and the `url` | apps/talos/CONTRAT.md:254,302 | "`/proposals/<slug>` for the card of one proposal (`/proposals/2026-11-11-faits` for `etat/propositions/2026-11-11-faits.md`)"; "**Une proposition** (`/proposals/<slug>`, where `<slug>` is the file name without `etat/propositions/` and `.md` …" | PASS |
| A16 | S3.1 | The API accepts both slug shapes | apps/talos/api/src/proposals/proposals.schema.ts:6,17 (not in the diff) | `const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;` `slug: z.string().max(MAXIMUM_SLUG_LENGTH).regex(SLUG_PATTERN),` | PASS |
| A17 | S3.2 | Bullet list one item per line, diff line by line in a preformatted block | apps/talos/site/src/components/molecules/ProposalCard.tsx:66-68 (not in the diff) | `<pre className="m-0 p-3 rounded-sm bg-sunk font-mono text-mono text-ink whitespace-pre-wrap break-words">` `{draft}` | PASS |
| A18 | S3.3 | A decision fires the routine with `proposition: etat/propositions/<slug>` | apps/talos/api/src/proposals/proposals.service.ts:95 (not in the diff) | `await fireRoutine(ROUTINE_TRIGGER, stripMarkdownExtension(buildProposalPath(params.slug)));` | PASS |
| A19 | S3.4 | Code is added only if something breaks | diff of `apps/talos/api/` | Two test files only (`notify.schema.test.ts`, `proposals.schema.test.ts`); no API or card source changed for S3 | PASS |
| A20 | Out of scope | No change to the API contract or memory formats | `git diff origin/main...HEAD --name-status` | No file under `apps/talos/api/src` other than two tests, none under `apps/talos/domain` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of the changed files | `wasTouchedHere`, `isRevocable`, `splitAwaitedCommitments`, `findProposal`, `selectProposalStatus`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <12 changed .ts/.tsx files>` (and the 4 other changed test files in a first run) | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm run knip` | exit 0, configuration hints only | PASS |
| B05 | Magic strings extracted | read | `EXPIRED_STATUS`, `AWAITED_DIRECTION`, `PROPOSALS_PATH` are named | PASS |
| B06 | No prose comments | `git diff … \| grep -E '^\+.*(//\|/\*)'` | five `// @FollowsBlueprint` lines only | PASS |
| B07 | Function names describe the result | read | `buildProposalHref`, `findProposal`, `selectProposalStatus`, `splitAwaitedCommitments` | PASS |
| B08 | Type assertions limited to `as const` / `as unknown` | `grep -nE '\bas [A-Za-z]'` on changed files | `direction: 'awaited' as const` (TodayAwaited.test.tsx:17,22); two pre-existing `as const` in today-agenda.core.ts | PASS |
| B09 | No `any` | `grep -nP '\bany\b'` on changed files | none found | PASS |
| B10 | `noUncheckedIndexedAccess` honoured | read | `DECISION_PATH.exec(path)?.[1]` (ProposalView.test.tsx:48); `proposals.find(…) ?? null` (proposal-board.core.ts:59) | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B12 | Standards checklist 01: "a `find…` returns `null` rather than a sentinel … a `build…`, `project…` or `select…` returns what its verb says" | read in full | `return proposals.find((proposal) => proposal.slug === slug) ?? null;` at proposal-board.core.ts:59 | PASS |
| B13 | Standards checklist 01: "a boolean name is not negated" | read in full | `isWriting`, `isPending`, `isRevocable`, `wasTouchedHere`, `isAwaited` | PASS |
| B14 | Standards checklist 01: "a definition in a `VOCABULARY.md` is still true" | `VOCABULARY.md` is not in the diff; lines 58-59 read against the code | "`direction` is `owed` for `moi->eux` … and `awaited` for `eux->moi`" still holds | PASS |
| B15 | Standards checklist 05: "a route composes organisms and owns no layout primitive" | read in full | `return <ProposalView key={slug} slug={slug} />;` at routes/ProposalPage.tsx:8 | PASS |
| B16 | Standards checklist 05: "a prop set has not grown a family of booleans" | read in full | New prop sets hold `slug`, or `commitment`/`commitments` and `today`; no boolean | PASS |
| B17 | Standards checklist 05: "no new page subtitle, field hint or button label explains the interface" | fr.json:277-279 | `"En attente · {{count}}"`, `"Proposition introuvable"` | PASS |
| B18 | Standards checklist 09: "a key's dotted path names the screen and the element" | fr.json:277-279 | `today.awaited`, `proposals.not-found` | PASS |
| B19 | Standards checklist 10: "a test name states the behaviour and the condition" | read of the four new and changed test blocks | `'says so when the link names no proposal'`, `'shows nothing when nobody owes anything'` | PASS |
| B20 | Standards checklist 06: "a mutation … reconciles from the response rather than refetching" | read of ProposalView.tsx | The view adds no mutation; it reuses `useDecideProposal` and `useCancelProposalDecision`, which call `storeSavedProposal` | PASS |
| B21 | Standards checklist 02: "a limit or a rule written in a site does not restate one the API enforces under another name" | read in full | `const AWAITED_DIRECTION = 'awaited';` at today-agenda.core.ts:90 names a payload value the site already reads as a literal at commitment-board.core.ts:57; it is no API-enforced limit | PASS |
| B22 | Blueprint shape | blueprint index read for `organism-mutation-panel`, `organism-presentational`, `route-detail-page`, `test-component-render` | `ProposalView` mirrors `ProposalBoard` (same hooks, same `isWriting`); `OpenCommitmentRow` and `TodayAwaited` hold no state and no query; `ProposalPage` mirrors `CommitmentDetailPage` | PASS |
| B23 | Dead code (CLAUDE.md clean code) | `grep -rn buildProposalHref apps/talos/site/src` | `export function buildProposalHref(slug: string): string {` at proposal-board.core.ts:51 is imported by `proposal-board.core.test.ts` only. No production code calls it; the agent builds the `url` itself. Introduced: this branch; Fix size: one file (delete the function and its test, or use it). | FAIL (non-blocking) |
| B24 | Magic strings extracted | `grep -rn "PROPOSALS_PATH\|'/proposals'\|\"/proposals\""` | `export const PROPOSALS_PATH = '/proposals';` at proposal-board.core.ts:49 is a second constant with the name and value of `const PROPOSALS_PATH = '/proposals';` at AppShell.tsx:13, and the new route beside it is a literal, `path="/proposals/:slug"` at App.tsx:70. Introduced: this branch (the second constant and the literal); Fix size: 2 call sites. | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed origin/main --coverage --reporter=verbose` | 0. 14 files, 84 tests passed, among them `ProposalView.test.tsx` (4), `TodayAwaited.test.tsx` (2), `proposal-board.core.test.ts` (15), `today-agenda.core.test.ts` (13), `notify.schema.test.ts` (10), `proposals.schema.test.ts` (11). Coverage 100% statements, branches, functions and lines. | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed origin/main` | 0. No back-e2e file is affected by the diff. | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh origin/main` | 0. `proposal-board.core.ts` 53 killed, `today-agenda.core.ts` 117 killed, 0 survived, score 100. | PASS |
| C04 | @borso-app/talos | `*.utils.ts` enumeration | The diff adds and changes no `*.utils.ts`. | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | S1.1 the split takes an awaited commitment out of the agenda's input | `describe('splitAwaitedCommitments')` / `it('takes what others owe the owner out of the agenda and keeps the rest in order')` at today-agenda.core.test.ts:196-205; assertion `expect(splitAwaitedCommitments([owed, awaited, undirected])).toEqual({ scheduled: [owed, undirected], awaited: [awaited] });` | PASS |
| D02 | S1.1 and S1.2 on the today screen: an awaited commitment of the today payload is absent from the agenda and present in the section | (none found). `TodayOverview` is mounted only by `App.test.tsx`, whose today payload holds one commitment, `direction: 'owed'` (App.test.tsx:119-125), and whose assertions are `expect(text).toContain(expected)` on the whole text. Failing case: change TodayOverview.tsx:58 back to `commitments={today.data.commitments}`, or delete line 59; a payload with `{ direction: 'awaited' }` then shows the commitment in the agenda, or shows no section, and no test fails. | FAIL (blocking) |
| D03 | S1.2 the section lists the awaited commitments under the label « En attente » | `it('folds what others owe the owner under a counter, closed until tapped')` at TodayAwaited.test.tsx:41; assertions `expect(container.querySelector('summary')?.textContent).toBe('En attente · 2');` and the two `href` values at lines 52-57 | PASS |
| D04 | S1.3 folded by default, label and counter | same test; `expect(container.querySelector('details')?.open).toBe(false);` at TodayAwaited.test.tsx:49 | PASS |
| D05 | S1.4 absent when there is none | `it('shows nothing when nobody owes anything')` at TodayAwaited.test.tsx:62; `expect(container.innerHTML).toBe('');` | PASS |
| D06 | S1.5 `moi->eux` stays in the agenda | today-agenda.core.test.ts:198 `const owed = { …, direction: 'owed' };` kept in `scheduled: [owed, undirected]` | PASS |
| D07 | S1.5 no direction stays in the agenda | today-agenda.core.test.ts:200 `const undirected = { …, direction: null };` kept in `scheduled: [owed, undirected]` | PASS |
| D08 | S1.6 Engagements screen unchanged | **structural:** `CommitmentBoard.tsx:53-55` maps each commitment to `OpenCommitmentRow`, whose body is the block the diff removes from the board. The row itself is rendered by TodayAwaited.test.tsx:52-60 (`'/commitments/engagements/retour-contrat'`, `'Camille · Renvoyer le contrat signé'`). No test mounts `CommitmentBoard`, before or after this branch. | PASS |
| D09 | S2.1 the route shows the card of that one proposal | `it('opens the one card with its decision buttons, and one tap decides it')` at ProposalView.test.tsx:78; `expect([...tree.container.querySelectorAll('h2')].map(…)).toEqual(['Déjà faits ?']);` with two proposals served | PASS |
| D10 | S2.2 a pending proposal shows its reason and its draft | `it('shows the commitments of a grouped proposal one per line, and its reason as a list')` at ProposalView.test.tsx:98; `expect(tree.container.querySelector('pre')?.textContent).toBe(DONE_DRAFT);` and the `li` assertion at line 103-105 | PASS |
| D11 | S2.2 Accept and Refuse controls | ProposalView.test.tsx:81,86 `await flushUntil(() => findButton(tree, 'Accepter') !== undefined);` `expect(findButton(tree, 'Refuser')).toBeDefined();` | PASS |
| D12 | S2.2 Comment control on the direct link | (none found). No assertion in ProposalView.test.tsx names the comment control. Failing case: a `PendingProposal` rendered at `/proposals/2026-11-11-faits` without its `ProposalDecisionForm` comment button passes all four tests. | FAIL (blocking) |
| D13 | S2.2 one tap decides, with the same request as the list | ProposalView.test.tsx:87-94; `expect(fetchStub.calls.map(…)).toContain(`POST /api/proposals/${DONE_SLUG}/decision`);` after one click on `Accepter` | PASS |
| D14 | S2.3 a decided proposal shows its status and decision lines | (none found). The first test reaches the decided state and asserts only the revoke button and the absence of `Accepter` (ProposalView.test.tsx:90-91); the stub's `decisions` is `[]`. Failing case: drop `statusLabel` or `decisions={proposal.decisions}` at ProposalView.tsx:78-80; a proposal with `decisions: ['2026-11-11 10:12 : acceptée']` then shows no line and no test fails. | FAIL (blocking) |
| D15 | S2.3 an expired proposal shows its status, without decision controls | `it('reads a pending proposal past its expiry as expired, and any other by its status')` at proposal-board.core.test.ts:157 pins `selectProposalStatus`. No test opens the link of an expired proposal. Failing case: replace `isProposalPending(proposal, today)` at ProposalView.tsx:57 by `proposal.status === 'proposee'`; `/proposals/<slug>` of `{ status: 'proposee', expiresOn: '2026-11-10' }` on 2026-11-11 then shows Accept and Refuse, and no test fails. | FAIL (blocking) |
| D16 | S2.3 a decision that can still be taken back offers it | ProposalView.test.tsx:90 `await flushUntil(() => findButton(tree, 'Revenir sur ma décision') !== undefined);`, which throws when the button never appears (queries.test-utils.tsx:93-96) | PASS |
| D17 | S2.4 unknown slug shows « Proposition introuvable » | `it('says so when the link names no proposal')` at ProposalView.test.tsx:119; `await flushUntil(() => tree.container.textContent.includes('Proposition introuvable'));`; and `expect(findProposal(proposals, '2026-11-10-faits')).toBeNull();` at proposal-board.core.test.ts:154 | PASS |
| D18 | S2.5 notify accepts `/proposals/<slug>` | `it('accepts the direct link to one proposal card')` at notify.schema.test.ts:11; `).toBe('/proposals/2026-11-11-faits');` | PASS |
| D19 | S3.1 the API accepts both slug shapes | `it.each([['2026-11-11-faits'], ['2026-11-11-appris-relances-le-lundi']])('accepts the grouped proposal slug %s')` at proposals.schema.test.ts:13; `expect(proposalSlugSchema.safeParse({ slug }).success).toBe(true);` | PASS |
| D20 | S3.2 a bullet list shows one item per line | ProposalView.test.tsx:102 `expect(tree.container.querySelector('pre')?.textContent).toBe(DONE_DRAFT);`, the draft being three `- ` lines inside a `pre` | PASS |
| D21 | S3.2 a diff shows line by line in a preformatted block | `it('shows the diff of a lesson to validate in a preformatted block, line by line')` at ProposalView.test.tsx:109; `expect(tree.container.querySelector('pre')?.textContent.split('\n')).toEqual(expect.arrayContaining(['- Relancer le vendredi', '+ Relancer le lundi matin']));` | PASS |
| D22 | S3.3 a decision fires the routine with `proposition: etat/propositions/<slug>` | proposals.controller.test.ts:67-81 (not in the diff); `body: JSON.stringify({ text: `phrase\nproposition: etat/propositions/${STORED_PROPOSAL}` }),`. The slug there is `2026-10-04-atelier`; the path is built from the slug alone at proposals.service.ts:95, so the grouped shapes take the same line. | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole diff | Does it write to a database or keep state? | `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| wc -l` prints 0. `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files finds nothing. The site reuses `useDecideProposal` and `useCancelProposalDecision` unchanged, both under `scope: PROPOSALS_WRITE_SCOPE` (proposals.queries.ts:85,126). No write path and no per-process state is added. | PASS |

## Blocking findings

- D02 — No test puts an awaited commitment in the today payload, so the wiring at TodayOverview.tsx:58-59 can be reverted with every test green.
- D12 — No test asserts the Comment control on the direct link.
- D14 — No test asserts the status and the decision lines of a decided proposal on the direct link.
- D15 — No test opens the direct link of an expired proposal; swapping the pending rule at ProposalView.tsx:57 for a bare status check shows Accept and Refuse on it with every test green.

## Non-blocking findings

- B23 — `buildProposalHref` (proposal-board.core.ts:51) has no production caller.
- B24 — `PROPOSALS_PATH` now exists twice (proposal-board.core.ts:49, AppShell.tsx:13) and the new route path in App.tsx:70 is a literal.

## Notes

- D02, D12, D14 and D15 were established by reading the tests and their fixtures, not by applying the change and running the suite, because this validator may write no file but the report.
- The 375 px bullet of standard 05 ("every screen holds together at 375 pixels") was not checked here. Is the new `/proposals/<slug>` screen and the « En attente » section covered by the `/visual-validation` run at the end?
- The section counter « En attente · N » counts the awaited commitments of the today payload, which is filtered by `selectUnclaimedCommitments(selectCommitmentsDueBy(commitments, horizon), todos)` (today.service.ts:82), while the awaited pill shows `commitmentCounts.awaited`, counted over all open commitments (today.service.ts:83). The spec asks for exactly the payload's commitments (S1.2). Is it intended that the two numbers on one screen can differ?
- A lesson's body written as a fenced block shows its fence lines (` ```diff ` and ` ``` `) inside the `pre`, since the draft is printed as raw text (ProposalCard.tsx:66-68) and the test fixture `LEARNED_DRAFT` holds them. S3.4 forbids new code unless something breaks. Does the owner count visible fences as broken?
- `splitAwaitedCommitments` names its other half `scheduled`, though it also holds commitments with no due date. Is `scheduled` the word `VOCABULARY.md` should carry for "owed or undirected"?
- `today.awaited_one` and `today.awaited_other` hold the same string (fr.json:277-278).

## Verdict: FAIL
