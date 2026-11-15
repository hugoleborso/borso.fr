# Friction inventory of PR #343

PR #343 made pragma's page header fixed on phones, measured by a
ResizeObserver ref callback that pads the shell, brought the document bounce
back, and ran sheets to the screen bottom padded by the keyboard gap. It was
the sixth pull request of one session, `session_01K69KnFKamw16kPJs4YikHZ`,
after #331, #332, #333, #335 and #337, which the open sweep PR #341 covers.

Sources:

- `scripts/kaizen.sh sweep-input e80eb9ceb`: 3 lines in
  `pragma/fixed-header-content-bounce/kaizen.md`, two from hooks and one from
  `main`. No subagent wrote to it;
- the merge's two commit messages and its 28 files;
- the pull request's one comment, from the preview bot, and no review thread;
- its check runs, all green on `e3a3797`, with no red run before them;
- the open kaizen pull requests #340, #341, #344 and #347, read for overlap;
- `get_session` on the one session in the commits' trailers.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The first draft kept the header still with a scrolling `<main>`, a shape a dantotsu and the rule `no-scroll-container-on-main` already forbid. Only the lint run before the commit said so, after the whole draft was written | kaizen:`main` 22:51; `posttool-format-write.sh` runs no linter (read) | dantotsu: the-rule-that-spoke-only-at-the-commit |
| 02 | implementation | The dantotsu on the scrolling shell has a `zone:` naming `AppShell.tsx`, and no hook printed it when that file was edited, because the knowledge hook reads `docs/knowledge/` only | `knowledge-triggers.sh` reads `docs/knowledge` (read) | merge into the-rule-that-spoke-only-at-the-commit. The rule's message names the dantotsu, so linting at the write delivers it. Printing all 315 dantotsus by zone would add noise for entries a rule already carries |
| 03 | implementation | A per-write lint looked too slow, because the full config is type-aware and builds the workspace program | `oxlint` on `AppShell.tsx`: 3.99 s with the config, 1.08 s with `typeAware` off (measured) | merge into the-rule-that-spoke-only-at-the-commit, which lints without the type-aware rules |
| 04 | implementation | A derived oxlint config outside the root loaded but matched no override, so the planted defect passed silently | the same planted defect: no report from `node_modules/.cache/`, two errors from the root (measured) | merge into the-rule-that-spoke-only-at-the-commit, whose hook keeps the derived config at the root and says why |
| 05 | validation | The change is iOS-only and was checked in Chromium emulation, with the real check left to the preview on an iPhone | PR #343 body, *Gap: real iOS* | merge into PR #341, whose `four-iphone-fixes-checked-in-a-browser-that-could-not-fail` reports a misplaced tab bar or hidden field to Sentry from the phone |
| 06 | post-merge | #343 removed `overscroll-behavior-y: none`, which open PR #341 still names as the countermeasure for the bounce in its dantotsu and in `agentic-device-testing.md` | `git grep overscroll origin/claude/lessons-from-pr-337` (two lines); the #343 diff of `tokens.css` | merge into PR #341. Its two claims are stale since #343 and need rewording there before it merges. This sweep does not push to a pull request it did not open |
| 07 | implementation | #337 turned the document bounce off to keep the tab bar still, and #343 turned it back on because the operator wants the content to bounce | the #343 commit message; the #343 *Decisions* table | no-op: the operator's product call, made on the preview, and #343's fixed header removes the need for the bounce-off. The fix-on-fix chain across iOS pull requests is PR #341's subject |
| 08 | implementation | `hook:merge-on-moved-base` refused a merge beside base commits no CI run had tested | kaizen:`hook:merge-on-moved-base` 22:22, half an hour before #343 opened | no-op: the guard held as designed, on a merge of an earlier pull request of the same session |
| 09 | implementation | `hook:no-discarding-reset` refused a git command that would have discarded uncommitted work | kaizen:`hook:no-discarding-reset` 22:41 | no-op: the guard held and no work was lost. The refusal names the `git stash push -u` to take first (read in `pretool-no-discarding-reset.sh`) |
| 10 | post-merge | No technical or visual validation report was committed for #343 | `ls docs/features/pragma/fixed-header-content-bounce/` lists only `kaizen.md` | no-op: a two-commit fix the operator validated on the preview. The real check, an iPhone, is row 05 |

Counts: 1 dantotsu, 5 merged (3 into it, 2 into PR #341), 4 no-op.
