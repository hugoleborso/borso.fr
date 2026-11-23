# Friction inventory: PR #389, the Skull King score keeper

Shipping session `session_01K69KnD7qY66biYdG7XZVpc` read 321,864 used tokens at the merge, at or above 150,000, so this sweep ran in a new session (`session_01K69KnCVahV1rD2ZbKs3NqS`). Sources: the 63 lines `scripts/kaizen.sh sweep-input ba0557404` printed from `docs/features/skull-king/score-keeper/kaizen.md`, the operator messages from the transcript (rows OP), 22 commits, 7 bot comments and no review thread, and the six validation reports. No other kaizen pull request was open.

Writers in the log: `main` 15, hooks 17, `visual-validator` 10, `pirate-avatars` 3, `hold` 3, `site-agent` 3, `fix-round-1` 3, `steppers` 3, `api-agent` 2, `fix-visual` 2, `icons-reuse` 1, `vocab-agent` 1, `technical-validator` 1, `operator` 1.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | conception | Mockups carried too much text again; "less text, you always have this problem". | log 18:00 `main` | No measure of the words on a mockup screen. | none, the mockup step itself | no-op: `pretool-mockup-copy.sh` shipped in this PR counts visible words per screen, and PR #394 bounds a phone board to one screen. |
| 02 | conception | Offered a reduced "one phone, no sync" option while banana-rush holds the sync pattern; the operator called it lazy. | log 18:14 `main` | The option list was built before looking for the pattern in the repo. | CLAUDE.md *Reuse first* | no-op: CLAUDE.md already says "Reuse first. Look in this repo"; the session skipped it once, and the pull request copied banana-rush (Decisions table). |
| 03 | spec | Spec written without `/specification` and without the whole rulebook; ghost, Harry and Tigress rules surfaced only when the operator asked. | log 18:38 `main` | `/route` sizes work but nothing forces the spec skill on a new app. | `/route` tiering | fixed: ten operator messages (OP08 to OP31) were product rules a spec question would have drawn out, and PR #351 also drew mockups before any skill ran. The design-canvas hook now says to run `/specification` and ask its questions before the first variant when the feature has no spec (this PR). |
| 04 | implementation | Scaffolding the app from banana-rush was a manual tar, rename and strip. | log 18:11 `main` | No script or blueprint creates an app. | the new-app path in CLAUDE.md *Layout* | merge into 05 |
| 05 | implementation | The copied scaffold had no `pnpm-lock.yaml` importer, so every agent's gates failed until a non-frozen install. | log 18:17 `api-agent` | A copied `package.json` is unknown to the lockfile until `pnpm install` runs once. | rows 04, 06 share the cause: an app copied by hand | no-op: a new app happens a few times a year; `scripts/check-app-registration.sh` already names the registration steps, and a scaffolder is more code than the three frictions cost (guess). Rows 04 to 06 recorded so the next new app can weigh it. |
| 06 | implementation | Copied files kept banana-rush's `@Blueprint` declarations, which the index refused as duplicates. | log 18:33 `site-agent` | same as 05 | same as 05 | merge into 05 (the index refusal is the guard working) |
| 07 | implementation | A subagent ran a git command that writes the shared index, three times. | log 18:15, 18:18, 12:27 `hook:subagent-no-staging` | Agents reach for `git add` by habit. | none, the hook refused each | no-op: the hook refused all three; nothing reached the index. |
| 08 | implementation | The PostToolUse formatter rewrote a just-written file, so a later exact-text replace on the sent text silently did nothing. | log 18:33 `site-agent` | `posttool-format-write.sh` changed the file and said nothing. | `.claude/hooks/posttool-format-write.sh` | fixed: the hook now tells the agent when the formatter changed the file (this PR). |
| 09 | plan | The site was written against an `/api/accounts` contract the spec never spelled out. | log 18:33 `site-agent` | The spec template asked for "request/response shapes" in a comment nobody filled. | `.claude/skills/specification/template.md` | fixed: the template's types block now asks for the body of every route (this PR). |
| 10 | implementation | Shared domain types changed mid-task (`rascalBet`) before the message announcing them arrived. | log 18:44 `api-agent` | Two agents edited one shared type in parallel. | the plan named no owner of `domain/` | merge into 09 (a named contract up front is the fix) |
| 11 | implementation | `pkill` or `killall` reached for six times. | log 18:49, 20:25, 20:52, 21:07, 21:27, 12:36 `hook:no-broad-kill` | Validators started `vite preview` and authenticator processes with no stop by pid. | rows 26, 29 | merge into 21 and 25 (the processes were the CDP authenticator and the service-worker preview); the hook refused all six |
| 12 | implementation | A git push or commit had its errors sent to `/dev/null`, twice. | log 18:51, 20:27 `hook:no-swallowed-push` | Habit. | none | no-op: the hook refused both. |
| 13 | implementation | The glossary pointed eleven terms at one combined invariants section, caught only at pre-commit. | log 18:53 `vocab-agent` | `check-vocabulary-paths` runs at commit, not at write. | none, local | no-op: caught before any commit landed; a write-time copy of the check would duplicate the gate. |
| 14 | validation | A probe test's `console.log` showed only with `--reporter=verbose`. | log 19:20 `technical-validator` | Vitest's default reporter hides passing tests' output. | none, vendor behaviour | no-op: one probe rerun; Vitest documents it. |
| 15 | validation | `--` passed to a pnpm test script. | log 19:34 `hook:no-test-double-dash` | Habit. | none | no-op: the hook refused it. |
| 16 | validation | A refused chained Bash call also dropped the edit chained before it, and the refusal read like a test-runner hint. | log 19:46 `fix-round-1` | The harness refuses the whole call. | `.claude/hooks/kaizen-refusal.sh` | no-op: `kaizen-refusal.sh` prints "Nothing in this call ran" since PR #383 (commit `0729a0132`). |
| 17 | validation | Every back-e2e request prints a wide-event JSON line, burying a race test's failure. | log 19:46 `fix-round-1` | The logger writes in tests as in prod. | none, one agent once | no-op: one agent once, and grepping the run worked. |
| 18 | validation | Stryker's incremental file kept a Survived verdict for a mutant whose surrounding code changed. | log 19:57 `fix-round-1` | Incremental mode keys on the mutant's own line. | none, vendor behaviour | no-op: one occurrence, cleared by moving the test file. |
| 19 | validation | Opened the pull request changing a front end without a visual-validation report. | log 20:14 `hook:visual-validation` | Order of steps. | none | no-op: the hook refused it and the report followed. |
| 20 | validation | `agent-browser eval` shares one global scope, so a second top-level `const` failed and skipped taps. | log 20:25 `visual-validator` | Vendor behaviour. | none | no-op: `docs/knowledge/agent-browser-cli-quirks.md` already holds it, triggered on any `agent-browser` command. |
| 21 | validation | No WebAuthn virtual authenticator in agent-browser, so passkey screens needed a hand-written CDP script held open. Five lines from two agents. | log 20:25, 20:40, 20:54, 21:13, 21:28 | The only entry on passkeys said they "cannot be exercised in a browser here". | `docs/knowledge/driving-pragma-auth-from-a-validator.md`, stale | knowledge: `a-passkey-screen-through-a-cdp-virtual-authenticator`, and the stale section corrected. |
| 22 | validation | Playwright's `pages()[0]` was a hidden new-tab page, so the first passkey attempt failed silently. | log 21:13 `visual-validator` | same as 21 | same as 21 | merge into 21 |
| 23 | validation | The visual report found six spec breaks no test held (a missed toggle kept as a local draft, digits in join codes, chips under 44 px). | log 20:40 `fix-visual`; reports 2014, 2042, 2057 FAIL | No gate measures tap targets; the visual validator is the gate that caught them. | none, the gate worked | no-op: the validator caught all six before merge and they were fixed in `ec96610`, `b62cd73`, `dd27379`. |
| 24 | validation | agent-browser has no locale setting; `--lang=fr-FR` left `navigator.language` at en-US and broke the proxy. | log 20:54, 21:13 `visual-validator` | Vendor behaviour. | the app's locale detection | no-op: commit `76d24f0` removed browser detection, French is the start language, so no check needs a locale. |
| 25 | validation | The service worker never registers under the dev server, so checking it needed a scratch `vite build` and `vite preview`. | log 20:54, 21:28 `visual-validator` | The plugin disables the worker in dev. | none | no-op: once per app with a worker; the preview deploy serves it. |
| 26 | validation | `scripts/phone.sh swipe` on a horizontally scrolling grid cannot be read back after its relayout. | log 21:13 `visual-validator` | The 1280 px relayout clamps `scrollLeft`. | none | no-op: the grid stopped scrolling in `dd27379`, so the case is gone from this app. |
| 27 | implementation | Hand-drawn icon SVG paths instead of `lucide-react`; the operator found them ugly. | log 11:02 `main` | Nothing stops an agent writing path data. | the art step | dantotsu: `the-eye-scar-drawn-by-hand-twice` |
| 28 | implementation | Prettier run in an oxfmt repository, twice. | log 11:08, 12:39 `hook:no-prettier` | Habit. | none | no-op: the hook refused both. |
| 29 | implementation | A className override on a variant atom silently lost to the variant's own class, because clsx does not merge Tailwind conflicts. | log 11:15 `icons-reuse` | skull-king composes with bare clsx; the knowledge entry fires only on `class-name.utils.ts` and `*.variants.ts`, which skull-king never wrote. | `docs/knowledge/conflicting-tailwind-classes-are-not-merged.md` triggers | fixed: the entry now also fires on any `*Button*.tsx` atom (this PR). Commit `3d81013` replaced the overrides with tone and size props. |
| 30 | implementation | Player mark colours reused the made and missed hues. | log 12:30 `main` | No rule tied the palettes. | none | no-op: `palette.test.ts` from `35e4ef5` fails any player colour within 45 degrees of made or missed. |
| 31 | implementation | Made and missed were teal and orange, not green and red. | log 12:30 `main` | same as 30 | same as 30 | merge into 30 |
| 32 | conception | Avatars shipped as icons twice without asking what an avatar meant. | log 12:30 `main` | No step shows candidates before coding art. | same as 27 | merge into `the-eye-scar-drawn-by-hand-twice` |
| 33 | post-merge | Every operator message was a correction; corrections are not turned into checks fast enough. | log 12:30 `main` | The sweep read only logged lines. | `.claude/skills/after-task-kaizen/SKILL.md` | no-op: commit `2cf7c78` made the sweep read every operator message from the transcript. |
| 34 | post-merge | Operator: no hook to log his messages, use the session transcript. | log 12:33 `operator` | direction | none | no-op: followed in `2cf7c78`. |
| 35 | implementation | `git checkout -- .claude/settings.json` reached for. | log 12:33 `hook:no-discarding-reset` | Undoing a planted change. | none | no-op: the hook refused it. |
| 36 | implementation | Vitest's core project returns an empty string for a `?raw` CSS import. | log 12:39 `steppers` | Vitest does not run Vite's CSS pipeline in that project. | none, vendor | no-op: one agent, worked around with `node:fs`; the test that needed it exists and shows the pattern. |
| 37 | implementation | Reordering `PLAYER_COLORS` changed `selectFreeMark` answers, caught only by Stryker's dry run. | log 12:39 `steppers` | An earlier `test:core` run predated the edit. | none | no-op: the gate caught it before commit. |
| 38 | implementation | Subagents edited the main checkout, so the uncommitted-changes stop hook fired every turn and each notification cost a full turn. | log 12:49 `main` | Subagents ran without `isolation: "worktree"`. | the agent briefs | no-op: later agents (`hold`, `pirate-avatars`) ran in worktrees (log 13:15, 17:03). |
| 39 | implementation | The worktree started on `main` while the PR branch was checked out in the main checkout. | log 13:15 `hold` | A worktree cannot check out a branch the main checkout holds. | none, git rule | no-op: git forbids it by design; the agent reset to the head. |
| 40 | implementation | The worktree guard refused shell lines with `eval`, python heredocs and `cd` chains, so edits needed script files. Two agents. | log 13:15 `hold`, 17:03 `pirate-avatars` | The guard belongs to the harness's worktree mode, not this repository. | none in this repository | no-op: not ours to change; `docs/quality/working-conditions.md` check passes. |
| 41 | implementation | Tailwind's minifier turns `color-mix()` into an opaque fallback. | log 13:15 `hold` | Vendor behaviour. | none | no-op: one occurrence; `apps/skull-king/site/src/styles` holds no `color-mix()` after `5235d26` (measured with grep). |
| 42 | implementation | An unplaced bid showed a dash instead of 0. | log 15:54 `main`; commit `f6e2a7a` | The spec named no starting value for a stepper. | `.claude/skills/specification/template.md` | fixed: the template's types block asks what each entered value shows before anyone touches it (this PR). |
| 43 | implementation | The operator had to ask whether screenshots were posted after a visible change was pushed. | log 16:26 `main`; Screenshots comment folder `2026-11-23-1610` | Later pushes refresh the comment only from folders already uploaded. | `.claude/hooks/stop-screens-shown-not-described.py` | dantotsu: `a-screen-pushed-without-its-picture` |
| 44 | implementation | Text replies to every bot PR notification buried the open avatar question. | log 16:27 `main` | CLAUDE.md said what to act on, not what to write when nothing needs action. | CLAUDE.md *Commits, pull requests, merges* | fixed: CLAUDE.md now says a notification that needs no action gets no reply text (this PR). A hook cannot unsay a reply. |
| 45 | implementation | Fast taps in the pirate sheet built each write from a stale view, so a later tap undid an earlier one. | log 17:03 `pirate-avatars` | A whole-object write from the server view. | none | no-op: fixed in `11a3cc4` with a local draft; one screen. |
| 46 | implementation | The brief asked for a jsonb column, but DSQL has no jsonb. | log 17:03 `pirate-avatars` | The brief was written from Postgres habit. | `docs/knowledge/dsql-postgres-compat-gaps.md` | no-op: `scripts/check-migration-sql-dsql-compat.sh` refuses jsonb in a migration; the agent caught it. |
| 47 | implementation | The hand-drawn eye scar rejected as ugly a second time. | log 17:41 `main`; commits `367f66f`, `1bea71a` | same as 27 | same as 27 | merge into `the-eye-scar-drawn-by-hand-twice` |
| 48 | post-merge | Operator-approved rule: never hand-draw an illustration; search free-licensed assets, composite candidates side by side, let the operator pick. Encode it as structure. | log 19:06 `main` | same as 27 | same as 27 | merge into `the-eye-scar-drawn-by-hand-twice`: `pretool-no-hand-drawn-art.sh` refuses unsourced path data with the procedure. |
| 49 | post-merge | The kaizen hand-off prompt restated the skill's own step on operator messages and listed lessons; the operator answered it belongs in the skill. | this session's operator message; hand-off prompt | `/open-pr` *After the merge* listed what the prompt names but not that it names nothing else; CLAUDE.md held a third copy. | `.claude/skills/open-pr/SKILL.md`, CLAUDE.md | fixed: *After the merge* says the prompt names nothing else, and CLAUDE.md points to it instead of repeating it (this PR). |
| 50 | post-merge | The merged ADR was still `proposed`. | `docs/adr/2026-11-23T1659-skull-king-pirate-avatars.md` | Step 1c of this skill. | none | fixed: stamped `accepted` (this PR). |
| 51 | post-merge | The feature cost $229.89, above the $150 target, at 321,864 tokens of context. | `cost.md` | Four visual rounds and a day of art rework (rows 23, 27 to 48). | rows 27, 43 | no-op: measured in `cost.md`; the art rework is what row 27's hook removes. |
| 52 | post-merge | The screens-shown stop hook blocked this sweep's turn for writing "side by side" about the art-picking procedure. | this session's stop-hook feedback | "side by side" names a procedure as often as a comparison. | `.claude/hooks/stop-screens-shown-not-described.py` | fixed: the phrase leaves the claim pattern; PR #249's report is still caught by "by eye" and "pixel channel" (this PR). |
| 53 | post-merge | `operator-messages.ts` crashed on spilled pages (an envelope line, or text blocks), reported skill bodies, compaction summaries and subagent image notes as operator messages, and missed every answer worded "Your questions have been answered". | log 19:23 to 19:33 `transcript-389`, four lines; 4 answers it now finds that the agent read by eye | The extractor shipped in `2cf7c78` was tested on hand-made events only. | `scripts/kaizen/operator-messages.core.ts` | fixed: it drops `isSynthetic` events, accepts both answer wordings and reads all three saved shapes, with tests (this PR). |
| 54 | post-merge | Reading the transcript took one agent 229 calls and 330,744 tokens, because pages under about 50k characters land inline. | agent usage at hand-back | `list_events` has no size bound but `limit`. | `docs/knowledge/reading-another-sessions-transcript-with-list-events.md` | no-op: the entry already says so; the remedy is the harness's. |

## Operator messages

Read from `session_01K69KnD7qY66biYdG7XZVpc` with `list_events`, `kinds: ["user"]`, to the session start. Times are UTC. Kind: R a request the first brief could have carried, C a correction of something shipped, Q a question the session should have asked first, D direction with no lesson.

| # | When | Message (translated) | Kind | Decision |
| --- | --- | --- | --- | --- |
| OP01 | 11-22 17:55 | Create skull-king.borso.fr to score Skull King; have me validate mockups; least typing. | D | no-op: the brief. |
| OP02 | 18:00 | Less text in the interface, you still have the problem; fetch the official images; propose player icons. | C | merge into 01 and `the-eye-scar-drawn-by-hand-twice` |
| OP03 | 18:00 | Look at banana-rush for sync, don't be lazy. | C | merge into 02 |
| OP04 | 18:08 | You didn't follow the feature flow? Find the cards in better quality. | C | merge into 03 and `the-eye-scar-drawn-by-hand-twice` |
| OP05 | 18:17 | We don't need the non-special cards; agents can fetch cards in a second PR. | D | no-op: scope direction. |
| OP06 | 18:17 | (answer) the better-quality cards question. | D | no-op: answer. |
| OP07 | 18:19 | The 14s, yes, later at worst. | D | no-op: scope direction. |
| OP08 | 18:25 | The counter needs a built-in trick checker and a Kraken flag. | Q | merge into 03 |
| OP09 | 18:26 | Accounts with a passkey to see your games, or join as a guest. | Q | merge into 03 |
| OP10 | 18:26 | No, the checker must block. | C | merge into 03 |
| OP11 | 18:35 | Did you write a spec? You asked me no questions. Did you read all the rules? | C | merge into 03 |
| OP12 | 18:37 | (answer) a two-player rule question. | D | no-op: answer. |
| OP13 | 18:39 | We do have to handle the pirates' powers. | Q | merge into 03 |
| OP14 | 18:48 | Installable as a PWA, of course. | R | merge into 03 |
| OP15 | 18:50 | We can do much better on the logo, launch a subagent. | C | merge into `the-eye-scar-drawn-by-hand-twice` |
| OP16 | 19:09 | (answer) the logo choice. | D | no-op: answer. |
| OP17 | 11-23 11:00 | We prefer a + / − button to bet amounts. | C | merge into 03 |
| OP18 | 11:01 | Use known icons, not what you drew, which is ugly; your components lack reuse. | C | merge into `the-eye-scar-drawn-by-hand-twice` |
| OP19 | 11:02 | We want to see first names in the app too. | C | merge into 03 |
| OP20 | 11:58 | Put the screenshots back. | C | merge into `a-screen-pushed-without-its-picture` |
| OP21 | 12:25 | More than one coloured 14 can fall in a trick. | C | merge into 03 (rulebook read in part) |
| OP22 | 12:26 | Colours and textures a bit more Skull King, without being cheesy. | C | no-op: taste direction, shipped in `5235d26`. |
| OP23 | 12:29 | (answer) direction C, "but less hand-made by you in SVG. Find assets". | C | merge into `the-eye-scar-drawn-by-hand-twice` |
| OP24 | 12:30 | Icon colours not the win and loss colours; greener green, redder red; avatars, not icons; each message is a kaizen source. | C | merge into 30 and 33 |
| OP25 | 12:32 | (answer) pirate avatar, not a priority. | D | no-op: answer. |
| OP26 | 12:32 | The kaizen tooling must read all my messages. | C | merge into 33 |
| OP27 | 12:32 | No hook to log my messages, use the transcript. | D | merge into 34 |
| OP28 | 12:49 | You spend a huge amount of tokens on the uncommitted-content checks. | C | merge into 38 |
| OP29 | 13:10 | screenshots please | C | merge into `a-screen-pushed-without-its-picture` |
| OP30 | 15:31 | screenshots please | C | merge into `a-screen-pushed-without-its-picture` |
| OP31 | 15:31 | French by default please. | Q | merge into 03 |
| OP32 | 15:53 | The default bid is 0, not a dash. Avatars? Screenshots? | C | merge into 42 and `a-screen-pushed-without-its-picture` |
| OP33 | 16:25 | Did you post the screenshots in the PR???? | C | merge into `a-screen-pushed-without-its-picture` |
| OP34 | 16:27 | I miss your avatar questions because you reply to notifications; write nothing after notifications. | C | merge into 44 |
| OP35 | 16:28 | (answer) a customisable pirate, faces, hats, hair, accessories. | D | no-op: answer. |
| OP36 | 16:31 | (answer) this style, plus tricorne, scars and accessories. | D | no-op: answer. |
| OP37 | 16:31 | Isn't there a kit with more pirate choices? | Q | merge into `the-eye-scar-drawn-by-hand-twice` (search first) |
| OP38 | 16:32 | (answer) the free-kit question. | D | no-op: answer. |
| OP39 | 17:12 | Perfect except the eye scars. | C | merge into `the-eye-scar-drawn-by-hand-twice` |
| OP40 | 17:41 | Super ugly; find scar SVGs online; you need a drawing skill. | C | merge into `the-eye-scar-drawn-by-hand-twice` |
| OP41 | 17:48 | (answer) the scar choice; row 2 must go under the hair. | C | no-op: layering fixed in `1bea71a`. |
| OP42 | 18:02 | Under the eye too. | C | no-op: fixed in `49d0e5a`. |
| OP43 | 19:05 | Yes, add the rule to the kaizen. | D | merge into 48 |
| OP44 | 19:05 | Merge. | D | no-op: the merge. |
| OP45 | 19:21 | (answer) run the kaizen in a new session. | D | no-op: answer. |
| OP46 | 19:21 | Dispatch shared-deploy yourself. | C | question to the operator in this PR: CLAUDE.md tells a session to ask him to dispatch it. |
