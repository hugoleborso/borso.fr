# Standards review — claude/kaizen-pr-193 against origin/main (independent pass)

Verdict: FINDINGS
Ledger: 036b6981105e
Reviewed: 4 file(s) in seal scope, plus 5 out-of-scope files the dispatcher named. Sealed: 3. Findings: 1 in seal scope, 3 outside it.

Scope came from `pnpm exec tsx scripts/standards/seal.ts scope --base origin/main`, which printed four files. The dispatcher also asked for the `eslint-rules/` change, `scripts/browser/touch-tap.ts` and the hook changes. Those sit outside the seal predicate (`apps/` or `infra/` only), so findings on them gate nothing and nothing can seal them. They are listed separately below.

## Findings

### apps/talos/api/src/todos/todos-memory.service.ts:49

Bullet: "`reviewer` checks that a rule about rows another request can write, or state another process holds, is held by a primary key or a single conditional write rather than by a check over rows read earlier."

```ts
  if (isTaskTaken(await listVisibleTodos(list), newTodo.text, today)) {
    throw new TalosError('todo-duplicate');
  }
  const response = await recordPwaChanges(
```

The "no duplicate task on the same day" rule is decided from rows read before the write, and those rows are read outside the write's transaction. I checked whether the store holds the rule anyway. It does not. `memory_todo` (`apps/talos/api/src/memory/memory-records.schema.ts:20`) has `id` as its primary key and only `index('memory_todo_list_idx').on(table.list)`, with no unique constraint on list, text and `added_on`. `addTodoOperation` (`memory-record-operations.service.ts:96`) inserts under a fresh `randomUUID()` through `upsertTodo`, which conflicts on `id` only. So two concurrent adds of the same text both pass the check and both insert. The same shape appears at `:74-79` (`changeStoredTodo`) and `:148-149` (`reinstateStoredTodo` via `matchRestoredTodo`). The duplicate needs a store-level guarantee. One option is a deterministic id derived from (list, text, added on) written with insert-on-conflict. The soft `removed` flag and the restore path make that a design choice, not a mechanical edit.

Introduced: pre-existing. The branch's only change to this file renames `findVisibleTodo` to `getVisibleTodo` (three lines). The check-then-write landed in 13e03798 (#186).
Fix size: talos memory schema plus a migration, `addTodoOperation`, and three call sites in this service. It belongs in its own change.

## Findings outside the seal scope (gate nothing)

### scripts/browser/touch-tap.ts:79

Bullet: "`reviewer` checks that untrusted input is parsed with Zod rather than annotated into shape."

```ts
    const reply: CdpReply = JSON.parse(String(message.data));
```

A CDP WebSocket message is annotated straight into `CdpReply`. `docs/standards/03-typing.md` shows exactly this as the "Don't". The two hand-written guards do the same thing in another form. `:44-49` claims `entry is PageTarget` without checking `url`, which `:56` then dereferences. `:133-134` claims `event is RecordedInputEvent` after checking only `type`. `zod` is a root dependency and other `scripts/` files already import it. To fix, put a `z.object` per shape in `touch-tap.core.ts` and parse.
Introduced: by this branch (new file).
Fix size: one file plus its core, no callers.

### plugins/borso-harness/hooks/pretool-no-discarding-reset.sh:49

Bullet: "`reviewer` checks that a comment documents something the code cannot say, and is not a restatement, a history note, or a description of what the code does not do."

```sh
# The hook refused exactly that on PR #193, naming another checkout's work.
```

This line is a history note, and so is the last sentence of the comment at `:52-55` ("Reading the hook's own directory refused a call…"). The dantotsu already carries that history. The rest of each comment does explain something the code cannot say. Treat this as advisory if the comment standard is read as TypeScript-only: 00-principles enforces it on linted sources, `.css` and `.html`, and does not mention shell.
Introduced: by this branch.
Fix size: two comment lines.

### scripts/lint-changed-files.sh:6-9

Same bullet, same caveat about shell. "on 2026-10-25 a commit touching one file in apps/pragma … died with 'JavaScript heap out of memory'" is history, and the dantotsu named on `:13` holds it.
Introduced: by this branch. Fix size: one comment.

## Sealed

- infra/cdk/src/internal/migration-runner/index-build-jobs.utils.ts — verbs keep their promises (`selectSubmittedJobIds` returns a rule-chosen subset, `readCreatedIndexName` returns `null` when absent, `hasWaitLimitPassed` returns a boolean). No negated booleans, no comments. `.utils.ts` is right in `infra/cdk`. The row types mirror DSQL system views, which have no Drizzle table to derive from.
- infra/cdk/src/internal/migration-runner/index-build-wait.ts — `assertIndexIsValid` throws and returns nothing. The poll interval and wait limit are named constants. Every decision goes through the utils file.
- infra/cdk/src/internal/migration-runner/index.ts — the branch changed only `applyMigrations`, which now passes each statement's rows to `settleIndexBuild` before the `_migrations` row is written. The non-transactional multi-statement writes are pre-existing and forced by DSQL's DDL rules, so they are not a transaction-bullet finding.

## Unclear

None.

## Outside the checklist

- **Regression in `pretool-no-discarding-reset.sh`: the hook now lets a discarding command through in two cases. Both reproduced in a scratch repo with a dirty tracked file.**
  1. When the target path cannot be resolved, the hook exits 128, and the hook's own header says any exit other than 2 lets the command run. Examples are `cd "<quoted path>" && git reset --hard` (quote stripping leaves `""`), `git -C $PWD reset --hard` and `cd $HOME/x && …`. The `git -C "$TARGET_DIRECTORY" diff --name-only | sed` at `:72` aborts under `set -euo pipefail`. The `origin/main` copy of the hook returns 2 for the same `cd … && git reset --hard` input. The hook should fail closed: exit 2 whenever `git -C` cannot read the target.
  2. `git restore --staged g; git restore f` and `… && git restore f` exit 0. `RESTORE_LINE` takes only the first `restore` match (`head -n1`), so a staged-only restore lets a later discarding restore through. It should judge every `restore` occurrence, not the first.
  `check-hook-decisions.sh` catches neither, so each case is worth adding to it as a must-refuse command.
- `index-build-jobs.utils.ts:80-84`: `IndexBuildStep` encodes four mutually exclusive outcomes (poll again, settled, check index, failed) as `failure | null` plus two booleans. That allows combinations that cannot happen. A discriminated union like `IndexBuildProgress` would rule them out. The "family of booleans" bullet is written for front-end props, so this is advisory only.
- `index-build-wait.ts:43`: the 240 s deadline applies per job, and `MIGRATION_RUNNER_TIMEOUT_MINUTES` is 5 (`infra/cdk/src/constructs/dsql-schema.ts:64`). A deploy with two slow index builds would hit the Lambda timeout instead of `describeUnfinishedIndexBuild`. The deploy still fails, because the Provider reports the invocation error, but with a less useful message and without `sql.end()` running.
- `classifyIndexBuildJob` maps an unrecognised `sys.jobs` status to `untracked`. If that status belongs to a build still in flight, the index check that follows reports it as INVALID after a failed build, which is the wrong message.
- `eslint-rules/verb-promises-match-return-type.js` (the new `throwingFind` check): names and verbs are fine, and a throw inside a caught `try` block is correctly exempt. No finding.
