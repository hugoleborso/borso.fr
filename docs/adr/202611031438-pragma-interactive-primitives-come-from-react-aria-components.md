# ADR-202611031438: pragma's interactive primitives come from React Aria Components

- **Status:** proposed
- **Date:** 2026-11-03
- **Deciders:** Hugo
- **Tags:** pragma, front-end, design-system, dependencies

## Context

pragma has no component library. Every interactive primitive is hand-written: `Sheet`, `ConfirmDialog` and `Menu` over a native `<dialog>`, the sheet's swipe gesture, the energy bar's drag. Each one rediscovered a platform edge case after it shipped. Four dantotsus trace to that (measured, `grep` over `docs/dantotsus/`): [the energy bar that wrote on a scroll](../dantotsus/a-control-that-wrote-before-the-gesture-was-decided.md), [the dialog that collapsed on a phone](../dantotsus/a-dialog-that-only-collapsed-on-a-phone.md), [the shell that scrolled inside the window](../dantotsus/the-shell-that-scrolled-inside-a-window-that-still-could.md) and [the menu only its own button could close](../dantotsus/the-menu-that-only-its-own-button-could-close.md). The menu fix of PR #246 was then written three times (a hand-written backdrop, a native popover, a modal dialog) before it met the operator's rule ([the-menu-written-three-times](../dantotsus/the-menu-written-three-times.md)). The operator asked on 2026-11-03 for an easy-to-use component library.

The rule any candidate must meet is the one the operator set on PR #246: a tap outside an open menu closes it, and that tap does nothing else. The constraints that close doors: React 19 (`pnpm-workspace.yaml` catalog), Tailwind with pragma's own Notebook tokens ([ADR-0047](./0047-pragma-design-system-is-notebook-with-grafts.md)), so the library must be unstyled; a phone-first installed app, so touch handling matters more than desktop; one developer pays for each migration. A new dependency is an ADR decision under CLAUDE.md.

## Decision

**React Aria Components (`react-aria-components`), adopted one primitive at a time, starting with `Menu`.** It passes the operator's tap rule out of the box, it is unstyled and takes Tailwind classes through data attributes, and it is the lighter of the two candidates that pass (52.9 KB against Base UI's 64.3 KB gzipped for a menu and a dialog, measured). Its press handling is built for touch, which is the class of three of the four dantotsus above (inferred from React Aria's documentation, not measured here).

## Consequences

- `+` A menu, a dialog, a popover, a select and their dismissal, focus return and scroll lock come from one maintained source, so the next primitive does not rediscover them.
- `+` The hand-written code shrinks: `closeOnBackdropTap`, `menu-anchor.utils.ts` and the anchor-positioning rule in `tokens.css` go once `Menu` moves.
- `-` 52.9 KB gzipped of JavaScript for a menu and a dialog (measured, esbuild minified, React external). pragma loads it on every screen that has a `more` menu.
- `-` The visible shadow under an open menu is ours to style. The measurement below checked dismissal, not the dimming.
- `-` `borso/no-raw-interactive-element` names the files that own a raw `<button>` or `<dialog>`. Each migration moves that ownership to the library wrapper.
- `~` One dependency, `react-aria-components` 1.22.1, peer React 16.8 to 19.

## Alternatives considered

### Option A — React Aria Components (chosen)

- **Raised by:** author
- **Summary:** Adobe's unstyled components (`MenuTrigger`, `Menu`, `MenuItem`, `Popover`, `Modal`, `Dialog`), styled with Tailwind.
- **Strengths:**
  - Tap outside closes the menu and does not reach the page (measured, below).
  - 52.9 KB gzipped for a menu and a dialog (measured).
  - Last published 2026-10-09 (`npm view`, measured).
- **Costs:**
  - The heaviest API surface of the four: a trigger, a popover and a menu per menu.
- **Rationale:** It meets the operator's rule at the lower weight of the two that do.

### Option B — Base UI (`@base-ui/react`) (rejected)

- **Raised by:** author
- **Summary:** The unstyled library from the Radix and Material UI authors, 1.9.0.
- **Strengths:**
  - Tap outside closes the menu and does not reach the page (measured).
  - A compact API close to Radix.
- **Costs:**
  - 64.3 KB gzipped for a menu and a dialog (measured), 11.4 KB more than Option A.
- **Rejection rationale:** It loses on weight only. If the operator prefers its API, it is the fallback, and the decision flips at no other cost.

### Option C — Radix Primitives (rejected)

- **Raised by:** author
- **Summary:** `@radix-ui/react-dropdown-menu` 2.2.1 and `@radix-ui/react-dialog` 1.3.1.
- **Strengths:**
  - The lightest, 33.6 KB gzipped (measured).
- **Costs:**
  - With its defaults the tap that closed the menu also clicked the button under it (measured). That is the exact behaviour the operator rejected on PR #246.
- **Rejection rationale:** It fails the operator's rule by default.

### Option D — Ark UI (rejected)

- **Raised by:** author
- **Summary:** `@ark-ui/react` 5.40.0, on Zag state machines.
- **Strengths:**
  - 42.9 KB gzipped (measured).
- **Costs:**
  - With its defaults a tap outside did not close the menu, and the tap reached the page (measured).
- **Rejection rationale:** It fails the operator's rule by default.

### Option E — keep hand-writing primitives (rejected)

- **Raised by:** author
- **Summary:** Keep `Sheet`, `ConfirmDialog` and `Menu` on the native `<dialog>`, as today.
- **Strengths:**
  - No JavaScript added. The current `Menu` meets the operator's rule.
- **Costs:**
  - Four dantotsus and one primitive written three times (measured above). The next primitive starts from zero again.
- **Rejection rationale:** It is what the operator asked to leave.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Meets the tap rule by default | high | The operator set it on PR #246 |
| Unstyled, Tailwind-friendly | high | ADR-0047's tokens stay the look |
| Weight | medium | Every screen with a menu loads it |
| Easy to use | medium | The operator's own words |

|             | A React Aria | B Base UI | C Radix | D Ark UI | E Hand-written |
|---|---|---|---|---|---|
| Tap rule | ✓ measured | ✓ measured | ✗ tap reached the page | ✗ menu stayed open | ✓ today's `Menu` |
| Unstyled | ✓ | ✓ | ✓ | ✓ | ✓ |
| Weight (gzip) | 52.9 KB | 64.3 KB | 33.6 KB | 42.9 KB | 0 |
| Easy to use | ✓ one import per part | ✓ | ✓ | ✓ | ✗ each edge case rediscovered |

**How the tap rule was measured.** A page held one menu and a button under it. Playwright's Chromium emulated an iPhone 13, tapped the trigger, then tapped the button's position. Each library used its documented minimal menu with default props. Weights come from `esbuild --bundle --minify` of each library's menu and dialog imports, with React external, then `gzip -9`.

## Implementation pointers

- Migrate `Menu` first, keep its `MenuProps`, and keep its five callers unchanged. The shadow keeps `bg-scrim`.
- Then `Sheet` and `ConfirmDialog` on `ModalOverlay` and `Modal`, which retires `modal-dialog.adapter.ts`.
- Update `borso/no-raw-interactive-element`'s owner lists in the same commit as each move.

## Index update

Added to `docs/adr/README.md`.
