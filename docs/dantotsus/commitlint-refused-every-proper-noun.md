---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#314'
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

- The commit-msg hook refused `feat(talos): Phaistos coin icon and cold-start opening`.
  - Commitlint applied `subject-case`, which the preset sets to refuse a subject whose first letter is upper case.

    ```js
    // @commitlint/config-conventional 19.8.1, lib/index.js
    "subject-case": [RuleConfigSeverity.Error, "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    ```

    - `commitlint.config.js` inherits that rule through one line, and overrode neither it nor its siblings.

      ```js
      extends: ['@commitlint/config-conventional'], // ← brings subject-case in
      ```

      - Commit 11d98b276 ("chore: add monorepo root scaffolding", 2026-05-01) wrote that line. It set `header-max-length` and `scope-enum` by hand and took every other preset rule as shipped. Its message describes the file as "conventional-commits + scope-enum".
      - Commit 200046954 (PR #169, 2026-10-12) met `subject-case` on Dependabot's `Bump …` subjects. It added an `ignores` entry for Dependabot and kept the rule for everyone else.

## Root cause of occurrence

*Thought extending `@commitlint/config-conventional` enforces the
Conventional Commits format, actually the preset also ships style rules
the format does not ask for, such as `subject-case`, and each of them is a
separate decision.*

Tag: **Method**. The scaffold adopted the preset by name, with no step
that reads each rule against a reader who needs it. Four of the preset's
rules have since been removed one by one, each after it refused a valid
commit: `body-max-line-length` in 86f23945a (2026-08-17),
`footer-leading-blank` and `footer-max-line-length` in 33c0c9451
(2026-10-29), and `subject-case` in this entry's commit. The Conventional Commits 1.0.0 specification
sets no case for the description (inferred, from memory of the
specification, not re-read this session).

## Detection failure causes

- **Local:** the commit-msg hook is the only place the rule runs, and it runs after pre-commit has finished.
- **Main:** GitHub writes squash subjects without running the hook, so `main` holds eight subjects that open on a capital (measured with `git log origin/main --format=%s | grep -cE '^[a-z]+(\([^)]*\))?!?: [A-Z]'`). The rule was never enforced where history is kept, so nothing showed it protected no one.
- **Review of PR #169:** that change met the rule and judged it only for Dependabot. It did not ask who reads a subject's case.

## Countermeasure

Turn `subject-case` off. The Dependabot `ignores` entry from PR #169
stays, because removing it changes what Dependabot can commit, which is a
separate change.

## Eradication

**Type:** structural impossibility (level 1). The rule is gone, so no
subject is refused for its case.

**Reference:** the commit adding this file.

```diff
+    'subject-case': [0],
```

**What it drops:** a subject such as `feat(talos): FIX` is now accepted.
`main` already held capitalised subjects, so no reader relied on the
property.

**Proof it can fail:** before the change, `feat(talos): Phaistos coin icon
and cold-start opening` exited 1 with `subject must not be sentence-case,
start-case, pascal-case, upper-case [subject-case]`. After it, that subject
and `docs(meta): ADR, pragma's reads leave in one batch per tick` exit 0,
and `fix talos thing` still exits 1 for its missing type (measured when
the entry was written).

**Similar instances:** the class is a preset rule adopted unread. The
preset's rules are listed in
`node_modules/@commitlint/config-conventional/lib/index.js`. Of those
still active, `type-enum`, `type-case`, `type-empty`, `subject-empty`,
`header-trim` and `header-max-length` hold the parsable header that
`scope-enum` and the changelog read. `body-leading-blank` is a warning
and refuses nothing. `subject-full-stop` is the one style rule left, and
it refused no commit in the kaizen logs (measured with `grep -rh
full-stop docs/features/*/*/kaizen.md`, empty).
