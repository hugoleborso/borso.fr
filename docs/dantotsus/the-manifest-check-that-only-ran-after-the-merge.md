---
date: 2026-11-14
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#324'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/architecture/architecture-graph.ts, .github/workflows/ci.yml]
time-to-detect: minutes
tags: [ci, github-actions, gates, documentation]
zone: scripts/architecture/manifests
recurs: none (the first entry on the architecture manifests)
---

# The manifest check that only ran after the merge

## User impact

The operator saw `main` red on the wiki workflow for a day, and the wiki
stopped updating. No app was affected.

| | Seen | Expected |
| --- | --- | --- |
| After PR #324 merged, 2026-11-13 19:01 UTC | `wiki` failed on `02755aa1a` and on the six merges after it, until PR #332 (measured, `list_workflow_runs`) | The wiki publishes every merge |
| After PR #321 merged, 2026-11-14 19:34 UTC | `wiki` failed again, on `8b2c78a38`, `efbd3f266` and `9aaf0398a` | The same |

PR #332 fixed the talos half on its way past, and PR #335 the borsouvertures
half. Both were pragma or borsouvertures sessions that noticed a red `main`.

## Causal chain

- The wiki run on `main` exited 1.
  - `architecture-graph.ts --skip-layout` printed
    `@DependsOnExternal aws-dsql in apps/borsouvertures/api/src/database/client.ts names an external system the manifest does not declare.`
    (job `132562985422`), and for talos the same line for `browser-location`.
    - `validateExternals` compared each app's tags with the `externals` of
      `scripts/architecture/manifests/<app>.manifest.ts`, and exited 1 on a
      difference.
      - Commit `02755aa1a` (PR #324) added this tag to talos app code, and PR
        #321 added `aws-dsql` to borsouvertures, without a manifest entry:

        ```ts
        /** @DependsOnExternal browser-location */ // declared here, not in talos.manifest.ts
        ```

        - Each external system is declared twice: once as a tag beside the
          code that calls it, once as an entry with a name and a description
          in the app's manifest, in another directory. The agent wrote the
          copy beside its code.

## Root cause of occurrence

*Thought a check in a workflow guards the code. Actually a check that runs
only on `main` guards nothing a pull request can still change.* (Machine)

The tag is Machine. The tree asked for one fact in two places, the tag in app
code and the entry in `scripts/architecture/manifests/`, and placed the only
comparison of the two after the merge. At `02755aa1a^`, the one standard that
names `@DependsOnExternal`, `docs/standards/00-principles.md` line 80, lists
it among tags tools read, and says nothing about the manifest (measured,
`git grep DependsOnExternal 02755aa1a^ -- docs/standards .claude CLAUDE.md`).

## Detection failure causes

- **Pre-commit and CI:** neither ran `validateExternals`. The only callers
  were the wiki, architecture and pages workflows. `wiki.yml` starts
  `on: push: branches: [main]`, and the other two on dispatch, so both pull
  requests merged green.
- **Review:** the validator reads the diff, and the manifest is not in it.

## Countermeasure

`architecture-graph.ts --check-externals` scans every app's source files and
checks its tags against its manifest, without building the graph. It ran in
3.6 s on this tree (measured, `time`), against 28 s for `--skip-layout`. The
`build` job of `ci.yml` runs it on every pull request.

It stays out of pre-commit. Most commits touch app code, and the check would
add its 3.6 s to them for a defect the pull request's CI already stops.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file. The step is still in the `build`
job of `.github/workflows/ci.yml` today (line 203).

```diff
       - run: pnpm exec tsx scripts/standards/convention-drift.ts --check
+      - run: pnpm exec tsx scripts/architecture/architecture-graph.ts --check-externals
```

Proved on a scratch copy. The borsouvertures manifest from before PR #335
(`git show 7d7a496cc^:…`) made it refuse, then the file was restored:

```text
  @DependsOnExternal aws-dsql in apps/borsouvertures/api/src/database/client.ts names an external system the manifest does not declare.
1 architecture manifest problem(s). Declare the system in scripts/architecture/manifests/<app>.manifest.ts, or drop the tag.
exit 1
```

**Similar instances:** `grep -n "on:" -A3 .github/workflows/wiki.yml` shows
the wiki runs on `push` to `main` and on dispatch only. Its *Build the
reports* and *Build the pages* steps also run `scripts/reports.sh blueprints`,
`scripts/reports.sh standards` and `scripts/wiki/build-wiki.ts`, which can
exit non-zero (`set -euo pipefail` in `reports.sh`, `process.exit(1)` in
`build-wiki.ts`), and none of them runs on a pull request. Whether they can
fail on content a pull request changes is not checked.

**Proposed:** run the wiki's two build steps on pull-request CI, writing to a
temporary folder and skipping the push. Then any failure that today can only
happen after the merge stops the pull request, not just this one check. A
second option subtracts: generate each manifest's external ids from the tags
and keep only the descriptions in the manifest, so a tag without an entry
fails at type-check. That needs a design for where a description lives, so it
is an operator decision.
