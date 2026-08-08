# Plan — Lineup editor

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

## Pre-implementation calls (resolving the spec's loose ends)

Four execution-level decisions are pinned here, not in the spec, because they don't change *what the user sees* — they choose what we can ship today versus what waits for a sibling baseline feature:

1. **Analytics events deferred** — pragma has no analytics emitter (`grep -r 'track\|analytics\|posthog\|amplitude' apps/pragma/site/src/lib/` returns nothing). Wiring a stub now would balloon this PR into an analytics-baseline feature. The spec's four named events (`lineup_modal_opened`, `lineup_saved`, `lineup_reset_to_default`, `setlist_filtered_by_member`) are **not** implemented in this PR; the spec's DB-measured input metric (≥ 80% of upcoming concert entries have a non-empty resolved lineup) stays — it's a query, no emission needed. Spec section *Production strategy → Analytics* is honoured by leaving the events as the contract for the future analytics baseline.
2. **Sentry tags deferred for the same reason** — no Sentry wiring exists in `apps/pragma/api/src/` or `apps/pragma/site/src/`. R1 detection lands as a structured `console.warn({ surface: 'lineup-resolver', orphanMemberId, songId })`. When pragma's observability baseline lands, the warn becomes a tagged Sentry breadcrumb — same line, different sink.
3. **Override-badge semantics** — `lineupOverride === {}` counts as override (non-null = override). Matches the schema's binary meaning; "reset" writes `null`, not `{}`. The implementer enforces this by never persisting `{}` from the modal — Save with all-null instrument selections writes `null`.
4. **`TransitionCommentModal` pattern refactor stays out** — this PR ships `LineupEditor` as a native `<dialog>` (matches `CreateSessionDialog`). The div-overlay `TransitionCommentModal` is the odd one out and stays as-is; a future modal-pattern-unification PR addresses it. The skill gap is logged in *Missing technical skills* below.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q1 (edit surface = song + setlist entry) | Two trigger buttons opening the same modal | UPDATE `apps/pragma/site/src/routes/catalog/SongDetailPage.tsx` (button + `<LineupEditor open=… surface='song'>`) and UPDATE `apps/pragma/site/src/routes/setlists/SetlistEntryRow.tsx` (button + `<LineupEditor open=… surface='setlist-entry'>`) | `grep -n "LineupEditor" apps/pragma/site/src/routes` returns matches in both files |
| Q2 (unfiltered member picker) | Instrument `<select>` lists all instruments + a `null` option labelled `lineup.notPlaying`; no `member_instrument` join at the front | NEW `apps/pragma/site/src/components/molecules/LineupEditor.tsx` uses `useInstrumentsList()` directly (no filter) | `LineupEditor.test.tsx`: rendered `<option>` set equals every instrument from the mock + the null option |
| Q3 (cascade on member delete) | Server-side scrub in the same transaction as the member delete | UPDATE `apps/pragma/api/src/members/members.repository.ts` `deleteMemberWithLinks` — wrap in `database.transaction(...)`, loop song rows + setlist_entry rows, scrub via `scrubMemberFromLineup`, write back JSON-encoded; NEW `apps/pragma/api/src/members/lineup-scrub.core.ts` | Back-e2e `members.controller.test.ts`: after `DELETE /api/members/:id` for a member listed in a song's `defaultLineup` and an entry's `lineupOverride`, both rows return without that key |
| Q4 (modal UX, not popover/inline) | Native `<dialog ref>` + `showModal()` (matches `CreateSessionDialog`) — *not* the div-overlay used by `TransitionCommentModal` | NEW `LineupEditor.tsx` with `useRef<HTMLDialogElement>` + open/close effect | `LineupEditor.test.tsx`: assert the `<dialog>` element is `open` after mount with `open=true` |
| Q5 (no ADR trigger) | No new dep, no new secret, no schema migration, no external service | (no-ADR row at bottom) | `git diff --stat` shows zero changes under `apps/pragma/cdk/`, `infra/`, `pnpm-lock.yaml`, any `*.sql` |
| Use case 1 (set song default) | Song-detail modal save → `useUpdateSong({ id, defaultLineup })` | UPDATE `SongDetailPage.tsx` wires `onSave(lineup) => updateSong.mutate({ id: song.id, defaultLineup: lineup })`; existing optimistic update handles the field via spread | Visual-validation step 1.4 (chips reflect saved lineup); `LineupEditor.test.tsx` saves the right payload |
| Use case 2 (override entry lineup) | Entry-row modal save → `useUpdateSetlistEntry({ setlistId, entryId, lineupOverride })` | UPDATE `SetlistEntryRow.tsx` wires `onSave(lineup) => onUpdate(entryId, { lineupOverride: lineup })` | `LineupEditor.test.tsx`: save invokes `onSave` with the modified record; visual-validation step 2.4 |
| Use case 3 (reset override) | Two-step per spec § *Happy path — reset an override*. **Step 1:** Reset button restores form state to `props.defaultLineup` *and leaves the modal open* (no `onSave`, no `onClose`). **Step 2:** operator reviews the default-prefilled form. **Step 3:** Save persists `{ lineupOverride: null }` because the editor flips an internal `wasResetRef` and surfaces it via `onSave(lineup, wasReset: boolean)`. The parent (`SetlistEntryRow`) wires `onSave = (lineup, wasReset) => onUpdate(entryId, { lineupOverride: wasReset ? null : lineup })`. | NEW `LineupEditor.tsx` accepts an optional `defaultLineup` prop — presence drives the Reset-button render; Reset calls `form.setFieldValue` for every member field, does not call `onClose`. The setlist-entry surface threads `song.defaultLineup` down `SetlistEditor → SetlistEntryRow → LineupEditor`. | `LineupEditor.test.tsx`: (a) Reset reverts every field to the default and leaves the dialog open without calling `onSave` or `onClose`; (b) Reset → Save fires `onSave(defaultLineup, true)`; (c) Save without Reset fires `onSave(formValues, false)`. Visual-validation step 3.3 (override badge disappears after Reset → Save). |
| Use case 4 (read setlist as one member) | Sticky pill row + filter applied to entries | UPDATE `apps/pragma/site/src/routes/setlists/SetlistEditor.tsx`: `selectedMemberId` state, `<MemberFilterPills>` above the entries `<ul>` (`sticky top-0 z-10 bg-bg overflow-x-auto`), entries through `filterEntriesForMember`, pass `memberInstrumentChip` to each `SetlistEntryRow` | Visual-validation step 4.2-4.5; `setlist-filter.core.test.ts` |
| Use case 4 pill bar | One pill per member + "All members" pill, horizontally scrollable, single-row | NEW `apps/pragma/site/src/components/molecules/MemberFilterPills.tsx` (`members`, `selectedMemberId: string \| null`, `onChange(memberId: string \| null)`); reuses `MemberChip` | `MemberFilterPills.test.tsx` + visual-validation narrow-viewport screenshot |
| Use case 4 chip on row | Single-member mode renders the member's instrument prominently above the title | UPDATE `SetlistEntryRow.tsx`: optional prop `prominentMemberInstrument?: { memberName: string; memberColor: string; instrumentName: string }`, rendered as a colored badge when present | Visual-validation step 4.3 |
| Edge — member taps pill, zero songs | Empty-state copy "Nothing to play tonight" | UPDATE `SetlistEditor.tsx`: `selectedMemberId !== null && visibleEntries.length === 0` → render `<p>{t('lineup.emptyForMember')}</p>` instead of the entries `<ul>` | Visual-validation step "empty-state" |
| Edge — narrow phone | `MemberFilterPills.tsx` wraps in `<div className="flex gap-2 overflow-x-auto whitespace-nowrap py-2">` | Same | Visual-validation narrow-viewport screenshot |
| Override badge | Small badge on entries with `lineupOverride !== null` | UPDATE `SetlistEntryRow.tsx`: optional `hasOverride: boolean`; renders `<span className="text-[10px] uppercase tracking-wider text-accent bg-accent-soft px-1.5 py-0.5 rounded">{t('lineup.override')}</span>` next to title; `SetlistEditor.tsx` passes `entry.lineupOverride !== null` | Visual-validation step 2.4 |
| i18n | New strings, both locales | UPDATE `apps/pragma/site/src/i18n/en.json` and `fr.json`: keys `lineup.edit`, `lineup.editDefault`, `lineup.modal.title.song`, `lineup.modal.title.setlistEntry`, `lineup.notPlaying`, `lineup.resetToDefault`, `lineup.override`, `lineup.save`, `lineup.cancel`, `lineup.allMembers`, `lineup.emptyForMember`, `lineup.filterByMember` | `i18n-parity.core.test.ts` passes |
| Pure helper — scrub | `scrubMemberFromLineup(lineup, memberId)` returning a new record without that key | NEW `apps/pragma/api/src/members/lineup-scrub.core.ts` + `lineup-scrub.core.test.ts` (5 cases per spec § Test strategy) | 100% coverage gate via `vitest.workspace.ts` `**/*.core.ts` threshold |
| Pure helper — filter | `filterEntriesForMember(entries, songsById, selectedMemberId)` → `{ visibleEntries, instrumentByEntryId }` | NEW `apps/pragma/site/src/routes/setlists/setlist-filter.core.ts` + test (4 cases per spec) | 100% coverage gate |
| Analytics events | Deferred (see *Pre-implementation calls* §1) | — | — |
| Sentry tags | Deferred (see *Pre-implementation calls* §2); R1 detection ships as `console.warn` | UPDATE `setlist-editor.utils.ts` `lineupOf` to warn on resolved-lineup member IDs absent from the members query | Grep test that the warn fires when a stored lineup ID doesn't resolve |
| Schema/types | No change | — | `git diff apps/pragma/api/src/{songs,setlists}/*.schema.ts` empty |
| DB | No migration | — | `git diff apps/pragma/api/src/database/migrations/` empty |

## Risk register

| # | Risk | Severity | Mitigation | Detection if it slips |
|---|---|---|---|---|
| R1 | Silent scrub failure on member delete leaves orphan member IDs in stored lineups | high | Wrap scrub + delete in `database.transaction(...)`; back-e2e asserts both lineup surfaces clean after one `DELETE /api/members/:id` | (a) `MemberLineup.tsx` already drops unknown member IDs (`members.find(...) === undefined`) → no visual crash; (b) `console.warn({ surface: 'lineup-resolver', orphanMemberId, songId })` in `setlist-editor.utils.ts` `lineupOf` |
| R2 | Transaction breaks the existing `deleteMemberWithLinks` contract | medium | Convert to a single `database.transaction`; the two existing deletes move inside; back-e2e CRUD round-trip stays green | `members.controller.test.ts` still passes; new row asserts the scrub side-effect |
| R3 | DSQL transaction semantics (tighter optimistic-concurrency than vanilla Postgres) | medium | Keep transaction short (read rows → JS transform → write back). If DSQL rejects with `OC0001`, fall back to the sequential cascade pattern used by `deleteSongWithCascade` | Local-Postgres test green but prod logs `OC0001` → fall back. Documented escape hatch keeps deploy safe |
| R4 | Stale TanStack cache after `lineupOverride = null` reset (override badge flashes back) | medium | Verify `setlists.utils.ts` `applyEntryPatch` preserves `null` (not `undefined`) when merging; fix at the patch level if needed | Manual: set override → Reset → modal closes → badge disappears before network round-trip |
| R5 | `lineupOverride === {}` accidentally rendered as override | low | Never persist `{}` — Save with all-null selections writes `null` (handled in `LineupEditor.tsx` `handleSave`) | Visual-validation: fresh entry, set lineup, clear all → expect no badge |
| R6 | Sticky pill row z-index conflicts with `SetlistEditor.tsx` warn-marker gutter | low | Pill row `z-10`, gutter already `pointer-events-none` | Visual-validation narrow + wide viewports |
| R7 | Form-state divergence after Reset to default | medium | `LineupEditor.tsx` uses `useForm` with `defaultValues`; Reset calls `form.reset(defaultLineupAsFormValues)` | `LineupEditor.test.tsx`: "modify Pauline, click Reset, Pauline back to default in the rendered select" |
| R8 | i18n key mismatch | low | Every key in both `en.json` and `fr.json` in the same commit | `i18n-parity.core.test.ts` fails fast in `test:core` |
| R9 | `knip` flags new molecules as unused | low | Each new molecule imported by exactly one consumer | `pnpm exec knip` in pre-flight |

## Code-quality self-check

- [ ] `pnpm exec biome check` clean (composite — never `biome lint` alone).
- [ ] `pnpm --filter @borso-app/pragma typecheck` clean.
- [ ] No `any`; only `as unknown` / `as const` for assertions.
- [ ] No abbreviations or one-letter locals outside trivial loop indices.
- [ ] Magic numbers / strings extracted to named constants.
- [ ] No comments unless WHY-only; no what-comments, no JSDoc on internals.
- [ ] Function names describe the result (`filterEntriesForMember`, `scrubMemberFromLineup`).
- [ ] Conventional-commit scope `pragma` on every commit.
- [ ] `pnpm exec knip` clean.
- [ ] Every pure helper in `*.core.ts` with sibling `*.core.test.ts` at 100% coverage.
- [ ] No new dep in `apps/pragma/package.json`.
- [ ] No schema or migration touched.
- [ ] Atomic-design hierarchy: `LineupEditor` and `MemberFilterPills` are molecules (composed of atoms + dropdown primitives).
- [ ] Mobile-first: every layout-bearing Tailwind class has `sm:`/`md:`/`lg:` prefixes where needed; pill row stays one line at 375px.
- [ ] No `useEffect` smell: only used to sync the `<dialog>` open state with the `open` prop (genuine sync with an external system).
- [ ] Controller stays a dispatcher; lineup-scrub logic lives in `lineup-scrub.core.ts`, called from the repository inside the transaction.
- [ ] BE↔FE types via `hc<typeof apiRouter>` (already in place for `useUpdateSong` / `useUpdateSetlistEntry`).
- [ ] Forms use `@tanstack/react-form` (the modal carries form state for ~4-8 select rows).
- [ ] Tailwind utilities inline; no new CSS file.

## Pre-flight gates (run in order before push)

1. `pnpm install`.
2. `pnpm --filter @borso-app/pragma typecheck`.
3. `pnpm exec biome check`.
4. `pnpm --filter @borso-app/pragma test:core` — both new `*.core.test.ts` at 100% coverage threshold.
5. `pnpm --filter @borso-app/pragma test` — back-e2e including updated `members.controller.test.ts` cascade assertion.
6. `pnpm --filter @borso-app/pragma build` — Vite build sanity check.
7. `pnpm exec knip`.
8. `/technical-validation docs/features/pragma/lineup-editor/spec/spec.md` — cascade transaction shape, modal a11y, optimistic rollback, no new deps, no schema diff.
9. `/visual-validation docs/features/pragma/lineup-editor/spec/spec.md` — four happy-path scenarios + override badge appear/disappear + per-member filter pill behaviour + narrow-viewport pill scroll + empty-state.

## Missing technical skills

- **`/modal`** — sub-skill that picks the right modal primitive given a11y + focus requirements and flags multiplicity when more than one pattern is in use within a workspace. Would have caught the `TransitionCommentModal` divergence at planning time.
- **`/cascade`** — sub-skill for "delete A, scrub A's id out of every JSON-encoded reference across N tables in one transaction" (DSQL has no FK at write time). Pragma now has three manual cascades (`deleteSongWithCascade`, `deleteSessionWithCascade`, `deleteMemberWithLinks` extension) — the pattern is stable enough to skill-ify.
- **`/analytics-event`** — sub-skill that, given a list of named events in a spec, scans the touched workspace for an emitter and either generates wire-up rows or flags the surface as missing (would have collapsed the analytics open question at planning time).

## No-ADR confirmation

This feature does NOT match any of the four ADR triggers:

- **multiple-alternatives**: every Q.O.D. choice has 2-3 options listed but each was settled in the spec.
- **cross-cutting**: stays inside pragma (members + songs + setlists domains).
- **diverges-from-convention**: no — every pattern (manual cascade, native `<dialog>`, TanStack mutation optimistic update, atomic-design molecule, Tailwind inline) is already established in pragma.
- **looks-standard**: lineup editor is bespoke to a band ERP; no industry standard to reuse.

Verdict: no ADRs to write before implementation.
