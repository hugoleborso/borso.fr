---
date: 2026-08-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/46
fix-pr: https://github.com/hugoleborso/borso.fr/pull/46
fix-commits: [28fd613]
eradication-level: 2
time-to-detect: months
tags: [gates, testing, coverage, mutation, knip, dead-code, process]
---

# Three green gates on fifty-eight lines that ran nowhere

## Symptom

Reading `apps/pragma/api/src/` file by file for the blueprint sweep,
`setlists/energy-curve.core.ts` had no importer. Not "few callers" — none, in
the whole repository:

```bash
$ git grep -l "energy-curve" 9f462a1 -- apps/pragma | grep -v "energy-curve.core"
$   # nothing
```

It was fifty-eight lines with a full test suite, sitting at 100% statement,
branch, function and line coverage, surviving the mutation gate, and reported
clean by knip. Three gates, all green, on code no execution path reaches.

## Root-cause chain

1. **Why did the coverage gate pass?** Because it measures a file against the
   tests that import it, and the test imported it. Coverage answers *"is this
   file exercised"*, and a test exercises it.

2. **Why did the mutation gate pass?** Same reason, more strongly: every mutant
   was killed, because the test suite was thorough. A thorough test on dead
   code produces a *perfect* mutation score, so the strongest gate in the
   repository gives its highest signal exactly where the code is worthless.

3. **Why did knip pass?** Because `knip.json` lists `api/src/**/*.test.ts` as
   an *entry point*. A test is a root of the dependency graph, so anything a
   test imports is reachable by construction, and a module whose only consumer
   is its own test is reachable by exactly one hop from a root.

4. **Why is `*.test.ts` an entry point?** Because it has to be. Without it,
   knip reports every test file as unused. The setting is correct; the
   consequence is that knip structurally cannot see this class.

5. **Why did nobody notice?** Because each gate answered its own question
   correctly, and no gate asked the one that mattered. "Is it tested", "are the
   tests meaningful" and "is it imported" were all yes. **"Is it imported by
   something that is not a test"** was asked by nothing.

**Root cause:** thought *a module with 100% coverage and a clean mutation score
is in good standing*, actually *those scores measure the relationship between a
module and its test, and a module can have an excellent one of those while
having no relationship to the running program at all*.

## Detection failure causes

- **Typing:** an unimported exported module is not a type error. It compiles
  perfectly; that is what "exported" means.
- **Linter:** `no-unused-vars` is per file. Nothing is unused *within* the file.
- **Dead-code analysis (knip):** structurally blind, see chain step 3-4. This
  is the interesting failure: the tool whose entire job is this class cannot
  see this member of it.
- **Coverage / mutation:** not merely blind but actively *reassuring*. They
  reported the file as exemplary.
- **Code review:** a diff shows the file being added along with its test and
  its caller. The caller can be removed months later in an unrelated PR, and no
  review sees a file that is not in the diff.

## Countermeasure

- **Code:** commit `28fd613` — `energy-curve.core.ts` and its test deleted, and
  the two hand-mirrored pairs it was found alongside consolidated into
  `apps/pragma/domain/`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit hook and CI)

**Reference:** [PR #46](https://github.com/hugoleborso/borso.fr/pull/46) ·
this kaizen PR's commits

**The actual fix:** `scripts/check-pure-modules-have-callers.sh` asks the
question the other three do not. For every `*.core.ts` and `*.utils.ts`, is
there an importer that is not a test? Matching is on the module basename, which
is alias-agnostic — `../songs/tonality.core`, `@domain/tonality.core` and
`./tonality.core` all end the same way — with an optional `.js`, because
`infra/`'s ESM imports carry the emitted extension and leaving it out reported
every construct helper as dead on the first run.

Proven in both directions before landing: green on the tree as it stands, and a
planted `probe-dead.core.ts` with a passing test makes it exit 1 and name the
file.

**What it found on its first real run.** Nine modules, and the classification
is the useful part, because they are not one thing:

| Module | Verdict |
|---|---|
| `i18n-parity.core.ts` × 4 | test-only **by design** — they exist so a test can assert catalogue parity. Correct as they are. |
| `runner/runner.core.ts` | deliberately dormant, documented in PR #46, waiting on the relay-format decision. |
| `sw/manifest.utils.ts`, `sw/sw-cache.utils.ts` | **a live counterpart elsewhere**: `site/public/sw.js` is a hand-written 146-line service worker reimplementing this logic in plain JavaScript. The tested copy is the dead one and the running copy is ungated. |
| `mastery/mastery.core.ts` | same shape: `site/src/lib/mastery-aggregate.utils.ts` carries `meanForSong` on the front end. |
| `lib/request-position.utils.ts` | never wired — the self-punch flow reads geolocation without it. |

Each sits in `ALLOWED_TEST_ONLY` with that reason, which is what turns "nobody
noticed" into a line a reviewer reads. The last four are consolidation
decisions rather than deletions — merging a service worker into the bundle is a
build-pipeline choice — so they are surfaced to the operator rather than
settled here. Removing a line from the allowlist without fixing the module
fails the commit.

**Sibling defects swept:** the same PR found the same disease in a different
guise — `stale-bar.utils.ts` opened with *"Front-end mirror of `bars.core.ts`"*
and duplicated the threshold, and `bars.core.ts` and `lineup.core.ts` turned
out to have no back-end caller at all, so the mirror was the only live
implementation and the "original" was dead. That the mirrors and the orphans
are the same finding is the pattern worth carrying forward: **when the same
rule exists twice, at least one of the copies is usually dead, and the gates
will not tell you which.**

## See also

- [`docs/dantotsus/a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
  — four gates that ran and asserted nothing. This one is the inverse: gates
  that asserted correctly, about the wrong thing.
- [`docs/dantotsus/a-green-mutation-gate-is-not-a-green-coverage-gate.md`](./a-green-mutation-gate-is-not-a-green-coverage-gate.md)
- [`docs/adr/0010-pragma-domain-folder-for-cross-boundary-rules.md`](../adr/0010-pragma-domain-folder-for-cross-boundary-rules.md)
