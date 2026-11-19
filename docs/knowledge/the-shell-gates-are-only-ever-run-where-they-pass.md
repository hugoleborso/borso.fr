---
summary: 'Most shell gates have no tests and only ever run on a tree where they pass; plant the defect and watch the gate fail, and give a changed gate a vitest suite beside it.'
triggers:
  paths:
    - 'scripts/check-*.sh'
    - '.husky/*'
---

# Most shell gates have no tests, and CI only ever runs them on a green tree

Every custom ESLint rule in this repository ships a `RuleTester` suite — that is
a stated rule, and `gate:eslint-rule-suites` enforces it. The reasoning is in
`docs/standards/12-linting-and-gates.md`: a rule that misfires costs more than
the rule saves.

The same reasoning applies to the shell gates, and most of them have no test.
`ls scripts/check-*.test.ts` lists the few that do, each a vitest suite that
runs the gate on a fixture. Twenty-six scripts under `scripts/`, checking everything from stylesheet
contents to dependency catalogs to whether a directory walk races its own pipe,
and the only thing that ever runs them is pre-commit and CI — both on a tree
where they are expected to pass.

So the happy path is exercised constantly and **the failure path is exercised
never**. That is the half that matters: a gate's failure branch is the code that
runs when something is already wrong, which is the worst moment to discover it
has a typo in it. This is not hypothetical for the generators either — a
`ReferenceError` sat in one generator's `--check` failure message until a stale
file finally took that path, in CI. That one is fixed and gated now, see
[`the-tooling-that-gates-everything-was-checked-by-nothing`](../dantotsus/the-tooling-that-gates-everything-was-checked-by-nothing.md).

## Why there is no harness yet

Each gate reads the repository directly:

```bash
cd "$(dirname "$0")/.."
git ls-files -- ':(glob)apps/**/*.core.ts'
```

That is the right design for the job — the gate's subject *is* this repository —
and it is also what makes them hard to test. Driving one against a fixture means
a fixture git repository with the right files tracked in it, per gate. A harness
that did that for all twenty-six is a bigger change than any single gate.

The cheap version does not help: running every `scripts/check-*.sh` and
asserting exit 0 adds nothing, because CI already does exactly that on every
push.

## What to do when writing a new gate

Until a harness exists, verify by hand and **write the result into the
commit message or the dantotsu**, both directions:

| | |
| --- | --- |
| green | run it on the tree as-is |
| red | introduce the violation, run it, read the message, remove the violation |

Every gate added in PR #55 and in this sweep carries that table. It is not a
substitute for a test — nothing re-runs it — but it does mean the failure path
has been executed at least once, by someone who read what it printed.

And commit before probing: undoing the probe is what
[`a-warning-that-had-to-become-a-gate`](../dantotsus/a-warning-that-had-to-become-a-gate.md)
is about.

A gate that counts lines from `git diff --numstat` needs `--no-renames`. With
rename detection a moved file prints as `docs/{knowledge => dantotsus}/moved.md`,
which no path pattern matches, and its lines count as the edit and not the move.
`scripts/kaizen.sh balance` shipped in PR #382 that way: a 40-line knowledge
entry moved into `docs/dantotsus/` read "added 0, removed 0" and passed
(measured on a scratch repository, 2026-11-19). The same detection changed
PR #382's own printed count from 118 and 125 to 176 and 183 between two reads,
when its renamed test file fell under the similarity threshold. Its test in
`scripts/kaizen.test.ts` now moves a file across the boundary.
