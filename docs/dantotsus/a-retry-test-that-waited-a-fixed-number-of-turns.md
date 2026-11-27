---
date: 2026-11-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#278'
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md]
time-to-detect: days
tags: [pragma, testing, vitest, react, validation]
zone: apps/pragma/site/src/components/organisms/RequireSession.test.tsx
weak-point: gate-measures-nothing
recurs: none (the first flaky component test on record; earlier flake entries are about shared processes and databases)
---

# A retry test that waited a fixed number of turns

## User impact

No user saw anything. The pragma core suite failed about one run in seven on
`main`, and nobody knew, because each run that went green looked like a pass.

| | Seen | Expected |
| --- | --- | --- |
| `RequireSession.test.tsx`, run alone 20 times on `main` after PR #316 | 2 of 20 failed (measured) | 0 of 20 |
| The same file at `b9d8f4651`, before PR #316 | 3 of 20 failed (measured) | 0 of 20 |
| The same file with PR #315's pragma changes reverted | 4 of 20 failed (measured) | 0 of 20 |
| PR #316's CI `app-tests (pragma)` | green | green, for the right reason |

## Causal chain

- The test "shows the failure when the first batch fails, and retries every
  read in one batch" sometimes read `songs: none` where it expected `songs: 1`.
  - After the retry click it ran `flushTasks()` then `flushMicrotasks()`, one
    `setTimeout(0)` and ten microtask turns, then asserted the rendered count.
    - The retry goes through the read batch, the stubbed `fetch`, a
      `Response.json()` and React Query's notify scheduler. Some of those hops
      are macrotasks whose count varies from run to run (inferred, from the
      failure rate moving with load and not with the commit).
    - PR #278 (`e55214d`) wrote the test with those two calls.
      - It imported them from `apps/pragma/site/src/lib/queries/queries.test-utils.tsx`,
        the shared helper module, where `flushMicrotasks` has been the way to
        settle a query since `cc98b75` (2026-05-25).

## Root cause of occurrence

*Thought the shared flush helpers settle a request chain, actually they spend a
fixed budget of turns, and the chain's length in macrotasks is not fixed.*
**Machine.** The app's shared test utilities export a budget as the way to wait.
The same pair is copied in `apps/talos/site/src/lib/queries/queries.test-utils.tsx`.
`waitFor`, which waits on a condition, was already used in pragma tests at the
parent of `e55214d` (`git grep -c waitFor e55214d^ -- apps/pragma/site/src`), so
the codebase offered both, and the helper was the one beside the query code.

```ts
export async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < MICROTASK_FLUSH_TURNS; turn += 1) {
      await Promise.resolve();
    }
  });
}
```

## Detection failure causes

- **Validation:** the technical validator runs `vitest --changed`. PR #278
  added the test, and later pull requests that did not touch its imports never
  ran it locally.
- **CI:** CI runs the whole suite once per push. A test that fails one run in
  seven passed on PR #316. Whether it failed on earlier pull requests was not
  checked.

## Countermeasure

After the retry click, the test now waits for the condition it asserts, with
Testing Library's `waitFor`.

```diff
     act(() => {
       retry?.click();
     });
-    await flushTasks();
-    await flushMicrotasks();
+    await waitFor(() => {
+      expect(document.querySelector('[data-testid=songs]')?.textContent).toBe('songs: 1');
+    });
     expect(raw).toEqual([`POST ${READ_BATCH_PATH}`]);
-    expect(document.querySelector('[data-testid=songs]')?.textContent).toBe('songs: 1');
     expect(readStatus()).toBeNull();
```

Verified: 0 of 30 runs failed after the change (measured, run alone).

## Eradication

**Type:** knowledge (level 5). What holds is a line in the validator's agent
file, which tells it to run each affected app's whole core suite when a diff
moves the lockfile or the catalog. It detects some flakes at that moment and
does not touch the class.

**Reference:** the commit adding this file.

```diff
+  - When the diff changes `pnpm-lock.yaml` or a version in `pnpm-workspace.yaml`'s catalog, also run
+    `pnpm --filter <pkg> exec vitest run --project core` without `--changed` for each full-stack app
+    whose resolved dependencies moved. ...
```

**Proof it can fail:** the full pragma core run on `main` before the fix
printed `Test Files  1 failed | 408 passed (409)` with
`AssertionError: expected 'songs: none' to be 'songs: 1'` (measured).

**Similar instances:** `grep -rl -E 'flushMicrotasks|flushTasks' apps/*/site/src | grep -v test-utils`
lists 23 test files this session, 21 in pragma and 2 in talos. Each waits on a
budget. `routes/vote/VotePage.test.tsx` also clicks before flushing, and failed
0 of 20 runs alone (measured when the entry was written).

**Proposed:** subtract the helpers. Delete `flushTasks` and `flushMicrotasks`
from both `queries.test-utils.tsx` files and move each of the 23 call sites to
`waitFor` or a `findBy*` query on the condition it asserts. No test could then
wait on a budget. If the rewrite is staged, a `no-restricted-imports` entry in
`.oxlintrc.json` that names the two exports would stop new imports first (the
rule is already configured there for other paths; restricting named imports from
a relative module is untested here, inferred).
