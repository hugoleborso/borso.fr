---
name: open-pr
description: Write a pull request title and body that fit a fixed budget — a 72-character title, a 200-character description, one flow diagram, one decisions table carrying its ADR links, one before-merge block, validation evidence and notable facts. Use when the user says "/open-pr", "open a PR", "create a pull request", when a PR body needs rewriting, or after `/technical-validation` and `/visual-validation`. Drafts from `template.md`, checks with `scripts/pr/check-pr-body.ts`, then posts.
---

# Open-PR skill

A PR body is an **index**, not a report. Depth lives in the tree the body links to — the ADR for a decision, `docs/features/<app>/<slug>/` for the walk that produced it, `docs/dantotsus/` for a trap found on the way. A body that restates CI is a copy that rots while the original does not: a gate table written here said 1411 tests while the suite ran 1426.

The budget is not advice. `scripts/pr/check-pr-body.ts` holds every limit and refuses a draft that breaks one, so the limits are written in one place and this document does not repeat them. Run it with no argument to read them.

## Steps

1. **Draft into a file.** Copy [`template.md`](./template.md) to the scratchpad and fill it. Every section is optional and every decision cell may be empty; an absent section says there was nothing, which is information. The `# ` heading is the PR title and never reaches the body.
2. **Fill it from the tree, not from memory.** Each source answers one section:
   - **Decisions** — one row per ADR referenced by a commit on the branch, by a comment the diff touches, or by the plan. The ADR cell links it. A decision with no ADR goes in the row with an empty ADR cell and a line in *Notable* saying so.
   - **Flow** — the path the change added or moved, drawn from `docs/architecture/` or the diff.
   - **Validation** — what was run and what came back: suites, a browser pass, a live API call.
   - **Before merge** — what the operator does before merging, and what stays broken until they do.
   - **Notable** — what a reviewer would otherwise find only by reading the diff.
3. **Pick the block shape.** *Before merge* and *Validation* are each written as blocks. A `<details>` toggle is the better read and the GitHub MCP body sanitizer deletes it, keeping the contents and flattening them — measured on PR #60 and visible in that PR's own stored body, which says so in place of the toggles it lost. So a body posted through `mcp__github__*` uses `### ` headings, and only a body posted through an authenticated `gh` uses toggles. The checker accepts either and `pretool-github-pr-body.sh` refuses the toggle on the call that would eat it.
4. **Check it.** `pnpm exec tsx scripts/pr/check-pr-body.ts <draft.md>` — fix every violation it names rather than arguing with the count.
5. **Post it.** Title from the `# ` line; body from `--render`, which strips that line and the attribution footer:

   ```sh
   pnpm exec tsx scripts/pr/check-pr-body.ts draft.md --render
   ```

   Then `mcp__github__create_pull_request` or `update_pull_request`, adding the attribution footer the harness requires. With an authenticated `gh` (2.99.0+), `gh pr edit --attach shot.png#alt` uploads a screenshot and writes its link into the body; without it, *Validation* carries links and paths instead.
6. **Read it back.** `pull_request_read method: get`. GitHub deletes an angle-bracket placeholder even inside a code span, which is why the checker refuses one — see [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../../../docs/knowledge/github-mcp-pr-body-sanitizer.md) for what else is confirmed to survive the round trip.

## What the budget leaves out

Gate results, a file-by-file changelog, a rationale the ADR already carries, and a narration of the work. CI check runs are the source for the first, the diff for the second, the ADR for the third. Writing any of them here creates a second copy that drifts.
