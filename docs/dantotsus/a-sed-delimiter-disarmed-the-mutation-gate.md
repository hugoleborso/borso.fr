---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#49'
fix-commits: [4935e7c0c9]
eradication-level: 5
eradication-paths: [scripts/mutate-changed.sh]
time-to-detect: months
tags: [ci, husky, stryker, mutation-testing, shell, sed]
zone: .husky/pre-push
weak-point: gate-measures-nothing
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# A sed delimiter disarmed the mutation gate

## User impact

The mutation gate promised, in its own comment and in CLAUDE.md, that a
changed `*.core.test.ts` pulls its sibling source into the mutation run. It
never did. A push that weakened or strengthened a test and touched nothing
else ran Stryker over nothing, printed no gate line, and passed.

| | Seen | Expected |
| --- | --- | --- |
| A push that changes only `x.core.test.ts` | no mutation line, push passes | Stryker mutates `x.core.ts` against the changed test |

Nobody measured how many test-only pushes went through ungated between
2026-08-09 and the fix on 2026-08-15.

## Causal chain

- A test-only push ran no mutation and passed.
  - The app's loop skipped silently: `[ -z "$pure_files" ] && continue`.
    - `grep -E '\.(core|utils)\.ts$'` dropped every test path, because each
      still ended in `.test.ts`.
      - The substitution that maps a test to its source changed nothing:

        ```sh
        sed -e 's|\.\(core\|utils\)\.test\.ts$|.\1.ts|'   # ← the faulty line
        ```

        - With `|` as the delimiter, GNU sed turns `\|` into a plain `|`
          before it compiles the pattern. In a basic regex a plain `|` is a
          literal character, so the pattern looked for a file named
          `….core|utils.test.ts`. Measured with GNU sed 4.9: the line returns
          `a/b.core.test.ts` unchanged, and rewrites `a/b.core|utils.test.ts`.
          - Commit 9fc3b9a40 (PR #49, an agent session) wrote it. It kept the
            `|` delimiter of the line above, `sed -n "s|^apps/$app/||p"`, and
            wrote BRE alternation inside it. The `grep -E` one line below uses
            ERE alternation correctly.
            - The commit verified its scoping on d49af83, a push that changed
              a source file. No run fed it a test-only change, because the
              selection was inline shell in a hook, and the repository had no
              harness that runs a shell gate on a fixture
              (`git grep -l execFileSync 9fc3b9a40^ -- '*.test.ts'` finds
              none). **Machine.**

## Root cause of occurrence

*Thought `\|` is alternation in any GNU sed substitution, actually when `|`
is the delimiter, `\|` becomes a plain `|`, which a basic regex reads as a
literal pipe.* **Machine:** the mapping lived in untested hook shell, so the
belief met no run that could disprove it.

The same rule makes the form work under `-E`, where a plain `|` is
alternation. Measured:
`echo a/b.core.test.ts | sed -E 's|\.(core\|utils)\.test\.ts$|.\1.ts|'`
prints `a/b.core.ts`. So the line was one flag away from correct, and only a
run on a test path could tell the two apart. The same commit's message carries a second untested claim of the same kind: "every
file goes into one brace expression". `scripts/mutate-changed.sh` now says
"a brace expression matches nothing".

## Detection failure causes

- **Gate output:** a gate that selects nothing and a gate that passes printed
  the same thing, nothing.
- **Local validation:** the commit's measurement used a push that changed a
  source file, so the test-only path never ran.
- **Tests:** no shell gate had a suite then. `docs/knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md`
  names the class.
- **Review:** the behaviour was asserted in two comments and in CLAUDE.md.
  Readers trusted the prose.

## Countermeasure

Commit 4935e7c0c used `-E` and a delimiter the pattern does not contain:

```sh
sed -E 's/\.(core|utils|adapter)\.test\.ts$/.\1.ts/'
```

It was verified by feeding four paths, an adapter source, an adapter test, a
utils test and a controller test. The first three resolved to sources and
the fourth was dropped.

## Eradication

**Type:** no mechanism above the floor (level 5)

**Reference:** commit [`4935e7c0c`](https://github.com/hugoleborso/borso.fr/commit/4935e7c0c9) fixed the line. The selection
has since moved out of `.husky/pre-push` into `scripts/mutate-changed.sh`,
which CI runs on every pull request (`.husky/pre-push:328` points at it).

What holds today is weaker than the level 1 this entry first claimed. The
mapping is written three times by hand in `scripts/mutate-changed.sh`, at the
`apps/`, `scripts/` and `infra/cdk` loops, with no test. Nothing stops a
fourth copy from reusing `|`. The only guard is the run's last line: when no
gated file was selected anywhere, it prints that nothing ran.

```sh
if [ "$runs" -eq 0 ]; then
  echo "[mutate-changed] no gated file changed between $base and the working tree, so nothing ran"
```

That line names the empty selection, but it exits 0, so it fails nothing,
and a skip in one app stays silent when another app ran. No knowledge entry
triggers on this file either: `the-shell-gates-are-only-ever-run-where-they-pass.md`
triggers on `scripts/check-*.sh` and `.husky/*` only. Level 5 records that
nothing above the floor holds until the proposal ships.

The three copies differ in suffix set (`mutate-changed.sh:102,115,126`). The
script's header says that is by design: apps gate `.core`, `.utils` and
`.adapter`, `scripts/` gates `.core` and `.utils`, and `infra/cdk` gates
`.utils`. So one function would take the suffix set as a parameter.

**Proposed:** move the test-to-source mapping into one function, called by
all three loops, with a vitest suite beside it in the shape of
`scripts/pre-push-range.test.ts`, which runs `scripts/pre-push-range.sh` on a
fixture through `execFileSync`. The suite feeds a test path per gated suffix
and expects its source. Three copies become one, and a wrong delimiter, a
missing suffix or a dropped `-E` fails a unit case at commit instead of
passing in silence.

**Proof it can fail:** not tried for the proposal. For the countermeasure,
the original line returns `a/b.core.test.ts` unchanged, and the fixed line
returns `a/b.core.ts` (measured).

**Similar instances:** `grep -n 's|.*\\|' scripts/*.sh .husky/*` finds one
other substitution that combines a `|` delimiter with `\|`, at
`scripts/check-instructions-name-installed-tools.sh:63`. It runs under `-E`,
so it alternates as meant (measured: it strips `npx` and `pnpm exec` from a
sample line).
