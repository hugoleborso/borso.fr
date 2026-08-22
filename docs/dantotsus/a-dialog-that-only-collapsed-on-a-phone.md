---
date: 2026-08-21
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#83'
fix-pr: '#86'
fix-commits: [ba27e49]
eradication-level: 2
time-to-detect: hours
tags: [pragma, frontend, react, eslint, css, mobile, visual-validation]
---

# A dialog that only collapsed on a phone

## Symptom

The operator opened the preview on an iPhone, tapped **Song defaults** on a
setlist entry, and got a title bar. No form, no fields, no buttons — a strip
about forty pixels tall with the song's name and a close cross, floating on the
backdrop. The same dialog on the same branch, in the sandbox's Chromium at the
same 402 px width, drew all four fields and both buttons.

The first reading was that the dialog had rendered with empty data. It had not.
Every field was in the DOM at its correct value; the box around them had
resolved to zero height.

## Root-cause chain

1. **Why?** The dialog's scrolling body had `flex-1`, and its computed height
   was 0.
2. **Why?** `flex-1` is Tailwind for `flex: 1 1 0%`. The `0%` is
   `flex-basis`, and a percentage basis resolves against the container's
   main-size — here the column's height.
3. **Why did that resolve to zero?** The dialog set `max-h-[calc(100dvh-1.5rem)]`
   and no `h-`. A `max-height` is not a definite height: the box's height comes
   from its content. So the container asks its children how tall they are, and
   the child's basis asks the container how tall it is.
4. **Why did the cycle end at zero rather than at the content's height?** The
   CSS Flexbox specification says a percentage basis that cannot be resolved
   behaves as `content`… but only *after* the container's size is known. When
   the container's size depends on the item, the spec makes the percentage
   behave as `auto`, and `min-height: 0` — which `min-h-0` sets, and which the
   markup carried to let the scroller shrink — removes the automatic minimum
   that would otherwise have floored it at the content height. Zero is
   conformant.
5. **Why was that never seen locally?** Blink does not implement the cycle that
   way. Given the same markup it resolves the basis against the content and
   draws the dialog correctly. WebKit follows the specification. Every check on
   this branch ran in Chromium.

**Root cause:** thought `flex-1` means *take the remaining space*, actually it
means *start from zero and grow*, and in a column whose own height comes from
its content there is no remaining space to grow into — an engine that follows
the specification is entitled to draw nothing.

## Detection failure causes

- **Typing:** a class name is a string. Nothing in TypeScript reads Tailwind.
- **Linter / static analysis:** no rule knew the shape. Tailwind's own plugin
  checks class validity, not layout consequences; `flex-1` is a perfectly valid
  class.
- **Functional validation locally:** the unit tests render into jsdom, which
  computes no layout at all — `getBoundingClientRect` returns zeros for
  everything, so a dialog of zero height is indistinguishable from a correct
  one.
- **CI (tests / build):** same jsdom, same blindness.
- **Code review:** the diff added the two dialogs' markup in one hunk each. A
  reviewer reading `flex min-h-0 flex-1 flex-col` sees the idiom that appears
  in six other files of the same repository, four of which are correct because
  their dialog carries `h-dvh` or `h-[85vh]`. The wrong half is invisible
  without checking the ancestor.
- **PO / QA validation:** this is where it was caught, by the operator on a
  real phone. The browser pass that preceded it ran `set viewport 390 844` in
  Chromium and reported the dialog fine, which was true of Chromium.

## Countermeasure

- **Code:** commit [`4f3cf8a`](https://github.com/hugoleborso/borso.fr/commit/4f3cf8a) —
  both dialogs' inner column and scroller move from `flex-1` to `flex-auto`
  (`flex: 1 1 auto`), whose basis is the content. The child now has a height
  before the container asks, the cycle never forms, and both engines agree.
  Verified against the deployed preview bundle by fetching the served CSS and
  confirming `.flex-auto{flex:auto}` with no remaining `flex min-h-0 flex-1
  flex-col`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a lint rule rejects the shape at commit time)

Level 1 was considered and rejected. Structural impossibility here means a
`DialogShell` component owning the sizing so no dialog hand-writes the chain,
which is a migration across the twelve files that open a `dialog` element in
this repository — a refactor whose correctness cannot be checked from this
sandbox on the one engine where it matters. The lint rule reaches every one of
those files today, and a shell can still be built later on top of a tree the
rule keeps honest.

**Reference:** PR #86 · commit [`ba27e49`](https://github.com/hugoleborso/borso.fr/commit/ba27e49)

**The actual fix:** a new ESLint rule, `borso/no-flex-one-in-auto-height-dialog`,
on `SITE_FILES`. It walks each `dialog` JSX element, returns early when the
element declares its own height, and reports any descendant carrying `flex-1`
whose parent declares `flex-col`:

```js
JSXElement(node) {
  if (readElementName(node) !== 'dialog') return;
  const classTokens = readClassTokens(node);
  if (declaresItsOwnHeight(classTokens)) return;
  const isColumn = classTokens.includes(COLUMN_CLASS);
  for (const child of collectZeroBasisColumnChildren(node, isColumn, [])) {
    context.report({ node: child, messageId: 'zeroBasisChild' });
  }
}
```

The two conditions are what keeps it quiet on the code that is already correct:
`SetlistSongPicker` (`h-[85vh]`) and `SongScenePage` (`h-dvh`) declare a height,
so their `flex-1` scrollers pass; `AttachSetlistDialog`'s `flex-1` label sits in
a row, not a column, so its main axis is the width the dialog already has. The
rule's test file carries the pre-fix markup verbatim as its first invalid case
and reports two errors on it, which is the evidence that it would have caught
this.

**Sibling defects swept:** `LineupEditor.tsx` had the identical shape and was
fixed in the same commit — it is the other dialog on the branch with a
content-derived height. The remaining ten dialog files were checked by running
the rule over both applications' site sources: clean.

## See also

- [`docs/knowledge/agentic-device-testing.md`](../knowledge/agentic-device-testing.md) —
  its list of what Safari does differently names scroll chaining, `100vh`
  against the dynamic toolbar, and touch event ordering. Layout
  spec-conformance was not on it; it is now.
- [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md) —
  the neighbouring lesson that a synthetic click is not a tap. This one is
  worse, because no gesture is involved at all: the engine renders differently
  with nobody touching it.
