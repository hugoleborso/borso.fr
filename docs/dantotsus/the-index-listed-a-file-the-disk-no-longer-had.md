---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#327'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/standards/convention-drift.ts, scripts/standards/hotspots.ts]
time-to-detect: minutes
tags: [tooling, standards, git, generators]
zone: scripts/standards/convention-drift.ts
recurs: none (a-deleted-file-broke-the-records-that-named-it is a record naming a gone path, this is a reader trusting the index over the disk)
---

# The index listed a file the disk no longer had

## User impact

An agent on PR #327 deleted a file and ran the convention report before staging
the deletion. The report crashed:

```text
[compositions] scripts/standards/convention-drift.ts reads git ls-files and crashes with ENOENT on a file deleted in the working tree but not yet staged, so it cannot be run before staging a deletion.
```

Reproduced this session in a scratch worktree, with
`apps/pragma/api/src/compositions/compositions.service.ts` removed and unstaged:

```text
Error: ENOENT: no such file or directory, open '.../apps/pragma/api/src/compositions/compositions.service.ts'
    at readFileFacts (scripts/standards/convention-drift.ts:34:28)
```

## Causal chain

- `convention-drift.ts` threw ENOENT.
  - `readFileFacts` read every path `listSourceFiles` returned.
    - `listSourceFiles` returns `git ls-files`, which lists the index, and the
      index still holds a deletion until it is staged.

## Root cause of occurrence

*Thought `git ls-files` lists the files on disk, actually it lists the index.*

`hotspots.ts` had the same reader and the same crash.

## Detection failure causes

- **Tests:** neither script is a gated module. Both run in `scripts/reports.sh`
  and CI, where the tree is clean.

## Countermeasure

Both listers keep only paths that exist on disk.

## Eradication

**Type:** structural impossibility (level 1). Neither script reads a path it has
not seen on disk.

**Reference:** this kaizen pull request · commit `self`

```diff
     .filter((path) => !path.endsWith('.d.ts'))
+    .filter((path) => existsSync(join(REPOSITORY_ROOT, path)));
```

After the change, the same scratch worktree with the same unstaged deletion
gives `convention-drift exit 0` and `hotspots exit 0`, with no ENOENT.

Related entries:

- [`a-deleted-file-broke-the-records-that-named-it`](./a-deleted-file-broke-the-records-that-named-it.md)
