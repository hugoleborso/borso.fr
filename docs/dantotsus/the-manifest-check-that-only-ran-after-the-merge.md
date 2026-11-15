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
    - `validateExternals` compares an app's tags with
      `scripts/architecture/manifests/<app>.manifest.ts`, and exits 1 on a difference.
      - Nothing on a pull request runs it. `wiki.yml` runs on `push` to `main`
        only, and `architecture.yml` and `pages.yml` run on dispatch.

## Root cause of occurrence

*Thought a check in a workflow guards the code, actually a check that runs
only on `main` guards nothing a pull request can still change.*

`wiki.yml`: `on: push: branches: [main]`. The tag and the manifest live in
different directories, so an agent adding `@DependsOnExternal` to app code has
no reason to open `scripts/architecture/`.

## Detection failure causes

- **Pre-commit and CI:** neither ran `validateExternals`. The only callers
  were the wiki, architecture and pages workflows, none on `pull_request`.
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

**Reference:** this kaizen pull request · commit [self]

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
