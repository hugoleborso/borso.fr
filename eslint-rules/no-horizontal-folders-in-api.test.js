import { createRuleTester } from './rule-tester.js';
import rule from './no-horizontal-folders-in-api.js';

const pureModule = 'export const rules = [];';
const serviceSource = 'export class SongsService {}';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-horizontal-folders-in-api',
  rule,
  {
    valid: [
      // The workspace level folder of ADR-0010, beside `api/` and `site/`,
      // holding the rules both sides read through `@domain/*`. It is not
      // `api/src/domain/`, and the rule has to keep the two apart.
      { filename: 'apps/pragma/domain/tonality.core.ts', code: pureModule },
      { filename: 'apps/pragma/domain/bar-staleness.core.ts', code: pureModule },
      { filename: 'apps/pragma/domain/lineup.core.test.ts', code: pureModule },
      // A bounded context, which is where every back end file belongs.
      { filename: 'apps/pragma/api/src/songs/songs.controller.ts', code: serviceSource },
      { filename: 'apps/pragma/api/src/songs/tonality.core.ts', code: pureModule },
      { filename: 'apps/last-loop-lepin/api/src/punch/punch.repository.ts', code: serviceSource },
      // A context whose name is plural, which is not an aggregator.
      { filename: 'apps/pragma/api/src/setlists/setlists.service.ts', code: serviceSource },
      { filename: 'apps/pragma/api/src/members/members.service.ts', code: serviceSource },
      // The two folders under `api/src/` the standards sanction by name.
      { filename: 'apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.ts', code: pureModule },
      { filename: 'apps/pragma/api/src/database/client.ts', code: serviceSource },
      // A horizontal name deeper inside a context is that context's business.
      { filename: 'apps/pragma/api/src/songs/services/enrichment.ts', code: serviceSource },
      // The front end sorts by feature, which is what `routes/` is for.
      { filename: 'apps/pragma/site/src/routes/catalog/CatalogPage.tsx', code: serviceSource },
      { filename: 'apps/pragma/site/src/lib/queries/songs.queries.ts', code: pureModule },
      // A file directly under `api/src/`, which is in no folder at all.
      { filename: 'apps/pragma/api/src/app.ts', code: serviceSource },
      // Outside an application's API.
      { filename: 'infra/cdk/src/constructs/static-site.ts', code: serviceSource },
      { filename: 'scripts/architecture/architecture-graph.ts', code: pureModule },
    ],
    invalid: [
      {
        filename: 'apps/pragma/api/src/domain/tonality.core.ts',
        code: pureModule,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'domain' } }],
      },
      {
        filename: 'apps/last-loop-lepin/api/src/controllers/punch.controller.ts',
        code: serviceSource,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'controllers' } }],
      },
      {
        filename: 'apps/pragma/api/src/services/songs.service.ts',
        code: serviceSource,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'services' } }],
      },
      {
        filename: 'apps/pragma/api/src/repositories/songs.repository.ts',
        code: serviceSource,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'repositories' } }],
      },
      {
        filename: 'apps/pragma/api/src/routes/songs.ts',
        code: serviceSource,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'routes' } }],
      },
      // Any depth below the horizontal folder, which is the same pile.
      {
        filename: 'apps/pragma/api/src/domain/songs/tonality.core.ts',
        code: pureModule,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'domain' } }],
      },
      // The sibling test moves with the file it covers, so it is not exempt.
      {
        filename: 'apps/pragma/api/src/domain/tonality.core.test.ts',
        code: pureModule,
        errors: [{ messageId: 'horizontalFolderInApi', data: { folder: 'domain' } }],
      },
    ],
  },
);
