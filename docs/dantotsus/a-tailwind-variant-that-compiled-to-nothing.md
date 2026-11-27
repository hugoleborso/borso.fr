---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#63'
fix-commits: [957846c4d2]
eradication-level: 2
eradication-paths: [scripts/check-tailwind-arbitrary-variants.sh]
time-to-detect: 25 minutes
tags: [tailwind, frontend, css, tooling]
zone: apps/borso-fr/site/index.html
---

# A Tailwind variant that compiled to nothing

## User impact

On borso.fr's landing page, the menu was supposed to fade out while the
galaxy jumps. Driven in a browser during PR #63, it did not. The defect was
caught before it was committed.

| | Seen | Expected |
| --- | --- | --- |
| The galaxy jumps | the menu button and nav stay fully visible, `opacity: 1` | the menu fades to `opacity: 0` and ignores taps |

`pointer-events` read `none`, which made one half look like it worked. The
element inherited that value from elsewhere. Twenty minutes went into the
nav's competing `opacity` rules before a grep of the served stylesheet showed
that neither class had produced a rule (measured in that session).

## Causal chain

- The menu stayed visible during the jump.
  - The served stylesheet held no rule for either class.
    - Tailwind dropped both utilities without a word. It read the bracket as
      an attribute variant, because it opens on a bare word, and
      `body.jumping &` is not a valid attribute name:

      ```html
      [body.jumping_&]:pointer-events-none [body.jumping_&]:opacity-0   <!-- ← the faulty classes -->
      ```

      - The agent in PR #63 wrote `body.` to win a specificity fight against
        the nav's `aria-[hidden=false]:opacity-100`. That fight did not exist:
        `.jumping .x` already beat `sm:opacity-100`, and tied the `aria` rule.
        - The correct shape sat two elements above in the same file,
          `[.menu-open_&]:opacity-[0.32]`. The leading dot is the whole
          difference. **Man.**

## Root cause of occurrence

*Thought an arbitrary variant is any selector in brackets, actually a bracket
that opens on a bare word is Tailwind's attribute form, and an invalid
attribute name is dropped in silence.* **Man:** the working example was in
the agent's file, and its prior about specificity overrode it.

`docs/knowledge/tailwind-v4-theme-and-preflight-traps.md` lists the bare-word
variant among Tailwind v4's silent no-ops.

## Detection failure causes

- **Typing:** class strings are strings. Nothing types them.
- **Linter:** the repository lints `.ts` and `.tsx`. These classes live in
  `index.html`, and no HTML parser is configured.
- **Build:** Tailwind emits no error, warning or diagnostic for a dropped
  utility. The build succeeds, in CI as on the dev server.
- **Local validation:** `getComputedStyle` was first read in the same tick as
  the class change, before the transition started, so it returned the
  pre-fade value. That pointed the search at specificity.
- **Review:** the variant looks plausible. Seeing it is invalid needs this
  one parsing rule.

## Countermeasure

Commit `8fd9ecd13` rewrote both classes as `[.jumping_&]:…`, the shape
already used two elements above. It was verified by grepping the built
stylesheet, not only the dev server's.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`957846c4d`](https://github.com/hugoleborso/borso.fr/commit/957846c4d2), PR #71, the kaizen of PR #63.

`scripts/check-tailwind-arbitrary-variants.sh` runs in pre-commit on any
`apps/*/site/` change, and in CI. It refuses a bracket that opens on a letter
and holds an `&` with no literal space:

```bash
readonly PATTERN='\[[A-Za-z][^] ]*&[^] ]*\]:'
```

The `&` keeps attribute variants such as `aria-[hidden=false]:` out. The
no-space rule keeps TypeScript mapped types out, such as
`[Segment in keyof Tree & string]:`, which is how the first version of the
gate failed.

It covers one spelling of a wider class. The same PR hit a second utility
Tailwind drops in silence, a `var()` inside an `@theme` entry, which resolves
against `:root` and bakes in the fallback. This grep cannot see that one.

**Proposed:** check the class, not the spelling. A script would collect every
class candidate under `apps/*/site`, load each site's stylesheet into
Tailwind's design system, and fail on any candidate that yields no CSS.
`@tailwindcss/node` 4.3.4 is installed and exports
`__unstable__loadDesignSystem` (read in its `dist/index.d.ts` this session).
The API is marked unstable, so the script would pin that version. A dropped
utility of any spelling would then fail at commit, and the grep could be
deleted.

**Proof it can fail:** reintroducing `[body.jumping_&]:opacity-0` into
`index.html` made the check exit 1 and name both lines, when the entry was
written. The clean tree exits 0.

**Similar instances:** `grep -rnE '\[[A-Za-z][^] ]*&[^] ]*\]:' --include='*.html' --include='*.ts' --include='*.tsx' apps/*/site`
is the check itself, and finds nothing on the clean tree.
