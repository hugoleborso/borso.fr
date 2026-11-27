---
date: 2026-10-25
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#193'
fix-commits: [a83f0a600]
eradication-level: 2
eradication-paths: [eslint-rules/verb-promises-match-return-type.js, eslint-rules/verb-promises-match-return-type.test.js]
time-to-detect: hours
tags: [eslint, naming, standards, review]
zone: apps/pragma/api/src/takes/takes.repository.ts
weak-point: gate-measures-nothing
recurs: none (no earlier entry covers the verb table; this is the first gap found in the rule)
---

# The find that threw behind a clean annotation

## User impact

On PR #193, `findWrittenTakeWithin(executor, id): Promise<TakeView>` threw
when the take was absent. Standard 01's verb table says a `find…` returns the
thing or `null`, and a `get…` throws. A caller reading the name would handle
`null` and never see the exception. The function passed lint and two fix
rounds. The sixth standards review caught it by reading the body. It is now
`getWrittenTakeWithin`.

| | Seen | Expected |
| --- | --- | --- |
| A `find…` reader whose row is absent | Throws `the written take is not visible to its own transaction` | Answers `null`, or is named `get…` |

## Causal chain

- A function named `find…` threw on an absent row.
  - Commit `d6fad8103`, written by an agent, added it to
    `apps/pragma/api/src/takes/takes.repository.ts`:

    ```ts
    export async function findWrittenTakeWithin(
      executor: DatabaseExecutor,
      id: string,
    ): Promise<TakeView> {
      const take = await findTakeOn(executor, id);
      if (take === null) throw new Error('the written take is not visible to its own transaction'); // ← ❌ a find… that throws
      return take;
    }
    ```

    - It sits directly above `findClaimedTakeWithin`, which returns
      `Promise<ClaimedTake | null>`. Every transaction reader in the app was
      named `find…Within` at the parent commit, except
      `getEntriesOfSongWithin` in another slice (measured with
      `git grep` on `d6fad8103^`). The writer joined the neighbour's naming
      family and changed its contract from null to throw.
      - The verb table lived in `docs/standards/01-naming.md`. The name
        family next to the line won over it. **Man** (inferred: the writing
        session's transcript is not in the repository).

## Root cause of occurrence

*Thought `find…Within` named a family, "reads inside a transaction", actually
the verb is a contract: `find` answers `null` and `get` throws, whatever
follows it.* Man (inferred): the standard existed, and the neighbouring name
was the stronger signal at the moment of writing.

## Detection failure causes

- **Typing:** a throw does not change a function's type.
- **Linter:** `borso/verb-promises-match-return-type` held a `find…` only to
  its declared return type, and checked only that it was not an array. It
  read the annotation and never the body, though a `throw` that leaves the
  function is plain syntax.
- **Code review:** two fix rounds edited the file without reading the
  function against the verb table. The sixth round did.

## Countermeasure

`getWrittenTakeWithin`, in PR #193 (commit `b39ea501` on the branch, squashed
into `d117a320`).

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`a83f0a600`](https://github.com/hugoleborso/borso.fr/commit/a83f0a600)
(PR #200).

The rule also listens for `ThrowStatement`. It finds the function the throw
would leave, stops at a `try` whose `catch` handles it, and reports when that
function is named `find…`:

```diff
+    function checkThrow(node) {
+      const enclosing = findEnclosingUncaughtFunction(node);
+      if (enclosing === null) return;
+      const name = readFunctionName(enclosing);
+      if (name === null || !FIND_PREFIX.test(name)) return;
+      context.report({ node, messageId: 'throwingFind', data: { name } });
+    }
```

This gate is the response a Man cause calls for: it holds when the prior
wins, whatever document was or was not read.

**Proof it can fail:** the RuleTester cases in
`eslint-rules/verb-promises-match-return-type.test.js` report the original
`findWrittenTakeWithin` body, an arrow, an object method, a throw in a
`finally` and a rethrow in a `catch`. They pass a throw caught by its own
`try`, a throw inside a nested callback or a nested `get…` helper, a `get…`
that throws, and `finder`.

**Similar instances:** linting the repository with the extended rule found
`findVisibleTodo` in `apps/talos/api/src/todos/todos-memory.service.ts`, the
test helper `findInstrumentToggle` in
`apps/pragma/site/src/components/molecules/LineupEditor.test.tsx`, and the same
pull request's `findPage` in `scripts/browser/touch-tap.ts`. All three were
renamed to `get…`.
