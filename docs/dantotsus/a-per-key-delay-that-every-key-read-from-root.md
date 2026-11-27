---
date: 2026-11-05
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#278'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-stylesheet-contents.sh]
time-to-detect: minutes
tags: [tailwind, css, animation, pragma]
zone: apps/pragma/site/src/styles/tokens.css
recurs: none (the first occurrence, PR #76, was recorded as knowledge in tailwind-v4-theme-and-preflight-traps, not as a dantotsu)
---

# A per-key delay that every key read from root

## User impact

No member saw it. The implementer of PR #278's opening screen caught it
in `pnpm dev`. The pragma mark's keys were meant to rise and press one after
another. Every key moved at the same instant, because every per-key delay
read as `0ms` (`impl-5` in the friction log).

| | Seen | Expected |
| --- | --- | --- |
| Opening screen, the keys' entry | all keys rise together | each key offset by its `--downbeat-key-offset` |

## Causal chain

- Every key started its animation with no delay.
  - The `animation` utility carried `var(--downbeat-key-offset, 0ms)`, and
    each key set `--downbeat-key-offset` on itself.
    - The token sat in `@theme static`, and Tailwind declares those tokens on
      `:root`. The `var()` resolved there, where the property does not exist,
      so the fallback `0ms` was baked in and inherited by every key.

      ```css
      @theme static {
        --animate-downbeat-key-rise: downbeat-key-rise 500ms cubic-bezier(0.16, 1, 0.3, 1)
          calc(var(--downbeat-key-offset, 0ms) / 2) both; /* ❌ resolved on :root */
      }
      ```

      - The implementer of PR #278's opening screen, an agent, wrote the per-element token in the same `@theme static` block as the app's global tokens. The knowledge entry on this trap triggers on a write to `apps/*/site/src/styles/tokens.css`, and it said "this is not mechanically checkable and stays knowledge", so it was the only guard. (Man)

## Root cause of occurrence

*Thought a token's `var()` resolves on the element that uses the utility,
actually a custom property's value is substituted where it is declared, and
a static `@theme` declares on `:root`.*

Man. The document that held the answer existed and its trigger matches the
file that was written, so it was likely printed in the agent's context
(inferred: the hook output is not archived). The model's prior, that a
`var()` resolves where the utility is used, won anyway. One more document
cannot fix that, so the eradication is a gate.

`docs/knowledge/tailwind-v4-theme-and-preflight-traps.md`, line 94, read on
2026-11-27: "A custom property's value is substituted where the property is
declared, not where it is used." On 2026-11-05 the entry ended with "this is
not mechanically checkable and stays knowledge". Line 148 now reads "This one
**is** mechanically checkable, and now is".

## Detection failure causes

- **Knowledge:** the entry existed since PR #76, and its trigger fires on a
  write to `tokens.css` (whether it printed in this session is unknown, the
  hook output is not archived). It called the trap uncheckable, so nothing
  refused the line.
- **Stylesheet gate:** `check-stylesheet-contents.sh` read selectors only,
  never a token's value.
- **Tests:** jsdom computes no animation, so no unit test could see a delay.

## Countermeasure

The implementer moved the per-element tokens to `@theme inline`, which writes
the `var()` into the utility so it resolves on each key.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

A property that no `@theme` or `:root` rule declares can only be meant per
element. `scripts/check-stylesheet-contents.sh` now records every property
those blocks declare, and refuses a `var()` of any other inside a static
`@theme`. It runs in pre-commit on a staged `.css` file and in CI. A global
token read through `var()` still passes.

```awk
if (innermost_head() ~ /^@theme/ && innermost_head() !~ /(^|[ \t])inline([ \t]|$)/) {
```

**Proof it can fail:** pragma's `@theme inline` turned back into
`@theme static` in a scratch worktree:

```
[stylesheet-contents] FAIL apps/pragma/site/src/styles/tokens.css
  apps/pragma/site/src/styles/tokens.css:110  var(--downbeat-lag)  (per-element var() in a static @theme)
  apps/pragma/site/src/styles/tokens.css:114  var(--downbeat-key-offset)  (per-element var() in a static @theme)
exit 1
```

A static `@theme` token reading `var(--color-paper)`, which `@theme static`
declares, passed in the same worktree. The worktree was removed after.

**Similar instances:** the check over all six `tokens.css` reports nothing
today. borso-fr's warp streak from PR #76 moved to `@utility` back then.
