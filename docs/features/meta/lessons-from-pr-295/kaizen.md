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

Session: c72ce888-8956-58c0-8980-36e03d8aabc2

- [2026-11-11 23:15] `hook:commitlint` commitlint refused a commit message: fix(meta): oxlint runs its type-aware rules with no flag
- [2026-11-11 23:16] `main` a commit trailer retyped by hand carried the wrong session id; commitlint refused it
- [2026-11-11 23:22] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-11 23:27] `technical-validator` A kaizen-sweep branch was handed to technical validation with its parent feature's spec as the contract, and the validator procedure names no source for category A on such a branch, so rows were built from the sweep's inventory.md decisions instead.
- [2026-11-11 23:27] `technical-validator` The plan-absent row forces PASS_EXCEPT_UNVERIFIABLE on a kaizen-sweep branch that by design has no plan, the same A00 the inventory (row 16) already ruled a no-op for PR #295.
- [2026-11-12 00:02] `implementer` An app bundle that imports Sentry's postgresJsIntegration contains the orchestrion:postgres channel names even without the bundler plugin, so grepping an app bundle for them cannot prove the driver rewrite ran.
- [2026-11-12 00:02] `implementer` infra/cdk's tsconfig lib is ES2022, so Array.prototype.toSorted fails typecheck in tests while vitest runs it fine.
- [2026-11-12 00:08] `main` the implementer left two infra/cdk files unformatted, a third time this wall was hit in PR #295's work
- [2026-11-12 00:21] `technical-validator` The validator's round-2 rule grades a false dismissal of a non-blocking finding as blocking, which contradicts its own 'what breaks if it ships' test for typing a finding.
- [2026-11-12 00:21] `technical-validator` No harness in the repo runs a bundled API against a real Sentry client and Postgres, so checking what a db span carries took hand-built esbuild probes in the scratch folder.
- [2026-11-12 00:26] `main` the screens-shown stop hook fired on a turn that compared probe outputs before and after a fix, with no screen involved
- [2026-11-12 00:32] `fixer` Sentry 11 does not re-export StreamedSpanJSON from @sentry/aws-serverless, so typing a beforeSendSpan callback means deriving it through Parameters<typeof init>.
