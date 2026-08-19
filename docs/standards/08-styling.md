# 08. Styling

## Rule

Component styles are Tailwind utility classes written on the JSX element. Each
application has exactly one CSS file, which declares design tokens in a
Tailwind version 4 `@theme` block, and it holds nothing else.

## Reason

The CSS cascade across many files is hard to review, because specificity fights,
dead rules, and selector drift are all invisible in a diff. A Tailwind class
sits on the element it styles, so a reviewer reads the styling and the structure
together.

Deleting a component also deletes its styles, which does not happen when the
styles live in a separate file that nobody remembers to clean up.

## What is banned

CSS modules are banned. Styled components are banned. An `import './Foo.css'`
line beside a component is banned. A global `.classname { … }` rule is banned.

The one exception is a library that renders its own DOM, where there is no JSX
element to carry a utility. Leaflet is the case: it builds its tiles, its zoom
bar and its attribution itself. Write those rules inside a marked region that
names the library and the reason, the same shape an `eslint-disable-next-line`
takes, so a reviewer reads the claim next to the code:

```css
/* @third-party-dom leaflet: renders its tiles into DOM it owns, so no JSX
   element exists to carry a utility class. */
.course-map .leaflet-tile {
  filter: brightness(0.92);
}
/* @end-third-party-dom */
```

The region exempts class selectors and nothing else. An element rule inside it
still has to be layered, because that rule is about the cascade rather than
about who owns the DOM.
A second CSS file in an application is banned.

## Design tokens

The single CSS file declares the palette, the fonts, and the spacing scale
inside `@theme`, and Tailwind version 4 turns each variable into a utility
automatically, so a token named `--color-surface-raised` becomes
`bg-surface-raised` and `text-surface-raised`.

```css
/* site/src/styles/tokens.css */
@import 'tailwindcss';

@theme {
  --color-surface: oklch(98% 0.005 250);
  --color-surface-raised: oklch(100% 0 0);
  --font-display: 'Instrument Serif', serif;
}
```

When a design bundle exists, copy its named CSS variables into `@theme`
unchanged, so the names in the design and the names in the code stay the same.

## Variants

A component with more than two visual variants uses `cva` from
`class-variance-authority`, so the variants are one typed table.

```ts
const buttonVariants = cva('inline-flex items-center rounded-md font-medium', {
  variants: {
    variant: {
      primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
      ghost: 'bg-transparent hover:bg-surface-raised',
      danger: 'bg-danger text-danger-foreground',
    },
    size: { small: 'h-8 px-3 text-sm', medium: 'h-10 px-4' },
  },
  defaultVariants: { variant: 'primary', size: 'medium' },
});
```

Conditional class composition goes through `clsx`, and building a class name by
string concatenation is banned, because Tailwind cannot see a class it did not
find in the source.

## Class order

Write classes in the order layout, box, typography, colour, state, and
responsive prefix, so that a long class list stays scannable.

```tsx
<button className="flex items-center gap-2 h-10 px-4 text-sm font-medium bg-accent text-white hover:bg-accent/90 lg:h-12">
```

## Mobile comes first

Write the unprefixed classes for the 375 pixel layout, and add `sm:`, `md:`,
and `lg:` for wider screens. See
[05. Front end architecture](./05-frontend-architecture.md).

## Enforced by

- `eslint:borso/no-component-css-imports` rejects an import of a `.css` file
  from anywhere other than the application entry point.
- `eslint:borso/no-string-concatenated-class-names` rejects a template literal
  in a `className` attribute and points at `clsx`.
- `eslint:borso/no-circle-in-non-uniform-svg` rejects a `<circle>` inside an SVG
  that scales unevenly, where it renders as an ellipse.
- `script:scripts/check-single-stylesheet.sh` fails an application that ships
  more than one `.css` file under its site directory. It reads the git index
  rather than walking the filesystem, because `coverage/` and `.stryker-tmp/`
  are gitignored and both contain CSS.
- `script:scripts/check-stylesheet-contents.sh` reads that one file and rejects
  a class selector, an id selector other than `#root`, and an element rule
  written outside `@layer`. The last one matters because unlayered CSS outranks
  every utility Tailwind emits, so a top-level `body { … }` silently beats the
  classes on the element it targets.
- `reviewer` checks that a set of more than two visual variants goes through
  `cva` rather than a conditional expression.
