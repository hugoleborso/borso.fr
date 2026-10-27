---
summary: 'Stryker imports `typescript` without declaring it, only to rewrite a tsconfig `extends` or `references`; with TypeScript 7 that call fails, so `stryker.shared.js` points `tsconfigFile` at a file that does not exist.'
triggers:
  output:
    - 'parseConfigFileTextToJson is not a function'
    - 'resolveProjectReferencePath is not a function'
  paths:
    - 'stryker.shared.js'
    - '**/stryker.config.js'
---

# Stryker imports `typescript` without declaring it

## Symptom

Every mutation run fails before it mutates anything:

```
TypeError: ts.parseConfigFileTextToJson is not a function
    at TSConfigPreprocessor.rewriteTSConfigFile (.../@stryker-mutator/core/dist/src/sandbox/ts-config-preprocessor.js)
```

## Causal chain

1. Stryker copies the project into a sandbox. Its `TSConfigPreprocessor` then
   opens the file named by the `tsconfigFile` option (default
   `tsconfig.json`) and rewrites any `extends` or `references` path that would
   point outside the sandbox.
2. To read that file it runs `await import('typescript')` and calls
   `parseConfigFileTextToJson` and `resolveProjectReferencePath`. Neither
   `@stryker-mutator/core` 9.6.1 nor 10.1.1 declares `typescript` as a
   dependency or a peer, so `pnpm why typescript` does not list Stryker.
3. TypeScript 7 has no such functions: its package has no stable JavaScript
   API ([ADR-0046](../adr/0046-typescript-7-replaces-typescript-5-9.md)).
4. No `tsconfig.json` in this repository has `extends` or `references`, so the
   rewrite had nothing to change.

## Fix

`stryker.shared.js` sets `tsconfigFile` to a name no workspace has. The
preprocessor finds no such file in the sandbox and returns without importing
TypeScript. The option has no other use in core Stryker; only the TypeScript
checker plugin reads it, and this repository does not install that plugin.

If a `tsconfig.json` ever gains an `extends` or `references` that leaves its
workspace, this stops being free: the sandbox sits under the system temporary
folder, so the relative path would no longer resolve there.
