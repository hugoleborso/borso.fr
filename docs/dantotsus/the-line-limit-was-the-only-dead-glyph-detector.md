---
date: 2026-11-03
introduced-at: implementation
detected-at: linter
severity: low
related-pr: '#252'
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
  - `Icon.tsx` held the component and every interface glyph, 311 lines,
    past the `max-lines` limit of 300.
    - `max-lines` counted SVG path data the same as logic.
      - The glyph map lived in the atom's own file. The `atom-icon-registry`
        blueprint, defined in that file, keeps "every glyph in one `as const`
        map of SVG bodies", and `InstrumentGlyphs.tsx` had moved only one
        family out. (Machine)
- Two glyphs, `cloud` and `star`, stayed in the map with no caller.
  - Their last callers had been removed in earlier changes, and the glyphs
    stayed (inferred: no caller existed when the limit forced the search).

## Root cause of occurrence

*Thought `max-lines` bounds how much a reader has to hold, actually on a glyph
map it bounds how many icons the app may have.* (Machine)

A lint limit meant for logic was applied to a file of path data, because the
blueprint put the data in the atom's file. Had the limit's scope known that,
the glyphs would have lived in their own file, outside it.

## Detection failure causes

- **knip:** a glyph name is an object key passed as a string prop. knip sees
  the export `Icon`, not the keys, so it reports no unused glyph.
- **Tests:** no test asked whether a glyph had a caller. The only pressure on
  dead glyphs was the line limit, which this fix lifts.

## Countermeasure

The interface glyphs move to `InterfaceGlyphs.tsx`, beside
`InstrumentGlyphs.tsx`. `Icon.tsx` spreads both and keeps the atom, 46 lines.
`.oxlintrc.json` turns `max-lines` off for
`apps/*/site/src/components/atoms/*Glyphs.tsx`, which hold path data only.

That override drops the one property the limit had on this file, pressure to
remove dead glyphs. `Icon.test.tsx` restores it. It reads every non-test
source of the site with `import.meta.glob` and fails for a glyph whose name
appears in none of them.

## Eradication

**Type:** structural impossibility (level 1) for the limit, with a test for
dead glyphs in pragma

**Reference:** commit [self] in [PR #255](https://github.com/hugoleborso/borso.fr/pull/255)

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
`InterfaceGlyphs.tsx`, measured when the fix shipped.

```text
FAIL  |core| site/src/components/atoms/Icon.test.tsx > the icon registry > has a caller for the star glyph
     Tests  1 failed | 82 passed (83)
```

With 60 padding glyphs planted, `InterfaceGlyphs.tsx` reached 329 lines and
oxlint reported no `max-lines` finding.

**Similar instances:** `grep -rln "FollowsBlueprint atom-icon-registry" apps`
lists three more registries: `apps/talos/site/src/components/atoms/Icon.tsx`
(150 lines), `apps/borsouvertures/site/src/components/atoms/Icon.tsx` (108)
and `apps/skull-king/site/src/components/atoms/Glyph.tsx` (64), by `wc -l`
this session. `grep -ln "import.meta.glob" apps/*/site/src/components/atoms/*.test.tsx`
finds the caller test in pragma only. The override's glob already covers a
`*Glyphs.tsx` file in any app, so the limit cannot block them. A dead glyph in
those three is caught by nothing.

**Proposed:** make the caller check part of the `atom-icon-registry`
blueprint's canonical test, so every registry that follows the blueprint
carries `Icon.test.tsx`'s `import.meta.glob` check, and add it to the three
registries above. A glyph whose last caller goes then fails that app's tests
in every app, not only in pragma.
