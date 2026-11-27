# Restore decisions: technical-validation and technical-validator

Sweeps: #418 = ac0e4d8b, #410 = 458e886c, #406 = 214ec4bc. "agent" = `.claude/agents/technical-validator.md`, "SKILL/standard/template" = `.claude/skills/technical-validation/<file>.md`. Line numbers are of the current files after this change.

| sweep | file | passage (first ~12 words) | decision | evidence |
|---|---|---|---|---|
| #418 | SKILL | The validator reads the diff and asks five questions: correctness against the spec | keep cut | Duplicates the five categories in agent *Validation categories*; the #418 commit cut it for that reason. |
| #406 | SKILL | 9. Stage the report for commit. It lives under docs/features/... | keep cut | CLAUDE.md "Subagents never commit"; agent Procedure 4 says the main session commits what it finds at `report_path`; staging hook refuses subagents (#406 commit). |
| #410 | agent | You are the engineering counterpart to the visual-validator: same standalone-agent posture | keep cut | No-op: exposition, no behaviour; the posture is stated in the opening paragraph. |
| #410 | agent | spec_path ... when the operator asked for the change directly | keep cut | Rewording; ADR case still covered by *An ADR as the contract*. |
| #410 | agent | plan_path: Earlier reports graded it PASS, UNVERIFIABLE and FAIL, so do not copy one | keep cut | No-op: agent line 16 now fixes one grading (UNVERIFIABLE, non-blocking); the agent reads no earlier report but `previous_report`. |
| #410 | agent | base_ref: git ref ... (e.g. origin/main) | keep cut | Superseded: now the 40-character SHA (agent line 17, SKILL step 4). |
| #410 | agent | report_path: On PR #216 two validators read the two instructions as a contradiction | keep cut | Rule and reason stay (agent line 18); the incident adds no behaviour. |
| #410 | agent | No implementation summary. No "this should work because…" | keep cut | Covered by "these fields, and nothing else. The implementer is not consulted" (agent line 13). |
| #410 | agent | previous_report ... whose Reviewed: SHA and blocking findings scope this round | keep cut | Moved into *Rounds* (agent line 28). |
| #410 | agent | Round 2: ..., or a file that message names, dismisses gets a row too | restore | #406 added it; SKILL line 62 tells the implementer the reason names its file, so the validator must read that file. Not stated anywhere else for the agent. Restored at agent line 28. |
| #410 | agent | the pull request opens after validation, so it holds none | restore | The agent never reads SKILL; without it a validator may hunt dismissals in PR comments. Restored at agent line 28. |
| #410 | agent | PR #247 dismissed B15 on the claim that a pure module cannot import | keep cut | Reason kept ("the false reason is what ships in the history", agent line 28); anecdote adds no step. |
| #410 | agent | such as the same change rolled out to more apps as on PR #290 | keep cut | Example kept without the PR number (agent line 28). |
| #410 | agent | The repo's standing rules at CLAUDE.md (code-quality section) | keep cut | Stale: `grep -i 'clean code\|code-quality' CLAUDE.md` finds nothing; rules live in docs/standards, already an input. |
| #410 | agent | .oxlintrc.json, which reaches every workspace | keep cut | No-op qualifier; the file is still listed (agent line 35). |
| #410 | agent | Name the request, the sequence or the arguments, and the result | keep cut | Rewording: "names an input and the wrong result ... closely enough to become a test" (agent line 44). |
| #410 | agent | A report whose FAIL rows each carry a failing case can be acted on | keep cut | Reason held in standard *Why a finding carries its failing case*. |
| #410 | agent | FAIL (non-blocking) ... Listed in the report and the pull request | keep cut | SKILL *Verdict acceptance*: non-blocking findings are fixed, dismissed or listed in the PR description. |
| #410 | agent | A dismissal whose claim fails in round 2 is the one exception | keep cut | Merged into *Rounds*: FAIL (blocking) "because the false reason is what ships" (agent line 28). |
| #410 | agent | Three pragma features in a row shipped one (several-calendar-feeds, ...) | keep cut | Rule "valid input, not a gap" stays (agent line 62); feature names add no behaviour. |
| #410 | agent | /visual-validation builds its rows from the same bullets with the same test | keep cut | Held in `.claude/agents/visual-validator.md:65`, which the visual agent reads. |
| #410 | agent | PR #314's report routed nothing, and its spin count ... checked by no one | keep cut | The routing rule and its count stay (agent line 62); incident adds no step. |
| #410 | agent | each of those three reports asked, and no spec added them | restore | Only reason for "Ask for no missing section"; without it the ban reads arbitrary and agents rationalise past it. Restored at agent line 62. |
| #410 | agent | A missing plan is still the plan absent row (short form and ADR) | keep cut | Stated once in `plan_path` (agent line 16), which applies to every spec kind. |
| #410 | agent | ADR: the operator asked for the change directly ... PR #290 handed one over | keep cut | History; the procedure stays (agent line 66). |
| #410 | agent | A: (palette options, default mode, URL behaviour, error handling, etc.) / URL contracts quote 2–4 lines | keep cut | Merged into "matches the decision. Quote 2 to 4 lines" (agent line 72). |
| #410 | agent | The install-banner amendment on PR #193 ... so the operator sees nobody planned that part | keep cut | Rule and the row stay (agent line 73); the row's text itself tells the operator. |
| #410 | agent | B: Every bullet under What only a reviewer can check in the ledger ... not the hunk | keep cut | Replaced by the `grep -n -A6 '^- \`reviewer\`'` listing (agent line 34) and "**in full**" (line 78). |
| #410 | agent | The repo's rules from CLAUDE.md "Clean code" and docs/standards/ | keep cut | Stale: CLAUDE.md has no "Clean code" section (grep). |
| #410 | agent | No prose comments. borso/no-comments refuses every comment | keep cut | Held by lint: `.oxlintrc.json:129` `"borso/no-comments": "error"`, and the lint row runs oxlint. |
| #410 | agent | Warnings fail the run through denyWarnings in .oxlintrc.json | keep cut | No-op: `.oxlintrc.json:36` `denyWarnings: true` makes the oxlint run the lint row already executes exit non-zero. |
| #410 | agent | sample 3–5 representative names from the changed code (Procedure step 4) | keep cut | Held by lint: `borso/no-abbreviated-identifier` and `borso/function-names-are-verb-phrases` in eslint-rules/. |
| #410 | agent | useEffect: CSS / derived state / event handlers / useSyncExternalStore ... See CLAUDE.md | keep cut | Held by `borso/no-use-effect` (`.oxlintrc.json:544`, site files) and `docs/standards/07-state-and-effects.md:144` reviewer bullet; CLAUDE.md citation stale. |
| #410 | agent | Identify which workspaces the diff touches | keep cut | No-op; the commands per workspace kind follow. |
| #410 | agent | --coverage ... gates only the changed files the coverage include names | keep cut | The flag stays in the command (agent line 93); the explanation changes no step. |
| #410 | agent | mutate-changed only the changed gated files (other agents' unfinished files share the tree) / Eight merged PRs | keep cut | Script behaviour, not an instruction; reason kept as "CI finds it otherwise" (agent line 97). |
| #410 | agent | The test:e2e script boots ...; --changed walks the import graph, no affected file exits 0 | keep cut | "A run that names no test file is not a pass" (agent line 95). |
| #410 | agent | vitest --changed 42012559 ... (reproduced on talos, 2026-11-11) | keep cut | Rule and failure mode kept (agent line 96). |
| #410 | agent | the diff, --changed <base> and mutate-changed.sh <base> all carry what the merge brought | restore | The why of the first-parent list; without it the step looks optional. Not stated elsewhere. Restored at agent line 98. |
| #410 | agent | Round 2 of PR #300 read 120 files against the feature's 28 | keep cut | Measured anecdote; the restored clause carries the cause. |
| #410 | agent | which leaves out a file only a conflict resolution touched | restore | Tells the agent what the command excludes, so it does not re-add those files. Restored at agent line 98. |
| #410 | agent | Keep the --changed runs, which run more tests than the feature needs and miss none | restore | The reason to keep the broad runs after narrowing the file list; otherwise an agent narrows them too. Restored at agent line 98. |
| #410 | agent | on PR #316's batch it ran one pragma test file for 42 upgrades ... 15 s to 124 s | keep cut | Rule and cause kept ("--changed reads no lockfile change", agent line 99); durations go stale. |
| #410 | agent | The default reporter prints only totals | keep cut | No-op given "--reporter=verbose names each test file run" (agent line 95). |
| #410 | agent | Repo rule (CLAUDE.md "Clean code"): pure utilities ship at 100% coverage | keep cut | Stale citation; held by coverage include `site/**/*.{core,utils,adapter,schema}.ts` (e.g. `apps/borso-fr/vitest.config.ts:18`). |
| #410 | agent | D: do not second-guess the spec author's routing | keep cut | Rewording: "Treat it as authoritative" (agent line 106). |
| #410 | agent | PR #107's did, and two passes graded the case it left out two ways | keep cut | Rule kept (agent line 107). |
| #410 | agent | If no test exists ... the spec asked for unit coverage and the implementation didn't deliver | keep cut | "No test means FAIL" (agent line 109). |
| #410 | agent | however close its lines are; PR #107 graded that row PASS twice | restore (clause only) | "however close its lines are" names the exact failure mode (proximity mistaken for coverage). Restored at agent line 110; the PR anecdote keeps cut. |
| #410 | agent | Do not fill that cell with a test that does not exercise the claim | keep cut | Duplicates the bullet above it (agent line 110). |
| #410 | agent | tagging them UNVERIFIABLE pretends they are and clutters the report | keep cut | Rule kept (agent line 108). |
| #410 | agent | The repo's spec rule (see specification/SKILL.md) forbids manual-sweep / seventeen identical rows | keep cut | Rule kept with "/specification" (agent line 113); `.claude/skills/specification/SKILL.md:28` holds the ban. |
| #410 | agent | E: an "already has one" / Then ask what happens when two requests arrive | keep cut | Rewording (agent line 120). |
| #410 | agent | A FAIL row names the two requests and the duplicated or overfilled result | keep cut | Covered by *What counts as a finding* behaviour rows (agent line 44). |
| #410 | agent | read every module-level variable the diff adds or starts relying on | restore | "starts relying on" extends the check to existing module state the diff newly depends on; nothing else says it. Restored at agent line 121. |
| #410 | agent | a "last seen" / such as "at most five attempts" | keep cut | Examples only. |
| #410 | agent | When the diff predates the rule ... "preexisting" is not a verdict | keep cut | "An existing write path the diff only touches still gets its row" (agent line 124). |
| #410 | agent | Procedure step 1: (PR #363) | keep cut | Rule kept (agent line 128). |
| #410 | agent | Procedure step 2: Round 2 ... plus one row per round-1 blocking finding; merge file list | keep cut | In *Rounds* (agent line 28) and category C merge bullet (line 98). |
| #410 | agent | Procedure steps 3–7 (walk category A ... E summaries) | keep cut | Duplicates each category section. |
| #410 | agent | on PR #298 a first version written early was committed with a placeholder cell | keep cut | Reason kept ("The main session commits what it finds at that path", agent line 131). |
| #410 | agent | friction examples: a gate that failed for an unrelated reason, a command ... | restore | Defines what friction is for a reviewer, so more of it gets logged. Not stated elsewhere. Restored at agent line 132. |
| #410 | agent | It is swept at merge by /after-task-kaizen | keep cut | No-op for the validator; CLAUDE.md *Self-improvement loop* holds it. |
| #410 | agent | Return only the report path. Do not summarise findings. | restore ("Do not summarise") | Agents summarise by default; the main session reads the report. Restored at agent line 138. |
| #410 | agent | Verdict semantics: Aggregated across all five categories | keep cut | No-op. |
| #410 | agent | PASS_EXCEPT_UNVERIFIABLE is its own verdict — mergeable only when ... FAIL is never mergeable | keep cut | SKILL *Verdict acceptance + PR disclosure* holds it; merging is not the validator's act. |
| #410 | agent | Rules: Do not summarise the implementation. Validate from the spec/plan and the diff alone. | keep cut | Agent line 9 "Validate against the spec, never against the implementation"; report layout has no summary slot. |
| #410 | agent | Rules: Every FAIL row states its failing case; Never raise a finding you cannot quote | keep cut | *What counts as a finding* (agent lines 42-45) and line 214. |
| #410 | agent | If the plan is missing ... recommend running /technical-conception first | keep cut | Superseded: one `plan absent` row (agent line 16); kaizen sweeps have no plan by design. |
| #410 | SKILL | Five questions list (Correctness ... Scale) | keep cut | Agent *Validation categories* (single source). |
| #410 | SKILL | Every FAIL row states a concrete failing case ... typed blocking | keep cut | Agent *What counts as a finding*. |
| #410 | SKILL | It is the engineering counterpart of /visual-validation | keep cut | No-op. |
| #410 | SKILL | The canonical standard this skill enforces lives at standard.md | keep cut | Reworded pointer at SKILL line 11. |
| #410 | SKILL | Agent({ subagent_type: "technical-validator", ... }) code block | keep cut | Same call in template.md line 14. |
| #410 | SKILL | When to invoke / Do not invoke lists | keep cut | Description carries the triggers; skip cases at SKILL lines 21-22. |
| #410 | SKILL | Derive <app> from the path | keep cut | No-op. |
| #410 | SKILL | the validator will tag plan-dependent rows UNVERIFIABLE | keep cut | Agent `plan_path` bullet. |
| #410 | SKILL | The sweep of PR #295 passed its parent feature's spec | keep cut | Rule kept (SKILL step 1). |
| #410 | SKILL | Check apps/<app>/package.json ... test:core ... picks the scoped test command | keep cut | The agent picks the command itself (agent line 93). |
| #410 | SKILL | on PR #339 it moved mid-review, so a --changed base ran the tests of #333 | keep cut | Cause kept ("moves when another pull request merges mid-review", SKILL step 4). |
| #410 | SKILL | validation_dir variable | keep cut | Rewording (SKILL step 5). |
| #410 | SKILL | PR #327's revision was briefed as round 1 with the round-2 scope | keep cut | Rule kept (SKILL step 6). |
| #410 | SKILL | Round 1 reviews the whole branch; round 2 reviews only the commits after | keep cut | Agent *Rounds*. |
| #410 | SKILL | Read the report's verdict and its two finding lists, not the tables | restore ("not the tables") | Keeps the main session's context lean; nothing else says it. Restored at SKILL step 8. |
| #410 | SKILL | on PR #298 one was committed with a placeholder cell | keep cut | Rule kept ("a file at report_path earlier is a draft"). |
| #410 | SKILL | On PASS_EXCEPT_UNVERIFIABLE, carry the UNVERIFIABLE rows to the PR description | keep cut | SKILL *Verdict acceptance* bullet 3. |
| #410 | SKILL | Non-blocking findings never start a round; list them in the pull request | keep cut | Agent line 52 and SKILL *Verdict acceptance* bullet 2. |
| #410 | SKILL | PR #193 ran nine standards rounds ... 12 of its 92 commits re-seal | keep cut | Reason kept ("each round rereads code nobody changed"). |
| #410 | SKILL | Deliverable section and return strings | keep cut | Merged into SKILL *Verdict acceptance* opening line. |
| #410 | SKILL | A blocking finding is a real defect. Fix it and run round 2 | keep cut | SKILL *Findings and rounds*. |
| #410 | SKILL | (e.g. a tooling limit, or a row legitimately deferred to /visual-validation) | keep cut | Contradicts agent line 108 (no UNVERIFIABLE row for a routed assertion). |
| #410 | SKILL | Failure modes to avoid (10 bullets) | keep cut | Each restates an agent rule: lines 9, 13, 93-100, 109, 115-124, 214; SKILL standalone rule; "367 s on pragma" is a duration. |
| #410 | SKILL | Repo-specific notes (workspaces, coverage gating, base, branch names, pairing) | keep cut | Workspaces at agent line 19; base at SKILL step 4; report folder at step 5; the rest no-ops. |
| #410 | SKILL | The standard report file is still produced — the verdict file is an additional artefact | keep cut | Rewording ("The report is still produced"). |
| #410 | SKILL | description: Reads the standard at standard.md before dispatching / no chat history | keep cut | standard.md now holds only rationale, pointed to at SKILL line 11. |
| #410 | standard | Header: Source standard ... edit SKILL.md when the enforcement evolves | keep cut | Superseded by the file's new role (standard lines 3-6). |
| #410 | standard | Five questions with how-to per question | keep cut | Agent categories. |
| #410 | standard | Every finding states a concrete failing case / blocking vs non-blocking | keep cut | Agent *What counts as a finding*. |
| #410 | standard | Two rounds at most ... PR #193 ran nine standards rounds | keep cut | Agent *Rounds*, SKILL *Findings and rounds*. |
| #410 | standard | A passing technical validation is high confidence the feature ships clean | keep cut | No-op; halting push kept (standard line 21). |
| #410 | standard | This is structural, not cultural ... frontmatter and brief are carriers | keep cut | Rewording (standard lines 12-14). |
| #410 | standard | A: Every Q.O.D. row ... Skip pure deferral ... future work | keep cut | Agent line 70. |
| #410 | standard | B list (names, constants, comments, assertions, any, index access, oxlint) | keep cut | Agent category B; comments held by `borso/no-comments`. |
| #410 | standard | pnpm exec knip clean on the workspace | keep cut | Held by gates: `.husky/pre-push:248` and `.github/workflows/ci.yml:229` run knip. |
| #410 | standard | useEffect is a smell ... You Might Not Need an Effect | keep cut | `borso/no-use-effect` (`.oxlintrc.json:544`) and `docs/standards/07-state-and-effects.md:144`. |
| #410 | standard | Per-domain triad on the backend ... last-loop-lepin canonical shape | keep cut | Held by `borso/no-horizontal-folders-in-api` and `no-controller-imports-outside-service` (eslint-rules/index.js) and `docs/standards/04-backend-architecture.md` reviewer bullets; CLAUDE.md "Clean code" section no longer exists. |
| #410 | standard | C: commands, utils FAIL, no-runner UNVERIFIABLE, utils enumeration | keep cut | Agent category C (lines 91-100). |
| #410 | standard | D split examples (dominant-colour, JSDOM-backed test, prefers-color-scheme) | keep cut | Examples; the split stays (standard lines 23-32). |
| #410 | standard | D procedure 1-5 and manual-sweep waiver, static features | keep cut | Agent category D. |
| #410 | standard | E: three checks | keep cut | Agent category E. |
| #410 | standard | "consider handling X" are not findings | keep cut | Agent line 47 gives the same class. |
| #410 | standard | Architectural fit ... not against an architectural opinion; deeper a11y | keep cut | Rewording (standard lines 52-53). |
| #410 | standard | Final verdict aggregation; PASS_EXCEPT mergeable only if ... | keep cut | Agent *Verdict semantics*; SKILL *Verdict acceptance*. |
| #410 | standard | Common mistakes table (12 rows) | keep cut | Each row restates an agent rule (lines 9, 52, 91-124, 140, 214) or SKILL's standalone rule. |
| #410 | template | Two templates live here. The skill uses both. | keep cut | Rewording (template line 3). |
| #410 | template | Report template (full markdown layout) | keep cut | Agent *Report format* is the single source (template line 53 points to it). |
| #410 | template | Path conventions: sibling links, inline evidence, never modifies files outside report_path | keep cut | Template line 53 and agent line 140. |

Counts: 11 restored (agent 10, SKILL 1), 106 kept cut.

Also fixed, not a restoration: template.md's brief still said `base_ref` e.g. `origin/main` and "note a missing plan as a finding", which contradict SKILL step 4 and agent line 16.
