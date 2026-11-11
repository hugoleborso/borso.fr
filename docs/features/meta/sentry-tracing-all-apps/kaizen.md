# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: 8a357356-5f30-5086-8b4a-e6b3009a77e8

- [2026-11-11 19:03] `static-sites` Sentry React 11 ships browser traces as span v2 envelope items (application/vnd.sentry.items.span.v2+json), not transaction items, so a span counter that reads transaction.spans reports zero.
- [2026-11-11 19:04] `banana-rush` The brief's gate 'pnpm exec oxlint apps/<app>' runs without --type-aware, so every type-aware eslint-disable reads as unused; the real gate is 'pnpm run lint' (scripts/lint-workspace.sh).
- [2026-11-11 19:04] `lll` The brief's gate 'pnpm exec oxlint apps/<app>' runs without --type-aware, so it flags type-aware eslint-disable directives as unused (two here, one preexisting in wide-event.adapter.test.ts) while the package's own 'pnpm run lint' passes clean.
- [2026-11-11 19:04] `lll` last-loop-lepin's error handler is attached in main.ts (createApp().onError) rather than in app.ts, so app.test.ts never exercises the 500 path through traceRequests and the flush-after-span ordering is only proven by a mocked adapter test.
- [2026-11-11 19:06] `talos` The brief's gate 'pnpm exec oxlint apps/<app>' runs without type-aware rules, so it flags the required typescript/no-deprecated and prefer-promise-reject-errors directives as unused (pragma fails it the same way); the package 'lint' script is the real gate.
- [2026-11-11 19:06] `talos` Sentry SDK 11 enables postgresJsIntegration by default once tracesSampleRate is set, which names DB spans after the (sanitized) SQL text; pragma's port does not filter it, so the agent SQL endpoint needed an explicit integration filter in talos.
- [2026-11-11 19:07] `main` a subagent left two talos test files unformatted, and the pre-commit oxfmt gate caught it only at commit time
- [2026-11-11 19:14] `technical-validator` Whether the bundled postgres-js driver in last-loop-lepin and banana-rush yields database spans under Sentry 11.6 orchestrion instrumentation cannot be checked locally, so spec use case 7 rests on a measurement from an older SDK
- [2026-11-11 19:14] `technical-validator` A back-e2e test that vi.mocks a module passes alone and fails under --changed because isolate:false shares the module cache with earlier files, and nothing flags the vi.mock as ineffective
- [2026-11-11 19:43] `technical-validator` The brief pins round 2 to the round-1 Reviewed SHA, but the branch's pull request does not exist yet, so the dismissal check had to probe the REST API to learn there was no PR body to read.
