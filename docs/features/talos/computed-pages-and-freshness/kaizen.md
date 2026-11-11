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

Session: 2ad21149-51d3-5fff-98e8-0e9474b187e4
- [2026-11-11 19:04] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-11 19:48] `computed-pages` pnpm dev never applies a changed test/memory-seed.json to an existing local dev database, because dev-database.setup.ts replays the fixed idempotency key dev-seed, so each feature wipes the database or posts its seed by hand.
- [2026-11-11 19:48] `computed-pages` The brief and the spec say entity.upsert already strips the lines of Faits, Historique and Relations from a body, and no code does, so C3.1 had nothing to extend.
- [2026-11-11 19:56] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-11 19:57] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-11 20:07] `technical-validator` The spec's C3.1 states as a fact that entity.upsert already strips Faits, Historique and Relations, no code does, and the validator had to measure the round trip to find that those lines double on a write-back.
- [2026-11-11 20:07] `technical-validator` On a branch that merged main after the spec commit, vitest --changed <base> and mutate-changed.sh <base> also run the tests and mutants of other features, because the base ref cannot name one commit.
- [2026-11-11 20:07] `technical-validator` The standard asks C4.2 and D.2 to be checked in the pull request body, and the validator runs before the pull request exists, so both rows can only be UNVERIFIABLE.
- [2026-11-11 20:21] `computed-pages-fix` A flatMap that returns [] for the rejected case left an equivalent Stryker ArrayDeclaration mutant when a later filter also rejects the placeholder, and the knowledge entry on hundred-percent gates does not list that shape.
