---
date: 2026-08-21
introduced-at: implementation
detected-at: linter
severity: medium
related-pr: '#81'
fix-commits: [03e16d4d6d]
eradication-level: 1
eradication-paths: [eslint-rules/no-comments.js]
time-to-detect: minutes, twice, by two different agents
tags: [eslint, custom-rule, stryker, gates, meta, tooling]
zone: eslint-rules/no-comments.js
---

# A rule that forbade its own escape hatch from wrapping

## User impact

`borso/no-comments` accepts a comment only when it is machine-read. A rule
exception on one line passed. The same exception with its reason wrapped was
refused.

| | Seen | Expected |
| --- | --- | --- |
| `// eslint-disable-next-line borso/no-use-effect -- attaches Leaflet to a DOM node` | accepted | accepted |
| `/* eslint-disable no-magic-numbers -- the WGS84 constants`<br>`are the formula itself, not tunables */` | refused | accepted |

Two agents hit it on their own. `strip-lll-site`: *"every disable comment in
the repo has to be a single long line and nothing says so"*. `strip-scripts`:
*"every multi-line disable in the repo has to be re-folded onto one line"*.
They re-folded five Stryker directives in `ledger.core.ts` and `defects.core.ts`
to pass the gate.

## Causal chain

- The rule refused a wrapped `eslint-disable` block.
  - Its second line, `are the formula itself, not tunables`, matched no marker
    pattern, and the rule required every non-empty line to match one.
    - Commit `8621866` (2026-08-20, "remove every comment from the code, and
      gate it") wrote the rule with one flat list, below. Tags and directives
      shared it, so both got the every-line test.
      - The same commit met two wrapped directives and re-folded each onto one
        line of 258 characters, in both copies of `haversine.utils.ts`.

```js
const MACHINE_READ_LINE_PATTERNS = [
  /^@FollowsBlueprint\s/,
  /^@Feature\s/,
  /^eslint-(disable|enable)/, // ← a directive tested like a tag, on every line
  // ...
];
```

## Root cause of occurrence

*Thought a machine-read comment is machine-read on every line, so a wrapped
reason is a layout to fold, actually a directive is machine-read only on its
first line and carries a free-text reason of any length.* **Man.** The facts
were in the writer's context. `@eslint-community/eslint-comments/require-description`
was configured in `eslint.config.js` at `8621866^`, and the commit's own message
lists "an eslint directive with its -- reason". The commit then folded the two
wrapped reasons it met to fit its rule. A single agent was carrying a sweep
that removed 3489 comments across 782 files, and the goal of rejecting prose won over the reason a directive
requires (inferred from the commit's size and its diff).

Prettier did not wrap these comments. `.prettierrc.json` at `03e16d4^` sets
`printWidth: 100` and nothing reflows a comment, so their writers wrapped them
by hand.

## Detection failure causes

- **Linter:** the rule was the failure.
- **CI:** the agents had already re-folded every wrapped directive to get the
  branch green, so CI saw a clean tree. The workaround erased the evidence.
- **Review:** a directive on one 258-character line reads as a style choice,
  not as a constraint the gate imposed.

## Countermeasure

None at the time. The agents worked around it, which is how it reached `main`.

## Eradication

**Type:** structural impossibility (level 1). Tags and directives are two lists,
and each has its own test.

**Reference:** commit [`03e16d4`](https://github.com/hugoleborso/borso.fr/commit/03e16d4d6d).

```js
const DIRECTIVE_WITH_REASON_PATTERNS = [/^eslint-(disable|enable)/, /^Stryker (disable|restore)/];

if (isDirectiveLine(lines[0].text)) {
  return true;
}
return lines.every((line) => isTagLine(line.text));
```

A block headed by a directive passes whole, because everything after the
directive is its reason. Every other block passes only when every line is a tag,
so a tag paired with prose is still refused.

**Proof it can fail:** `eslint-rules/no-comments.test.js` asserts that a
`@Feature` tag paired with a sentence is refused and that both wrapped directive
forms pass.

**Similar instances:** Stryker directives carry a reason the same way and are in
the directive list. `@ts-(expect-error|ignore|nocheck)` is still in the tag
list, yet the repository writes it with a reason, such as
`// @ts-expect-error -- a Button without an icon is the type error this test pins`
in `apps/pragma/site/src/components/atoms/button.types.test.ts`. A block comment
whose reason wraps after it would be refused, as directives were before the fix
(inferred from the rule's patterns, not measured).
[`how-a-mutation-survivor-hides.md`](../knowledge/how-a-mutation-survivor-hides.md)
covers a `Stryker disable` that covers one line of a multi-line statement.

**Proposed:** move `@ts-(expect-error|ignore)` from `TAG_LINE_PATTERNS` into
`DIRECTIVE_WITH_REASON_PATTERNS` in `eslint-rules/no-comments.js`, and add the
wrapped form to `eslint-rules/no-comments.test.js`. Every comment that carries a
reason after a machine-read head would then pass whole, and the class would be
closed for every directive the repository writes.
