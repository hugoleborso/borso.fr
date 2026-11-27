---
date: 2026-11-27
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#410'
fix-commits: ['2e5e2948', 'ac0e4d8b3']
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md, apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts]
time-to-detect: 16 hours
tags: [pragma, agents, technical-validation, api]
zone: apps/pragma/api/src/concert-registrations/concert-registrations.service.ts
weak-point: prose-stands-in-for-a-check
recurs: none (the-deadline-that-skipped-the-mockups shares PR #410 and its skipped mockup round, but its defect is a layout redrawn after the code; this one is a public field, written by a session whose privacy rule covered personal data only)
---

# A public count no review walked toward

## User impact

From the merge of PR #410 (2026-11-26 17:41 UTC) to the merge of PR #418
(2026-11-27 10:44 UTC), anyone could read how many fans had signed up for
each pragma concert (measured, merge commits `cf9fb626a` and `2e5e2948d`).
The band never chose to publish that number. No name or email leaked, only
the count per concert.

| | Seen | Expected |
| --- | --- | --- |
| `GET /api/concert-registrations/upcoming`, on prod | each concert carries `registrationCount`, read as 8 on the 17 December concert by the shipping session at 09:26 UTC (inferred, quoted by the first version of this entry, transcript not re-read) | sessionId, date, venue, message, poster and prize, the fields the ticket draws |
| Who found it | the operator, logged at 09:50 UTC in `docs/features/pragma/concert-sign-up/kaizen.md` as "the operator found it, not the session" (measured) | a gate before merge |

## Causal chain

- Anyone who called `GET /api/concert-registrations/upcoming` read the sign-up count of each concert.
  - The public router returns every field `listUpcomingConcerts` gives it, to any caller.
    - `listUpcomingConcerts` counts the registrations of each upcoming concert and puts the count in every concert it returns.

```ts
// concert-registrations.controller.ts at 597151df: the public router, no session gate
.get('/upcoming', limitReads, async (context) => {
  const concerts = await listUpcomingConcerts(new Date());
  return context.json({ concerts }); // the body carries every field the service returns
})

// concert-registrations.service.ts at 597151df
const counts = await countRegistrationsOfConcerts(concerts.map((concert) => concert.id));
const countBySessionId = new Map(counts.map((row) => [row.sessionId, row.registrationCount]));
// ...
  sessionId: concert.id,
  // ...date, venue, message, posterUrl
  registrationCount: countBySessionId.get(concert.id) ?? NO_REGISTRATION, // ❌ the count goes public
```

      - A session wrote the count in `597151df` at 09:39 UTC on 2026-11-26, the API's first commit (measured, `git grep registrationCount 597151df -- apps/pragma`).
        - The same commit wrote the privacy rule of this route in its own `INVARIANTS.md`, line 33: "The public sees each member's id and first name only, never an email, a phone or an avatar key." It applied that rule in `MemberNameView`, and gave `UpcomingConcertView` a count no rule named (measured, `git show 597151df:apps/pragma/api/src/concert-registrations/INVARIANTS.md`). **Man:** the session's prior that only personal data is private on a public route won over CLAUDE.md, loaded in every session, which says "adding anything a user sees beyond the ask is a product call" (measured, `git show 597151df^:CLAUDE.md`, line 8).
        - The session wrote the payload at 09:39, before the spec landed at 10:03 (`209394acf`) and the validated mockup at 14:06 (`0ce1a7d36`) (measured, commit times). The spec opens "This file records that scope so the review has a contract", so it was written from the code. The session had gone straight to code under a same-day deadline, as [the-deadline-that-skipped-the-mockups](./the-deadline-that-skipped-the-mockups.md) traces. **Method:** the session followed an order that put the payload before the screens that decide its fields.

## Root cause of occurrence

*The session that wrote PR #410's API thought only personal fields (an
email, a phone, an avatar) are private on a public route, actually every
field a public route returns is published, and publishing an aggregate
nobody asked for is a product call.* (Man)

The rule it wrote in the same commit names only personal fields:

> The public sees each member's id and first name only, never an email, a
> phone or an avatar key.
> (`apps/pragma/api/src/concert-registrations/INVARIANTS.md:33` at `597151df`)

The spec it recorded at 10:03 repeats the same scope: "The public API
exposes only a member's id and first name" (`209394acf`, *Rules*). A public
count already existed in the same app, `ballotCount` on the audience route,
drawn by the voting screen. It likely made a count read as harmless
(inferred, the transcript of 09:39 was not read). The right answer was in the
session's context through CLAUDE.md, so the cause is Man under the agentic
4M rule. One more document cannot remove it. Had the session known that every
field of a public response is a published decision, it would have returned
only the fields the ticket draws (inferred, the operator's first request of
09:07 was not re-read and the recorded spec names no count).

## Detection failure causes

- **Typing:** `tsc` accepts a property that nothing reads. The site typed the
  response through the Hono client (`InferResponseType` in
  `concert-registrations.queries.ts` at `cf9fb626a`), so the unread field was
  visible to the language server, but no gate asks it.
- **Linter:** oxlint has no rule for an unread property. knip's issue types
  in `knip@6.44.1` (`dist/constants.js`) cover files, dependencies, exports,
  types and enum members, not a property of an interface (measured).
- **Test:** the back-e2e test asserted the count as expected output, "lists
  the upcoming concerts only, soonest first, with their message and sign-up
  count", because its expectation was written from what the service returned.
- **Review:** category A of `technical-validator.md` built one row per spec
  decision. The spec was recorded after the code and named no count, so no
  row could fail. Row D01 of `technical-validation-2026-11-26-1003.md` passed
  the test above.
- **Security review:** `.claude/skills/technical-validation/standard.md`
  sends security to `/security-review` (line 51), and
  `.claude/commands/feature-pipeline.md` never runs it (measured, `git grep`).
- **After the merge:** the shipping session read the count from the prod API
  and reported it as a result (inferred, first version of this entry). It held
  the same belief as the root cause, so a public count did not read as a leak.

## Countermeasure

PR #418 (`2e5e2948d`) removed the field, the repository query behind it and
the fixture. The route's test now parses the whole envelope with
`z.strictObject`, so any new field fails it. The spec gained "The public list
of upcoming concerts carries no registration count." Verified by row C02 of
`technical-validation-2026-11-27-1005.md`: 30 back-e2e tests passed,
including "lists the upcoming concerts only, soonest first, with their
message and no sign-up count" (measured).

## Eradication

**Type:** knowledge (level 5) for the class, detection (level 4) for this one
route.

**Reference:** commit `ac0e4d8b3` (PR #419) added the validator line, and
`2e5e2948d` (PR #418) the strict envelope.

```diff
+- Walk the other way for every route the diff adds or changes that answers
+  without a signed-in session. One row per field its response carries. A field
+  no spec line names and no screen in the diff reads is `FAIL (blocking)`,
+  because anyone can read it.
```

The validator line is an instruction to an agent. The root cause is Man, so
it does not hold the class. It is level 5 until the check below ships.

**Proof it can fail:** the strict envelope refuses a planted field. Run in
`apps/pragma` this session:

```console
$ node probe.mjs   # z.strictObject({ sessionId, date }).safeParse({ ..., registrationCount: 8 })
Unrecognized key: "registrationCount"
```

The validator line was not tried. It is a prompt, and only a validator round
on PR #410's diff would try it.

**`agent-after-route` does not eradicate this.** On `origin/main`,
`scripts/hooks/checks/agent-after-route.core.ts` matches
`Write|Edit|MultiEdit|NotebookEdit` since `9e22f4d59` (PR #420). Before that,
PR #411 (`458e886c4`) gated only `Agent|Task`. It refuses the first edit
under `apps/` until the transcript shows `/route` (or another framing skill)
or the branch adds a `spec.md`. Here it would have refused the 09:39 write
and sent the session to `/route` first. It checks neither a mockup nor the
fields of a response. The count also survived a spec and a validated mockup
for more than three hours before the merge (measured, `209394acf`,
`0ce1a7d36`, `cf9fb626a`). So the hook fixes the order of the Method branch
and leaves the Man cause open (inferred for the counterfactual).

**Proposed:** an unread-field check at pre-push and in CI (level 2). For each
route of an app's Hono router that the site's `hc` client calls, it takes the
response type and asks `tsc --lsp --stdio` for the `textDocument/references`
of each field. It fails on a field that no non-test file under that app's
`site/src` reads. It makes impossible a public field that no screen reads
reaching `main`, whoever writes it and whatever the spec says. Two kinds of
field it would flag need their own fix first, so the check does not grow a
list kept by hand.

- Site types copied by hand, such as `RoundView` in
  `apps/pragma/site/src/lib/queries/audience.utils.ts`, stop the references
  at the copy. Retype them through the Hono client, as
  `docs/standards/06-data-fetching.md` already asks, so an unread field shows.
- Fields read by clients outside the repository, such as the OAuth metadata
  and the MCP tool results, have a protocol as contract. Declare each such
  type an external contract on the type itself, so the check reads the
  exemption from the code it exempts.

The prototype `lsp-refs.mjs`, run this session on `apps/pragma` at
`cf9fb626a`, finds no reader for the leaked field (measured):

<details>
<summary>Prototype output for <code>UpcomingConcertView</code> at <code>cf9fb626a</code></summary>

```console
sessionId              4 4076ms site/src/components/organisms/ConcertSignUpCard.tsx site/src/routes/concerts/ConcertsLandingPage.tsx
date                   2 117ms site/src/components/organisms/ConcertTicket.tsx site/src/components/organisms/ConcertSignUpCard.tsx
venue                  3 32ms site/src/components/organisms/ConcertTicket.tsx site/src/components/organisms/ConcertSignUpCard.tsx
message                4 182ms site/src/components/organisms/ConcertTicket.tsx
posterUrl              4 8ms site/src/components/organisms/ConcertTicket.tsx
prize                  4 7ms site/src/components/organisms/ConcertTicket.tsx
registrationCount      0 5ms
```

</details>

**Similar instances:** `git grep -n -E "Count\b" origin/main --
'apps/*/api/src/**/*.types.ts'` finds four count fields (measured).
`ballotCount` is public, on `/api/audience/concerts/:sessionId/state`, and
`VotingRoundPanel.tsx` draws it, so the proposed check passes it. The other
three, `sketchCount`, `commentCount` and skull-king's `cardCount`, count
sketches, comments and cards, not people.
