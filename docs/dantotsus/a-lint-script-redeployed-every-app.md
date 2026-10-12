---
date: 2026-10-12
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#155'
fix-pr: '#155'
fix-commits: []
eradication-level: 1
time-to-detect: minutes
tags: [ci, github-actions, deploy, pnpm]
---

# A lint script that redeployed every app

## Symptom

PR #155 rewrote one line in eight `package.json` files: the `lint` script, now
`../../scripts/lint-workspace.sh`. Its previews rebuilt every app, and its merge
redeployed all six apps to production with code identical to what was already
running. The operator asked why changing a script in `package.json` triggers a
deploy, and whether it needs to.

## Root-cause chain

1. **Why did every app deploy?**
   `.github/path-filters.yml` gives each app the key `apps/<slug>/**`, which
   matches that app's own `package.json`, and gives `infra` the key
   `infra/cdk/**`, which matches `infra/cdk/package.json`. A matched `infra`
   key fans out to every app.

2. **Why does the filter not see that the change is harmless?**
   `dorny/paths-filter` compares paths, not content. A path cannot tell a
   `lint` line from a dependency version or a `build` script.

3. **Why did the fix for dependency changes not cover it?**
   PR #154 taught the `deps` key to ask the lockfile which apps resolve
   something different, in
   [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md).
   That answers the `deps` key only. The same `package.json` also matches its
   app's own key and, for `infra/cdk`, the `infra` key, and neither asks
   anything.

**Root cause:** thought a change to a deployed app's folder always changes the
deployment, actually a `package.json` edit confined to scripts the deploy never
runs leaves the build identical, and only the content of the manifest can say
so.

## Detection failure causes

- **CI:** the deploys succeeded, so nothing was red. The cost is CI minutes and
  six production deploys of unchanged code.
- **Code review:** the workflow comments described the `infra` fan-out as
  intended, which it is for construct changes.

## Countermeasure

None for #155 itself: its deploys were harmless and already done.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #155](https://github.com/hugoleborso/borso.fr/pull/155)

`scripts/dependencies/drop-check-only-changes.ts` runs in the `detect` job of
`deploy.yml` and `preview.yml`, right after the path filter and before the
`infra` fan-out. For each app key and the `infra` key, it drops the key when
the only file that changed under that folder is its `package.json`, and the
two versions of that manifest are identical once the check-only scripts are
removed: `lint`, `typecheck`, `test`, `dev`, and any `test:`, `dev:` or
`db:local:` script. Any other change keeps the key, including a `build` or
`deploy` script. Any error keeps every key, so the filter can only remove
work, never skip a deploy that was needed.

The decision lives in `scripts/dependencies/check-only-change.core.ts`, at
100% coverage. Replayed on the real history of #155's merge, against its
parent `38c30667`, it reduced the keys from all six apps plus `infra` and
`deps` to `deps` alone, which the lockfile check then resolves to no app.

```bash
if jq -e 'index("deps")' <<<"$CHANGES" >/dev/null; then
  if kept=$(pnpm exec tsx scripts/dependencies/drop-check-only-changes.ts \
    "$BASE" "$CHANGES"); then
    CHANGES="$kept"
  fi
fi
```

It runs only when `deps` matched, because every `package.json` under `apps/`
and `infra/` is in the `deps` key, and that is also when the workspace is
already installed in the preview `detect` job.

CI is left unchanged on purpose: a changed `test` or `lint` script still runs
the app's suites, which is exactly when they should run.

## See also

- [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md), the `deps` half of the same question.
