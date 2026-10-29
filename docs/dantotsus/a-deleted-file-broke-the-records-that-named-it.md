---
date: 2026-10-29
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#224'
fix-pr: none (opened by the kaizen pull request for #216 and #231)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/quality/dantotsu-corpus.ts, scripts/quality/weak-points.ts, scripts/quality/check-dantotsu-front-matter.ts]
time-to-detect: days
tags: [gates, quality, self-improvement-loop, generators, meta]
zone: scripts/quality/weak-points.ts
recurs: none (the first entry where two readers of one record disagreed on what a path is)
---

# A deleted file broke the records that named it

## Symptom

On 2026-10-29 `scripts/reports.sh all` failed on `main` (friction log
`docs/features/pragma/ux-redesign/kaizen.md`, `merge-main`, 08:23):

```text
  the-tap-that-was-a-mouse-press: zone scripts/argent.sh names no path in the repository
  the-wrapper-forgot-the-user-agent-between-calls: zone scripts/browser.sh names no path in the repository
```

PR #224 had deleted `scripts/argent.sh`, `scripts/browser.sh` and four gate
scripts. Nine dantotsus named one of them in `zone:`. PR #216 then rewrote the
nine zones to files the defects never lived in, such as `scripts/phone.sh` and
`.husky/pre-commit`, so the weak-point map now placed nine past defects in the
wrong place.

## Root-cause chain

1. **Why did `reports.sh` fail?** `weak-points.ts` checked each zone against
   `git ls-files`, the files present now.
2. **Why was that wrong?** A zone records where a defect lived. A file that held
   a defect is often deleted later, by the very fix the entry describes.
3. **Why did the commit hook not see it?** `check-dantotsu-front-matter.ts`
   resolved paths against every file the history ever added. Two readers of the
   same field held two definitions of "a path in the repository", and the
   commit only ran the lenient one.
4. **Why did PR #216 rewrite the records instead of the reader?** The error said
   "point the zone at the path where the defect lived", which the zones already
   did. The only way to make it pass was to move them.

**Root cause:** thought a record's path must exist now, actually it must have
existed once.

## Detection failure causes

- **Linter / static analysis:** the commit hook ran the lenient reader, so the
  strict one only ran when somebody built the reports.
- **CI (tests / build):** `pages.yml` runs `weak-points.ts` after a merge, not on
  a pull request, so #224 merged green.
- **Code review:** the deletion and the nine records were in different folders.

## Countermeasure

- **Code:** this commit restores the nine original zones.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the kaizen pull request for #216 and #231 · this commit

**The actual fix:** `readPathsEverTracked` moved into `dantotsu-corpus.ts`, and
both readers call it, so there is one definition and a deletion cannot break a
record.

```diff
-  const problems = selectUnresolvedReferences(dots, readTrackedPaths(), engaged);
+  const problems = selectUnresolvedReferences(dots, readPathsEverTracked(), engaged);
```

Proved once on this branch. With the restored zones, the reader from `main`
refused:

```text
  the-tap-that-was-a-mouse-press: zone scripts/argent.sh names no path in the repository
  the-wrapper-for-driving-previews-could-not-reach-one: zone scripts/argent.sh names no path in the repository
exit 1
```

The shared reader wrote the map with 227 dots and exited 0. A zone that was
never in the repository still fails both readers.

**Sibling defects swept:** the nine zones PR #216 rewrote are restored, including
`EnergyBar.tsx` and the three gates #224 deleted.

## See also

- [`the-link-checker-skipped-the-folder-it-was-trusted-for.md`](./the-link-checker-skipped-the-folder-it-was-trusted-for.md)
- [`the-runner-called-a-script-main-had-deleted.md`](./the-runner-called-a-script-main-had-deleted.md), the same deletion seen from a script
