# Plan: a "to play" song status

| Spec use case | Where it lands | Test |
| --- | --- | --- |
| 1 | `api/src/songs/songs.schema.ts` `SONG_STATUSES` | `api/src/songs/songs.schema.test.ts` |
| 2 | `site/src/routes/catalog/song-draft.core.ts` `songStatuses`, `SONG_STATUS_LABEL_KEY` | typecheck (`satisfies Record`) |
| 3 | `site/src/routes/catalog/catalog-page.core.ts` `CATALOG_FILTERS`, `CatalogPage.tsx` `FILTER_LABEL_KEY` | `catalog-page.core.test.ts` › parseCatalogFilter |
| 4 | `StatusChip.tsx` label table, `chip.variants.ts` tone `bg-accent-soft text-accent-strong` | typecheck |
| 5 | `pool-song-row.core.ts`, `audience.utils.ts` status union | `pool-song-row.core.test.ts` |
| 6 | Filter row already scrolls horizontally | browser check at 375 px |

i18n keys `catalog.filterToPlay`, `catalog.statusToPlay`, `audience.notConcertReadyToPlay` in `en.json` and `fr.json`. `VOCABULARY.md` › Song lists the new status.

## Risks

- Deploy order: the site and API ship together on merge, so a site sending `to_play` to an old API cannot happen outside a deploy window.

## Gates

Typecheck, lint, `test:core`.
