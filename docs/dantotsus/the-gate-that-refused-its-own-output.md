---
date: 2026-10-06
introduced-at: conception
detected-at: local
severity: low
related-pr: '#136'
fix-pr: '#141'
fix-commits: [a1ca9efee5]
eradication-level: 1
eradication-paths: [.claude/skills/blueprint/blueprint-indexing.ts]
time-to-detect: minutes
tags: [pre-commit, gates, generated-files, blueprints, harness]
zone: .husky/pre-commit
recurs: [a-generated-file-cannot-contain-its-own-commit]
---

# The gate that refused its own output

## Symptom

Two commits on PR #136 were refused by pre-commit with:

```
.claude/skills/blueprint/blueprint-index.md is out of date. Run `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts`.
1 blueprint annotation problem(s).
[pre-commit] ERROR: generated files are stale. Run all of these, then commit again:
  pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts
```

Nothing in either commit was wrong. Running the generator and committing again
passed. A third refusal carried the same "generated files are stale" heading
for `convention-drift.ts`, whose real reason was a naming decision
(`instrument-glyphs.tsx` in a folder of PascalCase atoms), not staleness at all.

## Root-cause chain

1. **Why was the commit refused?** `blueprint-indexing.ts --check` compared the
   index on disk with the index it would generate, and they differed.
2. **Why did they differ?** The commit added source files, so the index the
   tree now produces is new. The copy on disk was written at session start.
3. **Why is a stale copy a refusal?** The comparison was written when the index
   was committed, and a stale committed copy was a real mistake.
4. **Why did it outlive that?** ADR-0014 stopped committing generated files and
   CLAUDE.md now says "`--check` validates; it does not compare". Two
   generators whose check was only a comparison were taken off the commit. This
   one also checks annotations, so it stayed, with its comparison inside it.

**Root cause:** we thought the index check was a check of annotations, but it
was still also a comparison against an output nobody commits, so every commit
that added a source file made it fail.

## Detection failure causes

- **CI:** CI regenerates every output before checking, so the comparison always
  passes there. Only a local commit, where the output is as old as the session,
  could ever see it fail.
- **Code review of ADR-0014:** the review looked for generators whose check did
  nothing but compare, and removed those from pre-commit. A check that did two
  things was kept whole.

## Countermeasure

- **Code:** commit `a1ca9ef` — a passing `--check` rewrites the index instead
  of comparing it, and the pre-commit rejection heading no longer calls every
  refusal "stale".

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Where:** `.claude/skills/blueprint/blueprint-indexing.ts`, `.husky/pre-commit`

**What changed:** the comparison is gone, so the check has no way to refuse a
stale index. It refuses only what a person wrote wrong: an annotation missing a
tag, a follower naming no blueprint, a marker detached from its subject.

**Reference:** [PR #141](https://github.com/hugoleborso/borso.fr/pull/141) · commit `a1ca9ef`

**The actual fix:**

```diff
-    const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
-    if (onDisk !== markdown) {
-      problems.push(`${...} is out of date. Run ...`);
-    }
...
-    process.stdout.write('Annotations are complete and the index is up to date.\n');
+    fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
+    process.stdout.write('Annotations are complete; the index was refreshed.\n');
```

**Sibling defects swept:** `blueprint-context.ts` and `blueprint-heatmap.ts` keep
a comparison in their own `--check`, but pre-commit runs the first without
`--check` and does not run the second, so neither can refuse a commit.

## See also

- [`a-generated-file-cannot-contain-its-own-commit.md`](./a-generated-file-cannot-contain-its-own-commit.md)
- [ADR-0014](../adr/0014-generated-files-are-not-committed.md)
