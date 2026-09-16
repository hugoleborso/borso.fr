---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: high
related-pr: '#104'
fix-pr: '#105'
fix-commits: []
eradication-level: 1
time-to-detect: hours
tags: [adr, architecture-map, third-party, conception, pragma]
---

# Built the slice before asking what it cost to call

## Symptom

A complete Google Places search slice shipped to the branch: an adapter, a
payload parser, a route, a CDK wiring for the key, a front-end card, tests at
full coverage, and an ADR recording the choice. The operator read it and
answered:

> Je suis obligé de créer un compte de facturation google pour ça et je ne
> veux pas.

Every one of those files was then deleted or rewritten for a different
vendor.

## Root-cause chain

1. **Why was the work thrown away?**
   The vendor cannot be called at all without a Cloud billing account, and
   this project will not open one.
2. **Why was that not known before the code was written?**
   The question asked at conception was *"is there a free tier?"*, and the
   answer was yes — 10 000 calls a month for the Essentials SKUs. That answer
   is true and irrelevant: a free tier is a price, not an eligibility.
3. **Why did the ADR not catch it?**
   Its rubric scored data quality, key exposure and rotation effort. Nothing
   in it asked what a caller must already have before the first request
   succeeds, so the criterion that decided the outcome was not among the
   criteria.
4. **Why did the architecture manifest not catch it?**
   An external system is declared there with an id, a name, a technology and
   a boundary — all descriptions of what it *is*, none of what it *takes*.
   A vendor needing a credit card and a browser API needing nothing were
   indistinguishable entries.
5. **Why is this the expensive kind of mistake?**
   Because the prerequisite is discovered by the person who cannot satisfy
   it, after the work that assumed it is finished.

**Root cause:** thought a vendor's free tier answered whether it could be
used, actually the prior question is what a caller must already hold — an
account, a card, a credential — and nothing in the ADR or the manifest asked
it, so it was answered last instead of first.

## Detection failure causes

- **Typing:** the manifest's external type had no field for it, so the
  omission was well-formed.
- **Linter / static analysis:** not expressible.
- **Functional validation locally:** the adapter's tests injected a key and a
  fetcher, so they passed against a vendor nobody could actually call.
- **CI:** the same; the key was absent and the feature degraded politely.
- **Code review:** the ADR read as thorough. Its rubric was complete about
  everything except the question that mattered.
- **PO validation:** this is where it was caught, which is the latest
  possible moment and the one this eradication moves earlier.

## Countermeasure

The slice was rewritten against OpenStreetMap's Nominatim, which needs no
account, and [ADR-0018](../adr/0018-nominatim-answers-the-bar-search.md)
records the choice with the billing-account prerequisite as the criterion
that decided it.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #105

**The actual fix:** declaring an external system now requires stating what it
takes to call it. The field is required, so the typechecker refuses a
manifest entry that leaves the question unanswered:

```diff
+export type ExternalAccess =
+  | 'open'
+  | 'usage-policy'
+  | 'credential'
+  | 'account'
+  | 'billing-account';
+
 export interface ManifestExternal {
   readonly boundary: 'third-party' | 'aws' | 'browser-platform';
+  readonly access: ExternalAccess;
```

Verified by removing one entry's field: `tsc` fails with *"Property 'access'
is missing … but required in type 'ManifestExternal'"*. All twenty existing
externals across the four applications were classified in the same commit,
which is itself the audit this repository never had: fourteen are `open`,
five need a `credential`, one binds the caller to a `usage-policy`.

`billing-account` exists in the union precisely so the answer that would have
stopped this work has somewhere to be written. What each value means, since
the repository allows no comment beside the type to say it: `open` needs
nothing, and covers the browser's own APIs and a service that answers an
anonymous request; `usage-policy` needs no credential but binds the caller to
terms it must honour in code, such as a rate limit, a cache or an attribution
line; `credential` needs a key or a token the deployment holds; `account`
needs somebody to sign up; `billing-account` needs them to enter a payment
method before the first call succeeds.

**Sibling defects swept:** the classification pass found no other external
whose prerequisite had been assumed rather than checked.

## See also

- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) — the same shape one layer down: work done before the cheap question was asked.
- [`an-adr-that-never-listed-doing-nothing.md`](./an-adr-that-never-listed-doing-nothing.md) — another rubric that omitted the option that mattered.
