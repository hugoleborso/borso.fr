---
date: 2026-08-21
introduced-at: implementation
detected-at: linter
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
fix-pr: https://github.com/hugoleborso/borso.fr/pull/82
fix-commits: [pending]
eradication-level: 1
time-to-detect: minutes, twice, by two different agents
tags: [eslint, custom-rule, stryker, gates, meta, tooling]
---

# A rule that forbade its own escape hatch from wrapping

## Symptom

`borso/no-comments` accepts a comment only when every non-empty line is
machine-read. A rule exception is machine-read, so this passes:

```js
// eslint-disable-next-line borso/no-use-effect -- attaches Leaflet to a DOM node
```

But this — the same directive, with the reason wrapped — was rejected:

```js
/* eslint-disable no-magic-numbers -- the WGS84 constants
   are the formula itself, not tunables */
```

Two agents hit it independently. `strip-lll-site`: *"every disable comment in
the repo has to be a single long line and nothing says so"*. `strip-scripts`:
*"every multi-line disable in the repo has to be re-folded onto one line"* —
they re-folded five Stryker directives in `ledger.core.ts` and `defects.core.ts`
to get past the gate.

## Root-cause chain

1. **Why was the wrapped directive rejected?**
   Its second line, `are the formula itself, not tunables`, matches no marker
   pattern, and the rule demands that *every* line match.
2. **Why does the rule demand that?**
   To reject a block pairing one tag with a sentence of prose — the exact
   shape that hides prose behind a `@Blueprint` tag.
3. **Why is that demand wrong for a directive?**
   A tag's grammar is closed: `@Feature <id>` and nothing else. A directive's
   grammar is open by design — `eslint-comments/require-description` *requires*
   a free-text reason after `--`, and free text is what prettier wraps.
4. **Why did the rule treat both the same?**
   Both were in one flat `MACHINE_READ_LINE_PATTERNS` list, so both inherited
   the every-line test.

**Root cause:** we thought "machine-read" was one category; actually it is two.
A **tag** is machine-read on every line. A **directive** is machine-read on its
first line and carries human prose after it, which the repository's own lint
configuration mandates and its own formatter is free to wrap.

The rule therefore made the escape hatch harder to write the longer its
justification — pressure in exactly the wrong direction, since a long reason
is a good reason.

## Detection failure causes

- **Linter / static analysis:** the rule *was* the failure.
- **CI:** every wrapped directive in the tree had already been re-folded onto
  one line by the agents, by hand, to get the branch green. CI saw a clean
  tree. The workaround erased the evidence.
- **Code review:** a directive on one 120-character line reads as a style
  choice, not as a constraint the gate imposed.

## Countermeasure

None at the time — the agents worked around it, which is why it reached `main`.

## Eradication (mandatory — code-level)

**Level 1 — structural impossibility.** The two categories are now two lists,
and the test differs by category.

```js
const DIRECTIVE_WITH_REASON_PATTERNS = [
  /^eslint-(disable|enable)/,
  /^Stryker (disable|restore)/,
];

if (isDirectiveLine(lines[0].text)) {
  return true;
}
return lines.every((line) => isTagLine(line.text));
```

A block **headed** by a directive passes whole, because everything after the
directive is its reason. Every other block still passes only when every line
is a tag, so the shape this rule exists to reject is untouched — verified by
the suite, which asserts a `@Feature` tag paired with a sentence is still
rejected while both wrapped directive forms now pass.

## Related

- [`docs/standards/12-linting-and-gates.md`](../standards/12-linting-and-gates.md)
  — *"a rule exception is written on the line it excuses"*, and why the reason
  is mandatory.
- [`how-a-mutation-survivor-hides.md`](../knowledge/how-a-mutation-survivor-hides.md)
  — the other half of the Stryker directive story: a `Stryker disable` covering
  one line of a multi-line statement.
