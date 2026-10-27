---
summary: 'Inside a git hook run from a worktree, GIT_DIR is set, so `git -C <dir> rev-parse --show-toplevel` answers <dir> itself; find the root from the script path instead.'
triggers:
  paths:
    - '.husky/**'
  commands:
    - 'rev-parse\s+--show-toplevel'
---

# Git sets `GIT_DIR` inside a hook

When git runs a hook from a linked worktree, it exports `GIT_DIR` (and
`GIT_INDEX_FILE`) to the hook. Measured with git 2.43: from the main checkout a
`pre-commit` hook sees `GIT_DIR` empty, from a worktree it sees
`.git/worktrees/<name>`. Every script the hook starts inherits it.

With `GIT_DIR` set and no `GIT_WORK_TREE`, git takes the current directory as
the top of the work tree. So `-C` stops meaning "the repository that contains
this folder":

```console
$ git -C repo/scripts rev-parse --show-toplevel
/…/repo
$ GIT_DIR=repo/.git git -C repo/scripts rev-parse --show-toplevel
/…/repo/scripts
```

A script that finds the repository root that way reads the wrong tree only
when a hook runs it from a worktree, which is how every agent here commits.
On PR #197 `scripts/lint-staged-files.sh` did this: it worked when run by
hand and read the wrong tree inside the commit hook. `scripts/lint-workspace.sh`
carried the same line and was fixed in the kaizen for that pull request.

Find the root from the script's own path instead, which no environment
variable changes:

```bash
root="$(cd "$(dirname "$0")/.." && pwd)"
```

A test that drives git in a scratch repository has the opposite problem: run
from a hook, it inherits `GIT_DIR` and acts on the checkout. Unset `GIT_DIR`,
`GIT_INDEX_FILE`, `GIT_WORK_TREE` and `GIT_PREFIX` in the child's environment,
as `scripts/pre-push-range.test.ts` and `scripts/check-hook-decisions.sh` do.
