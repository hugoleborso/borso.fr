# Architecture diagrams

[`index.html`](./index.html) lists one generated map per application, each at
five levels, from the same generator and the same rules:

- [`pragma-architecture.html`](./pragma-architecture.html)
- [`last-loop-lepin-architecture.html`](./last-loop-lepin-architecture.html)
- [`borsouvertures-architecture.html`](./borsouvertures-architecture.html)
- [`borso-fr-architecture.html`](./borso-fr-architecture.html)

Regenerate them with:

```bash
pnpm exec tsx scripts/architecture/architecture-graph.ts            # every app
pnpm exec tsx scripts/architecture/architecture-graph.ts --app foo  # one app
```

Pre-commit runs the same script with `--check` whenever a commit touches
`apps/` or the generator, so no page can fall behind the code.

**To put a new application on the map, read [`install.md`](./install.md)** —
what a codebase must provide, what is optional, and what holds each convention
in place once it is met.

## The rule this rests on

**A node's position is read off its path, never decided by a person.** Every
source file in pragma ends in a suffix naming its layer, and the layer table
lives in
[`.claude/skills/blueprint/blueprint-utils.ts`](../../.claude/skills/blueprint/blueprint-utils.ts),
shared with the blueprint scripts so the two cannot disagree. Today every one
of pragma's 223 source files resolves to a known layer, with none left over.

The full resolution order, and how to adopt it in an application that does not
follow it yet, is in [`install.md`](./install.md). Suffixes beyond the ones in
[`01. Naming`](../standards/01-naming.md):

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

Each diagram opens showing the whole graph: the canvas is fitted to the stage,
and the stage takes the height that fitted graph needs rather than a fixed one,
so a wide level does not sit as a strip inside an empty box. From there, pinch
or scroll to zoom, drag to pan, and **Fit** returns to the whole. The zoom
buttons do the same thing for anyone not using a wheel or a touchscreen.

## The five levels

| Level     | Shows                                                     | Derived from                                    |
| --------- | --------------------------------------------------------- | ----------------------------------------------- |
| 1 Context | Actors, the system, external systems                      | The manifest, cross-checked against tags        |
| 2 Container | Deployable and build-time units and the edges between them | Container of each file, plus real imports      |
| 3 Component | Bounded contexts and front-end areas                     | Folder, or a `@Feature` tag when one is present |
| **3.5 User action** | One thing a person does, walked end to end     | Query hooks, then identifier references         |
| 4 Code    | Every file and every import                               | The module graph                                |

### Why 3.5 exists

Component is too coarse to trust and code is too fine to read. What sits
between them is not another slice of the API, though: the first version of this
level listed a bounded context's HTTP routes, which is the API's own shape.
Nobody appends a row to `setlist_entry`; they add a song to a setlist.

So the unit is a **user action**, and the level draws one flow per action: the
components that trigger it, the hook, the endpoint, and every function behind
that endpoint down to the tables and external systems. Pick a feature, then an
action, or take **Everything in <feature>** to see where its actions meet.

A flow starts where a person starts: the URL. The router is the one place that
ties an address to a component, so `<Route path="/bars" element={<BarsPage />} />`
gives the first block, the page is walked down through the components that
render it, and the block before the hook is the gesture — the JSX `on…`
attribute the hook's binding sits under. `/bars → BarsPage → onSubmit →
useCreateBar → POST /api/bars → createBar → insertBar → bar`. Only a write gets
a gesture block: a read hook's data reaches a handler too, and drawing that as
something the person did would be a claim the code does not make.

An action is an exported hook in a `*.queries.ts` module that calls one
endpoint. Those are the application's user-facing operations, already named by
whoever wrote them, so `useAppendSetlistEntry` reads as *Append setlist entry*
without anyone maintaining a list. There are 37 of them across 9 features.

The chain is real: the triggers come from imports of that hook, the endpoint
from the call on the typed client, and each back-end step from the identifiers
that function references. A service two actions share is one node in both, so
the place two flows meet is visible.

Attribution is per symbol, not per file. A file-level `@DependsOnExternal` in
the header applies to every export, because a repository holding the S3 client
is entirely about S3. A tag deeper in the file belongs to the one declaration it
sits above, which is how a delete avoids claiming it calls MusicBrainz just
because a sibling function in the same service does.

Each block carries its layer, the blueprint it follows where the code is marked,
and how big and how tangled the thing behind it is. Clicking a block opens the
function's own source, highlighted, with its `path:line`, so the question a
block raises — *what does this actually do* — is answered without leaving the
page. Sources are keyed once and shared across the 46 graphs, because the same
service appears in several flows.

Endpoints behind no action are listed under the graph. Some are deliberate, and
the rest are the back end of a feature whose front end does not exist yet; the
generator reports the fact and does not guess which.

## What a block says

Every block on every level prints the same three rows: the name, what it is,
then how big and how tangled it is.

| Row     | On a level 3.5 block          | On a level 1–3 block                    |
| ------- | ----------------------------- | --------------------------------------- |
| Name    | The function or component     | The container, context or system        |
| What    | Layer, and the blueprint      | File count, and routes where there are any |
| Counts  | Lines, `cx`, and disables     | The same, summed over the files it holds |

`cx` is cognitive complexity by the
[SonarSource rules](https://www.sonarsource.com/resources/cognitive-complexity/):
nesting-weighted rather than path-counting, so a triple-nested `if` costs more
than three flat ones, and a sequence of one boolean operator costs one however
long it is. It is a reading-difficulty number, not a testing-effort one.

The disable count appears only when a block's code carries an
`eslint-disable`, since the interesting case is the one that has any.

The box is sized from the text it prints and has no ceiling: a capped width
clips whatever runs past it, silently and only in the page, which is how a route
as long as `DELETE /api/mastery/defaults/:memberId/:instrumentId` came to sit
outside its own block. A probe walks all 49 graphs and reports 0 blocks whose
text leaves its box, alongside 0 edges through an unrelated one.

Blocks of one kind sit together. ELK treats input order as a tiebreaker once
crossings are minimised, so the generator hands it nodes sorted by kind, and the
external systems land beside each other instead of interleaved with the browser
APIs they share a rank with.

## What each level leaves out

Every level ends with a coverage panel: how many of the application's files it
draws, a bar per layer, and the files it does not draw in a list collapsed by
default. Levels 1, 3 and 4 account for every file by construction and say so in
one line. Level 2 draws a file when its container is one the manifest declares.
Level 3.5 draws a file when some user action reaches one of its exports, which
is 53 of pragma's 243 — the rest is atoms and molecules no single flow names, the
back end of a feature whose front end does not exist, and code nothing reaches.

A diagram that shows most of a codebase and says nothing about the rest is read
as showing all of it, which is the failure this panel exists to prevent.

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

- An application with no query modules has an empty level 3.5, because a user
  action is an exported hook in one of them. Today only pragma has any.
- A route handler defined outside the controller file is not followed.
- The walk stops at depth six, which no chain in pragma currently reaches.
- `sw.js` is scanned for URL strings only, since it ships as plain script.
