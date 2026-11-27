---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#327'
fix-commits: [self, 458e886c4]
eradication-level: 1
eradication-paths: [scripts/standards/git-history.adapter.ts, scripts/standards/convention-drift.ts, scripts/standards/hotspots.ts]
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

Reproduced in a scratch worktree, with
`apps/pragma/api/src/compositions/compositions.service.ts` removed and unstaged:

```text
Error: ENOENT: no such file or directory, open '.../apps/pragma/api/src/compositions/compositions.service.ts'
    at readFileFacts (scripts/standards/convention-drift.ts:34:28)
```

## Causal chain

- `convention-drift.ts` threw ENOENT.
  - `readFileFacts` read every path `listSourceFiles` returned.
    - `listSourceFiles` returned `git ls-files`, which lists the index, and
      the index still holds a deleted file until the deletion is staged. The
      line, from `a63f685b9`:

      ```ts
      return execFileSync('git', ['ls-files'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
      ```

      - Commit `a63f685b9` (2026-08-15) wrote it in `scripts/standards/`,
        beside `enforcement-ledger.ts`, whose `listTrackedFiles` used the same
        unfiltered call (`git show a63f685b9^:scripts/standards/enforcement-ledger.ts`).
        - The correct handling existed in the repository, in another language
          and folder. `scripts/check-single-stylesheet.sh` at the same parent
          says "`git ls-files` reads the index, which still lists a file
          deleted in the working tree but not yet staged, so the deletions are
          subtracted." The example in reach carried the mistake, and the
          correct one was not in reach. (Machine)

## Root cause of occurrence

*Thought `git ls-files` lists the files on disk, actually it lists the index.*
(Machine)

The codebase held two listers that disagreed, and the one in the same folder
and language had no filter. Whether `check-single-stylesheet.sh` was in the
writing agent's context is unknown (inferred not, since it sits in another
folder). Had the writer known, `listSourceFiles` would have filtered deleted
paths.

## Detection failure causes

- **Tests:** neither script was a gated module, so no test fed it a dirty
  tree.
- **CI and reports:** both scripts run in `scripts/reports.sh` and CI, where
  the tree is clean and the index matches the disk.

## Countermeasure

Both listers keep only paths that exist on disk. After the change, the same
scratch worktree gives `convention-drift exit 0` and `hotspots exit 0`, with no
ENOENT.

## Eradication

**Type:** structural impossibility (level 1), for the readers that share the
lister

**Reference:** the commit adding this file filtered each lister. Commit
`458e886c4` (PR #411) merged them into one,
`listTrackedSourceFiles` in `scripts/standards/git-history.adapter.ts`, which
both `convention-drift.ts` and `hotspots.ts` call:

```ts
    .filter((path) => !path.endsWith('.d.ts'))
    .filter((path) => existsSync(join(REPOSITORY_ROOT, path)));
```

Neither script can receive a path that is gone from disk. The class is not
eradicated: other readers call `git ls-files` themselves.

**Similar instances:** `grep -rln "'ls-files'" scripts --include=*.ts` lists
seven files (measured). Two read the listed paths with no existence filter:

- `scripts/quality/working-conditions.ts:36` passes
  `git ls-files docs/features` output to `readFileSync`.
- `scripts/wiki/build-wiki.ts:21` passes `git ls-files -z '*.md'` output to
  `readFileSync`.

`check-doc-links.ts` filters with `existsSync`, `architecture-graph.ts`
intersects with `readdirSync`, and the other two list untracked files or do
not read them.

**Proposed:** export one tracked-file lister that drops deleted paths, route
every reader through it, and refuse a raw `ls-files` call outside it with a
rule under `eslint-rules/`. A reader that trusts the index over the disk then
cannot be written.
