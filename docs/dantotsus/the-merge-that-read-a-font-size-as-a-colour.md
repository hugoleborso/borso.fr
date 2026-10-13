---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#171'
fix-pr: '#171'
fix-commits: [self]
eradication-level: 2
eradication-paths: [apps/talos/site/src/components/atoms/class-name.utils.test.ts, apps/talos/site/src/components/atoms/class-name.utils.ts]
time-to-detect: days
tags: [talos, react, frontend, testing, drift]
zone: apps/talos/site/src/components/atoms/class-name.utils.ts
recurs: none (ADR-0028 fixed classes that did not merge; this is a merge that removed a class it should have kept)
---

# The merge that read a font size as a colour

## Symptom

While the red-figure palette of PR #171 was being checked in a browser, the sign-in button rendered as a solid black bar with no label. The label was there, in black ink on a black slip fill.

## Root-cause chain

1. **Why was the label black?** The button carried no text colour. `text-on-bronze` was missing from its class list.
2. **Why was it missing?** `buttonVariants` emits the variant's `text-on-bronze` and then the large size's `text-body`, and `composeClassName` runs them through `twMerge`, which keeps the last class of each group.
3. **Why did `twMerge` see the two as one group?** Its default configuration knows Tailwind's own font sizes (`text-sm`, `text-lg`…), not talos's `--text-*` tokens. Any `text-<word>` it does not know as a size it files as a colour, so `text-body` replaced `text-on-bronze`.
4. **Why had nobody seen it before?** On the old palette the inherited ink on a bronze fill was a dim but readable label. The new palette made the inherited ink the same colour as the fill.

**Root cause:** thought `twMerge` knows every Tailwind utility the app emits, actually it knows Tailwind's defaults, and every token a theme adds under a shared prefix has to be declared to it.

## Detection failure causes

- **Typing:** class strings are strings.
- **Linter / static analysis:** nothing compares the merge configuration with the tokens.
- **Functional validation locally:** the button worked; only its colour was wrong, and on the old palette barely.
- **Code review:** ADR-0028 switched `twMerge` on for the conflicts it was meant to fix and checked those.

## Countermeasure

- **Code:** in PR #171, `composeClassName` uses `extendTailwindMerge` with the ten font-size tokens of `tokens.css` in the `font-size` group.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a test that fails on drift)

**Reference:** commit adding this file; the countermeasure is in PR #171.

**The actual fix:**

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

The test reads every `--text-<name>` from `tokens.css` and fails when one is missing from the merge configuration, so a size added to the theme without being declared to `twMerge` fails the suite. A guard test asserts the list read from the file is not empty, because an empty list would pass every row. Removing `caption` from the configuration fails exactly the `text-caption` row.

**Sibling defects swept:** pragma also runs `twMerge`, and its stylesheet declares no `--text-*` token, so its configuration has nothing to learn. A future custom colour named like a default size would be the same trap the other way round; none exists.

## See also

- [`../knowledge/conflicting-tailwind-classes-are-not-merged.md`](../knowledge/conflicting-tailwind-classes-are-not-merged.md)
- [ADR-0028](../adr/0028-tailwind-merge-resolves-class-conflicts.md)
- [`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md): the token list in the merge configuration is a second copy of `tokens.css`, and the test is what makes the two agree.
