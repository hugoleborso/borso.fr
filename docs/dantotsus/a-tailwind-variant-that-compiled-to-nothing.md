---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#63'
fix-pr: '#63'
fix-commits: [8fd9ecd]
eradication-level: 2
time-to-detect: 25 minutes
tags: [tailwind, frontend, css, tooling]
---

# A Tailwind variant that compiled to nothing

## Symptom

The landing page's menu was supposed to fade out while the galaxy jumps. Two
classes were added to the button and to the nav:

```html
[body.jumping_&]:pointer-events-none [body.jumping_&]:opacity-0
```

Driven in a browser, `pointer-events` became `none` and `opacity` stayed at `1`.
The same variant, on the same element, in the same class attribute — one half
worked and the other did not. That reads unmistakably like a specificity fight,
and twenty minutes went into the competing `opacity` rules on the nav
(`opacity-0`, `aria-[hidden=false]:opacity-100`, `sm:opacity-100`) looking for
which one was winning.

None of them was. Grepping the stylesheet served by the dev server found no rule
for either class. **Neither half was ever generated.** The `pointer-events`
half looked like it worked because the element already inherited that value from
elsewhere — a coincidence that pointed the investigation at exactly the wrong
layer.

## Root-cause chain

1. **Why was no rule generated?**
   Tailwind never compiled the variant.

2. **Why did Tailwind not compile it?**
   It read `[body.jumping_&]` as an *attribute* variant, not an arbitrary
   selector variant. Tailwind supports both, written with the same brackets.

3. **Why did it read it as an attribute?**
   Because the bracket opens on a bare word. `[aria-hidden]:` and
   `[data-open]:` are attribute variants; `[.menu-open_&]:` and `[&>*]:` are
   selector variants. What decides is the first character.

4. **Why was a bare word used?**
   To raise specificity. `body.jumping .x` is one point stronger than
   `.jumping .x`, which mattered — or seemed to — against the nav's existing
   `aria-[hidden=false]:opacity-100`.

5. **Why did nothing say so?**
   `body.jumping &` is not a valid attribute name, so the utility is dropped.
   Tailwind emits no error, no warning, and no diagnostic. The build succeeds,
   the class sits in the markup looking correct, and the only evidence is the
   absence of a rule in a generated stylesheet nobody reads.

**Root cause:** thought *an arbitrary variant is any selector in brackets*,
actually *a bracket opening on a bare word is the attribute form, and an invalid
attribute name is discarded in silence*. The file already contained the correct
shape two elements above — `[.menu-open_&]:opacity-[0.32]` — and the leading dot
is the entire difference.

## Detection failure causes

- **Typing:** class strings are strings; nothing types them.
- **Linter / static analysis:** the repository lints `.ts` and `.tsx`, and
  `borso/no-string-concatenated-class-names` guards a different failure. The
  classes here live in `index.html`, which no linter opens — the repository
  configures no HTML parser.
- **Functional validation locally:** this is where it was caught, but slowly,
  because the first measurement was misread. `getComputedStyle` was read in the
  same tick as the class change, before the transition had started, so it
  returned the pre-fade value and looked like a failed rule.
- **CI:** builds a stylesheet without the rule exactly as happily as the dev
  server does. A missing utility is not a build error.
- **Code review:** a reviewer reading the diff sees a plausible variant. Knowing
  it is invalid requires knowing this specific parsing rule.

## Countermeasure

- **Code:** commit `8fd9ecd` — both classes rewritten as `[.jumping_&]:…`,
  matching the variant already used two elements above. The specificity concern
  that motivated the bare word turned out not to exist: `.jumping .x` at two
  classes already beats `sm:opacity-100` at one, and the nav's
  `aria-[hidden=false]` rule ties rather than wins. Verified by grepping the
  built stylesheet, not only the dev server's.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit gate)

**Reference:** [PR #63](https://github.com/hugoleborso/borso.fr/pull/63) ·
kaizen PR for this entry

**The actual fix:**

```bash
# scripts/check-tailwind-arbitrary-variants.sh
readonly PATTERN='\[[A-Za-z][^] ]*&[^] ]*\]:'

matches=$(
  grep -rnE "$PATTERN" \
    --include='*.html' --include='*.ts' --include='*.tsx' \
    apps/*/site 2>/dev/null || true
)
```

Wired into `.husky/pre-commit`. Two discriminators, and both are needed:

- **`&` inside the brackets**, because an attribute variant meant as one — such
  as `aria-[hidden=false]:opacity-100`, which appears on the very element this
  bug was on — never contains it.
- **no literal space**, because a Tailwind variant writes its spaces as `_`.
  Without that second test the check matches a TypeScript mapped type,
  `[Segment in keyof Tree & string]:` in `i18n.utils.ts`, which is how the first
  version of this gate failed.

Proven against the regression rather than asserted: re-introducing
`[body.jumping_&]:opacity-0` into `index.html` makes the check exit 1 and name
both lines; the clean tree exits 0 with no false positives.

ESLint cannot host this one. Half the class attributes in this repository live
in `index.html` files, and adding an HTML parser plus a plugin plus a second
config to lint four files would be a language for what is a substring test.

**Sibling defects swept:** the same PR hit a second silent Tailwind no-op with a
different mechanism — a `var()` inside an `@theme` entry, which resolves against
`:root` and bakes in the fallback, so every per-element duration took the
default. That one is not mechanically checkable, because the same syntax is
correct when the property really is global; it is written up in
[`../knowledge/tailwind-v4-fails-quietly-in-two-places.md`](../knowledge/tailwind-v4-fails-quietly-in-two-places.md).

## See also

- [`../knowledge/tailwind-v4-fails-quietly-in-two-places.md`](../knowledge/tailwind-v4-fails-quietly-in-two-places.md)
  — both silent no-ops from this PR, side by side.
- [`../knowledge/judging-an-animation-you-cannot-watch.md`](../knowledge/judging-an-animation-you-cannot-watch.md)
  — why the first measurement of this bug was misread.
- [`two-starfields-one-of-them-fake.md`](./two-starfields-one-of-them-fake.md)
  — the other, larger defect in the same PR.
