# Friction inventory, PR #171 and PR #174

PR #171 gave talos its red-figure art direction, explored with the impeccable skill; PR #174 vendored that skill and swapped the display face. One session ran both, with three mock-up agents. Primary input: the seven lines of the friction log, archived in [`../../talos/greek-engraving-art-direction/kaizen.md`](../../talos/greek-engraving-art-direction/kaizen.md), then the transcript, the commits and the pre-push logs.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The `PostToolUse` formatter rewrote mock-up HTML in the scratchpad, outside the repository, tripling files past their size budget. Two of three agents logged it independently. | log: `da-planche` 00:47, `da-bronze` 00:50; agent reports | dantotsu: the-formatter-reached-outside-the-repository |
| 02 | implementation | One agent wrote a build script to compact its own file again after the formatter grew it. | transcript: `bronze/build.py` | merge into the-formatter-reached-outside-the-repository |
| 03 | implementation | An inline custom property on a parent did not reach a child that redefines the same property. | log: `da-bronze` 00:50 | no-op: CSS cascade working as specified, inside a throwaway mock-up |
| 04 | implementation | `git commit` and then `git push` piped into `tail`; the guard refused both. | log: `hook:no-swallowed-push` 00:43, 00:44 | no-op: the guard refused and named the fix; the second was a different command shape |
| 05 | validation | Reached for `pkill` to stop the dev servers; the guard refused. | log: `hook:no-broad-kill` 01:01 | no-op: guard worked; the port-based kill it suggests is now in the screenshot knowledge entry |
| 06 | validation | The sign-in button's label was invisible: `twMerge` read `text-body` as a colour and dropped `text-on-bronze`. | log: `main` 01:03; commit `fix(talos)` in #171 | dantotsu: the-merge-that-read-a-font-size-as-a-colour |
| 07 | implementation | The palette script failed because the forced dark block lacked `--color-scrim`: the dark palette was written twice and had drifted. | transcript: AssertionError on `scrim` | dantotsu: the-dark-theme-written-twice-drifted |
| 08 | implementation | The same script then inserted tokens into the `color-scheme`-only dark block, which had to be cleaned by hand. | transcript: second cleanup pass | merge into the-dark-theme-written-twice-drifted |
| 09 | validation | Every screenshot of the second run was the login screen: the local database kept the first run's passkey, and a new context's virtual authenticator had none. | transcript: `row-light.png` all login | knowledge: screenshotting-talos-behind-its-passkey |
| 10 | validation | Screens behind a passkey needed a CDP virtual authenticator and fictional content to capture at all. | transcript: `shoot.mjs` | merge into screenshotting-talos-behind-its-passkey |
| 11 | conception | impeccable's decision page is served on localhost, which an operator on a hosted session cannot open; directions were shown as an Artifact instead. | transcript: concept-seed PRESENTATION block | fixed: line in `.claude/skills/impeccable/PROVENANCE.md` |
| 12 | validation | impeccable's finish reviewer and documenter agents were not available, so their passes ran in the main thread. | transcript | fixed: #174 vendors the four agents |
| 13 | implementation | `.impeccable/questions/` in `.gitignore` did not match the nested folder; the stop hook caught the untracked file. | commit amend in #171 | no-op: gitignore anchoring rule, caught within minutes and fixed with `**/` |
| 14 | implementation | Vendoring impeccable failed the commit four times, once per gate that reads `.claude/`. | transcript: ESLint, Prettier, two instruction checks | knowledge: vendoring-a-third-party-skill |
| 15 | implementation | The force push after resetting the merged branch onto main gated 774 files, four apps of tests and six mutation suites, and outlived the command timeout. | `push3.log` | dantotsu: a-force-push-re-gated-everything-main-had-merged |
| 16 | implementation | After the reset, the branch had lost the merged `.gitignore` lines and the untracked `.impeccable/` came back. | stop hook message | merge into a-force-push-re-gated-everything-main-had-merged (reset taken before fetching the merge) |
| 17 | post-merge | The owner disliked the Greek display face and asked for something more professional. | user message | no-op: recorded in `apps/talos/DESIGN.md` Type; impeccable's operate mode already says the world lends type only where it serves the task |
| 18 | conception | The direction was chosen without the owner, who was asleep. | user message "Enchaine tout jusqu'à la PR" | no-op: asked for in words; the mock-ups stayed published for review |
| 19 | validation | The bootstrap input on the login screen rendered grey in headless Chromium. | `login-light.png` | no-op: the same atom renders correctly on the Todo screen; cause not established, and no screen in use shows it |
| 20 | pr-description | A notable fact exceeded the 100-character budget. | `check-pr-body.ts` output | no-op: the checker refused it as designed |
| 21 | validation | A poll loop with `sleep` printed the knowledge entry on compressed sleep. | hook context | no-op: already covered by `sleep-is-compressed-in-the-hosted-sandbox` |
| 22 | post-merge | The app icons still carry the previous bronze mark. | `apps/talos/site/public/icons/` | no-op: a product decision surfaced to the owner, recorded under *Not done yet* in `DESIGN.md` |
| 23 | post-merge | The knowledge graph keeps its force layout; the transit-map redraw from the mock-ups was not built. | `DESIGN.md` | no-op: scope the owner decides, recorded in `DESIGN.md` |
