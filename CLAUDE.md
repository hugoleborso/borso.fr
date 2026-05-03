# borso.fr monorepo — agent guide

One developer. pnpm workspaces. Node 22. AWS eu-west-3 (+ us-east-1 for ACM).

For any "how does X actually work" question, [`docs/`](./docs/) is the source of truth.

## Layout

- `apps/<slug>/` — one folder per app. Standalone-openable: `cd apps/<x> && pnpm dev` works on a fresh checkout. **No cross-app imports.**
- `infra/cdk/` — `@borso/infra`, the CDK constructs (StaticSite, LambdaApi, DsqlCluster, DsqlSchema, PreviewableApp). **100% test coverage gated.**
- `infra/shared/` — `@borso/shared-infra`, account-level singletons (certs, OIDC, previews CDN, deploy roles). DSQL clusters are per-app, owned by each app's prod stack.

## Conventions

- **pnpm always** — no `npm` / `yarn`. Lockfile is committed.
- **Always use `pnpm run <script>` for `deploy` / `destroy` (and any name pnpm reserves).** `pnpm --filter <pkg> deploy` invokes pnpm's built-in `deploy` command (which copies a workspace package into a deployable bundle), not the package's `scripts.deploy`. Same hazard with `destroy`. The four CI workflows already use `run`; the local equivalent is e.g. `pnpm --filter @borso/shared-infra run deploy`.
- **Conventional commits**, scope-enum: `borso-fr`, `borsouvertures`, `infra`, `ci`, `docs`, `deps`. Husky enforces.
- **Biome** rules live in the root `biome.jsonc` and reach every workspace. Per-app configs extend root and set `"root": false`.
- **Stage** type is `'dev' | 'preview' | 'integ' | 'prod'`. `'dev'` is an app-code marker; constructs reject it via `assertDeployStage`.

## Clean code

- **Names carry the intent.** No one-letter locals (`h`, `c`, `x`) outside trivial scopes like `for (let i = 0; ...)`. Prefer `accumulator`, `candidate`, `entry`. Function names should describe the result, not the mechanism (`digestMigrations`, not `hashMigrations`).
- **Magic numbers and strings get names.** A bare `31` or `'\n---\n'` inside a function body becomes a named const. Same file is fine; the const declaration documents the choice.
- **Comments are for the WHY, not the WHAT.** Default to none. Only write a comment for: a non-obvious infra constraint (CloudFront Functions runtime, CFN intrinsics, advisory locks), a workaround for a third-party bug, or behavior a future reader would otherwise misread. Don't restate what the code does.
- **JSDoc is allowed on shared / exported functions.** Use it to document the contract (inputs, return value, surprising edge cases) and any cross-cutting notes (e.g. "called by the CFN custom resource provider"). Don't JSDoc internals just because.
- **Type assertions are restricted.** Only `as unknown` (single step, e.g. for JSON-parsing escape hatches) and `as const` (literal narrowing) are allowed. `as Foo` and `as unknown as Foo` are both banned by the `no-type-assertion-except-unknown` Biome plugin — chained casts are a type assertion in disguise. If you need a narrower type after `as unknown`, use a TypeScript type guard (`x is Foo`) or parse with a Zod schema. `as any` is hard-banned via `noExplicitAny`.

## Hooks

**Never `--no-verify`.** If a hook fails, fix the underlying problem and re-commit. Bypassing the hook silently lands broken code in main; in an AI-driven repo the gates are the safety net.

- **SessionStart** → `scripts/install-repo-deps.sh` (rtk + pnpm deps; AWS CLI v2 installed conditionally when `AWS_ACCESS_KEY_ID` is set).
- **PreToolUse(Bash)** → rtk rewrites commands for token savings.
- **pre-commit** → if `infra/cdk/**` or `infra/shared/**` changed, runs the matching `test:coverage`.
- **pre-push** → runs `pnpm exec knip` repo-wide. Push-time, not commit-time, so multi-commit stories aren't blocked mid-refactor.
- **commit-msg** → commitlint.

## AWS access from a session

Two ways an agent/session gets read-only AWS access:

- **Local Claude Code** (terminal): your shell already has `borso-admin` and `borso-claude` AWS SSO profiles configured (see [`docs/aws-setup.md#3`](./docs/aws-setup.md#3-configure-sso-profiles-locally)). Run `aws sso login --profile borso-claude` once per session — creds expire hourly.
- **Claude Code on the web** (claude.ai/code): set these in the project's environment-configuration UI:
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — long-lived keys for the `claude-readonly` IAM user (rotate every 90 days).
  - `AWS_REGION=eu-west-3`
  - `AWS_ACCOUNT_ID=<12-digit account id>`

When `AWS_ACCESS_KEY_ID` is present, the SessionStart hook installs AWS CLI v2 conditionally and `aws ...` works in Bash. The IAM user behind those keys has `ReadOnlyAccess` + an inline deny on every mutation verb (`iam:*`, `cloudformation:Create*/Update*/Delete*`, `s3:Put*/Delete*`, `lambda:*`, `cloudfront:Create*/Update*/Delete*`, `route53:Change*/Create*/Delete*`, `dsql:*`). You can list, describe, and read; you can't change anything.

Full setup including key rotation: [`docs/aws-setup.md#12`](./docs/aws-setup.md#12-optional-grant-claude-code-on-the-web-read-access-to-aws).

## Dantotsus and knowledge

Two complementary folders, one purpose: keep the team's mental model ahead of the codebase's failure modes.

- [`docs/dantotsus/`](./docs/dantotsus/) — root-cause analyses with shipped eradications. Each entry follows the [Dantotsu standard](./.claude/skills/dantotsu/standard.md): Symptom → Root-cause chain → Detection failure causes → Countermeasure → **Eradication** (code-level, non-optional, linked by commit hash + diff). Eradication ladder, top is best: structural impossibility → DevX check → vendor patch → detection → knowledge (floor).
- [`docs/knowledge/`](./docs/knowledge/) — broad reference docs. Vendor quirks, CLI contracts, conventions, debugging recipes, anything the team needs to know that doesn't trace to a code-level fix.

Skim the indexes before starting non-trivial CDK / CloudFront / S3 / GitHub Actions work — the cost of reading a 30-line entry is far lower than the cost of re-discovering the trap.

When a PR uncovers a new trap, run the [`/dantotsu`](.claude/skills/dantotsu/SKILL.md) skill — it walks the seven Dantotsu steps and produces an entry under `docs/dantotsus/` with the eradication shipped in code. The Self-improvement loop rule below pulls this together.

## Self-improvement loop

**After every PR you ship merges or closes, open a follow-up PR with the lessons from that PR captured into your own config** — this file (CLAUDE.md), per-app rules, hooks, biome overrides, knip ignores, skills, whatever fits the lesson. Even small ones: a new gotcha, a clarified convention, a removed footgun. The loop is the system that keeps an AI-driven repo improving instead of regressing.

The mechanic: invoke the [`/after-task-dantotsus`](.claude/skills/after-task-dantotsus/SKILL.md) skill — it sweeps the just-merged PR (commits + review comments + CI failures + webhook events), classifies each candidate (real defect / vendor surprise / design pivot / operator confusion / no-op), and writes one Dantotsu per subject under `docs/knowledge/`. Tag the resulting PR with `kaizen` so the loop's output is visible in the PR list.

What counts as a "lesson":
- A pitfall that bit you and would bite again — add a new file under [`docs/knowledge/`](./docs/knowledge/) using the Dantotsu template (Symptom → causal chain → Fix), and link it from the index.
- A naming/style choice you made repeatedly that wasn't documented (add to **Conventions** or **Clean code**).
- A new doc that answered a question you had to research (add a link from CLAUDE.md to the doc).
- A hook / Biome rule / commitlint scope / knip entry / `.gitignore` line that should have existed before you needed it.
- A workflow / construct / package script change that codifies the lesson (commit alongside).

If a PR ships zero lessons, that's fine — open the follow-up PR with a note saying "no setup changes from PR #N" so the loop's existence stays visible. The cost of capturing is low; the cost of re-discovering the same trap is the multi-hour debug session you just had.

## Don'ts

- Don't reintroduce `pragma` as a slug — it's the upstream `borso-platform` test fixture, renamed to `test-app` here.
- Don't `import`/`export` in `infra/cdk/src/internal/cf-host-routing-function.code.js` — it's CloudFront Function source, read at synth time as a string and shipped to the edge runtime.
- Don't add an app without updating `.github/path-filters.yml` and the commitlint scope-enum.
- Don't `--no-verify`. Ever. Fix the hook failure instead.
