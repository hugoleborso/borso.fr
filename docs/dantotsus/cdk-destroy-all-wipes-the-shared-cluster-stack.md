---
date: 2026-06-05
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#26'
fix-commits: [b35a066dc8, 3a5c9f6e01]
eradication-level: 5
eradication-paths: [apps/last-loop-lepin/package.json, apps/pragma/package.json]
time-to-detect: days
tags: [cdk, cloudformation, dsql, deploy, github-actions, last-loop-lepin]
zone: apps/last-loop-lepin/package.json
---

# Closing one pull request tried to delete the database every pragma stage shares

## User impact

PR #26 merged. The preview teardown ran, then the operator's first prod deploy of pragma failed.

| | Seen | Expected |
| --- | --- | --- |
| After the teardown | `pragma-cluster`, the stack holding the DSQL cluster of every pragma stage, sat in `DELETE_FAILED`. The prod deploy failed against it. | Only `pragma-pr-26` is torn down. The prod deploy runs. |

<details>
<summary>CloudFormation event</summary>

```
Cluster3DA9CCBA  DELETE_FAILED
Can't delete cluster: Deletion protection is enabled. To proceed,
disable deletion protection and try again. (Service: Dsql, Status Code: 400)
```

</details>

The same teardown had fired at `last-loop-lepin-cluster` three times before (2026-05-25 20:55Z and 23:34Z, 2026-06-05 17:20Z). A prod deploy after each one repaired the stack, so nobody saw it.

## Causal chain

- The prod deploy failed on `pragma-cluster` in `DELETE_FAILED`.
  - The teardown asked CloudFormation to delete `pragma-cluster`, and the cluster's deletion protection refused.
    - The teardown job runs `pnpm --filter @borso-app/pragma run destroy`, and that script was `cdk destroy --all --force`.
      - `--all` selects every stack the CDK app synthesizes. `apps/pragma/cdk/bin/cdk.ts` synthesizes two, `pragma-pr-<N>` and the shared `pragma-cluster`.
        - Commit `0fafc5782` (2026-05-19, an agent) scaffolded pragma by copying last-loop-lepin's script.
          - In last-loop-lepin, commit `5b2643aaa` (2026-05-12) wrote `"destroy": "cdk destroy --all --force"` while the CDK app held a single placeholder stack, so `--all` was then correct.
            - Commit `5870a42c9` (2026-05-12, an agent) added `last-loop-lepin-cluster` to the same CDK app. Its message says "Two stacks per deploy". It left the `destroy` script in `package.json` unchanged, so `--all` began to target the cluster.
              - The list of stacks lives in `cdk/bin/cdk.ts` and the destroy target in a hand-written string in `package.json`. Each app keeps its own copy of that string (Machine).
    - Pragma had never deployed prod before this merge, so no deploy came to repair the stack, as one had in last-loop-lepin.

## Root cause of occurrence

*Thought `cdk destroy --all` covered this stage's stacks, actually it covers every stack in the CDK app, including the shared, stateful cluster stack.* (Man)

The agent of `5870a42c9` had the fact in its context, since its own commit message names the two stacks. It did not connect it to a script in another file. The CDK CLI help says of `--all`: "Destroy all available stacks".

## Detection failure causes

- **Typing and linter:** a `package.json` script is an opaque string.
- **Local validation:** nobody runs `destroy` locally. It runs only in the teardown job.
- **CI:** no job runs the teardown. It fires only on a real pull request close, against real AWS.
- **Review:** the script was copied from an app whose teardown seemed to work. Deletion protection and the next prod deploy hid every misfire.
- **Monitoring:** no alarm fires on a delete attempt against a cluster stack. The `DELETE_FAILED` showed only because the next deploy failed.

## Countermeasure

Commits `b35a066` (pragma) and `3a5c9f6` (last-loop-lepin) scope `destroy` to the stage stack:

```diff
- "destroy": "pnpm --filter @borso/infra run build && pnpm build && cdk destroy --all --force"
+ "destroy": "pnpm --filter @borso/infra run build && pnpm build && cdk destroy \"pragma-pr-${PR_NUMBER:?PR_NUMBER env var required — pragma destroy targets the per-PR app stack only, never the shared pragma-cluster stack}\" --force"
```

A destroy with no `PR_NUMBER` aborts before CDK runs. The operator unstuck `pragma-cluster` with `aws cloudformation delete-stack --stack-name pragma-cluster --retain-resources Cluster3DA9CCBA`, then re-ran the prod deploy.

## Eradication

**Type:** knowledge (level 5). Hand-written copies, no mechanism for the class.

**Reference:** commits [`b35a066`](https://github.com/hugoleborso/borso.fr/commit/b35a066dc8) and [`3a5c9f6`](https://github.com/hugoleborso/borso.fr/commit/3a5c9f6e01).

Each full-stack app now carries its own scoped string. `grep -n '"destroy"' apps/*/package.json` shows six scoped copies, plus `cdk destroy --all` in `borso-fr`, which is static and has no cluster stack. Nothing checks the copies. `infra/cdk/test/unit/eradication-checks.test.ts` only asserts that each `destroy` contains the build steps and `cdk destroy`. A new app copied from `borso-fr` would carry `--all` again. What still holds the data is the DSQL cluster's own deletion protection, `DeletionProtectionEnabled: props.deletionProtection ?? true` in `infra/cdk/src/constructs/dsql-cluster.ts`. It leaves the stack in `DELETE_FAILED`, as here.

The entry's "documented next step", termination protection on the cluster stack, never landed. `grep -rn terminationProtection infra apps` finds nothing.

**Proposed:** pass `terminationProtection: true` to `super()` in `DsqlClusterStack` (`infra/cdk/src/constructs/dsql-cluster-stack.ts`), with a synth assertion in `infra/cdk/test/unit/`. CloudFormation then refuses any delete of every app's cluster stack, for any script and any future app, before it reaches the cluster. Then replace the six `destroy` strings with one shared script that takes the app and the stage, so the target exists once.

**Proof it can fail:** none. No check exists to plant against.

**Similar instances:** `grep -n '"destroy"' apps/*/package.json`. At the time, last-loop-lepin carried the identical `--all`, fixed in `3a5c9f6`.
