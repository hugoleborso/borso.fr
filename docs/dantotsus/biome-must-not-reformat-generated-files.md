---
date: 2026-05-25
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: 27
fix-pr: 27
fix-commits: [82f0e29]
eradication-level: 1
time-to-detect: 30m
tags: [biome, formatter, drizzle, dsql, knip, deps, last-loop-lepin]
---

# Biome reformatted drizzle's JSON snapshots and broke knip

## Symptom

Right after running `pnpm exec biome check --write` over the repo
during PR #27, knip flipped from clean to 33 "unused export"
diagnostics across files that hadn't changed (and 3 "unused
files" : `api/src/main.ts`, `cdk/bin/cdk.ts`,
`commitlint.config.js`). The TS code was untouched.

Bisecting with `git stash` showed the regression was caused by
biome's reformat of `apps/last-loop-lepin/api/src/database/migrations/meta/*.json` —
the drizzle-kit-owned snapshot files that record the cumulative
migration state. Reverting those JSON reformats restored knip to
green.

## Root-cause chain

1. **Why?** Knip saw the reformatted JSONs and couldn't follow
   the same edges it had followed before — its "entry points
   reachable from drizzle config" graph went sideways. Symptom :
   files reachable indirectly became orphans.
2. **Why?** drizzle-kit's `_journal.json` and `meta/*.json` are
   generated artefacts and use a specific JSON layout that drizzle's
   regeneration round-trip expects ; reformatting them is a layout
   change drizzle-kit didn't ask for, and any downstream tool that
   parses them with a more rigid grammar will get a different
   answer.
3. **Why?** Biome's `files.includes` in the root + per-workspace
   `biome.jsonc` didn't exclude `**/migrations/meta` — biome treats
   `*.json` like any other source file by default.

**Root cause:** _thought biome would only touch hand-written files,
actually drizzle-kit-generated JSONs were in scope and biome
happily reformatted them, breaking the downstream tool that relied
on the exact layout drizzle produces._

## Detection failure causes

- **Typing / static analysis:** N/A — JSON reformat is byte-level.
- **Linter:** `biome lint` doesn't surface format-only changes, so
  pre-PR-#27 the drift was invisible. Once `biome check` ran
  (per the formatter-was-not-gated dantotsu), the reformat
  proposal appeared.
- **CI:** Pre-PR knip was green only because the JSONs hadn't
  been touched yet. Knip's "unused export" cascade was caused by
  the reformat, not by source-code change.
- **Code review:** Reformat diffs in JSON are large and
  illegible ; reviewers tend to skim past them.
- **Tooling contract:** drizzle-kit, biome, and knip have no
  shared notion of "these files are generated, don't touch."

## Countermeasure

Exclude `**/migrations/meta` from biome's `files.includes` at the
root + at the per-workspace level :

```jsonc
// biome.jsonc (root)
"files": {
  "includes": ["**", "!docs", "!**/migrations/meta"]
}

// apps/last-loop-lepin/biome.jsonc
"files": {
  "includes": [
    "api/**",
    "site/**",
    "cdk/**",
    "test/**",
    "bin/**",
    "!api/src/database/migrations/meta"
  ]
}
```

After the exclude, drizzle-kit owns the layout of its own
snapshots ; biome stays out ; knip continues to follow the same
graph it always followed.

## Eradication shipped

**Type:** code diff (level 1 — biome can no longer touch the
drizzle-generated files)

**Reference:** PR #27 · commit
[`82f0e29`](https://github.com/hugoleborso/borso.fr/commit/82f0e29)
(`biome.jsonc` + `apps/last-loop-lepin/biome.jsonc` excludes)

**The actual fix:**

```diff
 "files": {
-  "includes": ["**", "!docs"]
+  // drizzle-kit owns the JSON snapshots under `migrations/meta`.
+  // Reformatting them desyncs the regeneration round-trip and
+  // breaks knip's resolution graph.
+  "includes": ["**", "!docs", "!**/migrations/meta"]
 }
```

**Sibling defects swept:** none yet. Future apps that introduce
other generated-file directories (`.next/`, `dist/`, drizzle
journal files for new apps) should mirror the exclude.

## See also

- [`docs/dantotsus/biome-formatter-was-not-gated.md`](./biome-formatter-was-not-gated.md)
  — the prior dantotsu that surfaced this side-effect by adding
  `biome check` to the gates.
- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md)
  — context on drizzle-kit's migration runner & snapshot layout.
