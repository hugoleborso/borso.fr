---
date: 2026-08-15
introduced-at: conception
detected-at: ci
severity: low
related-pr: '#51'
fix-pr: '#51'
fix-commits: [69574f6]
eradication-level: 4
time-to-detect: 3 days
tags: [ci, github-actions, cdk, preview]
---

# Redeployed four previews to move one markdown file

## Symptom

A commit on the kaizen branch changed `CLAUDE.md` and one file under
`docs/dantotsus/`. Nothing under `apps/` and nothing under `infra/` moved. The
`preview` workflow then ran its deploy matrix for `borso-fr`,
`borsouvertures`, `last-loop-lepin` **and** `pragma` — four checkouts, four
`pnpm install`s, four CDK deploys, four seeds, against an account where all
four previews were already serving exactly that build.

Every push on that pull request had done the same thing since the branch
opened.

## Root-cause chain

1. **Why did the matrix contain four apps?** Because `detect` computes it from
   `dorny/paths-filter@v3`, and the filter reported all four app groups as
   changed.
2. **Why did the filter report all four?** Because on a `pull_request` event
   the action diffs the head against the **base branch**, not against the
   previous commit. The pull request renames files in all four apps, so at
   every point in its life the answer is "all four".
3. **Was the filter wrong?** No. It answered its question exactly right. The
   question is *"what does this pull request touch"*, which is the right
   question for deciding whether to run tests, and the wrong one for deciding
   whether to deploy.
4. **Why was that mismatch not visible?** Because the two questions coincide on
   a single-commit pull request, which is what the workflow was written and
   tried against. They only diverge once a branch accumulates pushes, and by
   then the extra work looks like normal cost rather than waste — the run is
   green, the previews are correct, and nothing in the log says a deploy
   changed nothing.
5. **Why did nothing say so?** Because no step in the job knew what was already
   deployed. The workflow's whole model of the account was "run `cdk deploy`
   and let CloudFormation work it out", and CloudFormation happily accepts a
   no-op update — after five minutes of install, build and synth.

**Root cause:** thought *"deploy the apps this pull request changed"*, actually
*"deploy the apps whose deployed build is no longer the one the head commit
describes"*. Those are the same sentence only on the first push.

## Detection failure causes

- **Typing / linter:** not applicable — `actionlint` checks the workflow's
  shape, and this workflow was shaped correctly for a question it should not
  have been asking.
- **CI:** the failure mode *is* CI, and it presented as success. A wasted
  deploy and a needed one are indistinguishable in a green run; only the
  duration differs, and duration has no baseline here.
- **Code review:** the matrix expansion is one line of `jq` in `detect`, and
  reading it tells you what it does. What it does not tell you is what
  `paths-filter` compares against, which is documented in the action, not in
  the workflow that calls it.
- **Cost monitoring:** none exists. The account has no budget alarm on Actions
  minutes, and a preview deploy of a static site plus a Lambda is cheap enough
  per run that four of them per push never surfaced as a number anybody saw.

## Countermeasure

- **Code:** commit `69574f6` — every matrix job now decides for itself whether
  it has anything to do, before it installs anything.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — the job compares the repository against the
account and stops when they already agree)

**Reference:** [PR #51](https://github.com/hugoleborso/borso.fr/pull/51) ·
commit `69574f6`

**The actual fix:**

```diff
       - uses: actions/checkout@v4
-      - uses: pnpm/action-setup@v4
-      - run: pnpm install --frozen-lockfile
+      - id: fingerprint
+        run: |
+          trees=$(git rev-parse "HEAD:apps/${APP}" HEAD:infra/cdk)
+          files=$(git hash-object pnpm-lock.yaml .nvmrc .github/workflows/preview.yml)
+          digest=$(printf '%s\n%s\n' "$trees" "$files" | sha256sum | cut -d' ' -f1)
+          echo "digest=$digest" >> "$GITHUB_OUTPUT"
+      - id: deployed        # digest recorded by the last deploy that reached `success`
+      - id: plan            # skip only if the digests match AND the stack is CREATE/UPDATE_COMPLETE
+      - if: steps.plan.outputs.skip != 'true'
+        uses: pnpm/action-setup@v4
```

The digest of the last successful deploy lives in the payload of the GitHub
Deployment that deploy opened, which means the record of what is live is
written by the thing that made it live, in the same repository, with no bucket
and no extra credential. A deployment whose statuses never reached `success`
is ignored, so a failed deploy cannot claim its inputs are serving.

Measured on this pull request, across the two pushes that straddle the change.
Push `b339ad7` changed `preview.yml` itself, so every digest differed and all
four apps deployed in full; push `193ee6e` moved one markdown file, so all four
skipped:

| push | borso-fr | borsouvertures | pragma | last-loop-lepin |
| --- | --- | --- | --- | --- |
| `b339ad7` — deployed | 58 s | 57 s | 61 s | 75 s |
| `193ee6e` — skipped | 14 s | 19 s | 13 s | 15 s |

The deployed row is the cost of the old behaviour on *every* push, and what it
bought is visible in its own log: `borso-fr-pr-51 (no changes)`, reached after
a checkout, an install, an `@borso/infra` build and a synth. The `detect` job
still runs and still names four apps; it is right to, and now it costs a minute
of runner time instead of four full deploys.

Both halves of the decision fail open, and that is the property worth keeping:
an unreadable deployment list, an absent payload, a missing stack, a
rolled-back stack, or a digest that cannot be computed all deploy exactly as
the workflow did before. The check can only ever remove work, never skip a
deploy that was owed.

**Why level 4 and not higher.** The structural fix would be for `detect` to
ask the right question — diff against the last deployed commit rather than
against the base branch. That requires knowing which commit that was, which is
the same lookup the fingerprint does, so it buys nothing and loses the stack
check. Asking the deploy job itself is where the information is.

**Why the fingerprint is a tree hash and not a file list.** `git rev-parse
HEAD:apps/pragma` changes if and only if some byte under that directory
changed, with no glob to keep in sync with the directory it describes. The one
maintenance obligation left is the reverse: an input added to the build and not
to the digest would let a preview go stale silently, so the list carries a
comment naming that as the failure mode.

## See also

- [`preview-deploys-never-delete-what-you-removed.md`](../knowledge/preview-deploys-never-delete-what-you-removed.md)
  — the other way a preview stops matching the branch that produced it.
- [`cdk-destroy-all-wipes-the-shared-cluster-stack.md`](./cdk-destroy-all-wipes-the-shared-cluster-stack.md)
  — the teardown half of the same workflow.
