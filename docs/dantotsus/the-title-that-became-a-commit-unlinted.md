---
date: 2026-10-29
introduced-at: code-review
detected-at: operator-deploy
severity: low
related-pr: '#224'
fix-pr: none (the kaizen pull request for PR #224, open when this was written)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.github/workflows/pr-title.yml]
time-to-detect: hours
tags: [ci, github-actions, git, meta]
zone: .github/workflows/ci.yml
recurs: none (the earlier commitlint entries are about commits on a branch; this is the pull request title, which no gate read)
---

# The title that became a commit, unlinted

## Symptom

PR #224 was titled `Cut the cost of a feature: one review agent, short
CLAUDE.md, less harness`, with no conventional-commit type. It merged to `main`
as `c54e32da meta: cut the cost of a feature: ...`. `meta` is a scope in
`commitlint.config.mjs`, not a type, so `main` now carries a header commitlint
refuses:

```
✖   type must be one of [build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test] [type-enum]
```

## Root-cause chain

1. **Why does `main` carry a header commitlint refuses?** The squash merge
   wrote the pull request's title, with `meta:` added in front of it at merge.
2. **Why the title?** The repository squashes with `COMMIT_OR_PR_TITLE`
   (`gh api repos/hugoleborso/borso.fr`, measured 2026-10-29). A pull request
   of more than one commit lands under its title.
3. **Why did nothing refuse the title?** `ci.yml`'s `commitlint` job lints
   `origin/<base>..HEAD`, the branch's commits. Every one of PR #224's sixteen
   commits passed. The title is not a commit until the merge writes it, and the
   merge runs no hook.
4. **Why was the title written without a type?** `/open-pr` bounds the title
   at 72 characters and says nothing about its form.

**Root cause:** we thought commitlint on the branch guarded what lands on
`main`, but on a squash merge the pull request title becomes the commit, and no
gate read the title.

## Detection failure causes

- **Linter / static analysis:** commitlint runs as a `commit-msg` hook and as a
  CI job, and both read commits. The title is pull request metadata.
- **CI (tests / build):** `ci.yml` listens to `pull_request` with the default
  types, so a retitle reruns nothing.
- **Code review:** the missing type was patched at merge with a scope, by hand,
  and nothing checked the patch.

## Countermeasure

- **Code:** `main` keeps `c54e32da`. Rewriting `main` history is out of scope.

## Eradication (mandatory — code-level)

**Level 2, DevX check.** `.github/workflows/pr-title.yml` runs commitlint on
the pull request title on `opened`, `edited`, `reopened` and `synchronize`. A
title the squash would turn into a bad header fails a check before the merge
button is pressed, and a retitle reruns it alone.

The check was shown refusing the defect once, with the exact command the job
runs, on 2026-10-29:

```
$ printf '%s' 'Cut the cost of a feature: one review agent, short CLAUDE.md, less harness' | pnpm exec commitlint
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
exit 1
$ printf '%s' 'meta: cut the cost of a feature: one review agent, short CLAUDE.md, less harness' | pnpm exec commitlint
✖   type must be one of [build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test] [type-enum]
exit 1
$ printf '%s' 'refactor(meta): cut the cost of a feature' | pnpm exec commitlint
exit 0
```

What stays open: a header typed by hand in the merge dialog is still read by
nothing. With a conventional title the dialog is prefilled with one, so there is
nothing to retype.

A level-1 fix, setting the squash title to the commit messages only, was
rejected: a pull request of sixteen commits would then land under its first
commit's header, which names one change out of sixteen.
