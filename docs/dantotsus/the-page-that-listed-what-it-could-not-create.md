---
date: 2026-08-18
introduced-at: conception
detected-at: production
severity: high
related-pr: '#37'
fix-pr: '#60'
fix-commits: [a991fc9, 4e660b4]
eradication-level: 4
time-to-detect: 3 months
tags: [pragma, frontend, spec, product, visual-validation]
---

# The page that listed what it could not create

## Symptom

A band member reported, in one sentence and with no detail:

> je peux pas créer de setlist

Nothing was broken. The setlists index listed only the concerts that
already carried a setlist, so the page a musician opens to write a set
could never be the place a set is started. The only entry point was a
concert's own session page, reached from Sessions, and the band's single
concert already had one — leaving nowhere in the application to make
another.

## Root-cause chain

1. **Why could he not create a setlist?** The setlists index has no
   create action, and it shows only concerts that already have a set.
2. **Why did that leave him stuck rather than merely inconvenienced?**
   A concert without a setlist is invisible on that page, so the surface
   that names the feature hides exactly the rows the feature applies to.
3. **Why was it built that way?** The index was specified as *"lists
   every concert session that already carries a setlist"*, which is a
   faithful description of a read surface and a complete omission of the
   write.
4. **Why did the spec omit it?** The author knew the setlist is born on
   the session page, so the question *"where does a person start one?"*
   was answered before it was asked. Its own empty state proves it: the
   copy read *"ouvre un concert depuis /sessions pour en composer une"* —
   a page telling the reader to go elsewhere, naming a URL path.
5. **Why did no gate catch it?** Every validation row is pulled from the
   spec, so a surface the spec does not claim is a surface nothing
   checks. The tests, the coverage gate and the mutation gate all cover
   what the page does; none asks what it cannot do.
6. **Why did it take three months and a bug report?** Prod carried one
   concert, which had a setlist from the start. The dead end only exists
   for the second concert.

**Root cause:** thought *"a list page lists"*, actually *"a list page is
where the work on that record starts, so a list with no create action
hides the feature from everyone who does not already know where it
lives"*.

## Detection failure causes

- **Typing:** a missing affordance is well-typed.
- **Linter / static analysis:** no rule relates a route that reads a
  collection to a route that writes one.
- **Functional validation locally:** the seeded fixture gives its concert
  a setlist, so the empty-handed case never renders in a dev session.
- **CI:** the back-end route exists and its tests pass; creation works
  perfectly, from a page nobody reaches.
- **Code review:** the page matched its spec line for line.
- **Visual validation:** the checklist is spec-derived, and the spec
  described a read.
- **Production monitoring:** the trace is an absence — no write request
  of any kind, over the whole retention window, while the reader
  reloaded the same two pages. Absences do not raise alarms.

## Countermeasure

- **Code:** commit `a991fc9` (PR #60) — the index lists every concert,
  and a concert with no setlist carries a create action that lands on
  its editor in one tap.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — the class is now a standing validation row)

**Reference:** [PR #60](https://github.com/hugoleborso/borso.fr/pull/60) · commits [`a991fc9`](https://github.com/hugoleborso/borso.fr/commit/a991fc9), [`4e660b4`](https://github.com/hugoleborso/borso.fr/commit/4e660b4)

**The actual fix:**

The instance is closed by the create action itself. The class is closed
in `.claude/skills/visual-validation/standard.md`, which now walks the
write a listing surface implies whether or not the spec names it:

```diff
+6. **Reachability of every write the surface implies.** For each screen that
+lists a kind of record, the validator checks that the screen itself offers a
+path to create one, and follows it. […] This row is checked even when the spec
+does not name it, because a spec written from the author's mental model rarely
+names the door they already know about […]
```

Level 1 was considered and rejected: a rule relating "route that lists
X" to "affordance that creates X" needs a model of what a route lists,
which the architecture graph does not carry, and the guess rate on a
five-page application would exceed its value.

**Sibling defects swept:** the same PR hardened the create path itself —
the mutation reconciles from its own response instead of re-reading a
row Aurora DSQL may not yet show, a 409 now opens the editor instead of
throwing, and both surfaces paint a failure rather than nothing.

## See also

- [`docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](./optimistic-reorder-reverted-by-stale-dsql-read.md) — the read-after-write trap the same PR closed on this path.
- [`spec-skill-let-perspectives-be-skipped`](./spec-skill-let-perspectives-be-skipped.md) — the other way a spec ships with a hole nobody notices.
- [`docs/knowledge/cloudwatch-retention-bounds-an-absence-claim.md`](../knowledge/cloudwatch-retention-bounds-an-absence-claim.md) — how the absence of writes was read, and how far that reading goes.
