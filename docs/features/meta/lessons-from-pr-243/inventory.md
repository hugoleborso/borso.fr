# Friction inventory for PR #243

PR #243 gave each Pragma push notification its own title, because iOS already
prints "from pragma" under a web app's title. The sweep ran in the session that
shipped it, at the operator's request ("Effectuez cette tâche ici").

Sources: the archived log `docs/features/pragma/notification-title/kaizen.md`
(four lines, all written as `main`, with no subagent), the three lines pasted
into the kaizen prompt, the PR's single bot comment, its CI run (ten checks,
all green the first time), and this session's transcript.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The fixed title collided with the "from pragma" line iOS adds, so the operator saw the app name twice | transcript: operator screenshot; commit `36d7202a` | fixed: `36d7202a` (in PR #243) |
| 02 | implementation | Adding titles pushed `sw.js` to 331 lines, over the 300-line cap, and no doc said how the worker may grow | kaizen.md line 4; oxlint `max-lines` | knowledge: the-service-worker-grows-by-importscripts |
| 03 | implementation | `pnpm run lint` failed on macOS because `lint-workspace.sh` used GNU-only `realpath --relative-to` | kaizen.md line 2; commit `0a776bc5` | fixed: `0a776bc5` (in PR #243) |
| 04 | implementation | The rtk hook rewrote `pnpm run lint` to `rtk lint`, an ESLint 8 call that found no config | kaizen.md line 3; `rtk rewrite "pnpm run lint"` prints `rtk lint` with exit 3 | fixed: rtk removed from the repository, at the operator's call; it had needed four carve-outs in its hook and eleven corpus entries since 2026-05-01 (this PR) |
| 05 | implementation | `no-swallowed-push` refused `git push` piped into `tail`, twice | kaizen.md line 1 (hook-logged); transcript | no-op: the hook refused as designed and its message gave the bare command that worked next. It fired a third time in this sweep, on `git commit` piped into `tail` (`kaizen.md` of this folder) |
| 06 | implementation | Another local session switched the shared main folder to its branch, and this session's three commits landed there | prompt line 2; peer session message; reflog `eb3bf13c` then `9d35fcac` | dantotsu: the-pull-request-hooks-read-the-checkout |
| 07 | pr-description | `pretool-gh-pr-create.sh` refused a `--head` branch carrying the archive, because it diffed the main folder's HEAD | prompt line 1; transcript | merge into the-pull-request-hooks-read-the-checkout |
| 08 | post-merge | `merge-deploys-prod` printed "deploys: none" for a merge that deployed pragma | prompt line 3; transcript | merge into the-pull-request-hooks-read-the-checkout |
| 09 | pr-description | `pretool-gh-pr-create.sh` refused a `--body-file` written in the same command, saying only "missing path" | transcript | fixed: the refusal now says to write the file in an earlier call (this PR) |
| 10 | pr-description | The same hook refused `--body-file $S/body.md`, because it reads the path before the shell expands it | transcript | no-op: that refusal already names the cause and the fix |
| 11 | conception | The operator asked what `docs/standards/enforcement-ledger.md` was: a generated report left untracked in the main folder by unmerged work in another worktree | transcript; `git status` | fixed: `.gitignore` lists it beside the other generated standards reports (this PR) |
| 12 | post-merge | Auto-merge failed with "Auto merge is not allowed for this repository" | transcript | no-op: the merge is the prod gate by design (CLAUDE.md *Hard rules*), so the session waited for checks and merged on the operator's instruction |
| 13 | implementation | `npx vitest run src/sw` from `site/` and `npx tsc -p site` ran nothing useful, because the scripts live in `apps/pragma/package.json` | transcript | no-op: the package scripts were there to read, and reading them first worked |
| 14 | post-merge | The cost row cannot be measured: the commits carry no `Claude-Session` trailer and `get_session` on a local Desktop session returns no usage | `get_session self` | no-op: no source in reach holds the figure, so `feature-cost.md` records it as unknown with this reason |
| 15 | post-merge | The kaizen ran in the session that shipped the PR, against the skill's rule | operator: "Effectuez cette tâche ici" | no-op: the operator's explicit call; the inventory says so above |
| 16 | implementation | `no-discarding-reset` refused `git restore` of one mangled JSON file during this sweep | transcript | no-op: the file did hold uncommitted work, which the refusal protected; it was rewritten from `git show HEAD:` |
| 17 | post-merge | The sweep's own friction lines went to the main folder's `KAIZEN.md`, which another session had re-initialised under its own id | `docs/features/meta/lessons-from-pr-243/kaizen.md` | merge into the-pull-request-hooks-read-the-checkout: the same shared folder, and a session in its own worktree keeps its own log |
