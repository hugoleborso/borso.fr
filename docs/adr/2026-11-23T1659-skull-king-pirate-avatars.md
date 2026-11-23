# ADR-2026-11-23T1659: Skull King players are DiceBear avataaars pirates with parts the app draws itself

- **Status:** accepted
- **Date:** 2026-11-23
- **Deciders:** hugoleborso
- **Tags:** skull-king, site, dependencies

## Context

Every skull-king screen shows a player as a mark: until now one Lucide icon
on a coloured disc. The table wants each player to build their own pirate and
see that pirate wherever their mark shows. A face built from parts needs a
drawing kit whose parts line up, whose licence allows a public site, and which
draws in the browser with no network call, since the marks repeat on every
screen and eight phones redraw them on each broadcast. No free vector kit
found has pirate parts beyond an eyepatch, so whatever kit is chosen, some
parts have to be drawn by the app. The operator rejected hand-drawn looking
SVG before, so the parts the app draws have to match the kit's proportions and
flat style. A new package is a dependency decision
([13. Dependencies](../standards/13-dependencies.md)).

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A player recognises their own pirate on every screen, at 24 px in the score grid as at 96 px in the sheet | Screenshots of the editor, the bids screen and the scores grid at 375 px |
| Pirate parts available | operator | high | Hats, scars, earring, pipe and parrot are what makes the face a pirate | Count of the requested parts the option offers, the rest drawn by the app |
| Quality of the parts the app draws | operator | high | Hand-drawn looking parts were refused before | Each app-drawn layer checked on five different faces |
| Licence and cost | author | medium | The site is public and personal | Licence text of the package or pack |
| Weight in the site bundle | author | low | The marks render on a phone at the table | Size of the built chunk |

## Decision

**DiceBear avataaars plus the app's own pirate layers.** The face, skin, hair,
beard, expression and eyepatch come from `@dicebear/core` and
`@dicebear/collection` 9, avataaars style, licence "Free for personal and
commercial use". The tricorne, the bandana, two scars, the gold hoop, the gold
tooth, the pipe and the parrot are inline SVG in `PiratePortrait.tsx`, drawn in
the avataaars 280 by 280 frame with its flat fills and its translucent black
shading, and laid over the face. Avataaars has the most complete face set of
the free kits and its flat style is easy to match; the operator chose it.

## Consequences

- `-` The eye scar is "Stitched wound" by Lorc, from game-icons.net, under
  CC BY 3.0. It must stay credited here and in `apps/skull-king/CREDITS.md`.
  The operator rejected two hand-drawn eye scars, so it replaced them.
- `+` Both scars are painted inside the avataaars face, before its eyes layer,
  so the eyes, the eyebrows and the hair are drawn over them.
- `+` Every player gets a recognisable pirate built from eleven parts, stored
  as the app's own words, so a renamed avataaars option is one line in
  `pirate-portrait.core.ts` and no stored row changes.
- `+` The face draws in the browser from a seedless, fixed set of options, so
  one record draws the same face on every phone with no network call.
- `-` The app now owns the art of seven layers. A change to avataaars
  geometry upstream (head position, mouth position) would misplace them, and
  only a screenshot check catches it.
- `-` `@dicebear/collection` pulls every DiceBear style package into the
  lockfile, although the site imports one style and the bundler drops the
  rest (`sideEffects: false`).
- `~` The Lucide icon is no longer drawn for a player. `player.icon` and
  `account.icon` stay written, because DSQL cannot drop a column and the
  account registration still sends one.

## Alternatives considered

### Option A — DiceBear avataaars plus app-drawn pirate parts (chosen)

- **Raised by:** operator
- **Summary:** The avataaars style for the face, with seven pirate layers
  drawn by the app over it.
- **Strengths:**
  - The richest face set among the free kits, with an eyepatch already.
  - A flat style with no outline that app-drawn parts can match.
- **Costs:**
  - Seven layers of SVG the app maintains.
  - Two dependencies.
- **Rationale:** It is the only free option that yields every requested part
  at the quality bar.

### Option B — Keep the Lucide icons

- **Raised by:** operator
- **Summary:** One of twelve icons on the player's colour.
- **Strengths:** No new dependency, nothing to draw.
- **Costs:** Twelve shared icons, nothing to build.
- **Rejection rationale:** Loses on "does it change the app for its users":
  nobody builds a pirate.
- **Operator's answer:** Chose avataaars with the app's own parts over it.

### Option C — Card portraits

- **Raised by:** operator
- **Summary:** Each player picks a portrait from the game's pirate cards.
- **Strengths:** The game's own art.
- **Costs:** A closed set of faces, publisher art.
- **Rejection rationale:** Loses on pirate parts: nothing to customise.
- **Operator's answer:** Chose avataaars with the app's own parts over it.

### Option D — open-peeps or lorelei (CC0)

- **Raised by:** operator
- **Summary:** Another DiceBear style with a CC0 licence.
- **Strengths:** Public domain.
- **Costs:** No pirate parts at all; every pirate part would be drawn by the app
  in a hand-drawn style that is harder to match.
- **Rejection rationale:** Loses on pirate parts and on the quality of the
  parts the app would draw.
- **Operator's answer:** Chose avataaars with the app's own parts over it.

### Option E — A paid pixel-art pirate pack

- **Raised by:** operator
- **Summary:** A bought sprite pack with pirate parts.
- **Strengths:** Pirate parts drawn by one artist.
- **Costs:** A price and a licence per pack, pixel art that blurs at the
  sizes the marks use.
- **Rejection rationale:** Loses on licence and cost, and on the look at 24 px.
- **Operator's answer:** Chose avataaars with the app's own parts over it.

### Option F — Draw everything in the app

- **Raised by:** operator
- **Summary:** Every face part as the app's own SVG.
- **Strengths:** No dependency.
- **Costs:** Dozens of parts to draw and keep aligned.
- **Rejection rationale:** Loses on quality: the hand-drawn look the operator
  refused before.
- **Operator's answer:** Chose avataaars with the app's own parts over it.

## Scores

|   | A avataaars + parts | B Lucide | C Card portraits | D CC0 styles | E Pixel pack | F Draw all |
|---|---|---|---|---|---|---|
| Changes the app for users | ✓ own pirate everywhere | ✗ nothing to build | ✗ pick, not build | ✓ own face | ✓ own pirate | ✓ own pirate |
| Pirate parts | ✓ eyepatch + seven drawn | ✗ none | ✗ fixed | ✗ none | ✓ many | ✓ any |
| Quality of drawn parts | ✓ flat style matched | ✓ nothing drawn | ✓ nothing drawn | ✗ hand-drawn style | ✓ one artist | ✗ refused before |
| Licence and cost | ✓ free, commercial use | ✓ ISC | ✗ publisher art | ✓ CC0 | ✗ paid | ✓ own |
| Bundle weight | ✓ one style shaken in | ✓ none added | ✓ images | ✓ one style | ✗ sprite sheets | ✓ own SVG |

## Implementation pointers

- Spec: `docs/features/skull-king/score-keeper/spec/spec.md#pirate-avatar`
- Plan: none, the change was briefed to an implementation session directly.
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/skull-king/domain/pirate-avatar.core.ts`,
  `apps/skull-king/site/src/lib/pirate-portrait.core.ts`,
  `apps/skull-king/site/src/components/atoms/PiratePortrait.tsx`
- Related ADRs: none
