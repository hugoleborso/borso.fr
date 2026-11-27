---
date: 2026-05-11
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#2'
fix-commits: [8b581dc9eb, 663267998b]
eradication-level: 4
eradication-paths: [apps/borso-fr/package.json, infra/cdk/test/unit/eradication-checks.test.ts]
time-to-detect: 8 days
tags: [github-actions, cdk, cloudformation, ci, idempotency, pnpm-scripts]
zone: .github/workflows/cleanup-orphans.yml
---

# Four preview stacks outlived their pull requests behind a green nightly sweep

## User impact

On 2026-05-11 the operator ran `aws cloudformation list-stacks` and found four preview stacks alive days after their pull requests had merged.

| Stack | Pull request closed | Seen | Expected |
| --- | --- | --- | --- |
| `borso-fr-pr-2` | 2026-05-03 | Alive on 2026-05-11 | Deleted at close |
| `borso-fr-pr-4` | 2026-05-03 | Alive on 2026-05-11 | Deleted at close |
| `borso-fr-pr-6` | 2026-05-03 | Alive on 2026-05-11 | Deleted at close |
| `borso-fr-pr-7` | 2026-05-04 | Alive on 2026-05-11 | Deleted at close |

Two layers promised the cleanup: the `teardown` job of `preview.yml` at close, and the nightly `cleanup-orphans` workflow. Both ran, both went green, and the stacks stayed. The cost was small. The promise that previews clean themselves up was false, and nothing said so.

## Causal chain

- The four stacks stayed in CloudFormation. Their `describe-stack-events` held no `DELETE_*` event.
  - Branch 1, the failure. `pnpm --filter @borso-app/borso-fr run destroy` exited non-zero before any `DeleteStack`.
    - `cdk destroy` synthesizes the app first. `StaticSite` resolves `Source.asset(path.resolve(props.assetsPath))` at synth, and `apps/borso-fr/dist/` did not exist in the CI checkout. The first loud run printed `CannotFindAsset: Cannot find asset at .../apps/borso-fr/dist`.
      - `apps/borso-fr/package.json` chained the build before `deploy` and not before `destroy`:

        ```json
        "deploy": "pnpm build && cdk deploy --all --require-approval never",
        "destroy": "cdk destroy --all --force"
        ```

        - Commit `06e4ce69e` (2026-05-02, an agent) wrote both lines. Its message says "`synth`/`diff`/`deploy` chain `pnpm build` for a fresh `dist/`". It left `destroy` out of that list.
          - Each script is a hand-written chain that must repeat the prerequisites of synth on its own (Machine).
  - Branch 2, the silence. Both workflows ran the destroy as `pnpm --filter "@borso-app/$app" run destroy || echo "(stack does not exist or already destroyed)"`.
    - `|| echo` returns 0, so the loop went on and the job went green.
      - Commit `56258c2b0` (2026-05-02, an agent) wrote it in `preview.yml` and `cleanup-orphans.yml`, to let a re-run skip a stack already deleted.

## Root cause of occurrence

*Thought `cdk destroy` deletes a stack by name and needs nothing on disk, actually it synthesizes the whole app first, with the same file prerequisites as `deploy`.* (Man)

The agent of `06e4ce69e` knew that synth needs `dist/`, since the same commit chains the build before `synth`, `diff` and `deploy`. Its prior about `destroy` won over that knowledge. The stack trace of the first loud run, measured on the operator's terminal, shows the destroy running the construct code:

> «CannotFindAsset» Cannot find asset at .../apps/borso-fr/dist
> at new BucketDeployment2 (.../aws-s3-deployment/lib/bucket-deployment.js:1)
> at StaticSite.buildPreview (.../infra/cdk/src/constructs/static-site.ts:233)

The second branch rests on a second belief. *Thought a failed `cdk destroy` means the stack is already gone, actually it returns the same non-zero exit for every failure: a missing stack, a missing asset, an IAM error.* (Man)

## Detection failure causes

- **Typing and linter:** a `package.json` script is an opaque string, and `actionlint` accepts `|| echo` as valid shell.
- **Local validation:** a destroy needs real CloudFormation state, so nobody ran one locally.
- **CI:** the workflows asserted only that the step exited 0, never that the stack was gone. `|| echo` guaranteed the 0.
- **Review:** `|| echo` reads as "skip expected errors". Author and reviewer shared the second belief.
- **Monitoring:** no alarm counts preview stacks alive after their pull request closed. Their cost is too small for the budget alarm to notice fast.

## Countermeasure

- Commit [`6632679`](https://github.com/hugoleborso/borso.fr/commit/663267998ba86c91d5e91817831547e85090fcf5) chained the builds before `destroy`:

  ```diff
  -    "destroy": "cdk destroy --all --force"
  +    "destroy": "pnpm --filter @borso/infra run build && pnpm build && cdk destroy --all --force"
  ```

- Commit [`8b581dc`](https://github.com/hugoleborso/borso.fr/commit/8b581dc9eb390c3b62dadc8dd0036576f1ddd19e) removed `|| echo` from both workflows. `preview.yml` probes the stack with `describe-stacks`, skips a missing one, and turns any other destroy failure into `::error::` and a red job. `cleanup-orphans.yml` does the same and also fails on a stack whose app is not in `apps/`.
- The operator deleted the four stacks with a one-shot script, since removed.

## Eradication

**Type:** detection (level 4)

**Reference:** commits [`6632679`](https://github.com/hugoleborso/borso.fr/commit/663267998ba86c91d5e91817831547e85090fcf5) and [`8b581dc`](https://github.com/hugoleborso/borso.fr/commit/8b581dc9eb390c3b62dadc8dd0036576f1ddd19e).

`infra/cdk/test/unit/eradication-checks.test.ts` walks every `apps/*/package.json` and asserts the `destroy` script contains the build:

```ts
expect(destroy).toContain('pnpm --filter @borso/infra run build');
expect(destroy).toContain('pnpm build');
expect(destroy).toContain('cdk destroy');
```

It runs in CI. Pre-push runs it only when `infra/cdk/` changes, so an app's `package.json` change meets it in CI. It checks substrings of each copy. A new prerequisite added to `deploy` would not be required of `destroy`. The loud workflows are the second layer: a broken destroy now turns the job red the same night.

**Proposed:** subtract the copies. Write one shared script that runs the builds, then `cdk deploy` or `cdk destroy` with the given target, and have every app's `deploy` and `destroy` call it. The prerequisites of synth would then exist once, so `destroy` could not lack one that `deploy` has, and the substring test could be deleted.

**Proof it can fail:** not planted this session. A `destroy` without `pnpm build` would fail `toContain('pnpm build')` for that app (inferred from the assertion).

**Similar instances:** `grep -rn "|| echo" .github/workflows/ | grep -i destroy` finds only a comment in `preview.yml` that describes the old form. `grep -n '"destroy"' apps/*/package.json` shows every app's copy, each chaining the build.
