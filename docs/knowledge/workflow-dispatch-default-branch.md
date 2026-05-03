# `workflow_dispatch` workflows only show in the UI once on the default branch

## Symptom

PR #2 introduced `.github/workflows/shared-deploy.yml` with
`on: workflow_dispatch`. While the PR was open, navigating to the
repo's **Actions** tab and looking for a "Run workflow" button
against `shared-deploy` showed nothing — the workflow was invisible
even when the PR branch was selected. The only way to deploy shared
infra was to run it locally.

## Root-cause chain

1. **Why** isn't `shared-deploy` in the Actions UI listing?
   GitHub's Actions UI lists workflows by reading the workflow files
   that exist on the repository's **default branch**, not on any
   feature branch.
2. **Why** does GitHub work that way?
   Two reasons: (a) security — `workflow_dispatch` is an
   action-execution surface, and trusting a feature branch to
   define dispatchable workflows lets a PR author run code with
   write-scope tokens; (b) discoverability — the Actions UI
   needs a stable list, not one that changes per branch.
3. **Why** did the same constraint apply to my proposed slash-command
   workflow?
   `issue_comment` event handlers also run from the default branch's
   copy of the workflow file, for the same security reason. So a
   `/deploy-shared` slash command introduced in a PR can't take
   effect until the PR merges.
4. **Why** is the "Run workflow" button still useful for new
   workflows?
   Once the workflow file exists on the default branch (i.e.
   post-merge), the UI shows the button **and** the dropdown lets
   you run it against any branch — including a fresh PR's branch.
   So workflow_dispatch is genuinely useful for testing PR-branch
   code, just not for *bootstrapping* the workflow itself.

**Root cause:** GitHub Actions evaluates `workflow_dispatch` and
`issue_comment` events against the workflow file on the default
branch, so a workflow introduced by a PR doesn't appear in the UI
until that PR merges.

## Fix

- **Code:** none — this is GitHub's intentional behaviour.
- **Operator action when adding a new dispatchable workflow:**
  - For the *first* run, deploy locally (or push the workflow to a
    throwaway commit on `main`, run, then revert).
  - After merge, the workflow appears in the UI; future runs go
    through the dropdown and pick the desired branch.
- **For PR-integrated manual jobs (GitLab "manual job" feel):**
  the closest pattern is a slash-command workflow that listens on
  `issue_comment` and dispatches the target. Same caveat: only
  active after the listener workflow itself reaches the default
  branch. Worth adding once the repo has a few PRs of history.
