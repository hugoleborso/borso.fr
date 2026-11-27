# Friction inventory, PR #418

PR #418 removed the sign-up count from pragma's public concert list. It also
made `scripts/kaizen.sh` require `--where`, and cleared the git hook variables
for every `scripts/` test. Session `session_01K69KnE89urXxoZV8C57NB8` shipped
it. Its `context_usage.used_tokens` read 440,424 after the merge, over 150,000,
so the sweep ran in a session of its own.

Sources: `scripts/kaizen.sh sweep-input 2e5e2948`, which gave three lines, all
logged as `main`. Also the eight operator messages typed for PR #418, read with
`list_events` and `scripts/kaizen/operator-messages.ts`. The paging stopped at
2026-11-26 22:28, inside PR #415, which PR #416 already swept. The shipping
session sent one more line after the merge. The other sources were the two
validation reports, CI, which was green at the first run, and the PR
conversation, which holds only the preview bot. No `kaizen` pull request is
open.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | implementation | Anyone could read each concert's sign-up count from the public API for a day | transcript 09:45 "l'API publique de prod donne le nombre d'inscrits ?"; commit:cf9fb626; report:docs/features/pragma/concert-sign-up/validation/technical-validation-2026-11-26-1003.md row D01 | Every validator row starts from the spec, so a field no spec names has no row to fail in | `.claude/agents/technical-validator.md` category A | dantotsu: a-public-count-no-review-walked-toward |
| 02 | post-merge | The shipping session quoted "8 inscrits" from the public API and called the work done | transcript 09:26 to 09:45 | Same belief as row 01, that an unread field is harmless | Category A of the validator, which now catches the field before merge | merge into a-public-count-no-review-walked-toward |
| 03 | implementation | The test asserted the count as expected output, which held the leak in place | commit:cf9fb626, `it('… with their message and sign-up count')` | The test was written from the code's output, not from a spec line | Same as row 01 | merge into a-public-count-no-review-walked-toward |
| 04 | implementation | The operator had to point out that the session's kaizen line framed the problem around its own fix | transcript 09:55, "pas bon du tout"; first line "neither validation round flagged a public field outside the spec" | A free sentence let the writer's guess pass as an observation | `scripts/kaizen.sh` | no-op: PR #418 made `--where` required and the sweep skill says to start from the place |
| 05 | implementation | The operator chose a place over a list of banned words | transcript 09:56:43 "La liste de mot non, mais ce qu'on a vu et où oui" | Direction | none, a choice between two proposals | no-op: asked as it should be, shipped in PR #418 |
| 06 | implementation | The session waited for the technical validator before editing, until the operator asked if it was not in a worktree | transcript 09:58:21 and 09:58:47; archive line 09:58 | The validator pins its SHA at the start (`technical-validator.md` *Procedure* step 1), but only the agent file says so, and the session reads the skill | `.claude/skills/technical-validation/SKILL.md` step 7 | fixed: step 7 says to keep working in another worktree, and why it is safe |
| 07 | implementation | The new `kaizen.test.ts` cases wrote two test lines into the real `KAIZEN.md` under `pre-push` | archive line 10:21; commit:832851502 | git exports `GIT_DIR` and `GIT_INDEX_FILE` to a hook, and the scratch-repository tests inherited them | `docs/knowledge/git-sets-git-dir-inside-a-hook.md` told each test to clear them by hand, and only one did | no-op: PR #418 clears them in `scripts/git-hook-variables-cleared.setup.ts` for every `scripts/` test |
| 08 | implementation | A failed push committed fifteen test commits onto the branch | PR #418 *Notable*; commit:832851502 | Same as row 07 | Same as row 07 | merge into row 07 |
| 09 | post-merge | The checkout's git config held `core.bare=true`, `user.name=gate` and `user.email=gate@example.invalid` after the failed pushes | message from the shipping session at 10:45; `scripts/check-docs-are-english.test.ts:29-31` runs `git init` and `git config` in a scratch repository | Same as row 07. With `GIT_DIR` set, that `git init` and `git config` act on the checkout | Same as row 07 | no-op: measured fixed. With `GIT_DIR` pointed at a scratch repository, `vitest run scripts/check-docs-are-english.test.ts scripts/kaizen.test.ts` passed 15 tests and left it with `core.bare=false`, no user keys and no commit |
| 10 | post-merge | The knowledge entry on hook variables told tests to clear them by hand and named `scripts/check-hook-decisions.sh`, which no longer exists | `docs/knowledge/git-sets-git-dir-inside-a-hook.md`, last paragraph | The entry described a per-test fix that PR #418 replaced | none, local to the entry | fixed: 284e5e4a |
| 11 | validation | Round 1 flagged that `kaizen.test.ts` broke when `KAIZEN_AGENT` was set | report:docs/features/pragma/concert-sign-up/validation/technical-validation-2026-11-27-1005.md row C06 | The test spread `process.env` into the script | none, a test-local leak | no-op: fixed in PR #418, commit "a hook refusal logs the refused call as its place" |
| 12 | validation | No plan existed, so the plan rows were unverifiable | report:technical-validation-2026-11-27-0952.md row A00 | A spec amendment shipped without `/technical-conception` | none, a one-route removal needs no plan | no-op: the validator already turns an amendment into its own rows |
| 13 | post-merge | Every archived line was logged as `main`, though validators and worktrees ran | `scripts/kaizen.sh sweep-input 2e5e2948` | The validators logged nothing, and the session logged its own lines | none, no agent hit a wall it failed to log | no-op: nothing to promote |
| 14 | post-merge | `operator-messages.ts` printed lines in page order, and one page held up to 127k characters | ops-reader friction line, this sweep | `list_events` pages back from the newest, and the script keeps page order | `scripts/kaizen/operator-messages.ts` | no-op: `docs/knowledge/reading-another-sessions-transcript-with-list-events.md` already covers page cost, and the order is cosmetic |
