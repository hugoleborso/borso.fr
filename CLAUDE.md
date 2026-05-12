# borso.fr monorepo — agent guide

One developer. pnpm workspaces. Node 22. AWS eu-west-3 (+ us-east-1 for ACM).

For any "how does X actually work" question, [`docs/`](./docs/) is the source of truth.

## North star

The human's time on this repo is for *interesting* conversations with the AI. Three things qualify:

- **Giving important tech or product direction** — handled, in its structured form, by the `specification` skill; expect it to evolve as we find gaps.
- **Learning** — surfacing tradeoffs, naming patterns, explaining *why* over *what*.
- **Improving the system** that keeps the boring conversations rare — new skills, hooks, settings, `docs/` entries, the `dantotsu` skill (problem-fixing), and so on.

Anything else is a bug in the system. **Operational rule:** when a conversation starts feeling repetitive — manual guidance through a mechanical task, the same correction twice, the same question shape three times — stop and propose a concrete system change (a skill, a hook, a settings entry, a `docs/` page, a CLAUDE.md update). Do not push through manually.

## Layout

- `apps/<slug>/` — one folder per app. Standalone-openable: `cd apps/<x> && pnpm dev` works on a fresh checkout. **No cross-app imports.** Front-end-only apps (`borso-fr`, `borsouvertures`) have a single `site/`; full-stack apps (`last-loop-lepin`) split `site/` (Vite + React), `api/` (Hono on Lambda), and `cdk/` (CDK stack composing the constructs) under the same workspace. Full-stack apps that need a Postgres locally call [`scripts/local-postgres.sh`](./scripts/local-postgres.sh) — boots a Docker-less, sandbox-private cluster; wired into `pnpm run test` so the back-e2e gate runs autonomously even where Docker isn't reachable. See [`docs/knowledge/local-postgres-without-docker.md`](./docs/knowledge/local-postgres-without-docker.md).
- `infra/cdk/` — `@borso/infra`, the CDK constructs (StaticSite, LambdaApi, DsqlCluster, DsqlSchema, PreviewableApp). **100% test coverage gated.**
- `infra/shared/` — `@borso/shared-infra`, account-level singletons (certs, OIDC, previews CDN, deploy roles). DSQL clusters are per-app, owned by each app's prod stack.

## Conventions

- **pnpm always** — no `npm` / `yarn`. Lockfile is committed.
- **Always use `pnpm run <script>` for `deploy` / `destroy` (and any name pnpm reserves).** `pnpm --filter <pkg> deploy` invokes pnpm's built-in `deploy` command (which copies a workspace package into a deployable bundle), not the package's `scripts.deploy`. Same hazard with `destroy`. The four CI workflows already use `run`; the local equivalent is e.g. `pnpm --filter @borso/shared-infra run deploy`.
- **Conventional commits**, scope-enum: `borso-fr`, `borsouvertures`, `last-loop-lepin`, `infra`, `ci`, `docs`, `deps`. Husky enforces.
- **Biome** rules live in the root `biome.jsonc` and reach every workspace. Per-app configs extend root and set `"root": false`.
- **Stage** type is `'dev' | 'preview' | 'integ' | 'prod'`. `'dev'` is an app-code marker; constructs reject it via `assertDeployStage`.

## Clean code

- **Names carry the intent.** No one-letter locals (`h`, `c`, `x`) outside trivial scopes like `for (let i = 0; ...)`. Prefer `accumulator`, `candidate`, `entry`. Function names should describe the result, not the mechanism (`digestMigrations`, not `hashMigrations`).
- **Magic numbers and strings get names.** A bare `31` or `'\n---\n'` inside a function body becomes a named const. Same file is fine; the const declaration documents the choice.
- **Comments are for the WHY, not the WHAT.** Default to none. Only write a comment for: a non-obvious infra constraint (CloudFront Functions runtime, CFN intrinsics, advisory locks), a workaround for a third-party bug, or behavior a future reader would otherwise misread. Don't restate what the code does.
- **JSDoc is allowed on shared / exported functions.** Use it to document the contract (inputs, return value, surprising edge cases) and any cross-cutting notes (e.g. "called by the CFN custom resource provider"). Don't JSDoc internals just because.
- **Type assertions are restricted.** Only `as unknown` (single step, e.g. for JSON-parsing escape hatches) and `as const` (literal narrowing) are allowed. `as Foo` and `as unknown as Foo` are both banned by the `no-type-assertion-except-unknown` Biome plugin — chained casts are a type assertion in disguise. If you need a narrower type after `as unknown`, use a TypeScript type guard (`x is Foo`) or parse with a Zod schema. `as any` is hard-banned via `noExplicitAny`.
- **Pure utilities live in `*.utils.ts` and ship at 100% coverage.** Any file containing only deterministic, side-effect-free functions (RNG, parsers, formatters, transformers, palette/title/url builders, etc.) is named `something.utils.ts`. The repo's test runner asserts 100% statement / branch / function / line coverage on every file matching `**/*.utils.ts`. Modules that touch the DOM, the network, React state, or any other side effect do **not** carry the suffix and are out of scope for this gate — but a module mixing pure helpers with side-effect code should be split, not waived. The gate applies to every workspace, including frontend-only apps. There is no "this app is too small for tests" exemption — utilities are tested precisely because they are small and pure, which is exactly what makes them cheap to cover.
- **Back-end feature cores live in `*.core.ts` and are gated identically.** On the back, a feature's pure domain logic (rules, calculations, projections that take `now: Date` as an explicit argument) is named `<feature>.core.ts` and ships at 100% coverage on the same conditions as `*.utils.ts`. Distinct from `*.utils.ts` only in semantics: `.utils.ts` is for cross-cutting helpers (front-end avatar palettes, formatters, generic transformers); `.core.ts` is for the cœur métier of a bounded context (`punch.core.ts`, `ranking.core.ts`, `edition.core.ts`, `helpers/gpx/gpx.core.ts`). Same coverage gate, distinct intent. A `.core.ts` file MUST NOT call `new Date()` directly — `now` is always a parameter, which makes `vi.setSystemTime()` the only place time is injected.
- **`useEffect` is a smell.** Every `useEffect` in the diff has to justify itself. Most aren't synchronisation with React's tree — they're working around React rather than with it. Default to: derived state (compute during render), event handlers (do the work where the user clicked, not in an effect that watches state), CSS (media queries, animations, transitions), `useSyncExternalStore` (third-party stores, browser APIs that expose subscribe/unsubscribe). Reach for `useEffect` only when you genuinely need to *synchronise React state with an external system* — focus management after a real user action, an `addEventListener` to a global, an interval/observer that owns its own lifecycle, a `replaceState` reflecting initial state into the URL once on mount. If you're updating React state inside an effect that watched another piece of React state, you've almost certainly recreated `useMemo`. See Dan Abramov, [*You Might Not Need an Effect*](https://react.dev/learn/you-might-not-need-an-effect). Reviewers (`/technical-validation`) call out unjustified effects; implementers (`/implementation`) reach for the alternatives first.

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

## Dantotsus, knowledge, and ADRs

Three complementary folders, one purpose: keep the team's mental model ahead of the codebase's failure modes and the *why* of past trade-offs.

- [`docs/dantotsus/`](./docs/dantotsus/) — root-cause analyses with shipped eradications. Each entry follows the [Dantotsu standard](./.claude/skills/dantotsu/standard.md): Symptom → Root-cause chain → Detection failure causes → Countermeasure → **Eradication** (code-level, non-optional, linked by commit hash + diff). Eradication ladder, top is best: structural impossibility → DevX check → vendor patch → detection → knowledge (floor).
- [`docs/knowledge/`](./docs/knowledge/) — broad reference docs. Vendor quirks, CLI contracts, conventions, debugging recipes, anything the team needs to know that doesn't trace to a code-level fix.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records, one per non-trivial design trade-off. The audit trail of *why the code looks the way it does*: chosen path, alternatives, evaluation rubric, consequences. The [`/adr`](./.claude/skills/adr/SKILL.md) skill is the decision-support walk that produces them (the walkthrough is the value; the markdown file is the byproduct). Consumed downstream by [`/open-pr`](./.claude/skills/open-pr/SKILL.md) — every ADR referenced in a branch becomes a `<details>`-toggled section in the PR description, so reviewers can drill into the rationale without leaving the PR page.

Skim the indexes before starting non-trivial CDK / CloudFront / S3 / GitHub Actions work — the cost of reading a 30-line entry is far lower than the cost of re-discovering the trap.

When a PR uncovers a new trap, run the [`/dantotsu`](.claude/skills/dantotsu/SKILL.md) skill — it walks the seven Dantotsu steps and produces an entry under `docs/dantotsus/` with the eradication shipped in code. When you face a non-trivial architectural trade-off, run [`/adr`](./.claude/skills/adr/SKILL.md) *before* picking — it forces you to define criteria before options, name alternatives, and acknowledge two negative consequences of the chosen path. The Self-improvement loop rule below pulls this together.

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

## Deployments

- **Preview deploys are automatic.** A preview stack is created/updated on every PR push, and torn down on PR close, by the GitHub Actions workflow.
- **Prod deploys run from CI on push to `main`, gated by manual approval of the `prod` GitHub environment.** The workflow `.github/workflows/deploy.yml` does the work; Claude never runs `pnpm --filter ... run deploy` locally. **After a PR merges, Claude's deploy-related action is to remind the user to go approve the pending deploy in GitHub Actions** — once approved, the deploy is automatic. The reminder is not optional: a merged PR touching infra or app code sits in the approval queue until Hugo clicks Approve.
- **Migration cutovers (alias takeovers, bucket renames, CDK construct rewrites) are higher-risk prod deploys.** They additionally require the operator to walk the migration runbook for the affected resource. CloudFront alias takeovers are gated by `scripts/preflight-cloudfront-aliases.sh`; see [`docs/knowledge/cloudfront-cname-uniqueness.md`](./docs/knowledge/cloudfront-cname-uniqueness.md).

## Don'ts

- Don't reintroduce `pragma` as a slug — it's the upstream `borso-platform` test fixture, renamed to `test-app` here.
- Don't `import`/`export` in `infra/cdk/src/internal/cf-host-routing-function.code.js` — it's CloudFront Function source, read at synth time as a string and shipped to the edge runtime.
- Don't add an app without updating `.github/path-filters.yml` and the commitlint scope-enum.
- Don't `--no-verify`. Ever. Fix the hook failure instead.
- Don't forget the post-merge reminder: when a PR touching infra or app code merges, ping the user to approve the pending deploy in GitHub Actions — see *Deployments* above.
