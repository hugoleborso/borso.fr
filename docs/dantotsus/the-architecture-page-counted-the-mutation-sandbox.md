---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#55'
fix-commits: [f27096f865, 0d7ef5987]
eradication-level: 1
eradication-paths: [stryker.shared.js]
time-to-detect: minutes
tags: [generators, stryker, ci, meta]
zone: scripts/architecture/architecture-graph.ts
blueprints: []
---

# The architecture page counted the mutation sandbox

## User impact

The architecture page, then committed and gated by `--check` in pre-commit, gave two sizes for one unchanged app.

| | Seen | Expected |
| --- | --- | --- |
| borso-fr on a fresh checkout | 70 files | 70 files |
| borso-fr after a push that ran mutation | 210 files, and `--check` failing on a page nobody edited | 70 files, `--check` green |

Measured by rerunning `scripts/architecture/architecture-graph.ts` in both states. The polluted page was regenerated and committed once to make `--check` pass, before the count was questioned.

## Causal chain

- The page counted borso-fr three times over after a push.
  - The generator walked into `apps/<app>/.stryker-tmp/sandbox-*/`, a full copy of the app per sandbox, and parsed its imports as app source.
    - Stryker wrote its sandbox inside the workspace it mutated and left it after a killed run, because `stryker.shared.js` set `tempDirName: '.stryker-tmp'` (Machine).
    - The generator's walk skipped only the directories in this line, written in `d562e9159`:

      ```ts
      const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'cdk.out', '.git', '__fixtures__']);  // ← no .stryker-tmp
      ```

      - The agent listed the directories present in the checkout it worked in. At that commit's parent, `blueprint-indexing.ts:38`, `blueprint-heatmap.ts:39` and `eslint.config.js:56` already skipped `.stryker-tmp`, each in its own hand-kept list (measured, `git grep stryker-tmp d562e9159^`). Nothing points a new walker at them (Material, inferred: the session transcript was not read).

## Root cause of occurrence

*Thought the directories a source walk must skip are the ones a checkout holds. Actually tools write gitignored scratch copies of the source into the tree at run time, and Stryker's sandbox was one, configured inside every workspace by `stryker.shared.js`.* (Material, with Machine behind it)

Every reader of the tree had to know about the sandbox and say so in its own list. Three already did. The fourth was written without that fact. Source: `git show d562e9159^:stryker.shared.js`, line 27, `tempDirName: '.stryker-tmp'`.

## Detection failure causes

- **`git status` and index-based checks:** the sandbox is gitignored, so nothing that reads the index sees it.
- **The other generators:** the blueprint generators skipped `.stryker-tmp`, so three of four generated artefacts stayed right while the fourth doubled.
- **The `--check` failure:** a check failing on a file nobody edited reads as a stale artefact. The obvious response is to regenerate it, which committed the polluted page instead of revealing the cause.

## Countermeasure

`f27096f` added `.stryker-tmp` and `coverage` to the generator's skip list. The generator returned 70 files again.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit [`0d7ef59`](https://github.com/hugoleborso/borso.fr/commit/0d7ef5987), the same day.

```diff
-    tempDirName: '.stryker-tmp',
+    tempDirName: sandboxOutsideTheWorkspace(),
+    cleanTempDir: true,
```

`stryker.shared.js` now puts every sandbox under the OS temp directory, keyed by the workspace path (read today, lines 31-37 and 50-51). No mutation run writes a copy of the source into the tree, so no walker can count one, including walkers not yet written. This is the subtraction the first version of this entry wanted from `git ls-files` and did not reach.

The skip-list entry was the instance fix. It is gone. `SKIPPED_DIRECTORIES` in `scripts/architecture/architecture-graph.ts:44` lists `node_modules`, `dist`, `cdk.out` and `__fixtures__` only, so the generator no longer needs to know about Stryker. `50eb3dbf4` also stopped committing the architecture pages, and CLAUDE.md says they build only on an operator dispatch, so no `--check` flaps on them today.

**Proof it can fail:** `0d7ef59` was reproduced by running coverage and mutation on `infra/cdk` concurrently, before and after. Before, `NodejsFunction`'s asset hash hit `ENOENT` inside the sandbox. After, coverage passed on 21 files and mutation scored 100.00 over 312 mutants (its commit message).

**Similar instances:** `git grep -n "stryker-tmp" -- ':!docs'` finds the old name in `.gitignore`, `.oxlintrc.json`, `tsconfig.json` and comments in three shell gates. They are now dead entries, kept harmless. The blueprint generators no longer list it. Another tool writing a gitignored copy of `.ts` source into the tree would reopen the class for this generator. None does today (inferred from `.gitignore`, whose other entries hold build output, logs and reports, not source copies).
