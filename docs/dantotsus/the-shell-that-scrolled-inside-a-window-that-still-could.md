---
date: 2026-10-05
introduced-at: conception
detected-at: production
severity: medium
related-pr: "#131"
fix-pr: "#131"
fix-commits: [a727402, bf93d2d]
eradication-level: 2
time-to-detect: weeks
tags: [pragma, react, css, tailwind, eslint]
---

# The shell that scrolled inside a window that still could

## Symptom

On an iPhone with pragma installed as an app, the Sessions page showed the
last session card near the top of the screen and an empty band of about
410 points below it, down to the action bar. The tab bar and the action bar
stayed in place. Nothing could be scrolled back into the gap.

## Root-cause chain

1. **Why was there an empty band?** The whole shell had moved up by about
   410 points, and what showed underneath was the body's background. The
   shell's bottom edge, minus the two bottom paddings, landed exactly on the
   last card, which is how the offset was measured from the screenshot.
2. **Why did the shell move?** 410 points is the iOS keyboard with its
   suggestion bar. iOS scrolls the window to bring a focused field into view,
   and in an installed app it does not always scroll it back when the
   keyboard closes.
3. **Why could the window scroll at all?** The shell was `h-dvh` and scrolled
   inside `<main>` with `overflow-y-auto`. That made two scrollers: the one
   the code meant, and the window, which iOS uses for the keyboard whatever
   the layout says.
4. **Why was the inner scroller chosen?** It is the usual shape of a native
   app layout: a fixed frame and a scrolling body. It reads correctly on a
   desktop browser and in every test, which never open a keyboard.

**Root cause:** we thought a shell exactly one screen tall left the window
nothing to scroll; actually iOS scrolls the window for the keyboard anyway,
and with the content inside `<main>` the offset it leaves has nothing under
it.

## Detection failure causes

- **Linter / static analysis:** nothing looked at which element scrolls.
- **Functional validation locally:** the sandbox has no iPhone, and neither
  `scripts/browser.sh` nor `scripts/argent.sh` opens an iOS keyboard.
- **CI (tests / build):** jsdom has no layout and no keyboard.
- **Code review:** the inner-scroller shape is a common, reasonable layout;
  the defect is in how one platform treats it.

## Countermeasure

- **Code:** commit `a727402` — the document became the only scroller. The
  shell is `min-h-dvh`, `<main>` has no overflow class, the desktop sidebar
  is `sticky`, the dialog scroll lock moved to `html:has(dialog[open])`, and
  the bottom action bar reads the window's scroll. A first proposal to reset
  the window offset in JavaScript was rejected by the operator: it would
  have patched the symptom and kept the two scrollers.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — DevX check)

**Where:** `eslint-rules/no-scroll-container-on-main.js`, on for every site
in `eslint.config.js`, cited from
[08. Styling](../standards/08-styling.md).

**What changed:** a `<main>` carrying `overflow-auto`, `overflow-y-auto`,
`overflow-scroll` or `overflow-y-scroll`, with or without a breakpoint
prefix, is a lint error that names this entry. Scroll areas inside dialogs
and scenes are `div`s and stay allowed. Run against the shell as it was
before `a727402`, the rule reports line 182.

**Reference:** [PR #131](https://github.com/hugoleborso/borso.fr/pull/131) ·
commits `a727402`, `bf93d2d`

**The actual fix:**

```diff
-      <main className="flex-1 overflow-y-auto overflow-x-hidden [&:has(dialog[open])]:overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
+      <main className="flex-1 min-w-0 relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
```

**Sibling defects swept:** every `<main>` in `apps/*/site/src` passes the
rule. `apps/banana-rush/site/src/components/organisms/AppShell.tsx` has the
neighbouring shape, an `h-dvh overflow-hidden` frame with form fields inside
it and a web manifest. Its `<main>` does not scroll, so the rule does not
apply, but the same keyboard offset can reach it. It is a single-screen game
layout, so changing it is a layout decision left to the operator rather than
made here.

## See also

- [a-dialog-that-only-collapsed-on-a-phone](./a-dialog-that-only-collapsed-on-a-phone.md),
  the other WebKit-only layout defect, and the rule this one is modelled on.
- [driving-previews-with-agent-browser-and-argent](../knowledge/driving-previews-with-agent-browser-and-argent.md),
  for why a phone pass here still cannot open a keyboard.
