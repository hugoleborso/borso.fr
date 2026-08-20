# Standards review — `claude/setlist-creation-bug-025jld` against `origin/main`

Verdict: PASS
Ledger: `23a69ebfd675`
Reviewed: 31 file(s). Sealed: 31. Findings: 0.

Run after PR #73 merged into the branch. `seal.ts verify` reported every
reviewable file as `sealed-against-an-older-ledger`, so the ledger was
regenerated (`pnpm exec tsx scripts/standards/enforcement-ledger.ts`) and all 31
files were re-read in full against the current wording.

PR #73 touched `01-naming.md`, `03-typing.md` and `12-linting-and-gates.md`, and
in each case only an `eslint:`, `gate:` or `script:` bullet — the time-unit
exemption on `no-magic-numbers`, the root `tsconfig.json` typecheck, and
`check-dated-records-are-append-only.sh`. **No `reviewer` bullet changed.** The
seals were invalidated by the ledger hash, not by a change in what the review
asks. This pass re-read the files rather than trusting that, and the earlier
judgements hold.

## Findings

None.

## Sealed

Back end:

- `apps/pragma/api/src/setlists/setlists.controller.ts` — every handler is
  validate, one service call, shape the response; the `404`/`409` branches read
  a `kind` the service returned rather than deciding anything.
- `apps/pragma/api/src/setlists/setlists.service.ts` — verb promises hold:
  `findSetlist` returns `SetlistRow | null` (`:65`) and the controller tests it
  at `:63` of the controller; `patchEntry` and `createSetlist` return tagged
  unions instead of throwing at the HTTP boundary.
- `apps/pragma/api/src/setlists/setlists.repository.ts` — returns rows, arrays
  and `DeletionOutcome`; the only assembly is `rowToEntry`, which is the JSON
  column decode the `repository-json-column` blueprint prescribes, not a
  projection. `insertSetlist` (`:150`) and `deleteSetlistWithEntries` (`:202`)
  each wrap their multi-table write in one transaction.
- `apps/pragma/api/src/setlists/setlists.core.ts` — pure, `now`-free, both
  exports named for what they return.
- `apps/pragma/api/src/setlists/setlists.schema.ts` — table plus Zod input in
  one file; `SetlistEntryPersistedUpdate` is `z.infer`, not hand-written.
- `apps/pragma/api/src/sessions/sessions.repository.ts` —
  `deleteSessionWithCascade` (`:115`) writes the cascade DSQL will not enforce
  explicitly, inside one transaction, and detaches rather than deletes, which is
  the behaviour change the header states.
- `apps/pragma/api/src/database/schema.ts`,
  `apps/pragma/api/src/__test/test-seed.repository.ts`,
  `apps/pragma/api/src/__test/test-seed.service.ts` — one added table each in
  the barrel and the wipe order; the seed writes through the owning services.

  One borderline call, recorded so the next reader does not have to re-make it:
  `test-seed.repository.ts:4` reads *"`app_config` is deliberately left alone,
  so re-seeding never rotates an existing password (ADR-0004)"*. The opening
  clause has the shape `01. Naming` refuses — a description of what the code
  does not do — and the same shape was removed from
  `setlist-entries.queries.ts` in the 2026-08-19T19:45 pass. It is cleared here
  because the payload of the sentence is a positive behavioural claim about
  `seedPreviewFixture` that the code cannot state and an operator re-running the
  seed needs. If it is rewritten, the claim to keep is *"re-seeding leaves an
  existing password in place"*.

Front end:

- `apps/pragma/site/src/lib/queries/setlists.queries.ts` — every one of the five
  writes reconciles from its own response through the pure helpers; no write
  refetches.
- `apps/pragma/site/src/lib/queries/setlist-entries.queries.ts` — patch, delete
  and reorder are optimistic with rollback and no `onSettled`; only the append
  invalidates (`:115`), and only once the mutation family has drained, which is
  the one write whose result the client does not hold. `SetlistEntryPatch`
  (`:130`) is derived from the Hono client.
- `apps/pragma/site/src/lib/queries/setlists.utils.ts`,
  `apps/pragma/site/src/lib/setlist-index.core.ts`,
  `apps/pragma/site/src/lib/setlist-name.utils.ts`,
  `apps/pragma/site/src/routes/sessions/session-facts.core.ts` — the
  `.core.ts`/`.utils.ts` split reads correctly: the index ordering and the
  session facts are rules the band would recognise, the display-name fallback
  and the cache transforms are cross-cutting helpers.
- `CreateSetlistDialog.tsx` — the form goes through `useForm` with a Zod
  validator, not a `useState` chain. `SetlistHeaderActions.tsx` keeps one
  `useState` for an inline rename input, which is a control, not a form.
- `SetlistSummaryRow.tsx`, `SetlistCatalogList.tsx`, `SessionSetlists.tsx`,
  `AttachSetlistDialog.tsx`, `SetlistEditor.tsx`, `SetlistEntriesList.tsx`,
  `SetlistEntryRow.tsx`, `SetlistEntryDetailsFields.tsx` — no prop set carries a
  family of booleans standing in for a variant (`inFilteredMode` and
  `hasOverride` are independent facts); no `cva` case, because no component here
  grew a third visual variant.
- `App.tsx`, `SetlistsPage.tsx`, `SetlistEditorPage.tsx`,
  `SessionSetlistRedirectPage.tsx`, `SessionDetailPage.tsx` — routes own
  routing, redirects and query composition and delegate every screen region to
  an organism. See the note below on the padding they carry.

Checked across the whole slice, once rather than per file: no `useEffect` and no
`eslint-disable` comment appears anywhere in the changed application code
(`grep` over the setlists slice, the setlist queries and the two changed route
folders returned nothing), so the `07. State and effects` and
`12. Lint and gates` bullets have no subject here. Every added i18n key names
the screen and the element (`setlist.detach.aria`, `setlist.create.namePlaceholder`,
`sessions.noSetlists`). Every test name in the changed suites states a behaviour
and a condition, and no assertion in them is `toHaveBeenCalled`.

`apps/pragma/VOCABULARY.md` was checked claim by claim against the code, not
read as prose: `setlist_sheet` holding `id` and `name` only with `name`
defaulting to the empty string (`setlists.schema.ts:23`), `session_setlist`
keyed on `(session_id, setlist_id)` (`:35`), a joining setlist landing one past
the highest position (`selectNextLinkPosition`), `createSetlist`'s only refusal
being `session-not-found` (`setlists.service.ts:82`), deleting a session
detaching rather than deleting (`sessions.repository.ts:118`), an append taking
the current entry count as its position (`setlists.service.ts:128`), and a
reorder refused as `stale` unless the ids match exactly (`:172`). All true.

## Unclear

None, with one qualification on the 375 pixel bullet. That bullet asks for
`agent-browser` and `scripts/argent.sh`; this pass had no preview to drive and
did not run either. What it did instead was read the three 375 × 812 captures
this branch recorded under
`docs/features/pragma/setlists-across-sessions/validation/screenshots-2026-08-19/`
— the session with two setlists, the setlists index, and a setlist played in two
sessions — and confirm against the source that every layout-bearing class in the
new components carries an `sm:` variant and that the tap targets on the new
controls clear 44 px (`min-h-11` on the attach dialog's rows, `w-11 h-11` on the
row's handle and menu button). The live touch pass was done in the
2026-08-19T19:33 round on the same components; nothing in this diff moved them.

## Outside the checklist

- **The ledger's `04` transaction bullet contradicts `11`'s prose.** The bullet
  reads *"a multi-table write is wrapped in one transaction owned by the
  service"*, while `11-database.md` says *"The transaction is opened in the
  **repository**, not in the service"*, with the reason that only a
  `*.repository.ts` may import the client. This branch follows `11`. A reviewer
  working from the ledger alone would fail correct code, which is what the
  skill's "open the standard and read the surrounding prose" instruction saved
  here. Worth reconciling the two sentences.
- **The `05` route bullet contradicts the blueprint it should describe.** The
  bullet says a route *"owns no layout primitive"*, but the canonical
  `route-detail-page` blueprint is `SessionDetailPage.tsx:46`, whose own
  container is
  `<section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">`
  (`:147`), and eight route files on `main` open the same way. Every route in
  this diff copies it. Either the bullet means "no layout *composition*" and
  should say so, or the blueprint owes the page shell to a molecule.
- `SetlistEntriesList.tsx` is the fifth-highest entry in
  `docs/standards/hotspots.md` (8 commits, weak because it *"follows no recorded
  pattern"*), and `App.tsx` and `test-seed.service.ts` are also on that page.
  None of the three carries a `@FollowsBlueprint` tag. Nothing requires one, but
  the sortable-list-with-drag-overlay shape in `SetlistEntriesList.tsx` is the
  kind of thing `hotspots.md` exists to nominate for a blueprint.
- `docs/standards/temporal-coupling.md`, regenerated at `07851e3`, names
  `EnergyBar.tsx` ↔ `setlist-entry-energy.core.ts` as coupled at 57% with
  nothing connecting them. Neither file is in this diff; noted for whoever
  touches the energy bar next.
- Outside the diff, and therefore outside this review's scope:
  `apps/pragma/api/src/songs/songs.repository.ts:250` `deleteSongWithCascade`
  writes three tables — mastery overrides, setlist entries, the song — without a
  transaction, which is what `11. Database` asks for and what its siblings
  `deleteSetlistWithEntries` and `deleteSessionWithCascade` now do.
- `VOCABULARY.md` orders its sections alphabetically, and *Session setlist link*
  sits between *Setlist* and *Setlist entry* rather than after *Session*.
