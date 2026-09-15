# The band writes down what it wants changed in pragma, and votes on it

## Why

Every request about the application itself lived in a conversation: a remark after a
practice, a message nobody kept. There was no place in pragma to write "the scene view is
blinding at night" and no way to tell whether anyone else cared. The cost is not the lost
idea, it is that the one person building the application has no signal about which of ten
half-remembered remarks matters to four members rather than one.

**Measurable objective:** the next thing built is the one with the most votes, read off a
screen rather than recalled from memory.

## Result

A page at `/improvements`, reachable from the administration section of the navigation.

- One row per improvement: a vote button carrying the count, the title, a status badge,
  and the details underneath when there are any.
- The list is ranked: open statuses first, then most voted, then oldest first.
- A filter pill per status, each carrying how many improvements are in it, plus one for
  all of them.
- A panel to file a new improvement or edit the selected one: title, details, status.
- Deleting asks for confirmation first.

## Use cases / edge cases

1. A member files an improvement with a title alone: it is stored as an `idea`, with
   empty details, authored by them, and appears in the list.
2. A member votes for an improvement: the count goes up by one and the button reads as
   pressed, before the server answers.
3. The same member votes again on the same improvement: the count stays at one. A vote is
   a yes or nothing, not a score.
4. A member withdraws their vote: the count goes back down and the button is no longer
   pressed.
5. A vote that fails on the server leaves the list exactly as it was before the click.
6. A member moves an improvement to `shipped`: it drops below every open improvement and
   stays visible rather than disappearing.
7. A member edits an improvement's title and leaves the rest alone: nothing else changes.
8. An update carrying no field at all is refused with 400, and an unknown status is
   refused with 400.
9. Voting on an improvement that is not there answers 404.
10. Deleting an improvement deletes its votes with it, and deleting it a second time
    answers 404.
11. Every route refuses a request with no session cookie.

## Questions, Options and Decisions

**What does a vote weigh?** (2026-09-15) — *One member, one improvement, one yes.* The
row is keyed on the pair, so casting twice changes nothing. Rejected: the points and
budget the setlist vote uses, which exists because a setlist has a fixed number of slots
to fill; a backlog has no such ceiling, and a budget would make a member ration opinions
about their own tool.

**Where does the ranking happen?** (2026-09-15) — *On the server, in a pure function.*
The list endpoint reads the improvements and the votes once each and folds them in
`improvements.core.ts`, which is unit tested and mutation tested. Rejected: an aggregate
join, which would move the rule into SQL where no unit test reaches it, and client-side
ranking, which would make two screens able to disagree.

**Who is the author?** (2026-09-15) — *The member in the session.* Taken from the cookie,
never from the request body, so a client cannot file in someone else's name.

**Out of scope:** showing the author's name or avatar on the row, restricting who may
edit or delete (every member can do everything in pragma), comment threads,
notifications, and any link between an improvement and a song, a setlist or a session.

## Changes

**Types / domain model.** Two tables. `improvement` carries `title`, `details`, `status`,
`authorMemberId` and `createdAt`. `improvement_vote` is keyed on
`(improvementId, memberId)` and carries `castAt`.

`ImprovementStatus` is one of `idea`, `planned`, `building`, `shipped`, `declined`, in
that rank order.

**API.** `/api/improvements`, gated by `requireMemberSession`: list, create, patch,
delete, and `PUT` / `DELETE` on `/:id/vote`.

**Front end.** A route, a page, a page core, and a query module whose vote mutation is
optimistic and settles from the mutation's own response rather than from a refetch.
