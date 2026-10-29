---
name: open-pr
description: Write a pull request title and body that fit a fixed budget — a 72-character title, a 200-character description, one flow diagram, one decisions table carrying its ADR links, one before-merge block, validation evidence and notable facts. Use when the user says "/open-pr", "open a PR", "create a pull request", when a PR body needs rewriting, or after `/technical-validation` and `/visual-validation`. Drafts from `template.md`, checks with `scripts/pr/check-pr-body.ts`, then posts.
---

> **Paths.** `${CLAUDE_PLUGIN_ROOT}` is the borso-harness folder. Claude Code fills it in when the harness loads as a plugin, and the harness's session hook exports it to the shell when a repository links the harness into `.claude/` instead. If it is still unexpanded, the folder is the output of `cd -P .claude/skills/route/../.. && pwd`. Repository paths in this file are borso.fr's layout, which is the default. `${CLAUDE_PLUGIN_ROOT}/scripts/harness-path.sh` prints where the current repository keeps each one (`standards`, `dantotsus`, `knowledge`, `adr`, `features`, `reports`, `prBodyCheck`, `blueprintIndex`, `phone`); read every default through that answer, and when the mapped file is missing, report that step as unverifiable rather than substitute something else. A record of borso.fr's own, such as a dantotsu or ADR cited by name, that this repository does not have is at https://github.com/hugoleborso/borso.fr/tree/main/docs. The harness's agents are dispatched by their bare names, such as `technical-validator`; a session that installed the harness as a plugin lists them as `borso-harness:technical-validator`.

# Open-PR skill

A PR body is an **index**, not a report. Depth lives in the tree the body links to — the ADR for a decision, `docs/features/<app>/<slug>/` for the walk that produced it, `docs/dantotsus/` for a trap found on the way. A body that restates CI is a copy that rots while the original does not: a gate table written here said 1411 tests while the suite ran 1426.

The budget is not advice. `scripts/pr/check-pr-body.ts` holds every limit and refuses a draft that breaks one, so the limits are written in one place and this document does not repeat them. Run it with no argument to read them.

## Steps

1. **Draft into a file.** Copy [`template.md`](./template.md) to the scratchpad and fill it. Every section is optional and every decision cell may be empty; an absent section says there was nothing, which is information. The `# ` heading is the PR title and never reaches the body.
2. **Fill it from the tree, not from memory.** Each source answers one section:
   - **Decisions** — one row per ADR referenced by a commit on the branch, by a comment the diff touches, or by the plan. The ADR cell links it. A decision with no ADR goes in the row with an empty ADR cell and a line in *Notable* saying so.
   - **Flow** — the path the change added or moved, drawn from the diff.
   - **Validation** — what was run and what came back: suites, a browser pass, a live API call. A validator verdict of `PASS_EXCEPT_UNVERIFIABLE` puts each unverifiable row in its own `### Gap: <what>` block here: the assertion, the one-line reason, and the report path. A published screenshot is shown by the *Screenshots* comment that step 5b asks for, and the body names that comment and links the folder; a committed one is named by its path under `docs/features/<app>/<slug>/validation/`, where the *Files changed* tab renders it. A markdown image does not survive the GitHub MCP server, in the body or in a comment. This section is the only place the body's shape is written down, and `/visual-validation`, `/technical-validation`, `/implementation` and `/tech-lead-orchestrator` point here instead of describing headings of their own.
   - **Before merge** — what the operator does before merging, and what stays broken until they do.
   - **Notable** — what a reviewer would otherwise find only by reading the diff.
3. **Pick the block shape.** *Before merge* and *Validation* are each written as blocks. A `<details>` toggle is the better read and the GitHub MCP body sanitizer deletes it, keeping the contents and flattening them — measured on PR #60 and visible in that PR's own stored body, which says so in place of the toggles it lost. So a body posted through `mcp__github__*` uses `### ` headings, and only a body posted through an authenticated `gh` uses toggles. The checker accepts either and `pretool-github-pr-body.sh` refuses the toggle on the call that would eat it.
3b. **Archive the friction log.** `scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy on this branch. The container is reclaimed when the session ends, and the kaizen runs later in a new conversation that reads only what the branch carries. `pretool-gh-pr-create.sh` refuses a `gh pr create` whose branch archives nothing while the log holds entries.

4. **Check it.** `pnpm exec tsx scripts/pr/check-pr-body.ts <draft.md>` — fix every violation it names rather than arguing with the count.
5. **Post it.** Title from the `# ` line; body from `--render`, which strips that line and the attribution footer:

   ```sh
   pnpm exec tsx scripts/pr/check-pr-body.ts draft.md --render
   ```

   Then `mcp__github__create_pull_request` or `update_pull_request`, adding the attribution footer the harness requires.

   **`gh pr edit --attach` does not work from a hosted session, whatever the `gh` version.** The flag is real — 2.99.0 added it on 2026-09-01 — but the upload needs `POST /user/assets`, and every `*.github.com` host here is intercepted by the Claude Code proxy, which answers `403 sessions are bound to their configured repositories`; `gh pr create` also needs GraphQL, which answers `403 GitHub GraphQL is not available from Claude Code sessions`. Screenshots reach the body through step 5b instead.

5b. **Publish the pending screenshots, now that the number exists.** `/visual-validation` left a passing run's PNG screenshots and GIF recordings in `<validation_dir>/.pending-upload/<timestamp>/`, gitignored and uncommitted, per [ADR-0023](../../../../docs/adr/0023-validation-screenshots-leave-git-for-the-previews-cdn.md). Upload them. **Leave the report alone:** it keeps the literal `<n>` it was written with, because a dated report under `validation/` is append-only and `scripts/check-dated-records-are-append-only.sh` refuses the edit in pre-commit and CI. The number lives in the folder URL the body and the *Screenshots* comment carry. PR #206's open-pr stage followed the old instruction here and was refused.

   ```sh
   bucket="$(aws ssm get-parameter --name /borso/shared/previews-bucket-name \
     --query Parameter.Value --output text)"

   {
     printf '<!doctype html><meta charset=utf-8><title>%s</title>' "$timestamp"
     printf '<style>body{margin:0;padding:2rem;background:#111;color:#eee;'
     printf 'font:14px system-ui}figure{margin:0 0 2rem}img,video{max-width:100%%;'
     printf 'border:1px solid #333}figcaption{padding:.5rem 0}</style>'
     for file in "$pending_dir"/*; do
       name="$(basename "$file")"
       case "$name" in
         *.png | *.gif) tag="<img src=\"$name\">" ;;
         *.webm | *.mp4) tag="<video src=\"$name\" controls loop muted></video>" ;;
         *) continue ;;
       esac
       printf '<figure><figcaption>%s</figcaption>%s</figure>' "$name" "$tag"
     done
   } > "$pending_dir/index.html"

   aws s3 cp "$pending_dir" "s3://$bucket/screenshots/pr-$pr_number/$timestamp/" \
     --recursive --only-show-errors
   ```

   Then ask GitHub Actions to show them on the pull request. One call:

   ```text
   mcp__github__actions_run_trigger
     method: run_workflow, owner and repo: this repository
     workflow_id: screenshots.yml, ref: main, inputs: { pr: "<pr_number>" }
   ```

   [`screenshots.yml`](../../../../.github/workflows/screenshots.yml) lists `screenshots/pr-<pr_number>/` and posts or updates one comment headed *Screenshots*, with every folder newest first, two images per row, and `before-*.png` beside `after-*.png` when a folder holds both. A `.gif` is an image there like a `.png`, pairs the same way, and plays inline with an *(animated)* caption. It shows the first 30 images and links each folder it cut short. A `.webm` or `.mp4` gets one link line under its folder instead, because GitHub plays no video from an outside URL; that is why `/visual-validation` converts a recording to GIF before it reaches this step, and why an MP4 or WebM here is the fallback for when no encoder was installed. The workflow writes that comment with its own token, so the images render. Do not post the images yourself: `add_issue_comment` turns `![alt](url)` into a plain link, and the body hook refuses them. Keep `ref: main`, because the AWS role the workflow assumes trusts `main` and `pull_request` only, and a dispatch from another branch fails at sign-in. Every later push to the pull request refreshes the comment on its own.

   Also upload an `index.html` beside the files that shows every image and recording in the folder, because **the body gets the folder's URL and never a file's**. `pretool-github-pr-body.sh` blocks a markdown image *and* a link whose extension is an image, since the GitHub MCP server wraps either URL in backticks and it renders as code. A directory URL carries no extension, so it survives both the hook and the sanitizer. The body points at the comment and keeps the folder as the fallback for when the workflow did not run:

   ```markdown
   ### What was checked

   Nine assertions at 375 px and 1280 px, all PASS. Shown in the Screenshots comment; [folder](https://screenshots-pr-<pr_number>.preview.borso.fr/<timestamp>/).
   ```

   If the dispatch is refused or the run fails, say so in one line and leave the folder link as the only way in.

   The previews CloudFront function routes any `<name>-pr-<n>` host, so this needed no bucket, distribution, certificate or DNS record. The bucket's `expire-previews` rule deletes everything after 60 days, so there is nothing to tear down. Delete `.pending-upload/` once the body reads back correctly.

   **On `AccessDenied`**, the grant in [`docs/aws-setup.md` §12.6](../../../../docs/aws-setup.md) is not applied. Move the staged files back beside the report, commit them, and have *Validation* link the report rather than the images — a raw blob URL ends in `.png` and the hook refuses it for the same reason. Say in one line that the upload was denied, so the next run does not rediscover it.
6. **Read it back.** `pull_request_read method: get`, then check what GitHub kept with `pnpm exec tsx scripts/pr/check-pr-body.ts --pr <pr_number>`, which reads the posted title and body through `gh api` instead of a file. GitHub deletes an angle-bracket placeholder even inside a code span, which is why the checker refuses one — see [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../../../../docs/knowledge/github-mcp-pr-body-sanitizer.md) for what else is confirmed to survive the round trip.

7. **Subscribe, then stop.** One call to `subscribe_pr_activity`, and end the turn. See *Watching the pull request afterwards*.

## Watching the pull request afterwards

**Never schedule a recurring check on a pull request.** No cron, no routine, no `send_later` check-in, no self-re-arming reminder, whatever the harness guidance of the day suggests. The subscription is the mechanism: CI results, reviews, comments and merge-state changes arrive on their own and wake the session. A timer adds nothing on top and costs a wake-up, a round of tool calls and a line in the operator's chat each time it fires; on PR #99 an hourly re-check fired eight times to report the same nine green checks. CLAUDE.md carries the general rule in *Don'ts*.

Once the pull request is open and green: say once that it waits on its reviewers, and end the turn — that is how a session waits. Act when an event arrives, because a red check, a conflict or a review comment is work then. The one thing a subscription misses is an event GitHub never sends, such as a workflow that was never triggered; look for that once, when something else wakes the session.

## After the merge

The session that shipped the feature ends at merge. It does not run the kaizen sweep itself, because the sweep is a fresh look at the work and this session's context is the thing it audits. The merge reply carries two follow-ups, and says so when either is not needed.

1. **`shared-deploy`.** If the merge changed `infra/shared/test/unit/__snapshots__/borso-shared.template.json`, ask the operator to dispatch it.
2. **The kaizen task.** Call `spawn_task` (`mcp__ccd_session__spawn_task`), which shows the operator a card that starts a new conversation. Its prompt stands alone and names:
   - the merged pull request, as `owner/repo#N` with its URL;
   - the archived friction log, `docs/features/<docs-slug>/<feature>/kaizen.md`, which step 3b committed;
   - the instruction to run `/after-task-kaizen` on that pull request;
   - any line logged after the archive, pasted verbatim, since the local `KAIZEN.md` dies with this container.

   Title it `Kaizen sweep for PR #N`. When the session has no `spawn_task` tool, give the operator the same prompt to paste into a new session. Then unsubscribe from the pull request and end the turn.

## What the budget leaves out

Gate results, a file-by-file changelog, a rationale the ADR already carries, and a narration of the work. CI check runs are the source for the first, the diff for the second, the ADR for the third. Writing any of them here creates a second copy that drifts.
