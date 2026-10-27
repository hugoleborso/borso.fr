# ADR-0044: Agents read production through a SELECT-only database role

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

1. **Database.** The migration runner creates `ai_reader_prod` on the cluster of pragma, last-loop-lepin and banana-rush, maps it with `AWS IAM GRANT` to `arn:aws:iam::<account>:user/AI-Dev-ReadOnly`, and grants it `USAGE` on the `prod` schema and `SELECT` on every table in it except the application's reader blocklist, on which it runs `REVOKE ALL` (see *Tables the reader never sees*). It repeats the grant after every migration run, as it does for the API role of [ADR-0036](./0036-one-database-role-per-stage-schema.md), because the DSQL documentation does not describe default privileges and a table added later would otherwise be unreadable. When the stack stops listing the user, the runner revokes the mapping. When the schema is deleted, it drops the role.
2. **IAM.** `AI-Dev-ReadOnly` gets `dsql:DbConnect` on those three cluster ARNs and nothing else from DSQL. It never gets `dsql:DbConnectAdmin`, so the only database identity it can sign in as is the one its mapping names. The user is managed by hand, so this is a manual step ([`aws-setup.md` §12.7](../aws-setup.md#127-let-a-session-read-production)).
3. **Script.** `scripts/db-read.sh "<sql>"`, also reachable as `pnpm run db:read -- "<sql>"`, takes the application from `APP` (pragma by default), refuses talos by name, and accepts one statement that starts with `SELECT` or `WITH` and holds no write, session or transaction keyword outside literals and comments. It refuses a statement that names a blocklisted table, reading the list from the deployed stack's template so it matches what the database enforces. It mints a non-admin token, connects as `ai_reader_prod`, runs the statement inside `BEGIN READ ONLY … ROLLBACK`, wraps it in `LIMIT 200`, cancels it after 30 seconds and prints to stdout only. `.claude/settings.json` allows `Bash(scripts/db-read.sh *)` and `Bash(pnpm run db:read *)`. Agents call the shell path, because the documentation leaves open whether auto mode drops a rule that names a package-manager run.

The time limit is enforced by the client. [ADR-0039](./0039-talos-memory-in-the-database.md) recorded that DSQL refuses `SET LOCAL statement_timeout`. The script sends `SIGINT` to `psql`, which asks the server to cancel the query.

The reader exists on the `prod` schema of pragma, last-loop-lepin and banana-rush. Previews get no reader. A pragma or last-loop-lepin preview is a copy of production with the credential tables removed ([ADR-0009](./0009-pragma-previews-clone-production.md)), so a preview reader would answer nothing the production one cannot, and a banana-rush preview starts empty. A preview reader would also mean mapping one IAM user to a new role on every pull request, and the documentation does not say that one IAM identity may hold several mappings. Each cluster is its own database, so the role has the same name, `ai_reader_prod`, in all three.

talos is left out on purpose. Its data is the owner's private memory, and [ADR-0027](./0027-talos-deploys-to-prod-only.md) keeps it off previews for that reason. Agents already reach it through its own API, `POST /api/agent/sql`, behind a bearer token the owner controls ([ADR-0039](./0039-talos-memory-in-the-database.md)). A standing read path for any session holding the `AI-Dev-ReadOnly` keys would widen who can read it, so the script refuses `APP=talos` and points to that API, and the IAM grant does not name talos's cluster.

### Tables the reader never sees

`SELECT` on every table would reach rows that are secrets, and a secret read is a write through the application's own API: last-loop-lepin's `admin_sessions.id` is the raw value of the `lastloop_admin` cookie, and pragma's `vapid_key_pair.private_key` signs push messages as pragma. So each production stack passes `readerTableBlocklist` beside the reader, and the runner grants `SELECT` table by table on every other table and revokes everything on the listed ones. Revoking on every run, rather than only granting, means a table added to the list later loses its grant on the next deploy.

| Application | Blocklisted tables | What they hold |
|---|---|---|
| pragma | `app_config`, `member_credential` | the shared password hash and session HMAC key, members' password hashes and session epochs |
| pragma | `auth_attempt`, `member_calendar_feed`, `member_passkey`, `push_subscription`, `vapid_key_pair`, `webauthn_challenge` | hashed client addresses, secret calendar addresses, passkey public keys and counters, device push secrets, the push signing key, live sign-in challenges |
| pragma | `audience_suggestion`, `audience_vote` | the ballot token an audience member votes with |
| pragma | `assistant_authorization_code`, `assistant_client`, `assistant_grant` | hashed authorization codes and assistant tokens, and the clients they were issued to ([ADR-0042](./0042-pragma-is-its-own-oauth-authorization-server.md)) |
| last-loop-lepin | `admin_credentials`, `admin_sessions`, `auth_attempts` | the admin PIN's scrypt hash, live admin session ids, raw client addresses |
| banana-rush | none | players are known by `player.token_hash` only; `game.join_code` is shared with every player by design |

The first two pragma rows and the last-loop-lepin row are the same constants the preview clone uses (`tablesToReplace` and `tableBlocklist`), so a credential table added to the preview decision reaches the reader too. The ballot tables are blocked from the reader only: a preview still copies them. `DsqlSchema` refuses to synthesise when a blocklisted name is not created by any migration, so a misspelt name cannot leave the real table readable.

### Why this differs from ADR-0039

ADR-0039 rejected a second, read-only role for talos's SQL route. Its reason was cost, for a route that only the owner's own agents call, through a Lambda whose stage role already confined it to one schema. It said the role would win "if the SQL route were ever opened to a token the owner does not control". This path is that case. The caller is any hosted session of this repository, and the access keys sit in the environment settings, which anyone with edit access on the project can read. The caller also runs on a machine it controls, so the keyword guard and the read-only transaction are code the caller could skip. Only a database role refuses a write whatever the caller runs.

## Consequences

- `+` A hosted session can answer a question about production data that gates a merge, without handing the question to a local session.
- `+` Every write is refused by the database itself. A statement that passes the guard, or a session that skips the script and calls `psql` directly, still runs as a role that holds `SELECT` only.
- `-` Any session of this repository, and anyone holding the `AI-Dev-ReadOnly` keys, now has a standing read path to the production data of three applications. Pragma's includes members' e-mail addresses, phone numbers and calendar addresses ([ADR-0037](./0037-calendar-feed-address-in-its-own-table.md)), and last-loop-lepin's includes runners' display names and the admin credential tables. Before, reading it took the operator's own SSO profile.
- `+` No row the reader can see lets it act as a user or as the application: sessions, password and PIN hashes, keys, challenges and ballot tokens are on the blocklist, and the database refuses them whatever the caller runs.
- `-` The blocklist is written by hand. A new table that holds a secret is readable until someone adds it, and nothing detects a secret column. Reviewing a migration that adds one now includes the reader blocklist.
- `-` Questions about audience votes cannot be answered through this path, because the ballot tables are blocked whole; DSQL column grants were not tried.
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
  - A change to `infra/cdk` under its 100 % coverage gate, a production deploy of each application, and a manual IAM edit.
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
- Files: `infra/cdk/src/internal/migration-runner/database-role.utils.ts`, `infra/cdk/src/internal/migration-runner/index.ts`, `infra/cdk/src/constructs/dsql-schema.ts`, `infra/cdk/src/constructs/previewable-app.ts`, `infra/cdk/src/internal/agent-reader.ts`, `infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts`, `apps/pragma/cdk/lib/stack.ts`, `apps/last-loop-lepin/cdk/lib/stack.ts`, `apps/banana-rush/cdk/lib/stack.ts`, `scripts/database/read-only-query.utils.ts`, `scripts/database/db-read.ts`, `scripts/db-read.sh`, `.claude/settings.json`, `docs/aws-setup.md` §12.7
- Related ADRs: ADR-0036 (builds on its per-stage roles), ADR-0039 (the case its rejected Option B anticipated, and talos's own agent path), ADR-0027 (why talos stays out), ADR-0009, ADR-0037

### Revision 2026-10-25 — scope widened to last-loop-lepin and banana-rush

What changed: the first draft of this ADR mapped the reader on pragma `prod` only, and left last-loop-lepin, banana-rush and talos out until one of them needed it. The operator widened the scope the same day, before merge, to pragma, last-loop-lepin and banana-rush. Each of their production stacks now lists `AI-Dev-ReadOnly` as its schema reader, the helper that builds that ARN moved to `@borso/infra` so no application imports another, the script accepts the three applications, and the IAM allow is one inline policy, `Prod-db-read`, on the three cluster ARNs.
Why: operator decision of 2026-10-25. Once `DsqlSchema` takes a reader, each further application costs one property on its production stack and one ARN in the IAM policy, against the same three-level boundary. talos stays out, for the reasons in *Decision*.
Implication for the original decision: still valid. The mechanism is unchanged; only the list of clusters grew.

### Revision 2026-10-25 — the reader stops at a per-application table blocklist

What changed: the widened scope surfaced that `SELECT` on every table reached rows that are secrets. The operator decided the same day, before merge, that the reader gets every table except a per-application blocklist, which the runner revokes; the script refuses a query naming one of those tables. *Tables the reader never sees* records the lists.
Why: a read of a session id or a signing key is a write through the application, which the SELECT-only role alone does not prevent.
Implication for the original decision: still valid, and closer to its intent that a read cannot become a write.
