---
date: 2026-05-25
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#27'
fix-commits: [e138811ba9, 9dcf74547]
eradication-level: 5
eradication-paths: [.oxfmtrc.json]
time-to-detect: 30m
tags: [biome, formatter, drizzle, dsql, knip, deps, last-loop-lepin]
zone: apps/last-loop-lepin/api/src/database/migrations
---

# Biome reformatted drizzle's JSON snapshots and broke knip

## User impact

The operator's CI went red on PR #27 with no source change to explain it.
Right after `pnpm exec biome check --write` ran over the repository, knip
reported 33 unused exports and 3 unused files (`api/src/main.ts`,
`cdk/bin/cdk.ts`, `commitlint.config.js`), measured then.

| | Seen | Expected |
| --- | --- | --- |
| knip after a repository-wide format | 33 unused exports, 3 unused files, in files the change did not touch | knip clean, as before the format |

## Causal chain

- knip flipped from clean to 36 findings with no TypeScript change.
  - The format rewrote drizzle-kit's snapshots, `apps/last-loop-lepin/api/src/database/migrations/meta/*.json`, collapsing their arrays (commit `e138811`'s message). Bisecting showed that reverting only those files restored knip (measured then). Which part of knip read the new layout differently was not traced (unknown).
    - Biome's scope included the generated directory.

      ```jsonc
      "files": { "includes": ["**", "!docs"] } // ❌ drizzle-kit's meta/ is in scope
      ```

      - The formatter learned which files were generated from a hand-kept exclusion list. drizzle-kit wrote its snapshots into `migrations/meta`, and nothing told the list when a generator added a directory. (Machine)

## Root cause of occurrence

*Thought the formatter touched only hand-written files, actually it formats every file its include list matches, and a generator's output is in scope until someone excludes it by hand.*

Machine. The tool has no notion of a generated file. The only link between
drizzle-kit and the formatter was a list a person had to remember to update,
and `--write` over the whole repository was the first run to reach that
directory.

## Detection failure causes

- **Linter:** `biome lint` ignores layout, so the directory's presence in scope stayed invisible until `biome check --write` ran.
- **CI:** knip was green only because nothing had touched the snapshots yet.
- **Review:** a reformat of large JSON files is illegible, and reviewers skim past it.
- **Tooling:** drizzle-kit, Biome and knip share no marker for "generated, do not touch".

## Countermeasure

Commit `e138811` reverted the snapshot reformats and excluded
`**/migrations/meta` from Biome, in the root `biome.jsonc` and in
`apps/last-loop-lepin/biome.jsonc`. knip returned to clean.

## Eradication

**Type:** knowledge (level 5). A glob in a hand-kept ignore list keeps the
formatter off drizzle snapshots in every app. A list kept by hand is not an
eradication of the class, so the level is the floor.

**Reference:** commit `314f24821` (2026-08-08) removed Biome. Commit
`9dcf74547` (2026-10-27) moved formatting to oxfmt. The exclusion lives today
in `ignorePatterns` of `.oxfmtrc.json`, as `apps/*/api/src/database/migrations/meta`,
so it covers every app's snapshots. The original entry's status note named a
`.prettierignore`. No such file exists today.

**Proof it can fail:** asking oxfmt to check a snapshot (measured on
2026-11-27):

```
$ node_modules/.bin/oxfmt --check apps/banana-rush/api/src/database/migrations/meta/0000_snapshot.json
Expected at least one target file. All matched files may have been excluded by ignore rules.
```

The class is still held by hand. `.oxfmtrc.json` lists other generated paths
next to the snapshots, such as `openings.json` and the architecture pages, and
a new generator's output is formatted until someone adds it.

**Proposed:** remove the hand-kept list. Either each generator formats what it
writes, for example `"db:generate": "drizzle-kit generate && oxfmt <meta dir>"`,
so the formatter has nothing to change in generated files. Or a
`.gitattributes` file marks generated paths `linguist-generated`, and the
formatter's ignore list is derived from it in one place. Neither exists yet,
and whether drizzle-kit accepts reformatted snapshots on its next run is
untested. Either would make a new generated directory safe by default.

**Similar instances:** `grep -h 'drizzle-kit generate' apps/*/package.json`
finds the generator in each full-stack app, all covered by the `apps/*` glob.
`ls .gitattributes` finds no file.
