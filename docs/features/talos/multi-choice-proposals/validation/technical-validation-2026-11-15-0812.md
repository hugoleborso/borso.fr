# Technical validation — A proposal offers 2 to 4 choices, and its card shows one button per choice

- Spec: [`../spec/spec.md`](../spec/spec.md) (short form)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: docs/talos-ios-native-adr
- Base: 8052b457dc517c4d34b2d4eee587a807833993e7 (round-1 Reviewed SHA)
- Run at: 2026-11-15T07:25:56Z
- Round: 2
- Reviewed: 19880f5e25fbf528d53524bfd69240e81d291b87
- Touched workspaces: @borso-app/talos (api, domain), docs/

Round 2 reads `git diff 8052b457..HEAD` restricted to the branch's own changes. The commits after the base are the fix commit `f36f44265` and a merge of `origin/main` (`19880f5e2`). Of the merge, only this branch's conflict resolution is read: `apps/talos/VOCABULARY.md` and `apps/talos/api/src/proposals/INVARIANTS.md`. The fix commits carry no new scope. 1 use case (S1.3) stays routed to /visual-validation; out of scope for this report. The `--changed` test runs use the base below the merge, so they also ran the tests the merge brought in.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/talos/multi-choice-proposals/plan/plan.md` does not exist | UNVERIFIABLE |
| A01 | Data shape 4 ("No table or memory verb changes, because the line already travels through `proposal.status` as `decisionLine`") | The fix keeps the `proposal.status` verb's fields and only lengthens `decisionLine` | apps/talos/api/src/memory/memory-changes.schema.ts:9, :15, :185 | `const MAXIMUM_DECISION_LINE_LENGTH = 2500;` / `const decisionLineSchema = z.string().max(MAXIMUM_DECISION_LINE_LENGTH);` / `decisionLine: decisionLineSchema.optional(),`. No field added or removed; MEMORY-CONTRACT.md:166 documents no length, so nothing there goes stale | PASS |
| A02 | Data shape 2 | The parser now drops repeated items before the two-item threshold | apps/talos/domain/proposal.core.ts:59-60 | `const options = [...new Set(listItems(section).filter((option) => option !== ''))];` / `return options.length < MINIMUM_OPTION_COUNT ? [] : options;`. Keeps the order of first appearance, so "in order" still holds | PASS |
| A03 | ADR pointer (round-1 note) | The ADR names the spec | docs/adr/2026-11-15T0636-talos-decides-multi-choice-proposals-on-the-pwa-card.md:127 | `- Spec: [\`docs/features/talos/multi-choice-proposals/spec/spec.md\`](../features/talos/multi-choice-proposals/spec/spec.md).` | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A05 (a choice with a long comment builds a decision line over the 500-character memory limit) | `f36f44265` apps/talos/api/src/memory/memory-changes.schema.ts:185 `decisionLine: decisionLineSchema.optional(),` at 2500 characters. Longest line the API can build, counted from `formatDecisionLine` at domain/proposal.core.ts:123-127: `- ` (2) + `AAAA-MM-JJ HH:MM` (16) + ` : ` (3) + `acceptée` (8) + ` (` 200-character option `)` (203) + ` — ` (3) + 2000-character comment = 2235, under 2500 | PASS |
| R02 | D20 (no test sends an option with a long comment) | `f36f44265` `it('records a choice with the longest comment the API accepts'` at apps/talos/api/src/proposals/proposals.controller.test.ts:159; `const comment = 'x'.repeat(2000);`, `expect(response.status).toBe(200);`, `expect(page).toContain(\`- 2026-10-05 10:12 : acceptée (pas cette semaine) — ${comment}\`);`. The line is 2052 characters, so the test fails on the old 500 limit. Ran green in C02 | PASS |
| R03 | E02 (the option check reads « Options » outside the conditional write), dismissed in `f36f44265` | The dismissal makes three claims. Checked each. (1) "The routine writes proposals overnight and does not rewrite a pending one's choices": nothing in this repository holds it. `upsertProposalOperation` at apps/talos/api/src/memory/memory-record-operations.service.ts:144-162 writes `body: operation.body,` and `status: operation.status,` with no condition on the stored status. CONTRAT.md:183 lists runs `par` `nuit`, `brief` or `session`, and CONTRAT.md:338 opens a daytime Claude Code session with « … et traite les décisions de la PWA. », so proposals are not written only overnight. (2) "The run it fires reads the proposal and sees the choice was not offered": CONTRAT.md:322 says the opposite, the `choix:` line exists "so the session knows the choice without reading the proposal", and no CONTRAT line asks a run to compare the choice with « Options ». (3) "Holding it would need … a memory verb change the spec rules out": the spec says "No table or memory verb changes" (Data shape 4), but the same commit changed the same verb's schema for R01, so this reason does not by itself close the finding. The race is unchanged: `editProposal` reads with `readMemoryProposal(memorySlug)` at proposals.service.ts:54, checks the option in `decideProposalFile` (proposals.core.ts:64), then writes with only `expectedStatus: stored.status,` at :66. Failing case, as in round 1: an agent `proposal.upsert` of `etat/propositions/2026-10-03-seance-course` with `## Options\n- mercredi\n- vendredi` and `status: proposee` commits between that read and write of `POST /api/proposals/2026-10-03-seance-course/decision` `{ decision: "acceptee", option: "jeudi" }` → the line `acceptée (jeudi)` is appended to a body that no longer offers « jeudi » and the run fires with `choix: jeudi` (inferred from the code, not reproduced) | FAIL (blocking) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names, magic numbers, no prose comments, no `any`, no assertions | read the 2 changed source files in full; `grep -nP '\bany\b\| as [A-Z]'` | `MAXIMUM_DECISION_LINE_LENGTH`, `decisionLineSchema` named; only hit is the pre-existing machine-read `// Stryker disable next-line` at proposal.core.ts:51 | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware` on the 4 changed .ts files | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | Vocabulary gate | `bash scripts/check-vocabulary-paths.sh` | exit 0, "every Held by names a test that exists" | PASS |
| B05 | Standards checklist (01): "a definition in a `VOCABULARY.md` and a rule in an `INVARIANTS.md` are still true" | read VOCABULARY.md and proposals/INVARIANTS.md in full | `- A proposal lists 2 to 4 options.` at apps/talos/api/src/proposals/INVARIANTS.md:11 is stated as a rule the folder holds, but `listOptions` at domain/proposal.core.ts:58-61 has no upper bound: a proposal with five `- ` items under « Options » parses to five options and the card shows five buttons. The bound is the agent's (CONTRAT.md:83), not the API's. Introduced: this branch; Fix size: one line (say the agent lists 2 to 4, or cap in `listOptions`). The round-1 B12 untrue `checkDecisionOption` definition is gone from VOCABULARY.md after the merge | FAIL (non-blocking) |
| B06 | Standards checklist (01): "an invariant promising behaviour carries a `Held by:` line" | read in full | `The API records nothing for an option the proposal does not offer, an option with a refusal, or an acceptance without an option when the proposal has options.` at INVARIANTS.md:11 is held by `it.each(` … `'answers 400 and records nothing for %s'` in proposals.controller.test.ts, which neither `Held by:` line at :13-14 names (they name the recording test and the refusal-and-cancellation test). Introduced: this branch; Fix size: one line | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos core | `pnpm --filter @borso-app/talos exec vitest run --project core --changed $(git rev-parse 8052b457) --reporter=verbose --coverage` | 0; 14 files, 155 tests, coverage 100% statements, branches, functions, lines. Ran domain/proposal.core.test.ts with `keeps one button per distinct option` and `gives no option when the only items repeat one choice` | PASS |
| C02 | @borso-app/talos back-e2e | `pnpm --filter @borso-app/talos run test:e2e --changed $(git rev-parse 8052b457) --reporter=verbose` | 0; 22 files, 144 tests, including `proposals.controller.test.ts > records a choice with the longest comment the API accepts` | PASS |
| C03 | gated files | `scripts/mutate-changed.sh $(git rev-parse 8052b457) apps/talos/domain/proposal.core.ts apps/talos/domain/proposal.core.test.ts` | 0; `proposal.core.ts \| 100.00`, "every changed gated file passed mutation" | PASS |
| C04 | `*.utils.ts` sibling tests | changed files | no `*.utils.ts` changed | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Data shape 3 + 4: a choice with the longest accepted comment is recorded | `it('records a choice with the longest comment the API accepts'` at proposals.controller.test.ts:159; `expect(page).toContain(\`- 2026-10-05 10:12 : acceptée (pas cette semaine) — ${comment}\`);` | PASS |
| D02 | Data shape 2: repeated items count once, in order | `it('keeps one button per distinct option'` at domain/proposal.core.test.ts:112; input `- mardi\n- mardi\n- jeudi`, `expect(parseProposal('x', withDuplicate)?.options).toEqual(['mardi', 'jeudi']);` | PASS |
| D03 | Data shape 2: fewer than two distinct items gives `[]` | `it('gives no option when the only items repeat one choice'` at proposal.core.test.ts:120; `expect(parseProposal('x', withRepeat)?.options).toEqual([]);` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Diff since the base | New write path or module state | The fix adds no `insert(`, `update(`, `transaction(` or module-level variable (`git show f36f44265 -- apps/`); it only lengthens a schema limit. The one open race is R03 | PASS |

## Blocking findings

- R03 — the E02 dismissal does not hold. Nothing here stops an agent rewriting a pending proposal's « Options » in the day, and CONTRAT.md:322 says a run takes the choice from `choix:` without reading the proposal, so a raced tap still records and fires a choice no longer offered.

## Non-blocking findings

- B05 — proposals/INVARIANTS.md says a proposal lists 2 to 4 options, but the parser keeps any number from two up.
- B06 — the invariant's "records nothing" clause has no `Held by:` line naming the 400 `it.each` test.

## Notes

- A00 is UNVERIFIABLE because no plan exists.
- R03 could be closed three ways, which is the operator's call. One is to hold the options in the conditional write, a memory verb change. Another is to re-check the option inside the same transaction as the write. The third is to write into CONTRAT.md the two rules the dismissal assumes: the agent never rewrites « Options » of a `proposee` proposal, and a run checks `choix:` against « Options ». That third option makes the dismissal true on paper, but no code would enforce it. Which one does the spec's "No table or memory verb changes" allow, given that R01 already changed the `proposal.status` schema?
- `MAXIMUM_DECISION_LINE_LENGTH = 2500` at memory-changes.schema.ts:9 is a literal not derived from `MAXIMUM_COMMENT_LENGTH` (2000) and `MAXIMUM_OPTION_LENGTH` (200) in proposals.schema.ts. If either is raised past the 265-character margin, R01 comes back. Should it be computed from them?

## Verdict: FAIL
