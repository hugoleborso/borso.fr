# ADR-0027: talos deploys to prod only, and an app can opt out of previews

- **Status:** proposed
- **Date:** 2026-10-06
- **Deciders:** Hugo Borsoni
- **Tags:** talos, cdk, ci

## Context

talos is a personal assistant for one person. Its API reads and writes a private GitHub repository of notes, tasks and proposals, with a token stored in SSM under `/talos/`. It used to live in that private repository and deploy from it with its own role; it now lives in `apps/talos/` here and deploys through this repository's `deploy.yml` and `ProdDeployRole`.

Every other app here gets a preview per pull request, at `<app>-pr-<n>.preview.borso.fr`, built by `preview.yml` for every app the pull request touches, and for every app at once when `infra/cdk` or the dependency catalog changes. A talos preview would run pull-request code with the production GitHub token and serve the private repository's content on a public host. Its passkeys are bound to `talos.borso.fr`, so a preview starts with no passkey, and its first registration is gated only by the bootstrap code, which is the same SSM value production reads. The repository is public, so anyone can read the code a preview runs.

## Decision

**talos deploys to `prod` only, and an app opts out of previews with `"borso": { "previews": false }` in its `package.json`.** `preview.yml` drops such an app from the list it builds, and `apps/talos/cdk/bin/cdk.ts` refuses any stage but `prod`, so a preview cannot be built by mistake either. A talos change is proved by its tests, its synth in CI and the prod deploy after merge.

## Consequences

- `+` No host other than `talos.borso.fr` ever serves the private repository's content, and no pull-request code runs with the production token.
- `+` The opt-out is one field the workflow reads, not a list of slugs in a YAML file.
- `-` A talos change has no running copy before merge. A broken screen reaches prod, and the fix is another merge.
- `-` An `infra/cdk` change still redeploys talos in prod after merge, with no preview of talos in between.
- `~` The `talos-pr-<n>` stack name never exists, so the preview teardown and `cleanup-orphans.yml` never meet one.

## Alternatives considered

### Option A — prod only, opt-out field (chosen)

- **Summary:** as in the decision.
- **Strengths:** no second host for private data; nothing new to provision.
- **Costs:** no pre-merge running copy of talos.
- **Rationale:** the content is the owner's private life, and a preview's value here, seeing a screen before merge, does not pay for a second place that content can leak from.

### Option B — previews with their own GitHub token and a fixture repository (rejected)

- **Summary:** previews read a separate, fictional content repository with a second token, so nothing private reaches a preview host.
- **Strengths:** a running copy before merge, without private data.
- **Costs:** a second repository to keep in step with the content formats, a second token to create and rotate, a stage switch in the stack for which repository and which SSM prefix to read.
- **Rejection rationale:** it doubles the secrets and the content to maintain for a one-user app whose screens are covered by component tests.

### Option C — previews against the production repository, behind the same passkey gate (rejected)

- **Summary:** build previews like every other app, reading the same repository with the same token.
- **Strengths:** no special case in the workflow.
- **Costs:** pull-request code runs with write access to the private repository; the bootstrap code becomes the only gate on a fresh preview host.
- **Rejection rationale:** fails the one criterion that matters, keeping the private content on one host.

### Option D — do nothing: leave talos in its private repository (rejected)

- **Summary:** talos keeps deploying from `hugoleborso/talos` with `TalosDeployRole` and consumes `@borso/infra` as a submodule.
- **Strengths:** no change here.
- **Costs:** a second copy of every gate, hook and workflow to keep in step; construct changes reach talos only when the submodule pointer moves; a dedicated deploy role in `infra/shared`.
- **Rejection rationale:** the move is what the owner asked for; this ADR only decides how talos deploys once here.
