# ADR-2026-11-19T1802: Scene Mode hosts React Aria overlays through a portal provider

- **Status:** accepted
- **Date:** 2026-11-19
- **Deciders:** Hugo
- **Tags:** pragma, scene-mode, frontend

## Context

Scene Mode opens as a native modal `<dialog>`, which the browser draws in its
top layer. pragma's `Sheet` is a React Aria `ModalOverlay`, and React Aria
portals every overlay to `document.body`, which sits under the top layer. A
Sheet opened from Scene Mode is mounted and focused but never seen. PR #377
met it with the transition popup and built a nested native dialog instead
(`SceneTransitionStrip.tsx`). React Aria offers `UNSAFE_PortalProvider` to send
overlays to another container. It is exported by `react-aria`, which pragma
only had as a transitive dependency of `react-aria-components` 1.22.1, which does not
re-export it. A new direct dependency is an ADR decision.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A panel opened on stage must be visible | A Sheet opened inside Scene Mode is mounted inside the stage dialog (`SceneStage.test.tsx`) |
| One way to open a panel | author | medium | Every hand-built dialog repeats focus, scrim and dismiss work the Sheet already does | Count of raw `<dialog>` popups inside Scene Mode needed for a new panel |
| Dependency cost | author | medium | A dependency is upkeep | Lockfile change and bundle change |

## Decision

**Add `react-aria` 3.53.1 and wrap Scene Mode in `UNSAFE_PortalProvider`.** A
`SceneStage` atom holds the stage dialog for both Scene pages and points React
Aria at it, so a Sheet, popover or tooltip opened on stage renders inside the
top layer. The version is the one `react-aria-components` 1.22.1 already pins,
so the lockfile gains an importer entry and no new package.

## Consequences

- `+` Any Sheet opened from Scene Mode is visible, with its own focus, scrim and swipe to close.
- `+` The two Scene pages share one stage element, so their dialog markup and lint exception exist once.
- `-` The provider's name is `UNSAFE_`: React Aria may rename or change it in a minor release, and an upgrade must check it.
- `-` `react-aria` must move in step with `react-aria-components`, or two copies of the overlay code load.
- `~` The transition popup from PR #377 stays a nested native dialog. Moving it to a Sheet changes how it looks, which is a product call.

## Alternatives considered

### Option A — `react-aria` with `UNSAFE_PortalProvider` (chosen)

- **Raised by:** author
- **Summary:** add the direct dependency and set the portal container once, at the stage.
- **Strengths:**
  - Every React Aria overlay works on stage with no change to `Sheet`.
  - The fix lives at the one place that creates the top layer.
- **Costs:**
  - One direct dependency, already installed at the same version (measured: `pnpm-lock.yaml` +3 lines).
- **Rationale:** it meets the user criterion for every overlay at once and adds no package.

### Option B — a nested native dialog per popup (rejected)

- **Raised by:** author
- **Summary:** keep what PR #377 did, a raw `<dialog>` opened inside the scene for each popup.
- **Strengths:** no dependency.
- **Costs:** each popup rebuilds focus, scrim and dismiss, with its own lint exception.
- **Rejection rationale:** loses on one way to open a panel. It only wins if no second popup is ever opened on stage.

### Option C — `UNSTABLE_portalContainer` on each Sheet (rejected)

- **Raised by:** author
- **Summary:** pass the stage element to `ModalOverlay` through a pragma context that `Sheet` reads.
- **Strengths:** no dependency.
- **Costs:** the prop is marked `@deprecated` in `Modal.d.ts` of 1.22.1 in favour of the provider, and every overlay type would need the same plumbing.
- **Rejection rationale:** builds on an API React Aria already tells callers to leave.

## Scores

|             | Option A | Option B | Option C |
|---|---|---|---|
| Changes the app for its users | ✓ every overlay shows on stage | ✓ only the popups built by hand | ✓ only Sheets |
| One way to open a panel | ✓ Sheet everywhere | ✗ a dialog per popup | ✓ Sheet, plus plumbing |
| Dependency cost | ✓ same version already installed | ✓ none | ✗ a deprecated prop |

## Implementation pointers

- Spec: none, the operator approved the change after PR #377's kaizen
- Plan: none
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/pragma/site/src/components/atoms/SceneStage.tsx`, `apps/pragma/site/src/routes/catalog/SongScenePage.tsx`, `apps/pragma/site/src/routes/setlists/SetlistScenePage.tsx`
- Related ADRs: builds on ADR-2026-11-03T1438
