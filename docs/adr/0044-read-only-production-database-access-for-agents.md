# ADR-0044: Agents read pragma production through a SELECT-only database role

- **Status:** proposed
- **Date:** 2026-10-25
- **Deciders:** Hugo Borsoni
- **Tags:** meta, data, security, cdk

## Context

A hosted Claude Code session runs as the IAM user `AI-Dev-ReadOnly`, whose inline policy denies `dsql:*` ([`aws-setup.md` §12](../aws-setup.md#12-optional-grant-claude-code-on-the-web-read-access-to-aws)). It could not run one `SELECT` on pragma's `prod` schema that gated a merge. IAM was never asked: the auto-mode classifier refuses to mint a DSQL admin token, because that token opens every row ([`the-production-database-is-out-of-reach-of-a-hosted-session.md`](../knowledge/the-production-database-is-out-of-reach-of-a-hosted-session.md)). The answer had to come from a local session on the operator's machine.

The classifier's own allow list is set by the user or the organisation, not by the repository ([auto mode configuration](https://code.claude.com/docs/en/auto-mode-config)). An allow rule in the project's `.claude/settings.json` does resolve a matching command before the classifier sees it ([permission modes](https://code.claude.com/docs/en/permission-modes.md#eliminate-prompts-with-auto-mode)). The same page says that rules for package-manager run commands are dropped in auto mode, and does not say whether that covers a rule naming one script.

Once an allow rule passes a command, the classifier no longer reviews it, so whatever that command can do has to be bounded somewhere else. The session controls the machine the command runs on. It can edit the script, or call `psql` with any token its IAM identity can mint. A guard written in the script therefore bounds nothing on its own.

The operator ratified the design on 2026-10-25.

## Decision

**A SELECT-only database role, an IAM grant that can only reach it, and a script the project allows by name.** The read-only property holds at three levels.

1. **Database.** The migration runner creates `ai_reader_prod` on pragma's cluster, maps it with `AWS IAM GRANT` to `arn:aws:iam::<account>:user/AI-Dev-ReadOnly`, and grants it `USAGE` on the `prod` schema and `SELECT` on every table in it. It repeats the grant after every migration run, as it does for the API role of [ADR-0036](./0036-one-database-role-per-stage-schema.md), because the DSQL documentation does not describe default privileges and a table added later would otherwise be unreadable. When the stack stops listing the user, the runner revokes the mapping. When the schema is deleted, it drops the role.
2. **IAM.** `AI-Dev-ReadOnly` gets `dsql:DbConnect` on pragma's cluster ARN and nothing else from DSQL. It never gets `dsql:DbConnectAdmin`, so the only database identity it can sign in as is the one its mapping names. The user is managed by hand, so this is a manual step ([`aws-setup.md` §12.7](../aws-setup.md#127-let-a-session-read-pragma-production)).
3. **Script.** `scripts/db-read.sh "<sql>"`, also reachable as `pnpm run db:read -- "<sql>"`, accepts one statement that starts with `SELECT` or `WITH` and holds no write, session or transaction keyword outside literals and comments. It mints a non-admin token, connects as `ai_reader_prod`, runs the statement inside `BEGIN READ ONLY … ROLLBACK`, wraps it in `LIMIT 200`, cancels it after 30 seconds and prints to stdout only. `.claude/settings.json` allows `Bash(scripts/db-read.sh *)` and `Bash(pnpm run db:read *)`. Agents call the shell path, because the documentation leaves open whether auto mode drops a rule that names a package-manager run.

The time limit is enforced by the client. [ADR-0039](./0039-talos-memory-in-the-database.md) recorded that DSQL refuses `SET LOCAL statement_timeout`. The script sends `SIGINT` to `psql`, which asks the server to cancel the query.

The reader exists for pragma `prod` only. A preview is a copy of production with the credential tables removed ([ADR-0009](./0009-pragma-previews-clone-production.md)), so a preview reader would answer nothing the production one cannot. It would also mean mapping one IAM user to a new role on every pull request, and the documentation does not say that one IAM identity may hold several mappings. last-loop-lepin, banana-rush and talos would each need a production deploy of their own, so they are left out until one of them needs it.

### Why this differs from ADR-0039

ADR-0039 rejected a second, read-only role for talos's SQL route. Its reason was cost, for a route that only the owner's own agents call, through a Lambda whose stage role already confined it to one schema. It said the role would win "if the SQL route were ever opened to a token the owner does not control". This path is that case. The caller is any hosted session of this repository, and the access keys sit in the environment settings, which anyone with edit access on the project can read. The caller also runs on a machine it controls, so the keyword guard and the read-only transaction are code the caller could skip. Only a database role refuses a write whatever the caller runs.

## Consequences

- `+` A hosted session can answer a question about production data that gates a merge, without handing the question to a local session.
- `+` Every write is refused by the database itself. A statement that passes the guard, or a session that skips the script and calls `psql` directly, still runs as a role that holds `SELECT` only.
- `-` Any session of this repository, and anyone holding the `AI-Dev-ReadOnly` keys, now has a standing read path to pragma's production data. That data includes members' e-mail addresses, phone numbers and calendar addresses ([ADR-0037](./0037-calendar-feed-address-in-its-own-table.md)). Before, reading it took the operator's own SSO profile.
- `-` Query results enter the session transcript, which lives outside this account and outside AWS. Nothing redacts a column. The guard cannot tell which columns are personal.
- `-` The IAM half is a manual change to a user that no session can read (`iam:*` is denied), so whether it was applied, and whether the deny was narrowed correctly, is unverifiable from a session. The test is to run the script and read the error.
- `-` The keyword guard is a deny list, as ADR-0039's is. Here it is a convenience that gives a clear refusal, not a barrier.
- `~` The classifier no longer reviews these calls. The allow rule takes effect only in sessions that start after it reaches `main`.

## Alternatives considered

### Option A — SELECT-only role, `dsql:DbConnect` grant, allowed script (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - The database refuses every write, whatever command the session runs.
  - The IAM grant cannot reach `admin`, so the read path cannot be widened from the session.
  - It is provisioned by the same runner and tests as the stage roles of ADR-0036.
- **Costs:**
  - A change to `infra/cdk` under its 100 % coverage gate, a production deploy of pragma, and a manual IAM edit.
- **Rationale:** It is the only option where the boundary does not depend on code the caller controls.

### Option B — An allow rule in server-managed auto-mode settings (rejected)

- **Summary:** Teach the classifier, through managed settings, that a production read through this script is expected.
- **Strengths:**
  - No allow rule in the repository, and the classifier keeps reviewing the call.
- **Costs:**
  - Needs an organisation administrator. This operator is not one.
- **Rejection rationale:** Not available to this operator. It would also leave the IAM side unchanged, since `dsql:*` stays denied.

### Option C — A GitHub Action that runs the query (rejected)

- **Summary:** A `workflow_dispatch` workflow with an OIDC role runs the query and posts the result.
- **Strengths:**
  - No standing database access for the session's IAM user.
- **Costs:**
  - The repository is public, so its workflow logs are public. Query results would be published.
- **Rejection rationale:** It loses on keeping the results private, which matters most here.

### Option D — A SessionStart hook that writes the user's settings (rejected)

- **Summary:** The hook adds an allow rule or classifier entry to `~/.claude/settings.json` in the container at start.
- **Strengths:**
  - Nothing in the project settings.
- **Costs:**
  - The documentation does not describe it. It also goes around the boundary the documentation draws between project settings and user settings.
- **Rejection rationale:** It loses on using only documented mechanisms. A future Claude Code release could ignore or refuse it without warning.

### Option E — The script mints an admin token (rejected)

- **Summary:** Keep `admin`, lift the deny for `dsql:DbConnectAdmin`, and rely on the script's guard and `READ ONLY` transaction.
- **Strengths:**
  - No change to `infra/cdk` and no new role.
- **Costs:**
  - The session's IAM user could then sign in as `admin` on the cluster, with or without the script.
- **Rejection rationale:** The script would be the only guard, and the session controls the script.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| A write is refused whatever the session runs | high | The session controls the machine, so only a server-side boundary counts. |
| Results stay private | high | Production holds members' personal data. |
| Uses only documented mechanisms | medium | An undocumented path can stop working, or start doing more, without warning. |
| Available to this operator | medium | A path that needs an organisation administrator is not a path. |

|  | A: role + grant + script | B: managed auto mode | C: GitHub Action | D: hook writes user settings | E: admin token |
|---|---|---|---|---|---|
| Write refused whatever runs | ✓ SELECT-only role | ✗ IAM unchanged, nothing to run | ✓ the workflow fixes the query path | ✗ depends on what it allows | ✗ admin can write |
| Results stay private | ✓ stdout of a private session | ✓ same | ✗ public logs | ✓ same | ✓ same |
| Documented mechanisms | ✓ DSQL roles, project allow rule | ✓ managed settings | ✓ Actions and OIDC | ✗ undocumented | ✓ |
| Available to this operator | ✓ | ✗ needs an org admin | ✓ | ✓ | ✓ |

## Implementation pointers

- Spec: none. The design was ratified in chat on 2026-10-25.
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `infra/cdk/src/internal/migration-runner/database-role.utils.ts`, `infra/cdk/src/internal/migration-runner/index.ts`, `infra/cdk/src/constructs/dsql-schema.ts`, `infra/cdk/src/constructs/previewable-app.ts`, `apps/pragma/cdk/lib/stack.ts`, `scripts/database/read-only-query.utils.ts`, `scripts/database/db-read.ts`, `scripts/db-read.sh`, `.claude/settings.json`, `docs/aws-setup.md` §12.7
- Related ADRs: ADR-0036 (builds on its per-stage roles), ADR-0039 (the case its rejected Option B anticipated), ADR-0009, ADR-0037
