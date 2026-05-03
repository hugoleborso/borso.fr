---
date: 2026-05-02
introduced-at: implementation
detected-at: production
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/4
fix-commits: [b13966a, 181f266]
eradication-level: 2
time-to-detect: minutes (first push to main after merging PR #2)
tags: [github-actions, paths-filter, ci]
---

# `dorny/paths-filter@v3` with `base: HEAD~1` fails on push events

## Symptom

After PR #2 merged to `main`, the new `deploy.yml` workflow's
`detect` job aborted before producing the deploy matrix:

```
Run dorny/paths-filter@v3
Get current git ref
Changes will be detected between HEAD~1 and main
Searching for merge-base HEAD~1...main
Error: The process '/usr/bin/git' failed with exit code 128
```

User impact: production deploy never started. The `prod` environment
gate never even fired. Effectively, merging to main shipped nothing.

## Root-cause chain

1. **Why?** `git` exits 128.
   Because `paths-filter@v3` runs `git merge-base <base> <ref>`. With
   `base: HEAD~1` and `ref: main`, that becomes
   `git merge-base HEAD~1 main`. `main` isn't resolvable as a ref in
   the local checkout, so git errors out.
2. **Why isn't `main` resolvable?**
   `actions/checkout@v4` with `fetch-depth: 2` checks out HEAD into
   a detached state and fetches only the last two commits. It does
   not create a local `refs/heads/main` tracking branch by default.
3. **Why did we set `base: HEAD~1`?**
   To diff against the previous commit on `main` ("what changed in
   this push"). Conceptually correct, but `HEAD~1` isn't a ref —
   it's a relative reference, and combined with `paths-filter`'s
   merge-base call it triggers the lookup above.
4. **Why does `paths-filter`'s default work better here?**
   For `push` events, `paths-filter` defaults to
   `base: ${{ github.event.before }}` — a concrete SHA, not a ref.
   No merge-base resolution, no `main` lookup. That SHA is exactly
   what we wanted from `HEAD~1` anyway.
5. **Why did we explicitly set the base instead of using the default?**
   Pattern-matching from a previous CI snippet that used HEAD~N for
   pull_request events. We didn't reread the action's docs for the
   push-event default.

**Root cause:** we thought specifying `base: HEAD~1` would resolve
to "the previous commit on this branch". Actually the action runs a
`git merge-base` against the unresolvable `main` ref under our
shallow checkout, and exits 128.

## Detection failure causes

- **Typing:** YAML is not typed.
- **Linter:** no GitHub-Actions linter in the repo. `actionlint`
  exists and could catch unusual `base:` values, but isn't wired in.
- **Functional validation locally:** GitHub Actions doesn't run
  locally (without `act` or similar). The push-event-only failure
  mode never fires on `pull_request` runs, so it stayed invisible
  during PR development.
- **CI:** the workflow's first push-event run IS the first
  detection. The push-only nature is the trap.
- **Code review:** the `base: HEAD~1` looks plausible. Reviewer
  would need to know the merge-base / fetch-depth interaction.

## Countermeasure

- **Code:** branch `claude/fix-deploy-detect-merge-base` (PR pending
  separately) — `deploy.yml`'s `detect` job drops the
  `base: HEAD~1` line. The action's default takes over
  (`github.event.before` for push events) and resolves cleanly
  without any ref lookup. An inline comment in the workflow
  explains why we don't specify `base:`.

## Eradication

**Type:** code diff + DevX check (level 2 — `actionlint` in pre-push)

**Reference:** [PR #3](https://github.com/hugoleborso/borso.fr/pull/3) (deploy.yml fix) · [PR #4](https://github.com/hugoleborso/borso.fr/pull/4) (actionlint pre-push) · commits [`b13966a`](https://github.com/hugoleborso/borso.fr/commit/b13966a) (drop `base: HEAD~1`), [`181f266`](https://github.com/hugoleborso/borso.fr/commit/181f266) (actionlint pre-push + installer)

**The actual fix:**

```diff
  # .github/workflows/deploy.yml
    - uses: dorny/paths-filter@v3
      id: filter
      with:
        filters: .github/path-filters.yml
-     base: HEAD~1
+     # No `base:` — paths-filter defaults to ${{ github.event.before }}
+     # for push events, the SHA of the previous main commit. Specifying
+     # `base: HEAD~1` triggers a `git merge-base HEAD~1 main` lookup that
+     # fails with `git exit 128` because `main` isn't set up as a local
+     # tracking branch with fetch-depth=2.
```

```diff
  # .husky/pre-push
+ # Workflow lint — catches paths-filter base misuses, deprecated action
+ # versions, shell-quoting bugs in `run:` blocks, etc.
+ if command -v actionlint >/dev/null 2>&1; then
+   echo "[pre-push] running actionlint"
+   actionlint
+ else
+   echo "[pre-push] WARN: actionlint not installed — skipping." >&2
+ fi
```

```diff
  # scripts/install-repo-deps.sh — conditional binary install
+ if ! command -v actionlint >/dev/null 2>&1; then
+   curl -fsSL "https://github.com/rhysd/actionlint/releases/download/v1.7.7/…" \
+     | tar -xz -C "$tmp" actionlint
+   install -m 0755 "$tmp/actionlint" "$HOME/.local/bin/actionlint"
+ fi
```

**Sibling defects swept:** `preview.yml` and `cleanup-orphans.yml` also use `paths-filter`; both run on `pull_request` events where the action's default base is the PR base ref (always resolvable). `actionlint` covers all three workflows.

**Why not level 1 (structural):** workflows are YAML, not TypeScript — there's no construct surface to type-constrain. A custom DSL or typed wrapper around GitHub Actions would be wildly out of proportion to the problem.
