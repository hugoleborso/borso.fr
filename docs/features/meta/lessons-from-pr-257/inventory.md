# Friction inventory, PR #257 (lessons from PR #253)

Sources: the archived log `docs/features/meta/lessons-from-pr-253/kaizen.md`
(1 entry), two friction lines the operator pasted into this sweep's prompt,
the 2 commits of PR #257, its conversation (no comment, no review thread), its
18 check runs, main's workflow runs after the merge, `get_session` and
`list_events` on `session_01K69KnCC1GwhF77rMwHPkuZ`, a replay of the merge
hook on PR #257 and PR #248, and this sweep's own log.

Writers: the one archived line is from `main`, the sweep's only thread. No
subagent ran. The two pasted lines happened after the archive at 00:31:19, and
the swept session's `KAIZEN.md` was empty at 00:40:55 (transcript), so they
reached this sweep through the prompt alone.

No open `kaizen` pull request exists (`list_pull_requests state: open`, only
Dependabot's #248). PR #257 added no ADR.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | The kaizen prompt for #253 said merged while #253 was open with CI running. | archived `kaizen.md`, the one entry | no-op: #257 made `pull_request_read get` the skill's first call. This sweep made that call, `merged: true`. |
| 02 | pr-description | The operator answered the product call with "k,", and the session read it as "Keep it", the recommended option. | transcript 00:40:28 "k,", 00:40:31 "merge", reply 00:40:59 "I recorded your "k" as keeping the short-form spec" | no-op: "Keep it" was the only option starting with k, the operator said "merge" three seconds later, and the session stated its reading in the PR body and reply. |
| 03 | post-merge | #257 merged 16 seconds after #249, on a main its CI never saw, while `mergeable_state` read `unknown`. | `20eaa66` at 00:40:48, `e523fbe2` at 00:40:32; #257's CI started 00:32:19; transcript `get` at 00:40:39 returned `unknown`; both PRs edited `docs/knowledge/README.md` and `docs/quality/feature-cost.md` | dantotsu: `two-merges-sixteen-seconds-apart-one-untested-main` |
| 04 | post-merge | Main's `ci` on `e523fbe2` (#249) was cancelled by #257's push, so #249 alone never got a main verdict. | run 41748592331 `cancelled`; run 41748626420 on `20eaa66` `success` at 00:46:20 (measured) | merge into 03 |
| 05 | post-merge | The merge hook printed `unknown` for the deployed apps and `shared-deploy` on every hosted merge since PR #245, because `gh pr view` asks GraphQL and the proxy refuses it. | replay of the old hook on #257 and #248, both `unknown`; `gh pr view 257` prints `HTTP 403: GitHub GraphQL is not available`; `b507ea56` added the call | dantotsu: `the-merge-hook-asked-the-one-api-the-proxy-refuses` |
| 06 | post-merge | The #257 session computed the `shared-deploy` answer itself from the 10-file diff, because the hook gave none. | reply at 00:40:59 | merge into 05 |
| 07 | post-merge | The knowledge entry on hosted GitHub limits never said GraphQL is refused. | `grep -i graphql docs/knowledge` returned nothing | fixed: the entry names it and triggers on the 403 text. |
| 08 | post-merge | The two post-PR frictions were never written to `KAIZEN.md`; they reached the sweep only by being typed into the prompt. | transcript 00:40:55 `grep '^- \[' KAIZEN.md` empty; prompt | no-op: CLAUDE.md's route for lines after the archive is the prompt, and both lines arrived. |
| 09 | implementation | `list_events` on the swept session returned 245k characters, saved to a file nested under `ccr.data`, and the first parse printed nothing. | this sweep's log | no-op: the tool result names the slicing recipe; one retry. |
| 10 | post-merge | The sweep cost $3.09, a quarter of #253's sweep ($11.36). | `get_session` `usage.cost_usd` | no-op: recorded in `docs/quality/feature-cost.md`. |
