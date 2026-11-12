---
date: 2026-11-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#278'
fix-pr: none (the kaizen pull request of PR #316, not yet numbered)
fix-commits: [self]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/components/organisms/RequireSession.test.tsx, .claude/agents/technical-validator.md]
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
  - After the retry click it waited one `setTimeout(0)` and ten microtask turns,
    then asserted the rendered count.
    - The retry goes through the read batch, the stubbed `fetch`, a
      `Response.json()` and React Query's notify scheduler. Some of those hops
      are macrotasks whose count varies from run to run (inferred, from the
      failure rate moving with load and not with the commit).
      - So the fixed budget of turns was usually enough and sometimes not.

## Root cause of occurrence

*Thought a fixed number of flushes settles a request chain, actually the chain's
length in macrotasks is not fixed.*

`flushTasks()` and `flushMicrotasks()` in
`apps/pragma/site/src/lib/queries/queries.test-utils.ts` advance one task and
ten microtask turns. They state a budget, not a condition.

## Detection failure causes

- **Validation:** the technical validator runs `vitest --changed`. PR #278
  added the test, and later pull requests that did not touch its imports never
  ran it locally.
- **CI:** CI runs the whole suite once per push. A test that fails one run in
  seven passed on PR #316. Whether it failed on earlier pull requests was not
  checked.
- **This sweep found it** because PR #316's friction log named the `--changed`
  gap, and the sweep ran the full core suites to measure what closing it costs.

## Countermeasure

After the retry click, the test now waits for the condition it asserts, with
Testing Library's `waitFor`, which the pragma suite already uses in
`TakeUploadForm.test.tsx`, `RecordingSheet.test.tsx` and `SongEditForm.test.tsx`.

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

**Type:** detection (level 4)

**Reference:** the commit adding this file

The validator now runs each affected full-stack app's whole core suite when a
diff moves the lockfile or the catalog. That is the moment a timing-sensitive
test is most likely to change behaviour, and the run that found this one.

```diff
+  - When the diff changes `pnpm-lock.yaml` or a version in `pnpm-workspace.yaml`'s catalog, also run
+    `pnpm --filter <pkg> exec vitest run --project core` without `--changed` for each full-stack app
+    whose resolved dependencies moved. ...
```

Level 4 and not higher. The class is "a test that waits a budget, not a
condition", and 16 pragma test files call `flushMicrotasks`. Removing the
helpers would rewrite all of them for one observed flake.

**Proof it can fail:** the full pragma core run on `main` before the fix
printed `Test Files  1 failed | 408 passed (409)` with
`AssertionError: expected 'songs: none' to be 'songs: 1'` (measured).

**Similar instances:** `grep -ln "click()" $(grep -rl flushMicrotasks apps/pragma/site/src --include=*.test.tsx)`
names this file and `routes/vote/VotePage.test.tsx`. VotePage failed 0 of 20
runs alone (measured), so it is left as it is.
