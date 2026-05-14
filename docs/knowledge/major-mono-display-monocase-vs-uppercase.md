# Major Mono Display ships two glyph families — `text-transform: uppercase` is mandatory for the decorative one

Google Fonts' [Major Mono Display](https://fonts.google.com/specimen/Major+Mono+Display)
is a monocase display font. It looks like an all-caps face at first
glance, but it carries **two visually distinct glyph families** depending
on the source letter case:

- **Lowercase source** (`borso.fr` written as-is) → renders as simple
  monocase block letters. Clean, geometric, looks "default".
- **Uppercase source** (`BORSO.FR`, or `text-transform: uppercase`)
  → renders the *decorative* caps with the geometric outline ornaments
  that distinguish the font. This is the "caps geo" variant the design
  preset names.

If you pull "Major Mono Display" from Google Fonts and write your text
in lowercase HTML, you get the simplified monocase glyphs and the font
looks unremarkable — like a thin monospace. Apply `text-transform:
uppercase` (or write the HTML in uppercase) and the decorative caps
appear. Both are part of the same font file; the choice is at CSS level,
not at font level.

## How it bit borso.fr

PR #14's first cut wrote the title as `<h1 class="title">borso.fr</h1>`
with CSS:

```css
.title {
  font-family: 'Major Mono Display', ui-monospace, monospace;
  letter-spacing: -0.01em;
  /* text-transform: not set → inherits 'none' */
}
```

The text rendered as monocase block letters. Hugo's design chat had
specified the **"Major · caps géo"** preset, defined in
`src/app.jsx` of the design bundle as:

```js
major: {
  display: "'Major Mono Display', ui-monospace, monospace",
  weight: 400, tracking: '0', transform: 'uppercase',
}
```

`transform: 'uppercase'` was the critical bit. Without it, the design's
"Major caps geo" rendering is unreachable.

## The fix

```diff
 .title {
   font-family: 'Major Mono Display', ui-monospace, monospace;
-  letter-spacing: -0.01em;
+  letter-spacing: 0;
+  text-transform: uppercase;
 }
```

Keep the HTML lowercase (`borso.fr`) for a11y / SEO / clipboard;
`text-transform` is presentational and doesn't change the DOM string.
The `letter-spacing: 0` matches the design preset's `tracking: '0'` —
the prototype's `-0.01em` was a property carried over from the
prototype's default block, not from the major preset.

## How to spot the trap next time

Google Fonts pages render the specimen in BOTH cases — scroll to the
"Type tester" and toggle. If a font's lowercase preview differs from
its uppercase preview, it's a monocase / dual-glyph font. The CSS
choice is part of the design intent.

Design-tool exports (Claude Design, Figma, etc.) often capture the
intent as a *preset* (here, an entry in a `FONT_PAIRS` object with a
`transform: 'uppercase'` field). When you port the design, port the
preset's `transform` field too — not just the `font-family`.

## See also

- [`docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md)
  — neighbour: the same design import was wrong about the workspace's
  toolchain. Imported briefs are *snapshots*; everything in them
  (toolchain assumptions, font presets, copy) needs a live read at
  port time.
