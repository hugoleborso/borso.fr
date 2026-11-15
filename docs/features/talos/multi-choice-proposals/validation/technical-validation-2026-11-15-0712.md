# Technical validation — A proposal offers 2 to 4 choices, and its card shows one button per choice

- Spec: [`../spec/spec.md`](../spec/spec.md) (short form: Data shape and three behaviour sections, no Q.O.D., Changes or Test strategy)
- Plan: absent (`../plan/plan.md` does not exist; the decision record is [ADR-2026-11-15T0636](../../../../adr/2026-11-15T0636-talos-decides-multi-choice-proposals-on-the-pwa-card.md))
- Branch: docs/talos-ios-native-adr
- Base: bb976ec3312f92f94c9ac6d91093685d7555e1e7
- Run at: 2026-11-15T07:18:08Z
- Round: 1
- Reviewed: 8052b457dc517c4d34b2d4eee587a807833993e7
- Touched workspaces: @borso-app/talos (api, domain, site, test seeds), scripts/ (one shell gate), docs/

The spec is in the short form, so categories A and D are built from its Data shape and S1 to S3 bullets, walked in order. 1 use case (S1.3, the buttons wrap at 375 px and none is cut) is routed to /visual-validation; out of scope for this report. No merge of `main` sits above the base (`git rev-list --merges` printed nothing).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/talos/multi-choice-proposals/plan/plan.md` does not exist | UNVERIFIABLE |
| A01 | Data shape 1 | The agent lists choices under a new « ## Options » body section | apps/talos/domain/proposal.core.ts:37, :78 | `const OPTIONS_HEADING = 'Options';` / `options: listOptions(readSection(body, OPTIONS_HEADING)),` | PASS |
| A02 | Data shape 2 | `Proposal.options` is the trimmed, non-empty `- ` items in order; fewer than two, or no section, gives `[]` | apps/talos/domain/proposal.core.ts:21, :58-60 | `options: z.array(z.string()),` / `const options = listItems(section).filter((option) => option !== '');` / `return options.length < MINIMUM_OPTION_COUNT ? [] : options;` | PASS |
| A03 | Data shape 3 | Decision body gains optional `option`, 200 characters at most | apps/talos/api/src/proposals/proposals.schema.ts:10, :23 | `const MAXIMUM_OPTION_LENGTH = 200;` / `option: z.string().max(MAXIMUM_OPTION_LENGTH).optional(),` | PASS |
| A04 | Data shape 4 | A chosen option is an accepted decision whose line reads `acceptée (jeudi) — <comment>`, `statut: acceptee` | apps/talos/domain/proposal.core.ts:125-127 | `const choice = record.option === undefined ? '' : \` (${record.option})\`;` / `` return `${LIST_ITEM_PREFIX}${record.decidedAt} : ${DECISION_LABELS[record.decision]}${choice}${suffix}`; `` | PASS |
| A05 | Data shape 3 + 4 | Every body `{ decision, option?, comment? }` the schema accepts is recorded | apps/talos/api/src/proposals/proposals.schema.ts:9; apps/talos/api/src/memory/memory-changes.schema.ts:12, :183 | `const MAXIMUM_COMMENT_LENGTH = 2000;` against `const shortTextSchema = z.string().max(MAXIMUM_SLUG_LENGTH);` (500) on `decisionLine: shortTextSchema.optional(),`. Failing case, measured with a tsx probe of `formatDecisionLine` and `changeOperationSchema`: `POST /api/proposals/2026-10-03-seance-course/decision` with `{ decision: "acceptee", option: "pas cette semaine", comment: "x".repeat(460) }` builds a 512-character decision line, `changeOperationSchema.safeParse` fails, and `validateOperations` throws `memory-refused` (400 « opération invalide »), so the choice is lost. The same comment without an option builds 492 characters and passes. Measured thresholds: the longest comment that fits is 468 characters with no option, 448 with « pas cette semaine », and 265 with a 200-character option. Introduced: pre-existing for comments of 469 to 2000 characters, widened by this branch by up to 203 characters. Fix size: one file (cap the comment so the longest line fits, or raise the line limit) | FAIL (blocking) |
| A06 | S1.1 | One button per option, labelled with its text, in order, plus Refuse and Comment, no Accept | apps/talos/site/src/components/organisms/ProposalDecisionForm.tsx:76-83 | `{hasOptions ? (` / `options.map((option) => (` / `onClick={() => decide({ decision: 'acceptee', option })}` / `{option}` | PASS |
| A07 | S1.2 | No options: Accept, Refuse and Comment as before | apps/talos/site/src/components/organisms/ProposalDecisionForm.tsx:89-96 | `onClick={() => decide({ decision: 'acceptee' })}` / `{t('proposals.accept')}` | PASS |
| A08 | S1.4 | Same card on the Décider tab and on `/proposals/<slug>` | apps/talos/site/src/components/organisms/PendingProposal.tsx:70-72 | `<ProposalDecisionForm` / `options={proposal.options}`; `PendingProposal` is rendered by `ProposalBoard.tsx:49` and `ProposalView.tsx:67` | PASS |
| A09 | S2.1 | A chosen option records the line and fires the routine through the same fire and stored run | apps/talos/api/src/proposals/proposals.service.ts:91-110 | `option: params.option,` / `await launchProposalRun(` / `params.option,` | PASS |
| A10 | S2.1b | The fire text gains `choix: <option>` after the proposition line; without option, the same two lines | apps/talos/api/src/helpers/routine/routine-fire.core.ts:42-43 | `const choiceLine = choice === undefined ? '' : \`\nchoix: ${choice}\`;` / `` return JSON.stringify({ text: `${secretPhrase ?? ''}\n${trigger}: ${subject}${choiceLine}` }); `` | PASS |
| A11 | S2.2 | 400 « Ce choix n'est pas proposé. », nothing recorded, for an unoffered option, an option with `refusee`, or `acceptee` without option on a proposal with options | apps/talos/domain/proposal.core.ts:112-120; apps/talos/api/src/proposals/proposals.core.ts:64-65; apps/talos/api/src/helpers/errors/talos-error.types.ts:24 | `return decision === 'acceptee' && options.length > 0 ? 'not-offered' : 'offered';` / `return decision === 'acceptee' && options.includes(option) ? 'offered' : 'not-offered';` / `return { content: null, outcome: { kind: 'option-not-offered' } };` / `'proposal-option-not-offered': { status: 400, message: "Ce choix n'est pas proposé." },` | PASS |
| A12 | S2.3 | Refuse without option works on every proposal | apps/talos/domain/proposal.core.ts:117-118 | `if (option === undefined) {` / `return decision === 'acceptee' && options.length > 0 ? 'not-offered' : 'offered';` | PASS |
| A13 | S2.4 | Cancelling is unchanged and the card offers the choices again | apps/talos/api/src/proposals/proposals.core.ts:73-90 | `cancelProposalDecisionFile` is untouched by the diff; its outcome re-parses the file, `proposal: { ...proposal, ...parseProposal(slug, content) }`, so `options` comes back | PASS |
| A14 | S3.1 | CONTRAT documents « ## Options », 2 to 4 items, the bracketed line, and the run reading the last line | apps/talos/CONTRAT.md:75, :83, :87, :322 | `## Options` / `it lists 2 to 4 choices there, one \`- \` item each` / `Its line names the choice in brackets, \`- 2026-10-05 10:12 : acceptée (jeudi) — <comment>\`` / `A run reads the choice from the last decision line once \`statut\` is \`acceptee\`.` | PASS |
| A15 | S3.2 | VOCABULARY names the term | apps/talos/VOCABULARY.md:39 | `- An **option** is one of the 2 to 4 choices a proposal may list under « Options ».` | PASS |
| A16 | S3.3 | The seeds carry one fictional proposal with three options | apps/talos/test/dev-live-seed.json:42, apps/talos/test/memory-seed.json:117 | `"slug": "etat/propositions/{{day+0}}-seance-course",` / `## Options\n- mardi\n- jeudi\n- pas cette semaine` | PASS |
| A17 | ADR Decision | No native app, the card carries the choices | diff file list | no file under `ios/`, no Swift, no new dependency in the diff (`git diff --name-status`) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read changed source files | names sampled: `listOptions`, `checkDecisionOption`, `choiceLine`, `selectSheetDecisions`, `REFUSAL_ONLY`; none abbreviated | PASS |
| B02 | Magic numbers / strings named | read changed source files | `MAXIMUM_OPTION_LENGTH = 200`, `MINIMUM_OPTION_COUNT = 2`, `OPTIONS_HEADING = 'Options'` | PASS |
| B03 | No prose comments | read changed source files | no comment added; the one `// Stryker disable next-line` at proposal.core.ts:51 predates the branch and is machine-read | PASS |
| B04 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed files | only `expect.any(String)` in tests and the word "any" in strings and test titles | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read changed source files | no index access added | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <changed .ts/.tsx>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B10 | Standards checklist (02): "a limit or a rule written in a site does not restate one the API enforces under another name" | read in full | `return options.length > 0 ? REFUSAL_ONLY : PROPOSAL_DECISIONS;` at apps/talos/site/src/components/organisms/proposal-board.core.ts:142 and `const hasOptions = options.length > 0;` at apps/talos/site/src/components/organisms/ProposalDecisionForm.tsx:34 restate the rule `decision === 'acceptee' && options.length > 0 ? 'not-offered'` of apps/talos/domain/proposal.core.ts:118 ("a proposal with options takes no plain acceptance"). Introduced: this branch; Fix size: one domain predicate and 3 call sites | FAIL (non-blocking) |
| B11 | Standards checklist (01): "a `build…`, `project…` or `select…` returns what its verb says" (and the verb table) | read in full | `function listOptions(section: string | null): string[] {` at apps/talos/domain/proposal.core.ts:58 applies a rule (fewer than two gives `[]`), which the table gives to `select…`; `export function checkDecisionOption(` at :112 uses a verb outside the table and returns `'offered'` for a refusal that names no option (`checkDecisionOption(options, 'refusee', undefined)` → `'offered'`). Introduced: this branch; Fix size: one file plus 2 call sites | FAIL (non-blocking) |
| B12 | Standards checklist (01): "a definition in a `VOCABULARY.md` is still true" and "an invariant promising behaviour carries a `Held by:` line" | read in full | `` `checkDecisionOption` says whether a decision names a choice the proposal offers. `` at apps/talos/VOCABULARY.md:39 is untrue for a refusal or a plain acceptance, which name no choice and still get `'offered'`; `Choosing one is an acceptance that names it` is a behaviour promise with no `Held by:` line. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B13 | Standards checklist (03): "a derived type is derived … a request body from `z.infer` … rather than written out by hand beside the thing it mirrors" | read in full | `export interface DecisionPayload extends DecisionChoice {` at apps/talos/site/src/components/organisms/proposal-board.core.ts:130 writes the request body by hand, beside `type DecisionBody = Parameters<…['$post']>[0]['json'];` at apps/talos/site/src/lib/queries/proposals.queries.ts:20, which derives it; `readonly options: readonly string[];` at PendingProposal.tsx:26 extends a hand-written `PendingProposalShape`. Introduced: pre-existing pattern, extended by this branch; Fix size: one file | FAIL (non-blocking) |
| B14 | Standards checklist (05, 06, 07, 08, 09, 10, 11, 12, 14) | read in full | no new label explains the interface (option buttons carry agent content); the form stays on `useForm`; the mutation still reconciles from the response (`storeSavedProposal`); no effect, no variant set, no i18n key, no disable comment, no pre-commit check added; test titles state behaviour and condition; e2e tests assert on the stored page and `routineRunTable` | PASS |
| B15 | Blueprints on new files | read new files | `// @FollowsBlueprint test-component-render` at ProposalDecisionForm.test.tsx:16; no new source file | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos core | `pnpm --filter @borso-app/talos exec vitest run --project core --changed $(git rev-parse bb976ec…) --reporter=verbose --coverage` | 0; 27 files, 229 tests; coverage 100% statements, branches, functions, lines. Feature files run: domain/proposal.core.test.ts, api/src/proposals/proposals.core.test.ts, proposals.schema.test.ts, helpers/routine/routine-fire.core.test.ts, routine-fire.adapter.test.ts, site/…/ProposalDecisionForm.test.tsx, ProposalBoard.test.tsx, ProposalView.test.tsx, proposal-board.core.test.ts | PASS |
| C02 | @borso-app/talos back-e2e | `pnpm --filter @borso-app/talos run test:e2e --changed $(git rev-parse bb976ec…) --reporter=verbose` | 0; 24 files, 152 tests, including api/src/proposals/proposals.controller.test.ts and api/src/today/today.controller.test.ts | PASS |
| C03 | gated files | `scripts/mutate-changed.sh $(git rev-parse bb976ec…) apps/talos` | 0; "Final mutation score of 100.00", "every changed gated file passed mutation" | PASS |
| C04 | `*.utils.ts` sibling tests | each of the 10 tracked `*.utils.ts` in apps/talos has a `*.utils.test.ts` | none missing; no `*.utils.ts` changed by the branch | PASS |
| C05 | scripts/check-spec-records.sh | change read: `sort -u || true)"` stops `pipefail` failing a spec with no `CREATE TABLE`; this spec has none | no test script covers scripts/; behaviour read only | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Data shape: options are the trimmed, non-empty `- ` items, in order | `it('lists the options in order, trimmed, without the blank items'` at apps/talos/domain/proposal.core.test.ts:92; fails at :97 `expect(parseProposal('x', withOptions)?.options).toEqual([` `'mardi', 'jeudi', 'pas cette semaine'` (input has `- mardi `, `-  ` and a non-item line) | PASS |
| D02 | Data shape: fewer than two items gives `[]` | `it('gives no option for a section with a single item'` at proposal.core.test.ts:112; `expect(parseProposal('x', withOne)?.options).toEqual([]);` at :117; two items kept at :109 `toEqual(['mardi', 'jeudi'])` | PASS |
| D03 | Data shape: no section gives `[]` | `describe('parseProposal'` at proposal.core.test.ts:60-63, fixture without « Options », `options: [],` inside `toEqual` | PASS |
| D04 | Data shape: `option` 200 characters at most | `it('carries an optional option of at most 200 characters'` at apps/talos/api/src/proposals/proposals.schema.test.ts:48; `option: 'x'.repeat(201) }).success,` → `.toBe(false)` | PASS |
| D05 | Data shape: the line names the choice in brackets, `statut: acceptee` | `it('records the chosen option in the decision line and fires the routine'` at apps/talos/api/src/proposals/proposals.controller.test.ts:121; `expect(page).toContain('statut: acceptee');` :155 and `expect(page).toContain('## Décision\n- 2026-10-05 10:12 : acceptée (jeudi) — le soir');` :156 | PASS |
| D06 | S1.1 one button per option in order, Refuse and Comment, no Accept | `it('shows one button per option in the agent order, with Refuse and Comment and no Accept'` at apps/talos/site/src/components/organisms/ProposalDecisionForm.test.tsx:63; `expect(readButtonLabels()).toEqual([` `'Commenter', 'Refuser', 'mardi', 'jeudi', 'pas cette semaine'` :65 | PASS |
| D07 | S1.1 a tap on an option sends it as an acceptance | `it('sends the tapped option as an acceptance, with the comment typed'` at ProposalDecisionForm.test.tsx:79; `expect(decided).toEqual([{ decision: 'acceptee', option: 'jeudi', comment: 'le soir' }]);` :86 | PASS |
| D08 | S1.2 no options: Accept, Refuse and Comment | `it('keeps Accept, Refuse and Comment on a proposal without options'` at ProposalDecisionForm.test.tsx:95; `expect(readButtonLabels()).toEqual(['Commenter', 'Refuser', 'Accepter']);` :97 | PASS |
| D09 | S1.3 wrap at 375 px, none cut | routed to /visual-validation | routed to /visual-validation |
| D10 | S1.4 the « Décider » tab shows the choices | `it('shows one button per option instead of Accept, and one tap sends the choice'` at apps/talos/site/src/components/organisms/ProposalBoard.test.tsx:96; `expect(findButton(tree, 'Accepter')).toBeUndefined();` :109 and `expect(sentDecisions).toEqual([{ decision: 'acceptee', option: 'jeudi' }]);` :114 | PASS |
| D11 | S1.4 the direct link `/proposals/<slug>` shows the choices | `it('opens a card that offers choices with one button per option, and no Accept'` at apps/talos/site/src/components/organisms/ProposalView.test.tsx:117; `expect(findButton(tree, 'Accepter')).toBeUndefined();` :124 | PASS |
| D12 | S2.1 a chosen option records the line and fires through the same fire and stored run | proposals.controller.test.ts:121; `expect(fetcher).toHaveBeenCalledTimes(1);` :144 and `expect(await getDatabase().select().from(routineRunTable)).toEqual([` with `subject: \`etat/propositions/${PROPOSAL_WITH_OPTIONS}\`` | PASS |
| D13 | S2.1b the fire text gains `choix: <option>` as a third line | proposals.controller.test.ts:140 `text: \`phrase\nproposition: etat/propositions/${PROPOSAL_WITH_OPTIONS}\nchoix: jeudi\`,`; unit at apps/talos/api/src/helpers/routine/routine-fire.core.test.ts:40 | PASS |
| D14 | S2.1b a decision without option sends the same two lines | `it('records the decision in the memory and fires the routine with the slug'` at proposals.controller.test.ts:216; `body: JSON.stringify({ text: \`phrase\nproposition: etat/propositions/${STORED_PROPOSAL}\` }),` :234 | PASS |
| D15 | S2.2 400 for an option not offered, nothing recorded | `it.each(` case `'an option the proposal does not offer'` and `'an option on a proposal without options'`, `'answers 400 and records nothing for %s'` at proposals.controller.test.ts:180; `expect(await response.json()).toEqual(OPTION_NOT_OFFERED);` :191, `toContain('statut: proposee')` :192, `expect(await countPwaStatusChanges()).toBe(0);` :193, `expect(fetcher).not.toHaveBeenCalled();` :194 | PASS |
| D16 | S2.2 400 for an option sent with `refusee` | same `it.each`, case `'an option sent with a refusal'`, `{ decision: 'refusee', option: 'mardi' }`; assertions :191-194 | PASS |
| D17 | S2.2 400 for `acceptee` without option on a proposal with options | same `it.each`, case `'a plain acceptance of a proposal with options'`, `{ decision: 'acceptee' }`; assertions :191-194 | PASS |
| D18 | S2.3 refuse without option works on every proposal | `it('refuses a proposal with options without a choice, and offers the choices again after a cancellation'` at proposals.controller.test.ts:197; `expect(refused.status).toBe(200);` :205; plain proposal: `expect(checkDecisionOption([], 'refusee', undefined)).toBe('offered');` at domain/proposal.core.test.ts:200 | PASS |
| D19 | S2.4 cancelling is unchanged and the choices come back | proposals.controller.test.ts:197; `expect(await reopened.json()).toMatchObject({` `status: 'proposee',` `options: ['mardi', 'jeudi', 'pas cette semaine'],` :210-212 | PASS |
| D20 | Data shape 3 + 4: an option with a comment the schema accepts is recorded | (none found) — no test sends an option with a comment long enough to pass the 500-character line (265 characters with a 200-character option, measured); the failing case is in A05 | FAIL (blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `decideProposal` → `recordPwaChanges` `proposal.status` (apps/talos/api/src/proposals/proposals.service.ts:58-67) | Check-then-write, one decision per proposal | Held by one conditional write, `.where(and(eq(memoryProposalTable.slug, slug), eq(memoryProposalTable.status, expectedStatus)))` `.returning(…)` at apps/talos/api/src/memory/memory-write.repository.ts:195; concurrent test `it('lets one of two decisions sent together win, and refuses the other without firing'` at proposals.controller.test.ts:256, `expect(statuses).toEqual([200, 409]);` :271, `expect(fetcher).toHaveBeenCalledTimes(1);` :272. Two different options sent together go through the same conditional write | PASS |
| E02 | `decideProposal` option check (apps/talos/api/src/proposals/proposals.core.ts:64) | Check-then-write, "records nothing when `option` is not one of the proposal's options" (S2.2) | The options are read from `stored.markdown` before the write, and the conditional write checks only `expectedStatus: stored.status`. Failing case: the agent's `POST /api/agent/changes` `proposal.upsert` rewrites `etat/propositions/2026-10-03-seance-course` with `## Options\n- mercredi\n- vendredi` and `status: proposee`, committing between the owner's read and write of `POST /api/proposals/2026-10-03-seance-course/decision` `{ decision: "acceptee", option: "jeudi" }`; the update `WHERE status = 'proposee'` still matches, `changeProposalStatusOperation` appends `acceptée (jeudi)` to the agent's new body, and the run fires with `choix: jeudi`, an option the proposal no longer offers. Inferred from the code (`findProposal` re-reads the row inside the transaction at memory-record-operations.service.ts:185 and `appendLineUnderHeading(before.body, …)` appends to it), not reproduced by a run. No test fires the two at once | FAIL (blocking) |
| E03 | `launchProposalRun` → `insertRoutineRun` (apps/talos/api/src/routine/routine.service.ts:10-12) | One run per decision | Runs only after E01's conditional write succeeded; `expect(await getDatabase().select().from(routineRunTable)).toHaveLength(1);` at proposals.controller.test.ts:273 | PASS |
| E04 | Module-level state | Per-process state | `grep -nE '^(let|const) [a-zA-Z]+ = new (Map|Set)|^let '` on changed api files: none found (exit 1) | PASS |

## Blocking findings

- A05 — a choice with a comment over 448 characters (« pas cette semaine »), or over 265 with a 200-character option (measured), builds a decision line over the 500-character memory limit, so the API answers 400 « opération invalide » for a body its own schema and contract accept, and the choice is lost.
- D20 — no test sends an option with a long comment, so nothing pins the combined length of the decision line.
- E02 — the option check reads the options before the write and the conditional write holds only the status, so an agent rewrite of « Options » racing a tap records and fires a choice the proposal no longer offers (inferred from the code, not reproduced).

## Non-blocking findings

- B10 — the site restates the domain rule "a proposal with options takes no plain acceptance" as `options.length > 0` in two places.
- B11 — `listOptions` applies a rule (a `select…`), and `checkDecisionOption` uses a verb outside the table and answers `'offered'` for decisions that name no option.
- B12 — the VOCABULARY definition of `checkDecisionOption` is untrue for refusals, and the option invariant has no `Held by:` line.
- B13 — `DecisionPayload` and `PendingProposalShape.options` are written by hand beside the client-derived `DecisionBody` and the domain `Proposal`.

## Notes

- A00 is UNVERIFIABLE because no plan exists; categories A and D were built from the spec's bullets and the diff.
- The parser keeps any number of options at two or more, while CONTRAT and the ADR say 2 to 4. The spec's data shape sets no upper bound, so this is not a row. Should the card cap or refuse a fifth option, given S1.3's 375 px layout?
- Two identical items (`- mardi` twice) give `options: ['mardi', 'mardi']` and two buttons with `key={option}` equal at ProposalDecisionForm.tsx:79. React warns on duplicate keys. Should the parser drop duplicates?
- The ADR's *Implementation pointers* say `Spec: none`, yet `docs/features/talos/multi-choice-proposals/spec/spec.md` exists on this branch.
- `it('lets the buttons wrap onto several lines on a narrow screen'` at ProposalDecisionForm.test.tsx:74 asserts a class name, not wrapping. S1.3 is routed to /visual-validation, which has to show it at 375 px.

## Verdict: FAIL
