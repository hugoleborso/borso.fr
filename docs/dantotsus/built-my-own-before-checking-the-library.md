---
date: 2026-05-05
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/8
fix-pr: https://github.com/hugoleborso/borso.fr/pull/9
fix-commits: []
eradication-level: 4
time-to-detect: hours
tags: [implementation, skills, deps, react-chessboard]
---

# Started writing my own L-arrow util before checking the library

## Symptom

User asked for L-shaped knight arrows. I jumped to designing my own SVG
overlay component (~120 lines + tests + math for square-to-pixel coordinates)
and quoted three options:

> *"A — Custom SVG overlay above the board (recommended). … B — Replace
> `customArrows` entirely with my own SVG overlay. … C — Drop the L-arrow
> attempt and use a square highlight instead."*

User pulled me back:

> *"A if you manage to get uniformity, but I am surprised that you need
> to create your own arrows. First, quickly research for the lib used here,
> if correct arrows are available."*

Five minutes later the library docs revealed `react-chessboard@5.4.0`
shipped this exact feature natively (PR #208, merged August 2025). The
custom-overlay plan was wasted design work; the right move was a `pnpm`
version bump.

## Root-cause chain

1. **Why did I propose a custom build first?**
   Because the v4 API I had in hand (`Arrow = [Square, Square, color?]`)
   couldn't express a knight L-shape. I extrapolated *"the lib can't do
   this"* from *"the version we pin can't do this"*.
2. **Why didn't I check the latest version?**
   Because the install was already working — the upgrade decision felt
   "out of scope" and the library wasn't on my mental shortlist of
   load-bearing surfaces to revisit.
3. **Why isn't checking-upstream a habit?**
   No procedural prompt for it. The `/implementation` skill walks the plan
   top-to-bottom; the plan never says *"before writing new code, check the
   relevant library's latest release for this feature."*
4. **Why does it matter beyond this one row?**
   Same pattern bit the visual-validator session 1 (where I would have
   built a custom screenshot-byte-management helper before realising the
   API hard-limit was a vendor fact, not something to design around) and
   shows up across the PR — every reach for "I'll write this from scratch"
   on a vendor surface is suspect.

**Root cause:** *thought* the pinned-version's API is the library's API;
*actually* libraries ship features, and the gap between *what we have* and
*what's available* is one `npm view <pkg> versions` call away. No
procedural step in the implementation flow forces that call.

## Detection failure causes

- **Typing:** N/A — the typed API of v4.7.3 genuinely lacks the feature.
- **Linter:** Can't reason about "is there a better library version?".
- **Functional validation locally:** Validates the wrong-shape arrow; can't
  surface the *missed-feature-upstream* defect.
- **CI:** Same.
- **`/visual-validation`:** Would have FAILed the L-arrow row, but doesn't
  point at the library upgrade.
- **`/technical-validation`:** Reviews the diff vs the plan, not vs the
  upstream library's release notes.
- **Self-review:** *"It's a clan-only app, just write the SVG overlay"* —
  the absence of a procedural prompt to check upstream made the
  reinvent-it path look like the natural choice.

## Countermeasure

User's intervention re-routed the work to `pnpm install
react-chessboard@^5.4.0`, which forced a React 19 workspace bump alongside,
and absorbed the L-arrow + a year of other upstream fixes for free.

## Eradication (mandatory — code-level)

**Type:** Procedural / detection rule in `/implementation` (level 4 —
detection at the right step of the workflow). The matching "Pattern
Coherence pass" already exists in `/technical-conception` for the
*planning* stage; what was missing is the same discipline applied at
*implementation* time when a new pattern is being written from scratch.

**Reference:** [PR #9](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-8) ·
this kaizen PR.

**The actual fix:**

```diff
 # .claude/skills/implementation/SKILL.md
   "Failure modes to avoid" section
+ - **Reinventing what the library already does.** Before writing a new
+   utility / component that overlaps a vendor's domain (board renderer,
+   chess engine, animation primitive, drag-and-drop, etc.), run a
+   one-minute upstream check:
+   ```
+   npm view <pkg> versions --json | tail -20
+   ```
+   Then skim the changelog / recent merged PRs of the latest major. If the
+   feature you're about to build already ships, the right move is a
+   version bump — not a custom util. Document the trade-off in the kaizen
+   commit if a bump isn't viable (peer-dep conflict, etc.).
```

Cross-link to the existing `/technical-conception` *Pattern Coherence*
pass — same anti-pattern at a different layer:

```diff
 # docs/knowledge/audit-imported-deps-and-patterns-when-planning.md
+ ## Related: at implementation time
+
+ Pattern Coherence at planning catches *carrying forward existing deps
+ without justification*. The matching trap at implementation is *writing
+ new code that the library already ships*. See
+ [`docs/dantotsus/built-my-own-before-checking-the-library.md`](../dantotsus/built-my-own-before-checking-the-library.md).
```

**Sibling defects swept:** none in this PR — but the new `/implementation`
rule will fire next time the agent reaches for "I'll just write a small
helper that does what react-chessboard / chess.js / vite-plugin-pwa /
react-dnd already does."

## See also

- [`docs/knowledge/audit-imported-deps-and-patterns-when-planning.md`](../knowledge/audit-imported-deps-and-patterns-when-planning.md) —
  the planning-stage analogue (Pattern Coherence pass).
- [`docs/knowledge/react-chessboard-l-arrows-v5.md`](../knowledge/react-chessboard-l-arrows-v5.md) —
  the specific upstream feature this dantotsu rediscovered.
