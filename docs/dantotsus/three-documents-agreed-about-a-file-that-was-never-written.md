---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: low
related-pr: '#105'
fix-pr: '#106'
fix-commits: [24eaf9b2]
eradication-level: 2
time-to-detect: days
tags: [meta, claude-md, skills, agents, gates, documentation]
---

# Three documents agreed about a file that was never written

## Symptom

`CLAUDE.md`, the [`/feature-pipeline` contract](../../.claude/commands/feature-pipeline.md)
and the [orchestrator standard](../../.claude/skills/tech-lead-orchestrator/standard.md)
each stated, in the present tense, that the feature pipeline's Dynamic Workflow
lives at `.claude/workflows/feature-pipeline.js`.

`.claude/workflows/` did not exist. Neither did the file.

The operator runbook's own step 6 says *"Commit the resulting
`.claude/workflows/feature-pipeline.js`"* — an instruction for after the first
successful run, which nobody had ever carried out. So every `/feature-pipeline`
regenerated the script from the contract while three documents described a
committed one, and the runbook's step 9 for retiring it says to *delete* a file
that has never been there.

Two smaller ones alongside, from the same sweep's log:

- `CLAUDE.md` named the doc-link checker as `check-doc-links.ts`. It is at
  `scripts/docs/check-doc-links.ts`, so the obvious invocation from the
  repository root fails with `ERR_MODULE_NOT_FOUND` naming a path that never
  existed — which reads as a broken checkout rather than a wrong instruction.
- The `/feature-pipeline` contract tells stage 1 to read the spec's
  *Architectural choices* table, twice, and the specification template had no
  such section. Every spec this repository produces from the template is
  missing the thing the pipeline is told to read, so a run cannot tell *"there
  are no architectural decisions"* from *"nobody was asked"*.

None of the three broke anything. That is the point: the pipeline works, the
checker works, and specs get written. What broke was an agent's ability to act
on what it was told.

## Root-cause chain

1. **Why did three documents agree about a file that did not exist?**
   They were written from the same intention at the same time — the workflow
   *will* be saved here — and nothing distinguishes a plan stated in the
   present tense from a fact.

2. **Why was the file never committed?**
   Saving it is a manual step at the end of a successful run, and a run that
   ends successfully is a run that is over. The step has no gate and no
   reminder, and every subsequent launch worked without it.

3. **Why did the disagreement never surface?**
   `check-doc-links.ts` verifies markdown *links*. All three mentions are
   backticked prose, not links, and `.js` is not a document. Nothing in this
   repository read a path written as prose.

4. **Why does a wrong path in prose matter here more than elsewhere?**
   Because these documents are read by a model that will open what it is told
   to open. A wrong path is not a stale sentence; it is a tool call that
   fails, and then a judgement call about whether the repository is broken.

5. **Why did the pipeline's missing template section survive?**
   The same shape: the contract names a section, the template is a different
   file, and a section that is absent produces no error anywhere. The one spec
   that has an *Architectural choices* table got it by hand.

**Root cause:** the author thought *a path in prose is documentation*, actually
*a path in prose is an instruction to an agent*, and the only difference
between the two is whether anything ever resolves it.

## Detection failure causes

- **Typing / linter:** markdown prose.
- **The link checker:** reads links, in markdown. These are backticked strings,
  and one of them points at a `.js`.
- **The enforcement ledger:** resolves the mechanisms `docs/standards/` claims.
  `CLAUDE.md` is not a standard and `.claude/` is not in its scope.
- **Functional validation:** `/feature-pipeline` works without the saved file.
  A correct outcome hides an incorrect description of how it was reached.
- **Code review:** three documents saying the same thing reinforce each other.
  Agreement between sources is normally evidence, and here all three came from
  one intention.
- **The agents:** an agent that cannot find the file works around it, silently,
  because working around a broken instruction is finishing the task. This was
  reported only because CLAUDE.md asks subagents to log friction by name.

## Countermeasure

- **All three statements corrected** to what is true: the script is generated
  per run from the contract, which is the durable artefact, and no script is
  committed.
- **`.claude/workflows/` created**, holding a README that says what a saved
  workflow is, that none is saved yet, how to save one, and that the three
  documents above must be updated in the same commit if one ever is. The
  folder exists so that the sentences pointing at it are true.
- **`CLAUDE.md` names the link checker by its path.**
- **The specification template gains `## Architectural choices`**, the section
  the pipeline reads, with the instruction to keep the heading and write one
  line when there is no such decision — so a run can tell *none* from *not
  asked*.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** PR #106 · commit `24eaf9b2` · `scripts/check-named-paths-exist.sh`

Every backticked repository path in `CLAUDE.md` or under `.claude/` has to
resolve:

```diff
+paths="$(
+  git ls-files 'CLAUDE.md' '.claude/*' |
+    grep -E '\.md$' |
+    xargs grep -onE '`(\.claude|scripts|apps|infra|docs|eslint-rules)/[A-Za-z0-9/._*<>-]+`' |
+    sort -u
+)"
…
+  [ -e "$named" ] || report "${location}: names ${named}, which is not there"
```

Measured on the tree it was written against: 95 distinct paths named, 94
resolving, and the one that did not was named in three places at once — which
is how the gate reported it, three lines, one subject. A path carrying a glob
or a `<placeholder>` is skipped, because a made-up path is the point there.

**It is the same gate as the document-citation check**, not a new one. Both
answer *does a path this repository names exist*, and the two surfaces are two
entries in one script. That is deliberate and it is this sweep's other lesson:
the repository had already shipped the migration-number check twice, a day
apart, because two authors each wrote a gate for the folder in front of them.
See [`the-loop-shipped-the-same-gate-twice.md`](./the-loop-shipped-the-same-gate-twice.md).
Adding a third surface is one block, not a third script.

**What it does not reach:** a bare filename, which is what `check-doc-links.ts`
was. It carries no directory, so there is nothing to resolve and no way to tell
it from ordinary prose. Fixed by hand here; a gate for it would have to guess
which backticked words are meant to be files.

**Sibling defects swept:** the two above, plus the `.claude/workflows/README.md`
that makes the folder real.

## See also

- [`the-skill-that-named-the-linter-the-repository-deleted.md`](./the-skill-that-named-the-linter-the-repository-deleted.md) — the same surface, naming a command rather than a path.
- [`the-link-checker-skipped-the-folder-it-was-trusted-for.md`](./the-link-checker-skipped-the-folder-it-was-trusted-for.md) — the gate this one extends, and why it could not see these.
- [`the-sweep-that-overwrote-the-log-it-exists-to-read.md`](./the-sweep-that-overwrote-the-log-it-exists-to-read.md) — why the friction log that reported these had to survive three agents first.
