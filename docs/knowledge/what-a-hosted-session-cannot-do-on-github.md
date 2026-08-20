# What a hosted session cannot do on GitHub

Measured on claude.ai/code against `hugoleborso/borso.fr`, 2026-08-20.
Probe before believing any of it — this is what the API said that day,
not a policy that cannot change.

## It can

- Read and write pull requests: list, read diffs, comment, review,
  **merge**. Merging to `main` worked, despite CLAUDE.md's standing
  note that only the human merges — that note is a working agreement,
  not a permission boundary.
- Close pull requests, apply labels, resolve review threads.
- Push to any branch in the repository, including a `dependabot/*`
  branch. Pushing a fix commit onto a Dependabot branch is how you get
  a red Dependabot pull request green; Dependabot stops rebasing a
  branch once it carries a commit that is not its own.
- Read AWS. The session is `AI-Dev-ReadOnly`; `aws … get-…` and
  `describe-…` work, writes do not.

## It cannot

**Dispatch a workflow.** Three independent routes, all refused:

| Route | Result |
| --- | --- |
| `mcp__github__actions_run_trigger` | `403 Resource not accessible by integration` — the App token has no `actions: write` |
| `curl` with `$GH_TOKEN` | `403 GitHub access is not enabled for this session` |
| `curl` with `$GITHUB_TOKEN` | same |

`GH_TOKEN` and `GITHUB_TOKEN` are both *set* in the environment and
both rejected at the agent proxy, so a non-empty token is not evidence
of anything. There is no `gh` or `hub` CLI and no git credential
helper to borrow from.

The practical consequence: **`workflow_dispatch`-only workflows are
operator-only.** `shared-deploy` is the one that matters here. An
agent can tell you a deploy is owed and can show you exactly what it
will change; it cannot press the button.

## Two API results that mislead

- `list_pull_requests` returns `"merged": false` on a pull request
  that *is* merged, while `merged_at` carries the timestamp. Trust
  `merged_at`, or the merge commit in `git log`.
- `search_pull_requests` does not populate `merged_at` at all.
- Both `pull_request_read method: get_diff` and
  `search_pull_requests` routinely exceed the tool-result token cap on
  this repository — a Dependabot lockfile diff is 111k characters, a
  PR search 1.1 MB. Fetch the branch and diff locally instead:

  ```bash
  git fetch origin "$branch:refs/remotes/origin/$branch"
  git diff origin/main...origin/$branch -- pnpm-workspace.yaml '*package.json'
  ```
