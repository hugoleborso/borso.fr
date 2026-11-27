---
date: 2026-10-29
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: none (preview deploys created environments from their first version, commit 2c6a1a12c)
fix-commits: [71455f29]
eradication-level: 4
eradication-paths: [.github/workflows/preview.yml]
time-to-detect: months
tags: [ci, github-actions, previews, cleanup]
zone: .github/workflows/preview.yml
recurs: none (earlier teardown entries leaked AWS stacks and schemas; this one leaked GitHub-side records)
---

# Three hundred and ninety-eight preview environments

## User impact

The operator opened the repository's environment list on 2026-10-29 and
counted 401 entries (measured by the operator).

| | Seen | Expected |
| --- | --- | --- |
| Settings, Environments | `prod`, `prod-shared`, `github-pages` and 398 `preview-{app}-pr-{N}`, one per app per pull request since previews began | `prod`, `prod-shared`, `github-pages`, plus one per open pull request |

The operator's own estimate was about 200. No end user of the apps saw it.

## Causal chain

- The environment list held 398 preview environments.
  - Every preview deploy created one, and no teardown removed one.
    - The deploy calls `createDeployment` with a per-PR name, and GitHub
      creates the environment on first use
      (`.github/workflows/preview.yml:296-303`):

      ```js
      environment: `preview-${{ matrix.app }}-pr-${{ github.event.pull_request.number }}`,
      transient_environment: true,   // ← read as "GitHub removes this environment later"
      ```

    - The teardown only posted an `inactive` status on each deployment and
      stopped there. Its comment, still in `preview.yml:523-526`, states the
      belief: "transient_environment + auto_inactive on the active status
      mean GitHub already hides it once the env is unused".
      - Commit `2c6a1a12c` (2026-05-02, written by an agent) added both the
        `transient_environment: true` deployment and the inactive-only
        teardown, with the message "Marked transient + non-production;
        teardown closes them with state=inactive".
        - Its input was GitHub's REST reference, whose parameter text promises
          a lifecycle (Material, below). Inferred: the commit cites no source,
          and its parameter use matches that reference.

## Root cause of occurrence

*Thought `transient_environment: true` makes GitHub retire the environment
once its deployments go inactive, actually the flag only describes the
deployment and the environment stays until a token with Administration write
deletes it.* **Material:** the vendor's parameter name and description were
the input, and they read as a cleanup promise.

GitHub's [Deployments REST reference](https://docs.github.com/en/rest/deployments/deployments),
read this session: "`transient_environment` (boolean) Specifies if the given
environment is specific to the deployment and will no longer exist at some
point in the future." Nothing in that text says GitHub is the one that
removes it.

## Detection failure causes

- **CI:** no job counts environments, so a growing list breaks no run.
- **Review:** the environments page sits in repository settings, outside the
  diff and the pull request sidebar every review reads.
- **Monitoring:** the pull request sidebar was the only surface showing
  deployments, and the inactive status made it read cleanly, so the visible
  surface confirmed the belief.

## Countermeasure

The 398 environments were deleted with `gh` from a local session on
2026-10-29. A guard re-checked each name against
`^preview-[a-z0-9-]+-pr-[0-9]+$` first. 0 deletions failed (measured in that
session).

## Eradication

**Type:** detection (level 4)

**Reference:** [PR #236](https://github.com/hugoleborso/borso.fr/pull/236),
commit [`71455f29`](https://github.com/hugoleborso/borso.fr/commit/71455f29).

The teardown now deletes each app's environment for the closed pull request,
with a fine-grained token read from `ENVIRONMENTS_ADMIN_TOKEN`
(`preview.yml:550-580`). The operator stored that secret
(`docs/operator-backlog/environments-admin-token.md`, `status: done`, closed
2026-11-11). A broken token fails the teardown, which is visible. A missing
secret only prints a warning and exits cleanly (`preview.yml:563-565`), so
the cleanup holds only while the secret holds. That is why the level is 4
and not 1.

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

The misleading comment at `preview.yml:523-526` is still there (read this
session).

**Proof it can fail:** the operator-backlog file records the teardown of run
43088554711 sending its `DELETE` to `environments/preview-talos-pr-294`.

**Proposed:** subtract the per-PR name. Create every preview deployment in
one environment per app, `preview-<app>`, set the deployment `ref` to the
pull request's head branch, and make the fingerprint lookup
(`preview.yml:216-221`) and the teardown filter `listDeployments` by that
`ref` as well as the environment. Deployments stay `transient_environment:
true`, which GitHub's reference excludes from `auto_inactive`, so one pull
request's status cannot retire another's (inferred from that reference, not
tried). The environment count is then capped by the number of apps. The admin
token, its secret, the delete step and the misleading comment all go, and no
closed pull request can leave an environment behind.

**Similar instances:** `grep -n "createDeployment" .github/workflows/*.yml`
finds only `preview.yml`. `prod` and `prod-shared` are long-lived by design.
The AWS side of the same lifecycle is
[dependabot-previews-filled-the-schema-quota.md](./dependabot-previews-filled-the-schema-quota.md),
and the vendor fact is in
[github-environments-outlive-their-pull-requests.md](../knowledge/github-environments-outlive-their-pull-requests.md).
