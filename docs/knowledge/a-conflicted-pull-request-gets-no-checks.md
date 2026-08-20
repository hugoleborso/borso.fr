# A pull request with no checks at all is telling you it conflicts

A `pull_request` workflow does not run against your branch. It runs against
`refs/pull/<n>/merge`, the commit GitHub builds by merging your head into the
base. When the merge conflicts, that ref cannot be built — and GitHub creates
**no workflow run at all**. Not a failed one, not a skipped one. Nothing.

The pull request then sits with an empty checks list forever, and nothing on
the page says why unless you look at `mergeable_state`.

## What it looks like from a session

Observed 2026-08-18 on PR #62. A push landed, `origin/<branch>` matched the
local head, the pull request's `head.sha` matched it too, and forty minutes
later:

```bash
mcp__github__pull_request_read method:get_check_runs   # {"total_count": 0}
mcp__github__pull_request_read method:get_status       # {"state": "pending", "total_count": 0}
```

Every reading of that state is misleading. It looks like a dropped webhook, a
queue backlog, or a workflow whose triggers do not match — and `ci.yml` here
triggers on a bare `pull_request:`, so the trigger theory dies immediately and
leaves you with "GitHub is broken", which is almost never true. Closing and
reopening the pull request, which does fire a fresh `pull_request` event,
changes nothing: the conflict is still there, so the merge ref still cannot be
built.

## The one field that answers it

```bash
mcp__github__pull_request_read method:get   # → "mergeable_state": "dirty"
```

`dirty` means conflicting. The cheap local equivalent, when you would rather not
pull a whole pull request body back:

```bash
git fetch origin main
git merge-tree "$(git merge-base HEAD origin/main)" HEAD origin/main | grep -c '<<<<<<<'
```

Non-zero means the merge ref is unbuildable, which means no checks are coming.

## Reading order that would have saved the time

When a pull request has **zero** check runs — as opposed to failing ones — ask
in this order:

1. Is `mergeable_state` `dirty`? Merge the base branch in and push. This is by
   far the most common answer, and the only one that produces *zero* runs
   rather than red ones.
2. Does the workflow's `on:` actually cover this event? A `paths:` filter or a
   `types:` list that omits `synchronize` produces zero runs for a push while
   still running on `opened`.
3. Is Actions running anything at all in this repository right now? One call
   settles it, and it settles it against another branch's runs rather than
   against a feeling:

   ```bash
   mcp__github__actions_list method:list_workflow_runs resource_id:ci.yml per_page:2
   ```

   Runs from other branches in the last minutes mean Actions is fine and the
   problem is yours.

Only after those three is "GitHub dropped the event" worth entertaining.

## Why it bites agents specifically

A session that branches, works for an hour and pushes has no reason to look at
the base branch again. Another pull request merging in the meantime is
invisible from inside the working tree — `git status` is clean, the branch is
up to date with its own remote, and every local gate passes. The conflict
exists only in a ref GitHub computes and nothing local mentions. PR #62 hit
exactly this: PR #59 merged forty minutes after the branch was cut and touched
three of the same files.

## It now warns you, on the push

Written twice, because the entry alone did not stop it happening again: PR #63
lost an hour to this exact silence two days after this file landed, and tested
the draft state and the pusher's identity before reading `mergeable_state`.
`.husky/pre-push` now runs the `merge-tree` check above on every `claude/*`
push and prints a warning naming this file. See
[`../dantotsus/the-entry-existed-and-i-lost-the-hour-anyway.md`](../dantotsus/the-entry-existed-and-i-lost-the-hour-anyway.md).

Two things PR #63 ruled out that are worth not re-testing:

- **Not the draft state.** No workflow here filters on it, and
  `ready_for_review` is not in `preview.yml`'s trigger list either.
- **Not the pusher's identity.** Closing and reopening through the API, as the
  repository owner, produced no run either — consistent with the merge ref
  being the cause rather than the event source.

Expect the fix itself to be slow on a long-lived branch. Merging `main` in puts
every commit since the branch point into the pre-push range, which is what that
gate is specified to do: 46 commits became 491 changed files, four applications
of tests and 78 gated files of mutation. Push it in the background.

## See also

- [`docs/knowledge/github-scheduled-workflows-fire-late.md`](./github-scheduled-workflows-fire-late.md) — the other reason a run you expect is not there.
- [`docs/dantotsus/the-gate-that-failed-on-a-broken-pipe.md`](../dantotsus/the-gate-that-failed-on-a-broken-pipe.md) — the red build that preceded this silence on the same pull request.
