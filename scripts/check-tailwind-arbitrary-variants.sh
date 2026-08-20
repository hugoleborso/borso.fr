#!/usr/bin/env bash
# Pre-commit gate: a Tailwind arbitrary variant that Tailwind will read as an
# attribute selector, and therefore compile to nothing.
#
# An arbitrary variant is written `[<selector>]:<utility>` and has to contain
# `&`. Tailwind also supports an attribute variant, written `[<attribute>]:`,
# and it tells the two apart by what the bracket opens on. A bracket opening on
# a bare word is the attribute form, so `[body.jumping_&]:opacity-0` is parsed
# as the attribute `body.jumping &`, which is not a valid attribute name. The
# utility is then dropped: no rule is generated, no error is printed, no
# warning appears in the build, and the class sits in the markup looking
# correct. The sibling two lines above it, `[.menu-open_&]:opacity-[0.32]`,
# works — the leading dot is what makes it a selector.
#
# Observed 2026-08-20 on borso.fr's landing page: `pointer-events-none` under
# the same broken variant appeared to work, because the element inherited that
# value from elsewhere, which is what made the opacity half look like a
# specificity fight rather than a missing rule. See
# docs/dantotsus/a-tailwind-variant-that-compiled-to-nothing.md.
#
# ESLint cannot do this one. The class attributes live in `index.html` as much
# as in `.tsx`, and the repository configures no HTML parser.
#
# Two discriminators, and both are needed. `&` inside the brackets, because an
# attribute variant meant as one, e.g. `aria-[hidden=false]:opacity-100`, never
# contains it. And no literal space, because a Tailwind variant writes its
# spaces as `_` — without that second test a TypeScript mapped type such as
# `[Segment in keyof Tree & string]:` matches, which is how this check first
# failed on i18n.utils.ts.

set -euo pipefail

cd "$(dirname "$0")/.."

# A bracket opening on an ASCII letter, containing an `&`, used as a variant.
# Anything opening on `.`, `#`, `&`, `*`, `:`, `>`, `+`, `~` or `@` is a
# selector to Tailwind and is left alone.
readonly PATTERN='\[[A-Za-z][^] ]*&[^] ]*\]:'

matches=$(
  grep -rnE "$PATTERN" \
    --include='*.html' --include='*.ts' --include='*.tsx' \
    apps/*/site 2>/dev/null || true
)

if [ -n "$matches" ]; then
  echo "[check-tailwind-arbitrary-variants] a variant below opens on a bare word, so Tailwind"
  echo "  reads it as an attribute selector and generates no rule at all:"
  echo
  echo "$matches" | sed 's/^/  /'
  echo
  echo "  Open the bracket on the selector it is meant to be — '.jumping_&' rather"
  echo "  than 'body.jumping_&' — or write the state as a real attribute variant."
  exit 1
fi

echo "[check-tailwind-arbitrary-variants] every arbitrary variant opens on a selector Tailwind reads"
