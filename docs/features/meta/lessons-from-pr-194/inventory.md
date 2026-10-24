# Friction inventory — PR #194

Every friction event from Hugo's report (« la redirection vers Claude Code ouvre juste l'app ») to the merge of PR #194, in the order it happened.

`KAIZEN.md` carried no entry. The session ran none of this repository's Claude Code hooks, so nothing reminded it to log (row 03), and every row below comes from the transcript, the commit and the CI runs.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The documented `https://claude.ai/code/new?…` link, unchanged since PR #149, opened the Claude app without its prompt from the iOS home-screen app. | transcript: « elle ouvre juste l'app »; support article 14898120 read on 2026-10-24 still documents the https form | fixed: 6de3d18 (`claude://` from the home-screen app, knowledge entry extended in PR #194) |
| 02 | validation | The fix shipped without a tap on a phone, for the second time on this link after PR #149. | PR #194 body, *Validation* | no-op: `claude-code-links-open-in-the-app-on-a-phone.md` already says a hosted session cannot tap a link; only Hugo can confirm, and he was asked to |
| 03 | implementation | No hook of `.claude/settings.json` ran: the session started in `/home/user`, the parent of the `borso.fr` and `talos` clones. | transcript: no hook output; `CLAUDE_PROJECT_DIR` empty; `knowledge-triggers.sh` run by hand prints the `pgrep` entry | dantotsu: the-hooks-that-never-loaded |
| 04 | implementation | The talos SessionStart did not run either, so `.contexte/session.md` never existed and talos's « première action » was silently impossible. | `ls /home/user/talos/.contexte`: absent | merge into the-hooks-that-never-loaded (talos side surfaced to Hugo, not changed: its rules require his decision) |
| 05 | implementation | The dark-mode screenshot landed on `/login`: a second browser context after the passkey existed, the trap `screenshotting-talos-behind-its-passkey.md` names. | transcript: `dark http://localhost:5180/login` | merge into the-hooks-that-never-loaded (the entry's trigger matched the command; the hook was off) |
| 06 | implementation | `pgrep -f "concurrently…"` in a kill loop matched the session's own shell and killed it (exit 144). | transcript: `Exit code 144` | merge into the-hooks-that-never-loaded (`pgrep-f-matches-its-own-wait-loop.md` would have fired) |
| 07 | implementation | `KAIZEN.md` stayed empty for the whole task. | `scripts/kaizen.sh show`: header only | merge into the-hooks-that-never-loaded (`--acknowledge` now runs the install that creates it and prints the reminder) |
| 08 | implementation | `scripts/browser.sh open` and `snapshot` printed nothing; the session fell back to a hand-written Playwright script. | transcript; rerun: exit 2, no message | dantotsu: the-browser-moved-and-the-wrapper-died-silently |
| 09 | implementation | `scripts/argent.sh` globbed the same versioned Chromium path. | `grep chrome-linux scripts/` | merge into the-browser-moved-and-the-wrapper-died-silently |
| 10 | implementation | `vitest run` from `apps/talos/site` started the back-e2e project and failed on `DATABASE_URL`; `--project site` does not exist. | transcript | no-op: the error names the command to run, and `--project core` is the selection CLAUDE.md's pre-push section describes |
| 11 | implementation | `border-white/25` rendered as a dark outline: talos's `--color-*: initial` removes the default palette, and Tailwind generates nothing for an unknown colour. | screenshot, transcript | knowledge: tailwind-v4-theme-and-preflight-traps (extended). Only talos resets the palette and the tree has no other misuse, so a gate would guard one file |
| 12 | implementation | Files were written through Bash heredocs rather than Write, which the pre-write blueprint context does not see. | transcript | no-op: `knowledge-triggers.sh` already matches Bash commands against `paths`, and the pre-commit blueprint check refuses a file without its marker |
| 13 | post-merge | The PR subscription was announced twice. | notifications 1 and 2 | no-op: a duplicate harness event, skipped |

## Decisions

| Decision | Rows |
| --- | --- |
| dantotsu | 2 (rows 03 and 08, with 04 to 07 and 09 merged in) |
| knowledge | 1 (row 11) |
| fixed | 1 (row 01) |
| no-op | 4 |
