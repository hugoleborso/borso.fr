---
date: 2026-11-27
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#410'
fix-commits: ['2e5e2948', self]
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md]
time-to-detect: 24 hours
tags: [pragma, agents, technical-validation, api]
zone: apps/pragma/api/src/concert-registrations/concert-registrations.service.ts
recurs: none (the first entry about a field a public response carries beyond its spec)
---

# A public count no review walked toward

## User impact

For about a day, anyone could read how many fans had signed up for each pragma
concert. The band never chose to publish that number.

| | Seen | Expected |
| --- | --- | --- |
| `GET /api/concert-registrations/upcoming` on prod, 2026-11-27 09:26 | `registrationCount: 8` on the 17 December concert, read by the shipping session itself | sessionId, date, venue, message, poster and prize, the fields the ticket draws |
| Who found it | the operator, at 09:45: "l'API publique de prod donne le nombre d'inscrits ?" | a review before merge |

## Causal chain

- Anyone could read the sign-up count of each concert.
  - `listUpcomingConcerts` mapped `registrationCount` into every concert of the public list (PR #410, `concert-registrations.service.ts`).
    - No screen read it. `git grep registrationCount cf9fb626 -- apps/pragma/site` finds only a test fixture (measured).
    - No spec line asked for it. The spec was written after the build to give the review a contract, and its list of the landing page's content never names a count (measured, `git show cf9fb626 -- docs/features/pragma/concert-sign-up/spec/spec.md`).
  - The back-e2e test named the field as part of the behaviour: "lists the upcoming concerts only, soonest first, with their message and sign-up count".
  - Both technical rounds of PR #410 built their rows from the spec toward the code. Row D01 of `technical-validation-2026-11-26-1003.md` quoted that test as covering use case 1 and passed it.

## Root cause of occurrence

*Thought a field in a response is harmless when no screen shows it, actually
anyone with `curl` reads every field a public route returns.*

The validator's category A read "One row per Q.O.D. with a behavioural decision
and per *Changes → Files to change* entry". Every row started from the spec. A
field the spec never named had no row to fail in.

## Detection failure causes

- **Technical validation:** it walks from the spec to the code only. The spec
  of PR #410 was written after the code, so it described the code's screens and
  left out what the code returned that no screen used.
- **Test:** the test asserted the count as expected output, so it held the leak
  in place.
- **Security review:** `standard.md` sends security to `/security-review`, and
  nothing in the feature flow runs it.
- **The shipping session:** it quoted "8 inscrits" from the public API on the
  morning of 2026-11-27 and reported nothing left to do.

## Countermeasure

PR #418 removed the field, the repository query behind it and the fixture. Its
test now compares the whole envelope with a strict object, so a new field fails
it. `INVARIANTS.md` states that the public list carries no field beyond the
ones the ticket draws.

## Eradication

**Type:** knowledge (level 5), held by the validator's definition, which every
technical round reads.

**Reference:** the commit adding this file.

```diff
+- Walk the other way for every route the diff adds or changes that answers
+  without a signed-in session. One row per field its response carries. A field
+  no spec line names and no screen in the diff reads is `FAIL (blocking)`,
+  because anyone can read it.
```

No mechanical check ships. Which routes answer without a session is not
machine-readable across apps. pragma marks its member routes with
`requireMemberSession`, and the other full-stack apps guard theirs their own
way (inferred from `ls -d apps/*/api` and the pragma controller). Inside pragma,
the strict-envelope test from PR #418 holds the one route that leaked.

**Proof it can fail:** not run. Proving it means a validator round on PR #410's
diff, which this sweep did not spend.

**Similar instances:** `grep -rn -E "Count\b" apps/*/api/src --include=*.types.ts`
finds four count fields (measured). pragma's `ballotCount` is public, on
`/api/audience/concerts/:sessionId/state`, and `VotingRoundPanel.tsx` draws it,
so the new rule passes it. The other three count cards in a round, comments
and sketches, not people.
