---
date: 2026-10-25
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 5
eradication-paths: [plugins/borso-harness/skills/technical-validation/SKILL.md, plugins/borso-harness/agents/technical-validator.md]
time-to-detect: hours
tags: [standards, review, seals, agents, harness, meta]
zone: plugins/borso-harness/skills/technical-validation
weak-point: prose-stands-in-for-a-check
recurs: [ten-review-rounds-on-a-two-file-bug-fix]
---

# Nine review rounds, each meeting a file for the first time

## Symptom

The takes branch (PR #193) went through nine standards reviews. Rounds one to
six each returned findings; only the last three passed. Of the 41 findings, 22
were older than the branch, and they did not arrive together: round three found
four pre-existing findings and none of the branch's own, round four found four
more in files rounds one to three had sealed, and `VOCABULARY.md` came back
round after round with a few more false sentences until a commit audited every
sentence of it. Five reviewer agents logged the same wall in `KAIZEN.md`
(`standards-reviewer`, `standards-reviewer-2` to `-5`).

## Root-cause chain

1. **Why did each round find something new?** Each fix round edited files to
   close the last round's findings, and an edited file loses its seal, so the
   next round read it whole, often for the first time.
2. **Why was it the first time?** The first review's scope was the files the
   branch had changed so far. The files a fix would reach (a caller, a type, a
   vocabulary entry, a sibling repository) were not in it.
3. **Why did a re-read file still produce findings on lines already read?**
   The reviewer brief asked for each file "in full" but did not say that every
   finding in it had to be reported in that round, and the fix agents fixed the
   quoted line only. A second finding three lines below survived to the next
   round, which then reopened the file again.
4. **Why did the first seals also miss findings in files they did read?** They
   were taken inline by the pipeline's ship agent (`open-pr-01`), which had no
   Agent tool to dispatch the isolated reviewer. It sealed 68 files, several
   carrying findings the isolated review found shortly after.

**Root cause:** thought a review covers the branch by reading what the branch
has changed, actually the branch's real scope is every file it will touch,
and a file read partially, or fixed partially, comes back every round.

## Detection failure causes

- **Linter / static analysis:** the residue a reviewer checks is the part no
  rule can see.
- **CI:** `seal.ts verify` is not wired into CI, and it only says which
  changed files are unsealed, not which files a fix will reach.
- **Code review:** the earlier countermeasure for this class,
  `Introduced` and `Fix size` on each finding, made the rounds legible but did
  not shrink them: it labels a pre-existing finding after it surfaces.

## Countermeasure

- **Code:** `seal.ts scope --base <ref> --plan <plan.md>` prints the reviewable
  files the branch changed plus every reviewable file the plan names, which is
  the first review's scope.
- **Process:** the standards-review skill says the first review on a branch
  passes `plan_path` and reviews that scope; the reviewer brief requires every
  finding in a file to be reported in the round that reads it, and the files a
  finding's fix will reach to be read in the same round; `/implementation`
  gains *Fix rounds*: read each file you edit in full against the ledger's
  reviewer checklist and fix what you find.

## Eradication (mandatory — code-level)

**Type:** detection (level 4) — the scope that used to be assembled from
memory, after the fact, is now a command.

**Reference:** the commit that adds this file.

**The actual fix:**

```diff
+export function selectPlannedPaths(planText: string): readonly string[] {
+  const named = Array.from(planText.matchAll(BACKTICKED_PATH), (match) => match[0].slice(1, -1));
+  return [...new Set(named.filter(isReviewablePath))].sort(…);
+}
+export function mergeReviewScope(changedPaths, plannedPaths): readonly string[] { … }
```

```diff
-1. `git merge-base <base_ref> HEAD`, then `git diff --name-only …`.
+1. List your scope: `pnpm exec tsx scripts/standards/seal.ts scope --base <base_ref>`,
+   adding `--plan <plan_path>` when the brief carries one.
+3. Read each file in full, against every bullet, and report every finding in
+   it in this round.
+3a. For each finding, name every other file its fix will have to edit, and
+   read those files in full in this same round.
```

Run on the takes plan, `seal.ts scope` lists 115 files for the first round,
against the 76 round one reviewed.

**Sibling defects swept:** the reviewer brief said a seal covers only `.ts` and
`.tsx` files while `seal.core.ts` also seals `VOCABULARY.md`; the brief now
says so. The skill and the pipeline contract now say a workflow spawns the
reviewer with `agentType: 'standards-reviewer'`, so round one is not run by the
author of the code.

## See also

- [`ten-review-rounds-on-a-two-file-bug-fix.md`](./ten-review-rounds-on-a-two-file-bug-fix.md) — the earlier entry on the same class, whose labels this one builds on.
- [`the-validator-opened-a-checkout-holding-only-the-plan.md`](./the-validator-opened-a-checkout-holding-only-the-plan.md) — why the first seals were taken inline.

## Superseded mechanism

The seal and the separate standards review were removed on 2026-10-29. The standards checklist is now part of `/technical-validation`, which records the reviewed commit SHA and reviews at most two rounds, the second on the diff since that SHA.
