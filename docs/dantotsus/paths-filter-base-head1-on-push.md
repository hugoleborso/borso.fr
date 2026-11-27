---
date: 2026-05-02
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#2'
fix-commits: [b13966a29e]
eradication-level: 5
eradication-paths: [.github/workflows/deploy.yml, .github/workflows/ci.yml]
time-to-detect: minutes (first push to main after merging PR #2)
tags: [github-actions, paths-filter, ci]
zone: .github/workflows/deploy.yml
---

# `dorny/paths-filter@v3` with `base: HEAD~1` fails on push events

## User impact

The first merge to `main` shipped nothing to production. The `detect` job of
`deploy.yml` aborted before it produced the deploy matrix, so no app deployed and
the `prod` environment gate never fired.

| | Seen | Expected |
| --- | --- | --- |
| First push to `main` after PR #2 | `Searching for merge-base HEAD~1...main` then `git` exit 128, no deploy | the changed apps deploy |

```
Run dorny/paths-filter@v3
Changes will be detected between HEAD~1 and main
Searching for merge-base HEAD~1...main
Error: The process '/usr/bin/git' failed with exit code 128
```

## Causal chain

- The deploy never started.
  - The `detect` job failed with `git` exit 128.
    - paths-filter ran `git fetch --no-tags --depth=2 origin HEAD~1 main`.
      `HEAD~1` is not a name on `origin`, so the fetch failed (measured by
      reading `src/git.ts` at `v3`, `getChangesSinceMergeBase`).
      - paths-filter looked `HEAD~1` up as a ref name with `git show-ref`, and
        found none, so it fell back to fetching it from `origin`. It accepts a
        branch, tag or commit SHA. Its own error text says so: "it's not a
        branch, tag or commit SHA".
        - The faulty line, written by commit `56258c2b01` (PR #2):

          ```yaml
          - uses: dorny/paths-filter@v3
            with:
              filters: .github/path-filters.yml
              base: HEAD~1   # a git revision expression, not a branch, tag or SHA
          ```

          - The same commit's `preview.yml` calls paths-filter with no `base:`.
            The writer added `base:` to `deploy.yml` only, to diff "the latest
            commit" on a push. The action's input contract was not in the
            commit's inputs (inferred, no transcript survives).

## Root cause of occurrence

*Thought `base:` takes any git revision, and that a push event needs one to diff
the latest commit, actually `base:` takes a branch, tag or commit SHA, and on a
push to the branch it already compares against the push's `before` SHA.*
(Material)

`src/main.ts` at `v3`, `getChangedFilesFromGit`: "If base references same branch
it was pushed to, we will do comparison against the previously pushed commit".
Without `base:`, the action defaults it to the default branch, which equals the
pushed branch, so it uses `before`. The action's README held this contract. It
was outside the agent's context when it wrote the line (inferred).

## Detection failure causes

- **Linter:** `actionlint` reads the action's inputs as free strings. A planted
  `base: HEAD~1` under `dorny/paths-filter@v3` exits 0 (measured this session
  with actionlint on a scratch workflow).
- **Pull request runs:** the failing branch of the action runs only on `push`.
  On `pull_request`, `base` is the PR base branch, which resolves. Every run
  before the merge took the path that works.
- **Local validation:** GitHub Actions does not run locally.

## Countermeasure

Commit `b13966a29e` deletes `base: HEAD~1` from `deploy.yml`. The action's own
push default takes over and compares against `github.event.before`. The
countermeasure removes a line rather than fixing its value.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`b13966a29e`](https://github.com/hugoleborso/borso.fr/commit/b13966a29e).
A comment beside the paths-filter step in `deploy.yml` and above the `detect`
job in `ci.yml` says not to set `base:`. The entry first claimed level 2 through `actionlint` in
pre-push (commit `181f2667ac`). `actionlint` does not refuse this input, so that
claim is withdrawn. Only the comments hold.

```diff
       filters: .github/path-filters.yml
-      base: HEAD~1
+      # (a comment saying paths-filter defaults to github.event.before on push)
```

**Proof it can fail:** none today. Nothing refuses a `base:` put back.

**Proposed:** a `check_paths_filter_base` function in `.husky/pre-commit`, in
the style of `check_pnpm_reserved_names`, that greps every `dorny/paths-filter`
step under `.github/workflows/` and refuses one that sets `base:`. A revision
expression in that input could then never reach `main`. No workflow here needs
`base:`, so the check refuses the key itself rather than parsing its value.

**Similar instances:** `grep -rn 'dorny/paths-filter' .github/workflows/` finds
the steps in `ci.yml`, `deploy.yml` and `preview.yml`. None sets `base:` today
(measured with `grep -rn '^ *base:' .github/workflows/`).
