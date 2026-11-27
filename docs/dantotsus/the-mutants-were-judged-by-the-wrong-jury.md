---
date: 2026-08-20
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#49'
fix-commits: [fae5f30a5d, bf04c32fb1]
eradication-level: 5
eradication-paths: [apps/last-loop-lepin/api/src/media/media.core.ts, stryker.shared.js, docs/knowledge/how-a-mutation-survivor-hides.md]
time-to-detect: days
tags: [testing, vitest, gates, ci, last-loop-lepin]
zone: stryker.shared.js
weak-point: gate-measures-nothing
recurs: [the-tooling-that-gates-everything-was-checked-by-nothing]
blueprints: [core-lookup-table]
---

# The mutants were judged by the wrong jury

## User impact

`apps/last-loop-lepin` scored 99.75% on mutation against a break threshold of
100, exit 1, for four days. Five survivors, all in one seven-line file:

```
[Survived] StringLiteral  media.core.ts:11  'image/jpeg': 'jpg'  →  'image/jpeg': ""
[Survived] StringLiteral  media.core.ts:12  'image/png': 'png'   →  'image/png': ""
[Survived] StringLiteral  media.core.ts:13  'image/webp': 'webp' →  'image/webp': ""
[Survived] ObjectLiteral  media.core.ts:10  the whole table       →  {}
[Survived] StringLiteral  media.core.ts:16  FALLBACK = 'bin'      →  ""
```

| | Seen | Expected |
| --- | --- | --- |
| The app's mutation gate | red, five survivors | green: `media.core.test.ts` asserts every one of those strings, and passes |

## Causal chain

- Five mutants survived tests that assert those exact strings.
  - Those tests were never run against them. Stryker's JSON report names the
    covering set:

    ```
    coveredBy = ['media.adapter falls back to the deployment region …',
                 'media.adapter signs against the region the environment names']
    killedBy  = []
    ```

    - Under `coverageAnalysis: 'perTest'`, Stryker charged the table's mutants
      to the test running when the module first loaded. `media.adapter.test.ts`
      sorts before `media.core.test.ts`, and `media.adapter.ts` imports
      `media.core.ts`, so the table was initialised during an adapter test. By
      the time the core tests ran, the module was cached and recorded nothing.
      - `ignoreStatic: true` did not exclude them. Stryker ignores a static
        mutant only when no test covers it, and these had a covering set.
      - The table sat at module scope:

        ```ts
        const FILE_EXTENSION_BY_CONTENT_TYPE = {
          'image/jpeg': 'jpg',
        ```

        - Commit `db221c687` wrote it there so one table fed both
          `ALLOWED_PHOTO_CONTENT_TYPES` and the extension lookup, "so the
          allow-list and the extensions cannot drift apart" (its message). The
          same commit wrote `auth.core.ts` the same way. Two days later
          `f2fa6f626` made that file the `core-lookup-table` blueprint source.
          - `stryker.shared.js`, written that morning in `14fc404a6`, said such
            a mutation "is reported separately and does not fail the gate on
            its own".

## Root cause of occurrence

*Thought a module-level constant is measured by the tests of the module that
declares it, actually Stryker charges it to whichever test first imported the
module, which here was another suite.*

**M: Machine.** The repository's own mutation config stated the opposite of the
tool's behaviour. With that comment in `stryker.shared.js`, a module-level table
read as safe, and a single source of truth for two exports read as the better
design. The `core-lookup-table` blueprint, made from the sibling file of the same
commit, then turned the shape into the one to copy.

## Detection failure causes

- **Linter:** no rule relates where a constant is declared to which tests will
  be charged for it.
- **Local:** the pre-push mutation gate is scoped with `--mutate` to the changed
  pure files, which would have included this file on the push that created it.
  Whether it ran and was overridden, or never ran, is not recoverable from the
  history. The gate was skippable with `SKIP_MUTATION_GATE=1`.
- **CI:** `ci.yml` ran coverage per changed app and no mutation. Coverage was
  100% on this file, because every line runs.
- **Review:** a lookup table with a test per entry reads as well covered,
  because it is. The gap is in the tool's accounting.
- **Backstop:** `full-suite` caught it on the first push and reported it to
  nobody for twenty runs, see
  [`the-backstop-nobody-was-standing-behind.md`](./the-backstop-nobody-was-standing-behind.md).

## Countermeasure

Commit `fae5f30` (PR #79) reads the table inside the function that uses it, so
its mutants are runtime mutants, covered per test, and the existing assertions
kill them. Commit `bf04c32` makes the comment in `stryker.shared.js` state what
the tool does.

Measured: `media.core.ts` 28.57% with 5 survivors → 100%, 0 survivors. The
app's unscoped run 99.75%/exit 1 → 100.00%/exit 0. Coverage unchanged at 906
tests, 100% on all four metrics.

## Eradication

**Type:** knowledge (level 5). The instance cannot recur, and the class is
explained where it shows.

**Reference:** [PR #79](https://github.com/hugoleborso/borso.fr/pull/79) ·
commits `fae5f30`, `bf04c32`.

```diff
- const FILE_EXTENSION_BY_CONTENT_TYPE: Readonly<Record<PhotoContentType, string>> = {
-   'image/jpeg': 'jpg',
-   'image/png': 'png',
-   'image/webp': 'webp',
- };
- const FALLBACK_FILE_EXTENSION = 'bin';
-
  export function fileExtensionForContentType(contentType: string): string {
-   const extensions: Readonly<Record<string, string>> = FILE_EXTENSION_BY_CONTENT_TYPE;
-   return extensions[contentType] ?? FALLBACK_FILE_EXTENSION;
+   const fileExtensionByContentType: Readonly<Record<string, string>> = {
+     'image/jpeg': 'jpg',
+     'image/png': 'png',
+     'image/webp': 'webp',
+   };
+   const fallbackFileExtension = 'bin';
+   return fileExtensionByContentType[contentType] ?? fallbackFileExtension;
  }
```

For the class, [`how-a-mutation-survivor-hides.md`](../knowledge/how-a-mutation-survivor-hides.md)
triggers on `[Survived]` output. Its section "A test that re-imports a module
turns its constants into live mutants" says to read a surviving constant as a
question about which test loads its module.

**Proof it can fail:** the gate itself fails on the next instance, as it did
here. The knowledge entry only explains it.

The blueprint still puts its table at module scope.
`apps/pragma/api/src/uploads/uploads.core.ts` follows it and scores 100% only
because its own test imports it first. That is luck, and it flips the day
another suite imports it earlier. This is not eradicated.

**Proposed:** fix the blueprint, not one follower. Move the table inside the
function in `apps/last-loop-lepin/api/src/auth/auth.core.ts`, typed
`Readonly<Record<Union, Value>>` as `media.core.ts` now is, so a missing case
still fails to compile. Today's source derives its return type from the
module-level table (`AuthDenialStatus`), so that type would be declared
instead. Then migrate each follower that keeps a module-level table. The shape
that lets a foreign suite be charged would no longer be the one to copy.

**Similar instances:** `grep -rn '@FollowsBlueprint core-lookup-table' apps`
lists the followers. `uploads.core.ts` is the one with the same
import-from-another-suite exposure found in this sweep.
