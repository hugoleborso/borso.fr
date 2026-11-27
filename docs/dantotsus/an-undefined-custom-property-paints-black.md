---
date: 2026-08-15
introduced-at: implementation
detected-at: operator-deploy
severity: low
related-pr: '#49'
fix-commits: [3f7264b624]
eradication-level: 2
eradication-paths: [scripts/architecture/architecture-page.ts]
time-to-detect: days
tags: [css, custom-properties, architecture-map, generated-files]
zone: scripts/architecture/architecture-page.ts
---

# An undefined custom property paints black, and nothing about black says "undefined"

## User impact

The operator, reading the architecture map in a light theme (quoted from his
report):

> The file number chip is black in white background, select a better color for
> light theme

| | Seen | Expected |
| --- | --- | --- |
| The file count chip on a block of the map, light theme | A black pill on a white panel | A light grey pill, like the other neutral chips |
| The same chip, dark theme | A black pill nearly invisible on the dark background | A dark grey pill that reads as a chip |

It was not a bad colour choice. `--chip` was read and defined nowhere.

## Causal chain

- The file count chip painted black.
  - `fill: var(--chip)` named a property the page did not define, so the declaration was invalid at computed-value time and `fill` took its initial value, black.

    ```css
    .node-chip { fill: var(--chip); stroke: var(--line); stroke-width: 1; } /* ❌ no --chip on :root */
    ```

    - Commit `400986600` (2026-08-15, written by an agent) added `.node-chip` with that line. Commit `f18b79198` (2026-08-14, an agent) had already added `.code-chip { background: var(--chip) }`.
      - `--chip` had been a palette token until commit `ffbb593e4` (2026-08-14, 03:12), which removed it and its five uses to reserve colour for layer meaning. The first new use came ten hours later.
        - The palette is free text on `:root` and each use is free text in another rule of the same string. Nothing related a name in `var()` to a definition, so a name from the old palette read exactly like a live one. (Machine)

## Root cause of occurrence

*Thought `--chip` was still one of the page's palette tokens, actually commit `ffbb593e4` had removed it on 2026-08-14, and an undefined custom property falls back to the property's initial value, not to nothing.*

Machine. The name had been real a day earlier, in the same file. Whether the
agents that wrote the two uses had the current palette in view is unknown,
because their transcripts were not read (inferred). Either way, the codebase
gave a stale name and a live name the same shape, and only a person looking at
a screen could tell them apart.

CSS Custom Properties Level 1 (cited from the original entry, not reread this session): a declaration
whose `var()` names a property with no value and no fallback is *invalid at
computed-value time*, and the property computes to its initial value. The
initial value of `fill` is black.

## Detection failure causes

- **Build:** CSS has no failure mode but a rendered page. No warning, no error, nothing tells "black because you asked" from "black because the declaration was dropped".
- **Linter:** the page's CSS lives in a TypeScript template string, so no CSS linter reads it.
- **Local and review:** black renders and has contrast against a light panel. The page passed a light-theme pass, a dark-theme pass and a review with the defect on every screen, because it never looked like an error.

## Countermeasure

The generator refuses to emit a page that reads a custom property it never
defines. `withDefinedCustomProperties()` in `architecture-page.ts` collects
every `var(--x)` use and every `--x:` definition from the page's own `<style>`
blocks, and throws when a use with no fallback has no definition. `--chip` is
back in the palette, light and dark.

Two scoping choices hold it together:

- `var(--x, fallback)` may name an undefined property, because the fallback is
  the declaration that survives it.
- Only the page's own stylesheets are read. The code viewer embeds application
  source with its own custom properties. The first run reported eleven of
  those, such as `--color-accent`, all false positives.

## Eradication

**Type:** DevX check (level 2). The generator throws before writing, so no
committed map and no published page can carry an undefined property.

**Reference:** commit [`3f7264b`](https://github.com/hugoleborso/borso.fr/commit/3f7264b624a786b6e0eb3e243f552f4f74f5551e).

**Proof it can fail:** deleting the `--chip` definition again stops the build.

```
Error: The page reads --chip with no fallback and never defines it. An undefined
custom property is invalid at computed-value time, so the declaration falls back
to the property's initial value — black, for a fill.
```

**Proposed:** the check covers one generator. Every app hand-writes
`apps/<app>/site/src/styles/tokens.css` and reads `var(--x)` unguarded in its
stylesheets. Lift `withDefinedCustomProperties` into one repository check that
reads every stylesheet of an app, and the page generators under
`scripts/quality/`, and refuses a `var()` without fallback that nothing
defines. A stronger shape emits every `var()` from a typed token object, so a
name that is not a token does not compile. Either would make the stale-name
mistake impossible in every app, not only in the map.

**Similar instances:** `ls apps/*/site/src/styles/tokens.css` lists one
hand-kept palette per app. `grep -ln "var(--" scripts/quality/*.core.ts` finds
`quality-page.core.ts` and `dashboard-page.core.ts`, two more generated pages
without the guard.
