---
summary: 'A workflow run stuck `queued` or `in_progress` during a GitHub Actions incident can be neither cancelled (409) nor rerun (403), and it holds its concurrency group. Read githubstatus.com first; only a push with a real change starts a new run.'
triggers:
  output:
    - 'Cannot cancel a workflow run that has not been queued yet'
    - 'This workflow is already running'
---

# A queued run GitHub will neither cancel nor rerun

Seen on PR #292, 2026-11-11, on the branch `feat/talos-recurring-tasks-and-navigation`. Times are UTC, read from `gh api repos/hugoleborso/borso.fr/actions/runs?branch=<branch>`.

| Run | Commit | Created | What happened |
| --- | --- | --- | --- |
| `ci` 43092016616 | `c344a8d` | 19:57:47 | stayed `in_progress` until it was `cancelled` at 21:02:04 |
| `ci` 43096582465 | `299bc15` | 20:31:42 | `queued`, and still `queued` when this entry was written the same night |
| `ci` 43115958396 | `44cc168` | 22:57:05 | ran and passed in under five minutes |

GitHub's incident [*Impact across multiple GitHub products including Actions, Pages, and Copilot products*](https://www.githubstatus.com/incidents/dvy0t3mvh1lg) ran from 20:48 to 21:21. The first run above hung 50 minutes before the incident's first post, so the status page lags what a run shows.

## What the API answers

Reported by the session that hit it, not reproduced by this sweep:

- Cancelling the queued run answered `409 Cannot cancel a workflow run that has not been queued yet`.
- Rerunning it answered `403 This workflow is already running`.
- The `in_progress` run of the older commit held the workflow's concurrency group, and `cancel-in-progress` did not cancel it when the newer run arrived.

## What to do

1. Read https://www.githubstatus.com before reading the workflow. A run that does not move for ten minutes with no job started is not a defect of the branch.
2. Do not fight the API. Neither call above works until GitHub clears its backlog, and the queued run may never start: 43096582465 did not.
3. End the turn and wait for the incident to close. Then a push starts a fresh run. It must carry a real change. An empty commit, or closing and reopening the pull request, is forbidden here.
4. A hosted session cannot dispatch a workflow, see [`what-a-hosted-session-cannot-do-on-github.md`](./what-a-hosted-session-cannot-do-on-github.md).

## What it cost

The branch waited from 20:31 to 22:57 for a green `ci`. `main` moved meanwhile, so the merge was then refused by the `merge-on-moved-base` gate and needed one more integration of `main` and one more run (23:06 to 23:12). That gate is working as built, see [`two-merges-sixteen-seconds-apart-one-untested-main.md`](../dantotsus/two-merges-sixteen-seconds-apart-one-untested-main.md).
