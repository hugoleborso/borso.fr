---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: medium
related-pr: none (introduced by commit 9a945946, pushed without a pull request)
fix-commits: [67bab828, 21a850ab]
eradication-level: 4
time-to-detect: days
tags: [pragma, react, testing]
eradication-paths: [apps/pragma/site/src/components/organisms/SetlistEntryRow.test.tsx]
zone: apps/pragma/site/src/components/organisms
recurs: none (a computed value no component rendered, not a dialog or harness defect)
---

# The projection nobody rendered

## User impact

Filtering a setlist to one member is how a member answers "what do I play at
the concert".

| | Seen | Expected |
| --- | --- | --- |
| Setlist filtered to one member | Each row's instrument slots, with that member's slots tinted, and no instrument named | Each row names what that member plays, such as "Bass + Backing vocals" |

Every member using the filter was affected. The filter still worked. It was
found while measuring the *my part* job in PR #151.

## Causal chain

- Filtered rows did not name the member's instrument
  - `SetlistEntryRow` no longer rendered it, while `setlist-filter.core.ts`
    still computed it per row
    - Commit `9a945946` (2026-09-19) removed the chip and its call ← the
      faulty change

      ```diff
      -            const prominent = prominentMemberInstrumentFor(
      -              props.filteredInstrumentIdsByEntryId[entry.id],
      -              props.selectedMemberId,
      ```

      - It did so on purpose, and its message says so: "The chip that named
        the filtered member and their instruments beside the row is gone
        with `prominentMemberInstrumentFor`. The member filter itself is
        untouched, and the column shows that member's slots tinted."
        - `CLAUDE.md:33` at `9a945946^` told a commit to "name any
          observable property the old mechanism carried that the new one
          drops", in the commit body, "to surface the trade-off to
          reviewers". The commit did that, and went to `main` with no pull
          request. Method

## Root cause of occurrence

*Thought the tinted slots answered "what do I play", and that naming the
dropped chip in the commit body put the trade-off before a reviewer,
actually a tint names no instrument, and the operator reads no commit body,
so a user-visible removal went out undecided.* **Method.**

The author knew the chip was going, wrote it down, and judged the column a
replacement. The repository's rule at the time sent that judgement to the
commit message:

> When a `refactor:` / `chore:` commit removes or replaces a mechanism […],
> the body MUST explicitly name any *observable property* the old mechanism
> carried that the new one drops or changes […]. The intent is to surface
> the trade-off to reviewers.

The process routed a product call into text that no decider reads. Today
`CLAUDE.md` says "Removing, narrowing or adding anything a user sees beyond
the ask is a product call", which puts the decision with the operator, but
it is still written prose.

## Detection failure causes

- **Typing:** an unused field of a returned object is not an error.
- **Linter:** `scripts/check-pure-modules-have-callers.sh` and knip see the
  function's caller, not whether its result reaches the screen.
- **CI:** no component test rendered a filtered row.
- **Review:** there was none. `9a945946` went to `main` without a pull
  request, so no preview showed the operator the row without the chip.

## Countermeasure

Commit `c229a98` (PR #151): the editor passes `memberPart` to each row and
the row renders it under the title.

## Eradication

**Type:** detection (level 4), a component test on the rendered row.

**Reference:** [PR #154](https://github.com/hugoleborso/borso.fr/pull/154),
commit `bd60cb7`

PR #154 added a test that the row names the member's instruments. The
redesign of PR #216 (`de91fdfe8`) replaced it with the test that holds
today, `SetlistEntryRow.test.tsx:172`:

```ts
it('shows the instruments of the chosen member in place of the band lineup', () => {
  renderRow(buildProps({ isMemberView: true, heldInstruments: [HELD_BASS, HELD_LEAD_VOCALS] }));
  expect(screen.getByRole('img', { name: 'Bass' })).toBeTruthy();
  expect(screen.getByText('Lead vocals')).toBeTruthy();
```

It holds this row only. It would not stop the next deliberate removal of a
user-visible property, which is the cause above.

**Proposed:** make a dropped property reach the operator by structure.
`check-pr-body.ts` already parses the body and runs on `gh pr create`
(`scripts/hooks/checks/gh-pr-create.core.ts`). Have it read the branch's
commit messages and refuse a body when a commit lists a property the old
code carried and the new one does not, unless the body's decisions table or
question block names it. A user-visible removal could then not reach a
merge without appearing where the operator decides. A commit pushed to
`main` without a pull request, as `9a945946` was, would still pass it.

**Similar instances:** the same sweep found `mastery.subtitle` and
`scaffold.subtitle`, two messages no component rendered, removed in
`d26622c`. `git log --grep='carried and this one does not'` lists two
commits on `main` that recorded a dropped property in their body, this one
included (measured 2026-11-27).
