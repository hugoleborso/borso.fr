# Friction inventory of PR #261

[PR #261](https://github.com/hugoleborso/borso.fr/pull/261) shipped live
invalidation for pragma, DSQL conflict retries in the database client, and
fewer API requests. Sources read on 2026-11-05: the two archived friction
logs (`docs/features/pragma/live-invalidation/kaizen.md`, 16 lines, and
`docs/features/pragma/dsql-retry-and-request-load/kaizen.md`, 2 lines), the
two lines the operator pasted after the archive, the 18 commits, the 4
validation reports, and the 6 pull-request comments (all bot comments, no
review threads).

Writers: `main` 5 lines, `visual-validator` 4, `live-invalidation-fix` 2,
`technical-validator` 2, `live-invalidation` 2, `hook:no-broad-kill` 2,
`hook:commitlint` 2, `hook:pr-body` 1, and one unlabelled pasted line. Every
subagent logged under its own label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | validation | Server tests and `curl` probes passed while every browser write and the sign-in on the preview failed the CORS preflight for `X-Pragma-Client` | kaizen `main` 03:58; report `visual-validation-2026-11-04-0338.md` rows 01, 09; commit `c41412c` | dantotsu: the-header-curl-never-asked-permission-for |
| 02 | validation | The visual validator wrote that a merge would break prod sign-in. Prod is same-origin and sends no preflight | report `visual-validation-2026-11-04-0338.md` note 09; `.github/workflows/preview.yml:153` is the only `VITE_API_BASE` | merge into the-header-curl-never-asked-permission-for, and no-op beyond it: `a-validator-can-name-a-cause-it-never-probed.md` already covers an unprobed cause |
| 03 | conception | A write's scope missed queries keyed under another root and server-side aggregates (A13), and no test tied writes to reads (D30) | report `technical-validation-2026-11-04-0239.md` A13, D30; commit `e18059b` | dantotsu: the-score-that-changed-under-another-name |
| 04 | conception | The feature had no `plan.md`, so the spec's one-root-per-write rule met the query keys only in code | report `technical-validation-2026-11-04-0239.md` A01 | merge into the-score-that-changed-under-another-name |
| 05 | implementation | Cross-slice imports point both ways (a read that aggregates, a delete that cascades), so the dependency test needed a separate cascade table | kaizen `live-invalidation-fix` 03:18; `derived-read-roots.test.ts` `WRITES_INTO` | merge into the-score-that-changed-under-another-name |
| 06 | validation | A contact write refetched 11 queries in one tab, 5 answered 503 on the preview, because `members` derived from `me` | commit `8bb9975` | merge into the-score-that-changed-under-another-name |
| 07 | implementation | `fileURLToPath(new URL('..', import.meta.url))` throws under the core project's jsdom environment | kaizen `live-invalidation-fix` 03:18 | knowledge: import-meta-url-under-jsdom-is-not-a-file-url |
| 08 | validation | `agent-browser network route --body` answers without CORS headers, so a cross-origin mock fails as `MissingAllowOriginHeader` and reads as an app retry loop | kaizen `visual-validator` 04:15 | knowledge: agent-browser-cli-quirks (extended) |
| 09 | validation | Offline network emulation does not close an open WebSocket in Chromium, so it cannot simulate a phone losing its socket | kaizen `visual-validator` 04:15 | knowledge: agent-browser-cli-quirks (extended) |
| 10 | validation | The no-broad-kill hook told a subagent to use `TaskStop`, which subagents do not have | kaizen `visual-validator` 04:15 | fixed: this pull request, `pretool-no-broad-kill.sh` names the subagent case |
| 11 | implementation | The session reached for `pkill` or `killall` twice | kaizen `hook:no-broad-kill` 03:50, 04:14 | merge into row 10: the hook refused both, which is the gate working; the message is what row 10 fixes |
| 12 | validation | `vitest --changed` with the default reporter prints only totals, so the validator ran each round twice to see which files ran | kaizen `technical-validator` 02:48, 03:36 (both rounds) | fixed: this pull request, `technical-validator.md` adds `--reporter=verbose` to the `--changed` runs |
| 13 | implementation | The pragma core run was killed with exit 137 at the default worker count and the container restarted | kaizen `live-invalidation` 02:00 | no-op: not reproduced; the full core run on 2026-11-05 passed 3,783 tests in 171 s with a peak of 3.9 GB of 15 GB in use (measured). The cause on 2026-11-04 is unknown |
| 14 | implementation | The no-comments lint forbids the JSDoc line explaining why the realtime ticket signs a purpose prefix, so the reason lives in a test title | kaizen `live-invalidation` 02:00 | no-op: `docs/standards/00-principles.md` asks for exactly this, "write the test that states the behaviour" before any prose |
| 15 | implementation | commitlint refused two commits whose message was `tmp` | kaizen `hook:commitlint` 02:28 (twice) | no-op: the gate refused a placeholder message, as designed, and no `tmp` commit reached the branch |
| 16 | pr-description | The pull-request body hook refused a body carrying markup the server strips | pasted line `hook:pr-body` | no-op: the gate held, and `github-mcp-pr-body-sanitizer.md` names the surviving shapes |
| 17 | validation | The spec's no-socket-URL branch of the ticket endpoint is reachable in neither `pnpm dev` nor a preview | kaizen `visual-validator` 04:15; report row 21 | no-op: the client half passed with a routed answer (row 22) and the server half is a unit test (A17) |
| 18 | validation | Six visual rows were UNVERIFIABLE: 410 delivery, the `$disconnect` row, `$default` status, a failing send, the `all` branch, and the no-URL branch | report `visual-validation-2026-11-04-0400.md` | no-op: each is held by a unit test, as the pull request's Gap section says; a browser cannot reach API Gateway's internals |
| 19 | post-merge | Seeding the PR 261 preview replaced the cloned production credentials, so the operator could not sign in with their own password | pasted line; `a-pragma-preview-cannot-be-signed-into.md` | no-op: commit `a5fa722` in the same pull request corrected the entry, which already says to ask before seeding; the preview is torn down |
| 20 | post-merge | The knowledge entry said the clone that restores production credentials runs on every deploy; it runs on the first deploy and when a migration changes | pasted line; commit `a5fa722` | merge into row 19 |
| 21 | conception | `dsql-strong-consistency-is-per-connection` claims cross-connection stale reads; 0 of 180 reads were stale on the preview | kaizen `main` 01:43; commit `0eae13a` | no-op: commit `0eae13a` contested the entry with the measurement |
| 22 | conception | A dantotsu sentence (DML cannot meet OC001) was accepted without checking the AWS page and steered later code | dsql kaizen `main` 01:03; commit `c546bd0` corrects it | no-op: corrected in `c546bd0`; with row 21 it is the pattern in the pull request's Patterns section, and `a-validator-can-name-a-cause-it-never-probed.md` covers it |
| 23 | implementation | Sentry `search_traces` returned nothing for natural-language aggregate queries until fields and sort were explicit | dsql kaizen `main` 01:03 | no-op: no trigger can fire on an empty MCP answer, and no skill here calls `search_traces` (grep, measured) |
| 24 | implementation | The client's retry nested inside eleven per-repository retries, nine attempts per conflict, removed one commit later | commits `c546bd0`, `54a936f` | no-op: caught by the author before review, and the refactor names the dropped property |
| 25 | implementation | The 30 s setlist freshness was kept in `5cade2a` and removed in `1b6ba33` once invalidation existed | commits `5cade2a`, `1b6ba33` | no-op: a planned step between two features of one pull request, not a reversal |
| 26 | validation | Two mutants survived because `toHaveBeenCalledWith` reads `body: undefined` as absent | commit `4a12e46` | knowledge: how-a-mutation-survivor-hides (extended) |
| 27 | validation | Technical validation asked whether whole-cache invalidation on tab reopen re-creates the Lambda throttling the same pull request fixed | report `technical-validation-2026-11-04-0239.md` Notes | no-op: an operator question about spec behaviour 2, left in the report; the visual run measured only on-screen queries refetching (row 11) |
| 28 | deploy | Merging main into the branch conflicted on `VOCABULARY.md` and `docs/adr/README.md` | commit `852ed5a` | no-op: two append-only files edited by two pull requests, resolved in one commit |
| 29 | post-merge | ADR `2026-11-04T0227` and the amended ADR-2026-08-09T1654 | `git diff --name-only 06abedfd9^ 06abedfd9 -- docs/adr/` | no-op: both already read `accepted` in the file and the index |
| 30 | post-merge | Cost of the pull request | `get_session` on `session_01K69KnCef9VDkTpdGgT6TsD` | fixed: this pull request, row in `docs/quality/feature-cost.md` |

## Counts

30 rows: 2 dantotsu, 4 knowledge (1 new entry, 2 extended), 3 fixed, 6 merged, 15 no-op.
