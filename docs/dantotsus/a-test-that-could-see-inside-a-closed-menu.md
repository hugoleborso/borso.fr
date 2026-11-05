---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#249'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/no-hidden-role-query.js, eslint-rules/no-hidden-role-query.test.js, .oxlintrc.json]
time-to-detect: days
tags: [pragma, testing, vitest, eslint, react, gates]
zone: apps/pragma/site/src/components/organisms/SetlistEntriesList.test.tsx
weak-point: gate-measures-nothing
recurs: [sixteen-gates-were-trusted-because-they-had-never-failed]
---

# A test that could see inside a closed menu

## User impact

No user saw a wrong screen. The band lost a guard instead. In the *My part*
view of a setlist a member must not be offered *Add a break after*. After PR
#249 the only test of that rule passed with the rule deleted (measured, this
sweep). Separately, five test files that main had written for the old menu and
sheet broke when PR #249 merged main, and cost a second gate round on a branch
that was minutes from merging.

| | Seen | Expected |
| --- | --- | --- |
| `SetlistEntriesList.tsx` with the filtered-mode guard on `onAddBreakAfter` removed | `shows no break and offers none in the My part view` passes | the test fails |
| Gates after merging main into PR #249 at 00:20 | typecheck and `test:core` exit 1 across five files | the merge passes the gates it passed on main |

## Causal chain

- A test asserted nothing, and five others broke on a merge that changed no
  behaviour.
  - Each one reached a menu item without opening the menu, with
    `getByRole('button', { name, hidden: true })`.
    - pragma's old menu rendered its items inside a closed native `<dialog>`, so
      the items were in the DOM, hidden. `hidden: true` let a test find and
      click them with no tap on *More*. The tests leaned on
      `stubSheetDialog`, which faked `showModal` for jsdom.
      - React Aria's `Menu` does not mount its items until it opens. The
        positive tests found nothing and failed. The negative one,
        `queryByRole(..., hidden: true)).toBeNull()`, now found nothing for a
        different reason and kept passing.
      - PR #249 had deleted `stubSheetDialog` because knip saw no caller. The
        tests main added in the meantime were its new callers, so the merge
        failed to typecheck.

## Root cause of occurrence

*Thought a hidden element is a fair shortcut in a component test, actually it
couples the test to how the component hides things.* Standard 10 already said
to test a component "through what a user sees". Nothing held that line, and
`hidden: true` is the one option that steps outside it. A person cannot press
an item in a closed menu.

## Detection failure causes

- **Lint:** no rule looked at Testing Library options.
- **Mutation:** Stryker runs on changed pure files. `SetlistEntriesList.tsx` is
  a component and was not changed by the fix commit `d955a500`, so no mutant of
  its guard ran.
- **Review:** the fix commit rewrote the four failing tests. The passing one
  beside them carried the same shape and was not read, because it was green.

## Countermeasure

`SetlistEntriesList.test.tsx` now opens *More for a*, checks that *Remove
from the setlist* is offered, and checks that *Add a break after* is not. It
fails with the guard removed and passes with it (measured, this sweep). The
three other `hidden: true` uses, in `TakeUploadForm`, `RecordingSheet` and
`PageHeader`, were dropped. Their tests pass without it (measured, 12 tests).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

```diff
+ "borso/no-hidden-role-query": "error",
```

`borso/no-hidden-role-query` refuses a `getByRole`, `queryByRole`,
`findByRole` or their `All` forms passed `hidden: true` in any front-end file.
Standard 10 says to open the menu, sheet or dialog first.

**Proof it can fail:** with the four test fixes stashed, `pnpm exec oxlint
apps/pragma/site/src` refused all four call sites, starting with
`SetlistEntriesList.test.tsx:87:12: error borso(no-hidden-role-query): A role
query with hidden: true reaches an element no user can reach`. With them
restored it exits 0.

**Similar instances:** `grep -rn "hidden: true" apps/*/site/src --include=*.test.tsx`
found the four above and no other app.
