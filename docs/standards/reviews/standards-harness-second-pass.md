# Standards review — claude/codebase-standards-practices-mtyo5e against fb05c33

Verdict: FINDINGS
Ledger: 75b126fed4b7
Reviewed: 16 file(s). Sealed: 6. Findings: 4.

Scope: the `reviewer` bullets in `docs/standards/enforcement-ledger.md`, section
*What only a reviewer can check*. Sixteen non-test TypeScript files changed
between `fb05c33` and `HEAD`; eight of them sit under `apps/` and are the ones
`isReviewablePath` asks a seal for.

## Findings

### apps/borsouvertures/scripts/build-openings.ts:49

Bullet: `reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do.

```ts
 * with, so `Queen's Gambit` listed above `Queen's Gambit Declined` would take
 * every declined row with it. `assertEveryFamilyMatched` fails the build when
 * a name here wins nothing, which is how the shadowing and two typographic
 * apostrophes below were found after six families had been silently absent.
```

The first half of this block earns its place: *"Order is load-bearing: a row is
assigned to the first entry its name starts with"* is a constraint on an
external dataset that no name or type can carry. The clause from `which is how`
onward is the story of the commit that fixed it — six families absent, two
apostrophes wrong — which is what `git log` and the PR body hold. Cutting from
`which is how` to the end of the sentence leaves the rule intact.

The same block, four lines later:

```ts
 * Names are the source dataset's own, exactly. `Giuoco Piano` is not here
 * because lichess titles those rows `Italian Game: Giuoco Piano`, so it is a
 * variation of the Italian Game rather than a family, and it already ships as
 * one.
```

This is a description of what the code does not do, named explicitly by the
bullet. The fact worth keeping — names are the source dataset's own, spelled
with its apostrophes — is the first sentence; the rest explains an absence, and
the standard's answer to an absence that needs explaining is to make the code
clear rather than to annotate it. `assertEveryFamilyMatched` already fails the
build if the list and the dataset disagree, so nothing is lost by dropping it.

`assertEveryFamilyMatched`'s own JSDoc (line 132) is fine: it names the two
failure shapes a reader would otherwise not predict. Its `Two ways it happens,
both of which have` carries a trace of the same history note and reads better
without the second clause, but it is not a finding on its own.

### apps/pragma/site/src/lib/mastery-aggregate.utils.ts:26

Bullet: `reviewer` checks the choice between `.core.ts` and `.utils.ts`, because
the question is whether the name is one the band or the race would recognise,
and no rule can ask that.

```ts
export function meanDefaultMasteryForSong(
  defaultLineup: Lineup,
  defaults: readonly MasteryDefaultRow[],
): number | null {
```

`02. Purity and core files` settles the tie with *"ask whether a product manager
would recognise the function's name, and choose `.core.ts` when the answer is
yes"*. Mastery is a section of `apps/pragma/VOCABULARY.md`, with an owning
context at `api/src/mastery/`, and this file's own header says it is the
front-end counterpart of `mastery.core.ts`:

```ts
 * The name says `Default` because that is the whole difference from the back
 * end's `meanForSong` in `api/src/mastery/mastery.core.ts`, which averages the
```

A file holding a rule the band would recognise, next to a sibling in the same
folder that already takes the domain suffix (`site/src/lib/upcoming-concerts.core.ts`),
is a `.core.ts`. Renaming the pair to `mastery-aggregate.core.ts` and
`mastery-aggregate.core.test.ts` keeps both the coverage include
(`site/src/**/*.core.ts`) and the suite include (`site/src/**/*.core.test.ts`)
in `apps/pragma/vitest.config.ts`, so the gate does not move.

The suffix predates this diff. It surfaces now because the diff renamed the
export from `meanMasteryForSong` into the domain's own words, which is the
moment the file name stopped matching what the file holds — the same bullet
under `01. Naming`.

### scripts/standards/enforcement-ledger.ts:38

Bullet: `reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do.

```ts
/**
 * A gate, wherever it sits under `scripts/` and in either language. Matching
 * only `scripts/check-*.sh` let a gate written in TypeScript, or one moved into
 * a subdirectory, run without any standard explaining it.
 */
```

The first sentence says what the constant means and is worth having above a
regular expression that dense. The second says what the previous version of this
line did, which is a history note. *"A gate written in TypeScript, or one in a
subdirectory, is still a gate"* would carry the same intent in the present
tense.

Advisory in effect: this file is outside `isReviewablePath`, so no seal is owed
and nothing gates it.

### scripts/dependencies/catalog.core.ts:126

Bullet: `reviewer` checks that a verb keeps the promise the table above makes,
so a `find…` returns `null` when the thing is absent and a `get…` throws.

```ts
export function listCatalogProblems(
  manifests: readonly WorkspaceManifest[],
  catalogs: Catalogs,
): readonly CatalogProblem[] {
```

The table in `01. Naming` gives `find…` the promise *"the thing, or `null` when
it is absent"* and gives an array to `list…`. All four functions here return
arrays: `findUncatalogued` (line 60), `findDanglingReferences` (line 79),
`findUnusedEntries` (line 98) and `listCatalogProblems`.

Report this to the standard as much as to the file. Six existing modules do the
same — `scripts/standards/conventions.core.ts` (`listCaseStyleDivergences`,
`listDivergences`, `listRatchetFailures`, `listStaleBaselineKeys`),
`infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts`
(`findUndecidedCredentialTables`) and
`apps/pragma/site/src/components/organisms/setlist-editor.utils.ts`
(`listOrphanMemberIds`) — so the honest resolutions are either a repository-wide
rename to `list…` or a line in the table saying that `find…` over a collection
returns the matches and an empty array is a real answer. Picking one file to
rename would leave the convention split.

Advisory in effect, for the same reason as the finding above.

## Sealed

- `apps/borsouvertures/site/src/components/molecules/OpeningsPanel.tsx` — the
  one changed line moves the plural key from `family-count` to `opening-count`,
  which is the word `apps/borsouvertures/VOCABULARY.md` reserves for a top-level
  entry, and the dotted path `selection.openings.opening-count` names the screen
  and the element as bullet 09 asks.
- `apps/borsouvertures/site/src/config/openingsCacheVersion.ts` — two lines,
  generated by the build script, and the header says so.
- `apps/last-loop-lepin/api/src/media/media.schema.ts` — the `@FollowsBlueprint
  schema-shared-slug` tag is honest: the file imports `editionSlugSchema` and
  `runnerSlugSchema` from the slices that own those tables instead of restating
  the bounds, which is exactly what the blueprint at `edition.schema.ts:71`
  shows. Bullet 03, derived types, is satisfied by construction.
- `apps/last-loop-lepin/vitest.config.ts` — the change adds `*.core.test.ts` and
  `*.utils.test.ts` to the back-e2e project's `exclude` so the pure suites stop
  booting Postgres; the surviving comments each name a vendor constraint
  (Vitest 4's `maxWorkers` grouping, the shared Postgres, the CDK synth budget)
  rather than restating the option beneath them.
- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx` — one imported
  symbol renamed at lines 38 and 139. Read in full: no new effect, no new
  comment, every `useMemo` derives during render rather than through
  `useEffect`.
- `apps/pragma/site/src/routes/catalog/CatalogPage.tsx` — same rename at lines
  26 and 139. It is itself the `route-list-page` blueprint; the derivation stays
  in `catalog-page.core.ts`.

## Reviewed, not sealable

Ten changed files sit outside `isReviewablePath` (`scripts/`), so no seal is
recorded. Read in full and clear against the checklist:

- `scripts/standards/coupling.core.ts` — `.core.ts` is right: it holds the rule
  the temporal-coupling report exists to state, and `scripts/standards/` already
  keeps `seal.core.ts` and `conventions.core.ts` on the same reading. Names carry
  their intent (`rankCoupledPairs`, `buildReachability`, `partitionByConnection`,
  `degree`), every literal is named, and no function reads the clock or the disk.
  The comment at line 82 is the one I weighed hardest — *"Counting per file into
  a second map and reading it back would mean a lookup that cannot miss and a
  fallback nothing can reach"* — and it clears the bar: the repository's
  branch-coverage gate is why the loop is shaped that way, and a reader who did
  not know that would simplify it and break the gate. That is a constraint the
  code cannot state.
- `scripts/architecture/freshness.core.ts` — same reading on the suffix; the
  rule *"when is a generated page stale"* is the substance of the module rather
  than a cross-cutting helper. The header explains why byte comparison cannot
  work here, which is the non-obvious fact, and stops there.
- `scripts/architecture/architecture-graph.ts` — the new code matches its
  surroundings. `readHeadRevision` and `readRendererDigest` sit beside
  `readGitOutput`, `readVersions` and `readSourceOrEmpty`; `digestOf` beside
  `containerIdOf` and `nodeIdentitiesOf`; `DIGEST_LENGTH` is named and carries
  the one-line reason a reader would ask for. The `--check` branch now reports
  which of the two inputs moved rather than a bare mismatch.
- `scripts/architecture/architecture-page.ts` — the new `historyRevision` field
  is JSDoc'd on an exported interface, which is where the standard welcomes it,
  and the JSDoc states a contract rather than restating the type.
- `scripts/standards/temporal-coupling.ts`, `scripts/dependencies/check-dependency-catalog.ts`
  — both open with a usage block and the reason the check exists, and both hand
  every decision to their `.core.ts`. Untrusted JSON is read through
  `const parsed: unknown = JSON.parse(…)` and narrowed with `Reflect.get` plus
  `typeof` guards, with no assertion anywhere.

## Outside the checklist

- `readHeadRevision` now exists twice, at `scripts/architecture/architecture-graph.ts:89`
  (with a `try`/`catch` returning `'unknown'` outside git) and at
  `scripts/standards/temporal-coupling.ts:98` (without). No bullet covers
  duplication across scripts, and the two differ in failure behaviour, so this
  is a note rather than a finding.
- `apps/pragma/VOCABULARY.md` and `apps/borsouvertures/VOCABULARY.md` are new
  and long. I spot-checked rather than verified line by line: `BAR_STATUSES`
  holds the five values listed, `ENERGY_DEFAULT` is 5,
  `STALE_BAR_DEFAULT_THRESHOLD_DAYS` is 60, and borsouvertures' claim that
  *"twenty families are listed and twenty ship"* holds — `FAMILIES` has twenty
  entries and `openings.json` has twenty top-level ids. The remaining
  definitions are unverified from here.
