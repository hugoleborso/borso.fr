---
date: 2026-09-16
introduced-at: conception
detected-at: post-merge
severity: medium
related-pr: '#101'
fix-pr: '#101'
fix-commits: [c718c65]
eradication-level: 2
time-to-detect: days
tags: [adr, process, secrets, pragma]
---

# An ADR that never listed doing nothing

## Symptom

Hours after the pull request merged, the operator asked the question the ADR
was supposed to have answered:

> before merge : je ne l'ai pas fait, mais tu veux me faire stocker un secret
> du coup ?

The honest answer was that the feature works without the secret. Deezer links
are already exact, and a song with no resolved Spotify id falls back to
`https://open.spotify.com/search/<artist> <title>` — verified in
`apps/pragma/site/src/lib/listen-links.utils.ts`. The credential buys one
thing: the Spotify link lands on the track instead of a search page.

That trade was never written down anywhere the operator could read it before
merging.

## Root-cause chain

1. **Why did the operator have to ask?** The pull request's *Before merge*
   section told them how to store the secret, not whether to. It read as a
   prerequisite, because that is the only shape a "before merge" instruction
   has.
2. **Why did the ADR not settle it?** [ADR-0017](../adr/0017-spotify-track-ids-resolved-by-isrc-at-link-time.md)
   scored five options against four criteria. All five are answers to *where
   does the Spotify credential live and when is the lookup made*. None of them
   is *do not integrate Spotify*.
3. **Why was that option missing?** The operator's request had said "ajoute un
   lien vers spotify et deezer", so Spotify was treated as given and the ADR
   opened one level below the real decision. The rubric was sound and the
   scoring was honest; the option set was framed too narrowly to contain the
   question.
4. **Why did no process step catch the narrow frame?** The ADR standard asks
   for "minimum two alternatives" and rejects an ADR with only the chosen
   option. Five well-scored options satisfy that comfortably. Nothing asks
   whether the *problem statement* is the one worth deciding.
5. **Why does it matter here more than usual?** The decision's cost is not a
   line of code, it is a credential the operator has to hold, rotate and trust
   forever. A cost that lands on the human rather than the codebase is exactly
   the one they should have been offered the chance to decline.

**Root cause:** thought an ADR's job is to choose well among the ways of doing
the thing, actually it has to first make *not doing the thing* a scored option,
because a request phrased as a feature does not authorise every cost that
feature turns out to carry.

## Detection failure causes

- **Linter / static analysis:** an ADR is prose; no rule reads option sets.
- **Code review:** the standards review reads source against
  `docs/standards/`, not ADRs against their own rubric. The technical
  validation skill takes a spec as its argument and there was no spec here.
- **PO / QA validation:** the operator is the PO, and the artefact that would
  have put the question in front of them is the one that omitted it. The
  pull request body carried the instruction and not the choice, so reading it
  carefully would still not have surfaced the alternative.
- **Production monitoring:** nothing to monitor — the unseeded state is the
  degraded-but-working state, which is the point.

## Countermeasure

- **Code:** commit `c718c65` shipped the integration; nothing about it is
  wrong. The correction is to the record: the option that was never scored is
  now named in the ADR standard's rules, and the operator has the three-row
  trade-off in hand — leave it unseeded, seed it, or remove the Spotify path
  entirely, which is a small pull request whenever they want it.
- **Operator action:** none required. The merged state is the working state.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the instruction that allowed the narrow frame
is replaced)

**Reference:** [PR #101](https://github.com/hugoleborso/borso.fr/pull/101) ·
the kaizen branch commit below

Level 1 is not reachable: no type or shape can force a human walk-through to
consider an option, and a script cannot tell a real do-nothing option from a
sentence saying one was considered. The strongest available fix is to make the
omission impossible to make silently, in the document both the interactive and
the piloted `/adr` modes read before writing.

**The actual fix:**

```diff
 Minimum two alternatives. An ADR with only the chosen option is a one-liner — push it back to `docs/knowledge/` or a code comment.
+
+**One of the options is always not doing the thing.** Write it as a real
+option with a real rationale, never as a sentence saying it was obviously
+rejected: what the product still does without the change, and what it costs to
+keep living that way.
```

The rule carries this defect as its worked example, so the next author meets
the reason rather than the instruction.

**Sibling defects swept:** [ADR-0015](../adr/0015-per-member-credentials-replace-the-shared-password.md)
and [ADR-0004](../adr/0004-pragma-shared-password-auth.md) are
the two other credential-storage ADRs. Both decide where a credential the
product genuinely cannot work without is kept — a band with no password cannot
sign in — so the do-nothing option is not merely unscored there, it does not
exist. The rule costs them a sentence each and changes neither outcome; they
are left as written rather than back-filled.

## See also

- [ADR-0017](../adr/0017-spotify-track-ids-resolved-by-isrc-at-link-time.md) —
  the five options that were scored, and the one that was not.
- [`orchestrator-agency-overcorrected-on-product-decisions`](./orchestrator-agency-overcorrected-on-product-decisions.md)
  — the neighbouring failure, where product decisions were taken that should
  have been surfaced.
- [`spec-skill-let-perspectives-be-skipped`](./spec-skill-let-perspectives-be-skipped.md)
  — the same shape one stage earlier: a document that satisfied its own
  completeness rule while missing the perspective that mattered.
