# Lineup editor — record who plays what on every song and setlist entry

## Perspectives confronted

- [x] **Client / business** — operator picked the user-experience objective ("members answer 'what am I playing tonight?' in under 10s"); replaces Hugo's pre-session WhatsApp lineup messages.
- [x] **Product** — operator confirmed the edit surface (default on song + override per setlist entry), the picker scope (every member, no instrument filter), the deletion cascade behaviour, and the UX (modal). Out-of-scope items named below.
- [x] **Tech-lead** — schema, API, types and read path already exist end-to-end (DB columns `default_lineup` / `lineup_override` are TEXT-encoded JSON per DSQL §1, Zod schemas in place, `MemberLineup` molecule renders, `setlist-editor.utils.ts:48` already resolves override-else-default). Cascade-on-member-delete mirrors the existing manual-cascade pattern (`deleteSongWithCascade`, `deleteSessionWithCascade`) — DSQL has no FK at write time anyway.
- [x] **Developer** — pure helper extracts into `lineup-scrub.core.ts` (100% coverage gate), modal becomes a molecule. Existing TanStack Query mutations on `songs.update` and `setlists.update-entry` already accept the lineup fields; no new endpoints.
- [x] **Designer** — operator picked Modal opened from a dedicated "Lineup" button. Matches the existing `CreateSessionDialog` / `TransitionCommentModal` pattern on pragma; no new affordance vocabulary.

## Why

- Pragma's domain model already knows about lineups (every song has a `defaultLineup` map and every setlist entry has a `lineupOverride`) but **there is no write affordance anywhere in the UI** — every lineup is `{}` in practice. Members showing up to rehearsal don't know who's on bass tonight; Hugo bridges the gap by messaging the band before each session.
- **Output metric** (lagging, out-of-band): a band member, asked at any moment before a session, can answer _"what am I playing tonight?"_ in under 10 seconds. Measured by Hugo asking one member ad-hoc at each rehearsal.
- **Input metrics** (leading, instrumentable):
  - **Coverage** — ≥ 80% of setlist entries on a concert scheduled in the next 30 days have a non-empty _resolved_ lineup (resolved = `lineupOverride` if set, else song's `defaultLineup`). Measured weekly from the DB.
  - **Use** — `lineup_saved` events fire at least once per concert in the week before the concert date.
- **Gemba** — Hugo's current WhatsApp routine before every rehearsal: paste the setlist, tag each member with "you're on X for song Y". The substitute the app must make obsolete.

## Result

A "Lineup" button is added in two places:

- **Setlist entry row** (`SetlistEntryRow`) — opens the modal pre-filled with the entry's resolved lineup (override if set, else song default). Editing writes a `lineupOverride` on the entry. A "Reset to song default" button clears the override (sets `lineupOverride = null`); the row falls back to the song's default.
- **Song detail page** (`SongDetailPage`) — opens the modal pre-filled with the song's `defaultLineup`. Editing writes back to the song. Every setlist entry referencing this song picks up the new default unless it has its own override.

The modal contents are a table — one row per band member, one cell with an instrument dropdown (`— not playing —` plus every instrument; the picker is unfiltered, per the operator's call). Save persists via the existing `songs.update` / `setlists.updateEntry` TanStack mutations.

The existing read-only `MemberLineup` chips on both surfaces stay as-is — they already render the lineup once it has content.

A small badge on a setlist entry indicates _override_ vs _default_ so reviewers can see at a glance whether the entry has been customised away from the song.

**Per-member rollup view** (the surface the output metric depends on): the setlist editor / session detail page carries a member-filter pill row at the top — one pill per band member, each rendered with the member's existing color chip. Tapping a pill enters _single-member mode_: the setlist below collapses to only the entries where that member is in the resolved lineup, each entry showing the instrument the member plays on that song as a prominent chip. Tapping the pill again (or "All members") returns to the full setlist. The pill row stays sticky on scroll so a member arriving at a concert can hit their name first thing and read the list straight down.

## Use cases / edge cases

**Happy path — set a song's default lineup:**

1. Hugo opens any song detail page → clicks "Edit default lineup" → modal opens with every member set to "— not playing —" (empty default).
2. He sets Hugo → Guitar, Pauline → Bass, Adrien → Drums, Camille → "— not playing —" → clicks Save.
3. Modal closes. `MemberLineup` chips on the page reflect the saved lineup.
4. Every setlist entry referencing this song that has no `lineupOverride` now displays this default.

**Happy path — override a setlist entry's lineup:**

1. Hugo opens a setlist with a song whose default is Hugo/Pauline/Adrien.
2. He clicks "Lineup" on the entry → modal opens pre-filled with the default (Hugo→Guitar, Pauline→Bass, Adrien→Drums).
3. He changes Pauline to "— not playing —" and Camille to Bass (sub bassist tonight) → Save.
4. Modal closes. Entry row shows the override; the _override_ badge appears; the song's default is unchanged.

**Happy path — reset an override:**

1. Hugo opens a setlist entry with an override → clicks "Lineup" → modal shows the override pre-filled.
2. He clicks "Reset to song default" → modal returns to the song's default values (no save yet).
3. He clicks Save → the override is cleared (`lineupOverride = null` in the API), the badge disappears.

**Edge — song with no default, entry with no override:** modal opens with all members at "— not playing —". Save persists. The "default" is the empty state.

**Edge — a member is deleted while listed in N lineups:** the server-side `deleteMemberWithLinks` cascades — scrubs the deleted member's ID out of every `song.defaultLineup` map and every `setlist_entry.lineupOverride` map in a single transaction (existing cascade pattern; see `deleteSongWithCascade`).

**Edge — a member is added after lineups were set:** modal shows them as "— not playing —" by default on the next open. No retro-fill.

**Edge — same member assigned to two instruments on one song:** impossible by construction — the model is `Record<memberId, instrumentId | null>`, one entry per member.

**Error — API rejects the lineup save:** optimistic update rolls back (existing TanStack mutation `onMutate` / `onError` pattern already used for setlist-entry update; reuse).

**Happy path — read the setlist as one specific member:**

1. A band member opens the app on the day of a concert and lands on the setlist for that session.
2. They tap their own pill in the sticky member-filter row at the top of the page.
3. The setlist filters to only the entries where their member ID appears in the resolved lineup; each remaining row shows the instrument they play on that song (chip variant of the existing `MemberLineup`).
4. They read the filtered list top-to-bottom — finished within 10 seconds, output metric satisfied.
5. Tapping the pill again (or "All members") restores the full setlist.

**Edge — a member taps a pill but appears in zero songs:** the page shows an empty-state ("Nothing to play tonight") rather than a blank scroll area. Still a valid filter — does not error.

**Edge — the filter pill row needs to fit on a narrow phone:** the pills horizontally scroll under a `overflow-x-auto` wrapper, single-row, with the active pill scrolled into view on tap. No wrapping (the row stays one line tall so the sticky behaviour reads as a stable bar).

## Questions, Options and Decisions

| Question                                                           | Options                                                                      | Decision (2026-06-06)                                                                                                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Where can a lineup be edited?                                      | (a) only setlist entry, (b) only song, (c) both                              | (c) — default on the song, override per setlist entry. Matches the existing schema and the existing resolver that already does override-else-default.                                |
| When picking who plays an instrument, who appears in the dropdown? | filtered by `member_instrument` vs unfiltered                                | Unfiltered — Hugo can assign anyone to anything, useful for fill-in lineups. The schema's intent of `member_instrument` is "what each member typically owns", not a hard constraint. |
| What happens to lineup entries when a band member is deleted?      | (a) cascade-scrub from every lineup, (b) keep + render "— (deleted)" forever | (a) — cascade. Matches the existing manual-cascade pattern; keeps the UI clean. Historical record is _not_ a goal of pragma.                                                         |
| UX shape for the editor?                                           | popover, modal, inline expansion                                             | Modal — operator's call. Matches the `CreateSessionDialog` pattern already used in pragma for similar density (per `apps/pragma/site/src/components/molecules/`).                    |
| Is this an ADR-trigger?                                            | yes / no                                                                     | No. No new dependency, no new secret, no schema change, no cross-app surface. Cross-cutting within pragma only (members + songs + setlists) — captured here, not in ADR-land.        |

**Out of scope (named):**

- Printable / shareable session sheet (a one-page poster of the whole matrix to PDF / image) — the per-member rollup covers the on-device reading need; export is a separate ask.
- External notification (email / push / SMS) — replaces Hugo's WhatsApp routine _only inside the app_. WhatsApp paste-friendliness is a follow-up.
- Lineup history / audit log (who-changed-what-when) — out.
- Per-instrument constraints (one drummer, max two guitars, …) — out; the model already allows arbitrary assignment, and the band knows what's musically sensible.

## Changes

### Types / domain model

Already defined in the existing schemas; no change:

```ts
// apps/pragma/api/src/songs/songs.schema.ts (existing)
defaultLineupSchema = z.record(z.string().uuid(), z.string().uuid().nullable());

// apps/pragma/api/src/setlists/setlists.schema.ts (existing)
lineupOverrideSchema = z.record(z.string().uuid(), z.string().uuid().nullable());
```

Lineup is `Record<memberId, instrumentId | null>`. Key = member; value = the instrument that member plays on this song (or `null` = present but unassigned, currently unused by the UI). Absent from the record = not playing.

New pure helper (extracted core, gated to 100% coverage by `*.core.ts` rule):

```ts
// apps/pragma/api/src/members/lineup-scrub.core.ts (NEW)
export function scrubMemberFromLineup(
  lineup: Record<string, string | null>,
  memberId: string,
): Record<string, string | null>;
```

### Database changes

**None.** Both columns (`song.default_lineup TEXT`, `setlist_entry.lineup_override TEXT`) already exist with the JSON-encoded shape the repository writes today.

### Files to change

```
apps/pragma/api/src/members/lineup-scrub.core.ts            // NEW: pure helper (100% coverage gate)
apps/pragma/api/src/members/lineup-scrub.core.test.ts       // NEW
apps/pragma/api/src/members/members.repository.ts           // UPDATE: deleteMemberWithLinks also scrubs song.defaultLineup + setlist_entry.lineupOverride
apps/pragma/api/src/members/members.controller.test.ts      // UPDATE: assert scrub on delete (back-e2e)

apps/pragma/site/src/components/molecules/LineupEditor.tsx       // NEW: modal contents (table of members × instrument dropdown, save / reset / cancel)
apps/pragma/site/src/components/molecules/LineupEditor.test.tsx  // NEW
apps/pragma/site/src/components/molecules/MemberFilterPills.tsx       // NEW: horizontal pill row, one pill per member, controlled (selectedMemberId | null)
apps/pragma/site/src/components/molecules/MemberFilterPills.test.tsx  // NEW
apps/pragma/site/src/routes/setlists/setlist-filter.core.ts           // NEW: pure helper — given resolved-lineup-per-entry + selectedMemberId, returns the visible entry IDs + per-entry instrument-for-member chip
apps/pragma/site/src/routes/setlists/setlist-filter.core.test.ts      // NEW (100% coverage gate)
apps/pragma/site/src/routes/setlists/SetlistEditor.tsx                // UPDATE: render MemberFilterPills at top (sticky), apply setlist-filter.core to the entries list, render the per-row member-instrument chip when filtered
apps/pragma/site/src/routes/setlists/SetlistEntryRow.tsx         // UPDATE: "Lineup" button + LineupEditor modal trigger + override badge + optional prominent member-instrument chip prop (rendered when in single-member mode)
apps/pragma/site/src/routes/catalog/SongDetailPage.tsx           // UPDATE: "Edit default lineup" button + LineupEditor modal trigger
apps/pragma/site/src/lib/queries/setlists.ts                     // UPDATE if needed: ensure the existing updateEntry mutation accepts a {lineupOverride: null} reset payload cleanly
apps/pragma/site/src/i18n/en.json + fr.json                      // UPDATE: new strings — lineup.edit, lineup.modal.title, lineup.notPlaying, lineup.resetToDefault, lineup.override, lineup.save, lineup.cancel, lineup.allMembers, lineup.emptyForMember
```

### Test strategy

- **Unit (back) — `lineup-scrub.core.test.ts`:** 100% coverage of `scrubMemberFromLineup`. Cases: empty lineup, lineup not containing the member, lineup containing the member exactly once, multiple member IDs in the lineup with the target somewhere in the middle, `null` instrument value for the target.
- **Unit (front) — `setlist-filter.core.test.ts`:** 100% coverage of the per-member filter. Cases: `selectedMemberId === null` returns every entry with no per-row chip; selected member appears in 0 entries → empty result; selected member appears in 3 of 5 entries → returns those 3 with the matching instrument for each; resolved-lineup falls back through override → default → empty correctly.
- **Unit (front) — `LineupEditor.test.tsx`:** opens with prefilled values, change a row's instrument → state updates, click Save → calls the supplied `onSave(lineup)`, click Reset → state returns to the supplied `defaultLineup`, click Cancel → no save.
- **Unit (front) — `MemberFilterPills.test.tsx`:** renders one pill per supplied member plus an "All members" pill; clicking a pill calls `onChange(memberId)`; the active pill has the active-state class; `selectedMemberId === null` activates the "All members" pill.
- **Back-e2e — `members.controller.test.ts`:** deleting a member that's listed in a song's `defaultLineup` and in a setlist entry's `lineupOverride` clears them from both, all in one transaction, in a single `DELETE /api/members/:id` call.
- **Visual validation** drives every numbered happy-path step above + the override badge appears + reset clears the badge + the modal closes after Save + the per-member filter pill row appears on the setlist page + tapping a pill collapses the list to the member's songs with the correct instrument chip + tapping "All members" restores the full list + an empty-state member ("Nothing to play tonight") renders cleanly.
- **Technical validation** runs lint + knip + typecheck + the test pipelines named above + a diff-correctness pass on the cascade, the modal, and the per-member filter.

## Production strategy

### Analytics

**Input metrics** (named events fired by the front, aggregated weekly):

- `lineup_modal_opened` — `{ surface: 'song' | 'setlist-entry', entryId?: uuid, songId: uuid }`. p50 ≤ 200 ms from button click to modal-rendered.
- `lineup_saved` — `{ surface, hadPriorContent: boolean, memberCount: number }`. p50 ≤ 500 ms from Save click to mutation success.
- `lineup_reset_to_default` — `{ entryId: uuid }`. No threshold — pure curiosity metric.
- `setlist_filtered_by_member` — `{ sessionId: uuid, memberId: uuid, visibleEntryCount: number }`. The leading indicator that the per-member rollup is doing its job (the surface that makes the 10s output-metric reachable). Tracked as a weekly count; an absent week on a session with > 0 entries is a smell — either the data is empty or the surface is failing.

**Threshold gate** (input — measured weekly from the DB, not from events): ≥ 80% of `setlist_entry` rows whose parent session is a `kind='concert'` scheduled in the next 30 days have a non-empty resolved lineup. Below threshold → Sentry breadcrumb + the operator gets a weekly digest.

**Output metric** (lagging, out-of-band — _not_ a CI gate): the "10 second" ask-a-member objective. Hugo asks one band member at random at each rehearsal "what are you playing tonight?" — the time-to-answer is the output. If three sessions in a row clear > 10s while the input metric is green, the input metric is the wrong proxy and this spec returns.

### Zero-defect strategy

- `lineupSavePayloadInvalid` — Zod validation failed on save. Sentry tag `surface:lineup-editor`, alert at **5 occurrences / 10 min in prod**.
- `lineupScrubFailed` — the cascade-on-delete transaction threw. Sentry tag `surface:members.delete`, alert at **any occurrence in prod** (data-integrity criticality).
- `lineupResolveOrphanMember` — the resolver finds a member ID in a stored lineup that no longer exists in the members table. Sentry tag `surface:lineup-resolver`, alert at **any occurrence in prod** (means a cascade-scrub failed silently; correlate with `lineupScrubFailed` above).
