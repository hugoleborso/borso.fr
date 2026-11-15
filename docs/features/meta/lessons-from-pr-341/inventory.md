# Friction inventory of PR #341

PR #341 was the sweep of PRs #331 to #337, run by `session_01K69KnF58cktiWBoteerJ69`.
It shipped the keyboard viewport rule for every app, the in-app placement check in
pragma, the manifest check on pull requests and an ADR. The sources were:

- `scripts/kaizen.sh sweep-input fd4332550`, which found 3 lines in
  `docs/features/meta/lessons-from-pr-337/kaizen.md`, two by `main` and one by a hook;
- 3 hook refusals logged after the archive, pasted in this sweep's prompt;
- the prompt's account of the merge, which is the operator's;
- the comments on #341, all from the preview bot, and no review thread;
- the files each kaizen merge of 2026-11-15 changed, compared with #341's;
- the open pull requests, of which none is a kaizen;
- `get_session` on the one session in the commits' trailers.

Two transcript pages of the session were read for the relayed clearance and did not
reach it, so that row rests on the prompt's account.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The session reached for `pkill` or `killall` on a shared machine | `kaizen.md` 06:06, `hook:no-broad-kill` | no-op: the hook refused it and names the narrow kill, as designed |
| 02 | pr-description | The sweep offered the operator a per-PR iPhone checklist and a WebKit run pragma has no suite for | `kaizen.md` 06:06, `main`; commit "the iPhone dantotsu ships a detection instead of a question" | fixed: `/after-task-kaizen` now rules out an option that hands the operator a task per pull request |
| 03 | implementation | The viewport check passed every page once oxfmt wrapped the meta tag, because its grep read one line | `kaizen.md` 06:15, `main` | no-op: fixed in #341, `scripts/check-viewport-follows-keyboard.sh` joins lines first; run here, it checked all 10 app pages, the same count `grep -l viewport` finds |
| 04 | post-merge | `merge-on-red` refused the merge while checks were not green | prompt, 06:35 | no-op: the hook did its job; the session waits for the check_suite event |
| 05 | post-merge | `merge-on-moved-base` refused twice, because main moved with files #341 also changed | prompt, 06:37 and 06:44 | merge into 06 |
| 06 | post-merge | Five kaizen merges each changed `docs/quality/feature-cost.md`, and three also changed the knowledge or ADR index, so #341 merged main in three times with a full CI run each | `git diff-tree` of `98834cadd`, `bb976ec33`, `ff3782826`, `4ef620ab0`, `cdc543725`, `1e2a1d524`, `8230bcebe` against `fd4332550` | no-op: already eradicated by #352, which moved cost rows into each sweep's folder and removed both hand-kept indexes. No shared file remains that every sweep must edit |
| 07 | post-merge | The operator asked for the merge several times, partly because the owning session refused a clearance another session relayed | prompt; `get_session` shows #341's session was started by `session_01K69KnFKamw16kPJs4YikHZ` | dantotsu: the-merge-clearance-that-travelled-as-a-peer-message |
| 08 | post-merge | #341 changed app code, so it could not use the standing kaizen merge and waited on the operator | `deploy-fanout` rule in CLAUDE.md; #341 touched every app's viewport meta and pragma | question to the operator, asked in this sweep's reply: it changes when he is asked for something |
| 09 | post-merge | ADR `2026-11-15T0620` shipped by #341 still read `proposed` | `git diff --name-only fd4332550^ fd4332550 -- docs/adr/` | fixed: stamped `accepted` |
| 10 | post-merge | ADR `2026-11-12T1838` (Node 24) shipped by #319 and still read `proposed` | `grep -l 'Status:\*\* proposed' docs/adr/*.md`; `f7af31767` | fixed: stamped `accepted`; the sweep of #319 missed step 1c |
| 11 | post-merge | The archive held 3 lines for a session that also hit 3 merge refusals after it | archive against prompt | no-op: the refusals were logged by the hooks and pasted, as the flow intends |
