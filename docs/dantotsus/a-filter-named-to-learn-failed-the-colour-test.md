---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#216'
fix-pr: none (opened by the kaizen pull request for #216 and #231)
fix-commits: [self]
eradication-level: 2
eradication-paths: [apps/pragma/site/src/lib/design-tokens.utils.ts]
time-to-detect: hours
tags: [pragma, gates, tailwind, testing, frontend]
zone: apps/pragma/site/src/lib/design-tokens.utils.ts
recurs: none (the scanner's earlier misreads, '=' and '*', were split bugs fixed on PR #216)
---

# A filter named to-learn failed the colour test

## Symptom

The design-token test reads every string in pragma's site source as a possible
Tailwind class, and fails on a colour utility the stylesheet does not generate.
Three agents on PR #216 and #231 were refused for strings that were not
classes:

- `build-4` and `build-6`: the catalogue filter id `'to-learn'` read as a
  gradient stop with an unknown colour `learn`. The id was renamed.
- `redesign-fixes` on PR #231: the button option `'from-sm'` read the same way.

## Root-cause chain

1. **Why was `'to-learn'` a candidate?** The scanner keeps any token whose
   utility starts with a colour root, and `to-`, `from-` and `via-` are roots.
2. **Why scan every string?** That is how it caught `bg-surface`, a class built
   on a token that did not exist, which no other gate saw.
3. **Why do the gradient roots misfire most?** They are ordinary English
   prefixes, and a gradient stop does nothing without a gradient background, so
   in a file that draws none the token cannot be a class.

**Root cause:** thought every `to-…` string could be a class, actually a stop is
only a class where a gradient is drawn.

## Detection failure causes

- **Linter / static analysis:** the test runs in `test:core`, after the commit
  that introduced the name.

## Countermeasure

- **Code:** PR #216 renamed the filter id.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate stops refusing what cannot be a class)

**Reference:** the kaizen pull request for #216 and #231 · this commit

**The actual fix:** `listTokenUtilityCandidates` drops `from-`, `via-` and `to-`
tokens from a source that holds no `bg-linear`, `bg-radial`, `bg-conic` or
`bg-gradient` utility. Every other root is read as before.

```diff
+  const hasGradient = GRADIENT_BACKGROUND.test(source);
   for (const match of source.matchAll(CLASS_TOKEN)) {
+    if (!hasGradient && GRADIENT_STOP_ROOT.test(utility)) continue;
```

Proved once. Against the scanner from `main`, the new test failed with:

```text
+ Received
+ [
+   "from-sm",
+   "to-learn",
+   "via-x",
```

A misspelt stop beside a real gradient, such as `bg-linear-to-t from-papr`, is
still refused, because the file draws a gradient.

**Library considered:** Tailwind's own scanner extracts candidates the same way,
from every string, so it would read `to-learn` too. A lint rule that reads only
class contexts, such as `eslint-plugin-better-tailwindcss`, would end the class
of misreads but is a new dependency and an oxlint plugin question, an ADR
decision not taken here.

**Sibling defects swept:** the `=` and `*` misreads were fixed on PR #216.

## See also

- [`../knowledge/conflicting-tailwind-classes-are-not-merged.md`](../knowledge/conflicting-tailwind-classes-are-not-merged.md)
