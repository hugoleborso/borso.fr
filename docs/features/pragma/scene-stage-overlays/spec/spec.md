# Scene Mode hosts the app's panels

## Goal

A panel the app opens while Scene Mode is on screen shows on top of the stage.
Nothing else on stage changes. The decision is
[ADR-2026-11-19T1802](../../../../adr/2026-11-19T1802-scene-mode-hosts-react-aria-overlays-through-a-portal-provider.md).

## What the musician sees

1. The setlist Scene Mode opens full screen from a setlist, on its dark stage, at 375 px wide and at desktop width, as before.
2. The song Scene Mode opens full screen from a song page, as before.
3. Closing Scene Mode with its close control or the Escape key returns to the page it was opened from.
4. In the setlist Scene Mode, the one-line transition strip above the transport opens the transition popup, and the popup shows on top of the stage and closes again.
5. A real touch swipe to the left on the chart opens the next song, and to the right the previous one.
6. The arrow keys still change song in the setlist Scene Mode on a desktop browser.

## Out of scope

No screen opens a Sheet on stage yet. The ADR's test proves a React Aria panel
mounts inside the stage.
