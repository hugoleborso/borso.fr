---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#84'
fix-commits: [3583040f97, ff9e8e97b3]
eradication-level: 2
eradication-paths: [scripts/blueprints/subjects.core.ts]
time-to-detect: hours
tags: [blueprints, generators, meta]
zone: .claude/skills/blueprint/blueprint-indexing.ts
blueprints: [repository-query]
---

# The marker that moved to the function below it

## User impact

Agents copy the code a `@FollowsBlueprint` marker points at when they write a
new file of that layer, and reviewers trust the marker's claim. After one edit,
`runner.repository.ts` claimed that a delete followed the read pattern, and
every gate stayed green.

| | Seen | Expected |
| --- | --- | --- |
| `apps/last-loop-lepin/api/src/runner/runner.repository.ts` | `// @FollowsBlueprint repository-query` above `deleteAllEditionRunners`, a delete | The marker above `listRunnersForEdition`, the read it described |
| `blueprint-indexing --check` | Passed, 941 followers before and after | A failure naming the moved claim |

`repository-query` says "Each function returns rows, an array of rows, or a
count". A standards reviewer found the move three rounds later.

## Causal chain

- The marker `repository-query` claimed a delete function.
  - A new function sat between the marker and the read it had described:

    ```ts
    // @FollowsBlueprint repository-query   ← belonged to listRunnersForEdition
    export async function deleteAllEditionRunners( // ← inserted here
      executor: DatabaseExecutor,
      editionSlug: string,
    ): Promise<void> {
    ```

    - Commit `4da429e88` ("delete an edition's roster and punches with the
      edition", PR #84, fifth review round) inserted the function at the
      anchor `export async function listRunnersForEdition`. The marker sits
      on the line above that anchor, so the new text landed between the two.
      - A marker is bound to its subject by position alone: it claims
        whatever declaration follows it. The edit that moved the declaration
        did not touch the comment.

## Root cause of occurrence

*Thought inserting a function above another leaves the file's claims where
they were. Actually a `@FollowsBlueprint` marker claims whatever declaration
follows it, so anything inserted under it takes the claim.* (Machine)

The tag is Machine. The marker's format carries the blueprint id and no
subject, so the binding lives only in line order, which every insertion can
change without leaving a trace.

## Detection failure causes

- **Typing:** the marker is a comment.
- **Linter:** `borso/no-comments` permits the annotation and reads nothing of
  what it sits on. A delete is a legitimate subject for some blueprint, so no
  rule on the declaration alone could refuse it.
- **Generators:** `blueprint-indexing --check` checked that every marker named
  an existing blueprint and that the index was current. Both held. A marker
  that changes subject keeps every count stable.
- **Review:** the diff showed a function added under an existing comment,
  which is what adding a function usually looks like.

## Countermeasure

Commit `e41931e` (PR #84) moved the marker back onto `listRunnersForEdition`.

## Eradication

**Type:** DevX check (level 2), with a stated gap.

**Reference:** commits `3583040f97` and `ff9e8e97b3` (PR #85).
`blueprint-indexing.ts` records the symbol each marker resolves to, per file,
in `docs/standards/blueprint-subjects.json`. `listDetachedClaims` in
`scripts/blueprints/subjects.core.ts` reports a recorded symbol that lost its
marker while the file still declares it. A rename or a deletion takes the
symbol with it and passes. The check still runs in `.husky/pre-commit` (line
222) and `ci.yml` (line 191) today.

Only `--accept` writes the baseline, because SessionStart runs the generators
and would otherwise rebaseline a displaced marker before pre-commit compared
it. The first shape of the gate compared the whole baseline by value and
failed an unrelated merge, and PR #85's own CI caught that.

**The gap:** a marker written on the wrong function from the start, or added
since the last `--accept`, is baselined as correct. Only a reader catches it.

**Proposed:** make the marker name its subject,
`// @FollowsBlueprint repository-query listRunnersForEdition`, and have
`blueprint-indexing --check` refuse a marker whose named symbol is not the
declaration under it. A claim could then neither detach nor start on the
wrong function, and `blueprint-subjects.json` with its `--accept` step could
be deleted. The rewrite is mechanical: 2954 markers under `apps/`, none of
which names a subject today (measured, `grep -rn "@FollowsBlueprint" apps`).

**Proof it can fail:** not re-run this session. PR #85's CI run is the
recorded refusal of the first shape.

**Similar instances:** `grep -rn "@Blueprint\b" apps` lists the canonical
examples, marked in JSDoc blocks above a declaration. They are bound by
position the same way (inferred from where they sit, not checked against the
indexer), so the same insertion could move one.
