---
date: 2026-05-25
introduced-at: implementation
detected-at: production
severity: medium
related-pr: 25
fix-pr: ./lessons-from-pr-27
fix-commits: [<this-pr-claude-md-rule>]
eradication-level: 5
time-to-detect: days
tags: [claude-md, refactor, observability, last-loop-lepin, dsql, auth, self-improvement-loop]
---

# A refactor commit said "drop both Secrets Manager secrets" — and silently dropped the _shared-across-stages_ property of one of them

## Symptom

Login on the freshly-deployed preview of last-loop-lepin
(PR #27) returned `500 {"error":"auth denied", "reason":
"misconfigured"}`. Same shape on prod login : `findAdminPinHash`
returned `null`.

A few sessions earlier, PR #25
([`1951beb refactor(last-loop-lepin): move admin auth into DB,
drop both Secrets Manager secrets`](https://github.com/hugoleborso/borso.fr/commit/1951beb))
had landed with a long, well-explained body. The body framed
the change as "$0.80/mo saved, drop two SM secrets, auth lives
in DB". What the body never named was that the dropped
`<app>/admin-pin-hash` secret had been _shared across every
stage_ — its full name was just `<app>/admin-pin-hash`, no
`/<stage>/` segment. Every preview, every integ, every prod
deploy read the same SM value ; one operator seed propagated
everywhere.

The replacement `admin_credentials` table is per-schema. Each
preview gets a fresh `pr_<N>` schema (and now a per-PR clone
from prod, per `dsql-clone-from-prod`). Without an explicit
"seed prod first" act, every stage's `admin_credentials` table
is empty and login 500s.

Time-to-detect on the operator side: days. The agent rediscovered
the implicit "shared PIN" property weeks later, by reading the
commit before `1951beb` :

```
$ git show 1951beb~1:apps/last-loop-lepin/cdk/lib/stack.ts | grep ADMIN_PIN
const ADMIN_PIN_HASH_SECRET_NAME = `${APP_SLUG}/admin-pin-hash`;
```

— no `${stage}` interpolation. The other secret in the same body
(`<app>/<stage>/admin-jwt-secret`) WAS per-stage. The body said
"drop both Secrets Manager secrets" without naming the
asymmetry.

## Root-cause chain

1. **Why?** The new design assumed an explicit per-stage seed
   step. _No infrastructure or runbook codifies the seed step,
   and the commit body doesn't name the stage-portability
   property the old mechanism carried._
2. **Why?** The old `<app>/admin-pin-hash` SM secret was
   stage-agnostic by name ; the dropped property "single seed in
   the operator's hand propagates to every stage" was a
   side-effect of the unsuffixed secret name. _Naming
   conventions implied stage portability without anyone writing
   it down._
3. **Why?** The refactor author saw "drop two SM secrets, both
   are $0.40/mo" as the relevant economic argument and didn't
   re-derive the portability properties of each. _The body was
   written from a cost-lens, not from a
   what-properties-do-callers-rely-on lens._

**Root cause:** _thought the two SM secrets were
interchangeable for the purpose of describing what's being
dropped, actually one was per-stage and one was shared-across-
stages — the body only named the cost they shared._

## Detection failure causes

- **Typing:** N/A. Property-level semantics aren't reachable from
  the type system.
- **Linter:** N/A. No static analysis catches a behaviour change
  that the runtime continues to "work" against.
- **Functional validation locally:** Dev seeds its own
  `admin_credentials` row in the local Postgres ; no signal that
  prod / preview have a different propagation story.
- **CI:** No integration test exercises "log in to admin on
  preview after a fresh deploy".
- **Code review:** Reviewers saw cost numbers + clean code +
  one happy login screenshot ; the dropped property wasn't
  named, so no one asked.
- **Operations:** First preview after the refactor presumably
  exercised admin login — and likely got the 500. If anyone hit
  it, it didn't escalate.
- **Production monitoring:** A 500 on admin login is a low-traffic
  event ; no alarm fired.

## Countermeasure

This dantotsu's eradication is a **CLAUDE.md rule** added under
_Tone & rigor_ :

> **Name silent property regressions in refactor commits.** When
> a `refactor:` / `chore:` commit removes or replaces a
> mechanism (a Secrets Manager secret, a shared env var, a
> centrally-managed config…), the body MUST explicitly name any
> _observable property_ the old mechanism carried that the new
> one drops or changes — even when the change is functionally
> equivalent. …

The rule names the failure shape and forces the next refactor
author to enumerate observable properties before declaring "drop
X, replace by Y". A reviewer who sees a refactor body without
that section knows to push back.

The _runtime_ fix for the specific PIN-portability regression —
clone-from-prod into preview schemas — landed in PR #27 itself
(see [`docs/knowledge/dsql-clone-from-prod.md`](../knowledge/dsql-clone-from-prod.md)) ;
this dantotsu is about _the meta-defect that allowed it to land
without being noticed_.

## Eradication shipped

**Type:** knowledge addition (level 5 — codified in CLAUDE.md so
the next refactor author and the next reviewer see the rule)

**Reference:** PR ./lessons-from-pr-27 · CLAUDE.md commit
[`<this-pr-sha>`] (new bullet under _Tone & rigor_)

**The actual fix:**

```diff
+- **Name silent property regressions in refactor commits.** When a
+  `refactor:` / `chore:` commit removes or replaces a mechanism
+  (a Secrets Manager secret, a shared env var, a centrally-managed
+  config…), the body MUST explicitly name any *observable property*
+  the old mechanism carried that the new one drops or changes — even
+  when the change is functionally equivalent. …
```

**Sibling defects swept:** none directly — but the runtime
remedy (clone-from-prod into preview schemas, including
`admin_credentials`) shipped in PR #27 to restore the shared-
PIN behaviour the refactor accidentally dropped.

## See also

- [`docs/knowledge/dsql-clone-from-prod.md`](../knowledge/dsql-clone-from-prod.md)
  — Neon-branch-style clone that restores stage portability
  for `admin_credentials` and any future per-stage data.
- [`CLAUDE.md`](../../CLAUDE.md) — _Tone & rigor_ section.
