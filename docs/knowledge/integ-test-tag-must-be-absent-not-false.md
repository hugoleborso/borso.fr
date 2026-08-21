---
date: 2026-08-20
introduced-at: infra/cdk/src/internal/tags.ts
detected-at: iam policy review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (STAGE_ONLY_TAGS already encodes it)
time-to-detect: n/a
tags: [iam, tagging, cdk, integ]
---

# The `IntegTest` tag must be absent elsewhere, not set to `false`

`applyStandardTags` adds `IntegTest` only on the integ stage. Setting it to
`false` everywhere else would read as equivalent and is not.

**The integ role's IAM policy selects resources by the *presence* of the
`IntegTest` tag condition key.** A resource carrying `IntegTest=false` still
carries the key, so it matches the condition and falls inside the role's
blast radius. Absence is what keeps it out.

`STAGE_ONLY_TAGS` in `infra/cdk/src/internal/tags.ts` encodes the behaviour, so
the code is correct today. The reason is not derivable from this repository at
all, because **the policy lives in AWS**, not in the checkout — which is why it
is written down here.

## Before changing the tagging helper

If you are tempted to normalise the tag map so every stage carries every key
with a boolean value, read the integ role's policy first:

    aws cloudformation get-template --stack-name borso-shared

and check what the `IntegTest` condition actually tests. A tagging change that
looks cosmetic can widen an IAM role.
