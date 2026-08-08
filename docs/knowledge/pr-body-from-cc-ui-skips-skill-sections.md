# PRs opened from the Claude Code UI auto-generate a body that skips skill-required sections

## Symptom

When the user opens a PR via the Claude Code web UI (the "Create pull request" affordance on a branch), the harness writes a default PR body — `## Summary`, `## Key Changes`, etc., generated from the diff. The body lands in GitHub without the agent reviewing or editing it.

For features that ran `/visual-validation`, the visual-validation skill's standard requires the PR body to include:

1. A `## Visual evidence` section embedding the screenshots committed under `docs/features/<app>/<slug>/validation/visual-validation-*/`.
2. A `## Validation gaps` section listing every UNVERIFIABLE row verbatim (only required when the verdict was `PASS_EXCEPT_UNVERIFIABLE`).

The auto-generated body has neither. The screenshots stay in the repo, but reviewers reading the PR description don't see them; the UNVERIFIABLE rows stay in the validation report, but reviewers don't see them either. The validation gate's *disclosure* requirement gets silently bypassed.

This first bit PR #11: the body was auto-generated at open time, and the missing sections only surfaced when the agent re-read the visual-validation standard mid-review.

## What to do

Retrofit the body via the GitHub MCP after the PR is open:

1. Generate the visual-evidence markdown. The snippet ships in `/visual-validation`'s standard (look for the `for png in "$report_dir"*.png; do …` block). Pin the URLs to a committed SHA so they don't 404 after merge:

   ```bash
   slug_path=docs/features/<app>/<slug>/validation
   report_dir=$(ls -1td "$slug_path"/visual-validation-*/ 2>/dev/null | head -1)
   sha=$(git rev-parse HEAD)
   repo_path=hugoleborso/borso.fr
   for png in "$report_dir"*.png; do
     rel=${png#./}
     echo "![${png##*/}](https://github.com/$repo_path/raw/$sha/$rel)"
   done
   ```

2. If verdict is `PASS_EXCEPT_UNVERIFIABLE`, copy each UNVERIFIABLE row verbatim from the report into a `## Validation gaps` bulleted list. Each bullet: row number + assertion text + one-line reason + report-path link.

3. Push the new body via `mcp__github__update_pull_request`. Don't try to preserve the auto-generated `## Summary` / `## Key Changes` — those are usually fine, but they read better re-written by the agent who actually understands the PR.

## Why the harness can't do this automatically

The UI doesn't know which features carried `/visual-validation` runs, where their evidence lives, or what verdict came back. The skill's standard *is* the source of truth; the harness defers to it. Until the harness grows a "PR-opened-via-UI hook" that loads the per-feature standard, the agent re-runs the disclosure step after the fact.

## Trigger for the next session

Whenever a `<github-webhook-activity>` event reports a PR opened by the user that the agent has been collaborating on, run:

```
mcp__github__pull_request_read method:get pullNumber:N
```

and grep the `body` field for `## Visual evidence` and `## Validation gaps`. Either missing → retrofit.

## Related

- `.claude/skills/visual-validation/SKILL.md` — *"Visual evidence in the PR body"* section: the source of truth for what the PR body should look like.
- `.claude/skills/technical-validation/SKILL.md` — same disclosure rule for the technical side (when verdict is `PASS_EXCEPT_UNVERIFIABLE` for the technical gate).
