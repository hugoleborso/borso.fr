---
date: 2026-05-05
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#8'
fix-commits: [3a6a89c64c]
eradication-level: 5
eradication-paths: [scripts/browser/broken-images.sh, .claude/agents/visual-validator.md, .claude/skills/implementation/SKILL.md]
time-to-detect: hours
tags: [visual-validation, agent-browser, screenshots, react]
zone: .claude/skills/visual-validation
---

# Described the screenshot, never looked at the pixels

## User impact

The PR #8 description said *"pieces render correctly"*. The operator
opened one of the committed screenshots and saw no chess piece at all.

| | Seen | Expected |
| --- | --- | --- |
| Board squares in the screenshots | the `<img>` alt text, `bR`, `wP`, `bN`, stacked in each square | piece images |
| Inline banner | below the board | above the board, as the spec says |
| Start button | `Start session` | `Drill this variation`, as the spec says |

The operator: *"It is quite clear from the screenshot that the pieces are
not displayed? How did you not check???"*. Every theme except Lichess was
affected (measured in commit e8adcc5).

## Causal chain

- The PR description claimed the pieces rendered, next to screenshots that showed alt text.
  - The main session wrote the claim from the validator's verdict `PASS_EXCEPT_UNVERIFIABLE` and its own reading of the screenshots' layout: three columns, a status panel, banner content, button labels.
    - The visual validator passed rows whose screenshots showed alt text. It asserted DOM presence, such as a square holding a `<div>` of the right size.
      - Its brief at the time (`.claude/agents/visual-validator.md` at ab7c10173) told it to save each screenshot to `evidence_dir` as evidence. No step read the image or checked that an `<img>` loaded.
  - The pieces showed alt text because every sprite URL returned 404.

    ```ts
    // chesscomPieces.tsx, before e8adcc5
    const PIECE_BASE_URL = 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150';
    ```

## Root cause of occurrence

*Thought a validator PASS and a screenshot read for its layout meant the
pixels were right, actually the validator had only checked the DOM, and a
layout can be complete while every image in it is alt text.*

Tag: **Man** (agentic rule). The screenshots were in the main session's
context, and it described them. The prior that a PASS verdict covers
what the image shows won over what the image showed. One more written
rule cannot fix that, since the evidence was already in front of it.

## Detection failure causes

- **Linter:** nothing static can tell whether an `<img src>` resolves.
- **Local run:** the implementer did not open the dev server and look, expecting the validator to.
- **CI:** unit tests do not render the board, and the build does not fetch images.
- **Visual validation:** its brief had no load check on images, so a DOM-present `<img>` that fell back to alt text passed.
- **Self-review of the PR body:** the description named layout facts, not countable visible ones such as "16 black pieces visible", so it read as rigorous without being checked.

## Countermeasure

Commit e8adcc5 fixed the pieces, the banner order and the label. Commit
6533eeb moved to react-chessboard v5, whose bundled SVG pieces cannot be
404'd by a CDN.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`3a6a89c64c`](https://github.com/hugoleborso/borso.fr/commit/3a6a89c64c)
added the self-screenshot rule to `/implementation`. The inline
`agent-browser eval` snippet the original entry quoted is gone. Commit
c122c579d replaced it with `scripts/browser/broken-images.sh`, which exits
1 and lists each `<img>` that fell back to its alt text and each SVG
`<image>` that fails to decode.

What holds today is that script and two written lines that tell an agent
to run it: `.claude/agents/visual-validator.md:68` and
`.claude/skills/implementation/SKILL.md:107`. The script only runs when an
agent remembers the line. That is an instruction, so the level is 5, not
the level 2 the original text claimed.

**Proof it can fail:** not rerun for this rewrite. The script compares the
scan's result to `"[]"` and exits 1 otherwise (read from its source).

**Proposed:** a `PostToolUse` check under `scripts/hooks/checks/`, on
`Bash` calls matching `agent-browser … screenshot`. It would run
`scripts/browser/broken-images.sh` with the same `--session` and fail the
call on a non-zero exit. A screenshot of a page with a broken image could
then never pass silently, whoever took it and whatever brief they had.
The two written lines could then be deleted.

**Similar instances:** `grep -rn broken-images .claude scripts` finds the
two callers above and no others. The third-party sprite class is gone from
`apps/borsouvertures` since 6533eeb.
