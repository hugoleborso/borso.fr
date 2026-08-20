# Three ways a mutant survives a test that looks like it covers it

From the hardening pass that took this repository's own tooling from 77.40% to
100% with zero survivors. All three are cases where the test reads as
sufficient and is not.

## A `Stryker disable next-line` comment covers exactly one line

The comment applies to the line immediately after it — after the whole comment
block, not after each line of it. So this covers only `sources`:

```ts
// Stryker disable next-line ArrayDeclaration: equivalent mutant, because the
// fallback stands in for a key the map has no entry for and the loop body
// reads only `verdict`.
const sources = readSources();
return sources
  .filter((each) => each.kind === 'gate') // <- mutants here are NOT disabled
  .map((each) => each.name);
```

A statement spread over several lines needs the disable on the line the mutant
is actually reported on, which is the line with the operator, not the line the
statement starts on. Read the survivor's reported line number rather than
assuming it is the head of the expression.

Better still: if you are writing a disable, check first whether the code can be
rewritten so no mutant exists. Two `OptionalChaining` suppressions in
`defects.core.ts` went away when a `matchAll` scan became an `indexOf` walk, and
an `ArrayDeclaration` one went away when a `?? []` fallback stopped being needed.
A suppression is a claim a reviewer has to re-derive; code with nothing to
suppress is better.

## `toContain` cannot see a changed leading digit

```ts
expect(report).toContain('5 more file(s)');
```

passes against the mutant that renders `55 more file(s)`, because the mutated
string still contains the expected substring. Any assertion that a number
appears in rendered text has this hole for every mutation that *prepends*
digits.

Assert the whole line, or match with an anchored pattern:

```ts
expect(report).toMatch(/^5 more file\(s\)/m);
```

## A regex mutant that only moves a capture-group boundary is always equivalent

For a rewrite of the form "match a keyword and re-emit what followed":

```ts
statement.replace(/\bCREATE TABLE(\s+(?!IF\s+NOT\s+EXISTS))/, 'CREATE TABLE IF NOT EXISTS$1');
```

Stryker will mutate the capture group's boundary. Because whatever the group
captures is re-emitted verbatim through `$1`, moving that boundary produces the
identical output for every input the function can receive. The mutant is
genuinely equivalent and no assertion can kill it — this idiom cannot reach
100% without a justified disable.

If the 100% threshold matters more than the idiom, restructure so the
whitespace is matched by a lookahead rather than captured:
`/\bCREATE TABLE(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/` with no `$1` in the
replacement. That is what the migration rewrites in `infra/cdk` do now, and it
fixed a real bug at the same time — the greedy `\s+` inside the lookahead
backtracked to one character, so a statement with two spaces before `IF NOT
EXISTS` had the clause doubled.

See also
[`a-green-mutation-gate-is-not-a-green-coverage-gate.md`](../dantotsus/a-green-mutation-gate-is-not-a-green-coverage-gate.md)
and
[`a-sed-delimiter-disarmed-the-mutation-gate.md`](../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md).
