# Unsticking a CloudFormation stack from `UPDATE_ROLLBACK_IN_PROGRESS` and similar transient states

PR #23 ran into this twice. Captured here so the operator dance has
a recipe next time.

## Symptom

`aws cloudformation delete-stack ...` returns:

```
An error occurred (ValidationError) when calling the DeleteStack operation:
Stack [arn:aws:cloudformation:eu-west-3:.../<stack>/...] cannot be deleted
while in status UPDATE_ROLLBACK_IN_PROGRESS
```

CFN refuses destructive operations while the stack is in any
`*_IN_PROGRESS` state. The rollback has to *complete* (either as
`*_ROLLBACK_COMPLETE` or `*_ROLLBACK_FAILED`) before you can act.

## Recovery dance

```bash
# 1. Watch until the rollback finishes. The wait command blocks
#    until the stack reaches a terminal state; it returns 0 on
#    UPDATE_ROLLBACK_COMPLETE, non-zero on UPDATE_ROLLBACK_FAILED.
aws cloudformation wait stack-rollback-complete \
  --region eu-west-3 \
  --stack-name <stack> \
  --profile borso-admin

# 2. Confirm the resulting state.
aws cloudformation describe-stacks \
  --region eu-west-3 \
  --stack-name <stack> \
  --profile borso-admin \
  --query 'Stacks[0].StackStatus' --output text

# 3a. If UPDATE_ROLLBACK_COMPLETE → delete normally.
aws cloudformation delete-stack \
  --region eu-west-3 \
  --stack-name <stack> \
  --profile borso-admin

# 3b. If UPDATE_ROLLBACK_FAILED → continue the rollback past the
#     specific resource that blocks it. The list of failed
#     resources is in describe-stack-events.
aws cloudformation describe-stack-events \
  --region eu-west-3 \
  --stack-name <stack> \
  --query 'StackEvents[?contains(ResourceStatus, `FAILED`)] | [0:3].[LogicalResourceId,ResourceStatusReason]' \
  --output text \
  --profile borso-admin

aws cloudformation continue-update-rollback \
  --region eu-west-3 \
  --stack-name <stack> \
  --resources-to-skip <LogicalResourceId> \
  --profile borso-admin

# 4. Once delete is in progress, wait for completion.
aws cloudformation wait stack-delete-complete \
  --region eu-west-3 \
  --stack-name <stack> \
  --profile borso-admin
```

CloudFront detachment is the slow step — a stack with a Distribution
takes 5-10 minutes to teardown even when everything else is fast.

## Trap: a queued `delete-stack` racing a CI re-deploy

On PR #23 the operator had typed `delete-stack` while the stack was
still rolling back. The command returned the validation error.
*Several minutes later*, after the rollback finished, a fresh CI
build had retriggered the deploy and was creating a new stack
instance — exactly the moment the operator's queued (or re-run)
delete-stack command finally executed. Result: CI's `cdk deploy`
reported *"Stack deploy failed (the stack disappeared while we were
deploying it)"*.

When in doubt, *cancel the running CI workflow first*, then
delete-stack, then push a new commit to retrigger CI on a clean
slate. The cleanup-orphans workflow only fires for closed PRs, so an
open PR's deploy can re-fire any time.

## When CFN state diverges from reality

A separate trap on PR #23: the S3 bucket (`autoDeleteObjects: true`
+ multiple rollback cycles) disappeared from S3 while CFN's state
still thought it existed. The next `UPDATE` failed on the
BucketPolicy resource with *"The specified bucket does not exist"*.

Manual recovery (one-shot, when it strikes):

```bash
# Recreate the bucket with the CDK-equivalent settings.
aws s3api create-bucket --bucket <bucket> --region eu-west-3 \
  --create-bucket-configuration LocationConstraint=eu-west-3 \
  --profile borso-admin
aws s3api put-public-access-block --bucket <bucket> --region eu-west-3 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile borso-admin
aws s3api put-bucket-encryption --bucket <bucket> --region eu-west-3 \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --profile borso-admin
aws s3api put-bucket-ownership-controls --bucket <bucket> --region eu-west-3 \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]' \
  --profile borso-admin
# Re-apply the CORS / lifecycle / policy properties the CDK construct
# normally declares — copy from the deployed prod bucket if unsure.
```

The next CFN UPDATE then succeeds because reality has converged with
state. The structural fix for this drift class — making
`autoDeleteObjects` resilient to rollback cycles, or removing it for
preview stacks — is a follow-up that hasn't shipped yet (kaizen of
PR #23 captured the trap but not the structural eradication; queued
for the next infra-touch PR).

## See also

- [`docs/dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md`](../dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md) — sibling: stack delete *succeeds* but a `RETAIN`-policy bucket survives, an orphan to clean up. Same family of CFN-vs-reality drift.
- [`docs/knowledge/retrigger-ci-with-empty-commit.md`](./retrigger-ci-with-empty-commit.md) — companion knowledge entry on the empty-commit retrigger technique used during PR #23.
