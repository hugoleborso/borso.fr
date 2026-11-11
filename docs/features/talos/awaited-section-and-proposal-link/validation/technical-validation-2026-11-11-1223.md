# Technical validation — Awaited commitments out of the todo, and a direct link to a proposal card

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent)
- Branch: feat/talos-awaited-section-and-proposal-link
- Base: origin/main
- Run at: 2026-11-11T12:25:18Z
- Round: 2
- Reviewed: 4dd274b02d351908dcfb1f28a9371253e86fbb1d
- Touched workspaces: @borso-app/talos (`site/` only in this round)

Round 2 reads `git diff 57a7d3d9d0e6e9d13c15b54da1dcb67fccc2e374..HEAD` only, one commit (`4dd274b0`), six files under `apps/talos/site/src` plus the round-1 report. The spec is in the short form, so categories A and D are built from its S1, S2 and S3 bullets and nothing is routed to `/visual-validation`. The round-1 rows this diff does not touch are not walked again.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | plan | Plan absent | `docs/features/talos/awaited-section-and-proposal-link/plan/` does not exist | The change was routed as a chained change without a plan. No row below depends on it. | PASS |
| A02 | S2.1 | The route `/proposals/<slug>` still resolves after the path became a constant | apps/talos/site/src/App.tsx:70-71, components/organisms/proposal-board.core.ts:49 | `<Route path={PROPOSALS_PATH} element={<ProposalsPage />} />` `<Route path={`${PROPOSALS_PATH}/:slug`} element={<ProposalPage />} />`; `export const PROPOSALS_PATH = '/proposals';`. `ProposalView.test.tsx:91` asserts `expect(window.location.pathname).toBe(`/proposals/${DONE_SLUG}`);` on the mounted `App`. | PASS |
| A03 | S2 (list tab) | The Proposals tab and its badge keep their destination | apps/talos/site/src/components/organisms/AppShell.tsx:11,18,48 | `import { PROPOSALS_PATH } from './proposal-board.core';` `{ to: PROPOSALS_PATH, labelKey: 'nav.proposals', icon: 'proposals' },` `badgeDestination={PROPOSALS_PATH}`; the value is the one the removed local constant held | PASS |
| A04 | Out of scope | No change to the API contract or memory formats | `git diff --name-status 57a7d3d9..HEAD` | Six files under `apps/talos/site/src`, none under `apps/talos/api` or `apps/talos/domain` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D02 (blocking): no test puts an awaited commitment in the today payload | `4dd274b0` apps/talos/site/src/App.test.tsx:125-132 adds `direction: 'awaited', counterpartName: 'Camille Durand', action: 'Renvoyer le contrat signé'` to the `/api/today` payload; lines 171-179 assert `expect(awaited?.open).toBe(false);`, `expect(awaited?.querySelector('summary')?.textContent).toBe('En attente · 1');`, `expect(awaited?.textContent).toContain('Camille · Renvoyer le contrat signé');`, `expect(agendaText).toContain('Rendre le dossier');`, `expect(agendaText).not.toContain('Renvoyer le contrat signé');`. `agendaText` is the text of every `section[aria-label]`, which the agenda's day groups are (TodayAgenda.tsx:65) and the `details` is not (FoldedSection.tsx:12). Round-1 failing case 1 (pass `today.data.commitments` to the agenda): the agenda row prints `commitment.action` for an awaited commitment (commitment-board.core.ts:67), so the `not.toContain` line fails. Failing case 2 (delete TodayOverview.tsx:59): no `details` exists, `awaited?.open` is `undefined`, the `toBe(false)` line fails. | PASS |
| R02 | D12 (blocking): no test asserts the Comment control on the direct link | `4dd274b0` apps/talos/site/src/components/organisms/ProposalView.test.tsx:96 `expect(tree.container.querySelector('button[aria-label="Commenter"]')).not.toBeNull();`, on `/proposals/2026-11-11-faits` before any tap. The button is `aria-label={t('proposals.comment')}` at ProposalDecisionForm.tsx:56, reached through PendingProposal.tsx:70. | PASS |
| R03 | D14 (blocking): no test asserts the status and decision lines of a decided proposal | `4dd274b0` ProposalView.test.tsx:46-50 serves `status: 'refusee', decisions: ['2026-11-10 09:30 : refusée — pas cette semaine']`; the test `'shows the status and the decision lines of a decided proposal, with the way back'` at line 129 asserts `expect(row?.textContent).toContain('Refusée');` and `expect(row?.textContent).toContain('2026-11-10 09:30 : refusée — pas cette semaine');`. The status label has a capital and the decision line does not, so each assertion fails alone when `statusLabel` or `decisions` (ProposalView.tsx:78,80) is dropped. | PASS |
| R04 | D15 (blocking): no test opens the direct link of an expired proposal | `4dd274b0` ProposalView.test.tsx:51 serves `{ …, status: 'proposee', expiresOn: '2026-11-02' }`; the test `'shows an expired proposal as expired, with nothing left to decide or take back'` at line 141 asserts `expect(tree.container.textContent).toContain('Expirée');`, `expect(findButton(tree, 'Accepter')).toBeUndefined();`, `expect(findButton(tree, 'Refuser')).toBeUndefined();`, `expect(findButton(tree, 'Revenir sur ma décision')).toBeUndefined();`. Round-1 failing case (replace `isProposalPending(proposal, today)` at ProposalView.tsx:57 by a bare status check): the fixture's status is `proposee`, so `Accepter` renders and the second assertion fails. The view reads the real clock (ProposalView.tsx:36) and the expiry is in the past for good, so the test does not depend on the day it runs. | PASS |
| R05 | B23 (non-blocking, fixed): `buildProposalHref` had no production caller | `4dd274b0` removes the function from proposal-board.core.ts and its test from proposal-board.core.test.ts. `grep -rn buildProposalHref apps/talos` prints nothing. | PASS |
| R06 | B24 (non-blocking, fixed): `PROPOSALS_PATH` existed twice and the new route was a literal | `4dd274b0` removes `const PROPOSALS_PATH = '/proposals';` from AppShell.tsx, which now imports it (AppShell.tsx:11), and App.tsx:70-71 reads the constant. `grep -rn "PROPOSALS_PATH ="` finds proposal-board.core.ts:49 alone. | PASS |

No round-1 finding was dismissed by the commit; all six were fixed.

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of the round-2 hunks | `awaited`, `agendaText`, `row`, `DECIDED_SLUG`, `EXPIRED_SLUG`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware` on the six changed `.ts`/`.tsx` files | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm run knip` | exit 0, configuration hints only | PASS |
| B05 | Magic strings extracted | read | The route literal of round 1 is now `PROPOSALS_PATH`; the two new test slugs are named constants | PASS |
| B06 | No prose comments | `git diff 57a7d3d9..HEAD -- apps \| grep -E '^\+.*(//\|/\*)'` | no output | PASS |
| B07 | No `any`, no `useEffect`, no type assertion | `grep -nP '\bany\b\|\buseEffect\('` and a read of the hunks | Two matches, both the word "any" inside test names (App.test.tsx:24, proposal-board.core.test.ts:152), neither in this diff's hunks | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read of the hunks | `awaited?.open`, `awaited?.querySelector('summary')?.textContent`, `row?.textContent`; no unguarded index | PASS |
| B09 | Standards checklist 10: "a test name states the behaviour and the condition" | read of the two new tests | `'shows the status and the decision lines of a decided proposal, with the way back'`, `'shows an expired proposal as expired, with nothing left to decide or take back'` | PASS |
| B10 | Standards checklist, source hunks (`App.tsx`, `AppShell.tsx`, `proposal-board.core.ts`) | read of the hunks against the `reviewer` bullets | The diff adds two imports of one exported constant and deletes one function; no name, layer shape, prop set or copy changes | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 57a7d3d9 --coverage --reporter=verbose` | 0. 4 files, 29 tests passed: `App.test.tsx` (4), `ProposalBoard.test.tsx` (5), `ProposalView.test.tsx` (6), `proposal-board.core.test.ts` (14). Coverage 100% statements, branches, functions and lines. | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed 57a7d3d9` | 0. No back-e2e file is affected by the diff. | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh 57a7d3d9` | 0. `proposal-board.core.ts` 51 killed, `today-agenda.core.ts` 117 killed, 0 survived, score 100. | PASS |
| C04 | @borso-app/talos | `*.utils.ts` enumeration | The diff adds and changes no `*.utils.ts`. | PASS |

## D. Test coverage of spec

Rows are the four round-1 blocking rows, re-graded, and nothing else. The other round-1 rows passed and their tests are untouched, except `proposal-board.core.test.ts`, which loses only the test of the deleted function.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D02 | S1.1 and S1.2 on the today screen: an awaited commitment of the today payload is absent from the agenda and present in the section | `it('draws the dashboard and opens Claude Code on a long-pressed todo')` at App.test.tsx:97; `expect(agendaText).not.toContain('Renvoyer le contrat signé');` at line 179 and `expect(awaited?.textContent).toContain('Camille · Renvoyer le contrat signé');` at line 174 | PASS |
| D12 | S2.2 Comment control on the direct link | `it('opens the one card with its decision buttons, and one tap decides it')` at ProposalView.test.tsx:87; `expect(tree.container.querySelector('button[aria-label="Commenter"]')).not.toBeNull();` at line 96 | PASS |
| D14 | S2.3 a decided proposal shows its status and decision lines | `it('shows the status and the decision lines of a decided proposal, with the way back')` at ProposalView.test.tsx:129; `expect(row?.textContent).toContain('Refusée');` and `expect(row?.textContent).toContain('2026-11-10 09:30 : refusée — pas cette semaine');` at lines 135-136 | PASS |
| D15 | S2.3 an expired proposal shows its status, without decision controls | `it('shows an expired proposal as expired, with nothing left to decide or take back')` at ProposalView.test.tsx:141; `expect(tree.container.textContent).toContain('Expirée');` and `expect(findButton(tree, 'Accepter')).toBeUndefined();` at lines 145-146 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole round-2 diff | Does it write to a database or keep state? | `git diff 57a7d3d9..HEAD --name-status` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`, and no file under `apps/talos/api`. The only module-level addition is the import of `export const PROPOSALS_PATH = '/proposals';` (proposal-board.core.ts:49), a string constant. No write path and no per-process state is added. | PASS |

## Blocking findings

- None.

## Non-blocking findings

- None.

## Notes

- R01 to R04 were established by reading the new assertions against the code they pin, not by applying each round-1 failing case and running the suite, because this validator may write no file but the report. The suite itself was run and passes (C01).
- The round-1 questions stay open and are not re-raised as rows: the 375 px check is left to `/visual-validation`; the « En attente · N » counter and the awaited pill can show two numbers; a fenced lesson body shows its fence lines; `scheduled` as the name of the owed-or-undirected half; `today.awaited_one` and `today.awaited_other` hold the same string.
- `TodayProposal.tsx:26` and `TodayCounters.tsx:41` still write `'/proposals'` as a literal. Both predate the branch and neither is in this round's diff. Should they read `PROPOSALS_PATH` now that it is exported?

## Verdict: PASS
