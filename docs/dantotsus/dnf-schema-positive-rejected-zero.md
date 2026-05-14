---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-commits: [d347ab1]
eradication-level: 4
time-to-detect: live race-day usage — Hugo couldn't validate auto-DNFs from the admin UI; surfaced as 400s in CloudWatch
tags: [last-loop-lepin, validation, zod, dsql]
---

# `outAtLoop: 0` rejected because the schema demanded `positive()`

## Symptom

From the admin's DNF tab, clicking "Valider DNF" on a runner the system
had projected as `dnf:late outAtLoop=0` (= never closed the first loop)
returned 400. Same for "Marquer abandon" on a runner who had never
punched. Lambda logs:

```
POST /api/admin/dnfs  →  400  (1-2 ms)
```

The 400 came from `zValidator` before any business logic ran. Hugo
reported: *"je prends des 400 pour valider les DNF, et pour marquer à
la main des DNF tour 0"*.

## Root-cause chain

1. **Why did the request 400?**
   `createDnfInputSchema` rejected `outAtLoop: 0`.
2. **Why did the schema reject 0?**
   The field was declared `z.number().int().positive()`. Zod's
   `positive()` is strictly > 0.
3. **Why did the server then SEND that value?**
   `ranking.core.ts` projects a `dnf:late` status with
   `outAtLoop: lastValidLoop` — and `lastValidLoop` starts at 0 for any
   runner who never crossed the line. The front read that status
   verbatim and posted it back to record the manual DNF.
4. **Why did the schema and the projection disagree?**
   I wrote the schema with the mental model "DNF means you dropped
   after completing N ≥ 1 loops". The projection encodes a different
   reality: "DNF includes the runner who couldn't even close loop 1",
   for which 0 is the right number.
5. **Why did tests not catch it?**
   The back-e2e fixtures all DNF runners *after* loop 1. The
   `outAtLoop: 0` path was an unexercised corner.

**Root cause:** *I thought `outAtLoop` was the "last completed loop
of a DNFed runner", always ≥ 1 because DNF implies at least one
attempt. Actually the system's own projection emits 0 for runners who
miss the very first top, and the front's DNF-confirmation flow has
to be able to round-trip that value.* If I had known the projection
emits 0, the schema would have read `nonnegative()` from day one.

## Detection failure causes

- **Typing:** `outAtLoop: number` carries no lower-bound information.
- **Linter / static analysis:** n/a — this is a domain-level
  invariant, not a syntactic one.
- **Functional validation locally:** back-e2e tests cover DNFs at
  loop 1+ only; the loop-0 path was an off-by-one inside the schema
  the suite didn't exercise.
- **CI (tests / build):** same as above — green because the suite
  didn't drive the failing path.
- **Code review:** I wrote both the projection and the schema in
  successive sessions; never re-read them as a pair.
- **PO / QA validation:** the auto-DNF chain only triggers when an
  edition genuinely has runners who miss the first top, which never
  happened until real users started testing 1-min loops.

## Countermeasure

`apps/last-loop-lepin/api/src/punch/punch.schema.ts` — switched
`outAtLoop` from `positive()` to `nonnegative()` and added a comment
naming the loop-0 case explicitly.

## Eradication (mandatory — code-level)

**Type:** code diff + comment (level 4 — detection at the schema layer)

The schema is the trust boundary between the validated input and the
business code. Putting the loop-0 semantics there, with a comment
pointing at the projection that emits 0, means the next reader sees
the agreement between the two sides without having to chase it.

A higher-level eradication (level 1: structural) would require sharing
the same `outAtLoop` zod schema between the ranking core's emitter and
the controller's validator. The two modules don't currently share a
schema definition for this scalar; introducing one is heavier than the
surface area justifies for a single field. Detection-at-schema is
sufficient as long as the comment names both sides.

**Reference:** [PR #12](https://github.com/hugoleborso/borso.fr/pull/12) ·
commit [`d347ab1`](https://github.com/hugoleborso/borso.fr/commit/d347ab1)

**The actual fix:**

```diff
 export const createDnfInputSchema = z.object({
   editionSlug: editionSlugSchema,
   runnerSlug: runnerSlugSchema,
-  outAtLoop: z.number().int().positive(),
+  // 0 = the runner didn't even close the first loop (the system projects
+  // them as `dnf:late` with `outAtLoop = 0`, and the orga may also mark a
+  // pre-race abandon by hand). Anything below 0 is meaningless.
+  outAtLoop: z.number().int().nonnegative(),
   reason: z.enum(['late', 'manual']),
 });
```

**Sibling defects swept:** the `catchupPunchInputSchema` keeps
`positive()` because catchup specifically credits a missed loop ≥ 1.

## See also

- `apps/last-loop-lepin/api/src/ranking/ranking.core.ts` — the
  projection that emits `outAtLoop: 0`.
