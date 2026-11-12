---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#314'
fix-pr: none (lands with the kaizen pull request for PR #314)
fix-commits: [self]
eradication-level: 1
eradication-paths: [commitlint.config.js]
time-to-detect: minutes
tags: [git, pre-commit, gates, tooling]
zone: commitlint.config.js
recurs: [dependabot-previews-filled-the-schema-quota]
---

# Commitlint refused every proper noun

## User impact

Agents lost a commit attempt each time a subject opened on a name. The
refusal came after the whole pre-commit run.

| | Seen | Expected |
| --- | --- | --- |
| PR #314 | `feat(talos): Phaistos coin icon and cold-start opening` refused for `subject-case` | accepted: Phaistos is a place |
| Earlier tasks | `docs(meta): ADR, pragma's reads …` refused twice, a subject starting `ADR for` refused, a subject opening on `Band` refused | accepted |

Five refusals in four tasks, all on a proper noun or an acronym (measured
with `grep -rh commitlint docs/features/*/*/kaizen.md`). No line in that
search is a refusal of a careless capital.

## Causal chain

- A commit with a correct subject was refused.
  - `@commitlint/config-conventional` sets `subject-case` to refuse
    sentence-case, start-case, pascal-case and upper-case.
    - The rule reads only the first letter's case, so it cannot tell
      "Phaistos" from "Fix".

## Root cause of occurrence

*Thought `subject-case` keeps subjects lowercase, actually it refuses every
subject whose first word is a name, and nothing on `main` was ever held to
it.* Five squash subjects on `main` open on a capital, among them PR #314's
own (measured with `git log origin/main --format=%s`). GitHub writes those,
and no hook runs on them.

## Detection failure causes

- **Local:** the commit-msg hook is the only place the rule runs, after
  pre-commit has run in full.

## Countermeasure

Turn `subject-case` off. The PR #124 entry worked around the same rule for
Dependabot's `Bump …` subjects with an `ignores` entry. That entry stays,
because removing it is a separate change to what Dependabot can commit.

## Eradication

**Type:** structural impossibility (level 1). The rule is gone.

**Reference:** this commit.

```diff
+    'subject-case': [0],
```

**What it drops:** a subject such as `feat(talos): FIX` is now accepted.
`main` already holds five capitalised subjects, so no reader relied on the
property.

**Proof it can fail:** before the change, `feat(talos): Phaistos coin icon
and cold-start opening` exited 1 with `subject must not be sentence-case,
start-case, pascal-case, upper-case [subject-case]`. After it, that subject
and `docs(meta): ADR, pragma's reads leave in one batch per tick` exit 0,
and `fix talos thing` still exits 1 for its missing type (measured).

**Similar instances:** see
[`dependabot-previews-filled-the-schema-quota`](./dependabot-previews-filled-the-schema-quota.md),
whose sibling sweep met the same rule on Dependabot's subjects.
