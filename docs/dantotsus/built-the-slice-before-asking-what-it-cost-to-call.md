---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: high
related-pr: '#104'
fix-commits: [60fcd964e8]
eradication-level: 5
eradication-paths: [scripts/architecture/architecture-manifest.ts]
time-to-detect: hours
tags: [adr, architecture-map, third-party, conception, pragma]
zone: .claude/skills/technical-conception
---

# A finished bar search the owner refused to pay the entry ticket for

## User impact

Pragma members wanted to add a bar from a search instead of retyping it. Commit `7bf4a7029` shipped a complete Google Places search slice to PR #104: an adapter, a payload parser, a route, the CDK wiring for the key, a front-end card, tests at full coverage, and an ADR.

| | Seen | Expected |
| --- | --- | --- |
| The operator reads the slice | A feature that cannot run until he opens a Google Cloud billing account. "Je suis obligé de créer un compte de facturation google pour ça et je ne veux pas." (I have to create a Google billing account for this, and I do not want to.) | A search built on a service the project can call as it is. |

Every file of the slice was then deleted or rewritten for another vendor.

## Causal chain

- The operator refused the slice, and the work was thrown away.
  - The slice called Google Places, which answers no request until the project holds a Cloud billing account with a payment method.
    - Commit `7bf4a7029` (2026-09-15, an agent) chose Places and built the slice on it.
      - At conception the agent asked "is there a free tier?", and the answer was yes: 10 000 Essentials calls a month.
      - The ADR's rubric scored data quality, key exposure and rotation effort.
        - The input of conception, the operator's request, did not say that the project refuses a billing account. That constraint was written nowhere conception reads. `grep -rli "billing account"` over `docs`, `.claude` and `CLAUDE.md` finds only this entry and the ADR written after the refusal.

## Root cause of occurrence

*Thought a free tier answered whether the vendor could be used, actually Places refuses every call until a billing account exists, and the owner will not open one.* (Material)

The operator's refusal of billing accounts was in no document the agent loaded. The ADR that replaced the choice, [`2026-09-15T0015-nominatim-answers-the-bar-search.md`](../adr/2026-09-15T0015-nominatim-answers-the-bar-search.md), states it:

> None of that matters if the account cannot exist: this repository's owner does not want a billing account attached to the project, and a service that refuses to start without one is not a free tier, it is a trial.

## Detection failure causes

- **Typing:** the manifest's external type had no field for what a caller must hold, so the entry for Places was well-formed.
- **Linter:** no rule reads a vendor's prerequisites.
- **Local validation:** the adapter's tests injected a key and a fetcher, so they passed against a vendor nobody could call.
- **CI:** without a key the feature degraded to a named not-configured outcome by design, so nothing failed.
- **Review:** the ADR read as thorough. Its criteria were all about the vendor once called, none about what it takes to call it.
- **PO validation:** the operator caught it, after the work was done.

## Countermeasure

Commit `12605f09b` rewrote the slice against OpenStreetMap's Nominatim, which needs no account. The ADR above records the billing-account prerequisite as the criterion that decided it.

## Eradication

**Type:** knowledge (level 5). A required field that records an answer, without refusing any.

**Reference:** commit [`60fcd96`](https://github.com/hugoleborso/borso.fr/commit/60fcd964e8952704801fd953212bd66fa0af5b91) made every external declare what it takes to call it:

```diff
+export type ExternalAccess = 'open' | 'usage-policy' | 'credential' | 'account' | 'billing-account';
+
 export interface ManifestExternal {
   readonly boundary: 'third-party' | 'aws' | 'browser-platform';
+  readonly access: ExternalAccess;
```

`tsc` refuses an external without `access`. But nothing reads the field: `grep -rn "ExternalAccess\|billing-account" scripts .claude --include=*.ts` finds only its declaration in `scripts/architecture/architecture-manifest.ts`. So `billing-account` type-checks as easily as `open`. And the field is filled in when the slice is declared, after the code exists. It records the answer late. It prevents nothing, so this is not level 1.

**Proposed:** subtract `'billing-account'` from the `ExternalAccess` union in `scripts/architecture/architecture-manifest.ts`. CI already runs `architecture-graph.ts --check-externals`, which requires every `@DependsOnExternal` tag to name a system its manifest declares. A slice that depends on a vendor needing a billing account could then not be declared, so it could not pass CI. To move the question before any code, make "what must the caller hold before the first request succeeds" a fixed criterion in Round 2 of `.claude/skills/adr/SKILL.md`, scored for every option.

**Proof it can fail:** removing one entry's `access` made `tsc` fail with "Property 'access' is missing … but required in type 'ManifestExternal'". No check refuses `billing-account`.

**Similar instances:** commit `60fcd96` classified every external across the manifests in `scripts/architecture/manifests/`. Run `grep -rn "access: '" scripts/architecture/manifests` to list them. None uses `billing-account`.
