# Friction inventory of PR #352

PR #352 removed every hand-written list from the READMEs, the knowledge and ADR indexes and the shared cost table. It merged on 2026-11-15 as `8230bce`.

Sources read: `scripts/kaizen.sh sweep-input 8230bce` (4 lines, all in `meta/lessons-from-pr-347/kaizen.md`), the 2 lines the prompt pasted from after the archive, the pull request (no review threads, merged by the operator), the deploy runs of `8230bce` and `fd43325`, the 6 paths under `apps/` the merge changed, the inventory of the PR #347 sweep, and the open pull requests (none labelled `kaizen`).

Writers of the 6 lines: `hook:merge-on-moved-base` 2, `hook:no-discarding-reset` 1, `readme-lists` 1, the shipping session's post-archive notes 2.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | Merging #352 redeployed five apps to production for six README files. | pasted line 1; deploy run 43688275001 on `8230bce`; `git diff --name-only 8230bce^ 8230bce` lists only `README.md` files under `apps/` | dantotsu: the-deck-text-the-preview-called-documentation |
| 02 | post-merge | `deploy-fanout.ts` predicted those five apps, while the preview would have skipped them, so the two disagreed. | pasted line 1; `deploy-fanout.ts 8230bce^ 8230bce` printed five apps before the fix and `none` after (measured) | merge into the-deck-text-the-preview-called-documentation |
| 03 | review | The preview's tooling rule dropped every `.md`, and borsouvertures builds its decks from `content/decks/*/ideas.*.md`, so a deck-text change got no preview. | found while checking whether row 01's fix was safe; a scratch commit changing `ideas.en.md` alone made `drop-check-only-changes.ts --tooling` print `[]` (measured) | merge into the-deck-text-the-preview-called-documentation |
| 04 | post-merge | #341 merged first with additions to the old lists, which forced one more merge of `main` and one more CI run. | pasted line 2; deploy run of `fd43325` (#341) at 06:51, #352 merged at 07:04 | no-op: #352 deleted those lists, so this was the last collision they can cause |
| 05 | post-merge | `merge-on-moved-base` refused the #347 sweep's merge at 06:15. | archive line 06:15 | no-op: already swept as row 01 of PR #347's inventory and eradicated by every-sweep-appended-to-the-same-three-lists |
| 06 | post-merge | It refused again at 06:19. | archive line 06:19 | no-op: row 02 of PR #347's inventory, same eradication |
| 07 | implementation | `no-discarding-reset` refused a git command at 06:50, and its log line did not say which, so this sweep cannot audit it. | archive line 06:50 | fixed: the hook's log line now names the refused command, proven on a planted `git checkout -- CLAUDE.md` |
| 08 | implementation | The no-lists rule collided with `check-dated-records-are-append-only.sh`, which freezes the file lists in `docs/**/validation/**/README.md`. | archive line 06:50 `readme-lists`; those READMEs are unchanged on `main` | no-op: a dated record describes a frozen folder, so its list cannot go stale; the gate refused and the session kept them, which is right |

Counts: 1 dantotsu, 2 merged into it, 1 fixed, 4 no-op.
