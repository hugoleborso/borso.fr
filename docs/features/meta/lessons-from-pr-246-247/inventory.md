# Friction inventory for PRs #246 and #247

[PR #246](https://github.com/hugoleborso/borso.fr/pull/246) (`df244dda`)
made pragma's `more` menu close on a tap on its shadow.
[PR #247](https://github.com/hugoleborso/borso.fr/pull/247) (`e4c42859`)
kept a saved setlist order and moved offline reads to the query cache. One
session shipped both. Sources: the archived log
`docs/features/pragma/setlist-order-survives/kaizen.md` (7 lines), 3 lines
the operator pasted from after the archive, the 5 and 14 squashed commits,
the 2 technical validation reports, and the bot comments. Neither PR had a
review thread.

Writers in the log: `main` 4 (2 archived, 2 pasted), `implement` 2,
`technical-validator` 1, `hook:no-swallowed-push` 2, `hook:no-broad-kill` 1.
Agents logged under their labels.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The first menu fix hand-wrote outside tap and Escape with a backdrop instead of the platform's popover or the app's own `Sheet`, and the operator had to ask why | pasted line `main`; commit `b191d5f8`, then `0312c175` | dantotsu: `the-menu-written-three-times` |
| 02 | implementation | The popover version let the closing tap open the song sheet under it and did not dim the page; the operator wanted the sheet's behaviour | commits `0312c175`, `63a2a1f5`; PR #246 body | merge into 01 |
| 03 | implementation | The hand-written backdrop, `<div aria-hidden onClick>`, passed every lint rule because jsx-a11y skips hidden elements | oxlint on a scratch copy this session, exit 1 on `atomic-design-composition` only | merge into 01: the rule extension is its eradication |
| 04 | post-merge | pragma has no component library, so each primitive is hand-written and its platform edge cases rediscovered; the operator asks for an easy-to-use one | pasted line `main`; 4 dantotsus on primitives (`grep` of `docs/dantotsus/`) | fixed: ADR `202611031438` proposes React Aria Components after measuring 4 libraries; awaits the operator |
| 05 | implementation | The main session could not run the full pragma app and checked the menu on a copied DOM | archive 07:39 `main` | merge into 06 |
| 06 | implementation | `pnpm dev` does run the full app here; the session assumed it could not until the operator asked, and the operator wants the full app runnable | archive 07:40 `main`; this session ran `pnpm dev`, signed in as `hugo` with `pragma-preview`, HTTP 200 | fixed: CLAUDE.md *Checking a screen* says `pnpm dev` runs site, API and a seeded Postgres, and to reproduce there |
| 07 | implementation | The session reached for `pkill` or `killall` and the hook refused it | pasted line `hook:no-broad-kill`; 17 of 56 archived logs carry this refusal (measured) | fixed: the refusal now names `TaskStop`, which freed pragma's ports 5174 and 3001 and left no child (measured) |
| 08 | implementation | `git push` or `git commit` piped into another command, twice; this sweep did it once too | archive 07:04 and 07:27 `hook:no-swallowed-push`; this session's log | no-op: refused before anything ran; the message names the fix, and PR #235 and #238's sweeps found the same one-call cost |
| 09 | plan | The plan named `ensureQueryData` and `prefetchQuery`, deprecated in TanStack Query 5.102.8 | archive 07:20 `implement`; the `@deprecated` tags read this session | merge into 10 |
| 10 | plan | `PersistQueryClientProvider` awaits `onSuccess` before it stops restoring, so the planned prefetch would block the first screen | archive 07:20 `implement`; provider source read this session | knowledge: `persist-query-client-provider-awaits-on-success` |
| 11 | validation | The fix-sized spec had no Q.O.D., Use cases, Test strategy or Files to change, and the validator built categories A and D from Behaviour | archive 07:31 `technical-validator`; 6 reports since 2026-09 note it (measured) | fixed: `technical-validator.md` maps a fix-sized spec's sections onto A and D |
| 12 | validation | Round 1 FAIL on E02, a drag on a restored order before the refetch | `technical-validation-2026-11-03-0725.md` | no-op: the validator caught it and round 2 passed, as designed |
| 13 | implementation | B15 was dismissed on a false claim (a pure module cannot import the API client type), then fixed | commits "let a setlist be reordered…" and "derive the offline manifest type…" in `e4c42859` | no-op: caught before merge; CLAUDE.md *Verify before asserting* and `a-validator-can-name-a-cause-it-never-probed.md` cover it |
| 14 | validation | B12 dismissed, the order page styles two paragraphs inline | `technical-validation-2026-11-03-0810.md` | no-op: a reasoned dismissal |
| 15 | ci | Mutation gate: dropping `?.` in `closeOnBackdropTap` survived, no test made React's null detach call | commit `96c72318` | fixed: the `ref-callback-browser-api` blueprint says its test makes the null call |
| 16 | ci | Mutation gate: removing `.trim()` in the dantotsu heading reader survived | last commit of `e4c42859` | no-op: CI caught it, one test added; `writing-a-small-function-the-hundred-percent-gates-accept.md` covers it |
| 17 | pr-description | #247 shipped two sessions' work: the earlier session's dantotsu skill rewrite and connector rule rode with the fix | PR #247 *Notable*; 8 commits from `session_01K69KnBD6VQ779wocFdaa8R` | no-op: the operator chose to ship them together; the body says so |
| 18 | pr-description | #247's ADR link points at the head branch, which breaks when the branch is deleted | PR #247 body | no-op: the branch still exists; the ADR is reachable on `main` and indexed in `docs/adr/README.md` |
| 19 | post-merge | ADR `202611011313` was still `proposed` after the merge | `docs/adr/README.md` | fixed: stamped `accepted` |
| 20 | post-merge | `get_session` does not find `session_01K69KnBD6VQ779wocFdaa8R`, so #247's cost is partial | this session | no-op: the cost row says so |
| 21 | pr-description | The kaizen's ADR picked its own criteria, after the options; the operator named the two that mattered, changes to the app and coverage | operator reply on PR #249 | dantotsu: `an-adr-that-picked-its-own-criteria` |
| 22 | pr-description | The ADR scored four libraries on two primitives and showed no renders | operator reply on PR #249 | merge into 21: the gallery and the rewritten ADR answer it |
| 23 | post-merge | `POST /api/uploads/sign` returns 500 under `pnpm dev`, because no bucket runs locally | `pragma-baseline` agent; `UPLOADS_BUCKET not set` in `uploads.adapter.ts` | fixed: CLAUDE.md says uploads need a preview |

## Counts

23 rows: 2 dantotsus, 1 knowledge, 7 fixed, 5 merged into another row,
8 no-op.
