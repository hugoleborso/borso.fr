---
date: 2026-09-16
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#101'
fix-pr: '#101'
fix-commits: [ee6308b]
eradication-level: 1
time-to-detect: minutes
tags: [ci, standards, hooks, tooling]
---

# The ledger could not see the hooks it was built for

## Symptom

CI refused a commit that added a working, tested, cited gate:

```
(none): `scripts/pr/check-pr-body.ts` runs and no standard says why
Wrote docs/standards/enforcement-ledger.md (1 problem(s)).
##[error]Process completed with exit code 1.
```

Citing it in `docs/standards/12-linting-and-gates.md` then produced the
opposite complaint, from the same run:

```
12-linting-and-gates.md: `scripts/pr/check-pr-body.ts` exists but runs nowhere
```

The script did run. `.claude/hooks/pretool-gh-pr-create.sh` calls it on every
`gh pr create` it guards, and that call is the hook's entire body.

## Root-cause chain

1. **Why did the ledger say the script runs nowhere?**
   `listInvocationSites()` reads two directories: `.husky` and
   `.github/workflows`. A script named in neither is, to the ledger, a script
   nothing invokes.
2. **Why only those two?** They were the two places a mechanism ran when the
   ledger was written. Git hooks and CI were the whole enforcement surface.
3. **Why is that no longer true?** `.claude/hooks/` now holds eleven
   PreToolUse and PostToolUse hooks that refuse commands outright — a broad
   `kill`, a discarding `reset`, a swallowed push, a merge that deploys prod, a
   pull-request body carrying markup the server deletes. They are enforcement
   by any reading: they decide, they refuse, and `scripts/check-hook-decisions.sh`
   holds each of them to a contract.
4. **Why did nobody notice the blind spot until now?** Every earlier hook
   enforced its rule *inline*, in its own shell. This was the first one whose
   body was a call to a script that also had to be cited in a standard, so it
   was the first time the ledger had to answer *does this script run* about a
   hook.

**Root cause:** thought the enforcement surface was git hooks and CI, actually
the agent hooks became a third one and the ledger's model of "runs" was never
extended, so a mechanism could be simultaneously required by a standard and
invisible to the file that checks standards against mechanisms.

## Detection failure causes

- **Typing:** the invocation sites are a list of directory paths. Nothing in
  the type says the list is meant to be exhaustive over enforcement surfaces.
- **Linter / static analysis:** no rule can know that a directory of shell
  scripts is an enforcement surface.
- **Functional validation locally:** pre-commit runs the ledger and it passed,
  because before this commit no standard cited a script that only a hook
  invoked. The gap was latent, not dormant — it needed a first case to appear.
- **CI (tests / build):** CI is where it fired, which is the ledger working. It
  fired on the true half of the contract (a mechanism no standard explains) and
  then on the false half (a mechanism that does run, reported as running
  nowhere).
- **Code review:** the ledger's own prose in CLAUDE.md says it "fails on a rule
  that does not exist, one that runs nowhere, one that reaches three
  applications out of four, and on a mechanism that runs and no standard
  explains" — a description of the intent that a reader would not test against
  the directory list.

## Countermeasure

- **Code:** commit `ee6308b` — the checker is cited in
  `docs/standards/12-linting-and-gates.md` as a `script:` bullet, and pre-commit
  runs it over the pull-request template the skill drafts from, so the
  mechanism has a gate the ledger can see in `.husky`. That made CI green
  while leaving the blind spot in place.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #101](https://github.com/hugoleborso/borso.fr/pull/101) ·
the kaizen branch commit below

The countermeasure gave this one script a `.husky` invocation, which is a
workaround: a hook-only mechanism would still read as dead, and the next author
would either invent a gate to satisfy the ledger or delete a bullet that was
true. The eradication makes the ledger's model match the repository's, so a
hook is a place a mechanism runs.

**The actual fix:**

```diff
 const WORKFLOWS_DIRECTORY = join(REPOSITORY_ROOT, '.github', 'workflows');
+const AGENT_HOOKS_DIRECTORY = join(REPOSITORY_ROOT, '.claude', 'hooks');

   for (const [directory, prefix] of [
     [HOOKS_DIRECTORY, '.husky'],
     [WORKFLOWS_DIRECTORY, '.github/workflows'],
+    [AGENT_HOOKS_DIRECTORY, '.claude/hooks'],
   ] as const) {
```

Verified not to cascade: with the third directory in scope the ledger reports
*"Every standard names a mechanism that exists and runs"* — no hook-invoked
mechanism was left unexplained by a standard, and no standard gained a false
citation.

**Sibling defects swept:** the pre-commit template check stays. It was written
to satisfy the ledger but it is a real gate on its own terms — a template that
drifts outside the budget teaches every body drafted from it to be refused, and
nothing else would say so.

## See also

- [`the-tooling-that-gates-everything-was-checked-by-nothing`](./the-tooling-that-gates-everything-was-checked-by-nothing.md)
  — the gates themselves as an unchecked surface.
- [`the-gate-that-was-never-pointed-at-the-code`](./the-gate-that-was-never-pointed-at-the-code.md)
  — a gate whose scope did not cover what it claimed to.
- [`two-guard-hooks-that-never-guarded`](./two-guard-hooks-that-never-guarded.md)
  — hooks as an enforcement surface with its own failure modes.
