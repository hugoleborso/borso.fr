---
date: 2026-10-12
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#154'
fix-commits: [21a850ab, 8789eacc4, 458e886c4]
eradication-level: 2
time-to-detect: hours
tags: [pragma, frontend, reuse]
eradication-paths: [scripts/hooks/checks/no-hand-drawn-art.core.ts, scripts/hooks/hook-events.ts]
zone: apps/pragma/site/src/components/atoms
recurs: [built-my-own-before-checking-the-library]
---

# The logos drawn from memory

## User impact

The pragma song sheet showed Deezer and Spotify as two invented glyphs: four
bars, and a stroked circle with three arcs. The operator saw it in review of
PR #154: « Ce sont les faux logos. Tu me fais le plaisir de trouver les vrais
merci. »

| | Seen | Expected |
| --- | --- | --- |
| Song sheet, listening links | Four purple bars for Deezer, a circle with arcs for Spotify | Each brand's official mark, in its colour |

## Causal chain

- The song sheet showed invented Deezer and Spotify marks.
  - The marks came from pragma's `Icon` registry, which held glyphs drawn by
    hand as SVG path data.
    - Commit `6765875f6` ("song search, covers and listening links run on
      Deezer", 2026-09-15) added the Deezer glyph to that registry:

      ```tsx
      deezer: <path d="M4 16v4M9 12v8M14 8v12M19 4v16" />, // drawn, not fetched
      ```

      - The registry was the one home for anything the interface draws, and
        every entry in it was drawn by hand. The writer added a brand mark the
        way the registry's examples added a glyph.

## Root cause of occurrence

*Thought a brand logo is one more interface glyph to draw. Actually it is an
artefact that already exists, has exactly one correct form, and is published
by the brand and collected by simple-icons under CC0.* (Machine)

The tag is Machine because the codebase's only example of "something the
interface draws" was a registry of hand-drawn paths. At `6765875f6^`,
CLAUDE.md held no rule to look for an existing mark first (measured,
`git show 6765875f6^:CLAUDE.md | grep -i reuse` finds only a styling
paragraph).

## Detection failure causes

- **Linter and typing:** a path is a string. Nothing told a drawn glyph from
  an official one.
- **Visual validation:** a small purple glyph passes every layout and
  contrast check.
- **Review:** only the operator, who knows the real marks, could see it.

## Countermeasure

Commit `21a850ab4` (PR #154) added a `BrandLogo` atom carrying the official
marks, filled in each brand's colour, and removed the drawn glyphs from the
`Icon` registry. The marks come from simple-icons (CC0 1.0). simple-icons' CDN
no longer served Deezer's (tried 13.21.0, 12.0.0, 11.15.0, 10.4.0 on
2026-10-10), so the mark comes from `@iconify-json/simple-icons` 1.2.99.

## Eradication

**Type:** DevX check (level 2).

**Reference:** the PreToolUse check `no-hand-drawn-art`, first shipped as
`.claude/hooks/pretool-no-hand-drawn-art.sh` in `8789eacc4` (PR #398), moved
to `scripts/hooks/checks/no-hand-drawn-art.core.ts` and registered in
`scripts/hooks/hook-events.ts` by `458e886c4` (PR #411). It refuses SVG path
data written into `apps/*/site/src` by an agent unless the file carries
`@AssetSource <url> <license>`. That covers the whole class, logos and
illustrations, not a list of brand names.

The level-5 rule PR #154 added to CLAUDE.md ("Reuse before you build", now
"Reuse first" under *Before writing code*) still stands, but it is no longer
the mechanism.

**Proof it can fail:** the faulty line, planted as an `Edit` to
`apps/pragma/site/src/components/atoms/Icon.tsx` and run through the check on
2026-11-27:

```text
{"kind":"refuse","rule":"no-hand-drawn-art","summary":"wrote SVG path data with no named source, an illustration drawn by hand", …}
```

**The gap:** the check reads only what an agent writes. A file that already
holds path data without a source is not flagged until someone edits it.
`BrandLogo.tsx` itself carries no `@AssetSource` today (measured,
`grep -c AssetSource apps/pragma/site/src/components/atoms/BrandLogo.tsx`
prints 0), so the next agent edit that writes path data into it will be
refused.

**Proposed:** add `@AssetSource` with the simple-icons URL and CC0 licence to
`BrandLogo.tsx`, and run the same pattern once over every tracked file under
`apps/*/site/src` in CI. Then no file holds unsourced path data, rather than
only no new edit.

**Similar instances:** `ListenLinksDialog` drew the same two glyphs and moved
to `BrandLogo` in PR #154. The registry's drawn YouTube glyph had no caller and
was removed in the same PR.
