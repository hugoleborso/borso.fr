---
date: 2026-10-12
introduced-at: conception
detected-at: ci
severity: medium
related-pr: commit a285b836 (feat(ci): add dependabot with a cooldown before updates are proposed)
fix-pr: <to-be-filled>
fix-commits: []
eradication-level: 1
time-to-detect: days (Dependabot previews from 2026-10-05, first refused deploy 2026-10-10)
tags: [dsql, github-actions, dependabot, previews, quota, commitlint]
---

# Five pull requests nobody read held the database three people needed

## Symptom

On 2026-10-10, pull requests #164, #165 and #166 got no preview of `pragma`, `banana-rush` or `last-loop-lepin`. The deploy job failed inside CloudFormation, on the schema resource:

```
AppDbSchemaE757C77A  Received response status [FAILED] from custom resource.
Message returned: more than 10 schemas not allowed
```

The message names a limit and no culprit. The reader learns that a database is full, not which pull requests filled it, and the stack is left in `ROLLBACK_COMPLETE`.

At that moment `banana-rush` had nine preview stacks standing: #118, #124, #126, #127, #152, #155, #157, #161 and #163. Four of them, #124, #126, #127 and #152, were Dependabot pull requests opened on 2026-10-05 and not read since.

## Root-cause chain

1. **Why did the deploy fail?** The migration runner asked the `banana-rush` DSQL cluster for an eleventh schema, `pr_164`, and Aurora DSQL refuses more than ten schemas per database.
2. **Why were ten taken?** Every full-stack preview owns one schema, `pr_<n>`, beside `prod`. That leaves nine preview slots per cluster, and nine previews were standing.
3. **Why were nine standing?** `preview.yml` deploys a preview for every open pull request that touches an app, and a preview lives until its pull request closes.
4. **Why did a third of them belong to nobody?** Dependabot opens pull requests on a schedule, and a dependency bump changes `pnpm-lock.yaml`, which puts every app whose lockfile entries moved into the preview matrix. Those pull requests are reviewed through CI, not through a preview, and stay open until someone merges them.
5. **Why did no one see the slots running out?** Nothing counted them. The first sign was the eleventh request, and the error it raised came from inside a custom resource.

**Root cause:** the workflow was written as if a preview were free and every open pull request had a reader, but a full-stack preview spends one of nine schemas on a cluster, and Dependabot opens pull requests nobody opens a preview for.

If that had been known, the preview job would have been limited to pull requests a person reads, and would have counted the slots before spending one.

## Detection failure causes

- **CI (tests / build):** the deploy does not fail until CloudFormation is already creating the stack, and the error does not say who holds the schemas.
- **Code review:** the Dependabot change (commit a285b836) touched `.github/dependabot.yml` only. Nothing in that file mentions previews, so the cost it added in another workflow was not in the diff.
- **Monitoring:** nothing watches the number of schemas on a cluster. The DSQL limit is not a Service Quotas entry (`aws service-quotas list-service-quotas --service-code dsql` lists connections, cluster size and cluster counts only), so no quota alarm could have fired either.

## Countermeasure

- **Code:** `preview.yml` skips `detect`, and therefore `deploy`, when `github.event.pull_request.user.login` is `dependabot[bot]`. The condition is on the pull request's author rather than `github.actor`, so a person pushing to a Dependabot branch does not bring the preview back. CI, which is `ci.yml`, still runs every test and build on those pull requests.
- **Code:** `teardown` also runs on every push of a Dependabot pull request, not only on close. Its existing probe destroys the stacks that exist and stays quiet about the rest, so the previews Dependabot pull requests already hold are freed on their next rebase.
- **Operator action:** none. A Dependabot pull request still holding a preview frees it when it is closed, merged or rebased.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** fix PR · commits listed in the front matter once merged

**The actual fix:**

```diff
 jobs:
   detect:
-    if: github.event.action != 'closed'
+    if: github.event.action != 'closed' && github.event.pull_request.user.login != 'dependabot[bot]'
 …
   teardown:
-    if: github.event.action == 'closed'
+    if: github.event.action == 'closed' || github.event.pull_request.user.login == 'dependabot[bot]'
```

**Type:** detection (level 4)

The same exhaustion can still come from ten human pull requests. `scripts/preflight-preview-schema-budget.sh` runs in the deploy job before CloudFormation is called. It counts the application's standing `<app>-pr-<n>` stacks, which own one schema each, and fails when all nine slots are taken, listing each pull request holding one with its state and author:

```diff
+      - name: Preview schema budget
+        if: steps.plan.outputs.skip != 'true'
+        run: ./scripts/preflight-preview-schema-budget.sh "${{ matrix.app }}" "$PR_NUMBER"
```

A redeploy of a preview that already stands passes, because it keeps its schema. An app whose CDK stack declares no `database:` passes, because it owns no schema.

**Why not a bigger fix.** Raising the limit is not available: schemas per database is not in Service Quotas, unlike the cluster count. One cluster per preview would trade nine slots for twenty, the account's single-Region cluster quota, shared by every app, and would add cluster creation to every preview deploy. Sharing one schema between previews breaks what a preview is for: each one runs its own migrations and its own seed. Counting stacks is the simplest check that holds, because the stack and the schema are created and destroyed together.

**Sibling defects swept:** commitlint rejected Dependabot's commits (`chore(deps): Bump typescript …` fails `subject-case`, measured on #124's commit). `.github/dependabot.yml` cannot fix that: its `commit-message` options are `prefix`, `prefix-development` and `include`, and none sets the case of the subject. `commitlint.config.js` now ignores commits carrying Dependabot's `Signed-off-by: dependabot[bot]` line, and a person's sentence-case subject still fails.

## See also

- [`cdk-destroy-all-wipes-the-shared-cluster-stack.md`](./cdk-destroy-all-wipes-the-shared-cluster-stack.md), the other way a preview workflow can reach the shared cluster.
- [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md), why a lockfile change puts apps into the preview matrix.
