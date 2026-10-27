# Friction inventory — PR #203

Every friction event from Hugo's request (open commitments due this week before overdue ones, in the talos PWA) to the merge of PR #203, in the order it happened.

`KAIZEN.md` carried two entries, one from `main` (row 01) and one from `hook:no-swallowed-push` (row 10). The task spawned no agents. The other rows come from the transcript, the commit and the CI runs.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The request named `docs/contrat-api-memoire.md`; no such file exists. `apps/talos/CONTRAT.md` was updated instead, and `apps/talos/MEMORY-CONTRACT.md`, the memory API contract the words described, was never opened. | KAIZEN.md `main` 07:50; transcript: `grep: ../../docs/contrat-api-memoire.md: No such file or directory` | knowledge: talos-has-two-contracts |
| 02 | implementation | "the `contexte` endpoint, if it sorts them" was read as "if it sorts them by due date". `/api/agent/context` does sort open commitments, by slug, and changing that order means editing the frozen `MEMORY-CONTRACT.md`. | `apps/talos/api/src/memory/memory.repository.ts` `listCommitments` orders by slug; PR #203 body, *Notable* | merge into talos-has-two-contracts (the order of `/context` surfaced to Hugo as his decision) |
| 03 | implementation | The home agenda groups todos and commitments in shared day sections, so putting today before overdue for commitments moved overdue todos below today's too. | commit 55e43b8, `today-agenda.core.ts` `BUCKET_ORDER` | no-op: surfaced in PR #203's decisions table and in `CONTRAT.md`; Hugo merged it |
| 04 | implementation | The home screen shows only the today and overdue sections, so the "next seven days" group of the request never appears there. | `TodayAgenda.tsx` calls `keepDueByToday` | no-op: the request changed the order, not what the home screen shows; the filter is unchanged by design |
| 05 | validation | Stryker: the `dueDate === undefined` branch of the new rank was an equivalent mutant, because an undated commitment already sorts last through `LAST_DAY`. One extra mutation round. | transcript: `[Survived] ConditionalExpression commitments.core.ts:71:7` | no-op: `writing-a-small-function-the-hundred-percent-gates-accept.md` fired on the command and covers a surviving conditional as a design signal; the branch was removed |
| 06 | validation | Stryker: `compareDays`'s bucket comparison became equivalent once the new bucket order matched the key order. | transcript: `[Survived] ConditionalExpression today-agenda.core.ts:49:10` | no-op: `how-a-mutation-survivor-hides.md` covers a genuinely equivalent mutant; disabled on the line with its reason |
| 07 | implementation | `unicorn/consistent-function-scoping` refused an arrow function declared inside a test. | transcript: `pnpm run lint` output | no-op: the lint caught it locally before the commit, as designed |
| 08 | pr-description | `check-pr-body.ts --title …` crashed with an `ENOENT` stack trace on `--title`, because any argument but `--render` was read as the draft's path. | transcript: `Error: ENOENT: no such file or directory, open '--title'` | fixed: this sweep's commit (unknown flags print the usage and exit 2) |
| 09 | pr-description | The body failed the budget twice: no title heading, then a validation item of 149 characters against 100. | transcript: `[pr-body] 2 violation(s)` | no-op: the script named both limits on the first run; the `/open-pr` skill documents them and was not invoked |
| 10 | implementation | `git push … \| tail` was refused before anything ran. | KAIZEN.md `hook:no-swallowed-push` 07:54 | no-op: the hook did its job; the push went through on the next call with `pipefail` |
| 11 | post-merge | The post-merge message told the operator that `scripts/kaizen.sh archive` does not exist and `CLAUDE.md` is stale. It exists; the grep had read a five-line wrapper. | transcript: `grep -n "archive" -A12 scripts/kaizen.sh` printed nothing | dantotsu: the-wrapper-that-hid-the-subcommand |
| 12 | post-merge | Because of row 11, the friction log was never archived during the task, which `CLAUDE.md` asks of a hosted session. | `CLAUDE.md`, *Self-improvement loop* | merge into the-wrapper-that-hid-the-subcommand |
| 13 | implementation | `rtk` failed to install at every SessionStart (three times): GitHub's API answered rate-limited. | SessionStart output: `Failed to get latest version (GitHub API may be rate-limited …)` | no-op: `install-repo-deps.sh` already names the cause and the `RTK_VERSION` pin, the miss costs tokens only, and `https://github.com/rtk-ai/rtk/releases/latest` answered 403 from this session, so no version could be chosen to pin |
| 14 | deploy | The PR-watch guidance asked for a `send_later` check-in; this repository's `CLAUDE.md` forbids scheduling one the operator did not ask for. | subscription notice; `CLAUDE.md`, *Don'ts* | no-op: `CLAUDE.md` wins and was followed; GitHub events delivered the CI results and the merge |
| 15 | conception | The request arrived as a system notification, not as a message from the operator. | transcript | no-op: it carried a complete, in-scope task, and nothing went wrong |

## Counts

| Decision | Rows |
| --- | --- |
| dantotsu | 1 |
| knowledge | 1 |
| merge into another row | 2 |
| fixed | 1 |
| no-op | 10 |
