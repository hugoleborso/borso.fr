# Friction inventory, PR #324

PR #324 put « Parler à Talos » on every screen of the Talos PWA, removed the Message screen, redrew the home-screen icons and dropped « Tu es Talos » from the prompts. It merged on 2026-11-13 as `02755aa1a`.

Sources read: the archived log `docs/features/talos/talk-to-talos/kaizen.md` (7 lines, all added by this merge, per `scripts/kaizen.sh sweep-input`), the four commits, the pull request's comments and review threads (none), its check runs (all green), the technical-validation report, and the open pull requests (no open `kaizen` sweep).

Writers of the 7 lines: `main` 2, hooks 3 (`no-prettier`, `no-broad-kill`, `api-validation`), `technical-validator` 2. No subagent other than the validator logged a line, and none was spawned for implementation (inferred from the commit trailers, which all name one session).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The Commons original of the Talos coin could not be fetched: Wikimedia answered 429. | `kaizen.md` line 16:47; the sweep measured 200 for `File:Example.jpg` and 429 for the coin on the API and the upload path | knowledge: wikimedia-rate-limits-the-session-egress |
| 02 | implementation | The 512 px icons stay upscaled from a 360 px source. | commit `7418183`; the operator-backlog row for #314 and this PR | merge into 01 (the backlog row stands, the source is still refused) |
| 03 | implementation | Prettier was run in a repository that formats with oxfmt. | `kaizen.md` line 16:48, `hook:no-prettier` | no-op: the hook refused it before any file was rewritten, which is the eradication of `prettier-ran-in-an-oxfmt-repository` working |
| 04 | implementation | `pkill` or `killall` was reached for on a shared machine. | `kaizen.md` line 16:51, `hook:no-broad-kill` | no-op: the hook refused it, and `screenshotting-talos-behind-its-passkey` already says to stop the servers by port |
| 05 | conception | A backlog row to delete the « Talos : message » routine was drafted before reading that decisions fire the same routine. | `kaizen.md` line 16:53; the merged backlog diff holds no such row (measured) | no-op: the same session read the code and dropped the row before commit; CLAUDE.md's *Verify before asserting* holds it |
| 06 | pr-description | A pull request changing the API was opened before a technical-validation report existed. | `kaizen.md` line 17:01, `hook:api-validation`; report `technical-validation-2026-11-13-1705.md`, PR opened 17:10 | no-op: the hook held the order, and the report came first |
| 07 | validation | Earlier reports grade the `plan absent` row PASS, UNVERIFIABLE or FAIL, so the validator's verdict depends on which report it copies. | `kaizen.md` line 17:06; `grep '^\| A00'` over every report: 12 UNVERIFIABLE, 2 PASS; `technical-validator.md` said "note it as a finding" in one place and UNVERIFIABLE in another | fixed: `technical-validator.md` now names the row, its grade (UNVERIFIABLE) and that it never blocks |
| 08 | validation | `blueprint-indexing.ts --check` exits 0 while `blueprint-subjects.json` lists files the branch deleted. | `kaizen.md` line 17:06; 16 stale entries on `main` after the merge, from #234, #292 and #324 (measured) | dantotsu: the-subject-baseline-that-forgot-nothing |
| 09 | plan | The feature shipped with a spec and no `plan.md`. | report row A00; PR body *Gap: no plan* | no-op: a short-form spec without a plan is valid input to the validator (`technical-validator.md`), and row 07 now grades it one way |
| 10 | post-PR | A fourth commit, after the pull request opened, removed « Tu es Talos » from the prompts. | commit `955db91` at 18:54, PR opened 17:10 | no-op: a product change, recorded in the spec as « owner's call, 2026-11-13 »; the commit adds the test *never tell Claude it is Talos* in `claude-code-address.core.test.ts` |
| 11 | validation | Talos has no preview, so the screen was checked on the local dev server only. | PR body *Notable* | no-op: Talos previews are off by design (CLAUDE.md) |
| 12 | implementation | The Claude iOS app drops a `claude.ai/code` link that carries `environment`. | `docs/knowledge/claude-code-links-open-in-the-app-on-a-phone.md`, updated in the merge | no-op: captured during the PR by that entry, whose triggers cover `apps/talos/site/src/**` |
| 13 | ci | No red run. | check runs on `955db91`: every job success or skipped | no-op: nothing failed |
| 14 | post-merge | The sweep's own dantotsu first claimed no other path-keyed baseline exists in `docs/standards/`, and `convention-baseline.json` does. | `ls docs/standards/*.json`; that file is keyed by rule and app, with no path (measured) | fixed: the claim was corrected before commit |

Counts: 1 dantotsu, 1 knowledge, 2 fixed, 1 merge, 9 no-op.
