---
date: 2026-11-09
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#281'
fix-commits: [self]
eradication-level: 5
eradication-paths: [scripts/kaizen.sh, .claude/skills/after-task-kaizen/SKILL.md]
time-to-detect: minutes
tags: [kaizen, self-improvement-loop, meta, harness, gates]
zone: scripts/kaizen.sh
weak-point: prose-stands-in-for-a-check
recurs: [the-friction-log-that-arrived-twice]
---

# The sweep handed a log it had already read

## User impact

This sweep's own input was wrong in both directions at once, and a sweep's
input is the whole of its output.

| | Said | True |
| --- | --- | --- |
| The task prompt | `docs/features/meta/quality-dashboard/kaizen.md`, 19 entries | 3 of those 19 belong to PR #281. The other 16 were archived by PR #263 and swept by it: every one is a row of [docs/features/meta/lessons-from-pr-263/inventory.md](../features/meta/lessons-from-pr-263/inventory.md) |
| The task prompt | one archive | two. PR #281 also added `docs/features/meta/quality-dashboard-range-switch/kaizen.md`, with 3 more lines, which the prompt never named |

So the sweep opened with sixteen lines about pragma's `kind` column, four
worktree agents and a formatter the repository no longer uses, all eradicated a
week earlier, and without three lines about the board that are the reason two
of this pull request's entries exist.

## Causal chain

- The sweep read the wrong set of lines.
  - It read the file a hand-written prompt named.
    - The prompt's author was the session that shipped the work, naming the
      archive it had just run.
      - `scripts/kaizen.sh archive` appended into the destination, because
        PR #281 archived into `meta/quality-dashboard`, a slug PR #263 had
        already committed a log at.
      - The same session archived twice, into two slugs, so there were two
        files to remember and the prompt named one.
        - **Method:** the hand-off step asked a person to type the sweep's
          input. CLAUDE.md said the hand-off prompt "names the merged PR, the
          archived `kaizen.md`", and `/after-task-kaizen` said to read the
          archive "at the path the task prompt names".

## Root cause of occurrence

*Thought the sweep's input is the archive file, actually it is the entry lines
one merge added to any archive, and only git knows which those are.*
**Method:** the process handed the sweep a typed path instead of computing its
input from the merge.

The append is correct and deliberate. It is what stops a second archive in one
task destroying the first. It has no notion of which pull request a line
arrived with, so a file is the wrong unit to hand over.

Three defects have now been fixed in this one mechanism, each removing one way
for the log to carry the wrong lines:
[the-friction-log-that-never-left-the-container](./the-friction-log-that-never-left-the-container.md)
made it travel,
[the-sweep-that-overwrote-the-log-it-exists-to-read](./the-sweep-that-overwrote-the-log-it-exists-to-read.md)
made it merge rather than replace, and
[the-friction-log-that-arrived-twice](./the-friction-log-that-arrived-twice.md)
made the archive drain the log so a second pull request's archive holds only its
own lines. All three fixed the source. None touched the destination, which
accumulates across pull requests by design, or the step that tells the sweep
which file to open, which is a sentence a person types.

## Detection failure causes

- **The archive command:** it reports what it added and the running total, as
  `merged 3 new entry/entries into docs/features/meta/quality-dashboard/kaizen.md (19 total)`.
  Both numbers are correct and the sweep is handed the 19.
- **The pre-create hook:** it refuses a pull request whose branch commits no
  archive while the log holds entries (then `.claude/hooks/pretool-gh-pr-create.sh`,
  today `scripts/hooks/checks/gh-pr-create.core.ts`). It counts. It cannot ask
  which pull request a committed line belongs to.
- **The skill:** `/after-task-kaizen` said to read the archive "at the path the
  task prompt names". A path in prose is not a computed input.
- **The sweep itself:** sixteen already-eradicated lines read exactly like
  sixteen unswept ones. They are found only by cross-checking each against the
  corpus, which the skill does ask for and which is where this was caught.

## Countermeasure

The sixteen rows are recorded in this pull request's inventory as
`no-op: swept by PR #263`, each naming the row of PR #263's inventory that
holds it, so the next reader of that archive can tell the two pull requests
apart.

## Eradication

**Type:** knowledge (level 5). The command below computes the right input.
What makes a sweep use it is a written step of `/after-task-kaizen`, so the
level is the instruction's.

**Reference:** this commit, on the kaizen branch for PR #281.

`scripts/kaizen.sh sweep-input <merge-ref>` computes the input from the merge
instead of being told it. It lists every archive the merge touched, the entry
lines that merge added to each, and names any remaining lines as an earlier
pull request's.

```diff
+  sweep-input)
+    archives="$(git -C "$REPO_ROOT" diff --name-only "$merge^" "$merge" -- "$FEATURES_DIRECTORY" |
+      grep '/kaizen\.md$' || true)"
+    …
+      added="$(git -C "$REPO_ROOT" diff "$merge^" "$merge" -- "$archive" |
+        sed -n 's/^+\(- \[.*\)/\1/p')"
```

When the command runs, neither failure is expressible. A reused slug cannot hand the sweep an
earlier pull request's lines, because those lines are not in the merge's diff. A
second archive cannot be forgotten, because the command finds every file the
merge touched rather than the one a person remembered. An empty result is itself
a finding. The task logged nothing, or never archived, and the command says so
in those words.

`/after-task-kaizen` now opens step 1 with this command and says that the
prompt's path is "a row to check, not a file to read".

The typed path still exists upstream. CLAUDE.md, *Self-improvement loop*, says
the hand-off prompt "names the merged PR, the archived `kaizen.md`", and
`.claude/skills/open-pr/SKILL.md`, *After the merge*, lists "the archived
friction log, `docs/features/<docs-slug>/<feature>/kaizen.md`" among what the
prompt names.

**Proposed:** remove the archive path from both, so the hand-off prompt names
only the merged pull request and `/after-task-kaizen`. The sweep then has one
input, the merge, and `scripts/kaizen.sh sweep-input` derives the rest. A
wrong or partial path could no longer reach a sweep, because no prompt would
carry one.

**Proof it can fail:** run against the merge that prompted this sweep, it
prints what the prompt did not:

```
docs/features/meta/quality-dashboard-range-switch/kaizen.md — 3 line(s) this merge added, of 3 in the file
…
docs/features/meta/quality-dashboard/kaizen.md — 3 line(s) this merge added, of 19 in the file
…
  the other 16 line(s) came with an earlier pull request that reused this slug; they were swept with it

[kaizen] 6 line(s) to sweep, across 2 archive(s)
```

**Similar instances:** twenty-four archives have been touched by more than one
first-parent commit on `main`, and in two of them a later feature merge added
lines to a file that already held more:

```
docs/features/pragma/ux-redesign/kaizen.md: last merge added 8 of 197   (#216, then #231)
docs/features/meta/quality-dashboard/kaizen.md: last merge added 3 of 19 (#263, then #281)
```

`pragma/ux-redesign` cost nothing, because one sweep covered both pull requests
and read all 197 lines on purpose. The row for them in
[docs/quality/feature-cost.md](../quality/feature-cost.md) is a single
`#216 and #231`. This one cost sixteen rows, because the two pull requests were
swept a week apart. Slug reuse itself is not the defect and does not need
forbidding; being told the file rather than the lines is, and the command now
answers both cases the same way.
