// The twelve labours of Borso, edited by hand and shipped in a pull request.
//
// Media files live in `apps/borso-fr/site/public/media/12-travaux/` and are
// referenced absolutely (`/media/12-travaux/photo.jpg`). The `/media/` prefix
// keeps them clear of the `/12-travaux/` route.
//
// Every string a reader sees is a key into `site/i18n/en.json` and
// `site/i18n/fr.json`, so adding a challenge means adding its title, its note,
// and any proof label to both catalogues.
//
// Adding an edition: write `labours-<year>.ts` exporting `EDITION_<year>`, then
// register it below.

import { EDITION_2025 } from './labours-2025';
import { EDITION_2026 } from './labours-2026';
import type { LaboursData } from './labours.types';

export const LABOURS: LaboursData = {
  editions: {
    2025: EDITION_2025,
    2026: EDITION_2026,
  },
};
