# ADR-2026-11-11T1658: Lambda source maps go to Sentry, not into the bundle

- **Status:** accepted
- **Date:** 2026-11-11
- **Deciders:** Hugo Borsoni
- **Tags:** pragma-cold-start, cdk, observability

## Context

pragma's production p95 sits at 2806 ms against a 2000 ms ceiling, while its
p50 is 114 ms against a 150 ms ceiling. The gap is cold starts: 17.6% of
invocations exceed 2000 ms and 97% of those build a container. A warm request
answers at a p95 of 697 ms.

A cold start spends about 1259 ms loading modules. Two sibling functions on the
same runtime, architecture and memory initialise in 202 ms and 352 ms, so about
1060 ms of that is pragma's own bundle: 2.79 MB of minified ESM across 2266
modules, beside a 13.7 MB source map.

`infra/cdk/src/constructs/lambda-api.ts` sets `sourceMap: true`, and
`apps/pragma/cdk/lib/stack.ts` sets `NODE_OPTIONS=--enable-source-maps`
whenever an app has a Sentry project. Node therefore reads and parses that
13.7 MB map at module-load time, on every cold start, so that an exception
reaching Sentry carries readable frames instead of a column number in a
minified bundle.

Measured locally, median of 7 imports of the real bundle: 355 ms with the flag
on and the map present, 264 ms with the flag on and the map removed, 244 ms
with the flag off. The map costs 91 ms and the flag another 20 ms, 31% of
module-load time. Scaled by the 1060/355 factor that the function's CPU share
already explains, that is roughly 330 ms of a cold start, inferred.

The construct is shared by `banana-rush`, `last-loop-lepin`, `pragma` and
`talos` through `previewable-app.ts`, so this is not a pragma setting.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A cold start is a user waiting nearly three seconds for a page that otherwise answers in 114 ms | Gateway `Latency` p95 on `AWS/ApiGateway`, against the `latency-p95` ceiling in `docs/quality/targets.md` |
| A production exception stays diagnosable | author | high | A stack trace through a 2.79 MB minified bundle names no function and no line, so an error becomes a guess | Open a pragma issue in Sentry and read whether the top frame names a repository file |
| Deploy keeps working for the three other apps | author | high | The construct is shared, so a change here reaches every full-stack deploy at once | `cdk synth` for each app, and the infra snapshot tests |
| Cost in new surface | operator | medium | A new dependency and a new build-time credential path are things the next maintainer has to keep working | Count of new dependencies and of workflows that must carry a secret |

## Decision

**Produce the map, upload it to Sentry at bundling time, and delete it from the
asset once the upload succeeded.** Sentry resolves frames
server-side from the uploaded map through the debug ids that
`sentry-cli sourcemaps inject` writes into the bundle, so the shipped map
becomes dead weight. `--enable-source-maps` stays set. It costs 60 ms of the
333 once scaled, and it is what makes a failed upload degrade to today's
behaviour instead of shipping minified frames silently: the map is still there
and the flag still reads it. An app that configures no upload is untouched.

This keeps both high-weight criteria. The rejected alternative keeps one and
drops the other.

## Consequences

- `+` Removes roughly 270 ms from every cold start, inferred from the local
  ratio against a measured 1060 ms of prod module load. Locally the map is 91 ms
  and the flag a further 20 ms; scaled by 2.99 that is 272 ms and 60 ms, so
  keeping the flag gives up 60 of the 333, not 20.
- `+` Sentry frames stay readable, and gain debug ids, which survive a release
  the uploader forgot to tag.
- `~` The three other apps are untouched. `last-loop-lepin` still sets
  `--enable-source-maps` and still reads its map, so dropping it there would
  have cost readable frames for nothing. `banana-rush` and `talos` ship a map
  they never read, which is the same dead weight, and removing it is a separate
  change this one does not make.
- `-` `@sentry/cli` becomes a build-time dependency of every full-stack deploy.
  It is smaller than it reads: `@sentry/vite-plugin` already pulled
  `@sentry/cli@2.58.6` into the lockfile, so this pins the version already
  there and exposes its binary, rather than adding a package to the tree.
- `-` `SENTRY_AUTH_TOKEN` reaches the API build, where today it reaches only
  the site build. It is already in `deploy.yml` and `preview.yml` for pragma.
- `-` A deploy now makes a network call to Sentry during bundling. A failed
  upload must not fail the deploy, so the upload is best effort and a missing
  map in Sentry shows up only as minified frames later.
- `~` The saving is inferred, not measured in production. The preview deploy
  this change produces is where the operator gets the real number.

## Alternatives considered

### Option A — Upload to Sentry and delete the map (chosen)

- **Raised by:** author
- **Summary:** `lambda-api.ts` takes an optional upload target. When it is
  present, an `afterBundling` command hook injects debug ids, uploads the map
  and, only on a successful upload, deletes it from the output directory.
  `--enable-source-maps` stays, so a failed upload leaves the old behaviour
  intact.
- **Strengths:**
  - Takes the full 330 ms, both the map read and the flag.
  - Keeps readable frames, which is the only reason the map was ever shipped.
  - Mirrors what `apps/pragma/vite.config.ts` already does for the site with
    `sourcemaps.filesToDeleteAfterUpload`, so the repository holds one pattern
    rather than two.
- **Costs:**
  - One new dependency, `@sentry/cli`.
  - A command hook in a construct four applications share, which is the part
    that can break a deploy for all of them at once.
- **Rationale:** It is the only option that keeps both criteria weighted high.

### Option B — Stop shipping the map, accept minified frames (rejected)

- **Raised by:** author
- **Summary:** Set `sourceMap: false` and delete the `NODE_OPTIONS` line. Two
  lines removed, nothing added.
- **Strengths:** Same 330 ms. No dependency, no credential, no network call at
  deploy, nothing new to maintain.
- **Costs:** A server exception in Sentry names a position in a 2.79 MB
  minified bundle. Diagnosing one means rebuilding the same commit locally and
  mapping the position by hand.
- **Rejection rationale:** Loses "a production exception stays diagnosable",
  weighted high. Lowering that criterion to medium would flip the decision, and
  it would be reasonable to lower it for an app with no users. pragma has
  users.
- **Operator's answer:** chose "Uploader vers Sentry, comme le site", with the
  cost of the new dependency and the ADR stated in the question.

### Option C — Keep the map and raise the function's memory (rejected)

- **Raised by:** author
- **Summary:** Leave the bundling alone and move the function from 512 MB to
  1024 MB. Lambda scales CPU with memory, and module loading is CPU bound.
- **Strengths:** One number, no code. Would cut roughly 530 ms of the 1060 ms,
  more than this ADR's 330 ms.
- **Costs:** Pays continuously for work that does not need doing. The 13.7 MB
  map is parsed on every cold start either way, only faster.
- **Rejection rationale:** CLAUDE.md's *lower the water, do not raise the boat*
  puts this last, and the operator decides it. It is still on the table as the
  next lever if the measured saving falls short, and it is recorded in the
  pull request rather than here, because it is not this decision.

## Scores

|  | Option A | Option B | Option C |
|---|---|---|---|
| Does it change the app for its users | ✓ roughly 270 ms off every cold start of the app that uploads | ✓ 330 ms, by also dropping the flag | ✓ roughly 530 ms, by a different lever |
| A production exception stays diagnosable | ✓ Sentry resolves frames from the uploaded map | ✗ minified frames only | ✓ unchanged |
| Deploy keeps working for the three other apps | ✗ a command hook they all run, unproven until a deploy | ✓ removes a setting, adds nothing | ✓ pragma's stack only |
| Cost in new surface | ✗ one dependency, one credential path, one network call | ✓ nothing added | ✓ nothing added, money instead |

## Implementation pointers

- Spec: none. The operator settled the one open question directly, so this ran
  as a Tier 1 chain with this ADR, not through `/specification`.
- Plan: none, same reason.
- Commit: pending
- Files: `infra/cdk/src/internal/source-map-upload.utils.ts` (the commands and
  the bundling options), `infra/cdk/src/constructs/lambda-api.ts` (the prop),
  `apps/pragma/cdk/lib/stack.ts` (where the `--enable-source-maps` constant
  was), `apps/pragma/vite.config.ts:37` (the site's existing upload, which this
  mirrors)
- Related ADRs: ADR-0031 (one Sentry project serves the monorepo, each app tags
  its events with `app`)
