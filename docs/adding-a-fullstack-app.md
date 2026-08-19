# Adding a full-stack previewable app

**Copy `apps/pragma/`.** It is the reference, it is deployed, and every claim
below was read out of it rather than remembered.

This page used to be a specification, written before any full-stack application
existed. Two exist now, `pragma` and `last-loop-lepin`, so a specification is
the wrong shape: it drifts from the code and nothing notices. What remains here
is the part copying an application cannot give you, which is the list of places
outside the application that have to learn its name.

## The shape

```
apps/<slug>/
├── site/            Vite + React. Source under site/src/, index.html at site/.
├── api/             Hono on Lambda. One folder per bounded context under api/src/.
├── cdk/             The stack, composing the constructs from @borso/infra.
├── domain/          Optional. Only rules BOTH site/ and api/ read. See ADR-0010.
├── test/            Back-end end-to-end, against a real Postgres.
├── VOCABULARY.md    The application's nouns. See docs/standards/01-naming.md.
├── vitest.config.ts Two projects, `core` and `back-e2e`. See below.
└── package.json
```

`api/src/` is vertical slices, never horizontal folders. Each bounded context is
one folder holding `<domain>.controller.ts`, `.service.ts`, `.repository.ts`,
`.schema.ts`, and optionally `.core.ts` and `.types.ts`. See
[`docs/standards/04-backend-architecture.md`](./standards/04-backend-architecture.md).

## The two vitest projects

A full-stack application has two kinds of test and they cannot share a runner
configuration. `core` is pure and parallel. `back-e2e` boots one shared Postgres
and therefore runs serial, single worker, no isolation.

Copy `apps/pragma/vitest.config.ts` whole. Three things in it are load-bearing
and each cost a debugging session to learn:

- The projects carry an explicit `sequence.groupOrder`, because vitest refuses
  to schedule two projects that disagree on `maxWorkers` inside one group and
  aborts the run before a test executes.
- `back-e2e` excludes `*.core.test.ts`, `*.utils.test.ts`, `*.adapter.test.ts`
  and `*.schema.test.ts`. Without those four lines the pure tests run a second
  time behind Postgres. `last-loop-lepin` was missing two of them and ran 15
  files twice.
- Coverage sits above the projects, not inside one, because a run has a single
  coverage configuration shared by all of them.

## The local database

`scripts/local-postgres.sh` boots a Docker-less, sandbox-private cluster per
application, so `pnpm test` works where Docker is not reachable. It takes the
application slug and nothing else:

```jsonc
"dev:db":        "../../scripts/local-postgres.sh start <slug>",
"db:local:stop": "../../scripts/local-postgres.sh stop <slug>",
"test":          "DATABASE_URL=$(../../scripts/local-postgres.sh start <slug>) vitest run --project back-e2e"
```

See [`docs/knowledge/local-postgres-without-docker.md`](./knowledge/local-postgres-without-docker.md).

## Two stacks, and why `destroy` is scoped

A database-backed application synthesizes **two** stacks: `<slug>-cluster`,
long-lived and owning the DSQL cluster across every stage, and `<slug>-pr-<n>`
or `<slug>-prod`, disposable and owning everything else. CDK walks them in
dependency order, so a first preview deploy needs no manual ordering.

`cdk destroy --all` deletes both, which on PR close would wipe the shared
database. Scope the `destroy` script to the per-stage stack with a fail-fast
guard, exactly as pragma does:

```
cdk destroy "<slug>-pr-${PR_NUMBER:?PR_NUMBER env var required}" --force
```

See [`docs/dantotsus/cdk-destroy-all-wipes-the-shared-cluster-stack.md`](./dantotsus/cdk-destroy-all-wipes-the-shared-cluster-stack.md).

## What has to learn the application's name

Copying the folder gets none of these, and the first four are gated.

| Where | What | Gated by |
| --- | --- | --- |
| `.github/path-filters.yml` | `<slug>: 'apps/<slug>/**'` | `scripts/check-app-registration.sh` |
| `commitlint.config.js` | `<slug>` in `scope-enum` | `scripts/check-app-registration.sh` |
| `knip.json` | a `workspaces` entry naming the entry points | `pnpm exec knip` |
| `apps/<slug>/VOCABULARY.md` | the application's nouns | `scripts/check-vocabulary-paths.sh` |
| `scripts/check-pure-modules-have-callers.sh` | an allowlist line, only for a pure module whose one caller really is its test | that script |
| `docs/features/<slug>/` | where the feature conversations go | nothing |

The deploy workflows discover applications from the workspace with
`pnpm ls -r --filter "./apps/*" --json`, so no matrix needs editing.

## What you do not have to do

- Wire IAM for the Lambda to reach DSQL. `PreviewableApp` does it.
- Manage the cluster lifecycle. Prod owns it and it is deletion-protected;
  preview and integ create and drop only their own schema.
- Bundle `postgres` into a Lambda layer. esbuild inlines it.

## Before merging

- `cd apps/<slug> && pnpm install && pnpm dev` works on a fresh checkout.
- Nothing imports a sibling application. `@borso/infra` is the only shared code.
- `pnpm --filter @borso-app/<slug> run synth` produces both stacks.
- The preview URL renders, and closing the pull request tears down the
  per-stage stack while the cluster stack survives.

## See also

- [`adding-an-app.md`](./adding-an-app.md) — the front-end-only subset.
- [`architecture.md`](./architecture.md) — what each construct produces, and
  why DSQL rather than RDS.
- [`flows.md`](./flows.md) — the preview and prod deploy flows.
