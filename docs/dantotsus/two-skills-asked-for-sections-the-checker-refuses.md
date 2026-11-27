---
date: 2026-10-02
introduced-at: conception
detected-at: local
severity: low
related-pr: '#107'
fix-commits: [50410b2179]
eradication-level: 5
eradication-paths: [.claude/skills/open-pr/SKILL.md, .claude/skills/visual-validation/SKILL.md]
time-to-detect: weeks
tags: [skill, pr-body, process, meta]
zone: .claude/skills/visual-validation/SKILL.md
weak-point: prose-stands-in-for-a-check
recurs: none (two-copies-that-had-to-agree-and-nothing-made-them is two code lists, this is skill prose against a checker)
---

# Two skills asked for sections the checker refuses

## User impact

Opening PR #107 took three drafts instead of one. The session that opened it
reported the counts below.

| | Seen | Expected |
| --- | --- | --- |
| First draft, following `/visual-validation` to the letter | `check-pr-body.ts` answers with twelve violations | A body the checker accepts |
| Second draft, screenshots inline as the same skill said | `pretool-github-pr-body.sh` refuses the call, because the GitHub MCP server strips markdown images | Screenshots named by path |

Two of the twelve violations:

```
[pr-body] Validation gaps: unknown section, allowed: Flow, Decisions, Before merge, Validation, Notable, Inventory, Shipped, Patterns
[pr-body] Visual evidence: unknown section, allowed: Flow, Decisions, Before merge, Validation, Notable, Inventory, Shipped, Patterns
```

Every session that followed `/visual-validation`, `/implementation`,
`/technical-validation` or `/tech-lead-orchestrator` to the PR was exposed.
A session that went straight to `/open-pr` was not.

## Causal chain

- The checker refused the first draft.
  - The draft carried a `## Validation gaps` and a `## Visual evidence`
    section, with inline images.
    - `/visual-validation` prescribed them, written on 2026-05-03 in
      `f6e54e33e` and `b9307fb64`:

      ```
      The operator opening the PR must surface the UNVERIFIABLE rows in the PR description under a `## Validation gaps` heading.
      ```

    - `check-pr-body.ts` refuses any section outside its list.
      - Commit `358251c06` (2026-09-16) wrote the checker with its own
        section list and rewrote `/open-pr` to match. It changed no other
        skill.
        - Its input was the `/open-pr` contract. The commit message says
          "three files restating one contract was the context cost the
          operator named", meaning the three files of `/open-pr`.
- The second draft was refused by the MCP hook.
  - `/visual-validation` asked for inline images.
    - The knowledge entry on the MCP sanitizer was written after the skill
      and never linked back to it.

## Root cause of occurrence

*Thought the pull-request body's shape lived in `/open-pr`, so rewriting
`/open-pr` beside the checker kept every copy in step. Actually five more
skills each prescribed headings of their own: `/visual-validation`,
`/implementation` step 8, `/technical-validation`, the ship stage of
`/tech-lead-orchestrator` and `/adr`.* (Material, inferred.)

The writer of `358251c06` knew copies drift. The same commit deletes
`open-pr/standard.md` for that reason. The other skills were outside the files
the task named, and nothing pointed from the checker to them. Below that sits
a Machine cause. One shape had six sources of truth and only one of them was
tied to a gate.

## Detection failure causes

- **Static analysis:** prose has no build step. A model follows a skill, then
  a checker refuses the result.
- **CI:** nothing checks skills against `SECTION_NAMES` in
  `scripts/pr/pr-body.core.ts`. CI runs the checker on
  `.claude/skills/open-pr/template.md` only.
- **Code review:** each skill reads correctly on its own. Only the pair is
  wrong.

## Countermeasure

The body was rewritten with the gaps as `### Gap:` blocks under
`## Validation` and the screenshots named by path.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `50410b2`. The body's shape is written down in one
place, `/open-pr`'s *Validation* step. Four other documents keep only what
they own, the obligation to disclose and what to disclose, and point at
`/open-pr` for the headings:

```diff
-The operator opening the PR must surface the UNVERIFIABLE rows in the PR description under a `## Validation gaps` heading.
+own the body's shape, and this document does not name a heading.
```

This entry first claimed level 1. It is level 5. The change edits skills only,
and a sixth copy survived it. `.claude/skills/adr/SKILL.md:157` still says
"The PR description's `## Architecture choices` section is *built from the
ADRs*", with nested `<details>` levels and *Known gaps*. None of those is in
`SECTION_NAMES`. That text dates from `92aea42fd` (2026-05-12), so the sweep in
`50410b2` missed it rather than a later skill adding it.

The PreToolUse check `scripts/hooks/checks/gh-pr-create.core.ts` runs
`validateBody` on every `gh pr create`. It refuses a wrong body, but that
refusal is the defect itself, a wasted draft. It does not stop a skill from
asking for the wrong section.

**Proposed:** add a test beside `scripts/pr/pr-body.core.test.ts` that reads
every `.claude/**/*.md`, collects each heading it prescribes for the PR body,
and fails on any name missing from `SECTION_NAMES`. Fix `/adr` in the same
change by deleting its *What `/open-pr` reads back* section and pointing at
`/open-pr`. A skill that asks for a section the checker refuses would then
fail at commit, before any agent follows it. That would be level 2.

**Similar instances:** `git grep -n -E '## (Validation gaps|Visual evidence|Architecture choices|Known gaps)' -- .claude`
finds only `.claude/skills/adr/SKILL.md:157` today. The MCP sanitizer is in
[`github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md).
The same shape with two code lists is
[`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md).
