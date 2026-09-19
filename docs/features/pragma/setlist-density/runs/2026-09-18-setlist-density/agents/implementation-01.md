---
status: done
summary: >-
  The lineup column ships end to end: migration 0014 adds icon, position and
  is_primary, the api reads and writes them, six glyphs join the icon registry,
  the setlist card draws the fixed column, and the instruments page sets the
  glyph, the order and who leads. Lint, typecheck, prettier, the core suite at
  100 percent coverage and the back-end end-to-end suite all pass. Two
  deviations from the plan are recorded below, one forced by Aurora DSQL and one
  by a measurement at 360 px, and one ratified input metric is still unmet and
  needs the operator rather than more code.
artifacts:
  - apps/pragma/api/src/database/migrations/0014_lineup_slots.sql
  - apps/pragma/domain/instrument.core.ts
  - apps/pragma/api/src/instruments/instrument-players.core.ts
  - apps/pragma/api/src/instruments/instruments.repository.ts
  - apps/pragma/api/src/instruments/instruments.service.ts
  - apps/pragma/api/src/instruments/instruments.controller.ts
  - apps/pragma/api/src/instruments/instruments.schema.ts
  - apps/pragma/api/src/members/members.repository.ts
  - apps/pragma/api/src/members/members.schema.ts
  - apps/pragma/site/src/components/atoms/Icon.tsx
  - apps/pragma/site/src/components/molecules/lineup-slots.core.ts
  - apps/pragma/site/src/components/molecules/LineupSlots.tsx
  - apps/pragma/site/src/components/molecules/InstrumentIconPicker.tsx
  - apps/pragma/site/src/components/molecules/InstrumentPlayerChips.tsx
  - apps/pragma/site/src/components/organisms/InstrumentsList.tsx
  - apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx
  - apps/pragma/site/src/components/organisms/SetlistEntriesList.tsx
  - apps/pragma/site/src/components/organisms/SetlistEditor.tsx
  - apps/pragma/site/src/lib/queries/instruments.queries.ts
  - apps/pragma/site/src/lib/queries/members.queries.ts
  - apps/pragma/site/src/lib/queries/member-roster.core.ts
  - apps/pragma/site/src/routes/instruments/InstrumentsPage.tsx
  - apps/pragma/VOCABULARY.md
  - docs/knowledge/instrument-icon-provenance.md
next:
  kind: validate
---

# Implementation round 1 — the setlist lineup column

Branch `claude/pensive-hamilton-nnllpm-impl-01`, five commits.

## Gates

| Gate | Result |
|---|---|
| `npx eslint apps/pragma --no-warn-ignored --max-warnings 0` | pass |
| `pnpm exec prettier --check "apps/pragma/**/*.{ts,tsx,json}"` | pass |
| `cd apps/pragma && npx tsc --noEmit` | pass |
| `npx vitest run --project core --root apps/pragma --coverage` | 178 files, 1825 tests, 100% on all four axes |
| `pnpm --filter @borso-app/pragma run test` (back-end end to end) | 21 files, 161 tests |
| `pnpm exec knip` | no unused export |
| `bash scripts/check-vocabulary-paths.sh` | pass |
| `pnpm exec tsx scripts/standards/convention-drift.ts --check` | no new answer |
| blueprint indexing `--check` | complete |

No dependency was added. `grep -n lucide apps/pragma/package.json` returns
nothing; the five Lucide glyphs are path data copied into the existing `ICONS`
map per the `atom-icon-registry` blueprint, and the bass is the generated one,
copied verbatim with both fretboard edges untouched.

## Two deviations from the plan

**The migration is not `ADD COLUMN ... NOT NULL DEFAULT`.** The spec and the
plan both wrote it that way. Aurora DSQL accepts no constraint clause at all on
`ADD COLUMN`, which `docs/knowledge/dsql-postgres-compat-gaps.md` section 10
records and which every one of the thirteen earlier migrations already avoids.
All three columns land nullable and stay nullable; the drizzle declarations
carry no `.notNull()` and no `.default()`, and the read side narrows through
`resolveInstrumentIcon` and `resolveInstrumentPosition` beside the existing
`resolveInstrumentFamily`. Had the plan's SQL shipped, the back-end suite would
still have passed and the first preview deploy would have failed.

**On a phone the column sits on the second line of the text block, not after
the title.** The plan's R4 mitigation was a breakpoint budget plus `shrink-0`
on the column and `min-w-0 flex-1` on the title. That is what was built first,
and it did not work: at 375 px with four slots inline every title collapsed to
one character, and at two slots to about seven. The column moved to the line the
artist and the tonality occupy, and those leave at phone width, which is the
trade the spec's perspectives section names in so many words. The card does not
grow, because that line already existed. Above `sm:` the layout is exactly what
the spec lists.

## One ratified metric is still unmet

The spec asks that at 360 px a title of at most twenty characters not truncate.
It does. Measured, not assumed: with the column removed entirely the same title
still truncates, so the column is not the cause. The drag handle, the album
cover, the position number, the energy meter and the actions button leave about
105 px for a title that wants about 150. That was already true of the card that
shipped in `95a4b43`, before this branch added a column.

Closing it means shrinking or dropping one of those five. The spec protects four
of them by name — the cover may not leave, the energy control's width was
settled by measurement, the title may not be what truncates — so this is a
product decision rather than a layout one. Recommendation: let the album cover
drop to 32 px and the position number leave the row below `sm:`, which returns
about 30 px; if that is not enough the honest remaining lever is the energy
meter's bar spacing. One instruction and it ships.

## Evidence

Screenshots taken against the local dev server with the seeded band, at 360 px,
375 px and 1280 px, after configuring the five instruments the way the
instruments page now allows. The column reads positionally down the list: the
bass slot is tinted on the first song and grey on the third, with no text read.
