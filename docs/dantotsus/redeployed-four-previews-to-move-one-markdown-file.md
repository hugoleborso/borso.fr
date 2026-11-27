---
date: 2026-08-15
introduced-at: conception
detected-at: ci
severity: low
related-pr: '#51'
fix-commits: [69574f6e88]
eradication-level: 4
eradication-paths: [.github/workflows/preview.yml]
time-to-detect: 3 days
tags: [ci, github-actions, cdk, preview]
zone: .github/workflows/preview.yml
---

# Redeployed four previews to move one markdown file

## User impact

The operator waited on four full preview deploys for a push that changed only
`CLAUDE.md` and one file under `docs/dantotsus/`. Nothing under `apps/` or
`infra/` moved. The `preview` workflow still ran its deploy matrix for
`borso-fr`, `borsouvertures`, `last-loop-lepin` and `pragma`: four checkouts,
four `pnpm install`s, four CDK deploys and four seeds, against previews already
serving that build. Every push on PR #51 had done the same since it opened.

| Push on PR #51 | Seen | Expected |
| --- | --- | --- |
| docs-only push | four deploys, 57 to 75 s each, each ending in `borso-fr-pr-51 (no changes)` | no deploy |

## Causal chain

- Four preview deploys ran for a docs-only push.
  - The deploy matrix named all four apps.
    - `detect` builds the matrix from `dorny/paths-filter@v3`, which reported
      all four app groups as changed.
      - On a `pull_request` event the action diffs the head against the base
        branch, not against the previous push. PR #51 renamed files in all four
        apps, so every push answered "all four".
  - Each matrix job installed, built, synthesised and ran `cdk deploy` for its
    app.
    - The job deployed every app the matrix named, and CloudFormation accepted
      the no-op update after the install, build and synth.
      - 56258c2b0 (2026-05-02) wrote `detect` and the deploy job, deciding what
        to deploy from what the pull request touched.

## Root cause of occurrence

*Thought "deploy the apps this pull request changed", actually "deploy the apps
whose deployed build is no longer the one the head commit describes". The two
coincide only on the first push.* (Method)

The workflow answered the question that fits tests, "what does this pull request
touch", and used it to decide a deploy, whose question is "what differs from
what is deployed". Nothing in the job read the account's state.

## Detection failure causes

- **Linter:** `actionlint` checks the workflow's shape, and the shape was right
  for the question it asked.
- **Local validation:** the workflow was tried on single-commit pull requests,
  where both questions give the same answer. They diverge only once a branch
  takes several pushes (inferred from the PR history).
- **CI:** a wasted deploy and a needed one are both green. Only the duration
  differs, and duration has no baseline.
- **Review:** the matrix is one line of `jq` in `detect`. What `paths-filter`
  compares against is documented in the action, not in the calling workflow.
- **Monitoring:** no budget alarm on Actions minutes exists, and one preview
  deploy is cheap enough that four per push never showed as a number.

## Countermeasure

69574f6e8 makes every matrix job decide for itself, before it installs
anything, whether its app's inputs are already deployed. `detect` still names
four apps.

## Eradication

**Type:** detection (level 4)

**Reference:** commit 69574f6e8, [PR #51](https://github.com/hugoleborso/borso.fr/pull/51).

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
Deployment that deploy opened. A deployment that never reached `success` is
ignored. Every unreadable or missing input deploys as before, so the check can
only remove work, never skip a deploy that was owed.

Measured on PR #51. Push `b339ad7` changed `preview.yml`, so all four deployed
(58, 57, 61 and 75 s). Push `193ee6e` moved one markdown file, so all four
skipped (14, 19, 13 and 15 s).

`detect` cannot ask the right question itself. It would need the last deployed
commit, which is the same lookup, and it would lose the stack-status check.

The digest's tree hashes need no upkeep: `git rev-parse HEAD:apps/pragma`
changes exactly when a byte under that folder does. Its file list does:
`pnpm-lock.yaml .nvmrc .github/workflows/preview.yml`
(`.github/workflows/preview.yml`, the `fingerprint` step) is kept by hand, and
an input added to the build and not to that list would let a preview go stale
silently. A comment above the step names that risk, and nothing holds it.
Catalog versions in `pnpm-workspace.yaml` do reach the lockfile, so no missing
input was found today.

**Proposed:** none clearly better than the deploy job comparing itself with the
account. The file list is the one weak point, and a check that derives it from
what the build reads does not exist.

**Proof it can fail:** push `b339ad7` above, where a changed input deployed all
four.

**Similar instances:** the production deploy workflow decides by the same
paths filter on a merge, where one merge is one push, so the two questions
coincide (inferred).
