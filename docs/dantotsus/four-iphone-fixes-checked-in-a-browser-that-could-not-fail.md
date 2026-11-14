---
date: 2026-11-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#331'
fix-pr: '#337'
fix-commits: [9aaf0398a, 1251ccca5, self]
eradication-level: 5
eradication-paths: [docs/knowledge/agentic-device-testing.md]
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

What is left is how a change that only an iPhone can check gets checked. That
changes what the operator is asked for, so it is his call:

| Option | What he sees day to day | Cost |
| --- | --- | --- |
| A. Preview checklist | On a pull request whose diff touches `visualViewport`, `overscroll`, `position: fixed` or `sticky`, the preview comment lists the iPhone states from the table to try before merging | One more list on those pull requests, none on the others |
| B. WebKit in CI | A Playwright WebKit run of pragma's e2e on every pull request touching it | Linux WebKit has no iOS keyboard or bounce (inferred), so it would have caught none of these four, only layout bugs like the collapsed dialog. Added CI time unknown |
| C. Keep as is | The pull request names the gap in one line, as #331 did | Nothing new |

Recommendation: A. The operator's iPhone is the only detector, and A tells it
where to look.

## Eradication

**Type:** knowledge (level 5), with two level-1 removals already on `main`
(#333 `9aaf0398a`, #337 `1251ccca5`)

**Reference:** this kaizen pull request · commit [self]

```diff
 triggers:
+  paths:
+    - 'apps/*/site/src/lib/*viewport*'
+    - 'apps/*/site/src/lib/*keyboard*'
+    - 'apps/*/site/src/components/molecules/Sheet.tsx'
   commands:
```

The entry's path triggers match the two adapters these PRs created and the
sheet two of them edited, so the next edit of any of them prints the table.
