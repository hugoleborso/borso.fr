# Friction inventory of PR #356

PR #356 was the sweep of PR #352. It made production deploys skip changes that touch only an app's tests, upper-case documents or test configs, and narrowed the tooling rule so deck text gets its preview again. It merged on 2026-11-15 as `7a1b75e`.

Sources read: `scripts/kaizen.sh sweep-input 7a1b75e` (0 lines), the archive `meta/lessons-from-pr-352/kaizen.md` (header only, no entry), the 1 line the prompt pasted from after the archive, the 3 commits of the pull request, its 12 workflow runs, its comments and review threads (none), the open pull requests (none labelled `kaizen`), and `get_session` on `session_01K69KnELZHbku25HJk6JD8h`.

Writers: the shipping session's post-archive note 1. No other writer logged a line.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | pr-description | The dantotsu said `fix-pr: '#353'`, the number of an unrelated pull request, guessed before #356 opened. | commit:ad987af changes `'#353'` to `'#356'` in the front matter and the *Reference* line | dantotsu: a-pull-request-number-written-before-it-existed |
| 02 | implementation | Fixing that number after the pull request opened cancelled the first `ci` run and started a second. | ci:43688818381 cancelled on `6d9f1b6`, ci:43688842997 green on `ad987af` | merge into a-pull-request-number-written-before-it-existed |
| 03 | implementation | The session logged no friction line, so its archive holds only the header. | `git show 7a1b75e:docs/features/meta/lessons-from-pr-352/kaizen.md` has no entry line; row 01 happened and was not logged | no-op: the session ran alone, with no subagent; the one guess it made is row 01, and the commits and runs recover the rest |
| 04 | post-merge | `main` moved (#353) while #356's CI was green, so it took one more merge of `main` and one more CI run before merging. | pasted line; merge commit 31dcb51 has parents `ad987af` and `2cfa2a3`; ci:43694294349 | no-op: `merge-on-moved-base` refused because both sides changed `CLAUDE.md`, which `scripts/check-named-paths-exist.sh` and `scripts/check-app-registration.sh` read, so the combination needed its own run; the operator chose this refusal on 2026-11-12 |
| 05 | post-merge | The prompt named `meta/lessons-from-pr-352/kaizen.md` as the friction log, while `sweep-input` reported 0 lines across 0 archives. | `scripts/kaizen.sh sweep-input 7a1b75e` | no-op: `sweep-input` printed that an empty archive is a finding, which row 03 records |

Counts: 1 dantotsu, 1 merged into it, 3 no-op.
