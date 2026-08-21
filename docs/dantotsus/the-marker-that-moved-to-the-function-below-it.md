---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: low
related-pr: 84
fix-pr: 85
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [blueprints, generators, meta]
blueprints: [repository-query]
---

# The marker that moved to the function below it

## Symptom

Nothing failed. `blueprint-indexing --check` passed, every gate was green, and
`runner.repository.ts` claimed a pattern it did not follow:

```ts
// @FollowsBlueprint repository-query
export async function deleteAllEditionRunners(
  executor: DatabaseExecutor,
  editionSlug: string,
): Promise<void> {
```

`repository-query` describes a read — *"Each function returns rows, an array of
rows, or a count"*. The marker had belonged to `listRunnersForEdition` since
`main`, and a standards reviewer found it three rounds later.

## Root-cause chain

1. **Why did the marker describe a delete?** A new function was inserted
   between the marker and the function it described.
2. **Why did the insertion move it?** The edit's anchor was
   `export async function listRunnersForEdition`, and the marker sits on the
   line above that. Text inserted at the anchor lands between the two.
3. **Why did no gate notice?** A `@FollowsBlueprint` marker is bound to its
   subject by position and nothing else. Any exported declaration under it is a
   syntactically valid subject, so after the insertion the file was still
   well-formed: one marker, one blueprint that exists, one declaration beneath
   it. The indexer counted 941 followers before and 941 after.
4. **Why can the indexer not tell?** It resolves each marker to whatever
   declaration follows and records the blueprint id. It never records *which*
   declaration, so there is no earlier value for a later run to disagree with.

**Root cause:** *thought "a `@FollowsBlueprint` marker is checked", actually
"only the id is checked — the claim's subject is positional, and moving it
produces a file that is still valid in every way a generator can see".*

## Detection failure causes

- **Typing:** invisible. The marker is a comment.
- **Linter:** `borso/no-comments` permits the annotation and says nothing about
  what it sits on. No rule could: the delete is a legitimate subject for
  *some* blueprint, just not this one.
- **Generators:** `blueprint-indexing --check` validates that every marker
  names a blueprint that exists and that the index is current. Both held. The
  counts are stable under a move, which is what makes this class invisible to
  it — a marker that changes subject is not a marker that disappears.
- **Code review:** the diff showed a function added directly under an existing
  comment. That reads as normal, because it is what adding a function usually
  looks like.
- **The reviewer:** caught it, and noted that no generator could. That is what
  the seal exists to record.

## Countermeasure

The marker moved back onto `listRunnersForEdition` in commit
[`e41931e`](https://github.com/hugoleborso/borso.fr/commit/e41931e), on PR #84.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a baseline the check compares against)

**Reference:** [PR #85](https://github.com/hugoleborso/borso.fr/pull/85)

**The actual fix:** `blueprint-indexing.ts` now records the symbol each marker
resolves to, and `--check` fails when a marker's subject changes without the
baseline being accepted in the same commit. This is the mechanism
`convention-drift.ts` already uses for the layer-marker budget, so the shape is
one a reader of this repository has seen.

A move now shows up the way a rename does: as a line in a committed file that
someone has to accept on purpose. It does not stop a marker being moved — it
stops a marker being moved *silently*, which is the whole of this defect.

**What this does not fix:** a marker written on the wrong function from the
start. The baseline records the first resolution it sees, so an initially wrong
claim is baselined as correct. Only a reader catches that, which is why this
sits at level 2 rather than level 1. The level-1 fix is to make the marker name
its subject — `// @FollowsBlueprint repository-query listRunnersForEdition` —
so the claim cannot detach at all. That is a mechanical rewrite of every marker
in the tree and is worth doing on its own, not folded into a sweep.

## See also

- [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md)
  — the same PR, the same shape one level up: there the blueprint's *text* was
  wrong and no gate reads text; here its *subject* was wrong and no gate reads
  subjects.
