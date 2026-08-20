---
date: 2026-08-20
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#49'
fix-pr: '#79'
fix-commits: [fae5f30, bf04c32]
eradication-level: 1
time-to-detect: days
tags: [testing, vitest, gates, ci, last-loop-lepin]
blueprints: [core-lookup-table]
---

# The mutants were judged by the wrong jury

## Symptom

`apps/last-loop-lepin` scored 99.75% on mutation against a break
threshold of 100, exit 1, for four days. Five survivors, all in one
seven-line file:

```
[Survived] StringLiteral  media.core.ts:11  'image/jpeg': 'jpg'  →  'image/jpeg': ""
[Survived] StringLiteral  media.core.ts:12  'image/png': 'png'   →  'image/png': ""
[Survived] StringLiteral  media.core.ts:13  'image/webp': 'webp' →  'image/webp': ""
[Survived] ObjectLiteral  media.core.ts:10  the whole table       →  {}
[Survived] StringLiteral  media.core.ts:16  FALLBACK = 'bin'      →  ""
```

`media.core.test.ts` asserts every one of those strings, and passes.

## Root-cause chain

1. **Why did the mutants survive tests that assert those exact
   strings?**
   Those tests were never run against them. Stryker's JSON report
   names the covering set:
   ```
   coveredBy = ['media.adapter falls back to the deployment region …',
                'media.adapter signs against the region the environment names']
   killedBy  = []
   ```
   Two tests about an AWS signing region, neither of which reads a
   file extension.
2. **Why was the covering set those two tests?**
   The mutants are `static: true` — they live in a module-level
   `const`, so the mutated code runs once, when the module is first
   imported, not when a function is called.
3. **Why does that produce a wrong covering set?**
   Coverage under `coverageAnalysis: 'perTest'` is attributed to
   whichever test was executing at the moment the module first
   loaded. `media.adapter.test.ts` sorts before `media.core.test.ts`,
   `media.adapter.ts` imports `media.core.ts`, so the table was
   initialised during an adapter test and charged to it. By the time
   the core tests ran, the module was cached and recorded nothing.
4. **Why did `ignoreStatic: true` not exclude them?**
   Because Stryker only ignores a static mutant that **no** test
   covers. These had a covering set. It was simply the wrong one, and
   a wrong covering set is indistinguishable from a right one.
5. **Why did the configuration say otherwise?**
   `stryker.shared.js` carried a comment asserting that such a
   mutation "is reported separately and does not fail the gate on its
   own". Nothing had ever tested that claim.

**Root cause:** thought *"a module-level constant is covered by the
tests of the module that declares it"*, actually *it is covered by
whatever test happened to trigger the first import, which on this file
was another suite entirely.*

## Detection failure causes

- **Typing:** not applicable.
- **Linter / static analysis:** no rule relates where a constant is
  declared to which tests will be charged for it.
- **Functional validation locally:** the pre-push mutation gate is
  scoped with `--mutate` to the changed pure files, which *would* have
  included this file on the push that created it. Whether it ran and
  was overridden, or never ran, is not recoverable from the history;
  the gate is skippable with `SKIP_MUTATION_GATE=1`.
- **CI:** `ci.yml` runs coverage per changed app and no mutation at
  all. Coverage was and remains 100% on this file — every line runs,
  which is exactly what mutation testing exists to look past.
- **Code review:** a lookup table with a test per entry reads as
  well-covered, because it is. The gap is in the tool's accounting,
  not the tests.
- **CI backstop:** `full-suite` caught it on the first push and
  reported it to nobody for twenty runs — see
  [`the-backstop-nobody-was-standing-behind.md`](./the-backstop-nobody-was-standing-behind.md).

## Countermeasure

- **Code:** commit `fae5f30` (PR #79) — the table is read inside the
  function that uses it, so its mutants are runtime mutants, covered
  per test, and the three existing assertions kill them.
- **Code:** commit `bf04c32` — the comment in `stryker.shared.js` now
  states what the tool does instead of the opposite.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — the mutants can no longer be static, so
the mis-attribution has nothing to attribute)

**Reference:** [PR #79](https://github.com/hugoleborso/borso.fr/pull/79)
· commits `fae5f30`, `bf04c32`

**The actual fix:**

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

Measured: `media.core.ts` 28.57% with 5 survivors → **100%, 0
survivors**; the app's unscoped run 99.75%/exit 1 → **100.00%/exit 0**;
coverage unchanged at 906 tests, 100% on all four metrics.

**Property this changes:** the table is built per call rather than once
at module load — one small object allocated on each presign request.

**The trade-off, stated plainly.** This is a code shape chosen to suit
the measuring tool, and the `core-lookup-table` blueprint puts the
table at module scope. The blueprint is tagged here in the front
matter for that reason: the pattern as written permits this defect
wherever the module is first imported by another suite. Every other
follower of it should be read with that in mind. The alternative
considered was suppressing the mutants with a Stryker disable comment,
which keeps the blueprint's shape but turns a gate off on the lines it
is meant to guard, and the repository's own convention is to fix the
code before scoping a rule and to scope before disabling.

**Sibling defects swept:** `apps/pragma/api/src/uploads/uploads.core.ts`
has the identical module-level shape and currently scores 100% — it
happens to be imported first by its own test. That is luck, not
design, and it will flip the day another suite imports it earlier.

## See also

- [`the-backstop-nobody-was-standing-behind.md`](./the-backstop-nobody-was-standing-behind.md)
- [`a-mutation-config-a-workspace-file-overruled.md`](./a-mutation-config-a-workspace-file-overruled.md)
  — the previous time this app's mutation gate measured something
  other than what it appeared to.
