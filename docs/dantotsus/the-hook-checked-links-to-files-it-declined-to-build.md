---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#70'
fix-commits: [e8746f923b, 9dcf74547]
eradication-level: 1
eradication-paths: [scripts/docs/check-doc-links.ts]
time-to-detect: minutes
tags: [hooks, pre-commit, meta, gates, tooling]
zone: .husky/pre-commit
recurs: none (the first entry on a commit-path check reading an output the commit path does not build)
---

# The hook checked links to files it declined to build

## User impact

A commit touching a lockfile and a workspace manifest was refused by
pre-commit with five dead links nobody had touched. It took two rounds,
because the first attempt ran a different generator.

| | Seen | Expected |
| --- | --- | --- |
| Pre-commit on PR #70 | `5 dead link(s). Fix the path, or drop the link if the target is gone.` for links to `blueprint-coverage.html` | the commit accepted, since it changed no document |

<details><summary>The refusal</summary>

```
.claude/skills/blueprint/SKILL.md:76 links `./blueprint-coverage.html`, which is not there.
CLAUDE.md:7 links `./.claude/skills/blueprint/blueprint-coverage.html`, which is not there.
docs/standards/README.md:114 links `../../.claude/skills/blueprint/blueprint-coverage.html`, …
5 dead link(s). Fix the path, or drop the link if the target is gone.
```

</details>

## Causal chain

- Pre-commit refused the commit for five dead links.
  - `check-doc-links.ts` found `blueprint-coverage.html` absent and counted each link to it as dead. It treated an ignored path that is absent as dead, to catch a generator that stopped producing its output.
    - Nothing on that tree had generated the page.
      - Merging `main` into a branch older than ADR-2026-08-20T1031 deleted the last committed copies of every generated file, mid-session, after SessionStart's generation had run.
      - Pre-commit no longer ran `blueprint-heatmap.ts`, the page's only producer.
        - Commit `9326a890a` took the generator off the commit because "`blueprint-heatmap.ts` and `rule-provenance.ts` had nothing else, so they no longer run on the commit at all." The same commit kept the link check on the commit, wrote "An ignored path that is absent is still a dead link", and made CI regenerate every output before it.

## Root cause of occurrence

*Thought a generator whose check refuses nothing can leave the commit path,
because CI regenerates and SessionStart builds the outputs on a local tree,
actually the link check on the same commit path still read its output, and a
merge of `main` mid-session deletes that output after SessionStart has run.*
(Method)

The sweep judged each generator by what its own check refused, not by who
reads its output. Commit `9326a890a` shows it knew the link check reads
ignored paths, since it gave CI a regeneration step for that reason. The
commit path got no such step, because SessionStart was assumed to cover it.

## Detection failure causes

- **Linter:** a shell hook's ordering is checked by nothing.
- **CI:** cannot reproduce it. CI regenerates first, which is the asymmetry.
- **Review of `9326a890a`:** it asked whether each removed check refused anything, and that question had the right answer. It did not ask who else read the outputs.
- **`check-coupled-lists.sh`:** models lists that must agree, not a producer and consumer ordering inside one hook.

## Countermeasure

Commit `e8746f9` added `scripts/reports.sh all --missing-only` to pre-commit,
just before the link check. It ran each generator only when its output was
absent: 15 ms with everything present, 1.4 s rebuilding the one missing output
(measured then).

## Eradication

**Type:** structural impossibility (level 1), by subtraction

**Reference:** commit `9dcf74547` (#197). `check-doc-links.ts` now drops every
broken link whose target git ignores, through `selectJudgeable`, and the
`--missing-only` call left pre-commit. No check on the commit path reads an
output the commit path does not build, so a missing generated file cannot
refuse a commit.

```ts
function selectJudgeable(broken: readonly BrokenLink[]): readonly BrokenLink[] {
  if (broken.length === 0) return broken;
  const ignored = new Set(
    splitLines(
      runGit(
        ['check-ignore', '--no-index', '--stdin'],
        broken.map((link) => resolveTarget(link.document, link.target)).join('\n'),
      ),
    ),
  );
  return broken.filter((link) => !ignored.has(resolveTarget(link.document, link.target)));
}
```

`.husky/pre-commit:252` runs the link check with `--staged`, and
`.github/workflows/ci.yml:152` runs it in full (read 2026-11-27).

**What it drops:** the old check caught a generator that stopped producing
its output, through the dead links to it. No link check sees that now.

**Proof it can fail:** not replanted this session. With the generated page
absent, as in this worktree, the check skips the links to it.

**Similar instances:** `grep -rln blueprint-coverage.html --include=*.md .`
finds links to the page in skills, standards, an ADR and knowledge entries
(measured 2026-11-27). Each is skipped while the page is absent.
