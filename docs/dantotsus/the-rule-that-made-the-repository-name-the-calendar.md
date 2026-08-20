---
date: 2026-08-19
introduced-at: implementation
detected-at: review
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-commits: []
eradication-level: 2
time-to-detect: days
tags: [eslint, naming, standards, meta]
---

# The naming standard's own example failed the rule the naming standard cites

## Symptom

`docs/standards/01-naming.md` shows this shape as the thing to do — a duration
named once, built from its units:

```ts
const SESSION_TIME_TO_LIVE_MS = 30 * 24 * 60 * 60 * 1000;
```

Written into any file under `apps/` or `infra/`, it produced five errors from
`no-magic-numbers`, the rule that same document cites two sections later as its
enforcement:

```
1:33  error  No magic number: 30    no-magic-numbers
1:38  error  No magic number: 24    no-magic-numbers
1:43  error  No magic number: 60    no-magic-numbers
1:48  error  No magic number: 60    no-magic-numbers
1:53  error  No magic number: 1000  no-magic-numbers
```

## Root-cause chain

1. `CLAUDE.md` states the rule as *"a bare `31` **inside a function body**
   becomes a named const"*. That scope is the whole idea: the name is what the
   reader needs, and inside a `const NAME = …` the name is already there.
2. ESLint's `no-magic-numbers` has no such scope. It reports every numeric
   literal outside its `ignore` list wherever it appears, including inside the
   initializer of the named constant that satisfies the rule's own purpose.
3. So the only way to write a duration was to name each factor first:
   `MILLISECONDS_PER_SECOND`, `SECONDS_PER_MINUTE`, `MINUTES_PER_HOUR`,
   `HOURS_PER_DAY`.
4. Those four facts are needed in every file that touches time, and this
   repository forbids cross-application imports, so each file declared its own.

The measurement is the finding. Across `apps/` and `infra/` today:

| Constant | Declarations |
| --- | --- |
| `SECONDS_PER_MINUTE` | 17 |
| `MILLISECONDS_PER_SECOND` | 16 |
| `MINUTES_PER_HOUR` | 10 |
| `HOURS_PER_DAY` | 5 |

Forty-eight declarations of four facts, spread over 21 files in four
applications. **Forty-five of them arrived with the commit that turned the rule
on**, against eleven that existed before it. A rule introduced to remove magic
numbers quadrupled the number of places the same four numbers are written down.

## Detection failure causes

- **Every individual instance looks right.** `const SECONDS_PER_MINUTE = 60;`
  is a named constant. Nothing about it, read alone, says it is the fortieth
  copy.
- **The rule was verified against the wrong question.** Turning it on was
  checked by *"does the repository still lint"*, and it did — after 242 literals
  were named. Nobody asked what the naming had produced.
- **The contradiction is two sections apart in one document**, and the example
  was written before the rule was cited. Neither half was wrong when it was
  written.
- **The enforcement ledger cannot see this.** It checks that a cited rule exists
  and is enabled. `no-magic-numbers` is both. A rule that is on and asking for
  the wrong thing is exactly what the ledger does not model.

## Countermeasure

Exempt the time-unit factors — `1000`, `60`, `24`, `7`, `365` — as a named
`TIME_UNIT_FACTORS` list beside the identity values and the HTTP status codes,
which are in the `ignore` list for the same reason: a status code is already a
name in a published registry, and so is the number of seconds in a minute.

The test is whether the name answers a question. `31` asks *why thirty-one*.
`60` does not.

## Eradication

**Configuration, level 2.** The rule now asks for a name where a name adds
something, and stops asking where it does not, so the pressure that produced the
duplication is gone.

Verified in both directions after the change:

| Probe | Expected | Result |
| --- | --- | --- |
| `const SESSION_TIME_TO_LIVE_MS = 30 * 24 * 60 * 60 * 1000;` | only `30` flagged | only `30` flagged — the domain number, which does deserve a name |
| `function readRetryBudget() { return 31; }` | flagged | flagged |
| `pnpm exec eslint . --max-warnings 0` | clean | clean |

`docs/standards/01-naming.md` now lists the exemption with the count behind it,
and states the rule the exemption follows from, so the next literal argues about
the right thing.

**The cost, stated because it is real:** a bare `60` is now legal as a timeout
or a limit, where before it had to be named. That is a genuine loss and it is
not measurable in advance — the case for taking it is the table above, four
facts against forty-eight copies.

**What this deliberately does not do:** delete the forty-eight declarations.
They are correct code, and rewriting 21 files across four applications in a
kaizen pull request trades a documented redundancy for an undocumented
regression surface. What changes is that they are now removable rather than
required, and the next file that needs a duration does not have to add four more.

## See also

- [`purity-rule-was-wrong-four-times`](./purity-rule-was-wrong-four-times.md) — the other shape of this: a rule that was on, enforced, and asking for the wrong thing.
- [`a-lint-rule-that-knew-only-one-of-three-spellings`](./a-lint-rule-that-knew-only-one-of-three-spellings.md) — a rule right about its subject and wrong about its reach.
