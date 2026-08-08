# Blueprint: new application

An application is a folder under `apps/<slug>` that opens on its own, so
`cd apps/<slug> && pnpm dev` works on a fresh checkout and no application
imports from another one.

The mechanical steps, which are the CDK wiring, the workflow filters, and the
DNS entries, are already written up in
[`docs/adding-an-app.md`](../adding-an-app.md) for a front end only application
and in [`docs/adding-a-fullstack-app.md`](../adding-a-fullstack-app.md) for one
with an API and a database. Follow whichever applies, and then come back here
for the parts that make the new application follow the standards.

## Choosing the shape

An application with no server has a single `site/` folder, and `borso-fr` and
`borsouvertures` are the two examples.

An application with a server has `site/`, `api/`, and `cdk/` under one
workspace, and `last-loop-lepin` and `pragma` are the two examples.

Start with the front end only shape, because moving to the full shape later is
an afternoon and removing an unused database is not.

## Registering the slug

Adding a folder under `apps/` is not enough, and three other files need the
slug too.

Add a filter entry to `.github/path-filters.yml`, or the preview and deploy
workflows will not run for the new application.

Add the slug to the `scope-enum` in `commitlint.config.js`, or every commit
touching the application will be rejected by the commit message hook.

Add the workspace to `knip.json` when it needs an entry point that knip cannot
find by itself.

A documentation only slug such as `meta` does not need the path filter entry,
because nothing deploys from it.

## Files that have to exist before the first feature

Create the ESLint configuration extending the root one, the `vitest.config.ts`
with the coverage thresholds, the Stryker configuration, and the i18n
catalogues. Creating them first costs an hour, and adding them to a finished
application costs a week, because every file written in the meantime has to
change.

Copy the four from `apps/pragma`, which is the application that already
follows every standard.

## The scripts every application defines

| Script | Does |
|--------|------|
| `dev` | Starts everything the application needs locally |
| `build` | Builds the site bundle |
| `lint` | Runs ESLint with the cache |
| `typecheck` | Runs `tsc --noEmit` for the app and the CDK entry |
| `test` | Runs the full Vitest suite, starting Postgres when needed |
| `test:coverage` | Adds the coverage thresholds |
| `test:mutation` | Runs Stryker over the pure files |
| `synth`, `diff`, `deploy`, `destroy` | The CDK commands |

Two rules about the scripts have already caused incidents. Any script whose
name pnpm also uses, which includes `deploy` and `destroy`, has to be invoked
as `pnpm --filter <package> run <name>`, because without `run` pnpm runs its
own built-in command instead. A `destroy` script in a full stack application
targets the per pull request stack by name and never `--all`, because `--all`
deletes the shared database cluster too.

## Before the first pull request

Run the lint, typecheck, test, coverage, and mutation scripts, run a CDK synth,
and drive the application through the agentic browser check at 375 pixels. Then
write the first blueprint-conformance note in the pull request describing
anything you deliberately did differently.
