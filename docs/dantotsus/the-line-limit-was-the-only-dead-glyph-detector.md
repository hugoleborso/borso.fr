---
date: 2026-11-03
introduced-at: implementation
detected-at: linter
severity: low
related-pr: '#252'
fix-pr: none (the kaizen pull request of PR #252, number unknown when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/components/atoms/InterfaceGlyphs.tsx, apps/pragma/site/src/components/atoms/Icon.test.tsx, .oxlintrc.json]
time-to-detect: minutes
tags: [pragma, frontend, eslint, gates, pre-commit]
zone: apps/pragma/site/src/components/atoms/Icon.tsx
weak-point: none
recurs: none (first entry on the icon registry)
---

# Adding one icon meant deleting two, because the limit was the only thing watching

## User impact

The session that renamed song notes to Comments needed one new icon. The commit
was refused, and the session had to judge which unrelated icons it could
delete before it could ship.

| | Seen | Expected |
| --- | --- | --- |
| Commit of the comment icon | pre-commit refused, `Icon.tsx` past `max-lines` 300 | one entry added, commit passes |
| `cloud` and `star` glyphs | unused, found only because the limit forced a search | flagged when their last caller went |

After the cleanup, no unused glyph remained (measured this session by
searching every glyph name in the site sources), so the next new icon would
have hit the same wall with nothing left to delete.

## Causal chain

- The commit was refused.
  - `Icon.tsx` held the component and every interface glyph, 311 lines.
    - `max-lines` counts SVG path data the same as logic.
      - `InstrumentGlyphs.tsx` had already moved one family out, but the
        interface glyphs stayed in the component's file.
- Two glyphs were dead.
  - A glyph name is an object key used as a string prop. knip sees the export
    `Icon`, not the keys, so nothing reports an unused glyph.

## Root cause of occurrence

*Thought `max-lines` bounds how much a reader has to hold, actually on a glyph
map it bounds how many icons the app may have.*

The `atom-icon-registry` blueprint keeps "every glyph in one `as const` map",
and the map lived in the same file as the atom.

## Detection failure causes

- **knip:** does not track object keys passed as string literals.
- **Tests:** no test asked whether a glyph had a caller.

## Countermeasure

The interface glyphs move to `InterfaceGlyphs.tsx`, beside
`InstrumentGlyphs.tsx`. `Icon.tsx` spreads both and keeps the atom, 46 lines.
`.oxlintrc.json` turns `max-lines` off for `apps/*/site/src/components/atoms/*Glyphs.tsx`,
which hold path data only.

That override drops the one property the limit had on this file, pressure to
remove dead glyphs. `Icon.test.tsx` restores it exactly. It reads every
non-test source of the site with `import.meta.glob` and fails for a glyph whose
name appears in none of them.

## Eradication

**Type:** structural impossibility (level 1) for the limit, with a test for dead
glyphs

**Reference:** commit [self] on `claude/lessons-from-pr-252`

```diff
-const ICONS = {
-  catalog: <path d="M4 5h16M4 12h16M4 19h10" />,
-  ...
+const ICONS = {
+  ...INTERFACE_GLYPHS,
   ...INSTRUMENT_GLYPHS,
 } as const;
```

**Proof it can fail:** with an unused `star` glyph planted in
`InterfaceGlyphs.tsx`, measured this session.

```text
FAIL  |core| site/src/components/atoms/Icon.test.tsx > the icon registry > has a caller for the star glyph
     Tests  1 failed | 82 passed (83)
```

With 60 padding glyphs planted, `InterfaceGlyphs.tsx` reached 329 lines and
oxlint reported no `max-lines` finding.

**Similar instances:** `apps/talos/site/src/components/atoms/Icon.tsx` follows
the same blueprint. `wc -l` reads it well under the limit today, and the
override's glob already covers a `*Glyphs.tsx` file there when it needs one.
