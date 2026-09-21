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

   Then `mcp__github__create_pull_request` or `update_pull_request`, adding the attribution footer the harness requires.

   **`gh pr edit --attach` does not work from a hosted session, whatever the `gh` version.** The flag is real — 2.99.0 added it on 2026-09-01 — but the upload needs `POST /user/assets`, and every `*.github.com` host here is intercepted by the Claude Code proxy, which answers `403 sessions are bound to their configured repositories`; `gh pr create` also needs GraphQL, which answers `403 GitHub GraphQL is not available from Claude Code sessions`. Screenshots reach the body through step 5b instead.

5b. **Publish the pending screenshots, now that the number exists.** `/visual-validation` left a passing run's PNGs in `<validation_dir>/.pending-upload/<timestamp>/`, gitignored and uncommitted, per [ADR-0023](../../../docs/adr/0023-validation-screenshots-leave-git-for-the-previews-cdn.md). Upload them, then replace the literal `<n>` the report wrote with the real number.

   ```sh
   bucket="$(aws ssm get-parameter --name /borso/shared/previews-bucket-name \
     --query Parameter.Value --output text)"
   aws s3 cp "$pending_dir" "s3://$bucket/screenshots/pr-$pr_number/$timestamp/" \
     --recursive --only-show-errors
   ```

   Each file is then `https://screenshots-pr-<pr_number>.preview.borso.fr/<timestamp>/<file>.png` — the previews CloudFront function routes any `<name>-pr-<n>` host, so this needed no bucket, distribution, certificate or DNS record. The bucket's `expire-previews` rule deletes them after 60 days, so there is nothing to tear down. Embed them under *Validation*, and delete `.pending-upload/` once the body reads back correctly.

   **On `AccessDenied`**, the grant in [`docs/aws-setup.md` §12.6](../../../docs/aws-setup.md) is not applied. Move the staged PNGs back beside the report, commit them, and cite them as raw blob URLs pinned to the head SHA — `https://github.com/<owner>/<repo>/raw/<sha>/<path>`, which renders because this repository is public. Say in one line that the upload was denied, so the next run does not rediscover it.
6. **Read it back.** `pull_request_read method: get`. GitHub deletes an angle-bracket placeholder even inside a code span, which is why the checker refuses one — see [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../../../docs/knowledge/github-mcp-pr-body-sanitizer.md) for what else is confirmed to survive the round trip.

7. **Subscribe, then stop.** One call to `subscribe_pr_activity`, and end the turn. See *Watching the pull request afterwards*.

## Watching the pull request afterwards

**Never schedule a recurring check on a pull request.** No cron, no routine, no `send_later` check-in, no self-re-arming reminder, whatever the harness guidance of the day suggests. The subscription is the mechanism: CI results, reviews, comments and merge-state changes arrive on their own and wake the session. A timer adds nothing on top and costs a wake-up, a round of tool calls and a line in the operator's chat each time it fires; on PR #99 an hourly re-check fired eight times to report the same nine green checks. CLAUDE.md carries the general rule in *Don'ts*.

Once the pull request is open and green: say once that it waits on its reviewers, and end the turn — that is how a session waits. Act when an event arrives, because a red check, a conflict or a review comment is work then. The one thing a subscription misses is an event GitHub never sends, such as a workflow that was never triggered; look for that once, when something else wakes the session.

## What the budget leaves out

Gate results, a file-by-file changelog, a rationale the ADR already carries, and a narration of the work. CI check runs are the source for the first, the diff for the second, the ADR for the third. Writing any of them here creates a second copy that drifts.
