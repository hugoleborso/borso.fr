---
date: 2026-11-27
introduced-at: self-validation
detected-at: operator-deploy
severity: low
related-pr: '#421'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/pr/pr-body.core.ts]
time-to-detect: hours
tags: [visual-validation, agents, harness, pragma]
zone: .claude/skills/visual-validation
weak-point: prose-stands-in-for-a-check
recurs: none (the first gap carried to the operator as a chore)
---

# The gap a library in the scratchpad had closed

## User impact

The operator was asked three times to scan pragma's visitor QR code with his
phone, last as "one check is still yours" after the merge (measured, this
session's replies). He answered that it annoyed him, and that a QR reader
decodes a code with no camera. It does: `jsqr` read `https://pragma.borso.fr/`
from the rendered code in one command once asked (measured).

| | Seen | Expected |
| --- | --- | --- |
| PR #421 body | "Gap: no phone camera has scanned it. Scan the code on the preview." | The decode run and its result |
| After the merge | "One check is still yours: scan the visitor QR code" | Nothing left to the operator |

## Causal chain

- The operator received a check as a chore.
  - The main session turned a validation gap into a request, in the PR body and in three replies.
    - The visual validator wrote row 10 as UNVERIFIABLE, "no camera", and the main session accepted it.
      - Nothing asked what tool was missing. The same session had decoded a screenshot of the code with `jsqr` an hour before.

## Root cause of occurrence

*Thought a check that needs a device the sandbox lacks is a gap for the
operator. Actually a QR code is data, and a decoder library reads it from any
rendered image.* `jsqr` 1.4.0 decodes from RGBA pixels, which a Playwright
screenshot gives (measured, `docs/knowledge/decoding-a-qr-code-in-the-sandbox.md`).

## Detection failure causes

- **Linter, hooks:** `check-pr-body` limited a gap's length, never its claim.
- **Review:** `/visual-validation` already said an UNVERIFIABLE row is mergeable only as a tool gap catalogued in `docs/knowledge/`. It was prose, and nobody looked the gap up.

## Countermeasure

The code was decoded from a browser render at the production origin, and the
reply said so with no request attached (this session).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
+    if (GAP_TITLE.test(block.summary) && !KNOWLEDGE_LINK.test(block.body)) {
+      violations.push({ where: label, problem: GAP_WITHOUT_TOOL_GAP });
+    }
```

A `### Gap:` block in a pull request's Validation now links the
`docs/knowledge/` entry that records the missing tool, or `check-pr-body`
refuses the draft. Writing that entry is where a claimed gap meets the tools
the repository already knows.

**Proof it can fail:** the test `refuses a gap that links no knowledge entry
naming the missing tool` feeds PR #421's gap and gets the refusal.
`pnpm exec stryker run --mutate scripts/pr/pr-body.core.ts` scored 100.

**Similar instances:** `grep -l "Gap:" docs/features/*/*/validation/*.md`
finds the reports that carried gaps; a later one is checked by the same gate
when its pull request opens.
