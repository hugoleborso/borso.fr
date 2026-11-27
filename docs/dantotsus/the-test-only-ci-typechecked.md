---
date: 2026-10-12
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#154'
fix-commits: [1145b2b4]
eradication-level: 2
time-to-detect: minutes
tags: [ci, hooks, typescript, testing]
eradication-paths: [.husky/pre-push]
zone: .husky/pre-push
recurs: none (a gate that did not exist at push time, not a gate that ran and measured nothing)
---

# The test only CI type-checked

## User impact

The operator saw PR #154 go red after every local gate had passed. A session
pushed `SetlistEntryRow.test.tsx`. It passed pre-commit and pre-push, then
failed the `build` job on CI (measured, from the CI log):

```
apps/pragma typecheck: Failed
site/src/components/organisms/SetlistEntryRow.test.tsx(34,21): error TS2322:
  Type '"ready"' is not assignable to type '"idea" | "wip" | "rehearsed" | "concert_ready"'.
```

| | Seen | Expected |
| --- | --- | --- |
| After `git push` | push succeeds, CI's `build` fails on a type error | the push refuses the type error, CI stays green |

The same file also passed a `songId` prop the row does not declare.

## Causal chain

- CI's `build` job failed on `SetlistEntryRow.test.tsx`.
  - `tsc` refused the props the test built: `status: 'ready'` at line 34, and
    an undeclared `songId`.
    - The session wrote the props by hand, with a status that is not in the
      union. `concert_ready` is the value, and its English label is "Concert
      ready" (`apps/pragma/site/src/i18n/en.json`). The label may have
      steered the guess (inferred: the commit is squashed into `21a850ab4`,
      so the transcript cannot be traced).
      - The session ran the test, and it passed. Vitest transpiles
        TypeScript with esbuild, which strips types without checking them,
        so a wrong literal is valid JavaScript.
        - The session treated the green run as the check that the code was
          right, and pushed.
          - The pre-push hook ran knip, the affected tests and mutation. It
            had been sized on the belief that an editor type-checks every
            change as it is written. A session writes from a shell, with no
            editor (Method).

## Root cause of occurrence

*Thought the write, run, green loop checks a change the way an editor does,
actually in a shell nothing type-checks the change, and Vitest strips the
types it runs.* (Method)

The loop the session followed, and the hooks built around it, assumed a
type checker running beside the writer. Had the session known no layer
before CI ran `tsc`, it would have run the type check, or built the props
from `SetlistEntryRowProps` and seen the error.

Evidence that Vitest does not type-check: the test ran green locally with
`status: 'ready'`, and `tsc` refused the same file on CI (measured, PR #154).

## Detection failure causes

- **Typing:** worked, in CI only. No local layer called `tsc`.
- **Local hooks:** pre-commit ran ESLint and Prettier on the staged files.
  Pre-push ran knip, the affected tests and mutation. The hooks were sized to
  be fast, and type checking was left to CI on the editor assumption above.
- **Local validation:** the test ran green, so the mistake read as done.

## Countermeasure

The test in PR #154 passes a real status, `concert_ready`, and drops the
unknown prop.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `1145b2b4` (#167), which carries the pre-push change.

Pre-push type-checks every app the push changes, and the tooling. The gate
still holds today in `.husky/pre-push`.

```diff
+for app in $changed_app_slugs; do
+  start_gate "typecheck-$app" pnpm --filter "@borso-app/$app" run typecheck
+done
 ...
+  start_gate typecheck-tooling pnpm run typecheck
```

pragma's type check took 28 s on 2026-10-12 and 47 s on 2026-10-24
(measured, quoted in the hook's comment). It runs beside the other gates, so
the push waits on the slowest one.

**Proof it can fail:** with the PR #154 test restored, the `typecheck-pragma`
gate fails on the same `TS2322` (the error CI printed, which is the same
`pnpm --filter @borso-app/pragma run typecheck` command).

**Similar instances:** standard 12 and CLAUDE.md both described the pre-push
gates. Both were updated to name the type check. Every workspace runs through
the same loop, so the gate covers every app a push changes.

**Related.**

- [`a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md)
