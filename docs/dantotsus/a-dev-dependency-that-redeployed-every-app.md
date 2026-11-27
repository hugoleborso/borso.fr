---
date: 2026-10-10
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#151'
fix-commits: [21a850ab]
eradication-level: 2
time-to-detect: minutes
tags: [ci, github-actions, pnpm, deploy]
eradication-paths: [scripts/dependencies/dependency-closure.core.ts, scripts/dependencies/apps-with-changed-dependencies.ts]
zone: .github/path-filters.yml
recurs: none (the earlier entry ran too few app suites on a bump; this one deployed every app on a change that touched none)
---

# A dev dependency that redeployed every app

## User impact

The operator was the user. PR #151 added Playwright as a dev dependency of `apps/pragma` only. Its preview run deployed `banana-rush` too, and its merge deployed all six apps to prod. No visitor saw a difference, because five of the six deploys shipped the same bytes. The operator asked: « Why does a development dep launch a redeploy of all apps? »

| | Seen | Expected |
| --- | --- | --- |
| Merge of PR #151 | Six prod deploys | One, `pragma`, or none, since a dev dependency ships nothing |

## Causal chain

- Merging a dev dependency of one app deployed all six apps.
  - The change touched `pnpm-lock.yaml` and `pnpm-workspace.yaml`, which match the `deps` key of `.github/path-filters.yml`.
    - `deploy.yml` and `preview.yml` treated `deps` as a fan-out to every app.

      ```sh
      # deploy.yml after 21ed4b0b4
      if jq -e 'index("infra") or index("deps")' <<<"$CHANGES" >/dev/null; then  # ❌ any lockfile change means every app
      ```

      - Commit `21ed4b0b4` (2026-08-20, written by an agent) added that fan-out as the fix of [`a-dependency-bump-that-no-app-filter-could-see.md`](./a-dependency-bump-that-no-app-filter-could-see.md), where a React bump had deployed nothing. The entry it shipped with predicted this cost: "a one-line catalog edit is now four deploys."
        - The workflows decide what to deploy from which source files changed, not from what each app would ship. A lockfile is one file shared by every app, so a rule over changed files could only answer "none" or "all". (Method)

## Root cause of occurrence

*Thought the apps a dependency change reaches can only be read from the changed file's path, actually the lockfile records, per app, the full set of versions it resolves.*

Method. The fix after it read that graph, and the input rules kept growing. `dependency-closure.core.ts` came with PR #154, `check-only-change.core.ts` with PR #168 for check-only scripts in a `package.json`, and `comment-only-change.core.ts` with PR #423 for comment-only edits (measured with `git log --diff-filter=A`). Each one teaches the deploy step one more kind of change that ships nothing. By the replay below, an eslint bump still deploys all six apps. The process asks "what changed in the inputs" each time, when the question is "what would ship".

## Detection failure causes

- **CI:** an extra deploy is a success, so nothing fails and each run is green.
- **Code review:** the fan-out was the reviewed fix for the opposite defect, so it read as deliberate.
- **Operator:** saw it on the deploy list and asked.

## Countermeasure

The workflows ask the lockfile which apps moved. `dependency-closure.core.ts` (100% coverage and mutation score) parses the lockfile, walks each app's importer, the workspace packages it links and every snapshot reachable from them. It digests the result with the root importer, the lockfile settings, `pnpm-workspace.yaml` without its catalogs and the root `packageManager`, `pnpm` and `engines` fields. An app deploys when its digest differs from the base. Anything the script cannot read falls back to every app.

## Eradication

**Type:** DevX check (level 2). A CI script decides the deploy set from the resolved graph.

**Reference:** PR #154, squashed into commit [`21a850ab4`](https://github.com/hugoleborso/borso.fr/commit/21a850ab4).

```diff
-          if jq -e 'index("infra") or index("deps")' <<<"$CHANGES" >/dev/null; then
+          if jq -e 'index("infra")' <<<"$CHANGES" >/dev/null; then
 ...
+          if jq -e 'index("deps")' <<<"$CHANGES" >/dev/null; then
+            mapfile -t candidates < <(jq -r '.[]' <<<"$all_apps")
+            moved=$(pnpm exec tsx scripts/dependencies/apps-with-changed-dependencies.ts \
+              changed "$BASE" "${candidates[@]}") || moved="$all_apps"
```

Replayed over past merges when it shipped: #151 deploys `pragma` only, the Spotify ISRC change `pragma` only, the aws-cdk bump four apps, and an eslint bump still all six. The root importer is in every digest, because Node resolves upward into the root `node_modules`, so an app can use a root tool without declaring it. `ci.yml` keeps the full fan-out on purpose, so a dependency change still runs every suite.

**Proposed:** decide the deploy set from outputs. `deploy.yml` and `preview.yml` would build each app's site bundle and synthesize its CDK assets at the base and at the head, and deploy an app only when one of its asset hashes differs. A change that alters no shipped byte, a dev dependency, an eslint bump or a comment, would then deploy nothing, without a rule for its kind. `dependency-closure.core.ts`, `check-only-change.core.ts` and `comment-only-change.core.ts` would go from the deploy path. The cost is a second build at the base, and its duration is unknown until measured.

**Proof it can fail:** the replay above. #151 before the change deploys six apps, after it deploys `pragma`.

**Similar instances:** `grep -n 'index("deps")' .github/workflows/*.yml` finds the narrowing in `deploy.yml` and `preview.yml`, and the deliberate fan-out in `ci.yml`. `pnpm ls --lockfile-only` does not exist in pnpm 10.0.0 (tried 2026-10-10), which is why the closure parses the lockfile itself.
