---
date: 2026-09-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#95'
fix-pr: '#96'
fix-commits: [5d14095]
eradication-level: 2
time-to-detect: minutes
tags: [deps, pnpm, pnpm-scripts, knip, pre-commit, gates, tooling, dependabot]
---

# The bump that turned a script into a version number

## Symptom

Consolidating five Dependabot branches meant applying about forty version
changes across six manifests. Two branches would not `git apply` — their
context had drifted — so the remaining versions were written with a regex keyed
on each package name.

The result, in the root `package.json`:

```diff
   "scripts": {
-    "knip": "knip",
+    "knip": "6.33.0",
```

alongside the intended change in `devDependencies`. `pnpm run knip` would have
tried to execute `6.33.0`.

It was caught by reading the diff, one minute later. Nothing else was going to.

## Root-cause chain

1. **Why did the regex match the script?**
   Because a script and a dependency are the same shape. Both are
   `"<name>": "<string>"`, at the same depth, in the same file. `knip` the
   runner and `knip` the dependency are spelled identically, which is the
   normal case rather than a coincidence — the script is usually named after
   the tool it runs.

2. **Why was a regex used on JSON at all?**
   Because two of five patches failed to apply and the fallback was the fastest
   thing to hand. The fast path was text, and the file is structured.

3. **Why would nothing downstream have caught it?**
   Every consumer reads the binary, not the script. The pre-push gate runs
   `pnpm exec knip`, which resolves `node_modules/.bin/knip` and never opens
   the `scripts` block. CI does the same. Lint, typecheck and the four suites
   do not read `package.json` script values at all.

4. **Why would it have surfaced badly?**
   Only when a human typed `pnpm run knip` and got a shell error naming a
   version number, with no connection to a dependency bump merged weeks
   earlier.

**Root cause:** thought a version string could be rewritten by name because the
name identifies the dependency, actually the name identifies the runner too and
both live in the same manifest with the same shape — so a name-keyed rewrite
edits the scripts block, and no gate in this repository reads a script value.

## Detection failure causes

- **Typing:** `package.json` scripts are strings to everything here.
- **Linter:** ESLint does not lint JSON manifests.
- **CI / pre-push:** both invoke the binary via `pnpm exec`, which bypasses
  `scripts` entirely. The gate that would have used the script is the one gate
  nothing runs.
- **Code review:** it *was* code review that caught it, on a 4000-line lockfile
  diff. That is luck, not a layer.

## Countermeasure

- **Code:** commit `5d14095` — `scripts/check-package-scripts-are-commands.sh`,
  wired into pre-commit.
- **Operator action:** none. Edit manifests with a JSON-aware tool or `pnpm up`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit rejects the shape)

**Reference:** [PR #96](https://github.com/hugoleborso/borso.fr/pull/96) ·
commit [`5d14095`](https://github.com/hugoleborso/borso.fr/commit/5d14095)

Level 1 was considered: forbid text edits to manifests outright. There is no
way to express that — a manifest edit is a file write like any other, and the
legitimate ones are frequent. So the check targets the residue instead, and the
residue is unambiguous: a script whose **whole** value is a bare semver is
never intentional, because no runner is called `1.2.3`. A script that merely
contains a version is left alone.

**The actual fix:**

```diff
+const BARE_SEMVER = /^[~^]?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
+for (const [name, value] of Object.entries(scripts)) {
+  if (typeof value === "string" && BARE_SEMVER.test(value.trim())) {
+    console.log(`${name} -> ${value}`);
+  }
+}
```

Verified both ways: it passes on the clean tree (7 manifests) and fails on the
exact edit PR #95 made, naming `knip -> 6.33.0`.

**Sibling defects swept:** the other five manifests were re-read; no other
script had been rewritten. `docs/standards/13-dependencies.md` gained the rule
and the worked example, because the enforcement ledger refuses a mechanism no
standard explains.

## See also

- [`a-dependency-bump-that-no-app-filter-could-see.md`](./a-dependency-bump-that-no-app-filter-could-see.md)
  — the other way a dependency bump slips past the gates that watch source.
- [`a-sed-delimiter-disarmed-the-mutation-gate.md`](./a-sed-delimiter-disarmed-the-mutation-gate.md)
  — the same family: a text tool aimed at structured content, silently
  disarming something.
- [`../standards/13-dependencies.md`](../standards/13-dependencies.md) — the
  rule this check enforces.
