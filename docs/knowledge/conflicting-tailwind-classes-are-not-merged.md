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

## Since ADR-0028

`composeClassName` now runs `clsx` through `twMerge` from `tailwind-merge`, so
the last class per property wins, in pragma and talos. The two fields from
PR #154 compose `inputVariants()` with `w-12` again, and it applies. Switching
it on also fixed a third case nobody had reported: the remove action in the
setlist song sheet carried `text-danger`, which had always lost to the
action's `text-ink-700` and rendered grey.

[ADR-0028](../adr/0028-tailwind-merge-resolves-class-conflicts.md) has the
alternatives. An application that composes classes some other way still has
the old behaviour: a later class does not override an earlier one.
