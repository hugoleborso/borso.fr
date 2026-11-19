---
date: 2026-11-19
introduced-at: conception
detected-at: review
severity: low
related-pr: '#377'
fix-commits: [self]
eradication-level: 2
eradication-paths: [apps/pragma/scripts/mockup-kit/mockup-kit.setup.ts, .claude/hooks/pretool-mockup-reads-visual-rules.sh]
time-to-detect: hours
tags: [pragma, hooks, design, conception]
zone: .claude/hooks/pretool-mockup-reads-visual-rules.sh
recurs: none (no earlier dantotsu covers a mockup drawn without the app's own marks)
---

# The mockup that read the rule and wrote the word

## User impact

The operator opened the Scene Mode transition mockups of PR #377 and had to
correct how a lineup was drawn before he could judge the design.

| | Seen | Expected |
| --- | --- | --- |
| 08:42 UTC, `Main.dc.html`, option A | chips reading "Gui garde la batterie" and "Arn garde la basse", each with a member-colour dot | Gui's mark followed by the drum glyph, Arn's mark followed by the bass glyph |
| 13:50 UTC, operator | "et tu le fais toujours trop, gui garde la batterie c'est juste l'icone gui et l'icone batterie" | no correction needed |

"Toujours trop" says it repeats. PR #351's mockups gave instruments their own
colour, and PR #354's ignored the existing song page (measured from their
inventories).

## Causal chain

- The mockup named a member and an instrument in a French sentence
  - The session wrote the chip text from the lineup `get_song` returned at
    08:41:05, `{"Gui":"Batterie","Arn":"Basse"}`, which holds words
    - The canvas had no glyph to draw, only text and CSS, so a word was the
      shortest way to show an instrument
      - Nothing handed the session the app's glyphs, which live as SVG paths in
        `apps/pragma/site/src/components/atoms/InstrumentGlyphs.tsx`

## Root cause of occurrence

*Thought reading the rule before drawing would keep the mockup faithful,
actually the rule was read and the drawing still used the data's words.*

The mockup-visual-rules hook fired on the design quickstart at 08:41:32. At
08:41:38 the session ran the hook's grep, which printed pragma's line "An
instrument is shown by its glyph" (measured from the transcript, read by a
subagent). The Write that created the chips came 38 seconds later. The rule
said what to draw and gave no means to draw it.

## Detection failure causes

- **Hook:** it points to text. Text competes with the data in hand, and the
  data was words.
- **Self-review:** the mockups were never compared with a real screen. The app
  draws every lineup with `MemberMark` and `MemberPartGlyphs`.

## Countermeasure

`pnpm --filter @borso-app/pragma run mockup-kit` renders the app's own `Icon`
for every instrument icon id with `renderToStaticMarkup` and prints the SVG, plus
a member mark followed by two glyphs. The hook names that command for pragma at
the design quickstart, so the real glyph is one paste away. The rule also went
into the Lineup section of `domain/INVARIANTS.md`, worded so the hook's grep
prints it. The shipping session named `api/src/members/INVARIANTS.md`, but a
markdown line under `api/` makes the pull request gate ask for a technical
review.

A second paragraph of rule text was the candidate the shipping session named.
It rests on the premise this entry disproves, so it ships only beside the kit.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
+pragma: draw members and instruments with the app's own marks, never as words.
+`pnpm --filter @borso-app/pragma run mockup-kit` prints each instrument glyph
+as SVG and a member-mark example to paste.
```

**Proof it can fail:** the kit renders the glyph map itself, so a glyph added to
`InstrumentGlyphs.tsx` and `INSTRUMENT_ICON_GLYPH` appears with no edit here,
and a key removed from one but not the other fails the root typecheck on
`INSTRUMENT_ICON_GLYPH[icon]`. Measured on 2026-11-19, the kit printed 19 SVGs,
one per entry of `INSTRUMENT_ICON_GLYPH`.

**Similar instances:** `grep -rn 'quickstart' .claude/hooks/` finds this hook
only. The other apps have no lineup, so no other kit is needed today.
