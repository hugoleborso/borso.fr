---
date: 2026-09-16
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#101'
fix-commits: [ee6308b8ec, 320f1cdca, c54e32da7]
eradication-level: 1
eradication-paths: [.husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: minutes
tags: [ci, standards, hooks, tooling]
zone: scripts/standards
---

# The ledger could not see the hooks it was built for

## User impact

The agent on PR #101 had a working, tested gate refused by CI twice, with
opposite complaints (measured, in that run).

```
(none): `scripts/pr/check-pr-body.ts` runs and no standard says why
Wrote docs/standards/enforcement-ledger.md (1 problem(s)).
##[error]Process completed with exit code 1.
```

Citing it in `docs/standards/12-linting-and-gates.md` then produced:

```
12-linting-and-gates.md: `scripts/pr/check-pr-body.ts` exists but runs nowhere
```

| | Seen | Expected |
| --- | --- | --- |
| A script that an agent hook calls | "runs nowhere" | counted as running |

The script did run. `.claude/hooks/pretool-gh-pr-create.sh` called it on every
`gh pr create` it guarded.

## Causal chain

- The ledger reported a running script as running nowhere.
  - `listInvocationSites()` read two directories, `.husky` and
    `.github/workflows`. A script named in neither was, to the ledger, a
    script nothing invokes. The lines, from `a9c72cedd`:

    ```ts
    const HOOKS_DIRECTORY = join(REPOSITORY_ROOT, '.husky');
    const WORKFLOWS_DIRECTORY = join(REPOSITORY_ROOT, '.github', 'workflows');
    ```

    - Commit `a9c72cedd` (2026-08-15) wrote that list by hand, as a second
      copy of where the repository runs its mechanisms. At that commit
      `.claude/hooks/` already held two refusing hooks,
      `pretool-gh-pr-create.sh` and `pretool-no-broad-kill.sh`
      (`git ls-tree --name-only a9c72cedd .claude/hooks/`, measured).
      - The writer left the agent hooks out although they were in the tree.
        A hand-kept list of surfaces held what its writer had in mind that
        day, and nothing compared it with the repository. (Machine)
    - PR #101 was the first time a standard cited a script that only an agent
      hook called, so the stale list met its first case.

## Root cause of occurrence

*Thought the enforcement surface was git hooks and CI, actually agent hooks
under `.claude/hooks/` already refused commands when the ledger was written.*
(Machine)

The ledger kept its own list of where mechanisms run instead of reading it
from the repository. `git ls-tree` at `a9c72cedd` shows the two hooks beside
the commit that omitted them. Had the writer counted agent hooks as
enforcement, the list would have held three directories from the start.

## Detection failure causes

- **Typing:** the invocation sites are a list of paths. Nothing in the type
  says the list is meant to cover every enforcement surface.
- **Local:** pre-commit ran the ledger and it passed, because before PR #101
  no standard cited a script that only a hook invoked.
- **CI:** it fired, on both halves of its contract, once the first case
  existed.
- **Review:** `CLAUDE.md` described the ledger by its intent, "fails on ...
  one that runs nowhere", and a reader would not test that against the
  directory list.

## Countermeasure

Commit `ee6308b` cited the checker in `docs/standards/12-linting-and-gates.md`
and ran it in pre-commit over the pull-request template, so the ledger could
see it in `.husky`. Commit `320f1cdca` added `.claude/hooks` as a third invocation
directory.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `c54e32da7` (PR #224) deleted
`scripts/standards/enforcement-ledger.ts` and its `--check` by operator
decision, among the gates that only guarded the harness. It removed the
ledger's call from `.husky/pre-commit` and `.github/workflows/ci.yml`:

```diff
-      - run: pnpm exec tsx scripts/standards/enforcement-ledger.ts --check
```

A ledger that does not exist cannot hold a stale model of the repository, and
it cannot refuse a commit for one. The agent hooks have moved again since,
from `.claude/hooks/` to `scripts/hooks/` in `458e886c4`. With the ledger in
place, that move would have blinded it a second time.

**Similar instances:** `grep -rn "enforcement-ledger" .husky .github scripts`
finds no caller today. The same shape, a check holding a hand-kept copy of
another file's facts, is the subject of the *Eradication* rule in
`.claude/skills/dantotsu/SKILL.md`: "A list kept by hand is not an
eradication."
