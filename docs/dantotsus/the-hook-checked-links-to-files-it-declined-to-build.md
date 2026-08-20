---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#70'
fix-pr: TBD
fix-commits: [e8746f9]
eradication-level: 1
time-to-detect: minutes
tags: [hooks, pre-commit, meta, gates, tooling]
---

# The hook checked links to files it declined to build

## Symptom

A commit touching a lockfile and a workspace manifest was refused by
pre-commit with five dead links nobody had touched:

```
.claude/skills/blueprint/SKILL.md:76 links `./blueprint-coverage.html`, which is not there.
CLAUDE.md:7 links `./.claude/skills/blueprint/blueprint-coverage.html`, which is not there.
docs/standards/README.md:114 links `../../.claude/skills/blueprint/blueprint-coverage.html`, …
5 dead link(s). Fix the path, or drop the link if the target is gone.
```

Two rounds of this: the first attempt named a different generator, and
running that one surfaced these.

## Root-cause chain

1. **Why were the links dead?**
   `blueprint-coverage.html` was not on disk.
2. **Why does an absent file fail the check rather than being skipped?**
   Deliberately. `check-doc-links.ts` treats an ignored path that is
   *absent* as a dead link, because that is the case which catches a
   generator that stopped producing one. Its own comment records the
   CI failure that motivated it.
3. **Why was it absent?**
   Nothing had generated it in that tree. Merging `main` into a branch
   that predated ADR-0014 deletes the last committed copies of every
   generated file, mid-session, after SessionStart's background
   generation has already run.
4. **Why did the hook not simply generate it?**
   `blueprint-heatmap.ts`, its only producer, was removed from
   pre-commit on the grounds that it "never refused anything but its
   own staleness" and reads every source file to do it. True of the
   *check*. But the link check downstream still reads its output.
5. **Why does CI not hit this?**
   `ci.yml` has a "Generate the files no commit carries" step in front
   of `check-doc-links.ts`. The hook had nothing.

**Root cause:** thought *"a generator whose check refuses nothing can
be dropped from the commit path"*, actually *its output had a second
reader on that same path, so dropping the generator left a check that
reads a file nothing on that path builds.*

## Detection failure causes

- **Typing / linter:** not applicable — a shell hook's ordering is not
  checked by anything.
- **Functional validation locally:** this is the local layer, and it
  failed in the direction of a false positive rather than a miss.
- **CI:** cannot reproduce it. CI regenerates first, which is precisely
  the asymmetry.
- **Code review:** the commit that removed the generator was reviewed
  on the question it asked — does this check refuse anything? — and
  that question had the right answer.
- **`check-coupled-lists.sh`:** models lists that must agree, not a
  producer/consumer ordering inside one hook.

## Countermeasure

- **Code:** commit `e8746f9` — `scripts/reports.sh --missing-only`, and
  a call to it in pre-commit immediately before the link check.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — the check can no longer run over a tree
where its inputs are absent)

**Reference:** commit `e8746f9`

**The actual fix:**

```diff
+ echo "[pre-commit] regenerating any report the link check would read and not find"
+ scripts/reports.sh all --missing-only
+
  echo "[pre-commit] checking every document link names a file that exists"
  pnpm exec tsx scripts/docs/check-doc-links.ts
```

`--missing-only` pairs each generator with the file it writes and runs
it only when that file is absent. Measured on this checkout: **15 ms**
with everything present, **1.4 s** rebuilding exactly the one missing
output. The hot path is every commit but the first after a clone, a
worktree, or a merge that deletes the last committed copies — so the
reason the heatmap was removed from pre-commit still holds, and the
check now has what it reads.

This also restores CLAUDE.md's own rule to the one place that broke
it: *"Anything that reads one regenerates it first."*

**Sibling defects swept:** the same hazard applies to
`docs/architecture/README.md`, which links five ignored pages that
`check-doc-links.ts`'s comment records as a past CI failure.
`--missing-only` covers the map generator too.

## See also

- [`a-generated-file-cannot-contain-its-own-commit.md`](./a-generated-file-cannot-contain-its-own-commit.md)
- [ADR-0014](../adr/0014-generated-files-are-not-committed.md) — the
  decision that made every one of these outputs absent by default.
