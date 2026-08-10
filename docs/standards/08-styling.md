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

- `borso/no-component-css-imports`, a custom ESLint rule, which rejects an
  import of a `.css` file from anywhere other than the application entry point.
- `borso/no-string-concatenated-class-names`, a custom ESLint rule, which
  rejects a template literal in a `className` attribute and points at `clsx`.
- A check in the pre-commit hook, which fails when an application contains more
  than one `.css` file under `site/src/`.
