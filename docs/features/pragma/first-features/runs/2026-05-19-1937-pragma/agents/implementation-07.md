---
status: done
summary: |
  All 6 jsonb columns migrated to text following the canonical
  edition.repository.ts pattern. Migration SQL hand-edited to keep the
  app_config singleton CHECK constraint and the
  setlist_entry_setlist_id_position_idx index that drizzle-kit's
  regenerated output dropped. Drizzle schemas now declare text with
  '[]' / '{}' literal defaults for the not-null columns. Repositories
  gained a rowToSong / rowToEntry / rowToSession parser plus
  encodeInsert / encodeUpdate helpers that JSON.stringify on the way
  in and JSON.parse + Zod-validate on the way out. The Zod schemas
  used at the controller boundary are reused as row validators
  (songLinksRowSchema for the links array; chordChartSchema,
  defaultLineupSchema, lineupOverrideSchema, friendsCountSchema for
  the rest) so there is no duplicate-export noise. grep -rn 'jsonb'
  apps/pragma/api/src/ returns 0 lines outside explanatory comments
  pointing to docs/knowledge/dsql-postgres-compat-gaps.md §1. All 273
  core + 51 back-e2e tests pass. Biome lint clean. Knip clean
  (residual @borso/infra hint is pre-existing).
artifacts:
  - apps/pragma/api/src/songs/songs.schema.ts
  - apps/pragma/api/src/songs/songs.repository.ts
  - apps/pragma/api/src/setlists/setlists.schema.ts
  - apps/pragma/api/src/setlists/setlists.repository.ts
  - apps/pragma/api/src/sessions/sessions.schema.ts
  - apps/pragma/api/src/sessions/sessions.repository.ts
  - apps/pragma/api/src/database/migrations/0000_initial.sql
partialDeferrals: []
next:
  kind: validate
---
