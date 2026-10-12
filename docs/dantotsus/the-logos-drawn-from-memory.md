---
date: 2026-10-12
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#154'
fix-pr: '#154'
fix-commits: [21a850ab]
eradication-level: 5
time-to-detect: hours
tags: [pragma, frontend, reuse]
eradication-paths: [CLAUDE.md]
zone: apps/pragma/site/src/components/atoms
recurs: [built-my-own-before-checking-the-library]
---

# The logos drawn from memory

## Symptom

The song sheet showed Deezer and Spotify as two glyphs from pragma's icon
registry: four bars, and a stroked circle with three arcs. The operator:
« Ce sont les faux logos. Tu me fais le plaisir de trouver les vrais merci. »

## Root-cause chain

1. **Why fake logos?** The two glyphs were drawn by hand into the `Icon`
   registry, the same way every interface glyph there is drawn.
2. **Why drawn?** The registry is the one home for anything the interface
   draws, so a brand mark looked like one more glyph to add.
3. **Why did nobody look for the real mark?** Nothing asked the question.
   Every brand publishes its mark, and simple-icons collects them under CC0,
   but the habit was to make, not to fetch.

**Root cause:** we thought a brand logo was an icon to draw, and actually it
is an artefact that already exists and has exactly one correct form.

## Detection failure causes

- **Linter / typing:** a path is a path; nothing can tell a drawn glyph from
  an official one.
- **Visual validation:** a small purple glyph passes every layout check.
- **Review:** caught by the operator, who knows the real logos.

## Countermeasure

- **Code:** commit `a166a4f` (PR #154) — a `BrandLogo` atom carries the
  official marks, filled in each brand's colour, and the drawn glyphs left the
  `Icon` registry. The marks come from simple-icons (CC0 1.0). simple-icons'
  own CDN no longer serves Deezer's (tried 13.21.0, 12.0.0, 11.15.0, 10.4.0 on
  2026-10-10); `@iconify-json/simple-icons` 1.2.99 still carries the 2023
  heart.

## Eradication (mandatory — code-level)

**Type:** knowledge addition (level 5 — a CLAUDE.md rule)

**Reference:** [PR #154](https://github.com/hugoleborso/borso.fr/pull/154) · commit `d6bb88f`

**The actual fix:** CLAUDE.md gained « Reuse before you build » in *Tone &
rigor*, at the operator's request: before writing a logo, an icon, a
component, an algorithm, an API or a database, look in the repository, then in
what is installed, then in a maintained source, and build only when nothing
fits.

No higher level was found. A list of brand names that may not appear in the
`Icon` registry would only cover the brands someone thought to list, which is
the shape of check the operator rejected the same day in
[the-interface-that-explained-itself](./the-interface-that-explained-itself.md).

**Sibling defects swept:** `ListenLinksDialog` drew the same two glyphs and
now uses `BrandLogo` too. The registry's drawn YouTube glyph had no caller and
was removed in the kaizen PR.

## See also

- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md)
