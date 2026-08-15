# Standards review — claude/codebase-standards-practices-mtyo5e against fb05c33

Verdict: PASS
Ledger: 75b126fed4b7
Reviewed: 8 file(s). Sealed: 8. Findings: 0.

Scope: the three files the first pass left unsealed, the renamed
`mastery-aggregate.core.ts`, and the four files that entered the changed set
with `8c5fb7d` while this pass was running. Everything else was judged by
`standards-harness-second-pass.md` and is not re-litigated here.

## Findings

None.

## Sealed

### The first pass's two findings, judged again

- `apps/borsouvertures/scripts/build-openings.ts` — the `FAMILIES` JSDoc is now
  four lines and both of them earn their place. *"Order is load-bearing: a row
  joins the first entry its name starts with"* is a constraint on the array
  literal that the literal cannot state, and *"Each name is the source dataset's
  own, character for character, including the apostrophe"* is a fact about
  lichess's TSV. The history clause (`which is how the shadowing and two
  typographic apostrophes below were found`) and the paragraph explaining why
  `Giuoco Piano` is absent are both gone, which is what the bullet on comments
  asked for. Both claims verify: the file holds no U+2019, and
  `site/src/openings/openings.json` ships twenty top-level openings whose names
  are the twenty in `FAMILIES`, apostrophes included. Read in full; the rest of
  the file is unchanged from what the first pass read, and its one other comment
  (line 40, on `REQUIRED_TSV_COLUMN_COUNT`) states the source format rather than
  the code.
- `apps/pragma/site/src/lib/mastery-aggregate.core.ts` — the suffix is now
  right. `02. Purity and core files` settles the tie by asking whether a product
  manager would recognise the name; Mastery has a section in
  `apps/pragma/VOCABULARY.md`, an owning context at `api/src/mastery/`, and a
  back-end counterpart already named `mastery.core.ts`. The file reads no clock,
  touches no I/O, and `apps/pragma/vitest.config.ts:40` includes
  `site/src/**/*.core.ts` in coverage, so the gate followed the rename. No
  reference to the old path survives anywhere in `apps/`. The header documents a
  contract a caller would otherwise get wrong — that this averages defaults only
  and therefore disagrees with the back end's `meanForSong` on any song carrying
  an override — which is the "surprising edge case" JSDoc exists for.
  `MasteryDefaultRow` is not an undeclared mirror of a response type: it is the
  narrow input a pure module should take, and the transport type stays derived
  from the Hono client in `mastery.queries.ts:24`.

### Changed by the import path alone

- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx` — read in full.
  One line moved (38). No `useEffect`; every derivation is a `useMemo` computed
  during render. i18n keys stay dotted by screen and element
  (`setlist.failure.reorder`, `lineup.emptyForMember`). No boolean name is
  negated, and no prop set has grown a family of booleans — `isCompact` and
  `inFilteredMode` are one each, on different components.
- `apps/pragma/site/src/routes/catalog/CatalogPage.tsx` — read in full. One line
  moved (26). It is itself the `route-list-page` blueprint; the sorting,
  filtering and counting all stay in `catalog-page.core.ts`, and the route owns
  only the search text and the status filter. Layout classes carry the `sm:`
  variant on the padding that needs it and the grid is delegated to
  `CatalogGrid`, so 375 px is a composition question for that organism rather
  than for this route.

### Arrived with `8c5fb7d`, after the brief

These four were not in the first pass's sixteen and not in this pass's brief.
They entered the changed set when the fix commit renamed
`findOrphanMemberIds` → `listOrphanMemberIds` and
`findUndecidedCredentialTables` → `listUndecidedCredentialTables`, which is the
first pass's fourth finding acted on. `seal.ts verify` named them, so they are
read in full and judged rather than left to a third pass.

- `apps/pragma/site/src/components/organisms/setlist-editor.utils.ts` —
  `listOrphanMemberIds` now keeps the table's promise for a function returning
  an array. The suffix stays `.utils.ts` correctly: `formatSetlistOrder`,
  `instrumentFamilyMap` and `instrumentNamesFor` are presentation helpers, not
  rules the band would name.
- `apps/pragma/site/src/components/organisms/orphan-member-warn.adapter.ts` —
  the call site of the rename. The `.adapter.ts` suffix matches what the file
  is: the side-effecting half that owns the module-level `Set` so the pure half
  stays free of `console.warn`.
- `infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts` —
  `listUndecidedCredentialTables` likewise. Every surviving comment names
  something the code cannot: DSQL's bare `ADD COLUMN` grammar, why cross-schema
  DDL is a built string rather than a tagged template, and why a credential
  table cloned under `ON CONFLICT DO NOTHING` shipped a preview guarded by a
  published password.
- `infra/cdk/src/constructs/dsql-schema.ts` — the other call site. The two long
  comments inside `bundling` are the esbuild `require` shim and the
  `externalModules` choice, both third-party constraints a reader would
  otherwise undo. The one coverage-ignore carries a checkable reason (*"both
  candidates exist in their respective contexts"*), not "pre-existing".

## Unclear

None.

## Outside the checklist

- **`select…` over a collection returns the subset, in four places across three
  workspaces.** The verb table in `01. Naming` gives `select…` the promise *"One
  option chosen from several"*, and these return several:
  `setlist-editor.utils.ts:127` `selectUnwarnedMemberIds`,
  `clone-from-schema.utils.ts:137` `selectMissingColumns` and `:262`
  `selectCloneableDataTables`, and `catalog-page.core.ts`'s `selectVisibleSongs`
  as called from `CatalogPage.tsx:37`. This is the same shape as the first
  pass's fourth finding about `find…`, and the same reasoning applies: not one
  file is wrong, the table has no verb for *"the members of a collection a rule
  keeps"*. None of the four lines is in this branch's diff, and each name is
  plural, so a reader is not misled. Recorded here rather than as a finding; the
  honest resolutions are a repository-wide rename or a line in the table, and
  the operator who decided the `find…` case should decide this one.
- `mastery-aggregate.core.ts:25` still carries `// @FollowsBlueprint
  utils-pure-module`, whose blueprint sits in the `utils` layer while the file
  now sits in `core`. Nothing validates that a follower's layer matches its
  blueprint's — `blueprint-utils.ts` infers layer from the path and never
  compares the two — so no gate moves either way, and the pattern being claimed
  (a deterministic module held at full coverage) is genuinely what the file is.
  There is no pragma/site `core` blueprint to point at instead. Worth a look
  when one exists.
