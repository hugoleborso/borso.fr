# Friction inventory — PR #149

Every friction event from Hugo's first request (« the item I discuss should be the default prompt ») to the merge of PR #149, in the order it happened.

`KAIZEN.md` carried no entry. The work ran in a session started on the `talos` repository, with `borso.fr` attached later through `add_repo`, so this repository's SessionStart never ran and nothing reminded the session to log. Every row below comes from the transcript, the two commits and the CI runs. That gap is itself row 10.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The request asked for a prefilled prompt, and the code already built one: the real defect was that the prompt never reached Claude Code, which only Hugo could see. | transcript: « Le prompt arrive vide avec ma PWA » | merge into the-link-the-app-opened-without-its-prompt |
| 02 | conception | The link format had been written against one reader only, the Claude Code web quickstart, while on a phone the Claude app is the reader that opens it. | `apps/talos/CONTRAT.md` before 7921a44 cited only « Pre-fill sessions » | dantotsu: the-link-the-app-opened-without-its-prompt |
| 03 | implementation | The first fix guessed at the cause (« lost somewhere on iOS ») and shipped a clipboard fallback before the surface was known. Hugo had to name the surface: « ça ouvre pas claude on the web mais claude code app ». | commit:6f0a981, transcript | merge into the-link-the-app-opened-without-its-prompt |
| 04 | implementation | The Claude app reads only the `code/new` route with `q` and `repo`, documents no `environment` parameter, and grabs every `https://claude.ai/code/...` link as a universal link. | support.claude.com article 14898120, commit:4794511 | knowledge: claude-code-links-open-in-the-app-on-a-phone |
| 05 | validation | Nothing in this sandbox can open a link on a phone with the app installed, so the fix shipped verified by unit tests and documentation only. | PR #149 body, *Validation* | merge into claude-code-links-open-in-the-app-on-a-phone |
| 06 | implementation | The overdue counter opened the action sheet as a `todo` subject titled « En retard », which the new wording would have called « la tâche « En retard » ». | commit:6f0a981 (`todos` kind) | no-op: fixed inside PR #149 by its own subject kind |
| 07 | implementation | `vi.fn(async () => {})` in `App.test.tsx` failed `@typescript-eslint/no-empty-function`. | transcript, ESLint output | no-op: the rule fired as intended and the fix was one line |
| 08 | implementation | The pre-write blueprint hook did not run on the new `prompt-copy.hook.ts`, because the session carried the `talos` repository's settings, not this one's. | transcript: no blueprint context injected on Write | knowledge: borso-fr-attached-to-another-repositorys-session |
| 09 | implementation | `register_repo_root` promised this repository's CLAUDE.md on the next turn; it did not arrive in time, and the file was read by hand. | transcript | merge into borso-fr-attached-to-another-repositorys-session |
| 10 | implementation | `KAIZEN.md` stayed empty for the whole task: nothing in an attached repository's session creates it or reminds the agent. | `scripts/kaizen.sh show` printed the header only | merge into borso-fr-attached-to-another-repositorys-session |
| 11 | implementation | Dependencies were missing until `scripts/install-repo-deps.sh` was run by hand. | transcript: `node_modules` absent | merge into borso-fr-attached-to-another-repositorys-session |
| 12 | post-merge | A stop hook reported « no remote branch » after a successful push: the `--depth 1` clone fetched `main` only, so `git push -u` could not record an upstream. | transcript: `upstream branch ... not stored as a remote-tracking branch` | merge into borso-fr-attached-to-another-repositorys-session |
| 13 | implementation | A `git commit` piped into `tail` was refused by the `talos` repository's no-swallowed-push hook. | transcript | no-op: the hook did its job; the command was rerun unpiped |
| 14 | conception | Delegating the change to a separate Claude Code session failed three times on permission prompts before the work moved into this session through `add_repo`. | transcript | no-op: a `talos` operating choice, recorded in that repository's `preferences.md` and `talos-construire` skill |

## Decisions

| Decision | Rows |
| --- | --- |
| dantotsu | 1 (row 02, with 01 and 03 merged in) |
| knowledge | 2 (rows 04 and 08, with 05 and 09 to 12 merged in) |
| no-op | 4 |
