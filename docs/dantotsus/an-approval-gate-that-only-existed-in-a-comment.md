---
date: 2026-08-10
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: 40
fix-pr: 45
fix-commits: [1595450, 4e485c8]
eradication-level: 2
time-to-detect: months
tags: [github-actions, deploy, claude-md, harness, self-improvement-loop]
---

# An approval gate that only existed in a comment

## Symptom

Right after PR #40 merged, I told the operator that a shared-infra deploy
was waiting on their approval, because CLAUDE.md says so:

> **`infra/shared` changes are the exception:** they deploy through the
> `prod-shared` environment, which still requires a reviewer.

They replied: *"I see no shared deploy run waiting on me."*

They were right twice over.

1. **Nothing was queued.** `shared-deploy.yml` is `workflow_dispatch`
   only. A merge never enqueues it; `deploy.yml` has no shared job.
2. **The reviewer rule does not exist.** When the operator dispatched the
   workflow, the run was created at `14:28:05` and its job started at
   `14:28:09` — four seconds, no pause, nothing approved. A required
   reviewer holds the run in `waiting`.

So the stack that owns the account's OIDC provider, all three deploy
roles and the previews CDN had been described as reviewer-gated, in two
places, for months, and was not.

## Root-cause chain

1. **Why did I report a pending approval?** CLAUDE.md stated one, and I
   trusted it without opening the workflow.
2. **Why did CLAUDE.md state one?** `shared-deploy.yml`'s header comment
   states it too. The prose was consistent with itself and with nothing
   else.
3. **Why did the comment survive being false?** Nothing in the repository
   can observe a GitHub environment's protection rules. There is no API
   in the test suite's reach, no file to lint. The claim was unfalsifiable
   from inside the repo, so it aged without resistance.
4. **Why was it never noticed in practice?** Six prior dispatches all
   succeeded. A gate that does not exist looks exactly like a gate the
   operator approves promptly.
5. **Why did PR #40 not catch it?** PR #40 corrected this *exact*
   sentence for the `prod` environment — the role description now reads
   "the merge to main is the gate, not a reviewer rule" — and left the
   `prod-shared` half standing. The correction was applied to the instance
   in front of me rather than to the claim.

**Root cause:** *thought a GitHub environment named in a workflow enforces
the protections we described for it, actually an environment with no
protection rule only scopes the OIDC subject the role trusts — and no
test, lint, or type in this repository can read which it is, so the
description was never checkable.*

## Detection failure causes

- **Typing / linter:** nothing to type. `environment: prod-shared` is a
  valid string whichever rules the environment carries.
- **CI:** green forever. CI has no view of environment settings.
- **Functional validation:** six successful dispatches, each of which
  would look identical with or without an approval step.
- **Code review:** the claim reads as a statement of fact about a settings
  page a reviewer would have to leave the diff to check, and would then
  find matching the comment only if they knew where to look.
- **Harness:** the strongest layer here, and it fired backwards — the
  CLAUDE.md rule *instructed* me to report a pending approval, so the
  documentation actively produced the false statement instead of merely
  permitting it.

## Countermeasure

- **Code:** commit `1595450`, amended by `4e485c8` — the false claims in
  the workflow header, the IAM role description and CLAUDE.md are replaced
  by what is actually true, and the post-merge reminder is re-keyed to an
  artefact instead of a queue.
- **Operator action:** none. Dispatch the workflow when the snapshot moved.

## Eradication (mandatory — code-level)

**Type:** code diff (level 2 — the reminder that produced the false
statement is re-keyed to a file in the diff, so it can no longer fire on
a belief)

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commits [`1595450`](https://github.com/hugoleborso/borso.fr/commit/1595450),
[`4e485c8`](https://github.com/hugoleborso/borso.fr/commit/4e485c8)

### The eradication I first shipped, and why it was wrong

`1595450` made the claim true by adding the gate: a typed `confirm` input
required for `action=deploy`, with `action` defaulting to `diff`. The
operator rejected it immediately and correctly:

> I do not want to have to confirm anything. This repo is my lab. Any
> friction makes it less likely to be so.

The reasoning is worth keeping, because the mistake is easy to repeat.
The defect was **a false description**, and I fixed it by making the
description true — which is the lazy direction, and it silently changed
the product to match the documentation rather than the reverse. In a
one-person repository where the only dispatcher is the owner, a
confirmation prompt has no threat model: it cannot stop the one person
authorised to do the thing. It buys the *appearance* of safety at a cost
paid on every deploy, forever.

`4e485c8` removes it. `action` defaults to `deploy` again.

**What replaces it — and it is strictly better than the prompt:** the
committed template snapshot from
[`a-comment-that-shipped-to-the-cloudfront-edge.md`](./a-comment-that-shipped-to-the-cloudfront-edge.md).
Every change to `borso-shared` appears in the pull request that causes it,
so the operator reads what a deploy will do *before* dispatching. A
confirmation asks "are you sure?" of somebody who has no way to know; a
snapshot tells them what they are confirming. **Prefer making the
consequence visible over making the action harder** — now a `Don't` in
CLAUDE.md.

### The eradication that actually addresses the root cause

Two changes, neither of which costs anything at deploy time:

1. **The reminder is keyed to an artefact.** CLAUDE.md's post-merge rule
   used to say *"approve the pending shared-infra deploy when the diff
   touched `infra/shared/**`"* — a queue that does not exist, gated on a
   condition that is neither necessary nor sufficient. It now says: the
   committed snapshot moved, therefore dispatch. A file in the diff cannot
   be misremembered.
2. **A new `Don't`:** *don't describe a protection this repository cannot
   observe as if it were enforced.* Environment reviewer rules, branch
   protection and repository secrets are invisible to every test, lint and
   type here, so claims about them age without resistance. State what the
   repo can check; say "unverified from here" otherwise.

```diff
-  1. *Approve the pending shared-infra deploy* … **only when the merged diff
-     touched `infra/shared/**`** (that deploy waits in the `prod-shared`
-     queue until approved).
+  1. *Ask the operator to dispatch `shared-deploy`* — **whenever the merged diff
+     changes the synthesized `borso-shared` template**, which is not the same
+     thing as touching `infra/shared/**`. … **Check, don't infer:** the committed
+     snapshot changes in the diff exactly when a deploy is owed. Nothing is ever
+     queued or awaiting approval — say "dispatch it", never "approve it".
```

**Sibling defects swept:** the `prod` environment carried the same false
claim and was corrected in PR #40 — this entry exists because that sweep
stopped at the first instance. `SharedInfraDeployRole`'s IAM description
carried it too, corrected in `2c7e27a` and again in `4e485c8`.

## See also

- [`the-nightly-sweeper-never-had-permission-to-run.md`](./the-nightly-sweeper-never-had-permission-to-run.md)
  — found in the same sweep. Same shape, opposite direction: there a
  safety net was described and could never run; here a gate was described
  and never existed.
- [`lectured-without-reading-the-code.md`](./lectured-without-reading-the-code.md)
  — the failure I committed on top of the config's: asserting a queued run
  from prose, without opening `shared-deploy.yml`.
- [`post-merge-deploy-and-kaizen-reminder.md`](./post-merge-deploy-and-kaizen-reminder.md)
  — the rule whose wording produced the false report.
- [`a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
