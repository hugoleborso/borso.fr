---
date: 2026-05-05
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#8'
fix-commits: [683375572c, f97e162c9b, 8946e708ea]
eradication-level: 5
eradication-paths: [docs/knowledge/lichess-openings-dataset-identity-and-matching.md, apps/borsouvertures/site/src/openings/openingIds.utils.ts, apps/borsouvertures/site/src/openings/openingIds.utils.test.ts]
time-to-detect: hours
tags: [react, identifiers, domain-model, borsouvertures]
zone: apps/borsouvertures/site/src/openings/openingIds.utils.ts
---

# Assumed variation IDs were globally unique, and they aren't

## User impact

The visual validator caught it on PR #8, before the merge (run 1508, row 12,
quoted):

> Scope shown was *"Modern Defense / Main Line / Modern Defense"* rather than
> the drilled *"Italian Game / Main Line / Italian Game C50"*.

| | Seen | Expected |
| --- | --- | --- |
| Drill Italian Game's Main Line in Learn, then tap "Switch to Play with this scope" | Play opens on Modern Defense's Main Line | Play opens on Italian Game's Main Line |

Any variation whose name also appears in an earlier opening of the dataset
opened Play on that earlier opening (inferred from the lookup).

## Causal chain

- Play opened on the wrong opening.
  - The handler looked the opening up from the variation's id alone, and `find` returned the first opening holding a variation with that id.

    ```ts
    const openingId = openings.find((opening) =>
      opening.variations.some((v) => v.id === variation.id), // ❌ 'main' is in many openings
    )?.id;
    ```

    - Variation ids were `slugify(variation.name)`, and many openings have a "Main Line", so all of them had the id `main`.
      - The dataset build derived every id from a name, and the Lichess openings data reuses one name across several rows and several openings. The dataset handed the screen a field called `id` that was unique only inside its parent. (Material)

## Root cause of occurrence

*Thought `Variation.id` identified a variation across the whole dataset, actually it was a child key, unique only within its opening.*

Material. The handler's author worked from the dataset's `Variation` type,
whose field is named `id` and carries no back-reference to its opening. The
dataset was built by slugging names, so the collision was in the input before
any screen read it.

[`docs/knowledge/lichess-openings-dataset-identity-and-matching.md`](../knowledge/lichess-openings-dataset-identity-and-matching.md):
"The dataset reuses a single name across several rows … A slug derived from
the name alone is therefore not an identifier: it collides, and the collisions
are silent."

## Detection failure causes

- **Typing:** every variation is a `Variation`. Nothing tells an Italian Game variation from a Modern Defense one, and the handler's signature accepted a variation alone.
- **Unit tests:** the `bookEngine.utils.test.ts` fixtures held openings whose variation ids happened to differ, so no test met two openings sharing a slug.
- **Local:** a manual check within one opening never meets the collision.
- **Visual validation:** caught it.

## Countermeasure

Commit `6833755` made `handleSwitchToPlayWithVariation` take both the opening
and the variation, and write both ids without a lookup. `ModeLearnTree`
already had the opening in scope. Commit `f97e162` added a fixture with two
openings sharing a variation slug.

The opening trainer pull request (#321, 2026-11-13) later removed the Learn and
Play screens and `bookEngine.utils.ts` with them.

## Eradication

**Type:** knowledge (level 5) for the class. Line ids are unique by construction, but variation ids still collide, and only a triggered knowledge entry warns about them.

**Reference:** commit `8946e708e` (2026-08-12), "derive a line id from the
moves, not the name alone". `buildLineId` in `openingIds.utils.ts` suffixes the
name slug with a fingerprint of the moves, and `build-openings.ts` builds every
line id through it. A move sequence is unique in the dataset, so two lines
cannot share an id. The test "separates two identically named lines by their
moves" holds it.

```ts
export function buildLineId(name: string, movesUci: readonly string[]): string {
  return `${toSlug(name)}-${fingerprint(movesUci.join(MOVE_SEPARATOR))}`;
}
```

Variation ids are still name slugs. Counting them in
`apps/borsouvertures/site/src/openings/openings.json` on 2026-11-27 (measured)
gives 587 variations and 40 repeated ids, `main-line` 20 times. The 2313 line
ids and 20 opening ids have no repeat. No code keys a scope by variation id
today: `grep -rn "variation.id\|variationId" apps/borsouvertures/site/src`
finds only the parser.

[`lichess-openings-dataset-identity-and-matching.md`](../knowledge/lichess-openings-dataset-identity-and-matching.md)
is printed when `apps/borsouvertures/scripts/**` or `openingIds.utils.ts` is
touched, and says a name is not an identifier.

**Proposed:** delete the field. `Variation.id` has no reader beyond
`parseOpenings.utils.ts:20`, which parses it, and `explorer.core.ts` uses only
`variation.name`. Removing `id` from `Variation` in `types.ts`, from the parser
and from `build-openings.ts` leaves no non-unique id for code to key by. A
future screen that needs one would have to add an id, and could build it like
a line id. An assertion that every id in `openings.json` is unique would then
guard the ids that remain.

**Proof it can fail:** the identically named lines test fails when
`buildLineId` returns the slug alone (inferred from the test, not rerun this
session).

**Similar instances:** the counts above. Line and opening ids are unique.
Variation ids are not, and nothing reads them as a key today.
