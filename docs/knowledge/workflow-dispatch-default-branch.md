---
date: 2026-05-02
introduced-at: n/a-vendor-knowledge
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: n/a (GitHub behaviour; no code fix)
time-to-detect: minutes (Hugo couldn't find the workflow in the UI)
tags: [github-actions, workflow-dispatch, vendor-quirk]
---

# `workflow_dispatch` workflows only show in the UI once on the default branch

## Symptom

PR #2 introduced `.github/workflows/shared-deploy.yml` with
`on: workflow_dispatch`. While the PR was open, Hugo opened the
**Actions** tab and looked for a "Run workflow" button against
`shared-deploy`. Nothing — the workflow was invisible even when
the PR branch was selected.

User impact: Hugo could not deploy shared infra via the UI for the
PR that introduced the workflow itself. The first run had to be
done locally; the workflow only became UI-triggerable after merge.

## Root-cause chain

1. **Why?** `shared-deploy` doesn't appear in the Actions UI.
   Because GitHub's Actions UI lists workflows by reading the
   workflow files that exist on the repository's **default branch**,
   not on any feature branch.
2. **Why does GitHub work that way?**
   Two reasons: (a) security — `workflow_dispatch` is an
   action-execution surface, and trusting a feature branch to
   define dispatchable workflows lets a PR author run code with
   write-scope tokens; (b) discoverability — the Actions UI needs
   a stable list, not one that changes per branch.
3. **Why does the same constraint apply to a slash-command
   listener (proposed but not built)?**
   `issue_comment` event handlers also run from the default branch's
   copy, for the same security reason. So a `/deploy-shared` slash
   command introduced in a PR can't take effect until the PR
   merges.
4. **Why is the "Run workflow" button still useful for new
   workflows?**
   Once the workflow file exists on the default branch
   (post-merge), the UI shows the button AND lets you run against
   any branch — including a fresh PR's branch. So
   `workflow_dispatch` is genuinely useful for testing PR-branch
   code, just not for *bootstrapping* the workflow itself.

**Root cause:** we thought `workflow_dispatch` workflows were
triggerable from any branch they exist on. Actually GitHub
evaluates `workflow_dispatch` and `issue_comment` events against
the workflow file on the default branch only, so a workflow
introduced by a PR doesn't appear in the UI until that PR merges.

## Detection failure causes

- **Operator-deploy:** detection happened in seconds when Hugo
  looked for the workflow. The trap is the surprise factor — the
  feature seemed broken when it was just deferred.

## Countermeasure

- **Code:** none — GitHub's intentional behaviour.
- **Operator action when adding a new dispatchable workflow:**
  - For the *first* run, deploy locally (or push the workflow to
    a throwaway commit on `main`, run, then revert).
  - After merge, the workflow appears in the UI; future runs go
    through the dropdown and pick the desired branch.
  - For PR-integrated manual jobs (GitLab "manual job" feel): use
    a slash-command workflow on `issue_comment` that dispatches
    the target. Same caveat: only active once the listener
    workflow itself reaches the default branch.

## Eradication

- **Sibling defects swept:** every workflow in `.github/workflows/`
  audited; only `shared-deploy.yml` is `workflow_dispatch`-only.
  All others trigger on `pull_request` / `push` / cron and are
  unaffected.
- **Tooling change:** none — vendor behaviour.
- **Detection improvement:** none.
- **Knowledge sharing:** this entry; CLAUDE.md's gotchas pointer.
  Documented expectation in `shared-deploy.yml`'s top-of-file
  comment so the next person introducing a `workflow_dispatch`
  workflow knows the bootstrap dance.
