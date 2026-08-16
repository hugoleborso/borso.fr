---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-commits: []
eradication-level: 1
time-to-detect: months
tags: [ci, husky, stryker, mutation-testing, shell, sed]
---

# A sed delimiter disarmed the mutation gate

## Symptom

The pre-push hook claims, in its own comment and in CLAUDE.md, that a changed
`*.core.test.ts` pulls its sibling source into the mutation run. It never did.
A push that strengthened a test and touched nothing else ran Stryker over
nothing, printed no gate line, and passed.

Nothing failed, which is why it lasted: the gate reported success by running
zero mutants rather than by killing them.

## Root-cause chain

1. The selection mapped a test path back to its source with
   `sed -e 's|\.\(core\|utils\)\.test\.ts$|.\1.ts|'`.
2. The substitution's delimiter is `|`, and the alternation is written `\|`.
3. Inside `s|…|…|`, GNU sed reads `\|` as an **escaped delimiter** — a literal
   `|` character — not as BRE alternation. The pattern therefore looked for a
   file literally named `….core|utils.test.ts`.
4. No path matches, so the substitution was a no-op and every test path fell
   through to the next stage.
5. `grep -E '\.(core|utils)\.ts$'` then dropped those paths, because they still
   ended in `.test.ts`.
6. With no file selected, `[ -z "$pure_files" ] && continue` skipped the app
   entirely — silently, since the skip prints nothing.

## Detection failure causes

- The gate's success and its absence are the same output: nothing.
- The behaviour is asserted in two comments and in CLAUDE.md, and a comment is
  not executable. Both readers, human and agent, trusted the prose.
- Every push that changed a source file *and* its test still ran the source,
  so the hole only opened on a test-only change — the rarer case, and the one
  where a mutant is most likely to have been the point.
- Nothing in the repository tests the hook's own path selection.

## Countermeasure

Use `-E` and a delimiter the pattern does not contain:

```sh
sed -E 's/\.(core|utils|adapter)\.test\.ts$/.\1.ts/'
```

## Eradication

Structural, at the level below the rule: the substitution can no longer be
written in a form where the delimiter and the alternation are the same
character, because the delimiter is now `/` and the alternation `|` is an ERE
operator rather than an escape.

Shipped in `.husky/pre-push` alongside the widening of the same selection to
`*.adapter.ts`, and the claim in CLAUDE.md now names all three suffixes.

Verified by feeding the selection four paths — an adapter source, an adapter
test, a utils test, and a controller test — and checking that the first three
resolve to sources and the fourth is dropped:

```
api/src/songs/musicbrainz.adapter.ts
site/src/lib/modal-dialog.adapter.ts
site/src/lib/queries/optimistic.utils.ts
```

## Ladder position

**Structural impossibility** for the delimiter collision. The broader class —
a shell gate that passes by selecting nothing — remains a detection gap: the
hook prints a line per gate it starts, so an app that selects no file prints
nothing, and nothing is indistinguishable from success. A gate that says what
it skipped would close it.
