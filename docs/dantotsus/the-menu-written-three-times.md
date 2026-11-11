---
date: 2026-11-03
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#246'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/no-raw-interactive-element.js, eslint-rules/no-raw-interactive-element.test.js]
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

- The fix was written three times
  - Version 1 re-implemented outside tap and Escape by hand
    - The session looked for what to change in `Menu.tsx`, not for what
      already dismissed something in the app or the platform (inferred from
      the commit sequence, the transcript was not read)
    - No gate refused it. The backdrop was `<div aria-hidden="true" onClick>`,
      and jsx-a11y skips an element hidden from assistive technology
  - Version 2 took the platform primitive but not the product rule
    - The rule (dim the page, the closing tap only closes) was written
      nowhere. It lived in the transition sheet's behaviour

```tsx
<div data-menu-backdrop aria-hidden="true" onClick={closeEnclosingMenu} className="fixed inset-0 z-20" />
```

## Root cause of occurrence

*Thought reuse first meant packages and repo helpers, actually it also
covers the browser's own primitives and the app's own components that
already do the job.*

CLAUDE.md says "Reuse first. Look in this repo, then installed packages,
then a maintained library." `Sheet` in this repo already closed on a
backdrop tap and on Escape. `<dialog>` and `popover` are the platform's.
Neither was looked at before version 1. The operator then asked for a
component library, because pragma hand-writes every primitive and four
dantotsus trace to that (see
[ADR-2026-11-03T1438](../adr/2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md)).

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

PR #246 shipped version 3. The menu and the sheet share
`closeOnBackdropTap`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `[self]` on this entry's pull request

```diff
+        if (isHiddenClickTarget(node)) {
+          context.report({ node, messageId: 'hiddenClickTarget' });
+        }
```

`borso/no-raw-interactive-element` now refuses an element hidden from
assistive technology that takes a pointer event, anywhere in
`apps/pragma/site/src`. Version 1's backdrop, put back on a scratch copy,
is refused (measured, 2026-11-03):

```
ScratchBackdrop.tsx:4:10: error borso(no-raw-interactive-element): An element hidden from
assistive technology that takes a pointer event is a hand-written outside-tap catcher
```

The level-1 answer is a library that owns dismissal, focus and scroll lock,
so no primitive is written by hand. It is a new dependency, so it is
[ADR-2026-11-03T1438](../adr/2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md),
proposed for the operator's ratification on the kaizen pull request. The
ADR measured the tap rule (close, and reach nothing) on four libraries.

**Similar instances:** `grep` for an `aria-hidden` element with a pointer
handler over `apps/*/site/src` finds none (measured).
