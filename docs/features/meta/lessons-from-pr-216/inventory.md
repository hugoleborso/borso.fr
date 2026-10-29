# Friction inventory for PRs #216 and #231

PR #216 was the pragma UX redesign: 182 commits, 869 files, six operator reviews, squashed as `de91fdfe`. PR #231 fixed three things the redesign left, squashed as `33a642e9`. One sweep covers both, at the operator's request, in the session that shipped them.

Sources:

- The archived friction log, `docs/features/pragma/ux-redesign/kaizen.md`: 197 lines from 78 writers, four of them guard hooks. `L<n>` below is a line number in that file.
- The pull requests' conversations. Both hold only bot comments and no review, so the operator's corrections come from the spec's *Operator review 1* to *6* sections and from the coordinating session's notes.
- The commits of `refs/pull/216/head` and the CI runs of both pull requests.
- The nine technical and seven visual validation reports under `docs/features/pragma/ux-redesign/validation/`.

## Writers

The 197 lines group by writer as follows. Guard hooks wrote 42: `hook:no-swallowed-push` 28, `hook:no-broad-kill` 8, `hook:no-discarding-reset` 5 and `hook:pr-body` 1. The coordinating session, as `main`, wrote 6. The other 149 come from 73 agent labels, none with more than 7 lines (`implement-1` and `fix-1`). Every agent was given a label, so the sweep is not blind to them.

A subject logged by three or more writers is marked *systemic* below. That count is what moved a row from knowledge to a gate.

## Inventory

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | `reports.sh all` failed on main because #224 deleted six scripts that nine dantotsus named in `zone:`. #216 then rewrote the nine records to files the defects never lived in | L195 `merge-main`; `git show de91fdfe -- docs/dantotsus` (9 zone lines) | dantotsu: [a-deleted-file-broke-the-records-that-named-it](../../../dantotsus/a-deleted-file-broke-the-records-that-named-it.md) |
| 02 | implementation | The task-metrics runner called `scripts/argent.sh`, which #224 deleted. Every run failed and nothing said so until an agent tried one | L200 `review6`; commit `6dd6eac9` on #216 | dantotsu: [the-runner-called-a-script-main-had-deleted](../../../dantotsus/the-runner-called-a-script-main-had-deleted.md) |
| 03 | post-merge | #231's preview teardown failed with DSQL OC001 because the production deploy of the same merge ran DDL on the same cluster. `pragma-pr-231` stays `DELETE_FAILED` | ci: job 123469319393; deploy run 40880184924 at 13:14:54; `describe-stacks` (measured) | dantotsu: [a-merge-raced-its-own-preview-teardown](../../../dantotsus/a-merge-raced-its-own-preview-teardown.md) |
| 04 | implementation | The discarding-reset hook said "cannot read the checkout" for a literal `git checkout -- <file>` on any dirty tree. Systemic: 3 agents plus the 5 hook lines, and this sweep | L147 `fix-all`, L203 `harness-repair`, L145, L146, L177, L202 hook lines; reproduced here | dantotsu: [the-guard-that-blamed-the-checkout-for-its-own-trap](../../../dantotsus/the-guard-that-blamed-the-checkout-for-its-own-trap.md) |
| 05 | implementation | The design-token test read the strings `'to-learn'` and `'from-sm'` as gradient classes. Systemic: 3 writers across both PRs | L132 `build-4`, L139 `build-6`, L210 `redesign-fixes` | dantotsu: [a-filter-named-to-learn-failed-the-colour-test](../../../dantotsus/a-filter-named-to-learn-failed-the-colour-test.md) |
| 06 | implementation | The same token scanner split `aria-pressed:*:` and `has-[[role=x]]` wrongly | L85 `fix-1`, L199 `review6` | no-op: both tokenizer bugs were fixed on #216 and pinned by tests in `design-tokens.utils.test.ts` |
| 07 | validation | The CI `mutation` job was cancelled at its 20-minute timeout on #216's final head `d4ca9ba0`, a docs-only commit, because it mutates the whole PR diff: 101 gated pragma files. #216 merged with no mutation verdict. Pushes after main's #224 had none either, since #224 moved mutation from pre-push to CI | ci: job 123404080056, run 40861015638 (Stryker processes killed at cleanup); `scripts/mutate-changed.sh`; 101 gated files counted from the diff (measured) | fixed: the operator chose Stryker's incremental mode, cached per pull request, and a 60-minute limit. Measured on this branch: 61 s, then 19 s with 25 of 30 mutant results reused |
| 08 | implementation | Pre-push mutation over a stacked branch re-ran every earlier slice, and a five-slice range was estimated at about three hours | L141 `tech-validator-all`, L148 `ship-all` | merge into 07 |
| 09 | implementation | A link to a new, untracked doc read as broken, and an untracked doc's own links were never checked. Systemic: 3 writers | L47 `archivist`, L50 `adr-writer`, L51 `spec-critic` | fixed: `check-doc-links.ts` reads untracked, non-ignored files in full mode |
| 10 | implementation | `blueprint-indexing --accept` rewrote 2,751 lines to accept one marker. On main the baseline carried 703 lines of drift: 584 unrecorded markers and 119 stale entries | L69 `implement-2`; `--accept` diff on main (measured) | fixed: `--accept <path>` rewrites only that file's entries, the drift message names the path, and the baseline is resynced in this PR. Unrecorded markers will build up again, because nothing records them until someone accepts |
| 11 | conception | Two skills told the validator to run `/after-task-kaizen` itself on merge, against CLAUDE.md's rule that the kaizen runs in a new conversation | `technical-validation/SKILL.md`, `visual-validation/SKILL.md`, `implementation/SKILL.md` on main | fixed: the three auto-chain passages are deleted |
| 12 | pr-description | A subagent told not to subscribe to #231 subscribed anyway | coordinator's note; `/open-pr` step 7 says "Subscribe, then stop" | fixed: step 7 says a subagent skips the call and hands the URL back |
| 13 | plan | The plan split one redesign into seven stacked pull requests. The operator rejected them: "stop stacking the PRs" | L151 `main`; `plan-slice-2.md` to `plan-slice-6.md` ("stacked on slice N") | fixed: `/route` says a feature is one branch and one pull request at every tier |
| 14 | implementation | An agent answered "why only one or two member pills" by adding an unrequested **Played by** feature, which review 3 reverted (T6) | L176 `main`; spec row T6 | fixed: `/implementation` failure modes name it |
| 15 | validation | The operator removed explanatory text in reviews 3, 5 and 6 ("too much text", "no text") | spec rows T2, T5, T6, T7, U6, W5 | fixed: `apps/pragma/README.md` states that screens carry no explanatory text |
| 16 | validation | A full visual-validation round per review batch was judged too heavy ("lean mode"). The rounds hit the usage limit twice | L172 `main`; 7 visual and 9 technical reports | no-op: #224, merged during #216, set one review agent and one visual validation at the end (CLAUDE.md *Feature flow*) |
| 17 | validation | The operator suspected a stale preview database after entering production data. It was fine: takes were blocklisted by design | coordinator's note; ADR-0052 | no-op: ADR-0052 now clones takes into previews |
| 18 | implementation | Four workflow subagents had no Agent tool to dispatch the validator | L65, L70, L74, L76 | no-op: wall `workflow-subagent-cannot-dispatch` counts it; #224 made the review one agent |
| 19 | implementation | Subagents were refused Write on report `.md` files, so three audit findings existed only in transcripts, and the skeptic and deck worked without them. The validator's contract also required a committed report | L23, L30, L31, L32, L33, L34, L35, L39, L92, L97 | fixed: both validator agents now say that writing `report_path` is the deliverable, which a general note against report files does not cover. The audit-stage refusals came from the platform's subagent rule |
| 20 | validation | agent-browser sessions wedged after 40 to 165 drives, and a restart signed the session out | L43, L79, L86, L88, L96, L167, L171 | no-op: wall `browser-session-wedges` and its knowledge entry; `scripts/browser.sh` is gone |
| 21 | validation | argent traps: mouse taps, a cached viewport, no accented keys, one tool-server per machine, no touch drag, screenshot path ignored, zero-size match | L22, L36, L37, L40, L89, L95, L100, L118, L154, L155, L156, L170 | no-op: #224 removed argent; the harness moved to CDP touch in `6dd6eac9` |
| 22 | validation | `scripts/browser.sh --restart --session` closed the wrong daemon, and a private artifact could not be opened | L46, L99 | no-op: `scripts/browser.sh` was removed by #224 |
| 23 | validation | agent-browser `find text` missed icon-plus-label controls | L158 | no-op: wall `browser-cli-traps` |
| 24 | validation | Headless Chromium ignores a touch-source scroll gesture and DPR in a screencast, has no keyboard, and agent-browser cannot set safe-area insets | L157, L201, L206, L211 | knowledge: `real-touch-gestures-over-cdp.md` gains the four gaps and three triggers |
| 25 | implementation | No tool copies production rows into a local database: 200 rows per query, and `app_config` must exist before sign-in | L205 `demo-video` | knowledge: `the-production-database-is-out-of-reach-of-a-hosted-session.md`, printed on `db-read.sh`, gains the recipe and its two limits. One writer, so no script |
| 26 | implementation | `db-read.sh` timed out from the hosted session | L53, L165 | no-op: #218, merged on 2026-10-29, moved the read path to an invoked reader Lambda; L53 predates it (inferred from the log order) |
| 27 | implementation | 28 `git commit` or `git push` pipes refused, and one more in this sweep | 28 `hook:no-swallowed-push` lines; L125 | no-op: the hook refused each as designed; the cost is one retry |
| 28 | implementation | 8 broad kills refused | 8 `hook:no-broad-kill` lines | no-op: the hook refused each as designed |
| 29 | implementation | The discarding-reset hook refused a one-file checkout while unrelated files were modified | L67, L68 | no-op: by design, any tracked change is at stake; the message now offers `git add <those paths>` |
| 30 | implementation | Pre-commit checks read the working tree, so a partially staged commit failed on a staged deletion or an edit meant for the next commit. 4 writers | L131, L164, L189, L192 | no-op: knowledge `splitting-commits-when-pre-commit-reads-the-tree.md` covers it, and wall `history-operations-lose-work` counts it |
| 31 | implementation | oxlint's commit budget tripped on machine load and on one type-aware file | L136, L137 | no-op: #224 deleted `check-pre-commit-budget.sh` |
| 32 | implementation | `check-named-paths-exist` went over its 300 ms budget on a 17-file deletion | L128 | no-op: fixed in the gate's `--staged` mode, which now searches only its surfaces |
| 33 | implementation | The i18n parity test failed in the full core suite, not at commit | L153, L190 | no-op: since #224 the commit runs no test; CI and the validator run `test:core` before merge |
| 34 | implementation | Stryker did not collect `scripts/**/*.adapter.test.ts`, so adapters failed mutation on the first push | L71, L72 | no-op: fixed on #216 in `d8f3b142` |
| 35 | implementation | Module-level constants survived mutation because the module is evaluated once, or reloaded by `vi.resetModules` | L73, L144 | no-op: the tests re-import per case, and knowledge `how-a-mutation-survivor-hides.md` covers survivors that look untested |
| 36 | implementation | Survivors: an equivalent `some`/`every` mutant, an optional chain the implementer never mutated, `eslint-rules` mutated by the wrong config | L87, L161, L194 | no-op: the gates refused as designed; ESLint is gone since #197 |
| 37 | implementation | The CI `back-e2e` job neared its 10-minute limit with three argon2id hashes per test, and `build` ran the architecture graph twice | L162 `ci-timeout`, L178 `build-timeout` | no-op: fixed on #216 by `4d7df633` and `530bf523` |
| 38 | implementation | Removing the architecture `--check` step made a canary stray | L185 | no-op: #224 removed the canaries |
| 39 | implementation | The append-only gate refused correcting a dated validation report, and `/open-pr` 5b asked for an edit it refuses | L104, L117, L175 | no-op: `/open-pr` 5b now says to leave the report alone |
| 40 | implementation | Screenshots of one round staged for upload and another committed | L105 | no-op: ADR-0023's staging rule; one round followed it |
| 41 | implementation | Main took ADR numbers and conflicted with the branch | L106, L108, L174 | no-op: CLAUDE.md now names a new ADR by its UTC minute, so two branches cannot take one number; knowledge `a-conflicted-pull-request-gets-no-checks.md` covers the silent CI |
| 42 | implementation | The task-metrics harness: flaky walks, probes run before queries settle, light scheme only, skipped controls, no 1280 px, no scroll start, renamed buttons, a seed without bars or durations | L75, L78, L80, L81, L82, L83, L84, L91, L93, L94, L114, L119, L121, L124, L133, L140, L142, L143, L168, L169, L182 | no-op: the feature's own measuring tool; `fix-1` and later rounds fixed each on #216 |
| 43 | implementation | The dev fixture was too thin and ports were hard-coded; the instance reseed kept drag order | L15, L25, L41 | no-op: wall `seed-and-fixture-out-of-step`; `pragma-instance.sh` was a scratch tool |
| 44 | implementation | PWA checks in dev: no service worker, `setOffline` and `display-mode` emulation do not hold, sign-in needs a localStorage marker | L19, L20, L26, L27 | knowledge: `driving-pragma-auth-from-a-validator.md`, printed on a `localhost:<port>/api/auth` command, gains the `pragma.session-seen` marker. The rest was one audit's |
| 45 | implementation | Audit tooling: no computed-style collector, no alpha-aware contrast script, no tap counts, before shots only as mockups | L29, L34, L45, L109 | no-op: one-off audit work |
| 46 | spec | The spec's contrast figures did not reproduce, the mockups showed content the spec did not name, task 2's target assumed a two-tap removal, R3 was parked but listed as due | L60, L112, L133, L159, L160 | no-op: each was settled in the spec on #216; wall `validators-and-specs-disagree` |
| 47 | plan | The plan put the member palette in the site while the API already declared one | L64 | no-op: `no-api-declaration-repeated-in-site` fired as designed |
| 48 | implementation | Tokens referenced through `var()` in TS strings and a class on an undefined token reached the code | L28, L63 | no-op: the design-token test added on #216 catches both |
| 49 | implementation | Every `*Sheet` component rendered a centred dialog | L18 | no-op: the redesign made them sheets |
| 50 | implementation | Harness scripts hard-coded scratchpad paths | L48, L49, L56 | no-op: the committed harness under `apps/pragma/scripts/` uses relative paths |
| 51 | implementation | The enforcement ledger could not cite an app-only lint rule | L55 | no-op: #224 removed the ledger |
| 52 | implementation | A regex codemod over JSX broke 15 files | L61 | no-op: one agent, reverted in the same task |
| 53 | implementation | `until ! pgrep -f` never ended, twice | L58, L62 | no-op: knowledge `pgrep-f-matches-its-own-wait-loop.md` fired, too late the first time |
| 54 | implementation | rtk truncated file reads, and its lint rewrite hid oxlint's clean exit | L21, L126 | no-op: an environment tool; `sed -n` reads whole files |
| 55 | implementation | oxlint prints nothing on a clean run | L116 | no-op: a vendor behaviour that cost one probe |
| 56 | implementation | `conditions-live-in-pure-functions` fires only at commit; commitlint refused a capitalised subject | L184, L198 | no-op: the gates refused as designed |
| 57 | implementation | `SessionDetail.tsx` sat at the 300-line cap | L181 | no-op: wall `file-size-cap` |
| 58 | implementation | `check-coupled-lists` read a table name out of ADR-0009 prose | L193 | no-op: one occurrence; the backticks were removed |
| 59 | implementation | The GitHub connector dropped the `!` of an image, and a body's markup was stripped | L110, L149 | no-op: #211 posts screenshots in a sticky comment; wall `pull-request-body-rewritten` |
| 60 | pr-description | `check-pr-body.ts` refused an *Operator review* section | L173 | no-op: wall `pull-request-body-refused`; the content fit under Validation |
| 61 | implementation | Harness logs saved as `.log` were gitignored | L101 | no-op: one occurrence |
| 62 | conception | Benchmarks: vendor screenshots carry no licence, Apple HIG and M3 pages render client-side, two sites answer 403 | L16, L17, L188 | no-op: research limits of one benchmark |
| 63 | implementation | lucide-react aliases broke a static SVG extractor | L42, L44 | no-op: one design studio task |
| 64 | implementation | A shared agent-browser session was near its wedge when an agent started | L43 | merge into 20 |
| 65 | implementation | Stage views ignored the top safe area, and two pills overflowed 390 px in French | L207, L208 | no-op: fixed by #231 |
| 66 | validation | A stop hook flagged unpushed commits that belonged to a running subagent | coordinator's note | no-op: the hook is Claude Code's own, not this repository's |
| 67 | validation | Auto mode refused reading a band recording the operator asked for | coordinator's note | no-op: the platform's classifier; knowledge `the-auto-mode-classifier-refuses-guard-probes.md` covers its kind |
| 68 | post-merge | This sweep runs in the shipping session, against CLAUDE.md's rule | the operator's request in this session | no-op: the operator overrode the rule for this sweep |
| 69 | post-merge | `/after-task-kaizen` asked for an index line in `docs/dantotsus/README.md`, which has no index, and for an inventory link in a *Notable* section its own template does not have | this sweep; `kaizen-216` log line | fixed: both stale instructions are removed or renamed to *Inventory* |

## Counts

| Decision | Rows |
| --- | --- |
| dantotsu | 5 |
| knowledge | 3 |
| fixed | 10 |
| merge into another row | 2 |
| no-op, already covered or by design | 49 |

## The operator's decision on row 07

Where should mutation get a verdict on a large pull request? The CI job mutated every gated file the pull request changes, in one run, under a 20-minute limit. #216 had 101 such files and never got a verdict.

The options were a matrix of CI jobs with a fixed number of files each, Stryker's incremental mode, or no change. The matrix needs a script of ours to split the files, because Stryker does not shard. The operator chose the incremental mode, which Stryker provides and `full-suite.yml` already uses on `main`, with the job's limit raised from 20 to 60 minutes.

- `scripts/mutate-changed.sh` passes `--incremental` to every Stryker run, so a mutant whose source and tests did not move keeps its verdict.
- The `mutation` job in `ci.yml` keeps those files in the Actions cache, one entry per pull request, keyed on the toolchain as `full-suite.yml` keys its own.
- Stryker writes the file only when a run completes, so a first run that outlives 60 minutes still leaves nothing. Whether 101 files fit in 60 minutes is unknown: the job never completed on #216.
- Measured on this branch: 61 s for the first run, then 19 s with 25 of 30 mutant results reused.
