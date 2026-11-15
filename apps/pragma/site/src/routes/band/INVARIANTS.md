# Invariants of pragma, in `site/src/routes/band`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Band tab

- **Tasks** (`/tasks`) opens on **My tasks**, the signed-in member's
  tasks in the order the API gives them; **Everyone** shows one column
  per member. The choice is the `view` search parameter, so a reload
  keeps it. **New task** is its one primary action, in the bottom strip.
- Under the menu of band pages, the tab keeps the **band links**, each a
  row that opens in a new tab, with a round `+` to add one.
Held by: `site/src/routes/band/BandPage.test.tsx` › keeps the band links under the menu
Held by: `site/src/routes/band/band-destinations.core.test.ts` › lists the account page last
Held by: `site/src/routes/band/band-destinations.core.test.ts` › lists inspirations right after compositions
Held by: `site/src/routes/band/TasksPage.test.tsx` › opens on the signed-in member tasks only
