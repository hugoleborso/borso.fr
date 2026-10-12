# ADR-0028: tailwind-merge resolves conflicting classes in composeClassName

- **Status:** accepted
- **Date:** 2026-10-12
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, talos, frontend, styling

## Context

pragma and talos compose Tailwind classes through `composeClassName`, which is `clsx`: it joins strings and does nothing else. When a variant's base class and a caller's class set the same property, which one applies depends on the order Tailwind writes its rules into the stylesheet, not on the order in the string. A caller cannot override a base by passing a class after it.

This happened twice in two pull requests. In PR #151 a `min-w-0` lost to `SearchBar`'s `min-w-[260px]` and pushed the catalogue header past 375 px. In PR #154 a `w-12` lost to `inputVariants()`'s `w-full`, and the key and capo fields stayed full width. Each time the fix was local: change the base, or stop composing the variant. [`conflicting-tailwind-classes-are-not-merged.md`](../knowledge/conflicting-tailwind-classes-are-not-merged.md) records both.

## Decision

**`composeClassName` passes the joined classes through `twMerge` from `tailwind-merge`, so the last class per property wins.** `clsx` keeps doing the conditional joining; `twMerge` drops the earlier of two classes that set the same property. The helper's signature does not change, so no caller changes.

## Consequences

- `+` A caller's class overrides a base class the way the string reads, in every component at once.
- `+` The `!important` prefix and "do not compose the variant" workarounds are no longer needed.
- `-` One more runtime dependency in two applications, versioned through the catalog.
- `-` Every class composition now parses the class list; cost not measured here, and the library caches results.
- `~` `tailwind-merge` 3.x targets Tailwind v4, which both applications use. Theme tokens declared with `@theme` that create new class groups may need `extendTailwindMerge` to be recognised.

## Alternatives considered

### Option A — tailwind-merge in composeClassName (chosen)

- **Summary:** wrap `clsx` with `twMerge`.
- **Strengths:** fixes the class of defect rather than an instance; maintained, widely used, MIT; no caller changes.
- **Costs:** a dependency, and a parse per composition.
- **Rationale:** the defect repeated, and the fix lives in one helper.

### Option B — keep clsx and fix each conflict locally (rejected)

- **Summary:** the status quo; the knowledge entry tells authors what to avoid.
- **Strengths:** no dependency.
- **Costs:** every new variant is a new chance to repeat it, found only by looking at the screen.
- **Rejection rationale:** it already failed twice; a knowledge entry is the floor of the eradication ladder.

### Option C — a lint rule against conflicting classes (rejected)

- **Summary:** flag a composition whose classes set the same property.
- **Strengths:** no runtime cost.
- **Costs:** it would have to know which classes conflict, which is what `tailwind-merge` already encodes; and it cannot see a conflict between a variant's base and a caller's argument in another file.
- **Rejection rationale:** rebuilds the library, partially.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Removes the defect class | high | It happened in two consecutive pull requests |
| Caller changes | medium | Both applications compose classes in many components |
| Dependency cost | low | One small, maintained library through the catalog |

|             | Option A | Option B | Option C |
|---|---|---|---|
| Removes the defect class | ✓ every composition | ✗ per instance | ~ same file only |
| Caller changes | ✓ none | ✓ none | ✗ rule violations to fix |
| Dependency cost | ~ one library | ✓ none | ✓ none |

## Implementation pointers

- Files: `apps/pragma/site/src/components/atoms/class-name.utils.ts`, `apps/talos/site/src/components/atoms/class-name.utils.ts`, `pnpm-workspace.yaml` (catalog)
- Related: [`conflicting-tailwind-classes-are-not-merged.md`](../knowledge/conflicting-tailwind-classes-are-not-merged.md), PR #151, PR #154
