# The GitHub OIDC `sub` claim depends on the trigger, not the workflow

An IAM role federated to GitHub Actions trusts a `sub` claim. That claim
describes **the event that started the run**, not the workflow file. So
adding a trigger to a workflow changes the credential it presents, and a
trust policy written for one trigger silently rejects the others.

This cost five consecutive nights of a failing sweeper — see
[`the-nightly-sweeper-never-had-permission-to-run.md`](../dantotsus/the-nightly-sweeper-never-had-permission-to-run.md).

## The claims

For repository `OWNER/REPO`:

| Trigger | `sub` claim |
| --- | --- |
| `pull_request` | `repo:OWNER/REPO:pull_request` |
| `push` / `schedule` / `workflow_dispatch` on branch `B` | `repo:OWNER/REPO:ref:refs/heads/B` |
| a job with `environment: E` | `repo:OWNER/REPO:environment:E` |
| `push` of tag `T` | `repo:OWNER/REPO:ref:refs/tags/T` |

Two consequences worth stating separately:

- **`environment:` wins.** A job declaring an environment presents the
  environment claim regardless of the triggering event. That is what makes
  `environment: prod` a useful trust scope even with no protection rule
  attached — it is how a role becomes assumable by *that job* and not by
  any other workflow in the repo. It is **not** an approval gate; see
  [`an-approval-gate-that-only-existed-in-a-comment.md`](../dantotsus/an-approval-gate-that-only-existed-in-a-comment.md).
- **`schedule` and `workflow_dispatch` look like `push`.** Both report the
  default branch as their ref, so both present
  `repo:OWNER/REPO:ref:refs/heads/main` here. A workflow mixing
  `pull_request` with either needs its role to trust two claims.

## Trusting more than one

IAM evaluates a `StringLike` whose value is a list as "matches any entry",
so a role assumed from several triggers lists one claim per trigger. In
this repo that is `githubActionsPrincipal`'s `subjects` array:

```ts
assumedBy: githubActionsPrincipal(oidcProviderArn, {
  repo: CONSUMER_REPO,
  subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: 'main' }],
}),
```

Reach for `{ kind: 'any' }` (`repo:OWNER/REPO:*`) only deliberately — it
covers every branch, every tag and every environment, including a branch
someone pushes tomorrow.

## What the failure looks like

Twelve retries with backoff, then:

```
##[error]Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

The message names no claim and no role, and the same workflow's other
triggers keep passing — so the workflow list shows a stable mix of red and
green that reads like flakiness. When you see it, compare the failing
run's **event** against the role's trusted claims before anything else.

## Checking a role's trust policy

```bash
aws iam get-role --role-name PreviewDeployRole \
  --query 'Role.AssumeRolePolicyDocument' | \
  jq '.Statement[].Condition'
```

**Local shells only, with an admin profile.** Two things stop this working from a
Claude Code session, and both were learned the hard way: `AI-Dev-ReadOnly`'s
inline deny starts with `iam:*`, which blocks `iam:GetRole` as surely as
`iam:CreateRole`; and a remote session receives no AWS credentials at all. So
when a `sub` claim needs checking from a session, read it off the workflow run
instead — the failing job's log names the event, and the event determines the
claim per the table above. See [`docs/aws-setup.md` §12](../aws-setup.md#12-optional-grant-claude-code-on-the-web-read-access-to-aws).

## See also

- [`workflow-dispatch-default-branch.md`](./workflow-dispatch-default-branch.md)
  — why a dispatched run reports the default branch in the first place.
- [AWS: configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
  — GitHub's own claim reference.
