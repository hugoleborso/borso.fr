# ADR-0021: Instruments carry their own icon, order and primacy

- **Status:** accepted
- **Date:** 2026-09-18
- **Deciders:** Hugo Borsoni
- **Tags:** setlist-density, pragma, database, frontend

## Context

The setlist card is going to show, for each song, one fixed slot per instrument with the colour of the member holding it. The whole value of that display is positional: a column always means the same instrument, so a change between two songs reads as a change in that column without reading any text. The operator's words were that the order must never be alphabetical, because alphabetical order hides movement.

That display needs three facts the database does not hold. Which glyph marks an instrument. Where an instrument sits in the fixed order. And which instruments deserve a slot at all, since a band with twelve declared instruments cannot show twelve columns on a phone 360 px wide.

The `instrument` table today has `name`, free text the band types, and `family`, one of `harmonic`, `percussive`, `vocal`, `other`. The `member_instrument` link records who plays what and nothing else. CLAUDE.md makes a schema column a decision a feature may not take on its own, which is why this is written down before any migration runs.

## Decision

**Add `icon` and `position` to `instrument`, and `is_primary` to `member_instrument`.** The column set the setlist renders is the union of the primary instruments across the band, ordered by `position`, capped at the number of members plus two. The instruments page becomes where a band picks an icon, drags the order and marks an instrument primary.

The icons themselves are **copied into the existing icon registry, not added as a dependency**. Lucide is ISC licensed and its path data drops into `Icon.tsx` unchanged, because the atom already sets the same `viewBox`, `fill` and stroke settings. The `atom-icon-registry` blueprint says every glyph lives in one `as const` map, and adding `lucide-react` would stand a second icon system beside it.

## Consequences

- `+` The order is the band's data, so it survives a rename, a typo and a new instrument, which a name-matching table in the front end does not.
- `+` The icon is chosen once by a person who knows the instrument, rather than guessed by a string match at render time.
- `+` `is_primary` answers the column-budget question with data instead of a heuristic, and a band that plays a triangle on one song does not lose a column to it.
- `-` Three columns and a migration, on a table that had no reason to change. Every future instrument write has to carry them.
- `-` The instruments page gains three controls, so a screen that was a list becomes a small editor. That is real work and real surface to keep correct.
- `-` A band that never opens the instruments page gets every instrument at `position` 0 and the fallback glyph, so the column reads worse than the avatars it replaced until someone configures it. The seeded defaults reduce this but do not remove it.
- `~` Copying Lucide paths means the repository carries artwork it did not draw, under a licence that permits it. The attribution lives in `docs/knowledge/instrument-icon-provenance.md`, because the no-comments rule keeps it out of the source file.
- `~` The icon set is closed: a band cannot upload its own glyph, only pick from what ships. That keeps the render trivial and the bundle fixed, and it means a band with a bouzouki gets the generic glyph.

## Alternatives considered

### Option A — `icon` and `position` on the instrument, `is_primary` on the link (chosen)

- **Summary:** Three columns, one migration, edited on the instruments page.
- **Strengths:**
  - Survives renames and typos, because the order is keyed on the row and not on its name.
  - The band owns both the order and the glyph, which is the only way a column can mean what they expect.
  - `is_primary` gives the column budget a real answer for a band of any size.
- **Costs:**
  - A migration and three controls to build.
  - A band that never configures anything sees a worse column than before.
- **Rationale:** It is the only option where the positional reading — the entire point of the feature — cannot be broken by a text edit somewhere else.

### Option B — a name-to-icon-and-order table in the front end (rejected)

- **Summary:** Map `Chant`, `Guitare`, `Clavier`, `Basse`, `Batterie` to a glyph and a rank in a `.core.ts`, with a fallback for anything unknown.
- **Strengths:**
  - No migration, no new screen, shippable in an afternoon.
  - Fully covered by unit tests, like every pure module here.
- **Costs:**
  - Breaks silently on `Guitare élec`, `Gratte` or a trailing space: the instrument falls out of its column and lands in the fallback, with nothing reporting it.
  - The band cannot fix it themselves; it takes a code change and a deploy.
  - Bakes French instrument names into source, against the English-in-code rule, or forces a translation table that has the same fragility.
- **Rejection rationale:** It turns a typo into a display bug nobody can diagnose from the screen, and the display it breaks is the one the feature exists for.

### Option C — order by the existing `family` column (rejected)

- **Summary:** Sort `vocal`, `harmonic`, `percussive`, `other`, then by name within a family. No migration at all.
- **Strengths:**
  - Zero cost. The column already exists and is already a closed union.
  - No new screen, nothing for the band to configure.
- **Costs:**
  - `harmonic` holds guitar, piano and bass together, so their relative order falls back to the name — alphabetical, which is exactly what the operator rejected.
  - Four families cannot express the five-slot order the feature needs.
- **Rejection rationale:** It fails the requirement outright rather than trading against it. The one ordering it can produce is the one that was refused.

### Option D — show the instruments used in the current setlist, unordered by anything stored (rejected)

- **Summary:** Take the union of instruments across the setlist's entries and render them in a stable but arbitrary order, so the columns are consistent within one setlist.
- **Strengths:**
  - No migration and no configuration, and the column narrows itself for a small band.
  - Positional reading holds within a setlist, which is the scope where songs are compared.
- **Costs:**
  - Two setlists show different columns, so the reading a person learns does not transfer.
  - Adding one song can reorder every column in the list, which is a silent layout change mid-rehearsal.
- **Rejection rationale:** The instability is worst exactly when the screen is being used, and a column whose meaning moves is worse than no column.
