# borso.fr monorepo

One operator, many agents in parallel, each shipping one feature in its own sandbox without hand-holding. pnpm workspaces, Node 22, AWS eu-west-3 (ACM in us-east-1). `docs/` is the source of truth for how things work.

## Principles

- **Restate the goal first.** Your first message, every subagent brief and every PR's Why state the goal and the smallest change that meets it. If the evidence rules out the requested change, show the evidence and stop.
- **Never block on the human.** Do reversible work, then present it. Settle a question whose answer can be observed with a prototype or a command. Ask only for product calls and irreversible actions (merge, delete, force-push, an external message).
- **Log what you lack the rights for.** A task that needs AWS write, IAM, repository settings, a secret, an operator dispatch or a third-party console goes in a row of `docs/operator-backlog.md`, in the pull request that found it.
- **Attack the premise.** When two fixes that rest on one premise fail the same gate, write the premise down and test it before a third fix.
- **Encode lessons in structure, subtract first.** A lesson a hook, a type or a gate can hold ships as that alone. The written instruction is the symptom. A kaizen removes something before it adds anything.
- **Verify before asserting.** Read the file, run the command or call `aws ... get-...` this session before you describe it. Your branch may be behind `main`, so fetch.
- **No invented numbers.** State an unknown price, latency or limit as unknown, or look it up.
- **Never estimate durations.** Size work by what it touches and what needs deciding (`/route`).
- **Fix the failures you find**, whoever caused them. "Preexisting" is not a reason to walk past.
- **Lower the water, do not raise the boat.** A limit that trips (throttling, a timeout, memory, a quota) is an andon showing a rock. Adding capacity is adding inventory: it raises the water and hides the rock until it sinks the next change. Go and see the real requests and logs, ask why until you reach the cause (a retry loop, a burst, a slow query, a missing cache), and remove it. Raising a limit is a last resort, and the operator decides it.
- **No follow-up issues.** Do the work in this PR, or ask one question. Only product and architecture decisions go to the operator. Decide the rest.
- **A repeated correction is a missing hook, skill or doc.** Propose it.

## Layout

- `apps/<slug>/` holds one app, openable on its own with `pnpm dev`. No cross-app imports. `borso-fr` and `borsouvertures` have only `site/`. `pragma`, `last-loop-lepin`, `banana-rush` and `talos` add `api/` (Hono on Lambda), `cdk/`, and `domain/` for rules both sides read (`@domain/*`).
- `infra/cdk/` holds the shared CDK constructs, gated at 100% coverage. `infra/shared/` holds account-level singletons.
- `.claude/` holds the skills, agents, commands and hooks, as plain files.
- `docs/features/<app|meta>/<slug>/` holds a feature's spec, plan, validation and archived friction log.

## Feature flow

- Run `/route` on anything that is not obviously one file.
- One session per feature. It ends at merge.
- The main session orchestrates. It hands each phase (spec, plan, implementation, validation) and each fix round to a fresh subagent with one consolidated brief.
- Name the data shape (types, tables, payloads) before writing code.
- `/technical-validation` is one agent with typed blocking and non-blocking findings, at most two rounds. The second round reads only the diff since the reviewed SHA.
- Triage every finding skeptically. Fix it, dismiss it with a concrete reason, or ask.
- The validator runs the core tests plus the e2e files the change touches. The full e2e suite is CI's.
- `/visual-validation` runs once, at the end.

## Before writing code

- `/code-standards` routes you into `docs/standards/`, which wins over any summary here.
- Before a new file in `apps/`, run `scripts/reports.sh blueprints`, copy the blueprint for that layer from `.claude/skills/blueprint/blueprint-index.md`, and mark the code `// @FollowsBlueprint <id>`.
- Read `apps/<app>/VOCABULARY.md` before naming a type, column, function or file.
- A file name ends in its layer's suffix (`.service.ts`, `.core.ts`, `.queries.ts`, the rest in `docs/standards/01-naming.md`).
- Reuse first. Look in this repo, then installed packages, then a maintained library. A new dependency is an ADR decision, so surface it.

## Hard rules

- borso.fr is the operator's personal project, on personal time. The Notion, Slack, Gmail, Google Drive and Calendar connectors belong to their employer. Never write to them from this repo. Read one only when the operator names it, and keep what this repo produces inside this repo.
- Never merge to `main` unless the operator asked for that pull request. A merge deploys every changed app to prod, in parallel.
- Never run a deploy locally. Call reserved names through `run` (`pnpm --filter <pkg> run deploy`, same for `destroy`).
- A full-stack app's `destroy` targets `<app>-pr-<N>` only. `--all` also deletes the shared `<app>-cluster` stack.
- English in identifiers, schemas, comments, commits and specs. Visible text goes through i18n (`en.json`, `fr.json`). Translate the operator's French or slang before it reaches code.
- Every page works at 375 px wide. Build mobile first, with `sm:`/`md:`/`lg:` on layout classes.
- A `refactor:` or `chore:` commit that replaces a mechanism names the property the old one had and the new one drops.
- Each destructive action gets its own confirmation, never a ride on a related cleanup.
- No recurring job, scheduled check-in or polling loop the operator did not ask for. Webhooks wake the session, so end the turn to wait.
- A new app needs `.github/path-filters.yml` and the commitlint scopes (`scripts/check-app-registration.sh`).

The rest of `docs/standards/` is enforced by oxlint, the git hooks and CI. When a gate fails, read its message and the standard it names. An exception goes on the line, as `// eslint-disable-next-line <rule> -- <checkable reason>`.

## Writing

They cover replies, documents, commits and PR bodies.

- The first line says the action or decision you need from the reader. If you need none, it says the result.
- Write short declarative sentences, one thought each.
- Use no long-dash character. Never join two halves of a sentence with a colon. A colon before a list is fine.
- Terse is not an excuse to drop content. Details, tradeoffs, choices and open decisions stay.
- Lead with impact. Say who the work is for and what changes for them, then what the next maintainer inherits.
- Every claim carries its evidence or its label in the same sentence, as measured, inferred or guess. Never hand the reader a check you could run.
- Never fabricate a link, citation or transcript reference. Link only what you produced or read this session.
- Ask one closed question at a time, with its options and your recommendation.
- Do not narrate what is done. Report the result and what is left.
- Long prose also follows `/plain-writing`, and documents for agents `/writing-for-agents`. These rules live here because `/plain-writing` was invoked in none of six sampled sessions (measured). Markdown is formatted by hand.

## Parallel agents

- Agents share one git index. Subagents never commit, and while one runs you stage explicit paths, never `git add -A`. A dependency added in one app rewrites the root `pnpm-lock.yaml` every agent shares, so commit the lockfile once, after the last agent that adds a dependency has finished.
- Run `scripts/reports.sh` once, after every agent has finished.
- Each agent works in `<scratchpad>/<its-label>/` and logs friction with `scripts/kaizen.sh --from <its-label> "<the problem, one sentence>"`. Put that line in every brief.

## Commits, pull requests, merges

- Conventional commits. Scopes are `banana-rush`, `borso-fr`, `borsouvertures`, `last-loop-lepin`, `pragma`, `talos`, `infra`, `ci`, `docs`, `deps` and `meta` (skills, hooks, ADRs, `docs/features/meta/`).
- Write ADRs with `/adr`. They are named `docs/adr/<YYYY-MM-DDTHHMM>-<slug>.md`, in UTC.
- Open pull requests with `/open-pr`. Previews deploy per PR, except for `talos`.
- Once a change is done, front-end above all, open its pull request without asking. The preview it deploys is how the operator validates.
- Generated reports are not committed. Run `scripts/reports.sh [blueprints|standards|maps|all]` before reading one. The architecture maps build only when the operator dispatches `.github/workflows/architecture.yml`.
- `infra/shared` deploys only when the operator dispatches `shared-deploy`. Do not propose a confirmation step.

## Self-improvement loop

Log friction as it happens, the problem only, with `scripts/kaizen.sh "<one sentence>"`. Before the PR opens, run `scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy, because the container is reclaimed when the session ends.

After a merge, the same reply carries two follow-ups, and says so when either is not needed.

1. If the merge changed `infra/shared/test/unit/__snapshots__/borso-shared.template.json`, ask the operator to dispatch `shared-deploy`.
2. Start the kaizen in a new conversation, never in this one. Propose it with a self-contained prompt that names the merged PR, the archived `kaizen.md` path and `/after-task-kaizen`, and pastes any line logged after the archive. Once the operator approves, start it with whatever tool this session has for opening a new session or queueing a task. Which one that is changes between sessions, so look at the tools you hold rather than reaching for a name. With none, give the operator the same prompt to paste.

## Checking a screen

- `pnpm dev` in a full-stack app runs the whole app here: site, API and a seeded local Postgres. Its `[dev:db]` line prints the seeded sign-in where the app has one. Uploads need a preview, because no bucket runs locally. Reproduce a screen bug there, never on a copied DOM.
- `agent-browser` checks layout, styles, contrast and content. Call it directly; it needs no flag here. Never run `agent-browser install`.
- `scripts/phone.sh touch '<selector>'` checks a tap on a phone. A click is not a tap. Traps are in `docs/knowledge/driving-previews-with-agent-browser-and-argent.md`.

## AWS and production data

- Sessions get read-only AWS. If SessionStart printed `AWS unavailable`, the credentials are placeholders, so do not debug the account. `iam:*` is denied, so probe the one call you need.
- Read production with `APP=<app> scripts/db-read.sh "<one SELECT>"` for `pragma`, `last-loop-lepin` and `banana-rush`. `talos` is read through its own `POST /api/agent/sql`.

## Deeper references

- `.claude/commands/feature-pipeline.md` describes the feature pipeline.
- Maps `docs/architecture/README.md`, AWS setup `docs/aws-setup.md`, root-cause analyses `docs/dantotsus/` (`/dantotsu`).
- `docs/knowledge/` entries are printed by a hook when they apply. Read them when printed.
