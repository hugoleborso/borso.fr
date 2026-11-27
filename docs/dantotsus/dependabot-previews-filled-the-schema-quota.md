---
date: 2026-10-12
introduced-at: conception
detected-at: ci
severity: medium
related-pr: none (introduced by commit a285b836, pushed without a pull request)
fix-commits: [20004695]
eradication-level: 4
time-to-detect: days (Dependabot previews from 2026-10-05, first refused deploy 2026-10-10)
tags: [dsql, github-actions, dependabot, previews, quota, commitlint]
eradication-paths: [.github/workflows/preview.yml, scripts/preflight-preview-schema-budget.sh]
zone: .github/dependabot.yml
recurs: none (the destroy-all entry deleted the shared cluster stack; this one exhausted its schema quota)
---

# Five pull requests nobody read held the database three people needed

## User impact

On 2026-10-10, pull requests #164, #165 and #166 got no preview of
`pragma`, `banana-rush` or `last-loop-lepin`. The deploy job failed inside
CloudFormation and left the stack in `ROLLBACK_COMPLETE`.

| | Seen | Expected |
| --- | --- | --- |
| Preview deploy of #164 | `AppDbSchemaE757C77A Received response status [FAILED] from custom resource. Message returned: more than 10 schemas not allowed` | a preview URL in the sticky comment |

The message names a limit and no culprit. At that moment `banana-rush` had
nine preview stacks standing: #118, #124, #126, #127, #152, #155, #157,
#161 and #163. Four of them, #124, #126, #127 and #152, were Dependabot
pull requests opened on 2026-10-05 and not read since (measured from the
stack list when the entry was written).

## Causal chain

- The deploy of #164 failed on the schema resource.
  - The migration runner asked the `banana-rush` DSQL cluster for an eleventh schema, `pr_164`. Aurora DSQL refuses more than ten schemas per database.
    - Ten were taken. Each full-stack preview owns one schema `pr_<n>` beside `prod`, which leaves nine preview slots, and nine previews stood.
      - `preview.yml` deployed a preview for every open pull request that touched an app, and kept it until the pull request closed.
      - Four of the nine belonged to Dependabot pull requests opened on 2026-10-05. Each bumped `pnpm-lock.yaml`, which put every app whose lockfile entries moved into the preview matrix.
        - Commit a285b836 (2026-08-09) turned Dependabot on with `open-pull-requests-limit: 5`. It sized that limit as reviewer attention: "Limit of 5 open, because one developer with a longer queue has a queue that gets ignored." It never mentions previews.
          - The ten-schema limit was written nowhere in the repository at that commit (measured, `git grep -i "10 schemas\|schemas per" a285b8363^ -- docs .claude CLAUDE.md` finds no such line).

## Root cause of occurrence

*Thought the cost of an open Dependabot pull request is a reader's
attention, actually every open pull request that touches a full-stack app
also holds one of nine preview schemas on that app's cluster, whether
anyone reads it or not.*

Tag: **Material** (agentic rule). The agent that wrote a285b836 had no
document in its context that tied a preview to a schema or named the
ten-schema limit. The limit first appears in this entry and in
`scripts/preflight-preview-schema-budget.sh`.

## Detection failure causes

- **CI:** the deploy fails only once CloudFormation is creating the stack, and the custom resource's error does not say who holds the schemas.
- **Review of a285b836:** the diff touched `.github/dependabot.yml` only. The cost it added lived in `preview.yml`, outside the diff.
- **Monitoring:** nothing counts the schemas on a cluster. The DSQL limit is not a Service Quotas entry (`aws service-quotas list-service-quotas --service-code dsql` lists connections, cluster size and cluster counts only), so no quota alarm could fire.

## Countermeasure

`preview.yml` skips `detect`, and therefore `deploy`, when
`github.event.pull_request.user.login` is `dependabot[bot]`. The condition
reads the pull request's author, not `github.actor`, so a person pushing
to a Dependabot branch does not bring the preview back. `ci.yml` still
runs every test and build on those pull requests. `teardown` also runs on
every push of a Dependabot pull request, so the previews they already held
were freed on their next rebase.

## Eradication

**Type:** detection (level 4), with Dependabot's share structural.

**Reference:** commit [`20004695`](https://github.com/hugoleborso/borso.fr/commit/20004695), PR #169.

```diff
   detect:
-    if: github.event.action != 'closed'
+    if: github.event.action != 'closed' && github.event.pull_request.user.login != 'dependabot[bot]'
 …
+      - name: Preview schema budget
+        run: ./scripts/preflight-preview-schema-budget.sh "${{ matrix.app }}" "$PR_NUMBER"
```

What holds today has a gap. A Dependabot pull request can no longer hold
a slot (`.github/workflows/preview.yml:52` and `:461`). Ten human pull
requests left open and idle still fill the nine slots. The preflight
script only detects that, before CloudFormation is called, and names each
pull request holding a slot with its state and author.

Bigger fixes were weighed when the entry was written. Raising the limit is
not available, since it is not a Service Quota. One cluster per preview
would spend the account's cluster quota, shared by every app. One schema
shared by previews breaks what a preview is for, its own migrations and
seed.

**Proof it can fail:** not rerun for this rewrite. The script fails when
the count of standing `<app>-pr-<n>` stacks reaches nine (read from its
source).

**Proposed:** tie a slot to a reader for every author, not only
Dependabot. `preview.yml` would tear a preview down when its pull request
turns draft, or after a period with no push, and redeploy it on
`ready_for_review` or the next push. No pull request without a reader could
then hold a schema. This changes what the operator sees on idle pull
requests, so it is a product call to put to him before it is built.

**Similar instances:** Dependabot's `chore(deps): Bump …` subjects also
failed commitlint's `subject-case` (measured on #124's commit). PR #169
added an `ignores` entry for Dependabot. PR #314 has since turned
`subject-case` off for everyone, see
[`commitlint-refused-every-proper-noun`](./commitlint-refused-every-proper-noun.md).
[`a-dev-dependency-that-redeployed-every-app`](./a-dev-dependency-that-redeployed-every-app.md)
explains why a lockfile change puts apps in the preview matrix.
