---
date: 2026-09-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#95'
fix-commits: [5d140956dd]
eradication-level: 2
eradication-paths: [scripts/check-package-scripts-are-commands.sh]
time-to-detect: minutes
tags: [deps, pnpm, pnpm-scripts, knip, pre-commit, gates, tooling, dependabot]
zone: package.json
---

# The bump that turned a script into a version number

## User impact

The operator, or any session, would have typed `pnpm run knip` after the
Dependabot consolidation of PR #95 and got a shell error naming a version
number, weeks after the bump merged. It was caught by reading the diff, one
minute later, before merge (measured in the session).

| | Seen | Expected |
| --- | --- | --- |
| Root `package.json`, `scripts.knip` after the consolidation | `"knip": "6.33.0"`, so `pnpm run knip` would try to execute `6.33.0` | `"knip": "knip"`, with only `devDependencies.knip` bumped |

Every gate and CI step was unaffected, because they call `pnpm exec knip`.

## Causal chain

- `scripts.knip` became a version number.

  ```diff
     "scripts": {
  -    "knip": "knip",
  +    "knip": "6.33.0",
  ```

  - A regex keyed on each package name rewrote every `"knip": "<string>"` in
    the file, not only the one in `devDependencies`.
    - The session applied about forty version changes across six manifests.
      Two of five Dependabot branches would not `git apply`, because their
      context had drifted, so the rest were written with that regex.
      - The root `package.json` holds literal versions beside its scripts,
        both `"<name>": "<string>"` at the same depth. Today `"knip": "knip"`
        sits at line 13 and `"knip": "6.44.1"` at line 40. A script is
        usually named after the tool it runs, so the two keys collide by
        design (Machine).
        - The pnpm catalog in `pnpm-workspace.yaml`, the one place for
          versions since `b8c1c9e94` (2026-08-15), has no `scripts` block, but
          `check-dependency-catalog.ts` sends there only a dependency that two
          workspaces share. `knip`, used by the root alone, kept its literal
          (Machine).

## Root cause of occurrence

*Thought a version string could be rewritten by name because the name
identifies the dependency, actually the same name keys the script that runs
it, in the same file, with the same shape.* (Machine)

The manifest gives a name-keyed edit two targets. `listCatalogProblems` in
`scripts/dependencies/catalog.core.ts` only reports an uncatalogued name when
more than one workspace declares it (`sharedNames`, line 135), so a
single-workspace tool's version stays beside its script.

## Detection failure causes

- **Typing:** `package.json` scripts are strings to everything here.
- **Linter:** ESLint does not lint JSON manifests.
- **CI / pre-push:** both invoke the binary through `pnpm exec`, which resolves
  `node_modules/.bin/knip` and never opens the `scripts` block. Lint,
  typecheck and the four suites do not read script values at all.
- **Code review:** it caught the edit, on a 4000-line lockfile diff, because
  the reviewer happened to read the manifest hunk. No layer reads a script
  value.

## Countermeasure

The script was restored to `"knip": "knip"` before merge. Commit `5d14095`
added `scripts/check-package-scripts-are-commands.sh`, wired into pre-commit.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #97](https://github.com/hugoleborso/borso.fr/pull/97) ·
commit [`5d14095`](https://github.com/hugoleborso/borso.fr/commit/5d14095)

The check targets the residue. A script whose whole value is a bare semver is
never intentional, because no runner is called `1.2.3`. A script that merely
contains a version is left alone. It runs in `.husky/pre-commit:321` and
`ci.yml:167` today.

```diff
+const BARE_SEMVER = /^[~^]?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
+for (const [name, value] of Object.entries(scripts)) {
+  if (typeof value === "string" && BARE_SEMVER.test(value.trim())) {
+    console.log(`${name} -> ${value}`);
+  }
+}
```

**Proof it can fail:** it passed on the clean tree (7 manifests) and failed on
the exact edit PR #95 made, naming `knip -> 6.33.0` (measured when it shipped).

**Similar instances:** the other five manifests were re-read, and no other
script had been rewritten. Every manifest still holds literal versions beside
the catalog today: a `grep -cE '": "[~^]?[0-9]+\.[0-9]+'` over `package.json`,
`apps/*/package.json` and `infra/*/package.json` counts 17 in the root and 1 to
12 in each other manifest, `"version"` fields included. Each literal whose name
is also a script name is exposed to the same edit. The check only catches a
script whose whole value becomes a version.

**Proposed:** move every literal version into the catalog and make
`scripts/dependencies/check-dependency-catalog.ts` refuse any dependency range
other than `catalog:`, not only for shared names. A name-keyed version edit
would then land in `pnpm-workspace.yaml`, where a name can only be a
dependency, which removes the collision. The bare-semver check would stay as a
backstop.
