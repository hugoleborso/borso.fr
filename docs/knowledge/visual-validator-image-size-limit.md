# `/visual-validation` crashes when too many high-res screenshots accumulate

A `/visual-validation` run can take a screenshot per assertion, capture it via
`agent-browser screenshot @VIEWPORT` (or `@PAGE`), and reference the bytes back
into the agent's context for reasoning. Past ~20 screenshots — especially
full-page ones at desktop viewports — the cumulative image payload exceeds the
**Anthropic API per-call image-dimension limit (2000 px)** and the agent's
session crashes mid-flight with:

> An image in the conversation exceeds the dimension limit for many-image
> requests (2000px). Start a new session with fewer images.

The crash happens *inside the validator's session*, not at agent-browser. The
screenshots that landed before the crash are committed to disk; the report is
not. This means a perfectly green validation run can show up to the operator
as a no-report failure — and re-running would crash again unless the agent is
told to stay under the cap.

## Why the validator hits this

- Default `agent-browser screenshot` mode captures the full document, not the
  viewport. On a 1280×N desktop layout where N grows to fit a long selector
  list, a single screenshot can be 3000–5000 px tall.
- The validator reads the image bytes back into context for each assertion to
  reason about pixels (e.g. "is the modal centred?"). Each readback adds to
  the per-call payload.
- High-DPI / `deviceScaleFactor: 2` doubles the dimensions of every PNG.
- 20 such PNGs in the same agent turn can each individually exceed 2000 px,
  and the call-time limit applies per image, not per session-total.

## Mitigations the validator brief must enforce

1. **Cap screenshots at ~10** for one validation run. The visual-validator
   skill should pass an explicit cap in the brief; without it, the agent
   tends to take one per assertion.
2. **Prefer viewport screenshots** (`@VIEWPORT`) over full-page (`@PAGE`).
   The viewport bound (e.g. 1280×800) is below the 2000 px ceiling.
3. **Resize the browser per-screenshot.** Mobile assertions: 380×800. Desktop:
   1280×800. Don't run a 1920×1080 viewport unless the assertion is about
   wide-monitor behaviour.
4. **Reference screenshots by filename in the report**, not by re-embedding
   the bytes for every assertion. The first screenshot read informs the
   verdict; subsequent assertions can refer to the file path on disk.
5. **Bail when the cap is reached.** Remaining assertions are flagged
   UNVERIFIABLE with the note "validator screenshot budget exhausted — see
   follow-up validation run." The PR description discloses these per the
   `/visual-validation` PASS_EXCEPT_UNVERIFIABLE protocol.

## Recovery when the validator already crashed

- The screenshots taken before the crash are committed under
  `validation/visual-validation-<ts>/` even though no report was written.
- Re-dispatch the validator with the constraints above and a fresh timestamp.
  Do **not** reuse the old timestamp directory — it carries the abandoned
  screenshots and would confuse a future Dantotsu.
- If both runs crash, the validation gap is genuine; surface it in the PR
  description and consider whether `/visual-validation`'s default brief in
  `.claude/skills/visual-validation/SKILL.md` should bake the constraints in.

## Reference

- First observed: 2026-05-05, borsouvertures `learn-by-tree` validation, 23
  screenshots into the run.
- Related: [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
  (touch-affordance assertions go UNVERIFIABLE for a different reason).
