---
date: 2026-11-03
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#246'
fix-commits: [e523fbe2d]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/components/molecules/Menu.tsx, eslint-rules/no-raw-interactive-element.js, eslint-rules/no-raw-interactive-element.test.js, apps/pragma/package.json]
time-to-detect: hours
tags: [pragma, frontend, react, eslint, gates, accessibility]
zone: apps/pragma/site/src/components/molecules/Menu.tsx
recurs: [built-my-own-before-checking-the-library]
---

# The menu written three times

## User impact

The band reported that a `more` menu stayed open after a tap elsewhere. The
fix of PR #246 shipped on its third design. Each of the first two met the
bug report and missed something the operator then had to point out.

| Version | Seen on review | Expected |
| --- | --- | --- |
| 1, hand-written backdrop (`b191d5f8`) | The operator asked why it was not the platform's popover. The bottom bar and the tab bar stayed tappable over it | A browser primitive owns dismissal |
| 2, `popover="auto"` (`0312c175`) | The closing tap also opened the song sheet under it, and the page did not dim | A menu dims the page, and the closing tap does nothing else |
| 3, modal `<dialog>` with the sheet's scrim (`63a2a1f5`) | Accepted | |

Version 3 is the mechanism `Sheet` already had in `modal-dialog.adapter.ts`
before the fix began (measured, `git show b507ea56:apps/pragma/site/src/lib/modal-dialog.adapter.ts`).

## Causal chain

- The fix of PR #246 was written three times before the operator accepted it.
  - Branch 1. Version 1 (`b191d5f8f`) caught outside taps by hand:

    ```tsx
    <div data-menu-backdrop aria-hidden="true" onClick={closeEnclosingMenu} className="fixed inset-0 z-20" />
    ```

    - Its commit message reads "Menu now renders a backdrop that only shows
      while open, and Escape closes it". The agent changed `Menu.tsx` alone.
      `Sheet` already closed on a backdrop tap and on Escape through
      `modal-dialog.adapter.ts` (measured,
      `git show b507ea56:apps/pragma/site/src/lib/modal-dialog.adapter.ts`),
      and CLAUDE.md already said "Reuse first. Look in this repo".
  - Branch 2. Version 2 (`0312c175a`) used `popover="auto"`. The closing tap
    reached the song sheet under it and opened it, and the page did not dim.
    - The rule the operator then stated, "dim the page, and the closing tap
      does nothing else", was in no spec or standard before version 1
      (measured, `git grep` for it over `docs/features/pragma` and
      `docs/standards` at `b191d5f8f^`). It existed only as the transition
      sheet's behaviour.
  - Version 3 (`63a2a1f5a`) opened the menu as a modal `<dialog>` over the
    sheet's scrim, which is what `Sheet` already did.

## Root cause of occurrence

Two causes, one per branch.

*Thought the fix was a change inside `Menu.tsx`. Actually the app already had
a component that closed on a backdrop tap and on Escape, and the platform had
two primitives for it.* (Man) The reuse rule was in CLAUDE.md, loaded in every
session, and `Sheet` sat in the same app. The prior to edit the file named in
the bug report won over the rule. The transcript was not read, so whether the
agent looked and dismissed `Sheet` is inferred from the commit sequence.

*Thought closing on an outside tap was the whole of the bug. Actually the
product rule was that the page dims and the closing tap does nothing else.*
(Material) The rule was in no document the agent could load, so it met the
bug report and missed the rule.

Both lead to the same structural answer. The operator asked for a component
library because pragma hand-wrote every primitive, and four dantotsus traced
to that
([ADR-2026-11-03T1438](../adr/2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md)).

## Detection failure causes

- **Linter:** `borso/no-raw-interactive-element` refuses a raw `<dialog>`
  outside `Sheet`, and jsx-a11y refuses a click on a static element. A
  `<div>` marked `aria-hidden` passes both (measured, oxlint on a scratch
  copy, 2026-11-03).
- **Tests:** `Menu.test.tsx` asserted that a tap outside closes the menu.
  Every version passed it. No test asserted that the tap reaches nothing
  else, because no document said so.
- **Review:** the operator caught both earlier versions, each in one look.

## Countermeasure

PR #246 shipped version 3. The menu and the sheet shared
`closeOnBackdropTap`. PR #249 then replaced that `<dialog>` with React Aria,
as the Eradication records.

## Eradication

**Type:** structural impossibility (level 1).

**Reference:** commit `e523fbe2d` (PR #249), under
[ADR-2026-11-03T1438](../adr/2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md),
accepted by the operator ("Aria ok"). pragma depends on
`react-aria-components` 1.22.1 (`apps/pragma/package.json`), and `Menu.tsx`
is its `MenuTrigger` and `Popover`. The ADR measured the operator's tap rule
(close, and reach nothing else) on four libraries, and React Aria passes it by
default. So neither branch's mistake can be written again in a menu. The
library owns dismissal, and its default already follows the product rule.

`borso/no-raw-interactive-element` keeps the hand-written path closed in
`apps/pragma/site/src`. It refuses a raw `<dialog>`, a React Aria overlay
outside `Sheet` or `Menu`, and an element hidden from assistive technology
that takes a pointer event:

```diff
+        if (isHiddenClickTarget(node)) {
+          context.report({ node, messageId: 'hiddenClickTarget' });
+        }
```

**Proof it can fail:** version 1's backdrop, put back on a scratch copy, was
refused (measured, 2026-11-03):

```
ScratchBackdrop.tsx:4:10: error borso(no-raw-interactive-element): An element hidden from
assistive technology that takes a pointer event is a hand-written outside-tap catcher
```

**The gap:** the rule runs in pragma only. Another app could hand-write a
menu.

**Similar instances:** `grep` for an `aria-hidden` element with a pointer
handler over `apps/*/site/src` finds none (measured, 2026-11-03).
