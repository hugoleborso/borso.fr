# Putting an application on the map

The generator reads an application and writes a browsable map of it at five
levels. This is what an application has to provide for that map to be accurate,
what is optional, and how each requirement is held in place once it is met.

Run it with:

```bash
pnpm exec tsx scripts/architecture/architecture-graph.ts            # every app
pnpm exec tsx scripts/architecture/architecture-graph.ts --app foo  # one app
pnpm exec tsx scripts/architecture/architecture-graph.ts --check    # gate
pnpm exec tsx scripts/architecture/architecture-graph.ts --list     # the slugs
```

## The one thing that is not optional

**Every source file must resolve to a layer from its path alone.**

Nothing else in the generator matters if this does not hold. A node's position
is read off the path, so a file whose layer cannot be read has no position, and
it lands in an `unknown` bucket that makes every level above it wrong. This is
also the requirement that survives an AI writing the code: a rule a machine can
check is a rule that holds, and "put the service logic in the service" is not
one until the file name says which file is the service.

The resolution order lives in one place,
[`.claude/skills/blueprint/blueprint-utils.ts`](../../.claude/skills/blueprint/blueprint-utils.ts),
shared with the blueprint scripts so the two can never disagree:

1. **Composition roots by name.** `api/src/app.ts`, `api/src/main.ts`,
   `api/src/main.dev.ts`, `site/src/main.tsx`, `site/src/App.tsx`,
   `cdk/bin/cdk.ts`, `cdk/lib/stack.ts`. These keep their conventional names
   because `app.ts` sits on the path the front end compiles against and churning
   it buys nothing.
2. **Folder segments.** `/components/atoms/`, `/components/molecules/`,
   `/components/organisms/`, `/routes/`, `/lib/queries/`, `/i18n/`,
   `/database/`, `/constructs/`.
3. **File-name suffixes.** `.controller.ts`, `.service.ts`, `.repository.ts`,
   `.middleware.ts`, `.schema.ts`, `.core.ts`, `.utils.ts`, `.types.ts`,
   `.environment.ts`, `.queries.ts`, `.hook.ts`, `.store.ts`, `.adapter.ts`,
   `.client.ts`, `.setup.ts`, `.variants.ts`, `.d.ts`, `.config.ts`.

Anything else is `unknown`. To adopt the map in an application, rename until
nothing is left in that bucket:

```bash
pnpm exec tsx scripts/architecture/architecture-graph.ts --app <slug>
# then read the level 4 table, or the coverage panel on any level
```

### Why a suffix rather than parsing the code

Parsing is the obvious alternative: read the AST, see that a module exports
functions calling Drizzle, and call it a repository. It was rejected here for
three reasons.

- **It is a guess, and a guess drifts.** A module that mixes a query and a
  formatter has no single answer, so the classifier picks one and the map says
  something the code does not.
- **A suffix is legible to the author.** The rule is visible at the moment the
  file is created, in the file name, rather than in a report generated later.
- **A suffix is checkable in one line of shell.** Parsing needs the parser,
  which means the gate is slow enough to be skipped, and a skipped gate is not
  a gate.

Parsing is still the right answer for an existing codebase you cannot rename:
`architecture-model.ts` already carries a TypeScript-compiler pass for imports,
exports, call chains and Hono routes, so a `classifyByAst` step could fill the
`unknown` bucket. Treat that as a fallback for adoption, not as the substrate.

## The one hand-written file

Each application declares what no source file owns: who uses it, which runtime
containers it deploys into, and what each external system is. One file under
[`scripts/architecture/manifests/`](../../scripts/architecture/manifests/), one
line in the register in
[`architecture-manifest.ts`](../../scripts/architecture/architecture-manifest.ts).

Start from
[`borso-fr.manifest.ts`](../../scripts/architecture/manifests/borso-fr.manifest.ts),
which is the smallest one: a single actor, two containers, no externals.

The manifest is cross-checked against the code in both directions. A declared
external no file reaches fails the generator, and so does a
`@DependsOnExternal` naming an external the manifest does not declare. Either
half alone is how a context diagram drifts away from the code it claims to
describe.

## What is optional, and what each optional part buys

| Part | Optional | Without it |
| ---- | -------- | ---------- |
| `@DependsOnExternal <id>` | Yes | Level 1 draws the actor and the system alone, and no third party appears anywhere |
| An `.adapter.ts` per outbound call | Yes | The tag is the only evidence an external exists, so a `fetch` written without one makes level 1 quietly wrong (ADR-0012) |
| `@Feature <id>` | Yes | Level 3 falls back to the folder, which mixes the granularity axis with the feature axis on the front end |
| Blueprints | Yes | Blocks carry no pattern pill, and the Blueprints tab is empty |
| Standards documents | Yes | The Standards tab is empty. Nothing else on the map changes; they are what makes the conventions above hold |
| `*.queries.ts` modules | Yes | Level 3.5 has no user actions, because an action is an exported hook in one of them |
| A Hono API | Yes | No routes, no endpoints on 3.5; the map stops at level 3 in practice |
| `urlOnlyScripts` | Yes | A route reached only by a plain script, such as a service worker fetching by URL string, reads as unreached |

A front-end-only application therefore gets levels 1, 2, 3 and 4, and an empty
3.5. That is the honest answer rather than a degraded one: there are no user
actions to walk when nothing calls an endpoint.

## Holding the conventions in place

The map is generated, so it cannot enforce anything by itself. What stops the
next agent from writing `helpers.ts` is the layer below it.

| Convention | What holds it |
| ---------- | ------------- |
| Every file resolves to a layer | `architecture-graph.ts --check` in pre-commit and in CI, which regenerates and fails on any byte of drift |
| Pure modules are `*.core.ts` / `*.utils.ts` | The 100% coverage gate keyed on those suffixes: naming a file `.utils.ts` opts it into a threshold, so the name is load-bearing rather than decorative |
| Controllers stay dispatchers | [`docs/standards/`](../standards/README.md), read by the `/code-standards` skill before any change in `apps/` |
| A pattern is copied rather than reinvented | The blueprint annotations, with `blueprint-indexing.ts --check` and `blueprint-heatmap.ts --check` in pre-commit |
| The map matches the code | `architecture-graph.ts --check`, plus the pull-request comment saying what moved |
| Externals are declared once | The two-way manifest cross-check above |
| An outbound call is where the map can see it | `borso/no-outbound-call-outside-adapter`, which rejects a `fetch` or an AWS SDK client outside a `<domain>.adapter.ts` |
| No rule is disabled quietly | `eslint-comments/require-description` plus `reportUnusedDisableDirectives`, and the disable count printed on the block itself |

The ordering matters. A convention with a document and no gate lasts until the
first agent that has not read the document. A convention with a gate and no
document gets worked around. The pairs above are the ones that have both.

**Adding a new suffix** means editing `LAYER_BY_FILE_SUFFIX` in
`blueprint-utils.ts`, adding a row to
[`docs/standards/01-naming.md`](../standards/01-naming.md), and regenerating.
The generator will not invent a layer for a suffix it does not know, which is
deliberate: an unknown suffix should be a decision, not a silent new category.

## Adding an application, end to end

1. `pnpm exec tsx scripts/architecture/architecture-graph.ts --app <slug>` and
   read what it says about unknown layers.
2. Rename until that number is zero.
3. Write `scripts/architecture/manifests/<slug>.manifest.ts` and add it to the
   register.
4. Tag whatever reaches outside with `@DependsOnExternal`, and declare each one
   in the manifest.
5. Regenerate, commit the page, and let `--check` keep it honest from there.
