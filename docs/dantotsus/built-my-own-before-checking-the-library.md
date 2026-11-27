---
date: 2026-05-05
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#8'
fix-commits: [3a6a89c64c]
eradication-level: 5
eradication-paths: [.claude/skills/implementation/SKILL.md]
time-to-detect: hours
tags: [implementation, skills, deps, react-chessboard]
zone: .claude/skills/implementation
---

# Three options to hand-draw knight arrows the board library already drew

## User impact

The operator asked for L-shaped knight arrows on the borsouvertures chessboard. The agent answered with three options, all built around its own code.

| | Seen | Expected |
| --- | --- | --- |
| The agent's proposal | "A — Custom SVG overlay above the board (recommended). … B — Replace `customArrows` entirely with my own SVG overlay. … C — Drop the L-arrow attempt and use a square highlight instead." About 120 lines of overlay, tests and square-to-pixel math. | "Bump `react-chessboard` to v5, which draws L-shaped knight arrows." |

The operator stopped it: "I am surprised that you need to create your own arrows. First, quickly research for the lib used here, if correct arrows are available." The library's docs showed that `react-chessboard@5.4.0` draws them natively (its PR #208, merged August 2025).

## Causal chain

- The operator received three custom-build options and no library bump.
  - The agent designed its own SVG overlay.
    - The installed API could not draw an L. In v4, `Arrow = [Square, Square, color?]` is a straight line between two squares.
      - The agent built its options from the installed v4 typings only, and read them as the library's API.
        - `apps/borsouvertures/package.json` pinned `"react-chessboard": "^4.3.1"` while v5.4.0 had shipped nine months earlier.
          - Commit `436a5ab3f` (2026-05-04, one day before) ported the chess-openings PWA into the monorepo with that pin. The pin was the input of the port, carried from the original repository.

## Root cause of occurrence

*Thought the pinned version's API is the library's API, actually `react-chessboard` had shipped native L-shaped arrows in v5.4.0, nine months before.* (Material)

The only API in the agent's context was the v4 typings under `node_modules`. The current release notes were not loaded. When the operator asked for them, they answered the question at once. Below that sits a Machine condition. The port carried a major version nine months behind, and nothing in the repository reports a direct dependency a major behind its latest release. Renovate's config (`.github/renovate.json`, added in `56258c2b0`) runs "before 6am on monday", and its first run after the port fell on 2026-05-11, after PR #8.

`docs/knowledge/react-chessboard-l-arrows-v5.md` records the v5 API that the agent was missing.

## Detection failure causes

- **Typing:** the v4 types genuinely lack the feature, so they confirm the wrong belief.
- **Linter:** no rule compares an installed version with the latest one.
- **Local validation:** it would validate the hand-drawn arrow, not reveal the native one.
- **CI:** no job reports a direct dependency a major behind. Renovate and Dependabot open pull requests for majors, but nothing fails while one stays unmerged.
- **Review:** the operator caught it, from surprise, before any code was written.

## Countermeasure

The operator re-routed the work to a version bump. Commit `6533eeb30` (2026-05-11) bumped React to 19 and `react-chessboard` to v5, and the arrows came for free. `apps/borsouvertures/package.json` pins `^5.12.1` today.

## Eradication

**Type:** knowledge (level 5). A written instruction to the agent.

**Reference:** commit [`3a6a89c`](https://github.com/hugoleborso/borso.fr/commit/3a6a89c64c490983d89d7fd88d1f7dfc03c1563a) added a failure mode to `.claude/skills/implementation/SKILL.md`. Today it reads, at line 149:

> **Reinventing what the library already does.** Before writing a "quick custom X" on top of an imported library, read the library's current docs / changelog / `defaultOptions` for the capability you're about to recreate.

`CLAUDE.md` also says "Reuse first. Look in this repo, then installed packages, then a maintained library." The kaizen-layer rule this entry cited once, *Step 2c, Library-search pass*, is gone from `.claude/skills/after-task-kaizen/SKILL.md` (`grep -i librar` finds nothing there).

A written rule is the weakest rung. It reaches the agent only if the skill is loaded, and it still competes with the installed typings in front of it.

**Proposed:** remove the gap the agent read from. Add a CI step that runs `pnpm outdated --format json` and fails when a direct dependency of a workspace is a major version behind its latest release, with the same 14-day wait as the `semver-major-days` cooldown in `.github/dependabot.yml`. The installed API would then be the current API, or the pull request that closes the gap would be open and failing. An agent could no longer read a nine-month-old major as the library.

**Proof it can fail:** none. No check exists to plant against.

**Similar instances:** at the time, every package of a ported app came with the original repository's pins. Run `pnpm outdated -r` to list the direct dependencies a major behind today.
