---
date: 2026-08-14
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#46'
fix-commits: [f4e1247bf1, 82b1b6f4f]
eradication-level: 4
eradication-paths: [eslint-rules/module-source.js, eslint-rules/no-database-client-outside-repository.test.js, eslint-rules/no-cross-slice-repository-imports.test.js, eslint-rules/no-controller-imports-outside-service.test.js, eslint-rules/atomic-design-import-direction.test.js, eslint-rules/no-vendor-sdk-outside-adapter.test.js]
time-to-detect: days
tags: [eslint, gates, architecture, code-quality, process]
zone: eslint-rules
recurs: [purity-rule-was-wrong-four-times]
blueprints: [test-lint-rule]
---

# The lint rule knew one of the three ways to name a module

## User impact

The operator, reading `edition.controller.ts` in review, asked: *"Why does a
controller do `getDatabase()`?"*

| | Seen | Expected |
| --- | --- | --- |
| last-loop-lepin API layering | Every controller opened the database and threaded the handle through the service into the repository: 25 call sites, 68 parameters (counted in `f4e1247bf`) | Only repositories open the database |
| `borso/no-database-client-outside-repository`, enabled on `apps/*/api/src/**/*.ts` | green | a refusal on each service that handed the client out |

## Causal chain

- Every last-loop-lepin controller imported `getDatabase`.
  - Five services re-exported it, so `edition.controller.ts` imported it from `./edition.service`. The controller's source string does not match `…/database/client`, so the rule had nothing to see there.
    - Commit `fcc8e1c30` (2026-08-08, an agent) added `export { getDatabase } from '../database/client';` to four services, and `auth.middleware.ts` moved its import to `auth.service`. Its message gives the reason: "Fixed here by importing it from `auth.service`, which already re-exports it, so the client import is confined to repositories as standard 04 requires." The rule's gap was the route it took to green.
    - The services passed the rule because it visited one node type.

      ```js
      return {
        ImportDeclaration(node) { // ❌ a re-export is an ExportNamedDeclaration, never visited
          const source = node.source.value;
      ```

      - Commit `ff6446f6a` (2026-08-08, an agent) wrote the rule with the `ImportDeclaration` visitor alone.
        - The one module-source rule already in the codebase, `no-controller-imports-outside-service.js`, visited `ImportDeclaration` alone (`git show ff6446f6a^:eslint-rules/no-controller-imports-outside-service.js`, line 45). `git grep -E 'ExportNamedDeclaration|ExportAllDeclaration' ff6446f6a^ -- eslint-rules/` finds nothing. The new rule copied that shape. (Machine)

## Root cause of occurrence

*Thought a rule about which files may reach which modules is a rule about
imports, actually it is a rule about module sources, and three node types carry
one: `ImportDeclaration`, `ExportNamedDeclaration` and `ExportAllDeclaration`.*

Machine. The only example of a module-source rule in `eslint-rules/` visited
imports alone, and no helper owned the mapping. ESTree defines a `source` on
all three declarations, so an `export … from` names a module exactly as an
`import` does. The rule's `RuleTester` suite held ten cases, all `import …`.

## Detection failure causes

- **Typing:** ESLint visitor keys are strings. Omitting one is not a type error.
- **Linter:** the rule is the linter. Nothing checks a rule's visitor set.
- **Tests:** the suite was written from the implementation, so it held only the spelling the rule handled.
- **Local and CI:** threading a handle every layer ignores changes no behaviour, so every suite stayed green.
- **Review:** `fcc8e1c30` reported "no file outside a repository value-importing the database client". That is what the rule measured, so a reader of the message saw a pass.

## Countermeasure

`f4e1247bf` lets each repository call `getDatabase()` itself, as pragma
already did, and removes the 68 threaded parameters. `82b1b6f4f` makes the
rule visit re-exports too. A type-only re-export stays allowed, as a type-only
import is.

## Eradication

**Type:** detection (level 4). The helper is opt-in, so it holds only for the
rules that call it.

**Reference:** commit [`82b1b6f4f`](https://github.com/hugoleborso/borso.fr/commit/82b1b6f4f).

`eslint-rules/module-source.js` owns the mapping. A rule that calls
`onEveryModuleSource` gets all three node types and cannot cover one.

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

Six rules call it today (`grep -l onEveryModuleSource eslint-rules/*.js`), and
each suite carries an `export … from` case that fails if the rule stops seeing
re-exports.

The gap, measured on 2026-11-27. Nothing makes a new rule call the helper. One
day later, `614d75e42` wrote `no-adapter-import-in-pure-module.js` with a bare
`ImportDeclaration` visitor, so `export { x } from './foo.adapter'` in a
`.core.ts` passes. `no-raw-interactive-element.js` (a re-export of a library
overlay) and `no-query-hooks-outside-organisms.js` (a re-export of a query
hook) have the same shape.

**Proposed:** a test beside `eslint-rules/index.js` that reads every rule's
source and refuses an `ImportDeclaration` visitor key in a rule that declares
neither `ExportNamedDeclaration` nor `ExportAllDeclaration` and does not call
`onEveryModuleSource`. A rule with no re-export form, such as
`no-component-css-imports`, then declares the two keys as explicit no-ops, so
the author decides instead of forgetting. It would make a rule that sees one
spelling of a module source impossible to commit. The three rules above would
move to the helper in the same change.

**Proof it can fail:** not run in this rewrite. `82b1b6f4f` added the
re-export cases to four suites. The database-client and `no-api-import-in-site`
suites carry theirs as invalid cases (`grep -n "export.*from" eslint-rules/*.test.js`).

**Similar instances:** `grep -n -E 'ImportDeclaration|Export(Named|All)Declaration' eslint-rules/*.js`
lists the three rules above. `atomic-design-composition` counts imports as
evidence of composition, so a re-export cannot make a file pass, and
`no-component-css-imports` guards a side-effect import with no re-export form.
