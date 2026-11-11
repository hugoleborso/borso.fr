# Friction inventory, PR #287

`docs(meta): name the capability that starts the kaizen, not one tool`,
squashed onto `main` as
[`17c785d`](https://github.com/hugoleborso/borso.fr/commit/17c785daac826e2da75cbce819dde272fce2f7da)
on 2026-11-11. Four prose files, one commit, nine added lines.

Sources walked: `scripts/kaizen.sh sweep-input 17c785daa` (no archive), the
friction line pasted into the sweep prompt, the pull request's body, comments
and review threads, its 19 check runs, its commit history, the open pull
requests, and 11 live `search_issues` calls made by this sweep to test the
pasted line's claim.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | The task archived no friction log at all, so the sweep's primary input did not exist | `scripts/kaizen.sh sweep-input 17c785daa` → *"added no friction archive. The task logged nothing, or never archived: that is a finding, not an absence."* | `no-op:` recovery was cheap and complete here. The pull request is four prose files in one commit with no review threads, so the commit history is the whole record, and the session's one friction line came after the archive step and reached this sweep pasted verbatim, which `/open-pr`'s *After the merge* already requires. |
| 02 | post-merge | Two of six `search_issues` calls refused the 3S board refresh with `API error (400): Invalid query. Project(s) <name> do not exist or are not actively selected` | the friction line pasted into this sweep's prompt, logged `[2026-11-11] main` | `merge into` 04 |
| 03 | post-merge | The friction line names the hyphen as the cause: *"a hyphenated tag value… so app:last-loop-lepin must be quoted while app:pragma need not be"*. `banana-rush` is hyphenated and the same session recorded it succeeding | the line itself, against `SENTRY_APPS` at `scripts/quality/quality-dashboard.core.ts:102` | `merge into` 04 — the premise is testable, so this sweep tested it |
| 04 | post-merge | The Sentry MCP runs an agent over `query` before Sentry sees it and sometimes rewrites a bare `app:<value>` into a project filter. Measured over 11 calls this session: `banana-rush` returned 400 twice unquoted while `last-loop-lepin` and `borso-fr` succeeded unquoted, the exact reverse of the swept session. Quoted held 6 of 6 across both sessions | the 11 calls listed in [`the knowledge entry`](../../../knowledge/sentry-search-tools-rewrite-the-query-before-sentry-sees-it.md); the tools' own descriptions | `knowledge: sentry-search-tools-rewrite-the-query-before-sentry-sees-it` |
| 05 | post-merge | `buildSentryIssueIndicators` gives an application with no row `current: 0, status: ok`, so a refused call publishes a confident zero on the board | `scripts/quality/quality-dashboard.core.ts:492-497` before this pull request | `dantotsu: the-zero-that-meant-the-call-never-happened` |
| 06 | post-merge | The test for that path asserted the defect: `expect(find(indicators, 'sentry-issues-open', 'talos')?.current).toBe(0)` with no row for `talos`, at 100% coverage and a passing mutation score | `scripts/quality/quality-dashboard.core.test.ts:476` before this pull request | `merge into` 05 — it is the *Detection failure causes* section of that entry |
| 07 | post-merge | `.claude/skills/quality-dashboard/SKILL.md`, section *1. Collect the snapshot*, gives the example in the unquoted form that fails, and does not say every app needs a row | the skill file before this pull request | `merge into` 05 — shipped as the second, defence-in-depth eradication |
| 08 | post-merge | `docs/knowledge/README.md` says *"Knowledge entries don't need YAML frontmatter or a fixed structure"* 230 lines after the same file says every entry has a trigger and `check-knowledge-triggers.sh` fails one without `summary:` and `triggers:` | `docs/knowledge/README.md:29-56` against `:265`; `scripts/check-knowledge-triggers.sh` | `fixed:` the commit adding this inventory |
| 09 | implementation | Four instructions named `spawn_task` by name, so on PR #281 the kaizen read as impossible when `create_session` was available | PR #287 body, *Decisions* | `no-op:` this is the defect PR #287 itself eradicated. The sweep audits that eradication and finds it holds: `grep -rn spawn_task .claude CLAUDE.md` returns nothing live. |
| 10 | post-merge | Nothing stops a future skill from naming a tool by name again | this sweep's reading of the four changed files | `no-op:` a grep gate for one vendor tool name would guard the harness and nothing else, which `/after-task-kaizen` forbids, and the reframe about PR #228's one-defect workflow applies. The rule now lives in CLAUDE.md where a session reads it. |
| 11 | pr-description | The branch had to be restarted from `main` after PR #281 squash-merged | PR #287 body, *Notable* | `no-op:` the harness rule already names restarting from the default branch, and it cost one `git checkout -B`. |
| 12 | pr-description | The dated inventories under `docs/features/` still carry the old tool name | PR #287 body, *Notable* | `no-op:` a dated record is append-only, which the body states as the decision, not as friction. |
| 13 | ci | 19 check runs on the pull request, 7 success and 12 skipped, none red | `pull_request_read method: get_check_runs` on #287 | `no-op:` no red run to learn from. |
| 14 | conversation | No comments and no review threads on the pull request | `pull_request_read method: get_comments` → `[]` | `no-op:` a four-file prose change the operator merged 8 minutes after it opened. It leaves the sweep with no record of the session's chat, which is row 01's cost, not a second one. |
| 15 | post-merge | PR #287's session is `session_01K69KnCk2rXC5mXMhzM8Sxn`, already counted whole in the #281 cost row, so a second full reading would double-count it | #287 body footer; `docs/quality/feature-cost.md`, #281 row | `fixed:` the new row records the delta between the two readings of the same counter rather than the total. |
| 16 | post-merge | `working-conditions.ts --check` reports 39 walls and 1,324 unfiled lines and exits 0 | the run, exit status read without a pipe | `no-op:` the count is the standing corpus, not anything this merge added, and the gate passes by design. |

## Counts

| Decision | Rows |
| --- | --- |
| `dantotsu` | 1 |
| `knowledge` | 1 |
| `fixed` | 2 |
| `merge into` | 4 |
| `no-op` | 8 |
