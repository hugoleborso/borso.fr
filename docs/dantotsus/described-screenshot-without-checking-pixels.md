---
date: 2026-05-05
introduced-at: implementation
detected-at: review
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/8
fix-pr: https://github.com/hugoleborso/borso.fr/pull/9
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [visual-validation, agent-browser, screenshots, react]
---

# Described the screenshot, never looked at the pixels

## Symptom

After `/visual-validation` returned PASS_EXCEPT_UNVERIFIABLE on PR #8, I wrote
the PR description claiming *"pieces render correctly"* and that the only gaps
were tool-budget UNVERIFIABLE rows. The user opened one of the committed
screenshots and immediately fired back:

> *"It is quite clear from the screenshot that the pieces are not displayed?
> How did you not check???"*

Every square in the committed screenshots showed the `<img>` alt text (`bR`,
`wP`, `bN`, …) stacked together — the third-party CDN sprites were 404-ing.
Visible at a glance. I had described the *layout* (three columns, status
panel, banner content, button labels) without ever asking *"do the pieces
actually render?"*.

Two related defects in the same PR slipped through the same way:
- **Inline banner DOM order** — rendered AFTER `<BoardView>`, so visually
  below the board even though the spec said "above the board". DOM said
  `inline-banner` exists; pixels said `banner.top > board.top`.
- **Start button label** — hard-coded `"Start session"` when the spec said
  `"Drill this variation"`. The DOM had a button; I never re-read its text.

## Root-cause chain

1. **Why did the PR description claim pieces rendered?**
   Because the visual-validator's report said PASS_EXCEPT_UNVERIFIABLE, and I
   took the verdict at face value without inspecting the evidence the
   validator committed.
2. **Why didn't I inspect the evidence?**
   Because *describing the layout from the screenshot* feels indistinguishable
   from *verifying the pixels look right*. The output to the user is prose
   either way.
3. **Why did the validator pass on broken pieces?**
   Because its assertion model is DOM-presence-based: *"is there a
   `.selector-card` with a `<div>` of correct dimensions?"* The agent never
   asked *"did the `<img>` inside actually load?"*.
4. **Why isn't there a load-success check?**
   Because the agent's brief never asked for one. The standard
   `/visual-validation` flow takes a screenshot, narrates the DOM, and writes
   a verdict — there is no step that says *"verify no broken images"*.

**Root cause:** *thought* the validator's PASS verdict + a screenshot in
the conversation was enough to claim correctness; *actually* the validator
only checked DOM-presence, the screenshot bytes were just decorative, and a
visible defect like *"every piece is alt text"* falls through every layer
unless someone explicitly looks at the pixels.

## Detection failure causes

- **Typing:** N/A — runtime rendering issue.
- **Linter / static analysis:** Biome can't reason about whether an `<img
  src>` resolves.
- **Functional validation locally:** Should have caught it — implementer
  spinning up the dev server and looking. Didn't, because the validator was
  expected to do it.
- **CI (tests / build):** Pure-function unit tests don't render the
  chessboard; build only checks bundle output.
- **`/visual-validation`:** PASS verdict; the gap is structural — see Root
  cause step 4.
- **PR description / self-review:** I described the screenshots in text
  using my visual reading, but didn't enumerate concrete elements ("16
  black pieces visible", "no alt text visible"). The description sounded
  rigorous; it was sleepwalking.

## Countermeasure

The user pointed at the broken pieces, I went screenshot-by-screenshot and
found three regressions the validator missed. Fixes shipped in commits
[`e8adcc5`](https://github.com/hugoleborso/borso.fr/commit/e8adcc5) (pieces +
TopBar + Line label) and [`6533eeb`](https://github.com/hugoleborso/borso.fr/commit/6533eeb)
(react-chessboard v5 — eliminates the broken-CDN class of bug entirely by
using the library's bundled SVGs).

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — visual-validator brief mandates a broken-image
scan per screenshot) + procedural rule in `/implementation`.

**Reference:** [PR #9](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-8) ·
this kaizen PR's commits.

**The actual fix:**

1. **Visual-validator now scans for broken images** as a structural
   assertion before declaring any row PASS. Concretely the brief now ships
   an `agent-browser eval` snippet that returns every `<img>` whose
   `complete && naturalWidth === 0` — those are the broken-but-rendered
   alt-text fallbacks. If the list is non-empty for a screenshot, the row
   is FAIL until the source is fixed or the image is explicitly excluded
   (e.g. a placeholder).

   ```diff
    # .claude/skills/visual-validation/standard.md
   + ### Pixel-content checks (every screenshot)
   +
   + Before declaring a row PASS the validator runs the broken-image scan:
   +
   + ```js
   + Array.from(document.querySelectorAll('img'))
   +   .filter((img) => img.complete && img.naturalWidth === 0)
   +   .map((img) => ({ src: img.src, alt: img.alt, parent: img.parentElement?.tagName }))
   + ```
   +
   + Returns the set of `<img>` tags that loaded their alt text instead of
   + the actual image — the canonical "third-party CDN is broken" failure.
   + Non-empty → FAIL the row that covered the screenshot, name the broken
   + src in the report.
   ```

2. **Implementation skill requires per-PR self-screenshot of UI work**
   before declaring the validator-gate clean. The rule lands as a new bullet
   in `.claude/skills/implementation/SKILL.md` "Load-bearing rules":

   ```diff
   + - **Self-screenshot UI work before declaring green.** When the touched
   +   code renders pixels (a component, a CSS change, an asset swap), the
   +   implementer takes a screenshot themselves via `agent-browser` and
   +   inspects it for visible defects (broken images, clipped text,
   +   misplaced banners, hard-coded labels) before claiming the
   +   visual-validator verdict applies. Describing the screenshot in prose
   +   ≠ checking the screenshot; enumerate concrete visible elements ("16
   +   black pieces visible", "Start button reads 'X'") not the layout.
   ```

**Sibling defects swept:**
- `apps/borsouvertures/site/modes/ModeLearnTree.tsx` (banner DOM order — fixed
  commit `99e91a4` in PR #8).
- `apps/borsouvertures/site/App.tsx` (Start button label — same commit).
- The class of "third-party CDN sprites" is structurally eradicated by the
  react-chessboard v5 upgrade (`6533eeb`) — pieces now ship with the JS
  bundle and can't be 404'd by a CDN.

## See also

- [`docs/knowledge/pwa-third-party-cdn-breaks-offline.md`](../knowledge/pwa-third-party-cdn-breaks-offline.md) —
  why third-party image CDNs are a poor fit for PWAs even when they work.
- [`docs/knowledge/visual-validator-image-size-limit.md`](../knowledge/visual-validator-image-size-limit.md) —
  the unrelated validator gap shipped earlier in the same PR.
