---
date: 2026-10-06
introduced-at: conception
detected-at: local
severity: low
related-pr: '#136'
fix-commits: [a1ca9efee5]
eradication-level: 1
eradication-paths: [.claude/skills/blueprint/blueprint-indexing.ts]
time-to-detect: minutes
tags: [pre-commit, gates, generated-files, blueprints, harness]
zone: .husky/pre-commit
recurs: [a-generated-file-cannot-contain-its-own-commit]
---

# The gate that refused its own output

## User impact

Pre-commit refused two correct commits on PR #136. Running the generator and
committing again passed.

| | Seen | Expected |
| --- | --- | --- |
| Two commits on PR #136 | `blueprint-index.md is out of date` and `[pre-commit] ERROR: generated files are stale` | the commit accepted, since nothing in it was wrong |
| A third commit | the same "generated files are stale" heading for `convention-drift.ts` | a heading that names the real reason, a naming decision on `instrument-glyphs.tsx` |

<details><summary>The refusal</summary>

```
.claude/skills/blueprint/blueprint-index.md is out of date. Run `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts`.
1 blueprint annotation problem(s).
[pre-commit] ERROR: generated files are stale. Run all of these, then commit again:
  pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts
```

</details>

## Causal chain

- Pre-commit refused the commit.
  - `blueprint-indexing.ts --check` compared the index on disk with the index it would generate, and they differed.
    - The commit added source files, so the index the tree produces changed. The copy on disk was written at session start.
    - The comparison was still in `--check`:

```ts
const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
if (onDisk !== markdown) {
  problems.push(`${...} is out of date. Run ...`);   // compares against an output nobody commits
}
```

      - Commit `f2fa6f626` wrote it while the index was committed, when a stale committed copy was a real mistake.
      - Commit `9326a890a` (ADR-2026-08-20T1031) stopped committing generated files. It took `blueprint-heatmap.ts` and `rule-provenance.ts` off the commit because their check only compared. It kept `blueprint-indexing.ts --check` whole because it also validates annotations. Its message says "`--check` no longer detects staleness anywhere."

## Root cause of occurrence

*Thought the sweep had removed the byte comparison from every `--check`,
actually it sorted generators by whether their check did anything besides
compare, so a check that both validated and compared kept its comparison.*
(Method)

The sweep's unit was the generator, not the comparison line. The commit
message of `9326a890a` states the belief: "It kept every validation a person
can fail [...] and lost the byte comparison, whose subject no longer exists."
Had the sweep searched for each comparison (`grep -rn 'is out of date'`), it
would have removed this one in the same commit.

## Detection failure causes

- **CI:** CI regenerates every output before checking, so the comparison always passes there. Only a local commit, where the output is as old as the session, could see it fail.
- **Review of `9326a890a`:** it checked the list of generators taken off the commit, not the lines left in the ones kept.
- **Pre-commit heading:** it called every refusal "stale", so a refusal for a real naming problem read as the same noise.

## Countermeasure

Commit `a1ca9ef` (PR #141). A passing `--check` writes the index instead of
comparing it. The pre-commit rejection heading no longer calls every refusal
"stale".

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

## Eradication

**Type:** structural impossibility (level 1), for `blueprint-indexing.ts`

**Reference:** commit `a1ca9ef`. `.claude/skills/blueprint/blueprint-indexing.ts:349-360`
still holds it (read 2026-11-27). The check has no comparison left, so it
cannot refuse a stale index. It refuses only what a person wrote wrong: an
annotation missing a tag, a follower naming no blueprint, a marker detached
from its subject. `.husky/pre-commit:222` and `.github/workflows/ci.yml:191`
run it.

**Proof it can fail:** not replanted this session. The refusal above is the
before state, and the code no longer reads `OUTPUT_FILE` under `--check`.

**What stays possible:** `.claude/skills/blueprint/blueprint-heatmap.ts:136-145`
still compares its output on disk under `--check`. No caller passes `--check`
today (`grep -rn 'heatmap.ts.*--check'` over scripts, hooks and workflows
finds none; `pages.yml` and `scripts/reports.sh` run it bare). The next caller
that wires it into a gate repeats this defect.

**Proposed:** delete the `isCheckOnly` branch of `blueprint-heatmap.ts`. It
has no caller, and with it gone no generator in the repository compares
against an output nobody commits, so no future caller can wire one in.

**Similar instances:** `grep -rln 'is out of date\|is up to date' scripts .claude`
finds only `blueprint-heatmap.ts` (measured 2026-11-27).
