---
date: 2026-10-05
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#131'
fix-commits: [a7274029bd, bf93d2d593]
eradication-level: 2
eradication-paths: [eslint-rules/no-scroll-container-on-main.js, .oxlintrc.json]
time-to-detect: weeks
tags: [pragma, react, css, tailwind, eslint]
zone: apps/pragma/site/src/components/organisms/AppShell.tsx
---

# The shell that scrolled inside a window that still could

## User impact

Pragma's band members on an iPhone with the app installed. Desktop browsers
and Android were not reported affected.

| | Seen | Expected |
| --- | --- | --- |
| Sessions page, after typing in a field and closing the keyboard | The last session card near the top of the screen and an empty band of about 410 points below it, down to the action bar. Nothing scrolled back into the gap | The page fills the screen down to the action bar, as before the keyboard opened |

Measured from the operator's screenshot. The shell's bottom edge, minus the
two bottom paddings, landed exactly on the last card.

## Causal chain

- An empty band of about 410 points showed below the last card.
  - The whole shell had moved up by about 410 points, and the body's
    background showed underneath.
    - iOS scrolled the window to bring a focused field above the keyboard.
      410 points is the keyboard with its suggestion bar. In an installed app
      it did not always scroll the window back when the keyboard closed.
      - The window could scroll because the shell was one screen tall and
        scrolled inside `<main>`. That made two scrollers: the one the code
        meant, and the window, which iOS uses for the keyboard whatever the
        layout says. ← the faulty line, `AppShell.tsx` before `a727402`

        ```tsx
        {/* a second scroller inside a window iOS still scrolls for the keyboard */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden [&:has(dialog[open])]:overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        ```

        - An agent wrote the shape in `e29454948` (2026-05-20, "rewire
          AppShell"), as `h-screen flex` around `<main className="flex-1
          overflow-y-auto">`. It is the usual native app layout, a fixed frame
          and a scrolling body, and it reads correctly on a desktop browser.
          - **Material:** nothing in the agent's context described how iOS
            treats the window when the keyboard opens. The input was a
            familiar layout and a desktop rendering.

## Root cause of occurrence

*Thought a shell exactly one screen tall left the window nothing to scroll,
actually iOS scrolls the window for the keyboard anyway, and with the content
inside `<main>` the offset it leaves has nothing under it.* **Material:** no
document or tool in the writer's context showed the iOS keyboard, and the
sandbox cannot open one.

The measurement above is the source. The offset equals the keyboard's
height, and it shows only after a field was focused.

## Detection failure causes

- **Linter:** before `bf93d2d`, no rule looked at which element scrolls.
- **Local validation:** the sandbox has no iPhone, and neither agent-browser
  nor `scripts/phone.sh` opens an iOS keyboard
  ([driving-previews-with-agent-browser-and-argent](../knowledge/driving-previews-with-agent-browser-and-argent.md)).
- **CI:** jsdom has no layout and no keyboard.
- **Review:** the inner-scroller shape is common and reads as reasonable. The
  defect lies in how one platform treats it.

## Countermeasure

Commit `a727402` made the document the only scroller. The shell is
`min-h-dvh`, `<main>` has no overflow class, the desktop sidebar is `sticky`,
the dialog scroll lock moved to `html:has(dialog[open])`, and the bottom
action bar reads the window's scroll. A first proposal to reset the window
offset in JavaScript was rejected by the operator. It would have patched the
symptom and kept the two scrollers.

```diff
-      <main className="flex-1 overflow-y-auto overflow-x-hidden [&:has(dialog[open])]:overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
+      <main className="flex-1 min-w-0 relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
```

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #131](https://github.com/hugoleborso/borso.fr/pull/131),
commits `a727402` and `bf93d2d`. `bf93d2d` registered the rule in
`eslint.config.js`. `9dcf74547` (#197) replaced ESLint with oxlint, and the
rule now runs from `.oxlintrc.json` on `apps/*/site/**/*.{ts,tsx}`.

`eslint-rules/no-scroll-container-on-main.js` reports a `<main>` carrying
`overflow-auto`, `overflow-y-auto`, `overflow-scroll` or `overflow-y-scroll`,
with or without a breakpoint prefix. Run against the shell as it was before
`a727402`, the rule reports line 182.

The rule keys on the element. The same two-scroller shell built on a
`<div>` passes it. So the class stays open everywhere except pragma, which
also runs `borso/no-vertical-scroll-container` (`.oxlintrc.json`, the
`apps/pragma/site/src/**` block). That rule forbids any vertical scroll
utility outside `Sheet.tsx` and the two scene pages.

**Proposed:** turn `borso/no-vertical-scroll-container` on for every
`apps/*/site/src/**` file, with each app's own sheet files in its
`scrollFiles` option, and delete `no-scroll-container-on-main.js` and its
test. One rule then covers the class on any element, and one rule is
removed. It would still not see banana-rush's frame below, because
`overflow-hidden` is not a scroller.

**Proof it can fail:** the rule's test, `eslint-rules/no-scroll-container-on-main.test.js`,
plants the pre-`a727402` `<main>` class list and expects the report.

**Similar instances:** every `<main>` in `apps/*/site/src` passes the rule.
`apps/banana-rush/site/src/components/organisms/AppShell.tsx` has the
neighbouring shape, an `h-dvh overflow-hidden` frame with form fields inside
it and a web manifest. Its `<main>` does not scroll, but the same keyboard
offset can reach it. It is a single-screen game layout, so changing it is a
layout decision for the operator. The other WebKit-only layout defect, and
the rule this one is modelled on, is
[a-dialog-that-only-collapsed-on-a-phone](./a-dialog-that-only-collapsed-on-a-phone.md).
