# ADR-2026-11-03T1438: pragma's interactive primitives come from React Aria Components

- **Status:** accepted
- **Ratified:** by the operator on PR #249 on 2026-11-03 ("Aria ok"), with one condition: the app's UI must not change, so each migrated component is styled to match today's screens and any visible difference is presented
- **Date:** 2026-11-03
- **Deciders:** Hugo
- **Tags:** pragma, front-end, design-system, dependencies

## Context

pragma has no component library. It hand-writes 16 interactive primitives, from the menu and the bottom sheet to the slider and the snackbar (measured, `grep` for roles, dialogs and inputs under `apps/pragma/site/src/components/`). Each one rediscovered a platform edge case after it shipped. Four dantotsus trace to that (measured): [the energy bar that wrote on a scroll](../dantotsus/a-control-that-wrote-before-the-gesture-was-decided.md), [the dialog that collapsed on a phone](../dantotsus/a-dialog-that-only-collapsed-on-a-phone.md), [the shell that scrolled inside the window](../dantotsus/the-shell-that-scrolled-inside-a-window-that-still-could.md) and [the menu only its own button could close](../dantotsus/the-menu-that-only-its-own-button-could-close.md). The menu fix of PR #246 was then written three times ([the-menu-written-three-times](../dantotsus/the-menu-written-three-times.md)). The operator asked on 2026-11-03 for an easy-to-use component library.

Constraints that close doors: React 19, Tailwind with pragma's own Notebook tokens ([ADR-2026-10-27T1115](./2026-10-27T1115-pragma-design-system-is-notebook-with-grafts.md)), so the library must ship no look of its own; a phone-first installed app; one developer pays for each migration. A new dependency is an ADR decision under CLAUDE.md.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | The band uses pragma at rehearsal; a library must not change what they see or how a tap behaves unless we choose it | Renders of each library's docs demo next to pragma's current primitive, and the tap rule run below |
| Component coverage | operator | high | A library that covers half the primitives leaves the other half hand-written, which is the problem | Each of the 16 primitives looked up in the library's exports, and its doc page checked |
| Passes the menu tap rule by default | author | high | The operator set it on PR #246: a tap outside closes the menu and does nothing else | Playwright, emulated iPhone 13, default props |
| Weight | author | medium | Every screen loads it | `esbuild --minify`, React external, `gzip -9`, for all the components the library covers |

## Decision

**React Aria Components (`react-aria-components` 1.22.1), adopted one primitive at a time, starting with `Menu`.** It covers all 16 primitives, passes the tap rule by default, and ships no look, so pragma keeps its own. Ark UI also covers all 16 and is lighter, but failed the tap rule by default. Base UI passes the tap rule but has no file drop and is the heaviest. Radix covers 12.

## Consequences

- `+` All 16 primitives, including the bottom sheet with swipe, come from one maintained source, so the next primitive does not rediscover dismissal, focus return or scroll lock.
- `+` The look stays pragma's. React Aria ships no styles, and its docs demos show its own example CSS, not a theme the app would inherit.
- `-` The select changes for users. Every candidate replaces the native `<select>` with its own list, so iPhone users lose the system wheel picker on the fields that use `EnumSelectField` (inferred from the four docs demos, which all draw their own list). Keeping the native select there is a choice the migration can make per field.
- `-` Up to 122 KB gzipped of JavaScript if all 16 move (measured). pragma's main bundle is 408 KB gzipped today (measured, `pnpm build`), so that is up to 30% more on first load. The hand-written code it replaces comes off that, by an amount not measured.
- `-` Its toast is still `UNSTABLE_Toast` in 1.22.1 (measured, from its exports). The snackbar would move last.
- `-` `borso/no-raw-interactive-element` names the files that own a raw `<button>` or `<dialog>`. Each migration moves that ownership to the library wrapper.

## Alternatives considered

### Option A — React Aria Components (chosen)

- **Raised by:** author
- **Summary:** Adobe's unstyled components, styled with Tailwind through data attributes. [Docs](https://react-aria.adobe.com/Menu).
- **Strengths:**
  - Coverage 16 of 16, including `Sheet` for the bottom sheet (measured).
  - Tap rule passes (measured).
- **Costs:**
  - 122 KB gzipped for the 16 (measured).
  - The toast is unstable.
- **Rationale:** The only option that covers everything and passes the tap rule.

### Option B — Base UI (`@base-ui/react` 1.9.0) (rejected)

- **Raised by:** author
- **Summary:** The unstyled library from the Radix and Material UI authors. [Docs](https://base-ui.com/react/components/menu).
- **Strengths:**
  - Tap rule passes (measured).
  - A `drawer` for the bottom sheet (measured, from its exports).
- **Costs:**
  - Coverage 15 of 16, no file drop (measured).
  - 139 KB gzipped for its 15, the heaviest (measured).
- **Rejection rationale:** It loses on coverage and weight. It is the fallback if the operator prefers its API.

### Option C — Radix Primitives (rejected)

- **Raised by:** author
- **Summary:** One package per primitive. [Docs](https://www.radix-ui.com/primitives/docs/components/dropdown-menu).
- **Strengths:**
  - 55 KB gzipped for its 12 (measured).
- **Costs:**
  - Coverage 12 of 16. No bottom sheet, no number stepper, no search with suggestions, no file drop (measured).
  - The tap that closed the menu also clicked the button under it (measured).
- **Rejection rationale:** It fails the tap rule and leaves four primitives hand-written.

### Option D — Ark UI (`@ark-ui/react` 5.40.0) (rejected)

- **Raised by:** author
- **Summary:** Components on Zag state machines. [Docs](https://ark-ui.com/docs/components/menu).
- **Strengths:**
  - Coverage 16 of 16 (measured).
  - 113 KB gzipped for the 16, lighter than Option A (measured).
- **Costs:**
  - With its defaults a tap outside did not close the menu, and the tap reached the page (measured).
- **Rejection rationale:** It fails the tap rule by default. Whether a prop fixes it is not measured. If one does, Ark wins on weight.

### Option E — keep hand-writing primitives (rejected)

- **Raised by:** author
- **Summary:** Keep the native `<dialog>` and pragma's own components.
- **Strengths:**
  - Nothing changes for users, and no JavaScript is added.
- **Costs:**
  - Four dantotsus and one primitive written three times (measured above).
- **Rejection rationale:** It is what the operator asked to leave.

## Scores

|             | A React Aria | B Base UI | C Radix | D Ark UI | E Hand-written |
|---|---|---|---|---|---|
| Changes the app | ✗ the select loses the native picker; look unchanged | ✗ same | ✗ same, and the menu tap reaches the page | ✗ same, and the menu stays open | ✓ nothing changes |
| Coverage | ✓ 16 of 16 | ✗ 15, no file drop | ✗ 12 | ✓ 16 of 16 | ✗ 0, all by hand |
| Tap rule | ✓ | ✓ | ✗ | ✗ | ✓ today's `Menu` |
| Weight (gzip) | 122 KB | 139 KB | 55 KB | 113 KB | 0 |

**How it was measured.** Coverage maps each pragma primitive to a component in the library's package exports, and each mapped doc page returned 200 where a made-up page returned 404. The tap rule put one menu over one button, tapped the trigger, then tapped the button's position, in Playwright's Chromium emulating an iPhone 13. Renders of every docs demo at 375 px, beside pragma's current primitive, are in the gallery linked from the pull request.

## Implementation pointers

- Migrate `Menu` first, keep `MenuProps` and its five callers unchanged, and keep the `bg-scrim` shadow.
- Then `Sheet` and `ConfirmDialog`, which retires `modal-dialog.adapter.ts`.
- Decide per field whether a select keeps the native picker.
- Update `borso/no-raw-interactive-element`'s owner lists in the same commit as each move.

## Index update

Listed in `docs/adr/README.md`.

## Revisions

### Revision 2026-11-03 — measured after the migration

What changed: 14 primitives moved and 8 stayed hand-written, with the reasons in `docs/standards/05-frontend-architecture.md`. The main bundle went from 408 KB to 510 KB gzipped (measured, `pnpm build`).
Why: `EnergyMeter` stays, because React Aria's slider sets the value on pointerdown, the defect in its dantotsu. `TransposeStepper`, `PickableSongRow`, `TaskRow` and `Input` stay, because React Aria would change their look or their focus. `EnumSelectField` and `UndoSnackbar` stay, as decided above.
Implication for the original decision: still valid.
