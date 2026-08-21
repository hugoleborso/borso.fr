---
date: 2026-08-21
introduced-at: harness
detected-at: audit
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
tags: [harness, tooling, rtk, claude-code]
---

# rtk truncates command output, and the truncation reads as content

`rtk` rewrites Bash commands for token savings, and it **compresses long
output**. A `cat` of a nine-line file printed eight lines followed by
`[10 more lines]`.

The danger is not the truncation, it is that the output still looks complete.
An audit checking *"did I remove every leftover line from this file?"* reads
eight clean lines, concludes yes, and has not seen the one line it was looking
for. `strip-pragma-site` lost time to exactly this while hunting a stray
English fragment in `types.d.ts`.

The marker is also imprecise: it said `[10 more lines]` for a file with nine
lines in total.

## What to do

When the answer depends on having seen **all** the output, do not read the
output — make the command answer the question:

    grep -c 'pattern' file          # a count cannot be truncated into a lie
    grep -n 'pattern' file | wc -l
    test "$(grep -c … )" -eq 0 && echo CLEAN || echo DIRTY

For file contents specifically, prefer the `Read` tool over `cat`: it is not
routed through the rewrite.

Treat any `[N more lines]` marker as *"this output is not evidence"*, and
re-ask with something that fits.

## Related

- [`the-shell-gates-are-only-ever-run-where-they-pass.md`](./the-shell-gates-are-only-ever-run-where-they-pass.md)
  — the neighbouring problem: reading a gate's success as proof it checked
  what you assumed.
