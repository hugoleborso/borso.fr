# Friction inventory of PR #350

Sources: the archived log `docs/features/talos/multi-choice-proposals/kaizen.md`
(11 lines, all added by this merge, read with `scripts/kaizen.sh sweep-input
d4f37f942`), the three lines logged after the archive, the three session events
the sweep prompt named, the pull request's 14 commits and its one bot comment
(no review thread), the two technical and one visual validation reports,
`get_session` and `list_events` on the merged session and on the Talos session
that wrote its first prompt, and open kaizen PR #360.

Writers: `main` 2, `hook:pre-push-conflict` 3, `visual-validator` 2,
`technical-validator` 1, `technical-validator-r2` 1, `multi-choice-impl` 1,
`hook:no-prettier` 1, `hook:no-test-double-dash` 1, `hook:no-broad-kill` 1,
`hook:merge-on-moved-base` 1. Every agent was told its label. No wall was hit
by more than one writer.

| # | When | Friction | Sources / evidence | Rock | Decision |
| --- | --- | --- | --- | --- | --- |
| 01 | conception | The first ADR was written in French, and its commit credited the French to the operator. | kaizen `main` 06:55; commit `e57e309`; squash `d4f37f942` still says "written in French at the operator's request" | CLAUDE.md's English rule lived only in prose, so a prompt read later beat it | dantotsu: `the-prompt-that-outranked-claude-md`, a pre-commit gate refusing a French ADR, spec or plan |
| 02 | conception | The prompt came from a Talos session, which also asked for ADR « numérotation » and MADR format, two conventions this repository does not use. | `list_events` on `session_01K69KnD79rQbg7iQUupoHhQ`, `create_session` at 06:33 UTC | A second copy of how borso.fr writes, kept in `hugoleborso/talos` | merge into 01; its removal is `docs/operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md`, because this session was refused that repository |
| 03 | conception | The ADR changed its decision three times, from a paid licence to a free-signed app to keeping the PWA. | commits `e57e309`, `d106487`, `27f1519` | None. Each change follows an operator answer, which the `/adr` walk asks for | no-op: the commit messages record the operator rejecting the licence, then choosing the status quo |
| 04 | conception | Apple's documentation pages render in JavaScript, so WebFetch returned only the title. | kaizen `main` 06:36 | A JavaScript-rendered vendor site | no-op: solved in one step through the JSON endpoint, and the knowledge hook reads no WebFetch, so an entry would have no reader |
| 05 | spec | `check-spec-records.sh` refused every spec with no `CREATE TABLE`, in silence, and this branch and main fixed it separately. | commit `0cc2ac7`; merge conflict at 17:46 on that script | A gate shipped without a run on a passing case | merge into PR #360, whose row 06 makes a silent refusal name the check that failed |
| 06 | implementation | Prettier was reached for. | `hook:no-prettier` 07:03 | None left. Pre-commit formats each commit with oxfmt | no-op: the hook refused before anything ran |
| 07 | implementation | `--` was passed to a pnpm test script. This sweep did it too. | `hook:no-test-double-dash` 07:04, and 21:06 in this session | pnpm passes `--` on to Vitest | no-op: the hook refused before anything ran; seven lines over every archive, one retry each |
| 08 | implementation | A hook that refused one segment of a compound command dropped the edits chained before it. | kaizen `multi-choice-impl` 07:11 | Edits and a guarded command chained in one Bash call | no-op: PR #359 shipped a "nothing ran" refusal line for this and withdrew it as working around, the operator's call |
| 09 | validation | A 2000-character comment fit the proposals schema but not the 500-character decision line the memory verb accepted. A hand probe found it. | kaizen `technical-validator` 07:18; round-1 A05 and D20; commit `f36f442` | Two limits that must agree, set by hand in two files | fixed: the decision line limit is now computed in the domain from the option and comment limits, and a domain test fits the longest line inside it |
| 10 | validation | A round-1 dismissal rested on what the Talos routine does. Round 2 refuted two of its three claims from `CONTRAT.md`, which is in this repository. | kaizen `technical-validator-r2` 07:25; round-2 R03 | A dismissal reason is free text that names no file | fixed: `/technical-validation` asks a dismissal to name its file, and sends a reason only another repository could confirm to the operator |
| 11 | validation | The option race stayed blocking after round 2. | round-2 R03; commit `a0dcaa6` | None. Two rounds is the cap | no-op: the operator accepted it, and `INVARIANTS.md` records it under "Not held" |
| 12 | validation | The visual validator's click on « Décider » at 1280 × 577 was refused, covered by `div.absolute.inset-0`. | kaizen `visual-validator` 08:30 | Unknown | no-op: probed by this sweep on `pnpm dev` at 1280 × 577, the click reaches `/proposals`. Not reproduced, so no cause is named |
| 13 | validation | The routine fire cannot be observed on `pnpm dev`, which has no fire URL. | kaizen `visual-validator` 08:30 | None. A browser is the wrong layer for a server call | no-op: the back e2e tests in `proposals.controller.test.ts` stub the fire and assert it, and a refusal's absence of one |
| 14 | implementation | `pkill` or `killall` was reached for. | `hook:no-broad-kill` 08:30 | Servers started without their own process group | no-op: the hook refused, and its recipe stopped this sweep's dev server by port |
| 15 | implementation | The refusal stopped firing Talos at 16:34, after both technical rounds. | commit `4577657` | None. CLAUDE.md caps validation at two rounds | no-op: the operator asked for it after the preview, and it ships with a back e2e test CI ran |
| 16 | ship | Pre-push refused three times on a branch that conflicted with main. | `hook:pre-push-conflict` 07:21, 16:34 ×2; merges `19880f5`, `d2373e4` | The ADR index every pull request appended to, and PR #353 rewriting every glossary at once | no-op: PR #352 removed the ADR index and PR #359 restored that removal; the glossary rewrite was one refactor |
| 17 | ship | A merge was refused because main had moved under the CI run. | `hook:merge-on-moved-base` 17:46; merge `0518221` | Two fixes of one gate, row 05 | merge into 05 |
| 18 | post-merge | This sweep was refused `add_repo` on `hugoleborso/talos`. | this session, 21:09 | Access to the operator's other repository | merge into 02 |
| 19 | post-merge | PR #359's squash message names `scripts/stop-port.sh`, which the same pull request withdrew. | this session; `git show 9b8d380ed` | A squash message keeps every intermediate commit's body | merge into 01, whose squash message carries the same kind of stale line |
