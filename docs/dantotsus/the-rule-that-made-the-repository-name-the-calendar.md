---
date: 2026-08-19
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#55'
fix-commits: [8c08c5d872]
eradication-level: 2
eradication-paths: [.oxlintrc.json]
time-to-detect: days
tags: [eslint, naming, standards, meta]
zone: .oxlintrc.json
---

# The naming standard's own example failed the rule the naming standard cites

## User impact

The users are the agents and the operator writing code here. `docs/standards/01-naming.md` showed a duration built from its units as the thing to do. Written into any file under `apps/` or `infra/`, that shape failed the lint rule the same document cites as its enforcement. So every duration needed its factors named first, in every file.

| | Seen | Expected |
| --- | --- | --- |
| `const SESSION_TIME_TO_LIVE_MS = 30 * 24 * 60 * 60 * 1000;` in `apps/` | Five `no-magic-numbers` errors, one per factor | At most `30` flagged, the one number that needs a name |

Across `apps/` and `infra/` on 2026-08-19, 48 declarations of four constants (`SECONDS_PER_MINUTE`, `MILLISECONDS_PER_SECOND`, `MINUTES_PER_HOUR`, `HOURS_PER_DAY`) sat in 21 files. 45 of them arrived with the commit that turned the rule on (measured by the first version of this entry).

## Causal chain

- Every duration under `apps/` and `infra/` had to be built from per-file factor constants.
  - `no-magic-numbers` reported every numeric literal outside its `ignore` list, including the factors inside the initializer of a constant that already had a name.

    ```js
    // eslint.config.js, as of a9c72cedd
    'no-magic-numbers': ['error', {
      ignore: [...IDENTITY_VALUES, ...HTTP_STATUS_CODES], // ❌ 60, 24 and 1000 reported even in `const X_SECONDS = 12 * 60 * 60`
      …
    }],
    ```

    - Commit `a9c72cedd` (2026-08-15, written by an agent, 434 files) turned the rule on to close an audit gap: the standard cited it and it was off. Its message: "`no-magic-numbers` is on, with `0`, `1`, `-1` and HTTP status codes exempt … The literals it found are named."
      - The right answer was in the agent's context. The commit edited the *Enforced by* section of `01-naming.md`. That section said the rule "reports 1928 sites across the repository … so turning it on is a decision about 1928 edits rather than a configuration line". The same file showed `const MAXIMUM_RACE_DURATION_SECONDS = 12 * 60 * 60;` as its example, which the rule now refused. The goal of closing every gap in one 434-file commit won over both. (Man)

## Root cause of occurrence

*Thought turning on `no-magic-numbers` enforces the standard's rule, "a bare `31` inside a function body becomes a named const", actually the rule reports every literal outside its `ignore` list, including the factors of a constant that is already named.*

Man, under the agentic rule. The standard's example and its warning about 1928 sites were both in the file the commit edited (read at `a9c72cedd^:docs/standards/01-naming.md`, lines 142 and 205). The agent verified the change by asking whether the repository still linted, and it did, after 242 literals were named. The worker's state fits too: one commit closed fifteen audit gaps across 434 files. The fix is a gate, not another sentence in the standard.

## Detection failure causes

- **Linter:** every copy looks right alone. `const SECONDS_PER_MINUTE = 60;` is a named constant, and nothing says it is the fortieth.
- **Self-validation:** the change was checked by "does the repository still lint". Nobody counted what the naming produced.
- **The enforcement ledger:** `scripts/standards/enforcement-ledger.ts` checks that a cited rule exists and is enabled. A rule that is on and asks for the wrong thing passes it.

## Countermeasure

`8c08c5d87` exempted the time-unit factors `1000`, `60`, `24`, `7` and `365`, beside the identity values and the HTTP status codes. A status code is a name in a published registry, and so is the number of seconds in a minute. `31` asks "why thirty-one". `60` does not.

| Probe | Result |
| --- | --- |
| `const SESSION_TIME_TO_LIVE_MS = 30 * 24 * 60 * 60 * 1000;` | only `30` flagged |
| `function readRetryBudget() { return 31; }` | flagged |
| `pnpm exec eslint . --max-warnings 0` | clean |

The cost: a bare `60` is now legal as a timeout or a limit, where before it had to be named.

## Eradication

**Type:** DevX check (level 2).

**Reference:** commit [`8c08c5d8`](https://github.com/hugoleborso/borso.fr/commit/8c08c5d872). The rule moved to oxlint in `9dcf74547` (PR #197) and kept the list.

```json
// .oxlintrc.json
"no-magic-numbers": ["error", { "ignore": [0, 1, -1, 200, …, 503, 1000, 60, 24, 7, 365], … }]
```

The standard's example now lints. The rule no longer demands a factor constant.

The copies it demanded are still there and still growing. `grep -rhoE "const (SECONDS_PER_MINUTE|MILLISECONDS_PER_SECOND|MINUTES_PER_HOUR|HOURS_PER_DAY)\b" apps infra --include=*.ts --include=*.tsx | wc -l` counts 74 declarations in 39 files today, against 48 in 21 when this entry was written (measured 2026-11-27). Nothing refuses a new one.

**Proposed:** subtract, then gate. Inline the 74 factor constants, which the `ignore` list already allows. Add a rule under `eslint-rules/`, loaded through `jsPlugins` in `.oxlintrc.json`, that refuses a `const` whose initializer is only one of `1000`, `60`, `24`, `7` or `365`. A new per-file copy of a calendar fact could then not be committed, whatever the next audit decides.

**Proof it can fail:** inferred from the probe table above, not replayed this session. `function readRetryBudget() { return 31; }` in `apps/` is still flagged.

**Similar instances:** [`purity-rule-was-wrong-four-times.md`](./purity-rule-was-wrong-four-times.md) is another rule that was on, enforced, and asking for the wrong thing. [`a-lint-rule-that-knew-only-one-of-three-spellings.md`](./a-lint-rule-that-knew-only-one-of-three-spellings.md) is a rule right about its subject and wrong about its reach.
