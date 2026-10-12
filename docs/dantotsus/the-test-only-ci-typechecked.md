---
date: 2026-10-12
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#154'
fix-pr: '#155'
fix-commits: [d5c7fbb]
eradication-level: 2
time-to-detect: minutes
tags: [ci, hooks, typescript, testing]
---

# The test only CI type-checked

## Symptom

`SetlistEntryRow.test.tsx`, pushed in PR #154, passed pre-commit and pre-push,
then failed the `build` job on CI:

```
apps/pragma typecheck: Failed
site/src/components/organisms/SetlistEntryRow.test.tsx(34,21): error TS2322:
  Type '"ready"' is not assignable to type '"idea" | "wip" | "rehearsed" | "concert_ready"'.
```

The same file also passed a `songId` prop the row does not declare.

## Root-cause chain

1. **Why did the test pass locally?** Vitest transpiles TypeScript with esbuild,
   which strips types without checking them. A wrong literal is valid
   JavaScript.
2. **Why did no hook catch it?** Pre-commit runs ESLint and Prettier on the
   staged files; pre-push runs knip, the affected tests and mutation. None of
   them runs `tsc`.
3. **Why was `tsc` left out?** The hooks were sized to be fast, and type
   checking was treated as CI's job. That trade held while every change was
   type-checked by an editor; a session writing files from a shell has no
   editor.

**Root cause:** we thought the tests exercised the types, and actually Vitest
never checks them, so only `tsc` can.

## Detection failure causes

- **Typing:** worked, in CI only.
- **Local hooks:** none called the type checker.
- **Functional validation:** the test ran green, so the mistake read as done.

## Countermeasure

- **Code:** commit `de65df7` (PR #154) — the test passes a real status and
  drops the unknown prop.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-push gate)

**Reference:** [PR #155](https://github.com/hugoleborso/borso.fr/pull/155) · commit `d5c7fbb`

**The actual fix:**

```diff
+for app in $changed_app_slugs; do
+  start_gate "typecheck-$app" pnpm --filter "@borso-app/$app" run typecheck
+done
 ...
   start_gate tooling pnpm run test:coverage
+  start_gate typecheck-tooling pnpm run typecheck
```

pragma's type check takes about 28 s (measured 2026-10-12) and runs beside the
other gates, so the push waits on the slowest one, usually mutation.

**Sibling defects swept:** standard 12 and CLAUDE.md both described the
pre-push gates; both now name the type check.

## See also

- [`a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md)
