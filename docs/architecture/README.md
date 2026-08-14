# Architecture diagrams

[`pragma-architecture.html`](./pragma-architecture.html) is a generated,
browsable map of `apps/pragma` at five levels. Regenerate it with:

```bash
pnpm exec tsx scripts/architecture/architecture-graph.ts
```

Pre-commit runs the same script with `--check` whenever a commit touches
`apps/pragma/`, so the page cannot fall behind the code.

## The rule this rests on

**A node's position is read off its path, never decided by a person.** Every
source file in pragma ends in a suffix naming its layer, and the layer table
lives in
[`.claude/skills/blueprint/blueprint-utils.ts`](../../.claude/skills/blueprint/blueprint-utils.ts),
shared with the blueprint scripts so the two cannot disagree. Today every one
of pragma's 223 source files resolves to a known layer, with none left over.

Suffixes beyond the ones in [`01. Naming`](../standards/01-naming.md):

| Suffix         | Contents                                                     |
| -------------- | ------------------------------------------------------------ |
| `.queries.ts`  | TanStack Query keys and hooks for one bounded context         |
| `.hook.ts`     | A React hook that is not a component                          |
| `.store.ts`    | Module-level state a component subscribes to                  |
| `.adapter.ts`  | The boundary module talking to a browser or storage API       |
| `.client.ts`   | The typed client for an API this repository owns              |
| `.setup.ts`    | Boot-time wiring, run once for its side effect                |
| `.variants.ts` | A `cva` variant table for one component                       |

Composition roots keep their conventional names (`main.ts`, `app.ts`,
`main.tsx`, `App.tsx`, `cdk/bin/cdk.ts`, `cdk/lib/stack.ts`) and are recognised
by name rather than renamed, because `app.ts` sits on the path the front end
compiles against and churning it buys nothing.

## Where layout happens

ELK's layered algorithm runs **in the generator**, not in the page, and the
emitted HTML carries node coordinates and edge bend points rather than a layout
engine. That is what keeps edges out of the boxes they do not connect: routing
around obstacles needs a dummy node per rank an edge crosses, which is the half
of the Sugiyama pipeline a hand-rolled renderer skips.

Measured with a probe that samples forty points along each rendered path and
tests them against every node rectangle, the hand-rolled renderer put **72 of
the component level's 125 edges through an unrelated node**. It is now 0 of 125,
and 0 at the context and container levels too.

ELK is deterministic, so the committed page stays byte-identical between runs
and `--check` needs no tolerance. `elkjs` is a devDependency of the generator
and never reaches the browser. See
[ADR-0011](../adr/0011-elk-lays-out-the-architecture-graph-at-generation-time.md).

## The five levels

| Level     | Shows                                                     | Derived from                                    |
| --------- | --------------------------------------------------------- | ----------------------------------------------- |
| 1 Context | Actors, the system, external systems                      | The manifest, cross-checked against tags        |
| 2 Container | Deployable and build-time units and the edges between them | Container of each file, plus real imports      |
| 3 Component | Bounded contexts and front-end areas                     | Folder, or a `@Feature` tag when one is present |
| **3.5 Slice** | One context walked end to end                        | Hono call chain, then identifier references     |
| 4 Code    | Every file and every import                               | The module graph                                |

### Why 3.5 exists

Component is too coarse to trust and code is too fine to read. Level 3.5 takes
one bounded context and walks each HTTP route through the service and repository
functions it actually calls, down to the tables and external systems it reaches,
then back up to the front-end modules that call the endpoint.

It is the level at which you can decide whether a slice does what its name
claims without opening a file, which is what you need when reviewing code an
agent wrote. The chain is real: routes come from the Hono chain as written,
each step from the identifiers that function references, and the tables from
imports that resolve to a schema module.

Attribution is per symbol, not per file. A file-level `@DependsOnExternal` in
the header applies to every export, because a repository holding the S3 client
is entirely about S3. A tag deeper in the file belongs to the one declaration it
sits above, which is how `DELETE /api/songs/:id` avoids claiming it calls
MusicBrainz just because a sibling function in the same service does.

Callers are counted two ways: through the typed Hono client, read off the
property chain, and by URL string, which is how the service worker reaches the
API. A route with neither is reported as unreached, and the generator does not
guess whether that means deliberate or dead.

## The two hand-written inputs

Everything else is derived. These two record what a path cannot carry.

**`@DependsOnExternal <id>`** names an external system, on the file or the
function that reaches it. Every id must appear in the manifest, and every
manifest entry must be referenced by at least one tag; `--check` fails on either
half alone.

**`@Feature <id>`** groups front-end files that belong to one feature. Atomic
design is a granularity axis and carries no feature axis, so the catalogue is
spread across `routes/catalog/`, `lib/queries/songs.queries.ts` and several
organisms with no structural tie between them. **No file carries this tag yet** —
level 3 falls back to the folder, and whether to tag or to restructure
`site/src/` by feature is still open.

The manifest is
[`scripts/architecture/pragma.manifest.ts`](../../scripts/architecture/pragma.manifest.ts):
actors, containers and external systems, which no single source file owns.

## Blueprints in the diagram

Blueprints are an overlay, not the substrate. A blueprint answers *which
example does this copy*; a position answers *where does this sit*. Coverage is
partial by design — 25 of pragma's files carry no marker — so it can never be
the thing that places a node. The page shows blueprint counts on each node and
lists every pattern with its followers under **Patterns**.

## On a pull request

[`.github/workflows/architecture.yml`](../../.github/workflows/architecture.yml)
builds the model twice, for the merge base and for the head, and posts one
comment saying what moved: routes added or removed, routes reaching a table or
an external system they did not reach before, routes that lost their last
caller, files that changed layer, and new external systems. The comment is
rewritten in place on each push rather than added to.

The target branch does not need to carry the generator. The script runs at the
head revision against a worktree of the base through `--app-root`, so a branch
opened before any of this existed still gets a comparison. Manifest mismatches
are fatal for the tree being committed and only a warning when scanning another
checkout, because a branch that adds an external system would otherwise fail on
the target branch not having it yet.

The page itself is uploaded as a workflow artifact, and the same file is
committed here. Publishing to GitHub Pages would turn it into a plain link
instead of a download, and needs Pages enabled on the repository, which is a
setting this repository cannot check for itself.

To reproduce a comparison locally:

```bash
git worktree add --detach ../architecture-base "$(git merge-base origin/main HEAD)"
pnpm exec tsx scripts/architecture/architecture-graph.ts \
  --app-root ../architecture-base/apps/pragma --out /tmp/architecture-base
pnpm exec tsx scripts/architecture/architecture-diff.ts \
  /tmp/architecture-base/pragma-architecture.json \
  docs/architecture/pragma-architecture.json
```

## Known limits

- Only `apps/pragma` is modelled. The generator hard-codes one manifest.
- A route handler defined outside the controller file is not followed.
- The walk stops at depth six, which no chain in pragma currently reaches.
- `sw.js` is scanned for URL strings only, since it ships as plain script.
