---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#167'
fix-commits: [self]
eradication-level: 4
eradication-paths: [apps/talos/site/src/components/atoms/class-name.utils.test.ts, apps/talos/site/src/components/atoms/class-name.utils.ts]
time-to-detect: days
tags: [talos, react, frontend, testing, drift]
zone: apps/talos/site/src/components/atoms/class-name.utils.ts
recurs: none (ADR-2026-10-12T0032 fixed classes that did not merge; this is a merge that removed a class it should have kept)
---

# The merge that read a font size as a colour

## User impact

While the red-figure palette of PR #171 was being checked in a browser, the
sign-in button rendered as a solid black bar with no label.

| | Seen | Expected |
| --- | --- | --- |
| talos sign-in button, PR #171 | a black bar, its label in black ink on a black slip fill | a bronze-ink label readable on the fill |

## Causal chain

- The sign-in label was black on black.
  - The button carried no text colour. `text-on-bronze` was missing from its
    class list.
    - `buttonVariants` emits the variant's `text-on-bronze` and then the large
      size's `text-body`, and `composeClassName` runs them through `twMerge`,
      which keeps the last class of each group.
      - `twMerge` filed `text-body` as a colour. Its default configuration
        knows Tailwind's own font sizes, not talos's `--text-*` tokens, and
        files any other `text-<word>` as a colour.
        - Commit `1145b2b4d` (PR #167) turned it on with no configuration:

          ```diff
          -  return clsx(inputs);
          +  return twMerge(clsx(inputs));
          ```

          - talos's `tokens.css` then declared 35 `--text-*` properties
            (measured, `git show 1145b2b4d^:apps/talos/site/src/styles/tokens.css | grep -c -- '--text-'`).
            The ADR in the same commit says: "Theme tokens declared with
            `@theme` that create new class groups may need
            `extendTailwindMerge` to be recognised."
      - The old palette hid it. Its inherited ink on a bronze fill was a dim
        but readable label. PR #171's palette made the inherited ink the same
        colour as the fill.

## Root cause of occurrence

*Thought only theme tokens that create a new class group need declaring to
`twMerge`, actually a token under an existing prefix such as `text-` is filed
into Tailwind's colour group and collides with a real colour.*

**M: Man.** The writer was an agent, and the warning was in its context: it
wrote it into the ADR of the same commit. It read its own hedge "may need" as
"not these tokens" and did not check talos's 35 `--text-*` tokens. Per the
agentic 4M, the fix is a gate that holds when the prior wins, not another
document.

## Detection failure causes

- **Typing:** class strings are strings.
- **Linter:** nothing compares the merge configuration with the tokens.
- **Local:** the button worked. Only its colour was wrong, and on the old
  palette barely.
- **Review:** [ADR-2026-10-12T0032](../adr/2026-10-12T0032-tailwind-merge-resolves-class-conflicts.md) switched `twMerge` on for the conflicts it
  was meant to fix and checked those.

## Countermeasure

In PR #171, `composeClassName` uses `extendTailwindMerge` with the ten
font-size tokens of `tokens.css` in the `font-size` group.

## Eradication

**Type:** detection (level 4). A unit test fails on drift in talos.

**Reference:** the commit adding this file. The countermeasure is in PR #171.

```diff
+  it.each(readFontSizeTokens())(
+    'knows text-%s from tokens.css as a font size, so it never drops a text colour',
+    (token) => {
+      expect(composeClassName('text-on-bronze', `text-${token}`)).toBe(
+        `text-on-bronze text-${token}`,
+      );
+    },
+  );
```

The test reads every `--text-<name>` from `tokens.css` and fails when one is
missing from the merge configuration. A guard test asserts the list read from
the file is not empty, because an empty list would pass every row.

**Proof it can fail:** removing `caption` from the configuration fails exactly
the `text-caption` row.

The token list is still a hand-kept second copy of `tokens.css`. The test
makes the two agree in talos only. pragma has since gained the same copy
(`TEXT_ROLES`, `RADIUS_TOKENS` and `SHADOW_TOKENS` in
`apps/pragma/site/src/components/atoms/class-name.utils.ts`, added in
`de91fdfe8`, PR #216), and its test has no drift check. Its 24 text roles match
its `tokens.css` today (measured on 2026-11-27), by hand. This is not
eradicated.

**Proposed:** subtract the copy. Build each app's `extendTailwindMerge`
configuration from its own `tokens.css`, read at build time (Vite's `?raw` is
already used in both apps, in test code). A token added to the stylesheet is
then known to `twMerge` with no list to update, and a missing token cannot be
expressed, in talos and pragma alike.

**Similar instances:** `grep -rln 'extendTailwindMerge\|twMerge' apps/*/site/src`
finds talos and pragma only. Both keep a hand list.

