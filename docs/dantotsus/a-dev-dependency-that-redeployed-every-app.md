---
date: 2026-10-10
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#151'
fix-pr: '#154'
fix-commits: [e4e34d2]
eradication-level: 2
time-to-detect: minutes
tags: [ci, github-actions, pnpm, deploy]
---

# A dev dependency that redeployed every app

## Symptom

PR #151 added Playwright as a dev dependency of `apps/pragma` only. Its
preview run deployed `banana-rush` too, and its merge deployed all six apps to
prod. The operator asked: « Why does a development dep launch a redeploy of all
apps? »

## Root-cause chain

1. **Why did every app deploy?** The change touched `pnpm-lock.yaml` and
   `pnpm-workspace.yaml`, which match the `deps` key of
   `.github/path-filters.yml`, and `deploy.yml` and `preview.yml` treated `deps`
   as a fan-out to every app.
2. **Why a fan-out?** `deps` was added after a React bump merged without any
   app suite running ([the earlier dantotsu](./a-dependency-bump-that-no-app-filter-could-see.md)).
   A catalog entry names no app, so "every app" was the only safe answer a path
   filter could give.
3. **Why could a path filter not do better?** It sees which files changed, and
   the lockfile is one file that every app's versions live in. Which app a
   change reaches is in the lockfile's graph, not in its path.

**Root cause:** we thought a dependency file change could only be mapped to
apps by its path, and actually the lockfile already records, per app, the full
set of versions it resolves.

## Detection failure causes

- **CI:** an extra deploy is a success, so nothing fails; each run is green.
- **Code review:** the fan-out was the reviewed fix for the opposite defect,
  so it read as deliberate.
- **Operator:** saw it on the deploy list and asked.

## Countermeasure

- **Code:** commit `e4e34d2` — the workflows ask the lockfile which apps moved.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a CI script decides the deploy set from the
resolved graph)

**Reference:** [PR #154](https://github.com/hugoleborso/borso.fr/pull/154) · commit `e4e34d2`

**The actual fix:**

```diff
-          if jq -e 'index("infra") or index("deps")' <<<"$CHANGES" >/dev/null; then
+          if jq -e 'index("infra")' <<<"$CHANGES" >/dev/null; then
 ...
+          if jq -e 'index("deps")' <<<"$CHANGES" >/dev/null; then
+            mapfile -t candidates < <(jq -r '.[]' <<<"$all_apps")
+            moved=$(pnpm exec tsx scripts/dependencies/apps-with-changed-dependencies.ts \
+              changed "$BASE" "${candidates[@]}") || moved="$all_apps"
```

`dependency-closure.core.ts` (100% coverage and mutation score) parses the
lockfile, walks each app's importer, the workspace packages it links and every
snapshot reachable from them, and digests the result together with the root
importer, the lockfile settings, `pnpm-workspace.yaml` without its catalogs and
the root `packageManager`, `pnpm` and `engines` fields. An app deploys when its
digest differs from the base. Anything the script cannot read falls back to
every app.

Replayed over past merges: #151 deploys `pragma` only; the Spotify ISRC change
`pragma` only; the aws-cdk bump four apps; an eslint bump still all six,
because the root importer is in every digest — Node resolves upward into the
root `node_modules`, so an app can use a root tool without declaring it.

**Library considered:** the `yaml` package parses the lockfile properly. It is
only a transitive dependency here, and adding a direct one is an ADR trigger;
`scripts/dependencies/check-dependency-catalog.ts` already reads
`pnpm-workspace.yaml` line by line, so the parser follows that precedent.
`pnpm ls --lockfile-only` does not exist in pnpm 10.0.0 (tried 2026-10-10).

**Sibling defects swept:** `ci.yml` keeps the full fan-out on purpose: a
dependency change should still run every suite.

## See also

- [`a-dependency-bump-that-no-app-filter-could-see.md`](./a-dependency-bump-that-no-app-filter-could-see.md)
- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md)
