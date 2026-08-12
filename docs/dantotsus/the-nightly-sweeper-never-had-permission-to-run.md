---
date: 2026-08-10
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: 26
fix-pr: 45
fix-commits: [2c7e27a]
eradication-level: 1
time-to-detect: days
tags: [github-actions, oidc, iam, cdk, ci, cleanup]
---

# The nightly sweeper never had permission to run

## Symptom

`cleanup-orphans` had failed on its schedule every night for at least
five consecutive nights — 2026-08-06 through 2026-08-10 — always on the
same commit, always the same way:

```
Assuming role with OIDC
Assuming role with OIDC
  … twelve attempts, backing off …
##[error]Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

The same workflow's `pull_request` runs were green throughout, including
one at 14:10:58 on the day this was written. So the workflow list showed
a mix of red and green for one workflow, and the red ones were the only
trigger that mattered.

The workflow's own header says what those runs were for:

> Nightly cron — catches stacks orphaned by edge cases that skipped both
> preview.yml teardown and the close trigger.

That safety net has never fired. Neither has `workflow_dispatch`, the
manual sweep an operator would reach for on noticing orphaned stacks.

## Root-cause chain

1. **Why couldn't the scheduled run assume the role?** Its OIDC token's
   `sub` claim did not match `PreviewDeployRole`'s trust policy.
2. **Why didn't it match?** The policy trusted exactly one claim,
   `repo:hugoleborso/borso.fr:pull_request`.
3. **Why is that not enough?** GitHub derives the `sub` claim from the
   **event**, not from the workflow file. A `pull_request` run presents
   `repo:<repo>:pull_request`; a `schedule` or `workflow_dispatch` run
   presents `repo:<repo>:ref:refs/heads/main`. One workflow, three
   triggers, two different claims.
4. **Why was the policy written with one?** `preview.yml` — the first and
   for a while only consumer of the role — runs on `pull_request` alone,
   so one claim was right when it was written. `cleanup-orphans.yml`
   later reused the role and added two triggers without anything
   connecting the two facts.

**Root cause:** *thought the OIDC sub claim identifies the repository and
workflow, actually it identifies the repository and the **event** — so
adding a trigger to a workflow silently changes the credential it
presents.*

Had the author known that, `cleanup-orphans.yml`'s schedule would never
have been written against a pull-request-only role.

## Detection failure causes

- **Typing:** the trust policy's shape carried no relationship to the
  workflows that assume it. `SubjectKind` could express the right answer
  and nothing asked for it.
- **Linter / actionlint:** actionlint validates workflow syntax. The
  workflow is syntactically perfect; the mismatch is between a workflow's
  `on:` block and an IAM policy in another workspace.
- **CI:** no CI job assumes `PreviewDeployRole` on a `main` ref, so no
  pull request could have surfaced it.
- **Functional validation locally:** OIDC federation cannot be exercised
  off a runner. Nothing about this was reproducible in a session.
- **Code review:** the reviewer would have had to hold three files at once
  — the workflow's triggers, the role's `subject`, and GitHub's claim
  rules — and notice an absence.
- **Production monitoring / alerting:** **this is the real gap.** Five
  scheduled failures produced no signal anyone acted on. A scheduled
  workflow is the one kind whose failure nobody is waiting for, and this
  repository had no rule that anybody reads its outcomes. It surfaced
  only because a post-merge sweep listed workflow runs for an unrelated
  reason.

## Countermeasure

- **Code:** commit `2c7e27a` — `githubActionsPrincipal` takes a list of
  subjects; `PreviewDeployRole` names both the pull-request claim and the
  default-branch claim.
- **Operator action:** done. `shared-deploy`
  [run 8](https://github.com/hugoleborso/borso.fr/actions/runs/31406952157)
  deployed it on 2026-08-10 at 16:05 UTC.

### Confirmed in production

The next scheduled run,
[31459042008](https://github.com/hugoleborso/borso.fr/actions/runs/31459042008)
on 2026-08-11 at 04:37 UTC, is the first green `schedule` run in this
workflow's history. It authenticated, enumerated every stack, and exited 0
in 13 seconds:

```
[active] keeping pragma-pr-46 (PR #46 is OPEN)
[active] keeping borsouvertures-pr-46 (PR #46 is OPEN)
…16 stacks, all belonging to open pull requests, all kept…
```

**It destroyed nothing, which is the correct outcome and worth stating so
nobody later reads the empty sweep as a second bug.** Every stack in the
account belonged to an open pull request. The stacks for the pull requests
that closed the previous day were already gone, torn down by
`preview.yml`'s close handler — the path that always worked, because it
runs on `pull_request`. This sweeper is the backstop for what that handler
misses, and on its first working night there was nothing for it to catch.

The verification took two attempts. The first check-in was armed for 03:30
UTC because the cron reads `17 3 * * *`; the run had not fired. Scheduled
workflows on this repository have fired between 04:18 and 06:02 every day
observed — one to nearly three hours late — so the declared time is not
when anything happens. See
[`docs/knowledge/github-scheduled-workflows-fire-late.md`](../knowledge/github-scheduled-workflows-fire-late.md).

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility, for the
adjacent failure; see the honest limit below)

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commit [`2c7e27a`](https://github.com/hugoleborso/borso.fr/commit/2c7e27a)

**The actual fix:**

```diff
 export interface GithubSubject {
   readonly repo: string;
-  readonly subject: SubjectKind;
+  /** Every sub claim this role accepts — one per trigger that assumes it. */
+  readonly subjects: readonly SubjectKind[];
 }

   const preview = new Role(scope, 'PreviewDeployRole', {
     assumedBy: githubActionsPrincipal(oidcProviderArn, {
       repo: CONSUMER_REPO,
-      subject: { kind: 'pull_request' },
+      subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: DEFAULT_BRANCH }],
     }),
```

Plus a synth-time throw on an empty list, which used to produce a role no
workflow could assume — failing exactly the way this bug did, at deploy
time, in an STS error naming no cause.

**Where this stops short, stated plainly:** renaming `subject` to
`subjects` makes the *plurality* structural — the type now says a role
trusts a set, so the next author is asked which triggers rather than
being handed a field that looks singular. It does **not** make the
*mismatch* impossible: someone can still add a `schedule:` trigger to a
workflow whose role lists only `pull_request`, and nothing will complain
until a nightly run fails. Closing that would mean parsing every
workflow's `on:` block and its `role-to-assume` and cross-checking
against `deploy-roles.ts` — a real level-1 gate, and the honest reason
it is not in this PR is that it needs a mapping from
`vars.*_ROLE_ARN` to a role construct that no file currently states.
Writing that mapping is the next step, not a smaller version of it.

**Property this widens:** `PreviewDeployRole` is now assumable from any
workflow running on a `main` ref, not only from pull requests. That is
strictly broader than before. It is the narrowest widening that lets a
scheduled sweep authenticate — `kind: 'any'` would also cover every
branch and tag — and the role's PowerUserAccess is unchanged, still
scoped to `*-pr-*` roles.

**Sibling defects swept:** none. `ProdDeployRole` and
`SharedInfraDeployRole` are assumed from one trigger each, both through
GitHub environments, and both keep exactly the trust they had.

## See also

- [`docs/knowledge/github-oidc-sub-claim-per-trigger.md`](../knowledge/github-oidc-sub-claim-per-trigger.md)
  — the claim-per-event table this root cause turns on.
- [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md)
  — found in the same sweep, same shape: a protection described in a
  comment that no run had ever exercised.
- [`cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md)
  — the previous time this sweeper reported success while doing nothing.
  That fix made it fail loudly; this one lets it run at all.
- [`a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
  — the family this belongs to.
