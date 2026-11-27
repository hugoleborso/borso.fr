---
date: 2026-11-19
introduced-at: conception
detected-at: review
severity: low
related-pr: '#377'
fix-commits: [self]
eradication-level: 5
eradication-paths: [apps/pragma/scripts/mockup-kit/mockup-kit.setup.ts, scripts/hooks/checks/mockup-reads-visual-rules.core.ts]
time-to-detect: hours
tags: [pragma, hooks, design, conception]
zone: scripts/hooks/checks/mockup-reads-visual-rules.core.ts
recurs: none (no earlier dantotsu covers a mockup drawn without the app's own marks)
---

# The mockup that read the rule and wrote the word

## User impact

The operator opened the Scene Mode transition mockups of PR #377 and had to
correct how a lineup was drawn before he could judge the design.

| | Seen | Expected |
| --- | --- | --- |
| 08:42 UTC, `Main.dc.html`, option A | chips reading "Gui garde la batterie" and "Arn garde la basse", each with a member-colour dot | Gui's mark followed by the drum glyph, Arn's mark followed by the bass glyph |
| 13:50 UTC, operator | "et tu le fais toujours trop, gui garde la batterie c'est juste l'icone gui et l'icone batterie" (translated: "you always overdo it, Gui keeps the drums is just Gui's icon and the drum icon") | no correction needed |

"Toujours trop" says it repeats. PR #351's mockups gave instruments their own
colour, and PR #354's ignored the existing song page (measured from their
inventories).

## Causal chain

- The mockup named a member and an instrument in a French sentence.
  - The session wrote the chip text from the lineup `get_song` returned at
    08:41:05, `{"Gui":"Batterie","Arn":"Basse"}`, which holds words.
    - The design canvas draws text and CSS. A word was the one way to show an
      instrument with what the session held.
      - The mockup-visual-rules hook fired at 08:41:32 and printed a grep
        command. At 08:41:38 that grep printed pragma's line "An instrument is
        shown by its glyph" (measured from the transcript, read by a subagent).
        It printed no glyph. The glyphs exist only as SVG paths in
        `apps/pragma/site/src/components/atoms/InstrumentGlyphs.tsx`, which the
        session did not open before the Write that created the chips, 38
        seconds later.

## Root cause of occurrence

*Thought the rule "an instrument is shown by its glyph" could be met with what
the session held, actually the glyph's SVG was nowhere in its context, and the
data and the canvas offered only the word.*

**M: Material.** The session had the rule and not the means. The lineup came
from `get_song` as words, and the hook handed it a sentence about glyphs and no
glyph to paste. Per the agentic 4M, the fix brings the missing input to the
moment of drawing.

## Detection failure causes

- **Hook:** it points to text. Text competes with the data in hand, and the
  data was words.
- **Self-review:** the mockups were never compared with a real screen. The app
  draws every lineup with `MemberMark` and `MemberPartGlyphs`.
- **Publish:** the `mockup-copy` check counts the visible words of a published
  artboard and informs above 25. Two short chips stay under it.

## Countermeasure

`pnpm --filter @borso-app/pragma run mockup-kit` renders the app's own `Icon`
for every instrument icon id with `renderToStaticMarkup` and prints the SVG,
plus a member mark followed by two glyphs. The hook names that command for
pragma at the design quickstart, so the real glyph is one paste away. The rule
also went into the Lineup section of `domain/INVARIANTS.md`, worded so the
hook's grep prints it.

## Eradication

**Type:** knowledge (level 5). A hook brings the kit to the moment of drawing.
Nothing refuses a mockup that writes the word.

**Reference:** the commit adding this file. Commit `458e886c4` (PR #411) moved
the shell hook into `scripts/hooks/checks/mockup-reads-visual-rules.core.ts`,
which still ends its note on:

```
pragma: draw members and instruments with the app's own marks, never as words. `pnpm --filter @borso-app/pragma run mockup-kit` prints each instrument glyph as SVG and a member-mark example to paste.
```

**Proof it can fail:** the kit renders the glyph map itself, so a glyph added
to `InstrumentGlyphs.tsx` and `INSTRUMENT_ICON_GLYPH` appears with no edit
here, and a key removed from one but not the other fails the root typecheck on
`INSTRUMENT_ICON_GLYPH[icon]`. Measured on 2026-11-19, the kit printed 19 SVGs,
one per entry of `INSTRUMENT_ICON_GLYPH`.

The kit still needs the session to choose to paste from it. This is not
eradicated.

**Proposed:** extend the publish-time check
`scripts/hooks/checks/mockup-copy.core.ts`, which already reads the artboards of
a published `.dc.html`. For a pragma mockup, have it refuse an artboard whose
visible text contains an instrument name from pragma's `en.json` or `fr.json`.
A lineup drawn as words would then be refused at publish, before the operator
sees it.

**Similar instances:** `grep -rn "quickstart" scripts/hooks/checks/*.core.ts`
finds this check only. The other apps have no lineup, so no other kit is
needed today.
