---
date: 2026-08-10
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#40'
fix-commits: [1595450b14, 4e485c8f1a, 458e886c4]
eradication-level: 5
eradication-paths: [scripts/hooks/checks/merge-deploys-prod.core.ts, .github/workflows/shared-deploy.yml]
time-to-detect: months
tags: [github-actions, deploy, claude-md, harness, self-improvement-loop]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
---

# An approval gate that only existed in a comment

## User impact

Right after PR #40 merged, the session told the operator that a shared-infra
deploy was waiting on his approval. He replied: *"I see no shared deploy run
waiting on me."*

| | Seen | Expected |
| --- | --- | --- |
| After the merge of PR #40 | "A shared-infra deploy waits on your approval" | "Dispatch `shared-deploy`, nothing is queued" |
| The operator's dispatch, run 7 | Created at 14:28:05, job started at 14:28:09, nothing approved | The same, since no reviewer rule exists |

Nothing was queued: `shared-deploy.yml` is `workflow_dispatch` only, and
`deploy.yml` has no shared job. The stack that owns the account's OIDC
provider, all three deploy roles and the previews CDN had been described as
reviewer-gated, in two places, for months. The operator was the only person
affected, misled on what protected his account.

## Causal chain

- The session reported a pending approval that did not exist.
  - CLAUDE.md's post-merge rule told it to:

    ```markdown
    1. *Approve the pending shared-infra deploy* in GitHub Actions — **only when the
       merged diff touched `infra/shared/**`** (that deploy waits in the `prod-shared`
       queue until approved).   <!-- ❌ no such queue, no such approval -->
    ```

    - Commit `22298375f` (2026-06-06) wrote that rule. It copied the claim of
      `shared-deploy.yml`'s header.
      - Commit `2c6a1a12c` (2026-05-02) wrote that header:

        ```yaml
        # SharedInfraDeployRole. The `prod-shared` GitHub environment requires
        # Hugo's manual approval before the deploy job actually runs.
        ```

        - The same day, `857fc16ea` wrote `docs/aws-setup.md`, which asks the
          operator to configure *"`prod-shared` — required reviewer:
          yourself"*. The agent described that setup step as the state of the
          environment. The environment's real settings were in no file and no
          tool it had loaded (Material).
  - PR #40 corrected the same sentence for the `prod` environment and left
    the `prod-shared` half standing.

## Root cause of occurrence

*The agent thought a GitHub environment the setup guide says to protect
carries that protection, actually the guide is a step the operator may never
have taken, and an environment with no protection rule only scopes the OIDC
subject the role trusts.* (Material)

The agent's input was the setup guide, a to-do list for the operator. The fact
it needed, the environment's protection rules, lives in GitHub's settings and
was absent from its context. So the description was a plan written in the
present tense. The current header of `shared-deploy.yml` states the fact:
*"An environment with no protection rule only scopes the OIDC subject the role
trusts"*.

## Detection failure causes

- **Typing and linter:** `environment: prod-shared` is a valid string whatever
  rules the environment carries.
- **CI:** no step read the environment. GitHub's REST API returns
  `protection_rules` from `GET /repos/{owner}/{repo}/environments/{name}`
  (inferred from the API reference, not called this session), so a check was
  possible and none existed.
- **Local validation:** six dispatches succeeded. A gate that does not exist
  looks the same as one the operator approves promptly.
- **Review:** the claim is about a settings page a reviewer would have to leave
  the diff to read.
- **Harness:** the CLAUDE.md rule instructed the session to report a pending
  approval, so the documentation produced the false statement.

## Countermeasure

Commit `1595450`, amended by `4e485c8`, replaced the false claims in the
workflow header, the IAM role description and CLAUDE.md with what is true.
`1595450` first made the claim true by adding a typed `confirm` input. The
operator refused it: *"I do not want to have to confirm anything. This repo is
my lab."* A confirmation cannot stop the one person allowed to deploy, so
`4e485c8` removed it. The committed template snapshot,
`infra/shared/test/unit/__snapshots__/borso-shared.template.json`, shows every
change to the stack in the pull request that causes it, so the operator reads
what a deploy will do before dispatching.

## Eradication

**Type:** none for the class (level 5). One path is held structurally: the
post-merge reminder.

**Reference:** commits `1595450` and `4e485c8` ([PR #45](https://github.com/hugoleborso/borso.fr/pull/45))
deleted the false claims. The post-merge reminder is no longer recalled from
prose. Since `458e886c4` (#411) the merge check computes it from the diff at
every merge, in `scripts/hooks/checks/merge-deploys-prod.core.ts`:

```ts
  return changed.some((path) => path.includes(SHARED_SNAPSHOT))
    ? 'YES — the committed borso-shared template moved, so a shared-deploy dispatch is owed after this merge'
    : 'no — the committed borso-shared template is unchanged in this diff';
```

A session can no longer report a queued approval from a belief: the line it
relays names a file in the diff and says "dispatch". The written `Don't` this
entry once added, *"say 'unverified from here' otherwise"*, is gone:
`grep -rn "unverified from here" CLAUDE.md docs/standards` finds nothing.

**The gap that holds:** nothing reads a claim about an environment's
protection rules. `docs/aws-setup.md` still says the end state has *"prod and
prod-shared environments configured with you as required reviewer"* (line 5)
and lists *"`prod-shared` — required reviewer: yourself"* (line 180). That is
the same claim, live today.

**Proposed:** first subtract. Rewrite those two lines of `docs/aws-setup.md`
to say neither environment carries a reviewer, as `deploy.yml` and
`shared-deploy.yml` already do. The coordinator of this sweep adds that rewrite
in the pull request that carries this entry. Then add a CI step that, for each
`environment:` named in `.github/workflows/*.yml`, calls
`GET /repos/{owner}/{repo}/environments/{name}` and fails when its
`protection_rules` disagree with the comment on that line, such as
`deploy.yml:111`'s *"no reviewer gate"*. A claim about a reviewer would then be
checked against GitHub on every pull request, so it could not age into a lie.

**Why level 5:** the merge hook removes the false report on one path, the
post-merge reminder. It detects nothing about the class, a claim about a
protection the repository cannot see. No check reads an environment's rules, so
the level is what holds for the class.

**Proof it can fail:** none today, since no check reads the environments.

**Similar instances:** `grep -rln -i "required reviewer\|requires a reviewer" CLAUDE.md docs .github`,
outside `docs/dantotsus`, `docs/knowledge` and `docs/features`, finds only
`docs/aws-setup.md`, with the two lines above. `grep -n "environment:" .github/workflows/*.yml`
lists `prod` and `prod-shared`. Each workflow comment on them now says no
reviewer gate. [`the-nightly-sweeper-never-had-permission-to-run`](./the-nightly-sweeper-never-had-permission-to-run.md)
is the mirror case from the same sweep: a safety net described that could
never run.
