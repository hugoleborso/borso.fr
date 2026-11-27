---
date: 2026-10-12
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#155'
fix-commits: [0e0d2acf]
eradication-level: 4
time-to-detect: minutes
tags: [ci, github-actions, deploy, pnpm]
eradication-paths: [scripts/dependencies/check-only-change.core.ts, scripts/dependencies/check-only-change.core.test.ts, scripts/dependencies/drop-check-only-changes.ts]
zone: .github/path-filters.yml
recurs: [a-dev-dependency-that-redeployed-every-app]
---

# A lint script that redeployed every app

## User impact

PR #155 rewrote one line in eight `package.json` files: the `lint` script,
now `../../scripts/lint-workspace.sh`. The operator asked why changing a
script in `package.json` triggers a deploy, and whether it needs to.

| | Seen | Expected |
| --- | --- | --- |
| PR #155's previews | every app rebuilt | no preview rebuilt |
| PR #155's merge | all six apps redeployed to production with code identical to what ran | no deploy |

## Causal chain

- The merge of PR #155 deployed all six apps.
  - The path filter matched every app key and the `infra` key.
    - Each app's key is `apps/<slug>/**`, which matches its `package.json`. The `infra` key is `infra/cdk/**`, which matches `infra/cdk/package.json`, and a matched `infra` key fans out to every app.

      ```yaml
      # .github/path-filters.yml
      #   - One per app: `<slug>: 'apps/<slug>/**'`. When a PR touches paths
      #     matching this filter, only that app gets deployed.
      ```

      - Commit `56258c2b0` (2026-05-02, an agent) chose to decide each deploy by the paths a change touches. (Method)
        - Each later case that a path cannot judge got an exception beside the filter. PR #154 taught the `deps` key to ask the lockfile. That answered the `deps` key only, and PR #155's manifests also matched the app and `infra` keys.

## Root cause of occurrence

*Thought a change under a deployed app's folder changes the deployment,
actually a `package.json` edit confined to scripts the deploy never runs leaves
the build identical, and only the manifest's content can say so.*

Method. The deploy decision rests on paths, and `dorny/paths-filter` answers
"which paths changed", never "what the deploy reads". Every recurrence adds an
exception to that method rather than changing it. This entry is the second
(`a-dev-dependency-that-redeployed-every-app` was the first). Four exceptions
now sit beside the filter: the script names, `TOOLING_FILE_PATTERN` and
`PREVIEW_ONLY_FILE_PATTERN` in `check-only-change.core.ts`, and
`comment-only-change.core.ts`, added by `18653a2ca` (#423, 2026-11-27), which
treats a script file as inert when oxc-parser reads the same program before and
after.

## Detection failure causes

- **CI:** the deploys succeeded, so nothing was red. The cost is CI minutes and six production deploys of unchanged code.
- **Review:** the workflow comments describe the `infra` fan-out as intended, which it is for a construct change, so a reader saw the designed behaviour.

## Countermeasure

None for #155 itself. Its deploys were harmless and already done.

## Eradication

**Type:** detection (level 4). The filter holds for the script names it lists,
and that list is kept by hand.

**Reference:** commit [`0e0d2acf5`](https://github.com/hugoleborso/borso.fr/commit/0e0d2acf5), PR #168.

`scripts/dependencies/drop-check-only-changes.ts` runs in the `detect` job of
`deploy.yml` and `preview.yml`, after the path filter and before the `infra`
fan-out. It drops an app or `infra` key when the only file changed under that
folder is its `package.json`, and the two versions are identical once the
check-only scripts are removed. Any error keeps every key, so it can only
remove work. Replayed on #155's merge against its parent `38c30667`, it reduced
the keys to `deps` alone, which the lockfile check resolves to no app.

```ts
const CHECK_ONLY_SCRIPT_NAMES: ReadonlySet<string> = new Set(['lint', 'typecheck', 'test', 'dev']);
const CHECK_ONLY_SCRIPT_PREFIXES = ['test:', 'dev:', 'db:local:'] as const;
```

The gap, measured on 2026-11-27 with `jq '.scripts' apps/*/package.json`.
Scripts no deploy reaches and the list does not name still redeploy their app:
`screenshot` in borso-fr, `mockup-kit`, `task-speed` and `task-metrics` in
pragma, `check:decks` and `build:openings` in borsouvertures, and `preview`,
`synth`, `diff` and `destroy` everywhere.

**Proposed:** decide each key by what the deploy produces, not by the paths it
reads. In the `detect` job, synthesize each matched app at the base and at the
head, and drop the key when the CloudFormation templates and the
content-hashed CDK assets are identical. That replaces the script list,
`TOOLING_FILE_PATTERN`, `PREVIEW_ONLY_FILE_PATTERN` and the comment parser at
once, and no edit that leaves the deployment unchanged, whatever its kind,
could redeploy an app. It costs one synth per matched app at each of two
commits, which `detect` does not run today. Inferred, not tried. A smaller
step inside today's method is to invert the script list: keep a key only when
`deploy`, or a script `deploy` reaches by name, changed.

**Proof it can fail:** `check-only-change.core.test.ts` covers the decision at
100%. A planted run was not repeated in this rewrite.

**Similar instances:** `grep -rn "drop-check-only-changes" .github/workflows/`
lists the two `detect` jobs. `ls scripts/dependencies/*-change.core.ts` lists the
exceptions the filter has grown. `ci.yml` is left unchanged on purpose, so a changed
`test` or `lint` script still runs that app's suites.
