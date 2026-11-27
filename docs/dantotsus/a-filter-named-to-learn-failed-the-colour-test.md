---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#216'
fix-commits: [self]
eradication-level: 2
eradication-paths: [apps/pragma/site/src/lib/design-tokens.utils.ts]
time-to-detect: hours
tags: [pragma, gates, tailwind, testing, frontend]
zone: apps/pragma/site/src/lib/design-tokens.utils.ts
recurs: none (the scanner's earlier misreads, '=' and '*', were split bugs fixed on PR #216)
---

# A filter named to-learn failed the colour test

## User impact

Agents working on pragma's site were refused by the design-token test for strings that were not classes. Three refusals were seen on PR #216 and PR #231 (measured in their sessions). No end user saw anything. Each agent lost a round and renamed a working identifier.

| | Seen | Expected |
| --- | --- | --- |
| `build-4` and `build-6`, PR #216 | The catalogue filter id `'to-learn'` refused as a gradient stop with an unknown colour `learn` | The id passes, because it is not a class |
| `redesign-fixes`, PR #231 | The button option `'from-sm'` refused the same way | The option passes |

## Causal chain

- The test *uses only colour, text, radius and shadow utilities the stylesheet generates* failed on `to-learn`.
  - Tailwind generated no CSS for the candidate `to-learn`, so the test listed it as unknown.
    - `listTokenUtilityCandidates` returned `to-learn` as a candidate, because `to-` is one of its colour roots.
      - The test hands it the whole text of every file under `site/src`, read with `readFileSync`, and the scanner matches every token of that text:

        ```ts
        const CLASS_TOKEN = /[!a-z0-9:/._%&=[\]-]+/giu;
        // ...
        for (const match of source.matchAll(CLASS_TOKEN)) {   // ← every token of the file, not only class strings
          const token = match[0];
          if (TOKEN_UTILITY_ROOT.test(readUtilityName(token))) candidates.add(token);
        }
        ```

        - An agent wrote these lines in de91fdfe8 (PR #216, the pragma redesign). de91fdfe8 is the squash merge of all of PR #216, 869 files. The same squash added `eslint-rules/class-strings.js`, whose `buildClassStringVisitors` reads only `className` attributes, `*_CLASS` constants and `.variants.ts` files (measured with `git log --follow`).

## Root cause of occurrence

*Thought the gate should read the source the way Tailwind's scanner does, every token of every file. Actually Tailwind can afford to over-read, because an unknown candidate only costs it no CSS, while a gate that refuses every unknown candidate turns each over-read into a refusal.* (Man)

The class-context reader `buildClassStringVisitors` landed in the same pull request as the scanner. A squash of 869 files does not show that it existed when the scanner was written, nor that it was in the writing agent's context. The M is a guess between Man (the reader was loaded and the prior that a candidate list is "what Tailwind scans" won) and Material (it was not loaded yet), because the transcript of PR #216 was not read. Either one leads to the same eradication, a gate that reads only class contexts, so the conclusion does not depend on the choice.

## Detection failure causes

- **Typing and lint:** the scanner's input is a raw string, so nothing types a token as "a class" or "an id".
- **Self-validation:** the scanner's own test fed it only class strings. No case held an identifier that starts with a colour root, so the over-read stayed invisible until an agent wrote one (inferred from the tests in de91fdfe8).
- **CI:** the gate runs in `test:core`, after the commit that introduced the name, so the refusal reached the agent late.

## Countermeasure

PR #216 renamed the filter id. PR #231 renamed the option.

## Eradication

**Type:** DevX check (level 2), for gradient roots only

**Reference:** the commit adding this file (bff04a955, PR #233).

`listTokenUtilityCandidates` drops `from-`, `via-` and `to-` tokens from a source that holds no `bg-linear`, `bg-radial`, `bg-conic` or `bg-gradient` utility. Every other root is read as before.

```diff
+  const hasGradient = GRADIENT_BACKGROUND.test(source);
   for (const match of source.matchAll(CLASS_TOKEN)) {
+    if (!hasGradient && GRADIENT_STOP_ROOT.test(utility)) continue;
```

**Proof it can fail:** against the scanner from `main`, the new test failed with:

```text
+ Received
+ [
+   "from-sm",
+   "to-learn",
+   "via-x",
```

This is not eradicated. `from-sm` is still refused in a file that also draws a gradient. An identifier such as `'text-large'` or `'bg-muted-option'` is still read as a class in any file, because the other roots keep the whole-text scan.

**Proposed:** check token utilities with a `borso/` lint rule built on `buildClassStringVisitors` from `eslint-rules/class-strings.js`, as `no-arbitrary-tailwind-value.js` already does. The rule would read the theme from `tokens.css` and refuse a token utility only inside a class context. An identifier, an option value or a comment could then never be read as a class, and the `GRADIENT_STOP_ROOT` heuristic and the whole-text scan in `design-tokens.utils.test.ts` could be deleted. It needs no new dependency. A class string held in a variable whose name does not end in `CLASS` would be skipped (inferred from the visitor's code).

**Similar instances:** `git log -S'listTokenUtilityCandidates'` shows the `=` and `*` misreads, fixed on PR #216. No other gate in the repository reads whole file text as classes (`git grep -l "matchAll(CLASS_TOKEN)"` finds only this scanner).
