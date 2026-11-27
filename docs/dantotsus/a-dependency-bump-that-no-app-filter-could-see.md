---
date: 2026-08-20
introduced-at: conception
detected-at: review
severity: high
related-pr: '#65, #66'
fix-commits: [21ed4b0b46]
eradication-level: 2
eradication-paths: [.github/path-filters.yml, .github/workflows/ci.yml, scripts/check-app-registration.sh]
time-to-detect: days
tags: [ci, gates, github-actions, pnpm, deploy]
zone: .github/path-filters.yml
---

# A dependency bump that no app filter could see

## User impact

Every visitor of the four production apps was affected, without seeing it. React 19.0 to 19.2.8 and jsdom 25.0.1 to 30.0.1 merged to `main` in PRs #65 and #66 with every check green. Neither ran a single application test, and neither deployed. The sites kept serving a bundle built against React 19.0 for as long as nothing else touched `apps/`.

| | Seen | Expected |
| --- | --- | --- |
| CI on a dependency-only pull request | `app-tests` and `deploy` skipped, workflow `success` | Every app that resolves the new version tested, then deployed |

## Causal chain

- Two dependency bumps merged untested, and production kept the old bundle.
  - `detect` emitted an empty app list, so the `app-tests` matrix guard `if: needs.detect.outputs.apps != '[]'` skipped it, and `deploy.yml` and `preview.yml` skipped the same way.
    - `dorny/paths-filter` matched no key. The diff touched only `pnpm-workspace.yaml` and `pnpm-lock.yaml`, and every key was `apps/<slug>/**` or `infra/cdk/**`.

      ```yaml
      # .github/path-filters.yml before 21ed4b0
      pragma: 'apps/pragma/**'
      infra: 'infra/cdk/**'      # ❌ no key for the files that now hold every version
      ```

      - Commit `b8c1c9e94` (2026-08-15, written by an agent) moved the 38 shared dependency versions into a pnpm catalog. Each `package.json` now says `"react": "catalog:"`, and the version lives once, in `pnpm-workspace.yaml`. The commit changed `ci.yml` and `.husky/pre-commit` to add its own check, and left `.github/path-filters.yml` as it was.
        - CI chose which apps a change affects from a list of paths kept apart from the place versions live. Nothing tied the two, so moving the versions did not move the filter. (Machine)

## Root cause of occurrence

*Thought a change that affects an app touches a file under `apps/`, actually the catalog moved every version out of `apps/` on purpose, so the files that decide what four applications resolve matched no app filter.*

Machine. The path filters were written in `56258c2b0` (2026-05-02), when each app's `package.json` held its own versions and a bump touched `apps/`. The catalog commit's message argues for structural impossibility of version drift. It names no consequence for CI, and no gate linked the filter list to the dependency layout.

## Detection failure causes

- **Linter:** `actionlint` validates workflow syntax and cannot know which paths ought to be covered. `check-app-registration.sh` checked that every app has a key, never that every path that changes an app has one.
- **Local validation:** the pre-push hook runs `vitest run --changed`, which walks the module graph from changed files. A catalog edit changes no module, so it selected nothing too.
- **CI:** the gate abstained instead of failing. The check list showed `app-tests skipped` beside seven green ticks, and the run concluded `success`.
- **Code review:** a Dependabot pull request is reviewed by its diff and its checks, and both looked fine.
- **Monitoring:** nothing compares the bundle in production with the current lockfile.

## Countermeasure

Commit `21ed4b0` added a `deps` key to `.github/path-filters.yml`, matching the workspace manifests and the lockfile. It is treated as a fan-out at the three sites that compute the app list, as `infra` already was. `check-app-registration.sh` learned that neither fan-out key names a directory under `apps/`.

## Eradication

**Type:** DevX check (level 2). The gate fires where it abstained.

**Reference:** commit [`21ed4b0`](https://github.com/hugoleborso/borso.fr/commit/21ed4b0b46).

```diff
  infra: 'infra/cdk/**'
+ deps:
+   - 'pnpm-workspace.yaml'
+   - 'pnpm-lock.yaml'
+   - 'package.json'
+   - 'apps/*/package.json'
+   - 'infra/*/package.json'
```

```diff
- if jq -e 'index("infra")' <<<"$CHANGES" >/dev/null; then
+ if jq -e 'index("infra") or index("deps")' <<<"$CHANGES" >/dev/null; then
```

The fan-out to every app in `deploy.yml` and `preview.yml` caused the next defect, [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md). Those two workflows now narrow a `deps` match with `scripts/dependencies/apps-with-changed-dependencies.ts`, which compares what each app resolves in the lockfile against the base. `ci.yml` still fans out the tests to every app (read this session, line 261).

**Proposed:** remove the `deps` path list. Every workflow's `detect` step would ask `apps-with-changed-dependencies.ts changed <base> <apps…>` on every diff, instead of only when a `deps` path matched. The script already reads its inputs, the lockfile, `pnpm-workspace.yaml` and the root `package.json`, from constants of its own, so the list in `path-filters.yml` is a second copy of them. A dependency change could then not skip an app whatever file carried it. `ci.yml` would keep its deliberate choice to run every suite, triggered when the script names at least one app.

**Proof it can fail:** inferred, not replayed this session. A diff touching only `pnpm-lock.yaml` matches `deps`, and `ci.yml` line 261 then emits every app.

**Similar instances:** the same one-line condition existed in `deploy.yml` and `preview.yml`, and the same commit fixed all three (`grep -n 'index("deps")' .github/workflows/*.yml`). [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md) is the previous time this filter's behaviour was misread.
