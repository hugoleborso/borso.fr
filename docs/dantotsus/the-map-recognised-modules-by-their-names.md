---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#49'
fix-commits: [a5bdfb5356]
eradication-level: 1
eradication-paths: [scripts/architecture/architecture-model.ts]
time-to-detect: days
tags: [architecture-map, static-analysis, naming, tooling]
zone: scripts/architecture
---

# The map recognised modules by their names, so an application that had not been renamed read as empty

## User impact

The architecture map is read by the operator and by agents to see how an
application is built. It described two applications confidently and wrongly.

| | Seen | Expected |
| --- | --- | --- |
| `last-loop-lepin`, level 3.5 | No user actions at all, 20 of 25 HTTP routes "unreached", a coverage headline of 93% | 20 user actions, 6 of 25 routes with no front-end caller |
| `borsouvertures`, import graph | 67 import edges across 103 files, 1% level 3.5 coverage | 273 edges, 91% coverage |

Fourteen of the twenty "unreached" routes are called by the front end on every
page load. The numbers were measured before and after the fix in commit
`a5bdfb535`, with no application code changed.

## Causal chain

- The map showed `last-loop-lepin` with no user actions and most routes
  unreached, and `borsouvertures` with almost no imports.
  - The generator resolved no alias in `borsouvertures`, recognised no query
    module and no API client in `last-loop-lepin`, and each miss produced an
    absence, not an error. An unresolved import is an edge that does not
    exist. A route nothing calls is reported as unreached.
    - It recognised each by a name taken from pragma:

      ```ts
      ['@api/', join(applicationRoot, 'api/src')],                   // aliases: a fixed list
      .filter((edge) => edge.targetFile?.endsWith('.client.ts') === true) // client: a file suffix
      ```

      plus query modules as files ending `.queries.ts`. `borsouvertures` maps
      `@/*` to `./site/*`. `last-loop-lepin` keeps its queries at
      `lib/queries/punches.ts` and its client at `lib/api.ts`.
      - Commit `d562e9159` (2026-08-14 03:09, PR #49) wrote these readers. Its
        subject is "generate a browsable architecture map of pragma at five
        levels", and its input was a map of pragma alone, whose files already
        followed those names.
      - Commit `400986600` (2026-08-15 01:04) turned it into "one map per
        application" by adding five manifests, and left the three readers as
        they were (measured, its diff of `architecture-model.ts` touches none
        of them).

## Root cause of occurrence

*Thought pragma's file names are the repository's conventions. Actually only
pragma had been renamed to them, and each application declares the same facts
elsewhere: aliases in its own `tsconfig.json`, query modules by folder in the
shared layer table.* (Machine)

The tag is Machine. The generator was built and exercised against one
reference application, so the only run that could tell "nothing here" from
"I cannot read this" never happened. The step that extended it to every
application added manifests and no run against an application that had not
adopted pragma's names.

## Detection failure causes

- **CI:** `--check` compared the generator's bytes with the committed bytes. A
  wrong map regenerates to the same wrong bytes, so the gate proves
  reproducibility, not truth.
- **Local validation:** pragma was the reference for both the conventions and
  the tool, so the tool ran only where the conventions held.
- **Review:** "this application has few user actions" and "these routes are
  dead" are things a real codebase says. Twenty unreached routes did not look
  like a parser failure.
- **The map's own coverage panel** showed 93%, because the shell and request
  walks draw files without any user action.

## Countermeasure

Commit `a5bdfb535` recognised each by a source the application already keeps:

| Recognised | Was | Now |
| --- | --- | --- |
| Path aliases | a fixed list of three prefixes | `compilerOptions.paths` in the application's `tsconfig.json` |
| Query module | file name ends `.queries.ts` | the file's layer is `query`, from the shared layer table, which maps `/lib/queries/` too |
| Typed client | import from a file ending `.client.ts` | the binding the caller reads, `api` |

Level 3.5's title now says which of two reasons explains an empty level: no
API, or an API the walk could not read, styled as a problem.

## Eradication

**Type:** structural impossibility (level 1) for the aliases and for the query
modules of user journeys.

**Reference:** commit `a5bdfb535`. `architecture-journeys.ts` filters on
`file.layer === QUERY_LAYER` (line 812 today), and the layer table in
`.claude/skills/blueprint/blueprint-utils.ts` maps both `.queries.ts` and
`/lib/queries/` to `query`. The aliases come from the compiler's own config,
so they cannot drift from what the build resolves.

**The gap, two places still read a name:**

- `readHookGestures` in `scripts/architecture/architecture-model.ts` (line 956)
  still keeps hooks imported from files ending `.queries.ts`. It came from
  commit `7a49deadd`, eight hours before the fix, which did not change it.
  `last-loop-lepin`'s query modules are `lib/queries/auth.ts`, `editions.ts`
  and `punches.ts`, so their hooks are not read there. The effect on the
  rendered map is inferred, not measured.
- The client binding is the name `API_CLIENT_BINDING = 'api'` (line 208).
  Every front end that calls `hc<…>()` exports its client as `api` today,
  either directly or, in borsouvertures, as `api: ApiClient = buildApiClient()`
  where `buildApiClient` returns the `hc<…>()` result (measured,
  `grep -rn "hc<" apps/*/site/src`). Nothing makes them.

**Proposed:** make `readHookGestures` filter on the layer, as the journeys
already do, so no reader of query modules keeps a suffix. Add a rule under
`eslint-rules/` that requires the module calling `hc<…>(…)` to export a
binding named `api` holding that client, whether it binds the call directly
or through a factory such as `buildApiClient`, and refuses an exported client
under any other name. Then an application whose client is named otherwise
fails lint, instead of drawing no user actions in silence.

**Proof it can fail:** not re-run this session. The fix commit measured the
before and after table above on the same tree.

**Similar instances:** `grep -n "endsWith('\.\|API_CLIENT_BINDING" scripts/architecture/*.ts`
finds the two above, plus schema files recognised by `.schema.ts` or
`/schema.ts` (lines 576 and 761). Every back end here names its schema that
way, and the layer table maps both, so those hold today but are the same
shape.
