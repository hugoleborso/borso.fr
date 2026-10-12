# Friction inventory — PR #154

Every friction event from « Merge 151 then start dantotsus right away » to the merge of PR #154. Sources: the four lines of `KAIZEN.md`, all written by `main` or a hook since no subagent ran; the thirteen commits; CI on each head; and the operator's corrections in the transcript.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | A component test passing a status and a prop that do not exist passed pre-commit and pre-push and failed CI's typecheck. | kaizen 12:48, ci: build on 4033624 | dantotsu: the-test-only-ci-typechecked |
| 02 | implementation | The first eradication for explanatory UI text, a gate on message key names with an exception file, was rejected as « une usine à gaz ». | kaizen 13:03, commit:d26622c, commit:76e9e24 | no-op: already recorded in the-interface-that-explained-itself (row 23 of the PR #151 inventory) |
| 03 | review | The Deezer and Spotify icons were drawn by hand; the operator called them fake. | kaizen 13:44, transcript | dantotsu: the-logos-drawn-from-memory |
| 04 | review | The operator asked for « reuse before you build » to be written down for every kind of artefact. | transcript, commit:d6bb88f | merge into the-logos-drawn-from-memory |
| 05 | post-merge | The registry still held a drawn YouTube glyph that nothing used. | this sweep | fixed: this PR |
| 06 | implementation | `w-12` lost to `inputVariants()`'s `w-full`, as `min-w-0` had lost to `SearchBar`'s 260 px minimum in PR #151. | transcript, PR #151 summary | knowledge: conflicting-tailwind-classes-are-not-merged |
| 07 | implementation | Committing in slices needed `git stash --keep-index`, because several pre-commit checks read the whole tree; a staged `git mv` rode into the wrong commit and the pop conflicted. | transcript | knowledge: splitting-commits-when-pre-commit-reads-the-tree |
| 08 | implementation | The song sheet focused the key field on open, which would raise the keyboard on a phone. | screenshot, commit:01d3a30 | no-op: fixed in #154 by putting the close button first; native dialogs focus their first control |
| 09 | review | « Pourquoi on voit 2 lineups ? »: the sheet showed the lineup and two more lineup buttons. | transcript, commit:3dcd301 | no-op: product feedback, fixed in #154 |
| 10 | review | Member view text, key and capo placement, and logos versus labels: three more product corrections on the sheet. | transcript | no-op: product feedback, each fixed in #154 |
| 11 | implementation | `pkill` was refused by `no-broad-kill`. | kaizen 13:01 | no-op: the hook did its job; the dev server was stopped by its task id |
| 12 | implementation | `listSharedIcons` failed `borso/verb-promises-match-return-type` at commit. | transcript | no-op: the rule fired as designed; renamed `selectSharedIcons` |
| 13 | implementation | An unreachable `??` branch and equivalent Stryker mutants in two new cores. | transcript | no-op: rewritten until coverage and mutation reached 100% |
| 14 | pr-description | The PR mixed a kaizen sweep and pragma features, and `check-pr-body.ts` refuses a body with both shapes. | transcript | no-op: the session had one branch; the body stayed a sweep and named the features in its intro |
| 15 | implementation | simple-icons' CDN no longer serves Deezer. | transcript | merge into the-logos-drawn-from-memory |

## Decisions

- 2 dantotsus, 2 knowledge entries, 1 fix, 2 merges, 8 no-ops.
- Rows 03, 04 and 06 are the same habit at three sizes: making a thing that already exists, a logo, a rule, a class merge. The CLAUDE.md rule covers the habit; `tailwind-merge` is the one library candidate left open, and adding it is the operator's call.
