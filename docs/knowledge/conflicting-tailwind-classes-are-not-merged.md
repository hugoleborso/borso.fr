# Conflicting Tailwind classes are not merged

`composeClassName` in pragma and talos is `clsx`: it joins class strings and
does nothing else. When two joined classes set the same property, which one
wins is decided by the order Tailwind emits its rules into the stylesheet, not
by the order in the string. Adding a class after another does not override it.

Hit twice:

- PR #151: `SearchBar` carried `min-w-[260px]`; a caller's `min-w-0` lost, and
  the inline search pushed the catalogue header past 375 px.
- PR #154: the key and capo fields composed `inputVariants()` (`w-full`) with
  `w-12`; the field stayed full width.

## What to do

- Give the base no opinion on what callers change. #151's fix removed the
  260 px minimum from `SearchBar`'s base class.
- Or do not compose the variant at all; #154's fields write their own class
  string.
- A `!` prefix (`!w-12`) wins regardless of order. It works and hides the
  conflict rather than removing it.

The library that removes the conflict is `tailwind-merge` (`twMerge`), which
keeps the last class per property. It is not a dependency here; adding it
would change `composeClassName` in both applications.
