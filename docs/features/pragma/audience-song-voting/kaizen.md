# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [19:29] `implement-01` a Hono handler that throws is turned into a 500 by the framework before a middleware wrapping next() can read the error, so the refusal-translating middleware silently produced 500 where the plan expected 422 and 409
- [19:29] `implement-01` the plan's concurrent open-a-round test asserts one 201 and one 409, which holds on Aurora DSQL and cannot hold on the local Postgres the back-e2e suite runs against, where both inserts commit
- [19:29] `implement-01` adding a table to a migration is not enough for the back-e2e suite: the table names are also listed by hand in test/setup-postgres.ts and test/database-utils.ts, and the second run fails with relation already exists until both are edited
- [19:29] `implement-01` prettier --write run with cwd inside apps/pragma produced formatting that prettier --check from the repo root then refused, on a file the change never touched
- [19:30] `implement-01` the state query fired once with no ballot-token header before the ballot query resolved, and since the token is not part of the query key that first answer was never replaced, so ownVotes stayed empty for the whole page life
