---
date: 2026-10-29
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: none (preview deploys created environments from their first version)
fix-pr: '#236'
fix-commits: [71455f29]
eradication-level: 1
eradication-paths: [.github/workflows/preview.yml]
time-to-detect: months
tags: [ci, github-actions, previews, cleanup]
zone: .github/workflows/preview.yml
recurs: none (earlier teardown entries leaked AWS stacks and schemas; this one leaked GitHub-side records)
---

# Three hundred and ninety-eight preview environments

## Symptom

The repository's environment list held 401 entries on 2026-10-29: `prod`,
`prod-shared`, `github-pages`, and 398 named `preview-{app}-pr-{N}`, one per
app per pull request since previews began. The operator's estimate was about
200.

## Root-cause chain

1. **Why were there 398?** Every preview deploy calls `createDeployment` with
   a per-PR environment name, and GitHub creates the environment on first use.
2. **Why did none go away?** The teardown job marked each deployment
   `inactive` and left the environment.
3. **Why did the teardown not delete it?** Deletion needs Administration:
   write, which no `permissions:` key grants `GITHUB_TOKEN`, so the call
   would have failed, and nothing tried it.
4. **Why did the inactive step look sufficient?** It made the pull request
   sidebar read cleanly, which was the only place anyone looked.

**Root cause:** thought marking a deployment inactive ended the preview's
footprint on GitHub, actually the environment is a separate record that only
an admin token can delete.

## Detection failure causes

- **CI:** nothing counts environments; a growing list breaks no run.
- **Review:** the environments page is outside every review surface.

## Countermeasure

- **Operator action:** the 398 were deleted with `gh` from a local session on
  2026-10-29, after a guard re-checked each name against
  `^preview-[a-z0-9-]+-pr-[0-9]+$`; 0 failed.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #236](https://github.com/hugoleborso/borso.fr/pull/236) · commit [`71455f29`](https://github.com/hugoleborso/borso.fr/commit/71455f29)

**The actual fix:** the teardown that marks a PR's deployments inactive now
also deletes its environments, with a fine-grained PAT read from
`ENVIRONMENTS_ADMIN_TOKEN`. Creation and deletion now sit in the same
workflow, so a preview cannot leave an environment behind while the secret
holds. Without the secret the step warns; with a broken token it fails the
teardown, which is visible.

```diff
+      - name: Delete every app's preview environment
+        if: always()
+        uses: actions/github-script@v9
+        env:
+          ENVIRONMENTS_ADMIN_TOKEN: ${{ secrets.ENVIRONMENTS_ADMIN_TOKEN }}
+        with:
+          script: |
+            const admin = getOctokit(process.env.ENVIRONMENTS_ADMIN_TOKEN);
+            await admin.rest.repos.deleteAnEnvironment({ … });
```

Not proven yet: PR #236's own teardown skipped all six names with 404,
because that pull request never deployed. The first pull request that closes
with a live preview proves the token.

**Sibling defects swept:** none. `prod` and `prod-shared` are long-lived by
design.

## See also

- [github-environments-outlive-their-pull-requests.md](../knowledge/github-environments-outlive-their-pull-requests.md)
- [dependabot-previews-filled-the-schema-quota.md](./dependabot-previews-filled-the-schema-quota.md), the AWS-side leak of the same lifecycle.
