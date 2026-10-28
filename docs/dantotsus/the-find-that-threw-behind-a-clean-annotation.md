---
date: 2026-10-25
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/verb-promises-match-return-type.js]
time-to-detect: hours
tags: [eslint, naming, standards, review]
zone: eslint-rules/verb-promises-match-return-type.js
weak-point: gate-measures-nothing
recurs: none (no earlier entry covers the verb table; this is the first gap found in the rule)
---

# The find that threw behind a clean annotation

## Symptom

On PR #193 `findWrittenTakeWithin(executor, id): Promise<TakeView>` threw when
the take was absent. Standard 01's verb table says a `find…` returns the thing
or `null`, and a `get…` throws. The function passed lint and two fix rounds,
and the sixth standards review caught it by reading the body. It is now
`getWrittenTakeWithin`.

## Root-cause chain

1. **Why did lint pass?** `borso/verb-promises-match-return-type` holds a
   `find…` to its declared return type, and only checks that the type is not
   an array. `Promise<TakeView>` is not an array.
2. **Why only the annotation?** The rule was written to need no type
   information, so it reads the annotation's shape. A missing `| null` cannot be
   required from the shape alone, because some `find…` functions return
   `undefined` or a sentinel, and the standard listed "a `find…` returns `null`
   rather than throwing" as a reviewer check.
3. **Why was that enough to miss it?** Throwing is visible in the syntax of the
   function itself: a `throw` statement that leaves it. The rule never looked
   at the body, so the half of the promise it could have read for free was left
   to a reviewer, who reads hundreds of functions per round.

**Root cause:** thought the verb's promise was a property of the return type,
actually "throws when absent" is a property of the body, and the body was
there to read.

## Detection failure causes

- **Typing:** a throw does not change a function's type.
- **Linter:** the rule read the annotation only.
- **Code review:** two fix rounds edited the file and did not read the
  function against the verb table; the sixth round did.

## Countermeasure

- **Code:** `getWrittenTakeWithin` (in PR #193, commit `b39ea501` on the branch,
  squashed into `d117a320`).

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2).

**Reference:** the commit that adds this file.

**The actual fix:** the rule now also listens for `ThrowStatement`, finds the
function the throw would leave, stops at a `try` block whose `catch` handles
it, and reports when that function is named `find…`:

```diff
+    function checkThrow(node) {
+      const enclosing = findEnclosingUncaughtFunction(node);
+      if (enclosing === null) return;
+      const name = readFunctionName(enclosing);
+      if (name === null || !FIND_PREFIX.test(name)) return;
+      context.report({ node, messageId: 'throwingFind', data: { name } });
+    }
```

RuleTester cases: the original `findWrittenTakeWithin` body, an arrow, an
object method, a throw in a `finally` and a rethrow in a `catch` are reported;
a throw caught by its own `try`, a throw inside a nested callback or a nested
`get…` helper, a `get…` that throws, and `finder` are not.

**Sibling defects swept:** linting the whole repository with the extended rule
found two more, both renamed: `findVisibleTodo` in
`apps/talos/api/src/todos/todos-memory.service.ts` and the test helper
`findInstrumentToggle` in `apps/pragma/site/src/components/molecules/LineupEditor.test.tsx`
are now `getVisibleTodo` and `getInstrumentToggle`. Its first catch of all was
this pull request's own `findPage` in `scripts/browser/touch-tap.ts`, written
after the rule, now `getPage`. Standard 01's enforcement
bullet now says the rule reads the body, and the reviewer bullet no longer
asks a reviewer to check what the rule checks.

## See also

- [`../standards/01-naming.md`](../standards/01-naming.md) — the verb table.
