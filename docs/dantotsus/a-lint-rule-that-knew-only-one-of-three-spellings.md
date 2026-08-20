---
date: 2026-08-14
introduced-at: conception
detected-at: review
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/46
fix-pr: https://github.com/hugoleborso/borso.fr/pull/46
fix-commits: [f4e1247]
eradication-level: 1
time-to-detect: months
tags: [eslint, gates, architecture, code-quality, process]
blueprints: [test-lint-rule]
---

# The lint rule knew one of the three ways to name a module

## Symptom

Hugo, reading `edition.controller.ts` in review:

> *Why does a controller do `getDatabase()` ?*

Every controller in `last-loop-lepin` opened the database and threaded the
handle down through the service into the repository — twenty-five call sites,
sixty-eight parameters. `borso/no-database-client-outside-repository` exists
precisely to stop that, it was enabled on `apps/*/api/src/**/*.ts`, and it was
green.

## Root-cause chain

1. **Why did every controller import the database client?**
   Because it could: five services carried
   `export { getDatabase } from '../database/client'`, so the controller
   imported it from `./edition.service`.

2. **Why did the rule not report the services?**
   Its `create` returned `{ ImportDeclaration(node) { … } }`. A re-export is an
   `ExportNamedDeclaration`, a different node type, so the visitor never ran on
   it.

3. **Why did the rule not report the controllers?**
   Its pattern matches the *source string* `…/database/client`. The controllers
   import from `./edition.service`, which does not match. The hole is open at
   both ends: the statement that launders the client is invisible, and the
   statement that consumes the laundered client looks innocent.

4. **Why did nobody notice the visitor was partial?**
   Because the rule's `RuleTester` suite tested only what the rule handled. Ten
   cases, all `import …`. A suite written from the implementation confirms the
   implementation.

5. **Why was the rule written against one node type in the first place?**
   Because "import" is the word we use for the concept, and ESLint has a node
   named `ImportDeclaration`. The name of the node matched the name of the
   idea, which is exactly when you stop looking for the other spellings.

**Root cause:** thought *a rule about which files may reach which other files
is a rule about imports*, actually *it is a rule about **module sources**, and
three node types carry one* — `ImportDeclaration`, `ExportNamedDeclaration`
and `ExportAllDeclaration`.

## Detection failure causes

- **Typing:** none available. ESLint visitor keys are strings; omitting one is
  not a type error.
- **Linter / static analysis:** the rule *is* the linter. Nothing lints a lint
  rule for completeness of its visitor set.
- **Functional validation locally:** the code worked. Threading a handle that
  every layer ignores changes no behaviour, which is why it survived months.
- **CI:** green, for the same reason.
- **Code review:** this is how it was finally caught, by a human reading one
  controller — a year of pushes after the rule landed.

The sibling rule failed the same way at the same time and was found in the same
review pass: `borso/no-query-hooks-outside-organisms` matched four literal
TanStack hook names, while standard 06 puts every wrapper in `lib/queries/`, so
the three molecules that actually fetched called `useSongSearch` and passed.
Same shape: **the rule recognised one spelling of a multi-spelling concept.**

## Countermeasure

- **Code:** commit `f4e1247` — the rule visits re-exports too, a type-only
  re-export stays allowed for the same reason a type-only import is, and the
  sixty-eight threaded parameters are gone; repositories call `getDatabase()`
  themselves, which is the shape `pragma` already had.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #46](https://github.com/hugoleborso/borso.fr/pull/46) ·
this kaizen PR's commits

**The actual fix:** rule authors no longer write visitor keys for module
sources at all. `eslint-rules/module-source.js` owns the mapping, so a rule
that cares about "which module does this file reach" gets all three node types
by construction and cannot cover only one.

```diff
+export function onEveryModuleSource(visitSource) {
+  function visit(node) {
+    const source = node.source?.value;
+    if (typeof source !== 'string') return;
+    visitSource(source, node);
+  }
+  return {
+    ImportDeclaration: visit,
+    ExportNamedDeclaration: visit,
+    ExportAllDeclaration: visit,
+  };
+}
```

```diff
-    return {
-      ImportDeclaration(node) {
-        const source = node.source.value;
-        if (typeof source !== 'string') return;
-        if (CROSS_SLICE_REPOSITORY_PATTERN.test(source)) {
-          context.report({ node: node.source, messageId: 'crossSliceRepository' });
-        }
-      },
-    };
+    return onEveryModuleSource((source, node) => {
+      if (CROSS_SLICE_REPOSITORY_PATTERN.test(source)) {
+        context.report({ node: node.source, messageId: 'crossSliceRepository' });
+      }
+    });
```

**Sibling defects swept:** three rules were vulnerable to the identical
laundering and are now covered, each with the re-export cases added to its
`RuleTester` suite:

| Rule | What a re-export could have hidden |
|------|------------------------------------|
| `borso/atomic-design-import-direction` | an atom re-exporting a molecule, creating the coupling the arrow forbids |
| `borso/no-controller-imports-outside-service` | a controller reaching past the service to the repository |
| `borso/no-cross-slice-repository-imports` | one slice handing another slice's repository to everyone downstream |

`borso/no-vendor-sdk-outside-adapter` was moved to the shared visitor for
consistency. Two rules were checked and left alone with a reason:
`borso/atomic-design-composition` counts imports as evidence of composition, so
a re-export cannot make a non-composing file pass; `borso/no-component-css-imports`
guards a side-effect import that has no re-export form.

Repository-wide `eslint .` after widening all four: **zero new violations**,
which is the evidence that the rules were not merely unenforced but genuinely
un-violated everywhere except the path this PR fixed.

## See also

- [`docs/dantotsus/a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
  — the same disease one layer up: the gate ran and asserted nothing.
- [`docs/standards/12-linting-and-gates.md`](../standards/12-linting-and-gates.md)
- [`docs/standards/04-backend-architecture.md`](../standards/04-backend-architecture.md)
