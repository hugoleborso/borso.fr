---
date: 2026-11-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#331'
fix-pr: '#337'
fix-commits: [9aaf0398a, 1251ccca5, self]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/lib/screen-placement.adapter.ts, apps/pragma/site/src/lib/screen-placement.core.ts, docs/knowledge/agentic-device-testing.md]
time-to-detect: hours
tags: [pragma, frontend, css, mobile, preview, visual-validation]
zone: apps/pragma/site/src/lib/visual-viewport.adapter.ts
recurs: [a-dialog-that-only-collapsed-on-a-phone]
---

# Four iPhone fixes checked in a browser that could not fail

## User impact

The operator found four bugs on his iPhone in one day, in pragma in
production. Two of them were caused by the fix merged just before.

| | Seen | Expected |
| --- | --- | --- |
| Typing on a page (before #331) | The tab bar and action strip drifted up the screen | Bars at the bottom of the visible screen |
| Typing a setlist note (after #331) | The note field stayed under the keyboard | The field above the keyboard |
| Pulling past the top of a page (after #331) | The tab bar rose with the bounce | The tab bar still |
| Typing a transition comment (after #332) | Save hid while typing | Save visible |
| Scrolling back up the Songs page (after #333) | The filter chips under the title vanished | The chips painted |

## Causal chain

- Each bug reached production.
  - Each fix passed its unit tests, Stryker and an iPhone 13 emulation in
    Chromium (PR #331 body, *Mobile Chromium*).
    - Chromium here has no software keyboard, no rubber-band bounce and no
      WebKit compositor (`ls /opt/pw-browsers` lists Chromium only, measured).
      The four behaviours exist only there.
      - So the tests encoded the states the author thought of. #331's adapter
        read `visualViewport.offsetTop` as the keyboard's scroll, and the
        bounce moves it with no keyboard open.
      - #332 added a footer rule that guessed a save button by
        `type=submit`, and the transition comment's Save is a plain button.
        Nothing here could show either.
  - The pull request named the gap (*Gap: real iOS. The preview on an iPhone
    is the check.*), and each one was merged about twenty minutes after it
    opened (#331: opened 14:40, merged 15:00 UTC, measured). Whether the
    preview was tried on an iPhone before each merge is unknown.

## Root cause of occurrence

*Thought a fix proved in a phone-sized Chromium was proved, actually the
behaviour it fixed lives only in WebKit on a touch device.*

[`agentic-device-testing.md`](../knowledge/agentic-device-testing.md) already
said a 375 px Chromium resize is not a phone test, and named the missing
keyboard. Nothing printed it: its triggers were `scripts/phone.sh`, a viewport
resize and `adb`, and the session wrote `visual-viewport.adapter.ts` and
`keyboard-reveal.adapter.ts`, which matched none of them.

## Detection failure causes

- **Unit tests:** a fake `visualViewport` holds the states the author lists.
  The bounce case was added only in #333, after the operator saw it.
- **Visual validation:** Chromium cannot render the bug.
- **Preview:** the operator is the only iPhone. The pull request said what to
  check in one line, not which states.

## Countermeasure

Already shipped by the pull requests themselves, both by removing a mechanism:

- #337 sets `overscroll-behavior-y: none` on the document, so pragma's page no
  longer bounces. That removes the trigger of the rising tab bar and of the
  vanished chips.
- #333 replaced the `type=submit` guess with a prop a sheet declares,
  `isFooterHiddenWhileTyping`, which only the setlist song sheet sets.

This pull request extends `agentic-device-testing.md` with a table of the
iPhone states a change to the visible screen must be walked through, and gives
it triggers on the files these four PRs edited
(`apps/*/site/src/lib/*viewport*`, `*keyboard*`, `molecules/Sheet.tsx`).

What was left is how a change only an iPhone can show gets caught without
anyone being asked to look. The sweep first offered the operator a checklist
to run on every such pull request, then a WebKit run of a browser suite pragma
does not have. He refused both: a task handed to him per pull request is a
task he will not do.

So pragma checks itself on the device that matters. `watchScreenPlacement`
runs on every page load. Once the visible screen has settled after a resize,
a scroll or a focus change, it measures two things:

- the tab bar's bottom edge against the bottom of the visible screen, with a
  2 px tolerance, unless the bar is hidden;
- the focused input or text area against the visible screen, which must show
  at least 16 px of it.

A breach goes to Sentry as `ScreenPlacementBreach`, tagged
`screen.breach`, with both measured spans, once per kind per page load. It
lands on the Stability column of the 3S board like any other error, so the
next session that reads Sentry fixes it. The operator does nothing but use the
app.

It would have caught three of the four bugs: the drifting bars (#331), the
note under the keyboard (#332) and the tab bar lifted by the bounce (#333).
It cannot see the vanished chips (#337). The compositor dropped a layer the
DOM still measured, which no measurement in the page detects.

On a real layout in Chromium with the iPhone 13 profile, the tab bar's bottom
and the visible bottom both measured 664 px, so the check stays quiet. With
the gap forced to 100 px, the bar measured 564 px against 664 px, which the
core flags (measured, a Playwright probe on `pnpm dev`). That
`getBoundingClientRect` and `visualViewport.offsetTop` share the layout
viewport's frame on iOS Safari too is inferred, not measured. A false report
would carry both spans, which shows it at a glance.

## Eradication

**Type:** detection (level 4), beside two structural removals already on
`main` (#333 `9aaf0398a`, #337 `1251ccca5`)

**Reference:** this kaizen pull request · commit [self]

```diff
 keepFocusedFieldAboveKeyboard();
+watchScreenPlacement();
```

```ts
export function isTabBarOffVisibleBottom(bar: VerticalSpan, visible: VerticalSpan): boolean {
  return isRendered(bar) && Math.abs(bar.bottom - visible.bottom) > PINNED_EDGE_TOLERANCE_PX;
}
```

Reintroducing #331's defect in the adapter test, a tab bar left at 744 to
800 px while the keyboard shrinks the visible screen to 500 px, makes it
report `tab-bar-off-visible-bottom` once the screen settles. The core and the
adapter hold 100% coverage and a mutation score of 100 (measured,
`scripts/mutate-changed.sh`).
