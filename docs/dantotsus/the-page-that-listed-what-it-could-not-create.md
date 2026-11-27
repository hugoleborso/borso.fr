---
date: 2026-08-18
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#37'
fix-commits: [a991fc965d, 4e660b46e6]
eradication-level: 5
eradication-paths: [.claude/agents/visual-validator.md]
time-to-detect: 3 months
tags: [pragma, frontend, spec, product, visual-validation]
zone: apps/pragma/site/src/routes/setlists/SetlistsPage.tsx
---

# The page that listed what it could not create

## User impact

A band member reported, in one sentence and with no detail:

> je peux pas créer de setlist

| | Seen | Expected |
| --- | --- | --- |
| Setlists page, prod, the band's one concert already had a setlist | A list of that one setlist, no create action, and an empty state saying to open a concert from `/sessions` | Every concert, each without a setlist carrying a way to start one |

Nothing was broken. The page a musician opens to write a set could never be
where a set is started. The only entry point was a concert's own session
page, and the band's single concert already had a setlist, so nowhere in the
app could make another. Every member was affected once a second concert
needed a set.

## Causal chain

- The member could not create a setlist from the setlists page
  - The page showed only concerts that already carried a setlist, and had no
    create action
    - `SetlistsPage` kept a concert only when its setlist read answered
      ← the faulty lines, from `c58cd5f77`

      ```tsx
      const concerts = sessionsBody.sessions
        .filter((entry) => entry.kind === 'concert')
      // then each concert is kept only if its setlist read answers
      ```

      Its header comment said the page "lists every session that already
      carries a setlist" and exists "so the sidebar has its
      prototype-fidelity primary entry".

      - Commit `c58cd5f77` (2026-05-20) built the page to close blockers 5
        to 7 of a round-5 visual-validation FAIL, which asked for the
        prototype's four nav entries. Its message: "The /setlists route
        mounts a new SetlistsPage index that lists concert sessions with a
        setlist; the editor surface still lives inside the session detail"
        - The prototype's *Setlist* entry opened the editor of the next
          concert's setlist directly
          (`design-bundle/project/src/app.jsx:125-133`, `initialSetlist`)
        - The spec listed no `/setlists` surface. It placed creation on the
          concert: "User opens the concert, taps 'build setlist'"
          (`spec.md:71` at `a991fc965d^`)
          - The agent's input named a nav entry to add and the prototype's
            look, and no job for the page. Material

## Root cause of occurrence

*Thought the Setlist nav entry needed a read index of the setlists that
exist, actually the page is where a member goes to write a set, so an index
that shows only existing setlists hides every concert that needs one.*
**Material.**

The agent that wrote `c58cd5f77` worked from a visual-validation blocker
about nav fidelity, from the prototype, and from the spec. The blocker asked
for an entry in the sidebar. The prototype's entry opened one editor, with
fixed data, so it showed no list and no empty case. The spec had no
`/setlists` page at all and started a set from the concert. None of the three
said what a member does on this page, so the agent filled it with the
smallest read that matched the nav label. Its own empty state shows the gap:
"ouvre un concert depuis /sessions pour en composer une", a page telling the
reader to go elsewhere.

## Detection failure causes

- **Typing:** a missing affordance is well typed.
- **Linter:** no rule relates a route that reads a collection to a route that
  writes one.
- **Local validation:** the seeded fixture gives its concert a setlist, so
  the empty-handed case never rendered in a dev session.
- **CI:** the back-end route exists and its tests pass. Creation worked, from
  a page nobody reached.
- **Visual validation:** every row came from the spec, and the spec named no
  `/setlists` surface. The checklist asked whether the nav entry existed, not
  what the page lets a member do.
- **Production data:** prod carried one concert, which had a setlist from the
  start. The dead end exists only for the second concert.
- **Production monitoring:** the trace is an absence, no write request of any
  kind over the retention window, while the reader reloaded the same two
  pages. See
  [`docs/knowledge/cloudwatch-retention-bounds-an-absence-claim.md`](../knowledge/cloudwatch-retention-bounds-an-absence-claim.md).

## Countermeasure

Commit `a991fc9` (PR #60): the index lists every concert, and a concert with
no setlist carries a create action that lands on its editor in one tap. The
same PR hardened the create path. The mutation reconciles from its own
response instead of re-reading a row Aurora DSQL may not yet show, a 409 now
opens the editor instead of throwing, and both surfaces paint a failure
rather than nothing.

## Eradication

**Type:** knowledge (level 5). A written row in the visual validator's
checklist.

**Reference:** [PR #60](https://github.com/hugoleborso/borso.fr/pull/60),
commits [`a991fc9`](https://github.com/hugoleborso/borso.fr/commit/a991fc9)
and [`4e660b4`](https://github.com/hugoleborso/borso.fr/commit/4e660b4)

The instance is closed by the create action. For the class, `4e660b4` added a
row the validator walks whether or not the spec names it. It lives today in
`.claude/agents/visual-validator.md:63`:

```text
5. **Reachability of every write the surface implies.** For each screen that
   lists a kind of record, check the screen itself offers a path to create
   one, and follow it, even when the spec does not name it.
```

It is an instruction to an agent, so it holds only when the validator reads
and applies it. A rule relating "route that lists X" to "affordance that
creates X" was considered and rejected: it needs a model of what a route
lists, which the architecture graph does not carry.

**Proposed:** derive the row from a gated spec field instead of free text.
`scripts/check-spec-records.sh` now holds every new table to a `### Records`
row whose *Created from* cell names where the record is created, with the
operator's dated answer. Have the visual validator turn each *Created from*
cell into one checklist row that walks that path from the named screen. A
spec cannot then ship a record whose creation path no validation row walks,
and the Material gap above, a page with no stated job, becomes a question
the operator answers before the plan.

**Similar instances:** `grep -rln 'indexEmpty' apps/*/site/src` names only
`SetlistCatalogList.tsx`, whose empty state now says to create the first
setlist (`fr.json:707`). Other list pages are walked by the row above on
each validation.
