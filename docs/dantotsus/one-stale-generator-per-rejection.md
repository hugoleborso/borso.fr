---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#60'
fix-commits: [59867d4e77, 9326a890a]
eradication-level: 1
eradication-paths: [.gitignore]
time-to-detect: minutes
tags: [pre-commit, gates, hooks, meta, developer-experience]
zone: .husky/pre-commit
---

# One stale generator per rejection

## User impact

Committing the setlist fix in PR #60 took four attempts. It should have taken
one, with the source change and nothing else.

| Attempt | Seen | Expected |
| --- | --- | --- |
| 1st | `.claude/skills/blueprint/blueprint-index.md is out of date. Run …` | committed |
| 2nd | `.claude/skills/blueprint/blueprint-coverage.html is out of date. Run …` | |
| 3rd | `docs/architecture/pragma-architecture.json is out of date. Run …` | |
| 4th | committed | |

Each regeneration was a one-line command. The cost was three round trips to
learn which three (measured from the session by the first version of this
entry).

## Causal chain

- The commit was refused three times, one generated file per refusal.
  - The hook ran three `--check` commands in sequence under `set -e`, so the
    first non-zero exit ended it. At `59867d4e77^`:

    ```bash
    pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check
    pnpm exec tsx .claude/skills/blueprint/blueprint-heatmap.ts --check
    # …
    pnpm exec tsx scripts/architecture/architecture-graph.ts --check
    ```

    - Each `--check` regenerated its file and compared it with the copy in
      git, because the generated file was committed beside its source. A
      source change made all three stale at once.
      - Generated outputs were committed as if they were inputs. Each
        generator that was added brought its output and a byte comparison
        with it (Method).

## Root cause of occurrence

*Thought a generated file belongs in git beside its source, so a gate must keep
it fresh, actually an output any command recomputes is not an input, and
committing it makes every source change regenerate it by hand.* (Method)

Commit `9326a890a`, two days later, states it: "Fourteen files were written by
a generator and committed next to the source they came from, each gated by a
`--check` that regenerated the file and compared it to the copy in git." The
first version of this entry stopped one level higher, at the hook's fail-fast
shape.

## Detection failure causes

- **Linter:** nothing reads a hook for whether its checks are independent.
- **Local validation:** each check was tested alone, where fail-fast and
  report-all look the same.
- **CI:** it ran the same generators and also stopped at the first, but nobody
  waits on CI the way they wait on a commit.
- **Review:** three correct lines in sequence read as three correct lines.

## Countermeasure

Commit [`59867d4`](https://github.com/hugoleborso/borso.fr/commit/59867d4e77)
ran the three checks to completion, collected the failures, and printed every
command in one refusal. Verified with two artefacts stale at once: both named.

## Eradication

**Type:** structural impossibility (level 1).

**Reference:** commit [`9326a890a`](https://github.com/hugoleborso/borso.fr/commit/9326a890a)
(2026-08-20) gitignored the generated outputs and removed the byte comparison.
Its message says "`--check` no longer detects staleness anywhere." `.gitignore`
now holds:

```text
docs/architecture/*-architecture.json
.claude/skills/blueprint/blueprint-index.md
.claude/skills/blueprint/blueprint-coverage.html
```

`git ls-files` returns none of the three. `scripts/reports.sh` rebuilds them
before anything reads them, as
[ADR-2026-08-20T1031](../adr/2026-08-20T1031-generated-files-are-not-committed.md)
and `docs/knowledge/generated-reports-are-rebuilt-not-committed.md` record. A
file that is not committed cannot be stale in a commit, so the refusal this
entry counts cannot happen. The `blueprint-indexing.ts --check` left in
`.husky/pre-commit` refuses an annotation naming no blueprint, which a person
can get wrong.

The gap: a new generator whose output someone commits would bring the class
back. The knowledge entry above, triggered on `.gitignore` and the blueprint
outputs, is what meets that author.

**Proof it can fail:** the refusal needs a committed output to compare. With
the three outputs gitignored, `git ls-files` lists none, so there is nothing to
plant.

**Similar instances:** `git ls-files | grep -E '\.(generated|gen)\.|-architecture\.json|blueprint-index'`
finds nothing. The committed files the ADR keeps on purpose are inputs a
person accepted, such as `docs/standards/convention-baseline.json`.
