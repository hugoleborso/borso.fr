---
date: 2026-08-21
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#83'
fix-commits: [ba27e49627]
eradication-level: 2
eradication-paths: [eslint-rules/no-flex-one-in-auto-height-dialog.js, apps/pragma/site/src/components/molecules/Sheet.tsx]
time-to-detect: hours
tags: [pragma, frontend, react, eslint, css, mobile, visual-validation]
zone: apps/pragma/site/src/components/organisms
recurs: [two-audits-that-sent-no-touch-events]
---

# A dialog that only collapsed on a phone

## User impact

Every band member on an iPhone was affected on the PR #83 preview. The operator tapped **Song defaults** on a setlist entry and got a title bar: a strip about forty pixels tall with the song's name and a close cross, floating on the backdrop. Every field was in the DOM at its correct value. The box around them had resolved to zero height. The same dialog in the sandbox's Chromium at the same 402 px width drew all four fields and both buttons. Chromium and desktop users were not affected.

| | Seen | Expected |
| --- | --- | --- |
| **Song defaults** on iOS Safari | A 40 px title bar, no field, no button | The four default fields and the two buttons |

## Causal chain

- On iOS Safari the dialog drew only its title bar.
  - The dialog's scrolling body had a computed height of 0.
    - The body carried `flex-1`, Tailwind for `flex: 1 1 0%`, inside a column whose own height came from its content.

      ```tsx
      // SongDefaultsDialog in 62c1ce06d
      <dialog className="m-auto … max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden …">
        …
        <div className="flex min-h-0 flex-1 flex-col">   {/* ❌ a 0% basis in a column with no definite height */}
      ```

      - The `0%` basis resolves against the container's height. A `max-height` is not a definite height, so the container asks the child how tall it is while the child's basis asks the container. The CSS Flexbox specification then makes the percentage behave as `auto`, and `min-h-0` removes the automatic minimum that would have floored it at the content height. WebKit follows the specification and draws zero. Blink resolves the basis against the content and draws the dialog.
    - Commit `62c1ce06d` (2026-08-21, written by an agent) added the dialog by copying the column of `LineupEditor.tsx`, the sibling dialog it opens beside. That file already carried `className="flex min-h-0 flex-1 flex-col"` in an auto-height dialog (measured with `git grep` at `62c1ce06d^`).
      - Every dialog wrote its own sizing chain, and no shared shell owned it. Of the six files using the idiom, four were correct only because their dialog declared `h-dvh` or `h-[85vh]`. The nearest example was one of the two that did not. (Machine)

## Root cause of occurrence

*Thought `flex-1` means "take the remaining space", actually it means "start from zero and grow", and in a column whose height comes from its content there is no remaining space, so an engine that follows the specification may draw nothing.*

Machine. The agent copied the idiom from the dialog next to it, which was latent with the same defect. A correct example existed in the same app, but its correctness depended on an ancestor's `h-` class that the copied markup did not show. The codebase had no dialog shell that owned the height, so each dialog's correctness depended on which neighbour it was copied from.

## Detection failure causes

- **Typing:** a class name is a string, and nothing in TypeScript reads Tailwind.
- **Linter:** Tailwind's plugin checks that a class exists, not what it does to layout. `flex-1` is valid.
- **Local validation and CI:** the unit tests render into jsdom, which computes no layout. `getBoundingClientRect` returns zeros for everything, so a collapsed dialog looks like a correct one.
- **Browser pass:** it ran `set viewport 390 844` in Chromium, which resolves the cycle the other way. Every check on the branch ran in Blink.
- **Code review:** the markup matched an idiom in six files. The wrong half is invisible without reading the ancestor.
- **QA:** the operator caught it on a real phone.

## Countermeasure

Commit [`4f3cf8a`](https://github.com/hugoleborso/borso.fr/commit/4f3cf8a1f) moved both dialogs' inner column and scroller from `flex-1` to `flex-auto` (`flex: 1 1 auto`), whose basis is the content. The child has a height before the container asks, so the cycle never forms and both engines agree. `LineupEditor.tsx` was fixed in the same commit. Verified against the deployed preview by fetching the served CSS and finding `.flex-auto{flex:auto}` and no remaining `flex min-h-0 flex-1 flex-col`.

## Eradication

**Type:** DevX check (level 2), plus a structural shell in pragma.

**Reference:** commit [`ba27e49`](https://github.com/hugoleborso/borso.fr/commit/ba27e4962) (PR #86) added `borso/no-flex-one-in-auto-height-dialog`. `.oxlintrc.json` sets it to `error` today. It walks each `dialog`, `Dialog` or `Modal` JSX element, returns early when the element declares its own height, and reports a `flex-1` child of a `flex-col` parent:

```js
const DIALOG_ELEMENTS = new Set(['dialog', 'Dialog', 'Modal']);
…
if (!DIALOG_ELEMENTS.has(readElementName(node))) return;
if (declaresItsOwnHeight(classTokens)) return;
```

The first version of this entry rejected a shared shell as too large a migration. Commit `de91fdfe8` (PR #216) then built it. `apps/pragma/site/src/components/molecules/Sheet.tsx` wraps React Aria's `Modal` and `Dialog`, owns the column, and sizes its body with `SHEET_BODY_CLASS`, which uses `flex-auto`. 34 pragma files render a `<Sheet>` (measured with `grep -rln "<Sheet\b"`), so none of them writes a sizing chain.

The level stays 2. The rule reads only the children written inside the dialog element. Content passed to `Sheet` from another component is out of its reach (inferred from the rule's tree walk), so inside pragma it is the shell that holds.

**Proof it can fail:** the rule's test file carries the pre-fix markup verbatim as its first invalid case and reports two errors on it (`eslint-rules/no-flex-one-in-auto-height-dialog.test.js`).

**Similar instances:** `git grep -ln "<dialog" -- 'apps/*.tsx'` finds four files, one of them `SceneStage.test.tsx`. `SceneStage.tsx` and `SceneTransitionStrip.tsx` are pragma's full-screen scene dialogs. `Sheet.tsx`, pragma's shell, renders React Aria's `Modal` instead of a native `<dialog>`. `apps/borsouvertures/site/src/components/atoms/Modal.tsx` is the only dialog of borsouvertures, so it is already that app's shell. Apps cannot import each other, so one shell per app is the reachable shape. [`agentic-device-testing.md`](../knowledge/agentic-device-testing.md) now lists layout spec-conformance among what Safari does differently.
