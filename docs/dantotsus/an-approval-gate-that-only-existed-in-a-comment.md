---
date: 2026-08-10
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: 40
fix-pr: 45
fix-commits: [1595450]
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

- **Code:** commit `1595450` — the gate becomes a `confirm` input checked
  in the repo, `action` defaults to `diff`, and the false claims in the
  workflow header and CLAUDE.md are replaced by what is actually true.
- **Operator action:** optional. If a reviewer rule on `prod-shared` is
  wanted as well, it has to be set in GitHub's settings by hand — and it
  will still be unverifiable from here, which is the point of not relying
  on it.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate moves from an unobservable
settings page into a file the test suite and every reviewer can read)

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commit [`1595450`](https://github.com/hugoleborso/borso.fr/commit/1595450)

**The actual fix:**

```diff
       action:
         type: choice
         options: [deploy, diff, synth]
-        default: deploy
+        default: diff
+      confirm:
+        description: 'Type deploy-shared-infra to allow action=deploy'
+        type: string
+        default: ''

     steps:
+      # Before the checkout, so a mistyped confirmation costs no credentials.
+      - name: Require a typed confirmation to deploy
+        if: inputs.action == 'deploy'
+        env:
+          CONFIRM: ${{ inputs.confirm }}
+        run: |
+          if [ "$CONFIRM" != 'deploy-shared-infra' ]; then
+            echo "::error::action=deploy needs confirm=deploy-shared-infra."
+            exit 1
+          fi
```

**What this does and does not buy, stated plainly:** it does not restrict
*who* can deploy. Anyone who could dispatch the workflow before still
can, and a determined operator types eleven characters. What changes is
that the gate is now a line in a file — greppable, reviewable, and
impossible to describe falsely for months, because the description sits
next to the code that implements it.

The deeper eradication is the rule about rules: **a protection this
repository cannot observe must not be described as if it were enforced.**
CLAUDE.md now says what `prod` and `prod-shared` actually do.

**Sibling defects swept:** the `prod` environment carried the same false
claim and was corrected in PR #40 (commit
[`e79d27a`](https://github.com/hugoleborso/borso.fr/commit/e79d27a)'s
range) — this entry exists because that sweep stopped at the first
instance. `SharedInfraDeployRole`'s IAM description carried the claim too
and is corrected in `2c7e27a`.

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
