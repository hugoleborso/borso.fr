---
date: 2026-11-15
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#131'
fix-pr: none (this kaizen pull request, number unknown when written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/check-viewport-follows-keyboard.sh, apps/pragma/site/index.html, apps/talos/site/index.html, apps/borsouvertures/site/index.html, apps/banana-rush/site/index.html, apps/last-loop-lepin/site/index.html, apps/borso-fr/site/index.html]
time-to-detect: days
tags: [frontend, css, mobile, pragma, talos, borsouvertures]
zone: apps/pragma/site/index.html
recurs: [the-shell-that-scrolled-inside-a-window-that-still-could]
---

# The keyboard shrank a screen no CSS could see

## User impact

On an iPhone, typing in pragma moved or hid what should have stayed on screen.
The operator reported each case from his phone. Two of them came from the fix
before.

| When | Seen | Expected |
| --- | --- | --- |
| Typing in a form (#131, October) | The whole shell 410 pt up, an empty band below | The page where it was |
| Typing on a page (#331) | Tab bar and action strip floating mid-screen | Bars at the bottom of what is visible |
| Typing a setlist note in a sheet (#332) | The field under the keyboard | The field above it |
| Pulling past the top (#333) | The tab bar lifted with the bounce | The tab bar still |

## Causal chain

- A bar or a field sat where the keyboard covered it, or slid away from the
  visible screen.
  - It was placed with `position: fixed`, `dvh` or `%`, which measure the
    layout viewport.
    - The keyboard did not shrink the layout viewport. Every app declares
      the viewport without `interactive-widget`, so the default applies:

      ```html
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      ```

      - Under that default, the keyboard shrinks only the visual viewport,
        and iOS pans it over a layout viewport that keeps its full height.
  - Each fix then emulated the missing resize for one state.
    - #131 moved the scroll from `<main>` to the document, because iOS
      scrolled the window for the keyboard.
    - #331 offset the bars by `innerHeight - visualViewport.height`, read
      from `visualViewport` events.
    - #333 clamped that offset, because the bounce moves `offsetTop` with no
      keyboard open.
    - #332 scrolled the focused field into view after each resize.

## Root cause of occurrence

*Thought `fixed` and `dvh` measure the screen the user sees, actually they
measure the layout viewport, which the keyboard leaves at full height unless
the page asks for `interactive-widget=resizes-content`.*

The [CSS Viewport draft](https://drafts.csswg.org/css-viewport/), read this
session: "resizes-visual: Interactive UI widgets MUST resize the visual
viewport but MUST NOT resize the initial viewport. If no value, or an invalid
value, is set for interactive-widget, the behavior implied by resizes-visual
is used as the default." And: "resizes-content will cause a resize of both
the initial and visual viewports."

Had the shell been written knowing this, the viewport meta would have asked
for `resizes-content`, and no JavaScript would have chased the keyboard.

## Detection failure causes

- **Typing and lint:** a viewport meta is a string in `index.html`. No check
  read it.
- **Local validation:** the sandbox's Chromium opens no software keyboard
  (`ls /opt/pw-browsers` lists Chromium only, measured), so the two viewports
  never differ here.
- **CI:** jsdom has no layout. Each fix's unit tests fed a fake
  `visualViewport` the states its author thought of. The bounce case
  entered only in #333.
- **Review:** each fix was reviewed against the symptom reported, not against
  the viewport model. #131's entry named the window scroll and stopped there.

## Countermeasure

Every page an app serves now declares `interactive-widget=resizes-content`:
the six `index.html` files and borso-fr's four static pages. The keyboard then
shrinks the layout viewport, so fixed bars, `dvh` frames and sheets follow it
without code.

The browsers that honour it are Chrome for Android from 108, Firefox for
Android from 133 and Safari on iOS from 27.3 (measured, MDN
browser-compat-data 8.1.9). Whether Safari 27.3 has shipped, and which iOS
the band runs, is unknown. pragma's Sentry events carry no browser or OS
(measured, every prod error has an empty `browser`), because the app
collects no headers by design.

So pragma's emulation stays for older iPhones:
`visual-viewport.adapter.ts`, `keyboard-reveal.adapter.ts`, and
`screen-placement.adapter.ts`, which reports a tab bar or a focused field off
the visible screen to Sentry. Where `resizes-content` applies, the first
writes a gap of 0, because `innerHeight` and `visualViewport.height` shrink
together. Its existing test *writes no gap while the visible area fills the
layout viewport* covers that state.

The sandbox cannot open a keyboard, so the change was not seen on a device.
It is verified on the next iPhone that runs Safari 27.3, by the
screen-placement alarm staying silent.

## Eradication

**Type:** structural impossibility (level 1) on browsers that honour
`interactive-widget`, held by a DevX check (level 2) on every page.

**Reference:** this kaizen pull request · commit [self]

```diff
-      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
+      content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
```

`scripts/check-viewport-follows-keyboard.sh` reads every tracked HTML file
under `apps/` that declares a viewport, so a new app or page is checked
without a list. It reads the tag across lines, because oxfmt wraps it, and it
fails when it finds no viewport at all: its first version matched one line,
and after formatting it passed by checking nothing. Pre-commit runs it on a
staged app HTML file, and the CI build job on every pull request. Proof on a scratch copy of talos's page:

```text
[check-viewport-follows-keyboard] apps/talos/site/index.html: the viewport meta lacks interactive-widget=resizes-content.
    Append it to the content, so the keyboard shrinks what fixed, % and dvh measure.
exit 1
```

Similar instances, found with
`grep -rnE '\bfixed\b[^"]*(bottom|inset)|h-dvh|min-h-dvh' apps/*/site/src`:

- talos: `TodoQuickAdd` is a text field fixed above a fixed tab bar, the shape
  of #331, and `ToastViewport` sits on the same bottom.
- borsouvertures: a fixed `TabBar` and `ActionBar`.
- banana-rush: an `h-dvh overflow-hidden` frame around form fields, which
  #131's entry flagged.
- borso-fr: `StudioRail`, fixed at the top with `max-h-[88dvh]`.

All of them follow the keyboard wherever `resizes-content` applies. On an
iPhone below Safari 27.3 they stay exposed. pragma alone has the emulation
and the alarm there (inferred, not seen on a device). The class is eradicated
on supporting browsers, not yet on older iPhones.
