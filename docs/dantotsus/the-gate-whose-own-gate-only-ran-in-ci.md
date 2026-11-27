---
date: 2026-10-29
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#219'
fix-commits: [c54e32da7]
eradication-level: 1
eradication-paths: [.husky/pre-push, .github/workflows/ci.yml]
time-to-detect: same day
tags: [meta, gates, harness, ci]
zone: .husky
weak-point: gate-measures-nothing
recurs: none (the earlier gate entries are about a gate that measured nothing; this one is about not being told a gate needed proving)
---

# The gate whose own gate only ran in CI

## User impact

PR #219 passed every local gate, then failed CI twice on a check that a local
command could have answered in seconds.

| | Seen | Expected |
| --- | --- | --- |
| Local commit | `Every standard names a mechanism that exists and runs.` | the missing canary named before the push |
| CI, two heads | `gate-canaries (fast)` and `gate-canaries (slow)` red on `no canary: gate deploy-smoke-agent-reader`, then `113 gate(s), 112 with a canary.` | green |

Each red run cost a full CI cycle (measured on PR #219).

## Causal chain

- CI failed `gate-canaries` on PR #219.
  - `gate-canaries.ts` found a mechanism cited by a standard with no canary, a planted defect proving the mechanism refuses it.
    - PR #219 cited `gate:deploy-smoke-agent-reader` from `docs/standards/11-database.md` and registered no canary for it.
      - The agent pushed after pre-commit's enforcement ledger passed. The ledger resolved the citation and printed "Every standard names a mechanism that exists and runs."
        - The ledger asks whether a mechanism exists and runs, not whether anything proves it can fail. That second question lived in `gate-canaries.ts --inventory`, which costs ten seconds of CPU and was called only by CI.

## Root cause of occurrence

*Thought the enforcement ledger was the gate on a standard's citations,
actually it held only the cheap half, and the other half, the canary
obligation, lived in a command no hook called.* (Method)

The process split one obligation across two tools with different callers.
A green local ledger read as "the citation is complete". Had the agent known
the canary was a separate obligation, it would have registered one with the
citation.

## Detection failure causes

- **Pre-commit:** ran the ledger, which passed by design. It resolved existence and scope, not provability.
- **Pre-push:** ran no canary check.
- **Review:** a `gate:` bullet in a standard looks like documentation. Nothing on the page says it carries an obligation.

## Countermeasure

PR #220 gave `gate-canaries.ts --inventory` a caller in `.husky/pre-push`, on
pushes that changed the gate definitions, the canary registry, a numbered
standard or the commit hook. Removing this PR's canary from the registry made
the inventory exit 1, and restoring it exit 0 (measured then).

The first fix attempt redesigned the mechanism instead of adding its canary,
and a reimplementation of the inventory inside the ledger produced 32 false
problems. Both were reverted.

## Eradication

**Type:** structural impossibility (level 1), by subtraction

**Reference:** commit `c54e32da7` (#224) deleted `scripts/standards/gate-canaries.ts`,
its CI jobs, its pre-push caller and the enforcement ledger, by operator
decision, with the other gates that only guarded the harness. No standard
citation now carries an obligation that only CI checks, so a local green
followed by a canary red in CI cannot happen.

```bash
$ grep -n canar .husky/pre-push .husky/pre-commit .github/workflows/*.yml
$ ls scripts/standards/gate-canaries.ts
ls: cannot access 'scripts/standards/gate-canaries.ts': No such file or directory
```

Measured 2026-11-27. A subtraction leaves no mechanism to point at, so
`eradication-paths` names the two files whose canary calls `c54e32da7`
removed, `.husky/pre-push` and `.github/workflows/ci.yml`. The property they
hold now is an absence: neither calls a canary check, and the grep above
shows it. The proof that a new check can fail moved to the
`/dantotsu` skill, where the entry that adds a check shows it refusing the
reintroduced defect once (`.claude/skills/dantotsu/SKILL.md`, *Eradication*).

**Proof it can fail:** nothing left to plant. The obligation and both of its
checks are gone.

**Similar instances:** other gates still run only in CI by design, such as
`scripts/mutate-changed.sh` from `.github/workflows/ci.yml:439`. They carry no
obligation a local gate half-answers, so they are a different class.
