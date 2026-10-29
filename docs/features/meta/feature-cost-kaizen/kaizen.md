# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [02:18] `dantotsu-classifier` dantotsu front matter has no field for whether the defect was in product code or in the harness, so classifying 223 entries needed a hand-written name list
- [02:21] `ci-metrics` gh CLI reports GH_TOKEN invalid yet gh api works through the proxy, so the auth status line misleads about API access
- [02:29] `claude-md-draft` CLAUDE.md states 'Never --no-verify' as a hard rule but no PreToolUse hook refuses it, so the rule only exists as prose loaded into every agent.
- [02:32] `impl-small` link-into.sh takes --hooks before its two arguments, and the form CLAUDE.md quotes (flag after) only prints usage
- [02:32] `impl-small` the dantotsu schema check fails when a script named in eradication-paths is deleted, so removing a superseded mechanism requires editing a historical dantotsu's front matter
- [02:33] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [02:36] `transcript-timing` list_events returns 100 events per call regardless of kinds filter and pages under ~50K chars land inline in context, so a full transcript of a multi-day session costs hundreds of calls and only a 1.5 h session was retrievable in full
- [02:36] `transcript-timing` agents pipe git commit through tail/grep, so when pre-commit fails they re-run the whole 2-3 min hook just to read the error (seen in session_01SZCo: 182 s failed commit, then 128 s identical rerun to grep the log)
- [02:59] `transcript-fetch` list_events pages under ~50k chars come back inline into the agent's context instead of to a file, so saving a hook-heavy transcript costs ~13k context tokens per page and must be recovered from the agent's own jsonl
- [03:02] `transcript-fetch` list_events without a kinds filter returns ~100 events per 40-90 s of a hook-heavy session, so a multi-day session is thousands of pages and cannot be fetched completely in one agent run
- [03:40] `fetch-mcp-kaizens` list_events with kinds filter returns pages under the inline-size limit, so ~20K tokens of other-session transcript land in the fetching agent's context per page instead of being saved to a file.
- [03:40] `fetch-mcp-kaizens` Two parallel fetch agents got identical prompts, so a saver script keyed on 'the transcript containing my prompt' matched the other agent's file.
- [03:41] `fetch-mcp-kaizens` The kinds filter makes list_events pages small enough to return inline, so filtering server-side cost far more context than fetching unfiltered (spilled to file) and filtering locally.
- [03:42] `arch-on-demand` architecture-graph.ts fails on manifest problems in both modes, so its separate --check step is redundant and exists only because the canary inventory finds generators by grepping workflows for '--check'
- [03:42] `arch-on-demand` temporal-coupling.ts silently depended on the architecture models being built first; ci.yml ran it before the maps, so CI's report was already all 'unmodelled' with a sentence blaming deleted files
- [03:54] `harness-tokens` list_events transcripts carry no system-reminder or CLAUDE.md text, so the largest per-thread harness context cannot be measured from them, only estimated from file size
- [03:54] `claude-md` check-doc-links.ts reports a link to a new untracked file as dead, so a doc added without staging cannot be validated before commit
- [03:57] `review-merge` check-dated-records-are-append-only.sh refuses deleting docs/standards/reviews, so removing the standards review needed its path dropped from the gate in the same change
- [03:58] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [04:02] `harness-audit` rtk silently caps and hides lines of grep/ls/find output in a read-only audit, so an inventory built from shell output is incomplete unless every listing goes through python
- [04:02] `harness-audit` git log --since filters on committer date, and every commit's committer date was rewritten to 2026-10-12 or later, so a 'since' window must filter on author date to mean anything
- [04:14] `meta-gates` the shared working tree carries another agent's unrelated edits (knip.json, package.json, skills), so git status cannot tell my change from theirs
- [04:17] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [04:17] `browser-simplify` the eval refusal the operator wanted removed is not a repository hook but Claude Code's worktree isolation guard, so no file here could be deleted for it
- [04:17] `browser-simplify` agent-browser get cdp-url on a session that was never opened silently launches a browser on about:blank instead of erroring
