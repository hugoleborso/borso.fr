---
date: 2026-11-13
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#324'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/blueprints/subjects.core.ts, .claude/skills/blueprint/blueprint-indexing.ts]
time-to-detect: days
tags: [gates, blueprints, meta, tooling]
zone: scripts/blueprints/subjects.core.ts
weak-point: gate-measures-nothing
recurs: none (the earlier gate-measures-nothing entries each fix a different gate; this one is the subject baseline's)
---

# The subject baseline that forgot nothing

## User impact

The technical validator of PR #324 could not tell whether the branch was clean.

| | Seen | Expected |
| --- | --- | --- |
| `blueprint-indexing.ts --check` on PR #324 | exit 0 | a refusal naming the five files the branch deleted |
| `docs/standards/blueprint-subjects.json` on `main` after the merge | 16 entries for files that no longer exist (measured, `fs.existsSync` over every key) | none |
| The validator's report | a friction line asking whether stale entries are a defect | no question to ask |

The 16 entries came from three pull requests: #234 deleted the pragma streak files on 2026-10-29, #292 deleted `CounterPill.tsx` and the today organisms on 2026-11-12, and #324 deleted the Message screen (measured, `git log --diff-filter=D`).

## Causal chain

- The validator saw stale entries and a green check.
  - `listSubjectDrift` only reported claims that moved inside a file that
    still carries a marker.
    - `listDetachedClaims` skipped a recorded file with no current claim,
      pinned by the test *reports nothing when the whole file is gone*.
      ← the faulty line, `scripts/blueprints/subjects.core.ts`

      ```ts
      const subjectsNow = claimedNow[filePath];
      // a deleted file has no claims now, so its recorded entry is never read again
      if (subjectsNow === undefined) continue;
      ```

      - An agent wrote it in `ff9e8e97b` ("fail the blueprint subject gate
        only on a claim that detached", 2026-08-21). The same commit rekeyed
        the baseline by file. Its message: "A rename or a deletion takes the
        symbol with it and passes".
        - The gate had just failed a merge of `main` for a change that moved
          no marker, so the commit narrowed it to the one defect it was built
          for, a marker that slides onto a new declaration (`3583040f9`).
          - **Machine:** `docs/standards/blueprint-subjects.json` is a second,
            committed copy of what the markers already state, keyed by file
            path. A copy keyed by path outlives a deleted file unless someone
            prunes it, and only `--accept <path>` prunes, path by path.

## Root cause of occurrence

*Thought a file with no marker left has nothing to guard, actually the
baseline is a committed document, and an entry nobody can match misleads every
reader of it.* **Machine:** the design keeps a path-keyed copy of the markers
beside the markers, so deletion and pruning are two separate acts.

`ff9e8e97b`'s message shows the belief: a deletion "takes the symbol with it
and passes". It took the symbol out of the check and left the entry in the
file.

## Detection failure causes

- **CI:** `ci.yml` runs `--check`, which had no rule for an entry without a file.
- **Review:** three pull requests deleted marked files, and none of their validators read the baseline. The fourth validator did and logged it.

## Countermeasure

`listVanishedFiles` returns every recorded file that carries no marker now. `--check` refuses each one with the command that drops it, `--accept <path>`. The 16 stale entries are dropped with that command in the same commit.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the kaizen pull request of PR #324, this commit.

```diff
-  return listDetachedClaims(recorded, toMarkerClaims(followers), (filePath, subject) =>
-    hasDeclarationOf(fs.readFileSync(path.join(REPOSITORY_ROOT, filePath), 'utf8'), subject),
-  ).map(describeDetachedClaim);
+  const claims = toMarkerClaims(followers);
+  return [
+    ...listVanishedFiles(recorded, claims).map(describeVanishedFile),
+    ...listDetachedClaims(recorded, claims, (filePath, subject) =>
+      hasDeclarationOf(fs.readFileSync(path.join(REPOSITORY_ROOT, filePath), 'utf8'), subject),
+    ).map(describeDetachedClaim),
+  ];
```

A structural fix was weighed and rejected. Rewriting the baseline on every plain run would drop the entries, but `scripts/reports.sh` runs that mode, and a report run would then leave a diff in a committed file.

**Proof it can fail:** on `main` with the 16 entries still in place, `--check` printed 16 refusals, ending with

```
  apps/talos/site/src/routes/MessagePage.tsx: docs/standards/blueprint-subjects.json still records markers for this file, which no longer carries any, or no longer exists. Drop the entry in the same commit: `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --accept apps/talos/site/src/routes/MessagePage.tsx`.

16 blueprint annotation problem(s).
```

After `--accept` on those paths, `--check` exits 0. Stryker scores `subjects.core.ts` 100 (77 killed, 0 survived).

**Proposed:** remove the baseline. The marker carries its subject,
`// @FollowsBlueprint <id> <subject>`, and `--check` compares that subject with
the next declaration through the existing `hasDeclarationOf` in
`.claude/skills/blueprint/blueprint-utils.ts`. A deleted file takes its claim
with it, a slid marker is still refused by name, and there is no committed copy
to drift or to prune. `listVanishedFiles`, `acceptSubjects` and
`docs/standards/blueprint-subjects.json` would all go.

**Similar instances:** `ls docs/standards/*.json` lists one other baseline, `convention-baseline.json`. It counts violations by rule and app, holds no file path, and so cannot outlive a deleted file (measured).
