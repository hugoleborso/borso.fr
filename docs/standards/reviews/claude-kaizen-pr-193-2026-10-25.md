# Standards review — claude/kaizen-pr-193 against origin/main

Verdict: FINDINGS
Ledger: 036b6981105e
Reviewed: 4 file(s). Sealed: 3. Findings: 1.

Dispatch: inline, by kaizen-193. The sweep ran as a subagent with no Agent tool, so it could not dispatch the isolated `standards-reviewer`; it read each file in full against every bullet of *What only a reviewer can check*. The three migration-runner files were written by the same agent, which is the bias the isolated reviewer exists to remove; the operator may want them re-read by `/standards-review` from a chat session.

## Findings

### apps/talos/api/src/todos/todos-memory.service.ts:48

Bullet: `reviewer` checks that a rule about rows another request can write, or state another process holds, is held by a primary key or a single conditional write rather than by a check over rows read earlier.

```ts
  if (isTaskTaken(await listVisibleTodos(list), newTodo.text, today)) {
    throw new TalosError('todo-duplicate');
  }
  const response = await recordPwaChanges(
```

"No duplicate task on the same day" is decided from a list read before the write, so two requests adding the same text at once can both pass. `changeStoredTodo` has the same shape. Whether the memory store behind `recordPwaChanges` holds the rule itself is not visible from this file.

Introduced: pre-existing, the branch's diff on this file renames `findVisibleTodo` to `getVisibleTodo` and nothing else.
Fix size: one service and the memory store behind it, in talos; out of this branch's scope.

## Sealed

- infra/cdk/src/internal/migration-runner/index.ts — only `applyMigrations` changed: it hands each statement's rows to `settleIndexBuild`.
- infra/cdk/src/internal/migration-runner/index-build-wait.ts — names follow the verb table (`assertIndexIsValid` throws, `settleIndexBuild` and `waitForIndexBuild` return nothing); every decision is read from a named result of the utils file.
- infra/cdk/src/internal/migration-runner/index-build-jobs.utils.ts — `.utils.ts` is right: none of it is a word a product owner would use. The row types describe DSQL system views, which have no Drizzle table to derive from.

## Unclear

None.

## Outside the checklist

- None.
