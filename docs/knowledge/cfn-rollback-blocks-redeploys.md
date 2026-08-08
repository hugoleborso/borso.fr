# CloudFormation `UPDATE_ROLLBACK_IN_PROGRESS` rejects new deploys for ~15 min

## Symptom

The first borso-fr preview deploy for PR #11 OOM'd inside `BucketDeployment`'s Lambda after ~14 min and was manually stopped by the operator. The next CI deploy job started shortly after, did the checkout / `pnpm install` / build / OIDC dance in ~40 s, then `pnpm --filter @borso-app/borso-fr run deploy` exited non-zero in ~2 s. Total wall-clock: **42 seconds**.

The job log read like a code regression. It wasn't. The stack was:

```
$ aws cloudformation describe-stacks --stack-name borso-fr-pr-11 \
    --region eu-west-3 --query 'Stacks[0].StackStatus' --output text
UPDATE_ROLLBACK_IN_PROGRESS
```

`cdk deploy` against a stack in `UPDATE_*` (other than `UPDATE_COMPLETE`) gets rejected immediately by the CFN control plane — *not* by CDK, which is why the failure looks low-level and fast.

## Why

CloudFormation's state machine only accepts new operations from a small set of terminal states (`CREATE_COMPLETE`, `UPDATE_COMPLETE`, `UPDATE_ROLLBACK_COMPLETE`, `ROLLBACK_COMPLETE`). Any `*_IN_PROGRESS` state holds a lock; `cdk deploy` calls `CreateChangeSet`, which returns `ValidationError: Stack is in UPDATE_ROLLBACK_IN_PROGRESS state and can not be updated.` That error percolates up and the CLI exits.

Rollback duration is dominated by the *slowest custom-resource UPDATE*. In our case the same `BucketDeployment` Lambda that OOM'd on the way out also has to run on the way back to re-upload the *previous* asset set (which was equally heavy) — so rollback took ~14 min, not seconds. During the whole window, no deploy retry will succeed.

## How to handle it

1. **Don't retry blindly.** Check the stack status first:

   ```bash
   aws cloudformation describe-stacks --stack-name <stack> \
     --region <region> --query 'Stacks[0].StackStatus' --output text
   ```

2. **Wait for a terminal state.** Poll until status leaves `*_IN_PROGRESS`:

   ```bash
   until status=$(aws cloudformation describe-stacks --stack-name <stack> \
     --region <region> --query 'Stacks[0].StackStatus' --output text); \
     [ "${status##*_}" != "PROGRESS" ]; do echo "$status"; sleep 30; done
   echo "FINAL: $status"
   ```

3. **Then trigger a new deploy.** A no-op empty commit (`git commit --allow-empty -m "ci: retry"`) is the cheapest way to re-run the preview workflow.

4. **If rollback itself fails** (`UPDATE_ROLLBACK_FAILED`), use `aws cloudformation continue-update-rollback --stack-name <stack> --resources-to-skip <logical-id>` to advance past the failing resource. Skip the resource that's failing — *not* the resource you originally tried to update.

## Related

- [`docs/dantotsus/bucketdeployment-default-128mb-oom-on-media-bundles.md`](../dantotsus/bucketdeployment-default-128mb-oom-on-media-bundles.md) — the root failure that triggered the rollback in PR #11.
- [`docs/dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md`](../dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md) — the more dramatic version: when rollback itself can't complete because of bucket retention.
