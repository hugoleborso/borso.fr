# `dorny/paths-filter@v3` with `base: HEAD~1` fails on push events

## Symptom

After PR #2 merged to `main`, the new `deploy.yml` workflow's
`detect` job aborted before producing the matrix:

```
Run dorny/paths-filter@v3
Get current git ref
Changes will be detected between HEAD~1 and main
Searching for merge-base HEAD~1...main
Error: The process '/usr/bin/git' failed with exit code 128
```

No deploy ever started; the prod-environment gate never even fired.

## Root-cause chain

1. **Why** does `git` exit 128?
   `paths-filter@v3` runs `git merge-base <base> <ref>`. With
   `base: HEAD~1` and `ref: main`, that becomes
   `git merge-base HEAD~1 main`. `main` isn't resolvable as a ref
   in the local checkout, so git errors out.
2. **Why** isn't `main` resolvable?
   `actions/checkout@v4` with `fetch-depth: 2` checks out HEAD into
   a detached state and fetches only the last two commits. It does
   not create a local `refs/heads/main` tracking branch by default.
3. **Why** did we set `base: HEAD~1`?
   To diff against the previous commit on `main` (i.e. "what
   changed in this push"). Conceptually correct, but the syntax
   `HEAD~1` isn't a ref, it's a relative reference, and combined
   with `paths-filter`'s merge-base call it triggers the lookup
   above.
4. **Why** does `paths-filter`'s default behaviour work better here?
   For `push` events, `paths-filter` defaults to
   `base: ${{ github.event.before }}` — a concrete SHA, not a ref.
   No merge-base resolution, no `main` lookup, no `git exit 128`.
   That SHA is exactly what we wanted from `HEAD~1` anyway.

**Root cause:** specifying `base: HEAD~1` triggered a `git merge-base`
lookup involving the `main` ref, which `actions/checkout` doesn't
provision as a local branch with `fetch-depth: 2`.

## Fix

- **Code:** branch `claude/fix-deploy-detect-merge-base` (PR pending
  at the time of writing) — `deploy.yml`'s `detect` job drops the
  `base: HEAD~1` line from the `paths-filter` step. The action's
  default takes over (`github.event.before` for push events) and
  resolves cleanly without any ref lookup.
- **Convention:** any future `paths-filter` step in the repo should
  rely on the action's default `base:` for push and pull_request
  events. Only specify `base:` if you genuinely need a non-standard
  comparison point (e.g. comparing against a release tag), and in
  that case use a concrete ref string, not `HEAD~N`.
