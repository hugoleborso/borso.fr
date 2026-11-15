---
summary: '`awk -v name=value` processes escapes in the value, so `\b` turns into a backspace, and mawk, the default awk here, has no `\b` at all; keep a word-boundary regex in `grep -E`.'
triggers:
  commands:
    - '\bawk\b[^|;&]*\s-v\s'
---

# `awk -v` eats the backslashes of a regex

PR #353 moved a gate's per-file greps into one `awk` pass for speed, and passed
the comment-citation pattern in with `awk -v citation="$PATTERN"`. Half the
check went silent, and only the technical-validation round caught it.

Two things broke at once, both measured on 2026-11-15 with mawk 1.3.4:

- `-v` runs the value through escape processing, the same as a string literal
  in the program. `\b` becomes the backspace character, and `\\b` becomes `\b`.
- mawk, which `awk` resolves to in this container, has no word-boundary escape.
  Even `\b` passed through `ENVIRON`, which skips escape processing, does not
  match `the comment above`.

```sh
printf 'as the comment above\n' | awk -v p='comment above\b' '$0 ~ p {print "match"}'   # prints nothing
printf 'as the comment above\n' | grep -Ei 'comment above\b'                          # prints the line
```

What to do:

- Keep a regex that uses `\b`, `\w` or `\s` in `grep -E`, which is GNU grep
  here and honours them. PR #353's fix ran one `grep -HnEi` over every file.
- When `awk` has to read a pattern, pass it with `ENVIRON["NAME"]`, not `-v`,
  and write it in POSIX ERE only.
- After moving a check from one tool to another, plant the defect it refuses
  and watch it fail. See
  [the-shell-gates-are-only-ever-run-where-they-pass.md](./the-shell-gates-are-only-ever-run-where-they-pass.md).
