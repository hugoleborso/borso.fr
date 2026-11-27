# Friction inventory, after PR #422

The operator named two frictions in the replies after PR #422 merged, in
session `session_01K69KnDb8qvv4dWNHm4zcQG`, and asked for a kaizen in that
session. Sources: `docs/features/meta/lessons-from-pr-422/kaizen.md`, eleven
lines from five writers, and the operator's three messages after the merge.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | post-merge | A reply ended by handing the operator a phone scan | archive line `main` 20:02; operator "Arrête de me donner des choses à faire" | The gap was believed to need a camera | The PR body's Gap block, which carried the belief | dantotsu: the-gap-a-library-in-the-scratchpad-had-closed |
| 02 | post-merge | The QR code was called unverifiable without a camera | archive line `main` 20:05; operator "tu peux valider un QR code avec un lecteur" | Nothing asked which tool was missing | `scripts/pr/pr-body.core.ts` Validation check | merge into the-gap-a-library-in-the-scratchpad-had-closed |
| 03 | pr-description | The visual-validation gate refused two PRs whose site change was a comment | archive lines `hook:visual-validation` 15:29, 15:35 | The gate judged files by path | none | no-op: PR #423 made a comment-only edit inert |
| 04 | implementation | Three restore agents had git commands in loops refused by the worktree guard | archive lines `restore-technical`, `restore-other`, `restore-kaizen` | Claude Code's worktree isolation guard, not a repository hook (grep of `scripts/hooks` finds none) | none here | no-op: nothing in this repository sets it; each agent ran its git calls one by one |
| 05 | implementation | A heredoc that edited a scratchpad table was refused for containing "gitignore" | archive line `restore-visual` 17:24 | The same harness guard | none here | merge into row 04 |
| 06 | implementation | oxfmt was not found in an agent worktree | archive line `restore-kaizen` 17:25 | An agent worktree has no `node_modules` | none | no-op: the main checkout's pre-commit ran on the copied file |
| 07 | implementation | A restore agent ran Prettier | archive line `hook:no-prettier` 17:22 | Habit from other repositories | none | no-op: `no-prettier` refused it |
| 08 | implementation | A chained `git restore` with a command substitution was refused | archive line `hook:no-discarding-reset` 15:35 | The hook cannot read a path it must expand | none | no-op: the hook asks for a literal path and the retry passed |
